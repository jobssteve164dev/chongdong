import Dns from 'dns2';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AppSettings, DnsRule } from '../../shared/types';

// 定义DNS规则匹配结果的类型
interface DnsRuleResult {
  action: 'block' | 'direct' | 'proxy' | 'custom' | 'none';
  server?: string;
}

class DnsService {
  private dnsServer: any = null;
  private settings: AppSettings | null = null;
  private execAsync = promisify(exec);
  private dnsCache: Map<string, { ip: string; ttl: number }> = new Map();

  constructor() {
    console.log('DnsService initialized');
  }

  public init(settings: AppSettings): void {
    this.settings = settings;
    console.log('DnsService settings updated.');
    // 如果开启了DNS服务，则根据新设置重启
    if (this.settings?.enableDns && this.dnsServer) {
      this.stopDnsService().then(() => this.startDnsService());
    }
  }

  public async startDnsService(): Promise<void> {
    if (this.dnsServer) {
      console.log('DNS服务已在运行');
      return;
    }

    if (!this.settings?.enableDns) {
      console.log('DNS服务未启用，无法启动。');
      return;
    }

    try {
      this.dnsServer = Dns.createServer({
        udp: true,
        tcp: true,
        handle: (request, send, _rinfo) => this.handleDnsRequest(request, send),
      });

      const port = this.settings?.dnsListenPort || 53;
      await this.dnsServer.listen(port);
      console.log(`DNS服务启动成功，监听端口 ${port}`);
    } catch (error) {
      console.error('DNS服务启动失败:', error);
      this.dnsServer = null;
      throw error;
    }
  }

  public async stopDnsService(): Promise<void> {
    if (this.dnsServer) {
      try {
        await this.dnsServer.close();
        console.log('DNS服务已成功停止');
      } catch (error) {
        console.error('停止DNS服务时出错:', error);
      } finally {
        this.dnsServer = null;
      }
    } else {
      console.log('DNS服务未运行');
    }
  }
  
  private async handleDnsRequest(request: any, send: (response: any) => void): Promise<void> {
    console.log('Received DNS Request:', JSON.stringify(request, null, 2)); // 观测点
    const question = request.questions[0];
    if (!question || !this.settings) {
      return send(request);
    }
    const domain = question.name;

    if (this.settings.enableDnsCache) {
      const cached = this.dnsCache.get(domain);
      if (cached && cached.ttl > Date.now()) {
        const cachedResponse = Dns.Packet.createResponseFromRequest(request) as any;
        cachedResponse.answers.push({ name: domain, type: Dns.Packet.TYPE.A, class: Dns.Packet.CLASS.IN, ttl: Math.round((cached.ttl - Date.now()) / 1000), address: cached.ip });
        return send(cachedResponse);
      }
    }

    const ruleResult = this.applyDnsRules(domain, this.settings);

    switch (ruleResult.action) {
      case 'block':
        const blockResponse = Dns.Packet.createResponseFromRequest(request) as any;
        blockResponse.header.rcode = 3; // NXDOMAIN
        return send(blockResponse);
      case 'custom':
        return this.resolveWithUpstream(domain, [ruleResult.server!], request, send);
      case 'proxy':
      case 'direct':
      default:
        const upstreamServers = this.settings.dnsServers?.length ? this.settings.dnsServers : ['8.8.8.8'];
        return this.resolveWithUpstream(domain, upstreamServers, request, send);
    }
  }

  private async resolveWithUpstream(domain: string, servers: string[], request: any, send: (response: any) => void): Promise<void> {
    const response = Dns.Packet.createResponseFromRequest(request) as any;
    try {
      const resolver = new (await import('dns')).promises.Resolver();
      resolver.setServers(servers);
      const addresses = await resolver.resolve4(domain);
      
      const ip = addresses[0];
      if (ip) {
        if (this.settings?.enableDnsCache) {
            this.dnsCache.set(domain, { ip, ttl: Date.now() + (this.settings.dnsCacheTtl || 300) * 1000 });
        }
        response.answers.push({ name: domain, type: Dns.Packet.TYPE.A, class: Dns.Packet.CLASS.IN, ttl: this.settings?.dnsCacheTtl || 300, address: ip });
      }
    } catch (error) {
      console.error(`DNS resolution failed for ${domain} with servers ${servers.join(', ')}:`, error);
      response.header.rcode = 2; // SERVFAIL
    }
    send(response);
  }

  private applyDnsRules(domain: string, settings: AppSettings): DnsRuleResult {
    if (!settings.enableDnsRules || !settings.dnsRules) {
      return { action: 'none' };
    }

    for (const rule of settings.dnsRules) {
      if (!rule.enabled) continue;

      const match = this.isMatch(domain, rule.patternType, rule.pattern);
      if (match) {
        const result: DnsRuleResult = { action: rule.action };
        if (rule.customServer) {
          result.server = rule.customServer;
        }
        return result;
      }
    }

    return { action: 'none' };
  }

  private isMatch(domain: string, type: DnsRule['patternType'], value: string): boolean {
    try {
        switch (type) {
            case 'domain':
                return domain === value;
            case 'suffix':
                return domain.endsWith(`.${value}`);
            case 'keyword':
                return domain.includes(value);
            case 'regex':
                return new RegExp(value).test(domain);
            default:
                return false;
        }
    } catch (e) {
        console.error(`Invalid regex in DNS rule: ${value}`, e);
        return false;
    }
  }

  public async getSystemDnsServers(): Promise<string[]> {
    try {
      const platform = os.platform();
      if (platform === 'darwin') {
        const { stdout } = await this.execAsync('scutil --dns | grep "nameserver\\[" | awk \'{print $2}\'');
        return stdout.trim().split('\n').filter(server => server.length > 0 && !server.includes(':')); // 过滤IPv6
      } else if (platform === 'win32') {
        const { stdout } = await this.execAsync('ipconfig /all | findstr "DNS Servers"');
        const dnsServers = stdout.match(/\d+\.\d+\.\d+\.\d+/g);
        return dnsServers || [];
      } else {
        const { stdout } = await this.execAsync('grep "nameserver" /etc/resolv.conf | awk \'{print $2}\'');
        return stdout.trim().split('\n').filter(server => server.length > 0 && !server.includes(':')); // 过滤IPv6
      }
    } catch (error) {
      console.error('获取系统DNS服务器失败:', error);
      return ['8.8.8.8', '1.1.1.1'];
    }
  }

  public async testDnsQuery(domain: string, dnsServer: string): Promise<{ success: boolean; ip?: string; error?: string; responseTime?: number }> {
    const startTime = Date.now();
    try {
      const resolver = new (await import('dns')).promises.Resolver();
      resolver.setServers([dnsServer]);
      const addresses = await resolver.resolve4(domain);
      const responseTime = Date.now() - startTime;
      const ip = addresses[0];

      if (ip) {
        return { success: true, ip, responseTime };
      } else {
        return { success: false, error: 'DNS查询返回空结果', responseTime };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'DNS查询执行失败', responseTime: Date.now() - startTime };
    }
  }

  public async checkDnsLeak(): Promise<{ leaked: boolean; details: string[] }> {
    const details: string[] = [];
    let leaked = false;
    if (!this.settings) return { leaked: true, details: ['Settings not initialized'] };

    try {
      const testDomains = ['google.com', 'facebook.com', 'youtube.com'];
      const systemDns = await this.getSystemDnsServers();
      details.push(`系统DNS服务器: ${systemDns.join(', ')}`);

      for (const domain of testDomains) {
        const result = await this.testDnsQuery(domain, this.settings.dnsServer || '8.8.8.8');
        if (result.success && result.ip) {
          details.push(`✅ ${domain} -> ${result.ip} (${result.responseTime}ms)`);
        } else {
          details.push(`❌ ${domain} 查询失败: ${result.error}`);
        }
      }
      if(details.some(d => d.includes('查询失败'))) {
        leaked = true;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      details.push(`DNS泄露检测执行失败: ${errorMessage}`);
      leaked = true;
    }

    return { leaked, details };
  }

  public clearDnsCache(): void {
    this.dnsCache.clear();
    console.log('DNS cache cleared.');
  }
}

export const dnsService = new DnsService();
