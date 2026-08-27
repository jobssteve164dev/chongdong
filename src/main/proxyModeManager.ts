import { AppSettings, NetworkSettings } from '../shared/types';
// import { proxyChainConfigGenerator } from './proxyChainConfigGenerator';
import { systemProxyManager } from './systemProxyManager';
import { proxyManager } from './proxyManager';
import { TunController } from './tunController';
import { CompatPortForwarder } from './compatPortForwarder';
import { isProxyRuntimeRunning } from '../shared/proxyRuntime';

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

  public restoreConfiguredMode(mode: ProxyModeConfig['mode']): void {
    this.currentMode = mode;
    this.currentVpnName = undefined;
    console.log(`[ProxyModeManager] 已恢复模式配置（未接管系统流量）: ${mode}`);
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
      // 新：VPN模式为 TUN，切换时禁用 TUN 并重启引擎
      if (this.currentMode === 'vpn') {
        console.log(`[ProxyModeManager] 关闭 TUN 设置并重启引擎`);
        proxyManager.updateNetworkSettings({ enableTun: false } as any);
        await proxyManager.restartAllProcesses();
        this.currentVpnName = undefined;
      }
      
      // 统一清理系统代理
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
      
      const runtime = await proxyManager.getStats();
      const runtimeRunning = isProxyRuntimeRunning(runtime);

      if (settings.systemProxy && runtimeRunning) {
        await systemProxyManager.setSystemProxy('127.0.0.1', settings.socksPort, settings.proxyPort);
      }
      
      this.currentMode = 'rule';
      
      return {
        success: true,
        message: runtimeRunning
          ? '规则模式已启用，将根据用户定义的规则进行流量路由'
          : '规则模式已选择，将在可信链路启动后生效',
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
      
      const runtime = await proxyManager.getStats();
      const runtimeRunning = isProxyRuntimeRunning(runtime);

      if (settings.systemProxy && runtimeRunning) {
        await systemProxyManager.setSystemProxy('127.0.0.1', settings.socksPort, settings.proxyPort);
      }
      
      this.currentMode = 'global';
      
      return {
        success: true,
        message: runtimeRunning
          ? '全局模式已启用，所有流量都将通过代理'
          : '全局模式已选择，将在可信链路启动后生效',
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
   * 应用VPN模式（TUN）
   */
  private async applyVpnMode(settings: AppSettings, networkSettings?: NetworkSettings): Promise<ProxyModeResult> {
    console.log(`[ProxyModeManager] 应用VPN模式（TUN）`);
    
    try {
      // 新 VPN 模式：自研 TUN（tun2socks）桥接到本地 SOCKS 入口（由中间件或全局代理提供）
      const tunName = networkSettings?.tunDevice || settings.tunDevice || 'utun0';
      const enableUdp = networkSettings?.enableUdp ?? settings.enableUdp ?? true;
      const enableIpv6 = networkSettings?.enableIpv6 ?? settings.enableIpv6 ?? false;
      const dnsServer = networkSettings?.dnsServer || settings.dnsServer; // 可选

      // 优先使用中间件入口端口，其次回退到 settings.socksPort
      const socksPort = (proxyManager as any).getMiddlewareEntryPort?.() || settings.socksPort;
      if (!socksPort || socksPort <= 0) {
        throw new Error('无效的 SOCKS 入口端口，无法启动 TUN 模式');
      }

      const runtime = await proxyManager.getStats();
      if (!isProxyRuntimeRunning(runtime)) {
        throw new Error('代理链路尚未运行，不能启用 TUN 模式');
      }

      // 确保现有代理进程可用（不停止中间件），仅更新网络设置用于其他组件感知
      const mergedNetwork: Partial<NetworkSettings> = {
        enableTun: false,
        tunDevice: tunName,
        enableUdp,
        enableIpv6,
        enableDns: networkSettings?.enableDns ?? settings.enableDns ?? true,
        dnsServer,
      } as any;
      proxyManager.updateNetworkSettings(mergedNetwork as any);

      // 在 TUN 模式下屏蔽后续链路自动设置系统代理
      try { (proxyManager as any).setSuppressSystemProxyForTun?.(true); } catch {}

      // 启动/重启 TUN 控制器
      await TunController.start({
        tunName,
        socksHost: '127.0.0.1',
        socksPort,
        enableUdp,
        enableIpv6,
        dnsServer,
      });

      // 兼容性代理：在 TUN 模式下可选启用 1080 等端口转发（后续实现）
      // 这里仅保留设置占位，实际监听与转发将在 ProxyManager 或专用组件中实现

      this.currentMode = 'vpn';
      this.currentVpnName = 'ChongdongTUN';

      // 清理系统代理，避免与 TUN 冲突
      await systemProxyManager.clearSystemProxy();

      // 兼容端口（例如 1080）→ 转发到中间件入口或 settings 端口
      try {
        if (settings.enableCompatProxy) {
          const httpPort = settings.compatHttpPort || 1080;
          const socksPort = settings.compatSocksPort || 1080;
          const entry = (proxyManager as any).getMiddlewareEntryPort?.() || settings.socksPort;
          if (entry) {
            await CompatPortForwarder.start(httpPort, '127.0.0.1', entry);
            if (socksPort !== httpPort) {
              await CompatPortForwarder.start(socksPort, '127.0.0.1', entry);
            }
          }
        } else {
          await CompatPortForwarder.stopAll();
        }
      } catch (e) {
        console.warn('[ProxyModeManager] 启动兼容端口失败:', e);
      }

      return {
        success: true,
        message: `已启用自研 TUN（tun2socks->${socksPort}），系统代理已清理。`,
        vpnName: 'ChongdongTUN'
      };
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
    if (this.currentMode !== 'vpn') {
      return { connected: false, error: '当前不是VPN模式' };
    }
    
    try {
      const running = (await Promise.resolve(TunController.isRunning())) as boolean;
      return running ? { connected: true } : { connected: false, error: 'TUN 未运行' };
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
        // 停止自研 TUN 控制器
        await TunController.stop();
        await CompatPortForwarder.stopAll();
        proxyManager.updateNetworkSettings({ enableTun: false } as any);
        try { (proxyManager as any).setSuppressSystemProxyForTun?.(false); } catch {}
        this.currentVpnName = undefined;
        console.log(`[ProxyModeManager] 已停止自研 TUN 模式`);
      } catch (error) {
        console.error(`[ProxyModeManager] 断开VPN连接失败:`, error);
        throw error;
      }
    }
  }
}

export const proxyModeManager = ProxyModeManager.getInstance();
