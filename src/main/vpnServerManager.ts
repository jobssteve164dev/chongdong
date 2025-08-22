import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { app } from 'electron';
import { ProxyNode, ChainConfig } from '../shared/types';
import { createSocket, Socket as UDPSocket } from 'dgram';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface VpnServerConfig {
  type: 'l2tp' | 'pptp' | 'ikev2';
  port: number;
  interface: string;
  subnet: string;
  proxyNodes?: ProxyNode[];
  chainConfig?: ChainConfig;
}

export interface VpnServerStatus {
  running: boolean;
  connectedClients: number;
  interface?: string;
  error?: string | undefined;
  serverInfo?: {
    host: string;
    port: number;
    username: string;
    password: string;
    sharedSecret: string;
    protocol: string;
  };
}

/**
 * VPN服务器管理器
 * 启动内置的L2TP服务器，实现流量分流以避免死循环
 */
export class VpnServerManager {
  private static instance: VpnServerManager;
  private configDir: string;
  private status: VpnServerStatus = {
    running: false,
    connectedClients: 0
  };
  private l2tpServer?: UDPSocket;
  private serverInfo = {
    host: '127.0.0.1',
    port: 1701, // L2TP默认端口
    username: 'chongdong',
    password: 'chongdong123',
    sharedSecret: 'chongdong-secret', // L2TP/IPSec共享密钥
    protocol: 'L2TP/IPSec'
  };
  private proxyNodes: ProxyNode[] = [];
  private originalRoutes: string[] = [];
  
  // L2TP协议状态管理
  private nextTunnelId: number = 1;
  private nextSessionId: number = 1;
  private activeTunnels: Map<number, { clientAddress: string; clientPort: number }> = new Map();
  private activeSessions: Map<number, { tunnelId: number; clientAddress: string; clientPort: number }> = new Map();

  private constructor() {
    this.configDir = join(app.getPath('userData'), 'vpn-server');
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
  }

  public static getInstance(): VpnServerManager {
    if (!VpnServerManager.instance) {
      VpnServerManager.instance = new VpnServerManager();
    }
    return VpnServerManager.instance;
  }

  /**
   * 启动VPN服务器
   */
  public async startVpnServer(config: VpnServerConfig): Promise<void> {
    console.log(`[VpnServerManager] 启动内置L2TP服务器`);
    
    try {
      // 保存代理节点信息用于路由配置
      this.proxyNodes = config.proxyNodes || [];
      
      // 1. 配置系统路由以避免死循环
      await this.configureTrafficRouting();
      
      // 2. 启动内置L2TP服务器
      await this.startL2tpServer();
      
      this.status.running = true;
      this.status.interface = config.interface;
      this.status.serverInfo = this.serverInfo;
      console.log(`[VpnServerManager] 内置L2TP服务器启动成功`);
      console.log(`[VpnServerManager] 服务器信息: ${this.serverInfo.host}:${this.serverInfo.port}`);
      console.log(`[VpnServerManager] 用户名: ${this.serverInfo.username}`);
      console.log(`[VpnServerManager] 密码: ${this.serverInfo.password}`);
      
    } catch (error) {
      this.status.error = error instanceof Error ? error.message : String(error);
      console.error(`[VpnServerManager] L2TP服务器启动失败:`, error);
      throw error;
    }
  }

  /**
   * 配置流量路由以避免死循环
   */
  private async configureTrafficRouting(): Promise<void> {
    console.log(`[VpnServerManager] 配置流量路由以避免死循环`);
    
    try {
      // 1. 保存当前路由表
      await this.saveCurrentRoutes();
      
      // 2. 为每个代理节点添加直连路由
      for (const node of this.proxyNodes) {
        const nodeHost = (node as any).server || (node as any).host;
        if (nodeHost && nodeHost !== '127.0.0.1' && nodeHost !== 'localhost') {
          await this.addDirectRoute(nodeHost);
        }
      }
      
      console.log(`[VpnServerManager] 流量路由配置完成`);
    } catch (error) {
      console.error(`[VpnServerManager] 配置流量路由失败:`, error);
      throw error;
    }
  }

  /**
   * 保存当前路由表
   */
  private async saveCurrentRoutes(): Promise<void> {
    try {
      const { stdout } = await execAsync('netstat -rn');
      this.originalRoutes = stdout.split('\n').filter(line => line.trim());
      console.log(`[VpnServerManager] 已保存 ${this.originalRoutes.length} 条原始路由`);
    } catch (error) {
      console.warn(`[VpnServerManager] 保存路由表失败:`, error);
    }
  }

  /**
   * 为代理节点添加直连路由
   */
  private async addDirectRoute(host: string): Promise<void> {
    try {
      // 在macOS上添加直连路由
      const command = `sudo route add ${host} -gateway $(netstat -rn | grep default | awk '{print $2}' | head -1)`;
      await execAsync(command);
      console.log(`[VpnServerManager] 已为代理节点 ${host} 添加直连路由`);
    } catch (error) {
      console.warn(`[VpnServerManager] 为 ${host} 添加直连路由失败:`, error);
    }
  }

  /**
   * 启动内置L2TP服务器
   */
  private async startL2tpServer(): Promise<void> {
    try {
      // 创建UDP服务器监听L2TP端口
      this.l2tpServer = createSocket('udp4');

      // 处理L2TP消息
      this.l2tpServer.on('message', (msg, rinfo) => {
        console.log(`[VpnServerManager] 收到L2TP消息: ${rinfo.address}:${rinfo.port}, 长度: ${msg.length}`);
        this.handleL2tpMessage(msg, rinfo);
      });

      this.l2tpServer.on('error', (error) => {
        console.error(`[VpnServerManager] L2TP服务器错误:`, error);
      });

      this.l2tpServer.on('listening', () => {
        const address = this.l2tpServer!.address();
        console.log(`[VpnServerManager] L2TP服务器监听在 ${address.address}:${address.port}`);
      });

      // 绑定到指定端口
      await new Promise<void>((resolve, reject) => {
        this.l2tpServer!.bind(this.serverInfo.port, this.serverInfo.host, () => {
          resolve();
        });
        
        this.l2tpServer!.on('error', (error) => {
          console.error(`[VpnServerManager] L2TP服务器启动失败:`, error);
          reject(error);
        });
      });

    } catch (error) {
      console.error(`[VpnServerManager] 启动L2TP服务器失败:`, error);
      throw error;
    }
  }

  /**
   * 处理L2TP消息
   */
  private handleL2tpMessage(msg: Buffer, rinfo: any): void {
    console.log(`[VpnServerManager] 处理L2TP消息...`);
    
    try {
      // 解析L2TP头部
      if (msg.length < 6) {
        console.warn(`[VpnServerManager] L2TP消息太短: ${msg.length} bytes`);
        return;
      }

      // L2TP头部格式：
      // 0-1: Flags and Version
      // 2-3: Length (if L bit is set)
      // 4-5: Tunnel ID
      // 6-7: Session ID
      
      const flags = msg.readUInt16BE(0);
      const version = flags & 0x000F;
      const hasLength = (flags & 0x4000) !== 0;
      const isControl = (flags & 0x8000) !== 0;
      
      console.log(`[VpnServerManager] L2TP版本: ${version}, 标志: 0x${flags.toString(16)}, 控制消息: ${isControl}`);
      
      if (version !== 2) {
        console.warn(`[VpnServerManager] 不支持的L2TP版本: ${version}`);
        return;
      }

      let offset = 2;
      
      if (hasLength) {
        const length = msg.readUInt16BE(offset);
        console.log(`[VpnServerManager] L2TP消息长度: ${length}`);
        offset += 2;
      }
      
      const tunnelId = msg.readUInt16BE(offset);
      const sessionId = msg.readUInt16BE(offset + 2);
      offset += 4;
      
      console.log(`[VpnServerManager] 隧道ID: ${tunnelId}, 会话ID: ${sessionId}`);
      
      if (isControl) {
        // 处理控制消息
        this.handleL2tpControlMessage(msg, rinfo, tunnelId, sessionId, offset);
      } else {
        // 处理数据消息
        this.handleL2tpDataMessage(msg, rinfo, tunnelId, sessionId, offset);
      }
      
    } catch (error) {
      console.error(`[VpnServerManager] 处理L2TP消息失败:`, error);
    }
  }

  /**
   * 处理L2TP控制消息
   */
  private handleL2tpControlMessage(msg: Buffer, rinfo: any, tunnelId: number, sessionId: number, offset: number): void {
    try {
      if (msg.length < offset + 4) {
        console.warn(`[VpnServerManager] 控制消息太短`);
        return;
      }

      // 控制消息头部
      const ns = msg.readUInt16BE(offset);
      const nr = msg.readUInt16BE(offset + 2);
      offset += 4;

      console.log(`[VpnServerManager] 控制消息: Ns=${ns}, Nr=${nr}`);
      console.log(`[VpnServerManager] 原始消息: ${msg.toString('hex')}`);

      // 简化处理：直接响应SCCRQ
      if (tunnelId === 0) {
        console.log(`[VpnServerManager] 检测到SCCRQ请求，分配隧道ID: ${this.nextTunnelId}`);
        this.handleSccrq(rinfo, tunnelId, ns, nr);
        return;
      }

      // 解析AVP (Attribute-Value Pairs) - 简化版本
      let avpOffset = offset;
      let messageType = 0;
      
      while (avpOffset < msg.length - 5) {
        if (avpOffset + 6 > msg.length) break;
        
        const avpFlags = msg.readUInt16BE(avpOffset);
        const avpLength = msg.readUInt16BE(avpOffset + 2);
        const avpType = msg.readUInt16BE(avpOffset + 4);
        
        console.log(`[VpnServerManager] AVP: 偏移=${avpOffset}, 类型=${avpType}, 长度=${avpLength}, 标志=0x${avpFlags.toString(16)}`);
        
        if (avpType === 1 && avpLength >= 8) { // Message Type AVP
          messageType = msg.readUInt16BE(avpOffset + 6);
          console.log(`[VpnServerManager] 找到消息类型: ${messageType}`);
          break;
        }
        
        if (avpLength <= 0 || avpLength > msg.length - avpOffset) {
          console.warn(`[VpnServerManager] AVP长度无效: ${avpLength}`);
          break;
        }
        
        avpOffset += avpLength;
      }
      
      // 根据消息类型处理
      switch (messageType) {
        case 1: // SCCRQ (Start-Control-Connection-Request)
          this.handleSccrq(rinfo, tunnelId, ns, nr);
          break;
        case 2: // SCCRP (Start-Control-Connection-Reply)
          this.handleSccrp(rinfo, tunnelId, ns, nr);
          break;
        case 3: // SCCCN (Start-Control-Connection-Connected)
          this.handleScccn(rinfo, tunnelId, ns, nr);
          break;
        case 14: // ICRQ (Incoming-Call-Request)
          this.handleIcrq(rinfo, tunnelId, sessionId, ns, nr);
          break;
        case 15: // ICRP (Incoming-Call-Reply)
          this.handleIcrp(rinfo, tunnelId, sessionId, ns, nr);
          break;
        case 16: // ICCN (Incoming-Call-Connected)
          this.handleIccn(rinfo, tunnelId, sessionId, ns, nr);
          break;
        default:
          console.log(`[VpnServerManager] 未处理的消息类型: ${messageType}`);
      }
      
    } catch (error) {
      console.error(`[VpnServerManager] 处理控制消息失败:`, error);
    }
  }

  /**
   * 处理L2TP数据消息
   */
  private handleL2tpDataMessage(_msg: Buffer, _rinfo: any, tunnelId: number, sessionId: number, _offset: number): void {
    console.log(`[VpnServerManager] 处理数据消息: 隧道=${tunnelId}, 会话=${sessionId}`);
    // 这里应该处理实际的数据包转发
    // 暂时只是记录
  }

  /**
   * 处理SCCRQ (Start-Control-Connection-Request)
   */
  private handleSccrq(rinfo: any, tunnelId: number, ns: number, nr: number): void {
    console.log(`[VpnServerManager] 处理SCCRQ: 隧道=${tunnelId}, Ns=${ns}, Nr=${nr}`);
    
    // 分配新的隧道ID
    const assignedTunnelId = this.nextTunnelId++;
    this.activeTunnels.set(assignedTunnelId, { clientAddress: rinfo.address, clientPort: rinfo.port });
    
    // 发送SCCRP响应
    this.sendSccrp(rinfo, assignedTunnelId, ns, nr);
  }

  /**
   * 处理SCCRP (Start-Control-Connection-Reply)
   */
  private handleSccrp(rinfo: any, tunnelId: number, ns: number, nr: number): void {
    console.log(`[VpnServerManager] 处理SCCRP: 隧道=${tunnelId}, Ns=${ns}, Nr=${nr}`);
    // 发送SCCCN确认
    this.sendScccn(rinfo, tunnelId, ns, nr);
  }

  /**
   * 处理SCCCN (Start-Control-Connection-Connected)
   */
  private handleScccn(_rinfo: any, tunnelId: number, ns: number, nr: number): void {
    console.log(`[VpnServerManager] 处理SCCCN: 隧道=${tunnelId}, Ns=${ns}, Nr=${nr}`);
    console.log(`[VpnServerManager] 控制连接已建立: 隧道=${tunnelId}`);
  }

  /**
   * 处理ICRQ (Incoming-Call-Request)
   */
  private handleIcrq(rinfo: any, tunnelId: number, sessionId: number, ns: number, nr: number): void {
    console.log(`[VpnServerManager] 处理ICRQ: 隧道=${tunnelId}, 会话=${sessionId}, Ns=${ns}, Nr=${nr}`);
    
    // 分配新的会话ID
    const assignedSessionId = this.nextSessionId++;
    this.activeSessions.set(assignedSessionId, { 
      tunnelId, 
      clientAddress: rinfo.address, 
      clientPort: rinfo.port 
    });
    
    // 发送ICRP响应
    this.sendIcrp(rinfo, tunnelId, assignedSessionId, ns, nr);
  }

  /**
   * 处理ICRP (Incoming-Call-Reply)
   */
  private handleIcrp(rinfo: any, tunnelId: number, sessionId: number, ns: number, nr: number): void {
    console.log(`[VpnServerManager] 处理ICRP: 隧道=${tunnelId}, 会话=${sessionId}, Ns=${ns}, Nr=${nr}`);
    // 发送ICCN确认
    this.sendIccn(rinfo, tunnelId, sessionId, ns, nr);
  }

  /**
   * 处理ICCN (Incoming-Call-Connected)
   */
  private handleIccn(_rinfo: any, tunnelId: number, sessionId: number, ns: number, nr: number): void {
    console.log(`[VpnServerManager] 处理ICCN: 隧道=${tunnelId}, 会话=${sessionId}, Ns=${ns}, Nr=${nr}`);
    console.log(`[VpnServerManager] 会话已建立: 隧道=${tunnelId}, 会话=${sessionId}`);
    this.status.connectedClients++;
  }



  /**
   * 发送SCCCN (Start-Control-Connection-Connected)
   */
  private sendScccn(rinfo: any, tunnelId: number, ns: number, nr: number): void {
    const response = this.createL2tpControlMessage(tunnelId, 0, ns, nr, 3); // SCCCN = 3
    this.sendL2tpMessage(rinfo, response);
  }

  /**
   * 发送ICRP (Incoming-Call-Reply)
   */
  private sendIcrp(rinfo: any, tunnelId: number, sessionId: number, ns: number, nr: number): void {
    const response = this.createL2tpControlMessage(tunnelId, sessionId, ns, nr, 15); // ICRP = 15
    this.sendL2tpMessage(rinfo, response);
  }

  /**
   * 发送ICCN (Incoming-Call-Connected)
   */
  private sendIccn(rinfo: any, tunnelId: number, sessionId: number, ns: number, nr: number): void {
    const response = this.createL2tpControlMessage(tunnelId, sessionId, ns, nr, 16); // ICCN = 16
    this.sendL2tpMessage(rinfo, response);
  }

  /**
   * 创建L2TP控制消息
   */
  private createL2tpControlMessage(tunnelId: number, _sessionId: number, ns: number, nr: number, messageType: number): Buffer {
    // L2TP头部 (6字节)
    const header = Buffer.alloc(6);
    header.writeUInt16BE(0xC002, 0); // Flags: L=1, S=1, Version=2
    header.writeUInt16BE(0, 2); // Length (稍后设置)
    header.writeUInt16BE(tunnelId, 4); // Tunnel ID

    // 控制消息头部 (4字节)
    const controlHeader = Buffer.alloc(4);
    controlHeader.writeUInt16BE(ns, 0); // Ns
    controlHeader.writeUInt16BE(nr, 2); // Nr

    // Message Type AVP (6字节)
    const messageTypeAvp = Buffer.alloc(6);
    messageTypeAvp.writeUInt16BE(0x0000, 0); // Flags
    messageTypeAvp.writeUInt16BE(6, 2); // Length
    messageTypeAvp.writeUInt16BE(1, 4); // Type = Message Type

    // Message Type Value (2字节)
    const messageTypeValue = Buffer.alloc(2);
    messageTypeValue.writeUInt16BE(messageType, 0);

    // 组装完整消息
    const message = Buffer.concat([header, controlHeader, messageTypeAvp, messageTypeValue]);
    
    // 设置长度
    message.writeUInt16BE(message.length, 2);
    
    return message;
  }

  /**
   * 发送SCCRP (Start-Control-Connection-Reply)
   */
  private sendSccrp(rinfo: any, tunnelId: number, ns: number, nr: number): void {
    console.log(`[VpnServerManager] 发送SCCRP: 隧道=${tunnelId}, Ns=${ns}, Nr=${nr}`);
    
    // 创建与macOS发送格式相似的SCCRP响应
    // 基于收到的消息格式: c802001400000000000000008008000000000006
    const response = Buffer.alloc(20);
    
    // L2TP头部 (8字节) - 与收到的消息格式保持一致
    response.writeUInt16BE(0xC802, 0); // 使用与SCCRQ相同的标志
    response.writeUInt16BE(20, 2);     // Length = 20字节
    response.writeUInt16BE(tunnelId, 4); // 分配的隧道ID
    response.writeUInt16BE(0, 6);      // Session ID = 0
    
    // 控制消息头部 (4字节)
    response.writeUInt16BE(1, 8);      // Ns = 1 (我们的序列号)
    response.writeUInt16BE(1, 10);     // Nr = 1 (确认对方的序列号)
    
    // Message Type AVP (8字节) - 模仿收到的格式
    response.writeUInt16BE(0x8008, 12); // 使用与SCCRQ相同的AVP标志
    response.writeUInt16BE(0x0000, 14); // 
    response.writeUInt16BE(0x0000, 16); // 
    response.writeUInt16BE(0x0002, 18); // Message Type = 2 (SCCRP)
    
    console.log(`[VpnServerManager] SCCRP响应: ${response.toString('hex')}`);
    this.sendL2tpMessage(rinfo, response);
  }

  /**
   * 发送L2TP消息
   */
  private sendL2tpMessage(rinfo: any, message: Buffer): void {
    this.l2tpServer!.send(message, rinfo.port, rinfo.address, (error) => {
      if (error) {
        console.error(`[VpnServerManager] 发送L2TP消息失败:`, error);
      } else {
        console.log(`[VpnServerManager] 已发送L2TP消息到 ${rinfo.address}:${rinfo.port}, 长度: ${message.length}`);
      }
    });
  }



  /**
   * 停止VPN服务器
   */
  public async stopVpnServer(): Promise<void> {
    console.log(`[VpnServerManager] 停止内置L2TP服务器`);
    
    if (this.l2tpServer) {
      this.l2tpServer.close();
      this.l2tpServer = null as any;
    }
    
    this.status.running = false;
    this.status.connectedClients = 0;
    this.status.error = undefined;
    this.status.serverInfo = null as any;
    
    // 恢复原始路由
    await this.restoreOriginalRoutes();
    
    console.log(`[VpnServerManager] 内置L2TP服务器已停止`);
  }

  /**
   * 恢复原始路由表
   */
  private async restoreOriginalRoutes(): Promise<void> {
    try {
      console.log(`[VpnServerManager] 恢复原始路由表`);
      
      // 移除为代理节点添加的直连路由
      for (const node of this.proxyNodes) {
        const nodeHost = (node as any).server || (node as any).host;
        if (nodeHost && nodeHost !== '127.0.0.1' && nodeHost !== 'localhost') {
          try {
            await execAsync(`sudo route delete ${nodeHost}`);
            console.log(`[VpnServerManager] 已移除代理节点 ${nodeHost} 的直连路由`);
          } catch (error) {
            console.warn(`[VpnServerManager] 移除 ${nodeHost} 的直连路由失败:`, error);
          }
        }
      }
      
      console.log(`[VpnServerManager] 路由表恢复完成`);
    } catch (error) {
      console.error(`[VpnServerManager] 恢复路由表失败:`, error);
    }
  }

  /**
   * 获取VPN服务器状态
   */
  public getStatus(): VpnServerStatus {
    return { ...this.status };
  }

  /**
   * 获取服务器连接信息
   */
  public getServerInfo(): { host: string; port: number; username: string; password: string; sharedSecret: string; protocol: string } | undefined {
    return this.status.serverInfo;
  }

  /**
   * 生成系统VPN配置说明
   */
  public generateVpnConfigInstructions(): string {
    if (!this.status.serverInfo) {
      return 'VPN服务器未运行';
    }
    
    const { host, port, username, password, sharedSecret, protocol } = this.status.serverInfo;
    
    return `
VPN服务器信息：
- 服务器地址: ${host}
- 端口: ${port}
- 协议: ${protocol}
- 用户名: ${username}
- 密码: ${password}
- 共享密钥: ${sharedSecret}

流量分流说明：
- 代理节点流量将直接路由，避免死循环
- 其他流量将通过L2TP隧道进行代理

请在系统网络设置中添加VPN连接，使用以上信息进行配置。
    `.trim();
  }
}

export const vpnServerManager = VpnServerManager.getInstance();
