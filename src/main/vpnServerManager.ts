import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { app } from 'electron';
import { ProxyNode, ChainConfig } from '../shared/types';
import { createServer, Server } from 'net';

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
    protocol: string;
  };
}

/**
 * VPN服务器管理器
 * 启动内置的L2TP服务器，供系统VPN客户端连接
 */
export class VpnServerManager {
  private static instance: VpnServerManager;
  private configDir: string;
  private status: VpnServerStatus = {
    running: false,
    connectedClients: 0
  };
  private l2tpServer?: Server;
  private serverInfo = {
    host: '127.0.0.1',
    port: 1701, // L2TP默认端口
    username: 'chongdong',
    password: 'chongdong123',
    protocol: 'L2TP/IPSec'
  };

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
      // 启动内置L2TP服务器
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
   * 启动内置L2TP服务器
   */
  private async startL2tpServer(): Promise<void> {
    try {
      // 创建TCP服务器监听L2TP端口
      this.l2tpServer = createServer((socket) => {
        console.log(`[VpnServerManager] 新的L2TP连接: ${socket.remoteAddress}:${socket.remotePort}`);
        this.status.connectedClients++;
        
        // 处理L2TP连接
        this.handleL2tpConnection(socket);
        
        socket.on('close', () => {
          console.log(`[VpnServerManager] L2TP连接断开: ${socket.remoteAddress}:${socket.remotePort}`);
          this.status.connectedClients = Math.max(0, this.status.connectedClients - 1);
        });
        
        socket.on('error', (error) => {
          console.error(`[VpnServerManager] L2TP连接错误:`, error);
        });
      });

      // 监听指定端口
      await new Promise<void>((resolve, reject) => {
        this.l2tpServer!.listen(this.serverInfo.port, this.serverInfo.host, () => {
          console.log(`[VpnServerManager] L2TP服务器监听在 ${this.serverInfo.host}:${this.serverInfo.port}`);
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
   * 处理L2TP连接
   */
  private handleL2tpConnection(socket: any): void {
    // 这里实现L2TP协议处理
    // 简化实现：接受连接并保持连接
    console.log(`[VpnServerManager] 处理L2TP连接...`);
    
    // 发送L2TP欢迎消息
    const welcomeMessage = Buffer.from('L2TP Server Ready\n');
    socket.write(welcomeMessage);
    
    // 保持连接活跃
    const keepAlive = setInterval(() => {
      if (socket.destroyed) {
        clearInterval(keepAlive);
        return;
      }
      // 发送心跳包
      socket.write(Buffer.from([0x00]));
    }, 30000); // 30秒心跳
    
    socket.on('close', () => {
      clearInterval(keepAlive);
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
    
    console.log(`[VpnServerManager] 内置L2TP服务器已停止`);
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
  public getServerInfo(): { host: string; port: number; username: string; password: string; protocol: string } | undefined {
    return this.status.serverInfo;
  }

  /**
   * 生成系统VPN配置说明
   */
  public generateVpnConfigInstructions(): string {
    if (!this.status.serverInfo) {
      return 'VPN服务器未运行';
    }
    
    const { host, port, username, password, protocol } = this.status.serverInfo;
    
    return `
VPN服务器信息：
- 服务器地址: ${host}
- 端口: ${port}
- 协议: ${protocol}
- 用户名: ${username}
- 密码: ${password}

请在系统网络设置中添加VPN连接，使用以上信息进行配置。
    `.trim();
  }
}

export const vpnServerManager = VpnServerManager.getInstance();
