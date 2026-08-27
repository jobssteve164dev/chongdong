import Dns from 'dns2';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AppSettings, DnsRule } from '../../shared/types';
import axios from 'axios';
import tls from 'tls';
import { LRUCache } from 'lru-cache';

// 定义DNS-over-HTTPS JSON响应的接口
interface DoHResponse {
  Status: number;
  Answer?: {
    name: string;
    type: number;
    TTL: number;
    data: string;
  }[];
}

// 定义DNS规则匹配结果的类型
interface DnsRuleResult {
  action: 'block' | 'direct' | 'proxy' | 'custom' | 'none';
  server?: string;
}

class DnsService {
  private dnsServer: any = null;
  private settings: AppSettings | null = null;
  private execAsync = promisify(exec);
  private dnsCache: LRUCache<string, string> = new LRUCache({ max: 100 });
  private dnsQueryInterceptor: ((domain: string, server: string) => Promise<boolean>) | null = null;
  private leakProtectionEnabled: boolean = false;
  private leakMonitoringTimer: NodeJS.Timeout | null = null;

  constructor() {
    console.log('DnsService initialized');
  }

  public init(settings: AppSettings): void {
    this.settings = settings;
    this.leakProtectionEnabled = settings.enableDnsLeakProtection || false;
    console.log('DnsService settings updated.');
    // 根据新设置初始化LRU缓存
    this.dnsCache = new LRUCache({ max: this.settings.dnsCacheSize || 100 });
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
    const startTime = Date.now();
    const question = request.questions[0];
    if (!question || !this.settings) {
      return send(request);
    }
    const domain = question.name;

    // DNS查询日志 - 请求开始
    if (this.settings.enableDnsLogging) {
      console.log(`[DNS Log] Query received for: ${domain}`);
    }

    if (this.settings.enableDnsCache) {
      const cachedIp = this.dnsCache.get(domain);
      if (cachedIp) {
        const cachedResponse = Dns.Packet.createResponseFromRequest(request) as any;
        // 注意：LRU缓存不存储TTL，因此我们使用一个默认的较短TTL
        cachedResponse.answers.push({ name: domain, type: Dns.Packet.TYPE.A, class: Dns.Packet.CLASS.IN, ttl: 60, address: cachedIp });
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
        return this.resolveWithUpstream(domain, [ruleResult.server!], request, send, startTime);
      case 'proxy':
      case 'direct':
      default:
        const upstreamServers = this.settings.dnsServers?.length
          ? this.settings.dnsServers
          : ['https://cloudflare-dns.com/dns-query'];
        return this.resolveWithUpstream(domain, upstreamServers, request, send, startTime);
    }
  }

  private async resolveWithUpstream(domain: string, servers: string[], request: any, send: (response: any) => void, startTime: number): Promise<void> {
    const response = Dns.Packet.createResponseFromRequest(request) as any;
    let isResolved = false;

    let serversToUse = [...servers];
    // 实现严格DNS泄露防护模式
    // 统一严格模式判断：以 dnsLeakProtectionMode === 'strict' 为准
    if (this.settings?.dnsLeakProtectionMode === 'strict') {
        serversToUse = serversToUse.filter(s => s.startsWith('https://') || s.startsWith('tls://'));
        if (serversToUse.length === 0) {
            console.error('[DNS Strict Mode] No secure (DoH/DoT) DNS servers configured. Blocking query.');
            response.header.rcode = 3; // NXDOMAIN to block
            return send(response);
        }
    }

    const serversToTry = this.settings?.enableDnsLoadBalance ? this.shuffleArray(serversToUse) : serversToUse;

    for (const server of serversToTry) {
      try {
        let resolver: (domain: string, server: string, request: any) => Promise<any>;
        if (server.startsWith('https://')) {
          resolver = this.resolveSingleDoH;
        } else if (server.startsWith('tls://')) {
          resolver = this.resolveSingleDoT;
        } else {
          resolver = this.resolveSingleStandard;
        }
        
        const resultIp = await resolver(domain, server, request);

        if (resultIp) {
          if (this.settings?.enableDnsCache) {
            // LRU缓存只存IP，不存TTL
            this.dnsCache.set(domain, resultIp);
          }
          response.answers.push({ name: domain, type: Dns.Packet.TYPE.A, class: Dns.Packet.CLASS.IN, ttl: this.settings?.dnsCacheTtl || 300, address: resultIp });
          isResolved = true;
          break; 
        }
      } catch (error) {
        console.warn(`DNS resolution failed for ${domain} with server ${server}:`, error);
        // 继续尝试下一个服务器
      }
    }

    // 实现故障转移
    if (!isResolved && this.settings?.enableDnsFallback && this.settings.dnsFallbackServers?.length) {
      console.log('主 DNS 解析失败，尝试备用服务器');
      // 递归调用，但只用fallback服务器且禁用下一次fallback
      const fallbackSettings = { ...this.settings, enableDnsFallback: false };
      const tempService = new DnsService();
      tempService.init(fallbackSettings);
      await tempService.resolveWithUpstream(domain, this.settings.dnsFallbackServers, request, (fallbackResponse) => {
        // 将fallback的答案复制到当前响应中
        if(fallbackResponse.answers.length > 0) {
            response.answers.push(...fallbackResponse.answers);
            isResolved = true;
            // DNS查询日志 - 故障转移成功
            if (this.settings?.enableDnsLogging) {
              const answer = fallbackResponse.answers[0];
              console.log(`[DNS Log] Fallback success for ${domain}: -> ${answer.address} in ${Date.now() - startTime}ms`);
            }
        }
      }, startTime); // 传递startTime
    }

    if (isResolved) {
        // DNS查询日志 - 主流程成功
        if (this.settings?.enableDnsLogging) {
            const answer = response.answers[0];
            console.log(`[DNS Log] Resolved ${domain} -> ${answer.address} in ${Date.now() - startTime}ms`);
        }
    } else {
      response.header.rcode = 2; // SERVFAIL
      // DNS查询日志 - 失败
      if (this.settings?.enableDnsLogging) {
        console.log(`[DNS Log] Failed to resolve ${domain} in ${Date.now() - startTime}ms`);
      }
    }
    
    send(response);
  }

  // 将解析器重构为返回Promise<string | null>的单一解析函数
  private async resolveSingleStandard(domain: string, server: string, _request: any): Promise<string | null> {
    try {
      const resolver = new (await import('dns')).promises.Resolver();
      resolver.setServers([server]);
      const addresses = await resolver.resolve4(domain);
      return addresses[0] || null;
    } catch (error) {
      console.error(`Standard DNS resolution failed for ${domain} with server ${server}:`, error);
      throw error;
    }
  }

  private async resolveSingleDoH(domain: string, server: string, _request: any): Promise<string | null> {
    try {
      // 严格模式或启用泄露防护时，优先通过本地代理(SOCKS)发起DoH请求，避免直连泄露
      if (this.leakProtectionEnabled || this.settings?.dnsLeakProtectionMode === 'strict') {
        const result = await this.resolveDoHOverSocks(domain, server);
        return result;
      }

      const dohResponse = await axios.get<DoHResponse>(server, {
        params: { name: domain, type: 'A' },
        headers: { 'accept': 'application/dns-json' },
        timeout: 3000
      });

      if (dohResponse.data.Status === 0 && dohResponse.data.Answer) {
        const answer = dohResponse.data.Answer.find(a => a.type === 1); // A record
        return answer?.data || null;
      }
      return null;
    } catch (error) {
      console.error(`DoH resolution failed for ${domain} with server ${server}:`, error);
      throw error;
    }
  }
  
  private async resolveSingleDoT(domain: string, server: string, _request: any): Promise<string | null> {
    // 严格模式或启用泄露防护时，通过本地代理(SOCKS)发起DoT，避免直连
    if (this.leakProtectionEnabled || this.settings?.dnsLeakProtectionMode === 'strict') {
      return await this.resolveDoTOverSocks(domain, server);
    }

    return new Promise((resolve, reject) => {
      const [host, portStr] = server.replace('tls://', '').split(':');
      const port = portStr ? parseInt(portStr, 10) : 853;

      const dnsQueryPacket = new Dns.Packet();
      (dnsQueryPacket as any).questions.push({ name: domain, type: Dns.Packet.TYPE.A, class: Dns.Packet.CLASS.IN });
      const queryBuffer = dnsQueryPacket.toBuffer();

      const lengthBuffer = Buffer.alloc(2);
      lengthBuffer.writeUInt16BE(queryBuffer.length, 0);
      const finalQuery = Buffer.concat([lengthBuffer, queryBuffer]);

      const socket = tls.connect({ host, port, servername: host }, () => {
        socket.write(finalQuery);
      });
      socket.setTimeout(3000);

      socket.on('data', (data) => {
        try {
          const answerPacket = (Dns.Packet as any).parse(data.slice(2));
          if (answerPacket.answers.length > 0 && answerPacket.answers[0].address) {
            resolve(answerPacket.answers[0].address);
          } else {
            resolve(null);
          }
        } catch(e) {
          reject(e);
        } finally {
          socket.end();
        }
      });

      socket.on('error', (err) => {
        reject(err);
        socket.end();
      });

      socket.on('timeout', () => {
        reject(new Error('DoT resolution timed out'));
        socket.end();
      });
    });
  }

  // 通过本地 SOCKS 代理发起 DoH 请求，避免直连
  private async resolveDoHOverSocks(domain: string, dohUrl: string): Promise<string | null> {
    try {
      const { URL } = require('url');
      const url = new URL(dohUrl);
      const host = url.hostname;
      const port = Number(url.port) || 443;
      const path = `${url.pathname}?name=${encodeURIComponent(domain)}&type=A`;

      const proxy = this.getSocksProxyEndpoint();
      if (!proxy) throw new Error('No local proxy endpoint configured');

      const { SocksClient } = require('socks');
      const { socket } = await SocksClient.createConnection({
        proxy: { host: proxy.host, port: proxy.port, type: 5 },
        command: 'connect',
        destination: { host, port },
        timeout: 5000
      });

      return await new Promise<string | null>((resolve, reject) => {
        const tlsSocket = tls.connect({ socket, servername: host, rejectUnauthorized: true });
        tlsSocket.setTimeout(5000, () => tlsSocket.destroy(new Error('TLS request timeout')));
        const requestLines = [
          `GET ${path} HTTP/1.1`,
          `Host: ${host}`,
          'Accept: application/dns-json',
          'User-Agent: Chongdong-DNS/1.0',
          'Connection: close',
          '',
          ''
        ].join('\r\n');

        let data = '';
        tlsSocket
          .once('secureConnect', () => tlsSocket.write(requestLines))
          .on('data', (chunk: any) => (data += chunk.toString()))
          .on('error', (err: any) => reject(err))
          .on('end', () => {
            try {
              const body = data.split('\r\n\r\n')[1] || '';
              const json = JSON.parse(body) as DoHResponse;
              const answer = (json.Answer || []).find(a => a.type === 1);
              resolve(answer?.data || null);
            } catch (e) {
              reject(e);
            }
          });
      });
    } catch (e) {
      console.error('resolveDoHOverSocks failed:', e);
      throw e;
    }
  }

  // 通过本地 SOCKS 代理发起 DoT 查询，避免直连
  private async resolveDoTOverSocks(domain: string, dotUrl: string): Promise<string | null> {
    const [host, portStr] = dotUrl.replace('tls://', '').split(':');
    const port = portStr ? parseInt(portStr, 10) : 853;

    const proxy = this.getSocksProxyEndpoint();
    if (!proxy) throw new Error('No local proxy endpoint configured');

    const { SocksClient } = require('socks');
    const { socket } = await SocksClient.createConnection({
      proxy: { host: proxy.host, port: proxy.port, type: 5 },
      command: 'connect',
      destination: { host, port },
      timeout: 5000
    });

    const dnsQueryPacket = new Dns.Packet();
    (dnsQueryPacket as any).questions.push({ name: domain, type: Dns.Packet.TYPE.A, class: Dns.Packet.CLASS.IN });
    const queryBuffer = dnsQueryPacket.toBuffer();

    const lengthBuffer = Buffer.alloc(2);
    lengthBuffer.writeUInt16BE(queryBuffer.length, 0);
    const finalQuery = Buffer.concat([lengthBuffer, queryBuffer]);

    return await new Promise<string | null>((resolve, reject) => {
      const tlsSocket = tls.connect({ socket, servername: host, rejectUnauthorized: true }, () => {
        tlsSocket.write(finalQuery);
      });
      tlsSocket.setTimeout(5000, () => tlsSocket.destroy(new Error('DoT over SOCKS timeout')));
      tlsSocket.on('data', (data) => {
        try {
          const answerPacket = (Dns.Packet as any).parse(data.slice(2));
          if (answerPacket.answers.length > 0 && answerPacket.answers[0].address) {
            resolve(answerPacket.answers[0].address);
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(e);
        } finally {
          tlsSocket.end();
        }
      });
      tlsSocket.on('error', (err) => { reject(err); tlsSocket.end(); });
    });
  }

  private getSocksProxyEndpoint(): { host: string; port: number } | null {
    try {
      const s = this.settings;
      if (!s) return null;
      const port = Number(s.socksPort || s.mixedPort || s.proxyPort);
      if (!port || !Number.isFinite(port)) return null;
      return { host: '127.0.0.1', port };
    } catch {
      return null;
    }
  }

  // 洗牌算法，用于负载均衡
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      const jValue = array[j];
      if (temp !== undefined && jValue !== undefined) {
        array[i] = jValue;
        array[j] = temp;
      }
    }
    return array;
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
      return [];
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

  public async checkDnsLeak(): Promise<{ leaked: boolean; verified: boolean; details: string[]; leakSources: string[] }> {
    const details: string[] = [];
    const leakSources: string[] = [];
    let leaked = false;
    
    if (!this.settings) {
      return { leaked: true, verified: false, details: ['DNS 配置未初始化'], leakSources: ['配置未初始化'] };
    }

    if (!this.settings.enableDnsLeakProtection) {
      leaked = true;
      leakSources.push('DNS 泄露防护未启用');
    }

    const configuredServers = [
      ...(this.settings.dnsServers || []),
      ...(this.settings.enableDnsFallback ? this.settings.dnsFallbackServers || [] : [])
    ];
    const insecureServers = configuredServers.filter(server =>
      !server.startsWith('https://') && !server.startsWith('tls://')
    );
    if (this.settings.dnsLeakProtectionMode === 'strict' && insecureServers.length > 0) {
      leaked = true;
      leakSources.push('严格模式包含明文 DNS 服务器');
    }

    details.push(leaked ? 'DNS 配置存在明确风险' : 'DNS 配置检查未发现明文解析路径');
    details.push('尚未通过受控权威域名观测实际解析出口，因此不能判定“无泄露”');
    return { leaked, verified: false, details, leakSources };
  }

  public clearDnsCache(): void {
    this.dnsCache.clear();
    console.log('DNS cache cleared.');
  }

  /**
   * 设置DNS查询拦截器
   */
  public setDnsQueryInterceptor(interceptor: (domain: string, server: string) => Promise<boolean>): void {
    this.dnsQueryInterceptor = interceptor;
    console.log('DNS查询拦截器已设置');
  }

  /**
   * 启用/禁用DNS泄露防护
   */
  public setLeakProtectionEnabled(enabled: boolean): void {
    this.leakProtectionEnabled = enabled;
    console.log(`DNS泄露防护已${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 检查DNS查询是否被允许
   */
  private async isDnsQueryAllowed(domain: string, server: string): Promise<boolean> {
    // 如果DNS泄露防护未启用，允许所有查询
    if (!this.leakProtectionEnabled) {
      return true;
    }

    // 如果有自定义拦截器，使用拦截器检查
    if (this.dnsQueryInterceptor) {
      try {
        return await this.dnsQueryInterceptor(domain, server);
      } catch (error) {
        console.error('DNS查询拦截器执行失败:', error);
        return false;
      }
    }

    // 默认的泄露防护逻辑
    if (this.settings?.dnsLeakProtectionMode === 'strict') {
      // 严格模式：只允许通过DoH/DoT服务器查询
      return server.startsWith('https://') || server.startsWith('tls://');
    } else {
      // 宽松模式：允许通过配置的DNS服务器查询
      const allowedServers = this.settings?.dnsServers || [this.settings?.dnsServer || 'https://cloudflare-dns.com/dns-query'];
      return allowedServers.includes(server);
    }
  }

  /**
   * 增强的DNS查询方法，包含泄露防护检查
   */
  public async secureDnsQuery(domain: string, server: string): Promise<{ success: boolean; ip?: string; error?: string; responseTime?: number; blocked?: boolean }> {
    const startTime = Date.now();
    
    // 检查查询是否被允许
    const isAllowed = await this.isDnsQueryAllowed(domain, server);
    if (!isAllowed) {
      console.warn(`DNS查询被阻止: ${domain} via ${server} (泄露防护)`);
      return { 
        success: false, 
        error: 'DNS查询被泄露防护阻止', 
        responseTime: Date.now() - startTime,
        blocked: true 
      };
    }

    // 执行正常的DNS查询
    try {
      const result = await this.testDnsQuery(domain, server);
      return { ...result, blocked: false };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'DNS查询执行失败', 
        responseTime: Date.now() - startTime,
        blocked: false 
      };
    }
  }

  /**
   * 获取DNS泄露防护状态
   */
  public getLeakProtectionStatus(): { enabled: boolean; mode: string; strictMode: boolean } {
    return {
      enabled: this.leakProtectionEnabled,
      mode: this.settings?.dnsLeakProtectionMode || 'relaxed',
      strictMode: this.settings?.dnsLeakProtectionMode === 'strict'
    };
  }

  /**
   * 实时DNS泄露监控
   */
  public async startLeakMonitoring(intervalMs: number = 30000): Promise<void> {
    if (!this.leakProtectionEnabled) {
      console.log('DNS泄露防护未启用，跳过监控');
      return;
    }

    console.log(`开始DNS泄露监控，间隔: ${intervalMs}ms`);
    
    const monitor = async () => {
      try {
        const leakResult = await this.checkDnsLeak();
        if (leakResult.leaked) {
          console.warn('🚨 DNS泄露检测到:', leakResult.leakSources);
          // 这里可以添加通知逻辑
        } else {
          console.log('✅ DNS泄露检查通过');
        }
      } catch (error) {
        console.error('DNS泄露监控执行失败:', error);
      }
    };

    // 立即执行一次
    await monitor();
    
    this.stopLeakMonitoring();
    this.leakMonitoringTimer = setInterval(monitor, intervalMs);
  }

  public stopLeakMonitoring(): void {
    if (this.leakMonitoringTimer) {
      clearInterval(this.leakMonitoringTimer);
      this.leakMonitoringTimer = null;
    }
  }

  /**
   * 单次域名解析（支持 standard/DoH/DoT，返回首个A记录）
   */
  public async resolveDomainOnce(domain: string, server: string): Promise<string | null> {
    try {
      let resolver: (domain: string, server: string, request: any) => Promise<string | null>;
      if (server.startsWith('https://')) {
        resolver = this.resolveSingleDoH.bind(this) as any;
      } else if (server.startsWith('tls://')) {
        resolver = this.resolveSingleDoT.bind(this) as any;
      } else {
        resolver = this.resolveSingleStandard.bind(this) as any;
      }
      return await resolver(domain, server, null);
    } catch (e) {
      return null;
    }
  }
}

export const dnsService = new DnsService();
