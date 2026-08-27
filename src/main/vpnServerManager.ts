import { createHash, randomBytes } from 'crypto';
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

interface ParsedAvp {
  type: number;
  vendorId: number;
  value: Buffer;
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
    username: `wormhole-${randomBytes(4).toString('hex')}`,
    password: randomBytes(24).toString('base64url'),
    sharedSecret: randomBytes(32).toString('base64url'),
    protocol: 'L2TP/IPSec'
  };
  private proxyNodes: ProxyNode[] = [];
  private originalRoutes: string[] = [];
  
  // L2TP协议状态管理
  private nextTunnelId: number = 1;
  private nextSessionId: number = 1;
  private activeTunnels: Map<number, { clientAddress: string; clientPort: number; serverChallenge: Buffer; }> = new Map();
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
    if (!this.hasCompleteDataPlane()) {
      const error = `内置 ${config.type.toUpperCase()} 数据面尚未实现，已拒绝启动不完整的 VPN 服务`;
      this.status = { running: false, connectedClients: 0, error };
      throw new Error(error);
    }

    this.proxyNodes = config.proxyNodes || [];
    await this.configureTrafficRouting();
    await this.startL2tpServer();
    this.status = {
      running: true,
      connectedClients: 0,
      interface: config.interface,
      serverInfo: this.serverInfo
    };
  }

  private hasCompleteDataPlane(): boolean {
    return false;
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
      console.log(`[VpnServerManager] 已添加代理节点直连路由`);
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
    console.log(`[VpnServerManager] Message length: ${msg.length} bytes`);
    
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
      console.log(`[VpnServerManager] Has length bit: ${hasLength}, Is control message: ${isControl}`);
      
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
      console.log(`[VpnServerManager] Offset after header: ${offset}`);
      
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

      const avps = this.parseAvps(msg, offset);
      const messageTypeAvp = avps.find(avp => avp.vendorId === 0 && avp.type === 0);
      
      if (!messageTypeAvp) {
        console.warn(`[VpnServerManager] 未找到消息类型AVP`);
        return;
      }
      
      if (messageTypeAvp.value.length < 2) {
        console.warn(`[VpnServerManager] Control message without valid Message Type AVP received.`);
        return;
      }
      
      const messageType = messageTypeAvp.value.readUInt16BE(0);
      console.log(`[VpnServerManager] 找到消息类型: ${messageType}`);
      console.log(`[VpnServerManager] 客户端消息AVP元数据:`, avps.map(avp => ({
        type: avp.type,
        vendorId: avp.vendorId,
        length: avp.value.length
      })));
      
      // 根据消息类型处理
      switch (messageType) {
        case 1: // SCCRQ (Start-Control-Connection-Request)
          this.handleSccrq(rinfo, tunnelId, ns, nr);
          break;
        case 2: // SCCRP (Start-Control-Connection-Reply)
          this.handleSccrp(rinfo, tunnelId, ns, nr, avps);
          break;
        case 3: // SCCCN (Start-Control-Connection-Connected)
          this.handleScccn(rinfo, tunnelId, ns, nr, avps);
          break;
        case 6: // StopCCN (Stop-Control-Connection-Notification)
            this.handleStopccn(rinfo, tunnelId, ns, nr);
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

  private parseAvps(msg: Buffer, offset: number): ParsedAvp[] {
    const avps: ParsedAvp[] = [];
    let avpOffset = offset;
    
    console.log(`[VpnServerManager] 开始解析AVPs，起始偏移: ${offset}, 消息总长度: ${msg.length}`);
    
    while (avpOffset < msg.length) {
      if (avpOffset + 6 > msg.length) {
        console.warn(`[VpnServerManager] AVP数据太短，无法解析头部。偏移: ${avpOffset}, 剩余长度: ${msg.length - avpOffset}`);
        break;
      }

      const avpHeader = msg.readUInt16BE(avpOffset);
      const isMandatory = (avpHeader & 0x8000) !== 0;
      const avpLength = avpHeader & 0x03FF;
      const vendorId = msg.readUInt16BE(avpOffset + 2);
      const avpType = msg.readUInt16BE(avpOffset + 4);
      
      console.log(`[VpnServerManager] AVP解析: 偏移=${avpOffset}, 类型=${avpType}, 厂商ID=${vendorId}, 长度=${avpLength}, 标志=0x${avpHeader.toString(16)}, 强制=${isMandatory}`);

      if (avpLength < 6 || avpOffset + avpLength > msg.length) {
        console.warn(`[VpnServerManager] AVP长度无效: ${avpLength}, 偏移: ${avpOffset}, 消息长度: ${msg.length}`);
        break;
      }

      const value = msg.slice(avpOffset + 6, avpOffset + avpLength);
      
      avps.push({ type: avpType, vendorId, value });
      avpOffset += avpLength;
      
      if (avpLength === 0) {
        console.warn(`[VpnServerManager] AVP长度为0，停止解析`);
        break;
      }
    }
    
    console.log(`[VpnServerManager] AVP解析完成，共找到 ${avps.length} 个AVP`);
    return avps;
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
    const serverChallenge = randomBytes(16); // Generate a 16-byte challenge
    this.activeTunnels.set(assignedTunnelId, {
      clientAddress: rinfo.address,
      clientPort: rinfo.port,
      serverChallenge,
    });
    
    // 发送SCCRP响应
    this.sendSccrp(rinfo, assignedTunnelId, ns, nr);
  }

  /**
   * 处理SCCRP (Start-Control-Connection-Reply)
   */
  private handleSccrp(_rinfo: any, tunnelId: number, ns: number, nr: number, _avps: ParsedAvp[]): void {
    console.log(`[VpnServerManager] 处理SCCRP: 隧道=${tunnelId}, Ns=${ns}, Nr=${nr}`);
    // A server should not receive SCCRP.
  }

  /**
   * 处理SCCCN (Start-Control-Connection-Connected)
   */
  private handleScccn(_rinfo: any, tunnelId: number, ns: number, nr: number, avps: ParsedAvp[]): void {
    console.log(`[VpnServerManager] 处理SCCCN: 隧道=${tunnelId}, Ns=${ns}, Nr=${nr}`);
    const tunnel = this.activeTunnels.get(tunnelId);
    if (!tunnel) {
        console.error(`[VpnServerManager] SCCCN for unknown tunnel ${tunnelId}`);
        return;
    }

    // RFC 2661 Section 5.3: Challenge Response is AVP type 8
    const challengeResponseAvp = avps.find(avp => avp.vendorId === 0 && avp.type === 8);
    if (!challengeResponseAvp) {
        console.error(`[VpnServerManager] SCCCN missing Challenge Response AVP. Disconnecting.`);
        // TODO: Send StopCCN
        return;
    }

    // Validate challenge response
    const id = Buffer.from([2]); // Responding to SCCRP, which is Message Type 2
    const expectedResponse = createHash('md5')
        .update(id)
        .update(this.serverInfo.sharedSecret)
        .update(tunnel.serverChallenge)
        .digest();
    
    if (!expectedResponse.equals(challengeResponseAvp.value)) {
        console.error(`[VpnServerManager] Invalid Challenge Response. Disconnecting.`);
        // TODO: Send StopCCN
        return;
    }

    console.log(`[VpnServerManager] Challenge Response validated. Control connection established: Tunnel=${tunnelId}`);
  }

  private handleStopccn(rinfo: any, tunnelId: number, ns: number, _nr: number): void {
    console.log(`[VpnServerManager] 处理StopCCN，隧道ID: ${tunnelId}`);
    console.log(`[VpnServerManager] StopCCN详情: tunnelId=${tunnelId}, ns=${ns}, _nr=${_nr}`);
    console.log(`[VpnServerManager] 收到 StopCCN 请求`);
    
    // Send StopCCN response with the same tunnel ID as the request
    this.sendStopccn(rinfo, tunnelId, 0, ns + 1);
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

  private createAvp(attributeType: number, value: Buffer, vendorId = 0, isMandatory = true): Buffer {
    const headerLength = 6;
    const totalLength = headerLength + value.length;
    const buffer = Buffer.alloc(totalLength);

    let flags = totalLength & 0x03FF;
    if (isMandatory) {
        flags |= 0x8000;
    }

    buffer.writeUInt16BE(flags, 0);
    buffer.writeUInt16BE(vendorId, 2);
    buffer.writeUInt16BE(attributeType, 4);
    value.copy(buffer, 6);

    return buffer;
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
  private createL2tpControlMessage(tunnelId: number, sessionId: number, ns: number, nr: number, messageType: number, avps: Buffer[] = []): Buffer {
    // Message Type AVP (8 bytes)
    const messageTypeAvp = Buffer.alloc(8);
    messageTypeAvp.writeUInt16BE(0x8008, 0); // Flags(M=1, Length=8)
    messageTypeAvp.writeUInt16BE(0, 2);      // Vendor ID
    messageTypeAvp.writeUInt16BE(0, 4);      // Attribute Type (Message Type = 0)
    messageTypeAvp.writeUInt16BE(messageType, 6); // Value

    const allAvps = Buffer.concat([messageTypeAvp, ...avps]);

    // L2TP Header (12 bytes)
    const header = Buffer.alloc(12);
    const totalLength = header.length + allAvps.length;
    
    header.writeUInt16BE(0xc802, 0); // Flags: T=1, L=1, S=1, Version=2
    header.writeUInt16BE(totalLength, 2);
    header.writeUInt16BE(tunnelId, 4);
    header.writeUInt16BE(sessionId, 6);
    header.writeUInt16BE(ns, 8);
    header.writeUInt16BE(nr, 10);

    return Buffer.concat([header, allAvps]);
  }

  /**
   * 发送SCCRP (Start-Control-Connection-Reply)
   */
  private sendSccrp(rinfo: any, tunnelId: number, ns: number, nr: number): void {
    console.log(`[VpnServerManager] 发送SCCRP: 隧道=${tunnelId}, Ns=${ns}, Nr=${nr}`);

    const tunnel = this.activeTunnels.get(tunnelId);
    if (!tunnel) {
      console.error(`[VpnServerManager] sendSccrp failed: Tunnel ${tunnelId} not found.`);
      return;
    }

    // Create AVPs
    const messageTypeValue = Buffer.alloc(2);
    messageTypeValue.writeUInt16BE(2, 0); // SCCRP is type 2
    const messageTypeAvp = this.createAvp(0, messageTypeValue);

    const protocolVersionValue = Buffer.alloc(2);
    protocolVersionValue.writeUInt16BE(0x0100, 0); // Version 1, Revision 0
    const protocolVersionAvp = this.createAvp(2, protocolVersionValue);

    const framingCapabilitiesValue = Buffer.alloc(4);
    framingCapabilitiesValue.writeUInt32BE(3, 0); // Async and Sync framing support
    const framingCapabilitiesAvp = this.createAvp(3, framingCapabilitiesValue);

    const hostNameValue = Buffer.from('ChongDongVPN');
    const hostNameAvp = this.createAvp(7, hostNameValue);

    const challengeAvp = this.createAvp(6, tunnel.serverChallenge);

    const allAvps = Buffer.concat([
      messageTypeAvp,
      protocolVersionAvp,
      framingCapabilitiesAvp,
      hostNameAvp,
      challengeAvp,
    ]);

    // L2TP Header + Control Header part
    const header = Buffer.alloc(12);
    const totalLength = header.length + allAvps.length;

    header.writeUInt16BE(0xC802, 0); // Control, Length, Sequence numbers, Version 2
    header.writeUInt16BE(totalLength, 2);
    header.writeUInt16BE(tunnelId, 4); // Assigned Tunnel ID
    header.writeUInt16BE(0, 6);      // Session ID
    header.writeUInt16BE(0, 8);      // Ns = 0 (our first message)
    header.writeUInt16BE(ns + 1, 10);     // Nr = acknowledging client's Ns=0

    const response = Buffer.concat([header, allAvps]);

    console.log(`[VpnServerManager] SCCRP响应长度: ${response.length}`);
    this.sendL2tpMessage(rinfo, response);
  }

  /**
   * 发送StopCCN (Stop-Control-Connection-Notification)
   */
  private sendStopccn(rinfo: any, tunnelId: number, ns: number, nr: number): void {
    // Send StopCCN response that matches the client's format exactly - no Result Code AVP
    const response = this.createL2tpControlMessage(tunnelId, 0, ns, nr, 6); // StopCCN = 6, no additional AVPs
    console.log(`[VpnServerManager] 发送StopCCN响应到 ${rinfo.address}:${rinfo.port}`);
    console.log(`[VpnServerManager] StopCCN响应长度: ${response.length} 字节`);
    console.log(`[VpnServerManager] StopCCN响应详情:`);
    console.log(`  - 标志: 0x${response.readUInt16BE(0).toString(16)}`);
    console.log(`  - 长度: ${response.readUInt16BE(2)}`);
    console.log(`  - 隧道ID: ${response.readUInt16BE(4)}`);
    console.log(`  - 会话ID: ${response.readUInt16BE(6)}`);
    console.log(`  - Ns: ${response.readUInt16BE(8)}`);
    console.log(`  - Nr: ${response.readUInt16BE(10)}`);
    
    // Parse our own response to show AVPs
    const ourAvps = this.parseAvps(response, 12);
    console.log(`[VpnServerManager] 我们发送的AVP元数据:`, ourAvps.map(avp => ({
      type: avp.type,
      vendorId: avp.vendorId,
      length: avp.value.length
    })));
    
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
            console.log(`[VpnServerManager] 已移除代理节点直连路由`);
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
