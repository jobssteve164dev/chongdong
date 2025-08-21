// 通过预加载脚本访问 ipcRenderer
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        send: (channel: string, data: any) => void;
        on: (channel: string, func: (...args: any[]) => void) => void;
      };
    };
  }
}

const { ipcRenderer } = window.electron;

import { ProxyNode, AppSettings } from '../../shared/types';
import { dnsManager } from './dnsManager';

export interface ProxyConfig {
  id: string;
  name: string;
  type: 'singbox' | 'xray' | 'clash';
  config: any;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 添加网络设置接口
export interface NetworkSettings {
  enableDns: boolean;
  dnsServer: string;
  enableDoh: boolean;
  dohServer: string;
  enableTun: boolean;
  tunDevice: string;
  enableFakeIp: boolean;
  fakeIpRange: string;
  enableUdp: boolean;
  enableIpv6: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableLog: boolean;
  logFile: string;
}

export interface ProxyStatus {
  running: boolean;
  uptime: number;
  connections: number;
  upload: number;
  download: number;
  error?: string;
}

export interface ProxyStats {
  totalUpload: number;
  totalDownload: number;
  activeConnections: number;
  totalConnections: number;
}

export class ProxyEngine {
  private static instance: ProxyEngine;
  private status: ProxyStatus = {
    running: false,
    uptime: 0,
    connections: 0,
    upload: 0,
    download: 0
  };
  private statusCallbacks: Array<(status: ProxyStatus) => void> = [];

  private constructor() {}

  public static getInstance(): ProxyEngine {
    if (!ProxyEngine.instance) {
      ProxyEngine.instance = new ProxyEngine();
    }
    return ProxyEngine.instance;
  }

  /**
   * 启动代理服务
   */
  public async startWithNode(node: ProxyNode, settings: AppSettings): Promise<boolean> {
    try {
      const engineType = settings.proxyEngine || 'singbox';
      
      // 规范化为引擎可消费的配置
      const normalizedOutbound: any = {
        // 将节点标准化成 Sing-box 期望的字段名
        type: ((): string => {
          const t = (node.type || '').toString().toLowerCase();
          if (t === 'ss') return 'shadowsocks';
          return t;
        })(),
        name: node.name,
        server: (node as any).server || (node as any).host,
        port: node.port,
        uuid: (node as any).uuid,
        password: (node as any).password,
        security: (node as any).security,
        network: (node as any).network,
        wsPath: (node as any).wsPath,
        wsHeaders: ((): any => {
          const headers: any = (node as any).wsHeaders || {};
          if ((node as any).wsHost && !headers.Host) headers.Host = (node as any).wsHost;
          return headers;
        })(),
        sni: (node as any).sni, // 传递 SNI 字段
      };

      const proxyConfig: ProxyConfig = {
        id: node.id,
        name: node.name,
        type: engineType,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        // 将标准化后的出站传入，由 convertToSingboxConfig 进一步细化
        config: { outbounds: [normalizedOutbound] }
      };
      
      // 根据配置类型选择引擎
      switch (engineType) {
        case 'singbox':
          await this.startSingbox(proxyConfig, settings);
          break;
        case 'xray':
          await this.startXray(proxyConfig, settings);
          break;
        case 'clash':
          await this.startClash(proxyConfig, settings);
          break;
        default:
          throw new Error(`Unsupported proxy type: ${engineType}`);
      }

      this.status.running = true;
      this.status.uptime = Date.now();
      
      console.log('代理引擎状态已设置为运行中:', this.status);
      
      this.startStatusMonitoring();
      this.notifyStatusChange();
      
      // 启动监控管理器
      console.log('代理启动成功，开始启动监控管理器...');
      try {
        const { monitorManager } = await import('./monitorManager');
        console.log('监控管理器对象:', monitorManager);
        console.log('监控管理器类型:', typeof monitorManager);
        console.log('监控管理器方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(monitorManager)));
        console.log('调用 monitorManager.startMonitoring()...');
        await monitorManager.startMonitoring();
        console.log('监控管理器启动成功');
      } catch (error) {
        console.error('监控管理器启动失败:', error);
        console.error('错误详情:', error);
      }
      
      return true;
    } catch (error) {
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
      this.notifyStatusChange();
      console.error('Failed to start proxy with node:', error);
      return false;
    }
  }

  /**
   * 启动代理服务
   */
  public async start(config: ProxyConfig, networkSettings?: AppSettings): Promise<void> {
    try {
      // 根据配置类型选择引擎
      switch (config.type) {
        case 'singbox':
          await this.startSingbox(config, networkSettings);
          break;
        case 'xray':
          await this.startXray(config, networkSettings);
          break;
        case 'clash':
          await this.startClash(config, networkSettings);
          break;
        default:
          throw new Error(`Unsupported proxy type: ${config.type}`);
      }

      this.status.running = true;
      this.status.uptime = Date.now();
      
      // 开始状态监控
      this.startStatusMonitoring();
      this.notifyStatusChange();
      
    } catch (error) {
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * 停止代理服务
   */
  public async stop(): Promise<void> {
    try {
      await ipcRenderer.invoke('proxy:stop');
      this.status.running = false;
      this.status.uptime = 0;
      this.status.connections = 0;
      this.status.upload = 0;
      this.status.download = 0;
      this.status.error = undefined;
      this.notifyStatusChange();
    } catch (error) {
      throw new Error(`Failed to stop proxy: ${error}`);
    }
  }

  /**
   * 重新加载配置
   */
  public async reload(config: ProxyConfig): Promise<void> {
    if (this.status.running) {
      await this.stop();
    }
    await this.start(config);
  }

  /**
   * 获取代理状态
   */
  public getStatus(): ProxyStatus {
    return { ...this.status };
  }

  /**
   * 注册状态变化回调
   */
  public onStatusChange(callback: (status: ProxyStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  /**
   * 移除状态变化回调
   */
  public offStatusChange(callback: (status: ProxyStatus) => void): void {
    const index = this.statusCallbacks.indexOf(callback);
    if (index > -1) {
      this.statusCallbacks.splice(index, 1);
    }
  }

  /**
   * 通知状态变化
   */
  private notifyStatusChange(): void {
    const status = { ...this.status };
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Status change callback error:', error);
      }
    });
  }

  /**
   * 检查代理是否正在运行
   */
  public isRunning(): boolean {
    return this.status.running;
  }

  /**
   * 强制检查代理状态
   */
  public async checkRunningStatus(): Promise<boolean> {
    try {
      const stats = await this.getStats();
      // 如果能获取到统计信息，说明代理正在运行
      const isRunning = stats && !stats.error;
      this.status.running = isRunning;
      console.log('强制检查代理状态:', isRunning, stats);
      return isRunning;
    } catch (error) {
      console.error('检查代理状态失败:', error);
      this.status.running = false;
      return false;
    }
  }

  /**
   * 获取统计信息
   */
  public async getStats(): Promise<any> {
    try {
      // 通过IPC调用主进程获取统计信息
      const stats = await window.electron.ipcRenderer.invoke('proxy:getStats');
      return stats;
    } catch (error) {
      console.error('Failed to get stats:', error);
      return {
        activeConnections: 0,
        totalUpload: 0,
        totalDownload: 0
      };
    }
  }

  /**
   * 启动Sing-box引擎
   */
  private async startSingbox(config: ProxyConfig, networkSettings?: AppSettings): Promise<void> {
    const singboxConfig = this.convertToSingboxConfig(config, networkSettings);
    
    // 通过IPC调用主进程启动Sing-box
    const result = await window.electron.ipcRenderer.invoke('proxy:startSingbox', singboxConfig);
    
    // 检查结果，如果失败则抛出错误
    if (!result.success) {
      throw new Error(result.error || 'Failed to start Sing-box');
    }
  }

  /**
   * 启动Xray引擎
   */
  private async startXray(config: ProxyConfig, networkSettings?: AppSettings): Promise<void> {
    const xrayConfig = this.convertToXrayConfig(config, networkSettings);
    
    // 通过IPC调用主进程启动Xray
    const result = await window.electron.ipcRenderer.invoke('proxy:startXray', xrayConfig);
    
    // 检查结果，如果失败则抛出错误
    if (!result.success) {
      throw new Error(result.error || 'Failed to start Xray');
    }
  }

  /**
   * 启动Clash引擎
   */
  private async startClash(config: ProxyConfig, networkSettings?: AppSettings): Promise<void> {
    const clashConfig = this.convertToClashConfig(config, networkSettings);
    
    // 通过IPC调用主进程启动Clash
    const result = await window.electron.ipcRenderer.invoke('proxy:startClash', clashConfig);
    
    // 检查结果，如果失败则抛出错误
    if (!result.success) {
      throw new Error(result.error || 'Failed to start Clash');
    }
  }

  /**
   * 转换为Sing-box配置格式
   */
  private convertToSingboxConfig(config: ProxyConfig, networkSettings?: AppSettings): any {
    console.log(`=== 开始转换 Sing-box 配置 ===`);
    console.log(`原始配置:`, config);
    console.log(`网络设置:`, networkSettings);
    
    // 初始化DNS管理器
    if (networkSettings) {
      console.log(`初始化DNS管理器...`);
      dnsManager.init(networkSettings);
    }

    // 基础Sing-box配置结构
    console.log(`构建基础 Sing-box 配置...`);
    const singboxConfig: any = {
      log: {
        level: networkSettings?.logLevel || 'info',
        output: networkSettings?.enableLog ? networkSettings.logFile || 'chongdong.log' : 'console'
      },
      experimental: {
        clash_api: {
          external_controller: '127.0.0.1:9090',
          external_ui: '',
          secret: ''
        }
      },
      // 从独立的DNS管理器获取DNS配置
      dns: dnsManager.getDnsConfig() || {
        servers: [
          {
            tag: 'default',
            address: '8.8.8.8',
            detour: 'direct'
          }
        ],
        final: 'default'
      },
      inbounds: (() => {
        console.log(`=== 配置入站连接 ===`);
        const inbounds = [];
        
        // 只在启用 TUN 时添加 TUN inbound
        if (networkSettings?.enableTun) {
          console.log(`添加 TUN 入站配置`);
          console.log(`TUN 设备: ${networkSettings?.tunDevice || 'utun0'}`);
          console.log(`FakeIP 范围: ${networkSettings?.enableFakeIp ? networkSettings.fakeIpRange || '198.18.0.1/16' : 'disabled'}`);
          inbounds.push({
            type: 'tun',
            tag: 'tun-in',
            interface_name: networkSettings?.tunDevice || 'utun0',
            mtu: 9000,
            stack: 'system',
            auto_route: true,
            inet4_address: networkSettings?.enableFakeIp ? [networkSettings.fakeIpRange || '198.18.0.1/16'] : ['172.19.0.1/28'],
            inet6_address: networkSettings?.enableIpv6 ? ['fdfe:dcba:9876::1/126'] : undefined
          });
        } else {
          console.log(`TUN 功能已禁用`);
        }
        
        // 添加 SOCKS 入站配置
        const socksPort = networkSettings?.socksPort || 7896;
        console.log(`添加 SOCKS 入站配置`);
        console.log(`SOCKS 端口: ${socksPort}`);
        inbounds.push({
          type: 'socks',
          tag: 'socks-in',
          listen: '127.0.0.1',
          listen_port: socksPort,
          users: []
        });
        
        // 添加 HTTP 入站配置
        const httpPort = networkSettings?.proxyPort || 7897;
        console.log(`添加 HTTP 入站配置`);
        console.log(`HTTP 端口: ${httpPort}`);
        inbounds.push({
          type: 'http',
          tag: 'http-in',
          listen: '127.0.0.1',
          listen_port: httpPort
        });
        
        console.log(`入站配置数量: ${inbounds.length}`);
        return inbounds;
      })(),
      outbounds: [
        (() => {
          console.log(`添加直连出站配置`);
          return {
            type: 'direct',
            tag: 'direct'
          };
        })(),
        (() => {
          console.log(`添加DNS出站配置`);
          return {
            type: 'dns',
            tag: 'dns'
          };
        })()
      ],
      route: {
        rules: [
          (() => {
            console.log(`添加私有IP直连规则`);
            return {
              geoip: "private",
              outbound: "direct"
            };
          })(),
          (() => {
            console.log(`添加中国IP直连规则`);
            return {
              geoip: "cn",
              outbound: "direct"
            };
          })()
        ],
        final: "direct"
      }
    };

    // 根据具体配置添加代理出站
    console.log(`=== 处理代理出站配置 ===`);
    if (config.config.outbounds) {
      console.log(`原始出站配置数量: ${config.config.outbounds.length}`);
      console.log(`原始出站配置:`, config.config.outbounds);
      
      // 修复网络类型和字段名
      const fixedOutbounds = config.config.outbounds.map((outbound: any, index: number) => {
        console.log(`处理第 ${index + 1} 个出站配置:`, outbound);
        // 只保留 Sing-box 需要的字段
        const fixedOutbound: any = {
          type: outbound.type,
          tag: outbound.tag || outbound.name || `proxy-${outbound.id || Date.now()}`,
          server: outbound.server || outbound.host,
          server_port: outbound.server_port || outbound.port
        };
        
        console.log(`修复后的出站配置:`, fixedOutbound);
        
        // 确保所有必需字段都有值
        if (!fixedOutbound.server || !fixedOutbound.server_port) {
          console.warn(`跳过无效的出站配置:`, outbound);
          console.warn(`原因: 缺少服务器地址或端口`);
          return null;
        }
        
        // 根据协议类型添加特定字段
        console.log(`处理协议类型: ${outbound.type}`);
        
        if (outbound.type === 'vmess') {
          console.log(`配置 VMess 协议`);
          fixedOutbound.uuid = outbound.uuid;
          fixedOutbound.security = outbound.security || 'auto';
          console.log(`UUID: ${outbound.uuid}`);
          console.log(`安全类型: ${outbound.security || 'auto'}`);
          
          // 处理传输配置
          if (outbound.network === 'ws') {
            console.log(`配置 WebSocket 传输`);
            fixedOutbound.transport = {
              type: "ws",
              path: outbound.wsPath || "/",
              headers: outbound.wsHeaders || {}
            };
            console.log(`WebSocket 路径: ${outbound.wsPath || "/"}`);
            console.log(`WebSocket 头部:`, outbound.wsHeaders || {});
            
            // 兼容 wsHost -> headers.Host
            if ((outbound as any).wsHost && !fixedOutbound.transport.headers.Host) {
              fixedOutbound.transport.headers.Host = (outbound as any).wsHost;
              console.log(`设置 WebSocket Host: ${(outbound as any).wsHost}`);
            }
          } else {
            console.log(`使用默认 TCP 传输`);
          }
          // 对于 tcp 连接，不需要设置 transport 字段，Sing-box 默认使用 tcp
        } else if (outbound.type === 'shadowsocks') {
          console.log(`配置 Shadowsocks 协议`);
          fixedOutbound.method = outbound.method;
          fixedOutbound.password = outbound.password;
          console.log(`加密方法: ${outbound.method}`);
        } else if (outbound.type === 'trojan') {
          console.log(`配置 Trojan 协议`);
          fixedOutbound.password = outbound.password;
          console.log(`密码: ${outbound.password ? '***' : '未设置'}`);
          
          // Trojan 协议强制要求 TLS 和 SNI
          const serverName = outbound.sni || outbound.server;
          fixedOutbound.tls = {
            enabled: true,
            server_name: serverName,
            insecure: outbound.allowInsecure ?? true, // 默认允许不安全证书
          };
          console.log(`启用 TLS，SNI 设置为: ${serverName}`);
        } else {
          console.log(`未知协议类型: ${outbound.type}`);
        }
        
        console.log(`最终出站配置:`, fixedOutbound);
        return fixedOutbound;
      });
      
      // 过滤掉无效的outbound并检查重复标签
      console.log(`=== 过滤和验证出站配置 ===`);
      const validOutbounds = fixedOutbounds.filter((outbound: any) => outbound !== null);
      console.log(`有效出站配置数量: ${validOutbounds.length}`);
      
      const existingTags = new Set(singboxConfig.outbounds.map((o: any) => o.tag));
      console.log(`现有标签:`, Array.from(existingTags));
      
      const uniqueOutbounds = validOutbounds.filter((outbound: any) => {
        if (existingTags.has(outbound.tag)) {
          console.warn(`跳过重复的出站标签: ${outbound.tag}`);
          return false;
        }
        existingTags.add(outbound.tag);
        console.log(`添加出站标签: ${outbound.tag}`);
        return true;
      });
      
      console.log(`唯一出站配置数量: ${uniqueOutbounds.length}`);
      
      // 只有当有有效的用户配置时才添加到 outbounds
      if (uniqueOutbounds.length > 0) {
        console.log(`=== 添加用户出站配置 ===`);
        console.log(`添加的出站配置:`, uniqueOutbounds);
        singboxConfig.outbounds.unshift(...uniqueOutbounds);
        // 将 final 改为第一个用户配置的 tag
        const finalTag = uniqueOutbounds[0].tag;
        console.log(`设置最终路由标签: ${finalTag}`);
        singboxConfig.route.final = finalTag;
      } else {
        console.log(`没有有效的用户出站配置`);
      }
    }

    // 添加调试日志
    console.log(`=== Sing-box 配置转换完成 ===`);
    console.log(`最终配置:`, JSON.stringify(singboxConfig, null, 2));
    console.log(`配置大小: ${JSON.stringify(singboxConfig).length} 字符`);
    
    // 分析路由规则
    console.log(`=== 路由规则分析 ===`);
    console.log(`路由规则数量: ${singboxConfig.route.rules.length}`);
    singboxConfig.route.rules.forEach((rule: any, index: number) => {
      console.log(`规则 ${index + 1}:`, rule);
    });
    console.log(`最终路由: ${singboxConfig.route.final}`);
    console.log(`出站配置数量: ${singboxConfig.outbounds.length}`);
    singboxConfig.outbounds.forEach((outbound: any, index: number) => {
      console.log(`出站 ${index + 1}: ${outbound.tag} (${outbound.type})`);
    });

    return singboxConfig;
  }

  /**
   * 转换为Xray配置格式
   */
  private convertToXrayConfig(config: ProxyConfig, networkSettings?: AppSettings): any {
    // 基础Xray配置结构
    const xrayConfig: any = {
      log: {
        loglevel: networkSettings?.logLevel || 'info',
        access: networkSettings?.enableLog ? networkSettings.logFile || 'chongdong.log' : undefined
      },
      dns: networkSettings?.enableDns ? {
        servers: [
          networkSettings.dnsServer || '8.8.8.8',
          ...(networkSettings.enableDoh ? [networkSettings.dohServer || 'https://dns.google/dns-query'] : [])
        ],
        queryStrategy: 'UseIP'
      } : undefined,
      inbounds: [
        {
          port: 1080,
          protocol: "socks",
          settings: {
            auth: "noauth",
            udp: networkSettings?.enableUdp !== false
          }
        },
        {
          port: 8080,
          protocol: "http"
        }
      ],
      outbounds: [
        {
          protocol: "freedom",
          tag: "direct"
        }
      ],
      routing: {
        rules: [
          {
            type: "field",
            ip: [
              "geoip:private"
            ],
            outboundTag: "direct"
          },
          {
            type: "field",
            ip: [
              "geoip:cn"
            ],
            outboundTag: "direct"
          }
        ]
      }
    };

    // 根据具体配置添加代理出站
    if (config.config.outbounds) {
      xrayConfig.outbounds.unshift(...config.config.outbounds);
    }

    return xrayConfig;
  }

  /**
   * 转换为Clash配置格式
   */
  private convertToClashConfig(config: ProxyConfig, networkSettings?: AppSettings): any {
    const clashConfig: any = {
      port: 7890,
      'socks-port': 7891,
      'mixed-port': 7890,
      'allow-lan': false,
      mode: 'rule',
      'log-level': networkSettings?.logLevel || 'info',
      'external-controller': '127.0.0.1:9090',
      'external-ui': '',
      'secret': '',
      dns: networkSettings?.enableDns ? {
        enable: true,
        listen: '0.0.0.0:53',
        'default-nameserver': ['8.8.8.8', '8.8.4.4'],
        nameserver: networkSettings?.dnsServers || ['8.8.8.8', '8.8.4.4'],
        'enhanced-mode': networkSettings?.enableFakeIp ? 'fake-ip' : 'redir-host',
        'fake-ip-range': networkSettings?.fakeIpRange || '198.18.0.1/16',
        'fake-ip-filter': [
          '*.lan',
          'localhost.ptlogin2.qq.com',
          '+.srv.nintendo.net',
          '+.stun.playstation.net',
          '+.msftconnecttest.com',
          '+.battlenet.com.cn',
          '+.battlenet.com',
          '+.battlenet.blizzard.com',
          'lens.l.google.com',
          'stun.*.*',
          'stun.*.*.*',
          '+.stun.playstation.net',
          '+.msftconnecttest.com',
          '+.xboxlive.com',
          'msftconnecttest.com',
          'xbox.*.microsoft.com',
          '*.battlenet.com.cn',
          '*.battlenet.com',
          '*.blizzard.com'
        ],
        'fallback': networkSettings?.enableDnsFallback ? networkSettings.dnsFallbackServers : [],
        'fallback-filter': {
          'geoip': true,
          'ipcidr': [
            '240.0.0.0/4',
            '0.0.0.0/32'
          ]
        }
      } : {
        enable: false
      },
      proxies: [],
      'proxy-groups': [],
      rules: [
        'DOMAIN-SUFFIX,google.com,DIRECT',
        'DOMAIN-SUFFIX,facebook.com,DIRECT',
        'DOMAIN-SUFFIX,youtube.com,DIRECT',
        'DOMAIN-SUFFIX,twitter.com,DIRECT',
        'DOMAIN-SUFFIX,instagram.com,DIRECT',
        'GEOIP,CN,DIRECT',
        'MATCH,PROXY'
      ]
    };

    // 转换代理服务器
    if (config.config.proxies) {
      clashConfig.proxies = config.config.proxies;
    }

    // 转换代理组
    if (config.config['proxy-groups']) {
      clashConfig['proxy-groups'] = config.config['proxy-groups'];
    }

    return clashConfig;
  }

  // DNS功能已分离到独立的DNS管理器中
  // 不再需要buildDnsServers方法

  // DNS功能已分离到独立的DNS管理器中
  // 不再需要buildClashDnsServers方法

  // DNS功能已分离到独立的DNS管理器中
  // 不再需要buildDnsRules方法

  /**
   * 开始状态监控
   */
  private startStatusMonitoring(): void {
    // 每5秒更新一次状态
    setInterval(async () => {
      if (this.status.running) {
        try {
          const stats = await this.getStats();
          this.status.connections = stats.activeConnections || 0;
          this.status.upload = stats.totalUpload || 0;
          this.status.download = stats.totalDownload || 0;
          this.notifyStatusChange();
        } catch (error) {
          console.error('Failed to update status:', error);
          // 如果获取状态失败，可能代理已经停止
          this.status.running = false;
          this.status.error = '状态更新失败';
          this.notifyStatusChange();
        }
      }
    }, 5000);
  }
}

export const proxyEngine = ProxyEngine.getInstance();
