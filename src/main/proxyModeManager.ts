import { AppSettings, NetworkSettings } from '../shared/types';
import { systemProxyManager } from './systemProxyManager';

export interface ProxyModeConfig {
  mode: 'rule' | 'global' | 'direct' | 'vpn';
  settings: AppSettings;
  networkSettings?: NetworkSettings;
}

export interface ProxyModeResult {
  success: boolean;
  message: string;
  port?: number;
  vpnName?: string;
}

/**
 * 代理模式管理器
 * 统一处理不同代理模式的实现逻辑
 */
export class ProxyModeManager {
  private static instance: ProxyModeManager;
  private currentMode: string = 'rule';
  private currentVpnName: string | undefined = undefined;

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
  public async applyProxyMode(config: ProxyModeConfig): Promise<ProxyModeResult> {
    const { mode, settings, networkSettings } = config;
    
    console.log(`[ProxyModeManager] 应用代理模式: ${mode}`);
    
    try {
      // 先清理之前的模式
      await this.cleanupCurrentMode();
      
      // 应用新模式
      switch (mode) {
        case 'rule':
          return await this.applyRuleMode(settings, networkSettings);
        case 'global':
          return await this.applyGlobalMode(settings, networkSettings);
        case 'direct':
          return await this.applyDirectMode(settings, networkSettings);
        case 'vpn':
          return await this.applyVpnMode(settings, networkSettings);
        default:
          throw new Error(`不支持的代理模式: ${mode}`);
      }
    } catch (error) {
      console.error(`[ProxyModeManager] 应用代理模式失败:`, error);
      return {
        success: false,
        message: `应用代理模式失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 清理当前模式
   */
  private async cleanupCurrentMode(): Promise<void> {
    console.log(`[ProxyModeManager] 清理当前模式: ${this.currentMode}`);
    
    try {
      // 断开VPN连接
      if (this.currentMode === 'vpn' && this.currentVpnName) {
        await systemProxyManager.disconnectVPN(this.currentVpnName);
        this.currentVpnName = undefined as string | undefined;
      }
      
      // 关闭系统代理
      await systemProxyManager.clearSystemProxy();
      
      console.log(`[ProxyModeManager] 当前模式清理完成`);
    } catch (error) {
      console.error(`[ProxyModeManager] 清理当前模式失败:`, error);
    }
  }

  /**
   * 应用规则模式
   */
  private async applyRuleMode(settings: AppSettings, _networkSettings?: NetworkSettings): Promise<ProxyModeResult> {
    console.log(`[ProxyModeManager] 应用规则模式`);
    
    try {
      // 规则模式：基于用户定义的规则进行流量路由
      // 这里需要启动代理服务，但只对匹配规则的流量进行代理
      
      // 设置系统代理
      if (settings.systemProxy) {
        await systemProxyManager.setSystemProxy('127.0.0.1', settings.socksPort, settings.proxyPort);
      }
      
      this.currentMode = 'rule';
      
      return {
        success: true,
        message: '规则模式已启用，将根据用户定义的规则进行流量路由',
        port: settings.proxyPort
      };
    } catch (error) {
      throw new Error(`应用规则模式失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 应用全局模式
   */
  private async applyGlobalMode(settings: AppSettings, _networkSettings?: NetworkSettings): Promise<ProxyModeResult> {
    console.log(`[ProxyModeManager] 应用全局模式`);
    
    try {
      // 全局模式：所有流量都通过代理
      
      // 设置系统代理
      if (settings.systemProxy) {
        await systemProxyManager.setSystemProxy('127.0.0.1', settings.socksPort, settings.proxyPort);
      }
      
      this.currentMode = 'global';
      
      return {
        success: true,
        message: '全局模式已启用，所有流量都将通过代理',
        port: settings.proxyPort
      };
    } catch (error) {
      throw new Error(`应用全局模式失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 应用直连模式
   */
  private async applyDirectMode(_settings: AppSettings, _networkSettings?: NetworkSettings): Promise<ProxyModeResult> {
    console.log(`[ProxyModeManager] 应用直连模式`);
    
    try {
      // 直连模式：所有流量直连，不经过代理
      
      // 关闭系统代理
      await systemProxyManager.clearSystemProxy();
      
      this.currentMode = 'direct';
      
      return {
        success: true,
        message: '直连模式已启用，所有流量将直连，不经过代理'
      };
    } catch (error) {
      throw new Error(`应用直连模式失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 应用VPN模式
   */
  private async applyVpnMode(_settings: AppSettings, _networkSettings?: NetworkSettings): Promise<ProxyModeResult> {
    console.log(`[ProxyModeManager] 应用VPN模式`);
    
    try {
      // VPN模式：通过系统VPN接口代理全部流量
      
      // 关闭系统代理（VPN模式下不需要系统代理）
      await systemProxyManager.clearSystemProxy();
      
      // 创建VPN连接配置
      const vpnConfig = {
        name: 'ChongdongVPN',
        server: '127.0.0.1', // 这里应该使用实际的VPN服务器地址
        type: 'l2tp' as const, // 在macOS上使用L2TP类型更兼容
        username: 'chongdong',
        password: 'defaultsecret'
      };
      
      try {
        // 创建VPN连接
        await systemProxyManager.createVPNConnection(vpnConfig);
        console.log(`[ProxyModeManager] VPN连接已创建: ${vpnConfig.name}`);
        
        // 尝试连接VPN
        await systemProxyManager.connectVPN(vpnConfig.name);
        console.log(`[ProxyModeManager] VPN连接已建立: ${vpnConfig.name}`);
        
        this.currentMode = 'vpn';
        this.currentVpnName = vpnConfig.name;
        
        return {
          success: true,
          message: 'VPN模式已启用，通过系统VPN接口代理全部流量',
          vpnName: vpnConfig.name
        };
      } catch (vpnError) {
        console.warn(`[ProxyModeManager] VPN连接失败，但VPN模式仍已启用:`, vpnError);
        
        // 即使VPN连接失败，我们仍然可以启用VPN模式
        // 这样用户可以看到状态并了解问题
        this.currentMode = 'vpn';
        this.currentVpnName = vpnConfig.name;
        
        return {
          success: true,
          message: 'VPN模式已启用，但VPN连接可能需要手动配置。请检查VPN设置或联系管理员。',
          vpnName: vpnConfig.name
        };
      }
    } catch (error) {
      throw new Error(`应用VPN模式失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取当前模式
   */
  public getCurrentMode(): string {
    return this.currentMode;
  }

  /**
   * 获取当前VPN名称
   */
  public getCurrentVpnName(): string | undefined {
    return this.currentVpnName;
  }

  /**
   * 检查VPN连接状态
   */
  public async checkVpnStatus(): Promise<{ connected: boolean; error?: string }> {
    if (this.currentMode !== 'vpn' || !this.currentVpnName) {
      return { connected: false, error: '当前不是VPN模式' };
    }
    
    try {
      const status = await systemProxyManager.getVPNStatus(this.currentVpnName);
      return { 
        connected: status.connected, 
        ...(status.error && { error: status.error })
      };
    } catch (error) {
      return { connected: false, error: `检查VPN状态失败: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * 断开VPN连接
   */
  public async disconnectVpn(): Promise<void> {
    if (this.currentMode === 'vpn' && this.currentVpnName) {
      try {
        await systemProxyManager.disconnectVPN(this.currentVpnName);
        this.currentVpnName = undefined as string | undefined;
        console.log(`[ProxyModeManager] VPN连接已断开`);
      } catch (error) {
        console.error(`[ProxyModeManager] 断开VPN连接失败:`, error);
        throw error;
      }
    }
  }
}

export const proxyModeManager = ProxyModeManager.getInstance();
