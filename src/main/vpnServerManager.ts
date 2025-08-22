import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { app } from 'electron';
import { ProxyNode, ChainConfig } from '../shared/types';
import { systemProxyManager } from './systemProxyManager';

export interface VpnServerConfig {
  type: 'openvpn' | 'wireguard';
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
}

/**
 * VPN服务器管理器
 * 让虫洞应用作为VPN服务器运行，接收系统VPN流量并路由到代理
 */
export class VpnServerManager {
  private static instance: VpnServerManager;
  private vpnProcess: ChildProcess | undefined = undefined;
  private configDir: string;
  private currentConfig?: VpnServerConfig;
  private status: VpnServerStatus = {
    running: false,
    connectedClients: 0
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
    console.log(`[VpnServerManager] 启动VPN服务器，类型: ${config.type}`);
    
    try {
      this.currentConfig = config;
      
      // 根据类型启动不同的VPN服务器
      switch (config.type) {
        case 'openvpn':
          await this.startOpenVpnServer(config);
          break;
        case 'wireguard':
          await this.startWireGuardServer(config);
          break;
        default:
          throw new Error(`不支持的VPN类型: ${config.type}`);
      }
      
      this.status.running = true;
      this.status.interface = config.interface;
      console.log(`[VpnServerManager] VPN服务器启动成功`);
      
    } catch (error) {
      this.status.error = error instanceof Error ? error.message : String(error);
      console.error(`[VpnServerManager] VPN服务器启动失败:`, error);
      throw error;
    }
  }

  /**
   * 启动OpenVPN服务器
   */
  private async startOpenVpnServer(config: VpnServerConfig): Promise<void> {
    // 生成OpenVPN配置文件
    const configPath = join(this.configDir, 'openvpn-server.conf');
    const openVpnConfig = this.generateOpenVpnConfig(config);
    writeFileSync(configPath, openVpnConfig);

    // 启动OpenVPN服务器进程
    this.vpnProcess = spawn('openvpn', [
      '--config', configPath,
      '--daemon'
    ]);

    this.vpnProcess.on('error', (error) => {
      console.error(`[VpnServerManager] OpenVPN进程错误:`, error);
      this.status.error = error.message;
    });

    this.vpnProcess.on('exit', (code) => {
      console.log(`[VpnServerManager] OpenVPN进程退出，代码: ${code}`);
      this.status.running = false;
    });
  }

  /**
   * 启动WireGuard服务器
   */
  private async startWireGuardServer(config: VpnServerConfig): Promise<void> {
    // 生成WireGuard配置文件
    const configPath = join(this.configDir, 'wg0.conf');
    const wireGuardConfig = this.generateWireGuardConfig(config);
    writeFileSync(configPath, wireGuardConfig);

    // 启动WireGuard接口
    this.vpnProcess = spawn('wg-quick', ['up', configPath]);

    this.vpnProcess.on('error', (error) => {
      console.error(`[VpnServerManager] WireGuard进程错误:`, error);
      this.status.error = error.message;
    });

    this.vpnProcess.on('exit', (code) => {
      console.log(`[VpnServerManager] WireGuard进程退出，代码: ${code}`);
      this.status.running = false;
    });
  }

  /**
   * 生成OpenVPN服务器配置
   */
  private generateOpenVpnConfig(config: VpnServerConfig): string {
    return `
port ${config.port}
proto udp
dev tun
ca ca.crt
cert server.crt
key server.key
dh dh2048.pem
server ${config.subnet} 255.255.255.0
ifconfig-pool-persist ipp.txt
push "redirect-gateway def1 bypass-dhcp"
push "dhcp-option DNS 8.8.8.8"
push "dhcp-option DNS 8.8.4.4"
keepalive 10 120
cipher AES-256-CBC
auth SHA256
comp-lzo
user nobody
group nobody
persist-key
persist-tun
status openvpn-status.log
verb 3
explicit-exit-notify 1
    `.trim();
  }

  /**
   * 生成WireGuard服务器配置
   */
  private generateWireGuardConfig(config: VpnServerConfig): string {
    return `
[Interface]
Address = ${config.subnet}/24
ListenPort = ${config.port}
PrivateKey = ${this.generatePrivateKey()}
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
PublicKey = ${this.generatePublicKey()}
AllowedIPs = ${config.subnet}/32
    `.trim();
  }

  /**
   * 生成私钥（简化实现）
   */
  private generatePrivateKey(): string {
    // 这里应该生成真实的私钥，简化实现
    return 'dGVzdC1wcml2YXRlLWtleQ==';
  }

  /**
   * 生成公钥（简化实现）
   */
  private generatePublicKey(): string {
    // 这里应该生成真实的公钥，简化实现
    return 'dGVzdC1wdWJsaWMta2V5';
  }

  /**
   * 停止VPN服务器
   */
  public async stopVpnServer(): Promise<void> {
    console.log(`[VpnServerManager] 停止VPN服务器`);
    
    if (this.vpnProcess) {
      this.vpnProcess.kill();
      this.vpnProcess = undefined;
    }
    
    this.status.running = false;
    this.status.connectedClients = 0;
    this.status.error = undefined;
    
    console.log(`[VpnServerManager] VPN服务器已停止`);
  }

  /**
   * 获取VPN服务器状态
   */
  public getStatus(): VpnServerStatus {
    return { ...this.status };
  }

  /**
   * 配置系统VPN连接到本地虫洞VPN服务器
   */
  public async configureSystemVpn(): Promise<void> {
    if (!this.currentConfig) {
      throw new Error('VPN服务器未启动');
    }

    const vpnName = 'ChongdongVPN';
    const localServer = '127.0.0.1';
    const port = this.currentConfig.port;

    console.log(`[VpnServerManager] 配置系统VPN连接到本地服务器: ${localServer}:${port}`);
    
    try {
      // 1. 创建系统VPN连接配置
      const vpnConfig = {
        name: vpnName,
        server: `${localServer}:${port}`,
        type: (this.currentConfig.type === 'openvpn' ? 'l2tp' : 'openvpn') as 'l2tp' | 'openvpn', // 根据虫洞VPN服务器类型选择系统VPN类型
        username: 'chongdong',
        password: 'defaultsecret'
      };

      // 2. 使用systemProxyManager创建系统VPN连接
      await systemProxyManager.createVPNConnection(vpnConfig);
      console.log(`[VpnServerManager] 系统VPN连接已创建: ${vpnName}`);

      // 3. 尝试连接系统VPN
      await systemProxyManager.connectVPN(vpnName);
      console.log(`[VpnServerManager] 系统VPN已连接到虫洞服务器: ${vpnName}`);

    } catch (error) {
      console.error(`[VpnServerManager] 配置系统VPN失败:`, error);
      throw new Error(`配置系统VPN失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 处理VPN流量路由到代理
   */
  public async routeVpnTrafficToProxy(): Promise<void> {
    if (!this.currentConfig) {
      throw new Error('VPN服务器未配置');
    }

    console.log(`[VpnServerManager] 配置VPN流量路由到代理`);
    
    // 这里需要实现VPN流量到代理的路由逻辑
    // 可以使用iptables规则或其他网络配置
    // 将VPN接口的流量路由到虫洞的代理端口
  }
}

export const vpnServerManager = VpnServerManager.getInstance();
