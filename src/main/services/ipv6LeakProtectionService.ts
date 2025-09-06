import { networkInterfaces } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
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
      const publicIpv6Addresses = ipv6Interfaces.filter(iface => !iface.internal);
      
      details.push(`检测到 ${ipv6Interfaces.length} 个IPv6网络接口`);
      details.push(`其中 ${publicIpv6Addresses.length} 个为公网接口`);

      // 记录检测到的IPv6地址
      for (const iface of publicIpv6Addresses) {
        detectedIpv6Addresses.push(iface.address);
        details.push(`IPv6接口 ${iface.name}: ${iface.address}`);
      }

      // 通过IPv6测试服务器检测真实IPv6地址
      const ipv6TestServers = [
        'https://ipv6.icanhazip.com',
        'https://v6.ident.me',
        'https://ipv6.icanhazip.com'
      ];

      const detectedPublicIpv6: string[] = [];

      for (const server of ipv6TestServers) {
        try {
          const response = await axios.get(server, {
            timeout: 5000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; IPv6LeakTest/1.0)'
            }
          });
          
          const detectedIp = response.data.trim();
          if (detectedIp && this.isValidIPv6(detectedIp)) {
            detectedPublicIpv6.push(detectedIp);
            details.push(`通过 ${server} 检测到IPv6地址: ${detectedIp}`);
          }
        } catch (error) {
          details.push(`通过 ${server} 检测失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      // 分析泄露情况
      if (detectedPublicIpv6.length > 0) {
        // 检查检测到的公网IPv6地址是否与本地接口匹配
        const hasMatchingInterface = detectedPublicIpv6.some(publicIp => 
          publicIpv6Addresses.some(iface => iface.address === publicIp)
        );

        if (hasMatchingInterface) {
          leaked = true;
          leakSources.push('检测到本地IPv6地址与公网IPv6地址匹配');
          details.push('🚨 检测到IPv6泄露：本地IPv6地址暴露到公网');
        } else {
          details.push('✅ 检测到的公网IPv6地址与本地接口不匹配');
        }

        // 检查是否在严格模式下检测到IPv6连接
        if (this.settings.ipv6LeakProtectionMode === 'strict') {
          if (detectedPublicIpv6.length > 0) {
            leaked = true;
            leakSources.push('严格模式下检测到IPv6连接');
            details.push('🚨 严格模式下检测到IPv6连接，可能存在泄露');
          }
        }
      } else {
        details.push('✅ 未检测到公网IPv6地址');
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
   * 验证IPv6地址格式
   */
  private isValidIPv6(ip: string): boolean {
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    return ipv6Regex.test(ip);
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
        } else {
          console.log('✅ IPv6泄露检查通过');
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
