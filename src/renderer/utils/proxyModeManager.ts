import { AppSettings, NetworkSettings } from '../../shared/types';

export interface ProxyModeResult {
  success: boolean;
  message: string;
  port?: number;
  vpnName?: string;
}

export interface VpnStatus {
  connected: boolean;
  error?: string;
}

/**
 * 前端代理模式管理器
 * 与主进程的代理模式管理器进行通信
 */
export class ProxyModeManager {
  private static instance: ProxyModeManager;
  private currentMode: string = 'rule';

  private constructor() {}

  public static getInstance(): ProxyModeManager {
    if (!ProxyModeManager.instance) {
      ProxyModeManager.instance = new ProxyModeManager();
    }
    return ProxyModeManager.instance;
  }

  /**
   * 应用代理模式
   */
  public async applyProxyMode(
    mode: 'rule' | 'global' | 'direct' | 'vpn',
    settings: AppSettings,
    networkSettings?: NetworkSettings
  ): Promise<ProxyModeResult> {
    try {
      const result = await window.electron.ipcRenderer.invoke('proxy:applyMode', {
        mode,
        settings,
        networkSettings
      });

      if (result.success) {
        this.currentMode = mode;
      }

      return result;
    } catch (error) {
      console.error('应用代理模式失败:', error);
      return {
        success: false,
        message: `应用代理模式失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 获取当前代理模式
   */
  public async getCurrentMode(): Promise<{ mode: string; vpnName?: string }> {
    try {
      const result = await window.electron.ipcRenderer.invoke('proxy:getCurrentMode');
      if (result.success) {
        this.currentMode = result.mode;
        return { mode: result.mode, vpnName: result.vpnName };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('获取当前代理模式失败:', error);
      return { mode: this.currentMode };
    }
  }

  /**
   * 检查VPN状态
   */
  public async checkVpnStatus(): Promise<VpnStatus> {
    try {
      const result = await window.electron.ipcRenderer.invoke('proxy:checkVpnStatus');
      if (result.success) {
        return { connected: result.connected, error: result.error };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('检查VPN状态失败:', error);
      return { connected: false, error: `检查VPN状态失败: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * 断开VPN连接
   */
  public async disconnectVpn(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await window.electron.ipcRenderer.invoke('proxy:disconnectVpn');
      if (result.success) {
        this.currentMode = 'rule'; // 断开VPN后回到规则模式
      }
      return result;
    } catch (error) {
      console.error('断开VPN连接失败:', error);
      return {
        success: false,
        message: `断开VPN连接失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 获取模式描述
   */
  public getModeDescription(mode: string): string {
    switch (mode) {
      case 'rule':
        return '规则模式：根据用户定义的规则进行流量路由';
      case 'global':
        return '全局模式：所有流量都通过代理';
      case 'direct':
        return '直连模式：所有流量直连，不经过代理';
      case 'vpn':
        return 'VPN模式：通过系统VPN接口代理全部流量';
      default:
        return '未知模式';
    }
  }

  /**
   * 获取模式图标
   */
  public getModeIcon(mode: string): string {
    switch (mode) {
      case 'rule':
        return '🔀';
      case 'global':
        return '🌐';
      case 'direct':
        return '➡️';
      case 'vpn':
        return '🔒';
      default:
        return '❓';
    }
  }
}

export const proxyModeManager = ProxyModeManager.getInstance();
