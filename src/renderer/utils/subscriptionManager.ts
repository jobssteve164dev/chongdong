import { Subscription, ProxyServer, ProxyGroup, ProxyProtocol } from '../../shared/types';
import { log } from './logger';
import { Base64 } from 'js-base64';

export interface SubscriptionParseResult {
  servers: ProxyServer[];
  groups: ProxyGroup[];
  error?: string;
}

export interface SubscriptionUpdateResult {
  success: boolean;
  servers?: ProxyServer[];
  groups?: ProxyGroup[];
  error?: string;
  timestamp: number;
  updatedSubscription?: Subscription;
}

export class SubscriptionManager {
  private static instance: SubscriptionManager;
  private subscriptions: Map<string, Subscription> = new Map();
  private updateTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  public static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }

  /**
   * 初始化订阅管理器，从存储加载数据
   */
  public initialize(subscriptions: Subscription[]): void {
    // 清除现有数据
    this.subscriptions.clear();
    
    // 加载订阅数据
    subscriptions.forEach(subscription => {
      this.subscriptions.set(subscription.id, subscription);
      
      // 如果订阅启用且设置了自动更新，调度更新
      if (subscription.enabled && subscription.autoUpdate) {
        this.scheduleUpdate(subscription);
      }
    });
    
    log.info('订阅管理器初始化完成', { count: subscriptions.length }, 'SubscriptionManager');
  }

  /**
   * 添加订阅
   */
  public addSubscription(subscription: Subscription): void {
    this.subscriptions.set(subscription.id, subscription);
    
    if (subscription.enabled && subscription.autoUpdate) {
      this.scheduleUpdate(subscription);
    }
    
    log.info('添加订阅', { id: subscription.id, name: subscription.name }, 'SubscriptionManager');
  }

  /**
   * 更新订阅配置
   */
  public updateSubscriptionConfig(id: string, updates: Partial<Subscription>): Subscription | null {
    const subscription = this.subscriptions.get(id);
    if (!subscription) {
      return null;
    }

    const updatedSubscription: Subscription = {
      ...subscription,
      ...updates,
      id, // 确保ID不被修改
    };

    this.subscriptions.set(id, updatedSubscription);

    // 如果启用了自动更新，重新调度更新
    if (updatedSubscription.enabled && updatedSubscription.autoUpdate) {
      this.scheduleUpdate(updatedSubscription);
    } else {
      this.cancelUpdate(id);
    }

    log.info('更新订阅配置', { id, name: updatedSubscription.name }, 'SubscriptionManager');
    return updatedSubscription;
  }

  /**
   * 删除订阅
   */
  public deleteSubscription(id: string): boolean {
    this.cancelUpdate(id);
    const deleted = this.subscriptions.delete(id);
    
    if (deleted) {
      log.info('删除订阅', { id }, 'SubscriptionManager');
    }
    
    return deleted;
  }

  /**
   * 获取订阅
   */
  public getSubscription(id: string): Subscription | null {
    return this.subscriptions.get(id) || null;
  }

  /**
   * 获取所有订阅
   */
  public getAllSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * 解析订阅链接
   */
  public async parseSubscription(url: string): Promise<SubscriptionParseResult> {
    try {
      log.info('开始解析订阅', { url }, 'SubscriptionManager');

      // 获取订阅内容
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // [核心修复] 使用ArrayBuffer和TextDecoder强制UTF-8解码，避免乱码
      const buffer = await response.arrayBuffer();
      const content = new TextDecoder('utf-8').decode(buffer);
      
      // 检测订阅格式并解析
      const format = this.detectFormat(content);
      const result = await this.parseByFormat(content, format);

      log.info('订阅解析完成', { 
        url, 
        format, 
        serverCount: result.servers.length,
        groupCount: result.groups.length 
      }, 'SubscriptionManager');

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      log.error('订阅解析失败', { url, error: errorMessage }, 'SubscriptionManager');
      
      return {
        servers: [],
        groups: [],
        error: errorMessage
      };
    }
  }

  /**
   * 更新订阅
   */
  public async updateSubscription(subscription: Subscription): Promise<SubscriptionUpdateResult> {
    try {
      log.info('开始更新订阅', { id: subscription.id, name: subscription.name }, 'SubscriptionManager');

      const parseResult = await this.parseSubscription(subscription.url);
      
      if (parseResult.error) {
        return {
          success: false,
          error: parseResult.error,
          timestamp: Date.now()
        };
      }

      // 更新订阅数据
      const updatedSubscription: Subscription = {
        ...subscription,
        servers: parseResult.servers,
        groups: parseResult.groups,
        lastUpdate: Date.now(),
        nextUpdate: Date.now() + (subscription.updateInterval * 1000)
      };

      this.subscriptions.set(subscription.id, updatedSubscription);

      log.info('订阅更新完成', { 
        id: subscription.id, 
        serverCount: parseResult.servers.length,
        groupCount: parseResult.groups.length 
      }, 'SubscriptionManager');

      return {
        success: true,
        servers: parseResult.servers,
        groups: parseResult.groups,
        timestamp: Date.now(),
        updatedSubscription: updatedSubscription
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      log.error('订阅更新失败', { id: subscription.id, error: errorMessage }, 'SubscriptionManager');
      
      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }

  /**
   * 启用订阅
   */
  public enableSubscription(id: string): boolean {
    const subscription = this.subscriptions.get(id);
    if (!subscription) {
      return false;
    }

    subscription.enabled = true;
    
    if (subscription.autoUpdate) {
      this.scheduleUpdate(subscription);
    }

    log.info('启用订阅', { id, name: subscription.name }, 'SubscriptionManager');
    return true;
  }

  /**
   * 禁用订阅
   */
  public disableSubscription(id: string): boolean {
    const subscription = this.subscriptions.get(id);
    if (!subscription) {
      return false;
    }

    subscription.enabled = false;
    this.cancelUpdate(id);

    log.info('禁用订阅', { id, name: subscription.name }, 'SubscriptionManager');
    return true;
  }

  /**
   * 调度自动更新
   */
  private scheduleUpdate(subscription: Subscription): void {
    // 取消现有的定时器
    this.cancelUpdate(subscription.id);

    // 计算下次更新时间
    const now = Date.now();
    const nextUpdate = subscription.lastUpdate 
      ? subscription.lastUpdate + (subscription.updateInterval * 1000)
      : now + (subscription.updateInterval * 1000);

    const delay = Math.max(0, nextUpdate - now);

    // 设置定时器
    const timer = setTimeout(async () => {
      await this.updateSubscription(subscription);
      
      // 如果订阅仍然启用且设置了自动更新，继续调度
      const currentSubscription = this.subscriptions.get(subscription.id);
      if (currentSubscription?.enabled && currentSubscription?.autoUpdate) {
        this.scheduleUpdate(currentSubscription);
      }
    }, delay);

    this.updateTimers.set(subscription.id, timer);
    
    log.info('调度订阅更新', { 
      id: subscription.id, 
      delay: Math.round(delay / 1000) + '秒' 
    }, 'SubscriptionManager');
  }

  /**
   * 取消自动更新
   */
  private cancelUpdate(id: string): void {
    const timer = this.updateTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.updateTimers.delete(id);
      log.info('取消订阅更新', { id }, 'SubscriptionManager');
    }
  }

  /**
   * 检测订阅格式
   */
  private detectFormat(content: string): string {
    // 检测Base64编码
    if (this.isBase64(content)) {
      try {
        const decoded = Base64.decode(content);
        if (decoded.includes('vmess://') || decoded.includes('vless://')) {
          return 'base64';
        }
      } catch (error) {
        // 解码失败，继续检测其他格式
      }
    }

    // 检测Clash格式
    if (content.includes('proxies:') || content.includes('proxy-groups:')) {
      return 'clash';
    }

    // 检测Sing-box格式
    if (content.includes('"outbounds"') || content.includes('"inbounds"')) {
      return 'singbox';
    }

    // 检测V2Ray格式
    if (content.includes('"protocol"') && content.includes('"settings"')) {
      return 'v2ray';
    }

    // 检测纯链接格式
    if (content.includes('vmess://') || content.includes('vless://') || 
        content.includes('trojan://') || content.includes('ss://')) {
      return 'links';
    }

    return 'unknown';
  }

  /**
   * 根据格式解析订阅内容
   */
  private async parseByFormat(content: string, format: string): Promise<SubscriptionParseResult> {
    switch (format) {
      case 'base64':
        return this.parseBase64(content);
      case 'clash':
        return this.parseClash(content);
      case 'singbox':
        return this.parseSingbox(content);
      case 'v2ray':
        return this.parseV2Ray(content);
      case 'links':
        return this.parseLinks(content);
      default:
        return {
          servers: [],
          groups: [],
          error: '不支持的订阅格式'
        };
    }
  }

  /**
   * 解析Base64编码的订阅
   */
  private parseBase64(content: string): SubscriptionParseResult {
    try {
      const decoded = Base64.decode(content);
      return this.parseLinks(decoded);
    } catch (error) {
      return {
        servers: [],
        groups: [],
        error: 'Base64解码失败'
      };
    }
  }

  /**
   * 解析Clash格式
   */
  private parseClash(content: string): SubscriptionParseResult {
    try {
      const config = JSON.parse(content);
      const servers: ProxyServer[] = [];
      const groups: ProxyGroup[] = [];

      // 解析代理服务器
      if (config.proxies && Array.isArray(config.proxies)) {
        for (const proxy of config.proxies) {
          const server = this.convertClashProxy(proxy);
          if (server) {
            servers.push(server);
          }
        }
      }

      // 解析代理组
      if (config['proxy-groups'] && Array.isArray(config['proxy-groups'])) {
        for (const group of config['proxy-groups']) {
          const proxyGroup = this.convertClashGroup(group);
          if (proxyGroup) {
            groups.push(proxyGroup);
          }
        }
      }

      return { servers, groups };
    } catch (error) {
      return {
        servers: [],
        groups: [],
        error: 'Clash格式解析失败'
      };
    }
  }

  /**
   * 解析Sing-box格式
   */
  private parseSingbox(content: string): SubscriptionParseResult {
    try {
      const config = JSON.parse(content);
      const servers: ProxyServer[] = [];

      // 解析出站代理
      if (config.outbounds && Array.isArray(config.outbounds)) {
        for (const outbound of config.outbounds) {
          const server = this.convertSingboxOutbound(outbound);
          if (server) {
            servers.push(server);
          }
        }
      }

      return { servers, groups: [] };
    } catch (error) {
      return {
        servers: [],
        groups: [],
        error: 'Sing-box格式解析失败'
      };
    }
  }

  /**
   * 解析V2Ray格式
   */
  private parseV2Ray(content: string): SubscriptionParseResult {
    try {
      const config = JSON.parse(content);
      const servers: ProxyServer[] = [];

      // 解析出站代理
      if (config.outbounds && Array.isArray(config.outbounds)) {
        for (const outbound of config.outbounds) {
          const server = this.convertV2RayOutbound(outbound);
          if (server) {
            servers.push(server);
          }
        }
      }

      return { servers, groups: [] };
    } catch (error) {
      return {
        servers: [],
        groups: [],
        error: 'V2Ray格式解析失败'
      };
    }
  }

  /**
   * 解析纯链接格式
   */
  private parseLinks(content: string): SubscriptionParseResult {
    const servers: ProxyServer[] = [];
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const server = this.parseProxyLink(line.trim());
      if (server) {
        servers.push(server);
      }
    }

    return { servers, groups: [] };
  }

  /**
   * 解析代理链接
   */
  private parseProxyLink(link: string): ProxyServer | null {
    try {
      if (link.startsWith('vmess://')) {
        return this.parseVmessLink(link);
      } else if (link.startsWith('vless://')) {
        return this.parseVlessLink(link);
      } else if (link.startsWith('trojan://')) {
        return this.parseTrojanLink(link);
      } else if (link.startsWith('ss://')) {
        return this.parseShadowsocksLink(link);
      }
    } catch (error) {
      log.warn('解析代理链接失败', { link, error }, 'SubscriptionManager');
    }

    return null;
  }

  /**
   * 解析VMess链接
   */
  private parseVmessLink(link: string): ProxyServer | null {
    try {
      const vmessContent = link.replace('vmess://', '');
      const decoded = Base64.decode(vmessContent);
      const config = JSON.parse(decoded);

      // 处理节点名称，确保正确解码
      const nodeName = this.decodeNodeName(config.ps || config.name || 'VMess节点');

      return {
        id: this.generateId(),
        name: nodeName,
        protocol: 'vmess' as ProxyProtocol,
        host: config.add || config.host,
        port: parseInt(config.port),
        uuid: config.id,
        alterId: parseInt(config.aid) || 0,
        network: config.net || 'tcp',
        tls: config.tls === 'tls',
        sni: config.sni || config.host,
        wsPath: config.path || '/',
        wsHeaders: config.host ? { Host: config.host } : undefined,
        enabled: true
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 解析VLESS链接
   */
  private parseVlessLink(link: string): ProxyServer | null {
    try {
      const url = new URL(link);
      const params = new URLSearchParams(url.search);

      // 处理节点名称
      const nodeName = this.decodeNodeName(url.hash ? url.hash.slice(1) : 'VLESS节点');

      return {
        id: this.generateId(),
        name: nodeName,
        protocol: 'vless' as ProxyProtocol,
        host: url.hostname,
        port: parseInt(url.port),
        uuid: url.username,
        network: params.get('type') || 'tcp',
        tls: params.get('security') === 'tls',
        sni: params.get('sni') || url.hostname,
        wsPath: params.get('path') || '/',
        wsHeaders: params.get('host') ? { Host: params.get('host')! } : undefined,
        enabled: true
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 解析Trojan链接
   */
  private parseTrojanLink(link: string): ProxyServer | null {
    try {
      const url = new URL(link);

      // 处理节点名称
      const nodeName = this.decodeNodeName(url.hash ? url.hash.slice(1) : 'Trojan节点');

      return {
        id: this.generateId(),
        name: nodeName,
        protocol: 'trojan' as ProxyProtocol,
        host: url.hostname,
        port: parseInt(url.port),
        password: url.username,
        sni: url.searchParams.get('sni') || url.hostname,
        enabled: true
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 解析Shadowsocks链接
   */
  private parseShadowsocksLink(link: string): ProxyServer | null {
    try {
      const url = new URL(link);
      const method = url.username.split(':')[0];
      const password = url.username.split(':')[1];

      // 处理节点名称
      const nodeName = this.decodeNodeName(url.hash ? url.hash.slice(1) : 'Shadowsocks节点');

      return {
        id: this.generateId(),
        name: nodeName,
        protocol: 'shadowsocks' as ProxyProtocol,
        host: url.hostname,
        port: parseInt(url.port),
        encryption: method,
        password: password,
        enabled: true
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 转换Clash代理配置
   */
  private convertClashProxy(proxy: any): ProxyServer | null {
    try {
      // 处理节点名称
      const nodeName = this.decodeNodeName(proxy.name || 'Clash节点');

      return {
        id: this.generateId(),
        name: nodeName,
        protocol: proxy.type as ProxyProtocol,
        host: proxy.server,
        port: proxy.port,
        uuid: proxy.uuid,
        alterId: proxy.alterId,
        network: proxy.network,
        tls: proxy.tls,
        sni: proxy.servername,
        wsPath: proxy.path,
        wsHeaders: proxy.host ? { Host: proxy.host } : undefined,
        encryption: proxy.cipher,
        password: proxy.password,
        enabled: true
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 转换Clash代理组
   */
  private convertClashGroup(group: any): ProxyGroup | null {
    try {
      return {
        id: this.generateId(),
        name: group.name,
        type: group.type,
        proxies: group.proxies || [],
        url: group.url,
        interval: group.interval,
        tolerance: group.tolerance,
        enabled: true
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 转换Sing-box出站配置
   */
  private convertSingboxOutbound(outbound: any): ProxyServer | null {
    try {
      if (outbound.type === 'vmess') {
        return {
          id: this.generateId(),
          name: outbound.tag || 'VMess节点',
          protocol: 'vmess' as ProxyProtocol,
          host: outbound.server,
          port: outbound.server_port,
          uuid: outbound.uuid,
          alterId: outbound.alter_id || 0,
          network: outbound.transport?.type || 'tcp',
          tls: outbound.tls?.enabled,
          sni: outbound.tls?.server_name,
          wsPath: outbound.transport?.path,
          wsHeaders: outbound.transport?.host ? { Host: outbound.transport.host } : undefined,
          enabled: true
        };
      }
      // 可以添加其他协议的支持
    } catch (error) {
      return null;
    }

    return null;
  }

  /**
   * 转换V2Ray出站配置
   */
  private convertV2RayOutbound(outbound: any): ProxyServer | null {
    try {
      if (outbound.protocol === 'vmess') {
        const settings = outbound.settings;
        const server = settings.vnext?.[0]?.users?.[0];
        
        if (server) {
          return {
            id: this.generateId(),
            name: outbound.tag || 'VMess节点',
            protocol: 'vmess' as ProxyProtocol,
            host: settings.vnext[0].address,
            port: settings.vnext[0].port,
            uuid: server.id,
            alterId: server.alterId || 0,
            network: outbound.streamSettings?.network || 'tcp',
            tls: outbound.streamSettings?.security === 'tls',
            sni: outbound.streamSettings?.tlsSettings?.serverName,
            wsPath: outbound.streamSettings?.wsSettings?.path,
            wsHeaders: outbound.streamSettings?.wsSettings?.headers?.Host ? { Host: outbound.streamSettings.wsSettings.headers.Host } : undefined,
            enabled: true
          };
        }
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  /**
   * 检查是否为Base64编码
   */
  private isBase64(str: string): boolean {
    try {
      // 增加长度和字符集检查，提高准确性
      if (str.length % 4 !== 0 || !/^[A-Za-z0-9+/=]+$/.test(str)) {
        return false;
      }
      return btoa(atob(str)) === str;
    } catch (error) {
      return false;
    }
  }

  /**
   * [核心修复] 使用 js-base64 库进行解码
   */
  private base64ToUtf8(str: string): string {
    try {
      return Base64.decode(str);
    } catch (e) {
      log.warn('Base64 to UTF-8 decoding failed, falling back to raw atob', { input: str, error: e }, 'SubscriptionManager');
      // 如果UTF-8解码失败，回退到原始的atob，以兼容非UTF8编码的内容
      return atob(str);
    }
  }

  /**
   * [核心修复] 使用 js-base64 库进行解码
   */
  private decodeNodeName(encodedName: string): string {
    if (!encodedName) {
      return '未知节点';
    }

    log.debug('开始解码节点名称', { input: encodedName }, 'SubscriptionManager');
    let decodedName = encodedName;

    // 尝试URL解码
    try {
      // 替换+号为空格是URL解码标准的一部分
      decodedName = decodeURIComponent(encodedName.replace(/\+/g, ' '));
       // 如果解码结果没有变化，且包含乱码符号，可能解码不正确，继续尝试其他方法
      if (decodedName === encodedName && /[%]/.test(decodedName)) {
        throw new Error("URL decoding didn't change the string, but it contains URL-encoded characters.");
      }
      log.debug('节点名称URL解码成功', { input: encodedName, output: decodedName }, 'SubscriptionManager');
      // 检查解码后是否仍然像Base64，如果是，则可能需要进一步解码
      if (!this.isBase64(decodedName)) {
        return decodedName;
      }
    } catch (e) {
      log.debug('URL解码失败或不适用，继续尝试', { input: encodedName }, 'SubscriptionManager');
    }

    // 尝试Base64解码
    try {
      if (this.isBase64(encodedName)) {
        decodedName = Base64.decode(encodedName);
        log.debug('节点名称Base64解码成功', { input: encodedName, output: decodedName }, 'SubscriptionManager');
        return decodedName;
      }
    } catch (e) {
      log.warn('节点名称Base64解码失败', { input: encodedName, error: e }, 'SubscriptionManager');
    }

    log.debug('所有解码尝试均未改变原始值，返回原始名称', { input: encodedName }, 'SubscriptionManager');
    return encodedName; // 如果所有方法都失败，返回原始字符串
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    // 清除所有定时器
    for (const timer of this.updateTimers.values()) {
      clearTimeout(timer);
    }
    this.updateTimers.clear();
    this.subscriptions.clear();
    
    log.info('订阅管理器已销毁', null, 'SubscriptionManager');
  }
}

export const subscriptionManager = SubscriptionManager.getInstance();
