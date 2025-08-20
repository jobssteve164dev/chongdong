import { AppSettings } from '../shared/types';

/**
 * 独立的DNS管理器
 * 负责DNS服务器配置、缓存、规则等功能
 * 与代理引擎分离，实现分立架构
 */
export class DnsManager {
  private static instance: DnsManager;
  private settings: AppSettings | null = null;

  private constructor() {}

  static getInstance(): DnsManager {
    if (!DnsManager.instance) {
      DnsManager.instance = new DnsManager();
    }
    return DnsManager.instance;
  }

  /**
   * 初始化DNS管理器
   */
  init(settings: AppSettings): void {
    this.settings = settings;
  }

  /**
   * 获取DNS配置（独立于代理引擎）
   */
  getDnsConfig(): any {
    if (!this.settings?.enableDns) {
      return null;
    }

    return {
      servers: this.buildDnsServers(),
      rules: this.buildDnsRules(),
      final: 'default',
      strategy: this.settings?.enableDnsLoadBalance ? 'prefer_ipv4' : 'ipv4_only'
    };
  }

  /**
   * 构建DNS服务器配置
   */
  private buildDnsServers(): any[] {
    if (!this.settings) return [];

    const servers: any[] = [];
    
    // 添加主DNS服务器
    if (this.settings.dnsServer) {
      servers.push({
        tag: 'default',
        address: this.settings.dnsServer,
        detour: 'direct'
      });
    }
    
    // 添加DoH服务器
    if (this.settings.enableDoh && this.settings.dohServer) {
      servers.push({
        tag: 'doh',
        address: this.settings.dohServer,
        detour: 'direct'
      });
    }
    
    // 添加DoT服务器
    if (this.settings.enableDot && this.settings.dotServer) {
      servers.push({
        tag: 'dot',
        address: this.settings.dotServer,
        detour: 'direct'
      });
    }
    
    // 添加多DNS服务器负载均衡
    if (this.settings.enableDnsLoadBalance && this.settings.dnsServers) {
      this.settings.dnsServers.forEach((server, index) => {
        if (server && server !== this.settings?.dnsServer) {
          servers.push({
            tag: `dns-${index}`,
            address: server,
            detour: 'direct'
          });
        }
      });
    }
    
    // 添加DNS故障转移服务器
    if (this.settings.enableDnsFallback && this.settings.dnsFallbackServers) {
      this.settings.dnsFallbackServers.forEach((server, index) => {
        servers.push({
          tag: `fallback-${index}`,
          address: server,
          detour: 'direct'
        });
      });
    }
    
    return servers.length > 0 ? servers : [{
      tag: 'default',
      address: '8.8.8.8',
      detour: 'direct'
    }];
  }

  /**
   * 构建DNS规则配置
   */
  private buildDnsRules(): any[] {
    if (!this.settings) return [];

    const rules: any[] = [];
    
    // 添加DNS泄露防护规则
    if (this.settings.enableDnsLeakProtection) {
      if (this.settings.dnsLeakProtectionMode === 'strict') {
        // 严格模式：所有DNS查询都通过代理
        rules.push({
          outbound: 'proxy',
          server: 'default'
        });
      } else {
        // 宽松模式：只对特定域名使用代理DNS
        rules.push({
          domain_suffix: ['.google.com', '.facebook.com', '.youtube.com', '.twitter.com'],
          outbound: 'proxy',
          server: 'default'
        });
      }
    }
    
    // 添加自定义DNS规则
    if (this.settings.enableDnsRules && this.settings.dnsRules) {
      this.settings.dnsRules.forEach(rule => {
        if (rule.enabled) {
          const dnsRule: any = {
            outbound: rule.action === 'direct' ? 'direct' : 'proxy',
            server: rule.action === 'custom' ? rule.customServer : 'default'
          };
          
          switch (rule.patternType) {
            case 'domain':
              dnsRule.domain = [rule.pattern];
              break;
            case 'suffix':
              dnsRule.domain_suffix = [rule.pattern];
              break;
            case 'keyword':
              dnsRule.domain_keyword = [rule.pattern];
              break;
            case 'regex':
              dnsRule.domain_regex = [rule.pattern];
              break;
          }
          
          rules.push(dnsRule);
        }
      });
    }
    
    // 添加本地域名直连规则
    rules.push({
      domain_suffix: ['.local', '.localhost'],
      outbound: 'direct',
      server: 'default'
    });
    
    return rules;
  }

  /**
   * 获取DNS缓存配置（独立实现）
   */
  getDnsCacheConfig(): any {
    if (!this.settings?.enableDnsCache) {
      return null;
    }

    // DNS缓存配置独立于代理引擎
    return {
      enabled: true,
      size: this.settings.dnsCacheSize || 1000,
      ttl: this.settings.dnsCacheTtl || 300
    };
  }

  /**
   * 启动DNS服务
   */
  async startDnsService(): Promise<void> {
    // 独立的DNS服务启动逻辑
    console.log('启动独立DNS服务...');
    // TODO: 实现独立的DNS服务
  }

  /**
   * 停止DNS服务
   */
  async stopDnsService(): Promise<void> {
    // 独立的DNS服务停止逻辑
    console.log('停止独立DNS服务...');
    // TODO: 实现独立的DNS服务停止
  }

  /**
   * 获取DNS状态
   */
  getDnsStatus(): any {
    return {
      enabled: this.settings?.enableDns || false,
      servers: this.buildDnsServers().length,
      rules: this.buildDnsRules().length,
      cache: this.getDnsCacheConfig()
    };
  }
}

export const dnsManager = DnsManager.getInstance();
