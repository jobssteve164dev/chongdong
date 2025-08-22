import { AppSettings, NetworkSettings } from '../shared/types';
import { systemProxyManager } from './systemProxyManager';
import { vpnServerManager } from './vpnServerManager';

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
      // 注意：在VPN模式下，我们不自动断开系统VPN连接
      // 用户需要手动在系统设置中断开VPN连接
      if (this.currentMode === 'vpn') {
        console.log(`[ProxyModeManager] VPN模式：请手动在系统设置中断开VPN连接`);
        // 只停止内置L2TP服务器
        await vpnServerManager.stopVpnServer();
        this.currentVpnName = undefined;
      }
      
      // 关闭系统代理（仅对非VPN模式）
      if (this.currentMode !== 'vpn') {
        await systemProxyManager.clearSystemProxy();
      }
      
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
      // VPN模式：启动内置L2TP服务器，用户手动配置系统VPN连接
      
      // 1. 获取当前代理节点信息用于流量分流配置
      const proxyNodes = await this.getCurrentProxyNodes();
      console.log(`[ProxyModeManager] 获取到 ${proxyNodes.length} 个代理节点用于流量分流`);
      
      // 2. 启动内置L2TP服务器
      const vpnServerConfig = {
        type: 'l2tp' as const,
        port: 1701, // L2TP默认端口
        interface: 'l2tp0',
        subnet: '10.8.0.0',
        proxyNodes: proxyNodes // 传递代理节点信息用于路由配置
      };
      
      try {
        // 启动内置L2TP服务器
        await vpnServerManager.startVpnServer(vpnServerConfig);
        console.log(`[ProxyModeManager] 内置L2TP服务器已启动`);
        
        // 3. 获取服务器连接信息
        const serverInfo = vpnServerManager.getServerInfo();
        if (!serverInfo) {
          throw new Error('无法获取VPN服务器信息');
        }
        
        console.log(`[ProxyModeManager] VPN服务器信息:`, serverInfo);
        
        this.currentMode = 'vpn';
        this.currentVpnName = 'ChongdongL2TP';
        
        return {
          success: true,
          message: `VPN模式已启用：内置L2TP服务器已启动。请在系统网络设置中添加VPN连接，使用以下信息：
服务器地址: ${serverInfo.host}
端口: ${serverInfo.port}
协议: ${serverInfo.protocol}
用户名: ${serverInfo.username}
密码: ${serverInfo.password}

注意：代理节点流量将直接路由以避免死循环。`,
          vpnName: 'ChongdongL2TP'
        };
      } catch (vpnError) {
        console.warn(`[ProxyModeManager] L2TP服务器启动失败:`, vpnError);
        
        // 清理以防部分成功
        await vpnServerManager.stopVpnServer();

        this.currentMode = 'vpn'; // 仍然设置模式，以便UI可以反映状态
        this.currentVpnName = 'ChongdongL2TP';
        
        return {
          success: false,
          message: `VPN模式启用失败: ${vpnError instanceof Error ? vpnError.message : String(vpnError)}. 请检查端口是否被占用。`,
          vpnName: 'ChongdongL2TP'
        };
      }
    } catch (error) {
      throw new Error(`应用VPN模式失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取当前代理节点信息
   */
  private async getCurrentProxyNodes(): Promise<any[]> {
    try {
      // 这里应该从代理管理器获取当前活跃的代理节点
      // 简化实现：返回空数组，实际应该从proxyManager获取
      console.log(`[ProxyModeManager] 获取当前代理节点信息`);
      return [];
    } catch (error) {
      console.warn(`[ProxyModeManager] 获取代理节点信息失败:`, error);
      return [];
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
    if (this.currentMode !== 'vpn') {
      return { connected: false, error: '当前不是VPN模式' };
    }
    
    try {
      // 检查内置L2TP服务器是否正在运行
      const serverStatus = vpnServerManager.getStatus();
      
      if (!serverStatus.running) {
        return { 
          connected: false, 
          error: serverStatus.error || '内置L2TP服务器未运行' 
        };
      }

      // 如果服务器正在运行，我们假设它已准备好接受连接
      return { 
        connected: true
      };
    } catch (error) {
      return { connected: false, error: `检查VPN状态失败: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * 断开VPN连接
   */
  public async disconnectVpn(): Promise<void> {
    if (this.currentMode === 'vpn') {
      try {
        // 停止内置L2TP服务器
        await vpnServerManager.stopVpnServer();
        this.currentVpnName = undefined; // 清除VPN名称
        console.log(`[ProxyModeManager] 内置L2TP服务器已停止`);
      } catch (error) {
        console.error(`[ProxyModeManager] 断开VPN连接失败:`, error);
        throw error;
      }
    }
  }
}

export const proxyModeManager = ProxyModeManager.getInstance();
