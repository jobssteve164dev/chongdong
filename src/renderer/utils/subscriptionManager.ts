import { Subscription, ProxyServer, ProxyGroup, ProxyProtocol, RoutingRule, RuleType, RuleAction, RuleSource } from '../../shared/types';
import { log } from './logger';
import { Base64 } from 'js-base64';
import { parse as parseYaml } from 'yaml';

export interface SubscriptionParseResult {
  servers: ProxyServer[];
  groups: ProxyGroup[];
  rules: RoutingRule[];
  error?: string;
}

export interface SubscriptionUpdateResult {
  success: boolean;
  servers?: ProxyServer[];
  groups?: ProxyGroup[];
  rules?: RoutingRule[];
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
   * 从订阅链接导入规则
   */
  public async importFromUrl(url: string): Promise<RoutingRule[]> {
    try {
      log.info('开始从订阅链接导入规则', { url }, 'SubscriptionManager');

      // 验证URL格式
      if (!url || !url.startsWith('http')) {
        throw new Error('无效的订阅链接格式，请确保链接以http或https开头');
      }

      const parseResult = await this.parseSubscription(url);
      
      if (parseResult.error) {
        throw new Error(`订阅解析失败: ${parseResult.error}`);
      }

      // 检查是否解析到规则
      if (!parseResult.rules || parseResult.rules.length === 0) {
        log.warn('订阅链接中未找到规则', { url }, 'SubscriptionManager');
        throw new Error('该订阅链接中未包含任何规则，请检查订阅内容');
      }

      // 将解析的规则转换为导入格式
      const importedRules = parseResult.rules.map(rule => ({
        ...rule,
        source: RuleSource.SUBSCRIPTION as RuleSource,
        enabled: true
      }));

      log.info('从订阅链接导入规则完成', { 
        url, 
        ruleCount: importedRules.length 
      }, 'SubscriptionManager');

      return importedRules;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      log.error('从订阅链接导入规则失败', { url, error: errorMessage }, 'SubscriptionManager');
      throw error;
    }
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
        rules: [],
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
        rules: parseResult.rules,
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
        rules: parseResult.rules,
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

    // 检测Clash格式（支持YAML和JSON）
    if (content.includes('proxies:') || content.includes('proxy-groups:') || 
        content.includes('port:') && content.includes('socks-port:')) {
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
        rules: [],
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
        rules: [],
        error: 'Base64解码失败'
      };
    }
  }

  /**
   * 解析Clash格式
   */
  private parseClash(content: string): SubscriptionParseResult {
    try {
      log.debug('开始解析Clash格式', { contentLength: content.length }, 'SubscriptionManager');
      
      // 尝试解析YAML
      let config: any;
      try {
        config = parseYaml(content);
        log.debug('Clash配置解析为YAML', { contentLength: content.length }, 'SubscriptionManager');
      } catch (e) {
        // 如果不是YAML，尝试JSON
        try {
          config = JSON.parse(content);
          log.debug('Clash配置解析为JSON', { contentLength: content.length }, 'SubscriptionManager');
        } catch (e) {
          throw new Error('Clash配置解析失败，请确保内容为有效的YAML或JSON');
        }
      }

      const servers: ProxyServer[] = [];
      const groups: ProxyGroup[] = [];
      const rules: RoutingRule[] = [];

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

      // 解析分流规则
      if (config.rules && Array.isArray(config.rules)) {
        for (const rule of config.rules) {
          const routingRule = this.convertClashRule(rule);
          if (routingRule) {
            rules.push(routingRule);
          }
        }
      }

      log.debug('Clash格式解析完成', { 
        serverCount: servers.length, 
        groupCount: groups.length, 
        ruleCount: rules.length 
      }, 'SubscriptionManager');

      return { servers, groups, rules };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      log.error('Clash格式解析失败', { 
        error: errorMessage, 
        contentPreview: content.substring(0, 200) + '...' 
      }, 'SubscriptionManager');
      
      return {
        servers: [],
        groups: [],
        rules: [],
        error: `Clash格式解析失败: ${errorMessage}`
      };
    }
  }

  /**
   * 解析Sing-box格式
   */
  private parseSingbox(content: string): SubscriptionParseResult {
    try {
      log.debug('开始解析Sing-box格式', { contentLength: content.length }, 'SubscriptionManager');
      
      const config = JSON.parse(content);
      const servers: ProxyServer[] = [];
      const groups: ProxyGroup[] = [];
      const rules: RoutingRule[] = [];

      // 解析出站代理
      if (config.outbounds && Array.isArray(config.outbounds)) {
        for (const outbound of config.outbounds) {
          const server = this.convertSingboxOutbound(outbound);
          if (server) {
            servers.push(server);
          }
        }
      }

      // 解析分流规则
      if (config.route?.rules && Array.isArray(config.route.rules)) {
        for (const rule of config.route.rules) {
          const routingRule = this.convertSingboxRule(rule);
          if (routingRule) {
            rules.push(routingRule);
          }
        }
      }

      log.debug('Sing-box格式解析完成', { 
        serverCount: servers.length, 
        ruleCount: rules.length 
      }, 'SubscriptionManager');

      return { servers, groups: [], rules };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      log.error('Sing-box格式解析失败', { 
        error: errorMessage, 
        contentPreview: content.substring(0, 200) + '...' 
      }, 'SubscriptionManager');
      
      return {
        servers: [],
        groups: [],
        rules: [],
        error: `Sing-box格式解析失败: ${errorMessage}`
      };
    }
  }

  /**
   * 解析V2Ray格式
   */
  private parseV2Ray(content: string): SubscriptionParseResult {
    try {
      log.debug('开始解析V2Ray格式', { contentLength: content.length }, 'SubscriptionManager');
      
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

      log.debug('V2Ray格式解析完成', { serverCount: servers.length }, 'SubscriptionManager');

      return { servers, groups: [], rules: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      log.error('V2Ray格式解析失败', { 
        error: errorMessage, 
        contentPreview: content.substring(0, 200) + '...' 
      }, 'SubscriptionManager');
      
      return {
        servers: [],
        groups: [],
        rules: [],
        error: `V2Ray格式解析失败: ${errorMessage}`
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

    return { servers, groups: [], rules: [] };
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
   * 转换Clash规则为内部格式
   */
  private convertClashRule(clashRule: string): RoutingRule | null {
    try {
      const parts = clashRule.split(',');
      if (parts.length < 2) return null;

      const [type, value, action] = parts;
      const ruleType = this.convertClashTypeToRuleType(type);
      const ruleAction = this.convertClashActionToRuleAction(action);

      if (!ruleType || !ruleAction) return null;

      return {
        id: this.generateId(),
        name: `${type}:${value}`,
        type: ruleType,
        value: value,
        action: ruleAction,
        priority: 100,
        source: RuleSource.SUBSCRIPTION,
        enabled: true,
        description: `从Clash配置导入的规则`,
        tags: ['clash', 'subscription'],
        createdAt: new Date(),
        updatedAt: new Date(),
        clashRule: clashRule
      };
    } catch (error) {
      log.warn('转换Clash规则失败', { clashRule, error }, 'SubscriptionManager');
      return null;
    }
  }

  /**
   * 转换Clash类型为规则类型
   */
  private convertClashTypeToRuleType(clashType: string): RuleType | null {
    switch (clashType) {
      case 'DOMAIN':
        return RuleType.DOMAIN;
      case 'DOMAIN-SUFFIX':
        return RuleType.DOMAIN_SUFFIX;
      case 'DOMAIN-KEYWORD':
        return RuleType.DOMAIN_KEYWORD;
      case 'DOMAIN-REGEX':
        return RuleType.DOMAIN_REGEX;
      case 'IP-CIDR':
        return RuleType.IP_CIDR;
      case 'IP-CIDR6':
        return RuleType.IP_CIDR6;
      case 'GEOIP':
        return RuleType.GEOIP;
      case 'PROCESS':
        return RuleType.PROCESS;
      case 'PROCESS-PATH':
        return RuleType.PROCESS_PATH;
      case 'PROTOCOL':
        return RuleType.PROTOCOL;
      case 'SCRIPT':
        return RuleType.SCRIPT;
      case 'MATCH':
        return RuleType.MATCH;
      default:
        return null;
    }
  }

  /**
   * 转换Clash动作为规则动作
   */
  private convertClashActionToRuleAction(clashAction: string): RuleAction | null {
    switch (clashAction) {
      case 'Proxy':
      case 'proxy':
        return RuleAction.PROXY;
      case 'Direct':
      case 'direct':
        return RuleAction.DIRECT;
      case 'Reject':
      case 'reject':
        return RuleAction.BLOCK;
      case 'Chain':
      case 'chain':
        return RuleAction.CHAIN;
      default:
        return RuleAction.DIRECT;
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
   * 转换Sing-box规则为内部格式
   */
  private convertSingboxRule(singboxRule: any): RoutingRule | null {
    try {
      const outbound = singboxRule.outbound;
      const ruleAction = this.convertSingboxActionToRuleAction(outbound);

      let ruleType: RuleType | null = null;
      let value: string = '';

      if (singboxRule.domain) {
        ruleType = RuleType.DOMAIN;
        value = Array.isArray(singboxRule.domain) ? singboxRule.domain[0] : singboxRule.domain;
      } else if (singboxRule.domain_suffix) {
        ruleType = RuleType.DOMAIN_SUFFIX;
        value = Array.isArray(singboxRule.domain_suffix) ? singboxRule.domain_suffix[0] : singboxRule.domain_suffix;
      } else if (singboxRule.domain_keyword) {
        ruleType = RuleType.DOMAIN_KEYWORD;
        value = Array.isArray(singboxRule.domain_keyword) ? singboxRule.domain_keyword[0] : singboxRule.domain_keyword;
      } else if (singboxRule.domain_regex) {
        ruleType = RuleType.DOMAIN_REGEX;
        value = Array.isArray(singboxRule.domain_regex) ? singboxRule.domain_regex[0] : singboxRule.domain_regex;
      } else if (singboxRule.ip_cidr) {
        ruleType = RuleType.IP_CIDR;
        value = Array.isArray(singboxRule.ip_cidr) ? singboxRule.ip_cidr[0] : singboxRule.ip_cidr;
      } else if (singboxRule.ip_cidr6) {
        ruleType = RuleType.IP_CIDR6;
        value = Array.isArray(singboxRule.ip_cidr6) ? singboxRule.ip_cidr6[0] : singboxRule.ip_cidr6;
      } else if (singboxRule.geoip) {
        ruleType = RuleType.GEOIP;
        value = singboxRule.geoip;
      } else if (singboxRule.process) {
        ruleType = RuleType.PROCESS;
        value = Array.isArray(singboxRule.process) ? singboxRule.process[0] : singboxRule.process;
      } else if (singboxRule.process_path) {
        ruleType = RuleType.PROCESS_PATH;
        value = Array.isArray(singboxRule.process_path) ? singboxRule.process_path[0] : singboxRule.process_path;
      } else if (singboxRule.protocol) {
        ruleType = RuleType.PROTOCOL;
        value = Array.isArray(singboxRule.protocol) ? singboxRule.protocol[0] : singboxRule.protocol;
      } else {
        ruleType = RuleType.MATCH;
        value = '*';
      }

      if (!ruleType || !ruleAction) return null;

      return {
        id: this.generateId(),
        name: `${ruleType}:${value}`,
        type: ruleType,
        value: value,
        action: ruleAction,
        priority: 100,
        source: RuleSource.SUBSCRIPTION,
        enabled: true,
        description: `从Sing-box配置导入的规则`,
        tags: ['singbox', 'subscription'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      log.warn('转换Sing-box规则失败', { singboxRule, error }, 'SubscriptionManager');
      return null;
    }
  }

  /**
   * 转换Sing-box动作为规则动作
   */
  private convertSingboxActionToRuleAction(singboxAction: string): RuleAction | null {
    switch (singboxAction) {
      case 'proxy':
        return RuleAction.PROXY;
      case 'direct':
        return RuleAction.DIRECT;
      case 'block':
        return RuleAction.BLOCK;
      case 'chain':
        return RuleAction.CHAIN;
      default:
        return RuleAction.DIRECT;
    }
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
