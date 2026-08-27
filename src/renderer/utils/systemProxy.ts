const { ipcRenderer } = window.electron;

import { assertSuccessfulIpcResult } from '../../shared/proxyRuntime';

export interface ProxySettings {
  host: string;
  port: number;
  enabled: boolean;
}

export interface VPNConfig {
  name: string;
  server: string;
  username?: string;
  password?: string;
  type: 'openvpn' | 'wireguard' | 'ikev2' | 'l2tp';
}

export interface TUNConfig {
  interfaceName: string;
  autoRoute: boolean;
  strictRoute: boolean;
  sniff: boolean;
}

export class SystemProxy {
  private static instance: SystemProxy;

  private constructor() {}

  public static getInstance(): SystemProxy {
    if (!SystemProxy.instance) {
      SystemProxy.instance = new SystemProxy();
    }
    return SystemProxy.instance;
  }

  /**
   * 设置系统代理
   */
  public async setSystemProxy(host: string, socksPort: number, httpPort?: number): Promise<void> {
    try {
      const result = await ipcRenderer.invoke('system:setProxy', { host, socksPort, httpPort });
      assertSuccessfulIpcResult(result, '系统代理设置失败');
    } catch (error) {
      throw new Error(`Failed to set system proxy: ${error}`);
    }
  }

  /**
   * 清除系统代理
   */
  public async clearSystemProxy(): Promise<void> {
    try {
      const result = await ipcRenderer.invoke('system:clearProxy');
      assertSuccessfulIpcResult(result, '系统代理清理失败');
    } catch (error) {
      throw new Error(`Failed to clear system proxy: ${error}`);
    }
  }

  /**
   * 获取当前系统代理设置
   */
  public async getSystemProxy(): Promise<ProxySettings | null> {
    try {
      const settings = await ipcRenderer.invoke('system:getProxy');
      return settings;
    } catch (error) {
      throw new Error(`Failed to get system proxy: ${error}`);
    }
  }

  /**
   * 创建VPN连接
   */
  public async createVPNConnection(config: VPNConfig): Promise<void> {
    try {
      const result = await ipcRenderer.invoke('vpn:create', config);
      assertSuccessfulIpcResult(result, 'VPN 配置创建失败');
    } catch (error) {
      throw new Error(`Failed to create VPN connection: ${error}`);
    }
  }

  /**
   * 连接VPN
   */
  public async connectVPN(name: string): Promise<void> {
    try {
      const result = await ipcRenderer.invoke('vpn:connect', name);
      assertSuccessfulIpcResult(result, 'VPN 连接失败');
    } catch (error) {
      throw new Error(`Failed to connect VPN: ${error}`);
    }
  }

  /**
   * 断开VPN
   */
  public async disconnectVPN(name: string): Promise<void> {
    try {
      const result = await ipcRenderer.invoke('vpn:disconnect', name);
      assertSuccessfulIpcResult(result, 'VPN 断开失败');
    } catch (error) {
      throw new Error(`Failed to disconnect VPN: ${error}`);
    }
  }

  /**
   * 获取VPN连接状态
   */
  public async getVPNStatus(name: string): Promise<{ connected: boolean; error?: string }> {
    try {
      return await ipcRenderer.invoke('vpn:getStatus', name);
    } catch (error) {
      throw new Error(`Failed to get VPN status: ${error}`);
    }
  }

  /**
   * 创建TUN设备
   */
  public async createTUNDevice(config: TUNConfig): Promise<void> {
    void config;
    throw new Error('独立 TUN 设备接口未开放，请通过 VPN 模式建立可信链路');
  }

  /**
   * 删除TUN设备
   */
  public async removeTUNDevice(interfaceName: string): Promise<void> {
    void interfaceName;
    throw new Error('独立 TUN 设备接口未开放，请通过 VPN 模式管理可信链路');
  }

  /**
   * 获取TUN设备状态
   */
  public async getTUNStatus(interfaceName: string): Promise<{ exists: boolean; active: boolean }> {
    void interfaceName;
    throw new Error('独立 TUN 状态接口未开放，请查询 VPN 模式状态');
  }

  /**
   * 设置路由表
   */
  public async setRoutes(routes: Array<{ destination: string; gateway: string; interface?: string }>): Promise<void> {
    void routes;
    throw new Error('系统路由写入能力尚未接通，已拒绝修改路由表');
  }

  /**
   * 清除路由表
   */
  public async clearRoutes(): Promise<void> {
    throw new Error('系统路由恢复能力尚未接通，已拒绝修改路由表');
  }

  /**
   * 设置DNS服务器
   */
  public async setDNSServers(servers: string[]): Promise<void> {
    void servers;
    throw new Error('操作系统 DNS 写入能力尚未接通，已拒绝修改 DNS');
  }

  /**
   * 恢复默认DNS设置
   */
  public async restoreDefaultDNS(): Promise<void> {
    throw new Error('操作系统 DNS 恢复能力尚未接通，已拒绝修改 DNS');
  }

  /**
   * 检查系统权限
   */
  public async checkPermissions(): Promise<{
    admin: boolean;
    network: boolean;
    vpn: boolean;
  }> {
    try {
      return await ipcRenderer.invoke('system:checkPermissions');
    } catch (error) {
      throw new Error(`Failed to check permissions: ${error}`);
    }
  }

  /**
   * 请求管理员权限
   */
  public async requestAdminPrivileges(): Promise<boolean> {
    try {
      return await ipcRenderer.invoke('system:requestAdmin');
    } catch (error) {
      throw new Error(`Failed to request admin privileges: ${error}`);
    }
  }

  /**
   * 获取网络接口信息
   */
  public async getNetworkInterfaces(): Promise<Array<{
    name: string;
    address: string;
    netmask: string;
    family: string;
    internal: boolean;
  }>> {
    try {
      return await ipcRenderer.invoke('network:getInterfaces');
    } catch (error) {
      throw new Error(`Failed to get network interfaces: ${error}`);
    }
  }

  /**
   * 获取当前网络状态
   */
  public async getNetworkStatus(): Promise<{
    connected: boolean;
    type: string;
    interface: string;
    ip: string;
  }> {
    try {
      return await ipcRenderer.invoke('network:getStatus');
    } catch (error) {
      throw new Error(`Failed to get network status: ${error}`);
    }
  }
}

export const systemProxy = SystemProxy.getInstance();
