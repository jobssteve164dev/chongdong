import { ProxyServer, ProxyProtocol } from '../../shared/types';
import { Storage, STORAGE_KEYS } from './storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * 自定义服务器管理器
 */
export class CustomServerManager {
  private static instance: CustomServerManager;
  private customServers: ProxyServer[] = [];

  private constructor() {
    this.loadCustomServers();
  }

  public static getInstance(): CustomServerManager {
    if (!CustomServerManager.instance) {
      CustomServerManager.instance = new CustomServerManager();
    }
    return CustomServerManager.instance;
  }

  /**
   * 加载自定义服务器列表
   */
  private loadCustomServers(): void {
    try {
      this.customServers = Storage.get<ProxyServer[]>(STORAGE_KEYS.CUSTOM_SERVERS, []) || [];
    } catch (error) {
      console.error('Failed to load custom servers:', error);
      this.customServers = [];
    }
  }

  /**
   * 保存自定义服务器列表
   */
  private saveCustomServers(): void {
    try {
      Storage.set(STORAGE_KEYS.CUSTOM_SERVERS, this.customServers);
    } catch (error) {
      console.error('Failed to save custom servers:', error);
    }
  }

  /**
   * 获取所有自定义服务器
   */
  public getCustomServers(): ProxyServer[] {
    return [...this.customServers];
  }

  /**
   * 添加自定义服务器
   */
  public addCustomServer(serverData: Omit<ProxyServer, 'id' | 'isCustom'>): ProxyServer {
    const server: ProxyServer = {
      ...serverData,
      id: uuidv4(),
      isCustom: true,
    };

    this.customServers.push(server);
    this.saveCustomServers();
    return server;
  }

  /**
   * 更新自定义服务器
   */
  public updateCustomServer(id: string, serverData: Partial<Omit<ProxyServer, 'id' | 'isCustom'>>): boolean {
    const index = this.customServers.findIndex(server => server.id === id);
    if (index === -1) {
      return false;
    }

    this.customServers[index] = {
      ...this.customServers[index],
      ...serverData,
      id, // 确保ID不变
      isCustom: true, // 确保标识不变
    };

    this.saveCustomServers();
    return true;
  }

  /**
   * 删除自定义服务器
   */
  public deleteCustomServer(id: string): boolean {
    const index = this.customServers.findIndex(server => server.id === id);
    if (index === -1) {
      return false;
    }

    this.customServers.splice(index, 1);
    this.saveCustomServers();
    return true;
  }

  /**
   * 根据ID获取自定义服务器
   */
  public getCustomServerById(id: string): ProxyServer | null {
    return this.customServers.find(server => server.id === id) || null;
  }

  /**
   * 切换自定义服务器启用状态
   */
  public toggleCustomServerEnabled(id: string): boolean {
    const server = this.getCustomServerById(id);
    if (!server) {
      return false;
    }

    return this.updateCustomServer(id, { enabled: !server.enabled });
  }

  /**
   * 获取启用的自定义服务器
   */
  public getEnabledCustomServers(): ProxyServer[] {
    return this.customServers.filter(server => server.enabled);
  }

  /**
   * 验证服务器配置
   */
  public validateServerConfig(serverData: Partial<ProxyServer>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!serverData.name || serverData.name.trim() === '') {
      errors.push('服务器名称不能为空');
    }

    if (!serverData.protocol) {
      errors.push('请选择代理协议');
    }

    if (!serverData.host || serverData.host.trim() === '') {
      errors.push('服务器地址不能为空');
    }

    if (!serverData.port || serverData.port <= 0 || serverData.port > 65535) {
      errors.push('端口号必须在1-65535之间');
    }

    // 根据协议类型验证必要字段
    if (serverData.protocol) {
      switch (serverData.protocol) {
        case ProxyProtocol.VMESS:
        case ProxyProtocol.VLESS:
          if (!serverData.uuid || serverData.uuid.trim() === '') {
            errors.push('VMess/VLESS协议需要UUID');
          }
          break;
        case ProxyProtocol.TROJAN:
          if (!serverData.password || serverData.password.trim() === '') {
            errors.push('Trojan协议需要密码');
          }
          break;
        case ProxyProtocol.SOCKS5:
        case ProxyProtocol.HTTP:
        case ProxyProtocol.HTTPS:
          if (serverData.username && !serverData.password) {
            errors.push('设置了用户名时必须设置密码');
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 清空所有自定义服务器
   */
  public clearAllCustomServers(): void {
    this.customServers = [];
    this.saveCustomServers();
  }

  /**
   * 获取自定义服务器统计信息
   */
  public getCustomServerStats(): {
    total: number;
    enabled: number;
    disabled: number;
    byProtocol: Record<ProxyProtocol, number>;
  } {
    const stats = {
      total: this.customServers.length,
      enabled: this.customServers.filter(s => s.enabled).length,
      disabled: this.customServers.filter(s => !s.enabled).length,
      byProtocol: {} as Record<ProxyProtocol, number>,
    };

    // 初始化协议统计
    Object.values(ProxyProtocol).forEach(protocol => {
      stats.byProtocol[protocol] = 0;
    });

    // 统计各协议数量
    this.customServers.forEach(server => {
      stats.byProtocol[server.protocol]++;
    });

    return stats;
  }
}

// 导出单例实例
export const customServerManager = CustomServerManager.getInstance();
