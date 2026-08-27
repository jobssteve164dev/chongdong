import { networkInterfaces } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Ipv6LeakResult, AppSettings } from '../../shared/types';

const execAsync = promisify(exec);

/**
 * IPv6泄露防护服务
 */
export class Ipv6LeakProtectionService {
  private static instance: Ipv6LeakProtectionService;
  private settings: AppSettings | null = null;
  private leakProtectionEnabled: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    console.log('Ipv6LeakProtectionService initialized');
  }

  public static getInstance(): Ipv6LeakProtectionService {
    if (!Ipv6LeakProtectionService.instance) {
      Ipv6LeakProtectionService.instance = new Ipv6LeakProtectionService();
    }
    return Ipv6LeakProtectionService.instance;
  }

  /**
   * 初始化服务
   */
  public init(settings: AppSettings): void {
    this.settings = settings;
    this.leakProtectionEnabled = settings.enableIpv6LeakProtection || false;
    console.log('Ipv6LeakProtectionService settings updated');
  }

  /**
   * 启用/禁用IPv6泄露防护
   */
  public setLeakProtectionEnabled(enabled: boolean): void {
    this.leakProtectionEnabled = enabled;
    console.log(`IPv6泄露防护已${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 获取IPv6网络接口信息
   */
  public getIPv6Interfaces(): Array<{
    name: string;
    address: string;
    netmask: string;
    family: string;
    internal: boolean;
    scopeid?: number;
  }> {
    const interfaces = networkInterfaces();
    const result: Array<{
      name: string;
      address: string;
      netmask: string;
      family: string;
      internal: boolean;
      scopeid?: number;
    }> = [];

    for (const [name, nets] of Object.entries(interfaces)) {
      if (nets) {
        for (const net of nets) {
          if (net.family === 'IPv6') {
            result.push({
              name,
              address: net.address,
              netmask: net.netmask || '',
              family: 'IPv6',
              internal: net.internal,
              scopeid: net.scopeid
            });
          }
        }
      }
    }

    return result;
  }

  /**
   * 检测IPv6泄露
   */
  public async checkIPv6Leak(): Promise<Ipv6LeakResult> {
    const details: string[] = [];
    const leakSources: string[] = [];
    const detectedIpv6Addresses: string[] = [];
    let leaked = false;

    if (!this.settings) {
      return {
        leaked: true,
        details: ['Settings not initialized'],
        leakSources: ['配置未初始化'],
        detectedIpv6Addresses: []
      };
    }

    try {
      // 检查是否启用了IPv6泄露防护
      if (!this.leakProtectionEnabled) {
        details.push('⚠️ IPv6泄露防护未启用');
        leakSources.push('IPv6泄露防护未启用');
        leaked = true;
      }

      // 获取本地IPv6接口
      const ipv6Interfaces = this.getIPv6Interfaces();
      const publicIpv6Addresses = ipv6Interfaces.filter(iface =>
        !iface.internal &&
        iface.address !== '::1' &&
        !iface.address.toLowerCase().startsWith('fe80:')
      );
      
      details.push(`检测到 ${ipv6Interfaces.length} 个IPv6网络接口`);
      details.push(`其中 ${publicIpv6Addresses.length} 个为公网接口`);

      // 地址只在主进程内用于判断，不跨 IPC 返回或写入日志。
      for (const iface of publicIpv6Addresses) {
        details.push(`接口 ${iface.name} 存在可路由 IPv6 地址（具体地址已隐藏）`);
      }

      if (publicIpv6Addresses.length > 0 && this.settings.ipv6LeakProtectionMode === 'strict') {
        leaked = true;
        leakSources.push('严格模式下本地接口仍存在可路由 IPv6 地址');
        details.push('严格模式要求阻断 IPv6；当前本地接口状态不满足要求');
      } else if (publicIpv6Addresses.length === 0) {
        details.push('本地接口未发现可路由 IPv6 地址；尚未验证真实出口');
      }

      // 检查系统IPv6配置
      await this.checkSystemIPv6Configuration(details, leakSources);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      details.push(`IPv6泄露检测执行失败: ${errorMessage}`);
      leakSources.push(`检测执行失败: ${errorMessage}`);
      leaked = true;
    }

    return {
      leaked,
      verified: false,
      details,
      leakSources,
      detectedIpv6Addresses
    };
  }

  /**
   * 检查系统IPv6配置
   */
  private async checkSystemIPv6Configuration(details: string[], _leakSources: string[]): Promise<void> {
    try {
      const platform = process.platform;
      
      if (platform === 'darwin') {
        // macOS IPv6配置检查
        try {
          const { stdout } = await execAsync('networksetup -listallnetworkservices');
          const services = stdout.trim().split('\n').filter(line => line.trim() && !line.includes('*'));
          
          for (const service of services) {
            try {
              const { stdout: ipv6Info } = await execAsync(`networksetup -getinfo "${service}" | grep -i ipv6`);
              if (ipv6Info.trim()) {
                details.push(`网络服务 ${service} IPv6配置: ${ipv6Info.trim()}`);
              }
            } catch (error) {
              // 忽略单个服务的检查失败
            }
          }
        } catch (error) {
          details.push('无法获取macOS网络服务IPv6配置');
        }
      } else if (platform === 'linux') {
        // Linux IPv6配置检查
        try {
          const { stdout } = await execAsync('ip -6 addr show');
          if (stdout.trim()) {
            details.push('Linux IPv6接口配置:');
            details.push(stdout.trim());
          }
        } catch (error) {
          details.push('无法获取Linux IPv6接口配置');
        }
      } else if (platform === 'win32') {
        // Windows IPv6配置检查
        try {
          const { stdout } = await execAsync('ipconfig /all | findstr /i "ipv6"');
          if (stdout.trim()) {
            details.push('Windows IPv6配置:');
            details.push(stdout.trim());
          }
        } catch (error) {
          details.push('无法获取Windows IPv6配置');
        }
      }
    } catch (error) {
      details.push(`系统IPv6配置检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取IPv6泄露防护状态
   */
  public getLeakProtectionStatus(): { enabled: boolean; mode: string; strictMode: boolean } {
    return {
      enabled: this.leakProtectionEnabled,
      mode: this.settings?.ipv6LeakProtectionMode || 'relaxed',
      strictMode: this.settings?.ipv6LeakProtectionMode === 'strict'
    };
  }

  /**
   * 开始IPv6泄露监控
   */
  public async startLeakMonitoring(intervalMs: number = 60000): Promise<void> {
    if (!this.leakProtectionEnabled) {
      console.log('IPv6泄露防护未启用，跳过监控');
      return;
    }

    console.log(`开始IPv6泄露监控，间隔: ${intervalMs}ms`);
    
    const monitor = async () => {
      try {
        const leakResult = await this.checkIPv6Leak();
        if (leakResult.leaked) {
          console.warn('🚨 IPv6泄露检测到:', leakResult.leakSources);
          // 这里可以添加通知逻辑
        } else if (leakResult.verified === true) {
          console.log('IPv6 泄露检查已通过外部观测验证');
        } else {
          console.log('IPv6 本地检查未发现明确泄露，但缺少真实出口证据');
        }
      } catch (error) {
        console.error('IPv6泄露监控执行失败:', error);
      }
    };

    // 立即执行一次
    await monitor();
    
    // 设置定时监控
    this.monitoringInterval = setInterval(monitor, intervalMs);
  }

  /**
   * 停止IPv6泄露监控
   */
  public stopLeakMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('IPv6泄露监控已停止');
    }
  }

  /**
   * 检查IPv6连接是否被允许
   */
  public async isIPv6ConnectionAllowed(_destination: string): Promise<boolean> {
    if (!this.leakProtectionEnabled) {
      return true;
    }

    if (this.settings?.ipv6LeakProtectionMode === 'strict') {
      // 严格模式：阻止所有IPv6连接
      return false;
    } else {
      // 宽松模式：允许通过代理的IPv6连接
      // 这里可以添加更复杂的逻辑，比如检查目标地址是否在代理范围内
      return true;
    }
  }
}

export const ipv6LeakProtectionService = Ipv6LeakProtectionService.getInstance();
