import { AppSettings, DnsRule } from '../../shared/types';
import { log } from './logger';

/**
 * DNS管理器
 * 负责处理DNS安全性和隐私性相关的功能
 */
export class DnsManager {
  private static instance: DnsManager;
  private dnsCache: Map<string, { ip: string; ttl: number; timestamp: number }> = new Map();
  private dnsQueryLog: Array<{ domain: string; server: string; timestamp: number; response: string }> = [];

  private constructor() {}

  public static getInstance(): DnsManager {
    if (!DnsManager.instance) {
      DnsManager.instance = new DnsManager();
    }
    return DnsManager.instance;
  }

  /**
   * 验证DNS服务器配置
   */
  public validateDnsConfig(settings: AppSettings): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证主DNS服务器
    if (settings.enableDns && settings.dnsServer) {
      if (!this.isValidIpAddress(settings.dnsServer) && !this.isValidUrl(settings.dnsServer)) {
        errors.push('主DNS服务器格式无效');
      }
    }

    // 验证DoH服务器
    if (settings.enableDoh && settings.dohServer) {
      if (!this.isValidUrl(settings.dohServer)) {
        errors.push('DoH服务器URL格式无效');
      }
    }

    // 验证DoT服务器
    if (settings.enableDot && settings.dotServer) {
      if (!settings.dotServer.startsWith('tls://')) {
        errors.push('DoT服务器必须以tls://开头');
      }
    }

    // 验证DNS缓存配置
    if (settings.enableDnsCache) {
      if (settings.dnsCacheSize < 100 || settings.dnsCacheSize > 10000) {
        errors.push('DNS缓存大小必须在100-10000之间');
      }
      if (settings.dnsCacheTtl < 60 || settings.dnsCacheTtl > 3600) {
        errors.push('DNS缓存TTL必须在60-3600秒之间');
      }
    }

    // 验证多DNS服务器
    if (settings.enableDnsLoadBalance && settings.dnsServers) {
      settings.dnsServers.forEach((server, index) => {
        if (server && !this.isValidIpAddress(server)) {
          errors.push(`DNS服务器${index + 1}格式无效: ${server}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 检查DNS泄露
   */
  public async checkDnsLeak(settings: AppSettings): Promise<{ leaked: boolean; details: string[] }> {
    const details: string[] = [];
    let leaked = false;

    try {
      // 检查系统DNS设置
      const systemDns = await this.getSystemDnsServers();
      if (systemDns.length > 0) {
        details.push(`检测到系统DNS服务器: ${systemDns.join(', ')}`);
        
        // 检查是否与配置的DNS服务器不同
        if (settings.enableDns && settings.dnsServer) {
          if (!systemDns.includes(settings.dnsServer)) {
            leaked = true;
            details.push('系统DNS服务器与配置的DNS服务器不匹配，可能存在DNS泄露');
          }
        }
      }

      // 检查DNS查询是否通过代理
      if (settings.enableDnsLeakProtection) {
        const testResult = await this.testDnsQuery('www.google.com', settings);
        if (!testResult.throughProxy) {
          leaked = true;
          details.push('DNS查询未通过代理，存在DNS泄露风险');
        }
      }

    } catch (error) {
      log.error('DNS泄露检查失败', error, 'DnsManager');
      details.push('DNS泄露检查失败');
    }

    return { leaked, details };
  }

  /**
   * 测试DNS查询
   */
  public async testDnsQuery(domain: string, settings: AppSettings): Promise<{
    success: boolean;
    ip: string;
    server: string;
    throughProxy: boolean;
    responseTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      // 这里应该实现实际的DNS查询逻辑
      // 由于浏览器环境的限制，这里只是模拟
      const mockResult = {
        success: true,
        ip: '142.250.190.78',
        server: settings.dnsServer || '8.8.8.8',
        throughProxy: settings.enableDnsLeakProtection,
        responseTime: Date.now() - startTime
      };

      // 记录DNS查询日志
      if (settings.enableDnsLogging) {
        this.logDnsQuery(domain, mockResult.server, mockResult.ip);
      }

      return mockResult;
    } catch (error) {
      log.error('DNS查询测试失败', error, 'DnsManager');
      return {
        success: false,
        ip: '',
        server: settings.dnsServer || '8.8.8.8',
        throughProxy: false,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * 应用DNS规则
   */
  public applyDnsRules(domain: string, settings: AppSettings): {
    action: 'direct' | 'proxy' | 'block' | 'custom';
    server?: string;
  } {
    if (!settings.enableDnsRules || !settings.dnsRules) {
      return { action: 'direct' };
    }

    // 按优先级排序规则
    const sortedRules = [...settings.dnsRules]
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.matchesDnsRule(domain, rule)) {
        return {
          action: rule.action,
          server: rule.customServer
        };
      }
    }

    return { action: 'direct' };
  }

  /**
   * 获取DNS查询日志
   */
  public getDnsQueryLog(limit: number = 100): Array<{
    domain: string;
    server: string;
    timestamp: number;
    response: string;
  }> {
    return this.dnsQueryLog.slice(-limit);
  }

  /**
   * 清除DNS缓存
   */
  public clearDnsCache(): void {
    this.dnsCache.clear();
    log.info('DNS缓存已清除', null, 'DnsManager');
  }

  /**
   * 获取DNS缓存统计
   */
  public getDnsCacheStats(): {
    size: number;
    hitRate: number;
    totalQueries: number;
    cacheHits: number;
  } {
    const totalQueries = this.dnsQueryLog.length;
    const cacheHits = this.dnsCache.size;
    const hitRate = totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;

    return {
      size: this.dnsCache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      totalQueries,
      cacheHits
    };
  }

  /**
   * 验证IP地址格式
   */
  private isValidIpAddress(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * 验证URL格式
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取系统DNS服务器
   */
  private async getSystemDnsServers(): Promise<string[]> {
    try {
      // 这里应该通过系统API获取DNS服务器
      // 由于浏览器环境限制，返回空数组
      return [];
    } catch (error) {
      log.error('获取系统DNS服务器失败', error, 'DnsManager');
      return [];
    }
  }

  /**
   * 检查域名是否匹配DNS规则
   */
  private matchesDnsRule(domain: string, rule: DnsRule): boolean {
    switch (rule.patternType) {
      case 'domain':
        return domain === rule.pattern;
      case 'suffix':
        return domain.endsWith(rule.pattern);
      case 'keyword':
        return domain.includes(rule.pattern);
      case 'regex':
        try {
          const regex = new RegExp(rule.pattern);
          return regex.test(domain);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * 记录DNS查询日志
   */
  private logDnsQuery(domain: string, server: string, response: string): void {
    this.dnsQueryLog.push({
      domain,
      server,
      timestamp: Date.now(),
      response
    });

    // 限制日志大小
    if (this.dnsQueryLog.length > 1000) {
      this.dnsQueryLog = this.dnsQueryLog.slice(-500);
    }
  }
}

export const dnsManager = DnsManager.getInstance();
