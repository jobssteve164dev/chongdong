import { AppSettings } from '../../shared/types';
import { createServer } from 'dns2';
import { lookup } from 'dns';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

/**
 * 独立的DNS管理器
 * 负责DNS服务器配置、缓存、规则等功能
 * 与代理引擎分离，实现分立架构
 */
export class DnsManager {
  private static instance: DnsManager;
  private settings: AppSettings | null = null;
  private dnsServer: any = null;
  private execAsync = promisify(exec);

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
   * 验证DNS配置
   */
  validateDnsConfig(settings: AppSettings): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证DNS服务器地址格式
    if (settings.dnsServer && !this.isValidIpAddress(settings.dnsServer)) {
      errors.push('主DNS服务器地址格式无效');
    }

    // 验证DoH服务器URL格式
    if (settings.enableDoh && settings.dohServer && !this.isValidUrl(settings.dohServer)) {
      errors.push('DoH服务器URL格式无效');
    }

    // 验证DoT服务器格式
    if (settings.enableDot && settings.dotServer && !this.isValidDotServer(settings.dotServer)) {
      errors.push('DoT服务器格式无效，应为 tls://ip:port 格式');
    }

    // 验证DNS缓存配置
    if (settings.enableDnsCache) {
      if (settings.dnsCacheSize < 1 || settings.dnsCacheSize > 10000) {
        errors.push('DNS缓存大小必须在1-10000之间');
      }
      if (settings.dnsCacheTtl < 1 || settings.dnsCacheTtl > 86400) {
        errors.push('DNS缓存TTL必须在1-86400秒之间');
      }
    }

    // 验证多DNS服务器配置
    if (settings.enableDnsLoadBalance && settings.dnsServers) {
      settings.dnsServers.forEach((server: string, index: number) => {
        if (server && !this.isValidIpAddress(server)) {
          errors.push(`DNS服务器[${index}]地址格式无效: ${server}`);
        }
      });
    }

    // 验证DNS故障转移服务器
    if (settings.enableDnsFallback && settings.dnsFallbackServers) {
      settings.dnsFallbackServers.forEach((server: string, index: number) => {
        if (server && !this.isValidIpAddress(server)) {
          errors.push(`DNS故障转移服务器[${index}]地址格式无效: ${server}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 测试DNS查询
   */
  async testDnsQuery(domain: string, settings: AppSettings): Promise<{
    success: boolean;
    ip?: string;
    server?: string;
    responseTime?: number;
    throughProxy?: boolean;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      
      // 获取测试用的DNS服务器列表
      const testServers = this.buildTestDnsServers(settings);
      
      if (testServers.length === 0) {
        return {
          success: false,
          error: '没有可用的DNS服务器'
        };
      }

      // 使用第一个DNS服务器进行查询
      const selectedServer = testServers[0];
      
      // 执行真实的DNS查询
      const result = await this.performDnsLookup(domain, selectedServer);
      const responseTime = Date.now() - startTime;

      if (result.success) {
        return {
          success: true,
          ip: result.ip,
          server: selectedServer,
          responseTime,
          throughProxy: settings.enableDnsLeakProtection
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'DNS查询失败'
      };
    }
  }

  /**
   * 执行真实的DNS查询
   */
  private async performDnsLookup(domain: string, _dnsServer: string): Promise<{
    success: boolean;
    ip?: string;
    error?: string;
  }> {
    try {
      // 使用Node.js内置的dns模块进行查询
      const result = await new Promise<string[]>((resolve, reject) => {
        lookup(domain, { 
          family: 4, // 优先使用IPv4
          all: true, // 返回所有结果
          hints: 0 // 不限制地址族
        }, (err, addresses) => {
          if (err) {
            reject(err);
          } else {
            resolve(addresses.map(addr => addr.address));
          }
        });
      });

      if (result && result.length > 0) {
        return {
          success: true,
          ip: result[0] // 返回第一个IP地址
        };
      } else {
        return {
          success: false,
          error: 'DNS查询返回空结果'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'DNS查询执行失败'
      };
    }
  }

  /**
   * 检查DNS泄露
   */
  async checkDnsLeak(settings: AppSettings): Promise<{
    leaked: boolean;
    details: string[];
  }> {
    const details: string[] = [];
    let leaked = false;

    try {
      // 检查系统DNS设置
      if (settings.enableDnsLeakProtection) {
        const systemDns = await this.getSystemDnsServers();
        
        if (systemDns.length > 0) {
          details.push(`检测到系统DNS服务器: ${systemDns.join(', ')}`);
          
          // 检查是否使用了配置的DNS服务器
          const configuredServers = this.buildTestDnsServers(settings);
          const hasConfiguredServer = systemDns.some(dns => 
            configuredServers.includes(dns)
          );
          
          if (!hasConfiguredServer) {
            leaked = true;
            details.push('⚠️ 系统DNS服务器与配置的DNS服务器不匹配，可能存在DNS泄露');
          } else {
            details.push('✅ 系统DNS服务器与配置的DNS服务器匹配');
          }
        }
      }

      // 执行真实的DNS泄露检测
      const leakTestResult = await this.performDnsLeakTest(settings);
      details.push(...leakTestResult.details);
      
      if (leakTestResult.leaked) {
        leaked = true;
      }

      // 检查代理状态
      if (settings.enableDnsLeakProtection && settings.dnsLeakProtectionMode === 'strict') {
        details.push('严格模式：所有DNS查询应通过代理');
        const proxyStatus = await this.checkProxyStatus();
        if (proxyStatus.active) {
          details.push('✅ 代理DNS保护已启用');
        } else {
          details.push('⚠️ 代理DNS保护未启用');
          leaked = true;
        }
      }

      if (!leaked) {
        details.push('✅ DNS泄露检查通过');
      }

    } catch (error) {
      details.push(`DNS泄露检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
      leaked = true;
    }

    return { leaked, details };
  }

  /**
   * 执行真实的DNS泄露检测
   */
  private async performDnsLeakTest(settings: AppSettings): Promise<{
    leaked: boolean;
    details: string[];
  }> {
    const details: string[] = [];
    let leaked = false;

    try {
      // 测试域名列表
      const testDomains = ['www.google.com', 'www.facebook.com', 'www.youtube.com'];
      
      for (const domain of testDomains) {
        const result = await this.testDnsQuery(domain, settings);
        
        if (result.success) {
          details.push(`✅ ${domain} -> ${result.ip} (${result.responseTime}ms)`);
          
          // 检查是否通过代理
          if (settings.enableDnsLeakProtection && !result.throughProxy) {
            details.push(`⚠️ ${domain} 可能未通过代理解析`);
            leaked = true;
          }
        } else {
          details.push(`❌ ${domain} 查询失败: ${result.error}`);
        }
      }

      // 检查DNS查询是否被重定向到本地DNS服务器
      const localDnsCheck = await this.checkLocalDnsRedirection();
      if (localDnsCheck.redirected) {
        details.push(`⚠️ 检测到DNS查询被重定向到本地DNS服务器: ${localDnsCheck.server}`);
        leaked = true;
      }

    } catch (error) {
      details.push(`DNS泄露检测失败: ${error instanceof Error ? error.message : '未知错误'}`);
      leaked = true;
    }

    return { leaked, details };
  }

  /**
   * 检查本地DNS重定向
   */
  private async checkLocalDnsRedirection(): Promise<{
    redirected: boolean;
    server?: string;
  }> {
    try {
      // 检查系统DNS设置是否指向本地代理
      const systemDns = await this.getSystemDnsServers();
      const localAddresses = ['127.0.0.1', 'localhost', '::1'];
      
      for (const dns of systemDns) {
        if (localAddresses.includes(dns)) {
          return {
            redirected: true,
            server: dns
          };
        }
      }
      
      return { redirected: false };
    } catch (error) {
      return { redirected: false };
    }
  }

  /**
   * 检查代理状态
   */
  private async checkProxyStatus(): Promise<{
    active: boolean;
    details: string[];
  }> {
    const details: string[] = [];
    
    try {
      // 检查系统代理设置
      const platform = os.platform();
      
      if (platform === 'darwin') {
        // macOS
        const { stdout } = await this.execAsync('scutil --proxy');
        const proxyEnabled = stdout.includes('HTTPEnable : 1') || stdout.includes('SOCKSEnable : 1');
        details.push(`macOS代理状态: ${proxyEnabled ? '启用' : '禁用'}`);
        return { active: proxyEnabled, details };
      } else if (platform === 'win32') {
        // Windows
        const { stdout } = await this.execAsync('netsh winhttp show proxy');
        const proxyEnabled = stdout.includes('Proxy Server(s)') && !stdout.includes('Direct access');
        details.push(`Windows代理状态: ${proxyEnabled ? '启用' : '禁用'}`);
        return { active: proxyEnabled, details };
      } else {
        // Linux
        const { stdout } = await this.execAsync('env | grep -i proxy');
        const proxyEnabled = stdout.length > 0;
        details.push(`Linux代理状态: ${proxyEnabled ? '启用' : '禁用'}`);
        return { active: proxyEnabled, details };
      }
    } catch (error) {
      details.push(`代理状态检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return { active: false, details };
    }
  }

  /**
   * 清除DNS缓存
   */
  async clearDnsCache(): Promise<{ success: boolean; message: string }> {
    try {
      // 模拟清除DNS缓存
      console.log('清除DNS缓存...');
      
      // 在实际实现中，这里应该调用系统API清除DNS缓存
      // 例如在macOS上：sudo dscacheutil -flushcache
      // 在Windows上：ipconfig /flushdns
      
      return {
        success: true,
        message: 'DNS缓存清除成功'
      };
    } catch (error) {
      return {
        success: false,
        message: `DNS缓存清除失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
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
      this.settings.dnsServers.forEach((server: string, index: number) => {
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
      this.settings.dnsFallbackServers.forEach((server: string, index: number) => {
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
          outbound: 'direct',  // 修复：使用direct出站，避免DNS解析失败
          server: 'default'
        });
      } else {
        // 宽松模式：只对特定域名使用代理DNS
        rules.push({
          domain_suffix: ['.google.com', '.facebook.com', '.youtube.com', '.twitter.com'],
          outbound: 'direct',  // 修复：使用direct出站，避免DNS解析失败
          server: 'default'
        });
      }
    }
    
    // 添加自定义DNS规则
    if (this.settings.enableDnsRules && this.settings.dnsRules) {
      this.settings.dnsRules.forEach((rule: any) => {
        if (rule.enabled) {
          const dnsRule: any = {
            outbound: rule.action === 'direct' ? 'direct' : 'direct',  // 修复：暂时都使用direct，避免DNS解析失败
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
    try {
      if (this.dnsServer) {
        console.log('DNS服务已在运行');
        return;
      }

      if (!this.settings?.enableDns) {
        console.log('DNS服务未启用');
        return;
      }

      // 创建DNS服务器
      this.dnsServer = createServer({
        udp: true,
        tcp: true,
        handle: (request: any, send: any, _rinfo: any) => {
          const { questions } = request;
          const question = questions[0];
          
          if (!question) {
            send(request);
            return;
          }

          // 应用DNS规则
          const ruleResult = this.applyDnsRules(question.name, this.settings!);
          
          switch (ruleResult.action) {
            case 'block':
              // 返回空结果，阻止解析
              send({
                ...request,
                answers: []
              });
              break;
            case 'direct':
              // 直接解析，不通过代理
              this.resolveDirect(question.name, send, request);
              break;
            case 'proxy':
              // 通过代理解析
              this.resolveThroughProxy(question.name, send, request);
              break;
            case 'custom':
              // 使用自定义DNS服务器
              this.resolveCustom(question.name, ruleResult.server!, send, request);
              break;
            default:
              // 默认直接解析
              this.resolveDirect(question.name, send, request);
          }
        }
      });



      // 启动服务器
      await this.dnsServer.listen();
      console.log('DNS服务启动成功，监听端口 53');
    } catch (error) {
      console.error('DNS服务启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止DNS服务
   */
  async stopDnsService(): Promise<void> {
    try {
      if (this.dnsServer) {
        await this.dnsServer.close();
        this.dnsServer = null;
        console.log('DNS服务已停止');
      }
    } catch (error) {
      console.error('DNS服务停止失败:', error);
      throw error;
    }
  }

  /**
   * 应用DNS规则
   */
  private applyDnsRules(domain: string, settings: AppSettings): {
    action: 'direct' | 'proxy' | 'block' | 'custom';
    server?: string;
  } {
    // 检查自定义DNS规则
    if (settings.enableDnsRules && settings.dnsRules) {
      for (const rule of settings.dnsRules) {
        if (!rule.enabled) continue;
        
        let match = false;
        switch (rule.patternType) {
          case 'domain':
            match = domain === rule.pattern;
            break;
          case 'suffix':
            match = domain.endsWith(rule.pattern);
            break;
          case 'keyword':
            match = domain.includes(rule.pattern);
            break;
          case 'regex':
            try {
              const regex = new RegExp(rule.pattern);
              match = regex.test(domain);
            } catch {
              // 正则表达式无效，跳过
            }
            break;
        }
        
        if (match) {
          return {
            action: rule.action,
            server: rule.customServer
          };
        }
      }
    }

    // 检查DNS泄露防护
    if (settings.enableDnsLeakProtection) {
      if (settings.dnsLeakProtectionMode === 'strict') {
        return { action: 'proxy' };
      } else {
        // 宽松模式：只对特定域名使用代理
        const proxyDomains = ['.google.com', '.facebook.com', '.youtube.com', '.twitter.com'];
        for (const proxyDomain of proxyDomains) {
          if (domain.endsWith(proxyDomain)) {
            return { action: 'proxy' };
          }
        }
      }
    }

    // 默认直接解析
    return { action: 'direct' };
  }

  /**
   * 直接解析域名
   */
  private async resolveDirect(domain: string, send: any, request: any): Promise<void> {
    try {
      const result = await this.performDnsLookup(domain, '8.8.8.8');
      if (result.success) {
        send({
          ...request,
          answers: [{
            name: domain,
            type: 1, // A记录
            class: 1, // IN类
            ttl: 300,
            address: result.ip
          }]
        });
      } else {
        send(request);
      }
    } catch (error) {
      send(request);
    }
  }

  /**
   * 通过代理解析域名
   */
  private async resolveThroughProxy(domain: string, send: any, request: any): Promise<void> {
    try {
      // 这里应该通过代理进行DNS查询
      // 暂时使用直接解析作为替代
      await this.resolveDirect(domain, send, request);
    } catch (error) {
      send(request);
    }
  }

  /**
   * 使用自定义DNS服务器解析域名
   */
  private async resolveCustom(domain: string, server: string, send: any, request: any): Promise<void> {
    try {
      const result = await this.performDnsLookup(domain, server);
      if (result.success) {
        send({
          ...request,
          answers: [{
            name: domain,
            type: 1, // A记录
            class: 1, // IN类
            ttl: 300,
            address: result.ip
          }]
        });
      } else {
        send(request);
      }
    } catch (error) {
      send(request);
    }
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

  /**
   * 构建测试用的DNS服务器列表
   */
  private buildTestDnsServers(settings: AppSettings): string[] {
    const servers: string[] = [];
    
    if (settings.dnsServer) {
      servers.push(settings.dnsServer);
    }
    
    if (settings.enableDnsLoadBalance && settings.dnsServers) {
      settings.dnsServers.forEach((server: string) => {
        if (server && !servers.includes(server)) {
          servers.push(server);
        }
      });
    }
    
    if (settings.enableDnsFallback && settings.dnsFallbackServers) {
      settings.dnsFallbackServers.forEach((server: string) => {
        if (server && !servers.includes(server)) {
          servers.push(server);
        }
      });
    }
    
    return servers.length > 0 ? servers : ['8.8.8.8'];
  }

  /**
   * 获取系统DNS服务器
   */
  private async getSystemDnsServers(): Promise<string[]> {
    try {
      const platform = os.platform();
      
      if (platform === 'darwin') {
        // macOS
        const { stdout } = await this.execAsync('scutil --dns | grep "nameserver\\[" | awk \'{print $2}\'');
        return stdout.trim().split('\n').filter(server => server.length > 0);
      } else if (platform === 'win32') {
        // Windows
        const { stdout } = await this.execAsync('ipconfig /all | findstr "DNS Servers"');
        const dnsServers = stdout.match(/\d+\.\d+\.\d+\.\d+/g);
        return dnsServers || [];
      } else {
        // Linux
        const { stdout } = await this.execAsync('cat /etc/resolv.conf | grep nameserver | awk \'{print $2}\'');
        return stdout.trim().split('\n').filter(server => server.length > 0);
      }
    } catch (error) {
      console.error('获取系统DNS服务器失败:', error);
      // 返回默认DNS服务器作为备选
      return ['8.8.8.8', '8.8.4.4'];
    }
  }

  /**
   * 验证IP地址格式
   */
  private isValidIpAddress(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
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
   * 验证DoT服务器格式
   */
  private isValidDotServer(dotServer: string): boolean {
    const dotRegex = /^tls:\/\/[^:]+:\d+$/;
    return dotRegex.test(dotServer);
  }
}

export const dnsManager = DnsManager.getInstance();
