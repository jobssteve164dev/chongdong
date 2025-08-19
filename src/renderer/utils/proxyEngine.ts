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
  public async startWithNode(node: ProxyNode, settings: AppSettings): Promise<void> {
    try {
      const engineType = settings.proxyEngine || 'singbox';
      
      const proxyConfig: ProxyConfig = {
        id: node.id,
        name: node.name,
        type: engineType,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        config: { outbounds: [{...node}] } // 简化转换
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
      
      this.startStatusMonitoring();
      this.notifyStatusChange();
      
    } catch (error) {
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
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
    // 基础Sing-box配置结构
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
      dns: {
        servers: [
          {
            tag: 'default',
            address: '8.8.8.8',
            detour: 'direct'
          }
        ],
        final: 'default'
      },
      inbounds: [
        // 只在启用 TUN 时添加 TUN inbound
        ...(networkSettings?.enableTun ? [{
          type: 'tun',
          tag: 'tun-in',
          interface_name: networkSettings?.tunDevice || 'utun0',
          mtu: 9000,
          stack: 'system',
          auto_route: true,
          inet4_address: networkSettings?.enableFakeIp ? [networkSettings.fakeIpRange || '198.18.0.1/16'] : ['172.19.0.1/28'],
          inet6_address: networkSettings?.enableIpv6 ? ['fdfe:dcba:9876::1/126'] : undefined
        }] : []),
        {
          type: 'socks',
          tag: 'socks-in',
          listen: '127.0.0.1',
          listen_port: networkSettings?.socksPort || 7891,
          users: []
        },
        {
          type: 'http',
          tag: 'http-in',
          listen: '127.0.0.1',
          listen_port: networkSettings?.proxyPort || 7890
        }
      ],
      outbounds: [
        {
          type: 'direct',
          tag: 'direct'
        },
        {
          type: 'dns',
          tag: 'dns'
        }
      ],
      route: {
        rules: [
          {
            geoip: "private",
            outbound: "direct"
          },
          {
            geoip: "cn",
            outbound: "direct"
          }
        ],
        final: "direct"
      }
    };

    // 根据具体配置添加代理出站
    if (config.config.outbounds) {
      // 修复网络类型和字段名
      const fixedOutbounds = config.config.outbounds.map((outbound: any) => {
        // 只保留 Sing-box 需要的字段
        const fixedOutbound: any = {
          type: outbound.type,
          tag: outbound.name || `proxy-${outbound.id || Date.now()}`,
          server: outbound.server,
          server_port: outbound.port
        };
        
        // 确保所有必需字段都有值
        if (!fixedOutbound.server || !fixedOutbound.server_port) {
          console.warn('跳过无效的outbound配置:', outbound);
          return null;
        }
        
        // 根据协议类型添加特定字段
        if (outbound.type === 'vmess') {
          fixedOutbound.uuid = outbound.uuid;
          fixedOutbound.security = outbound.security || 'auto';
          
          // 处理传输配置
          if (outbound.network === 'ws') {
            fixedOutbound.transport = {
              type: "ws",
              path: outbound.wsPath || "/",
              headers: outbound.wsHeaders || {}
            };
          }
          // 对于 tcp 连接，不需要设置 transport 字段，Sing-box 默认使用 tcp
        } else if (outbound.type === 'shadowsocks') {
          fixedOutbound.method = outbound.method;
          fixedOutbound.password = outbound.password;
        } else if (outbound.type === 'trojan') {
          fixedOutbound.password = outbound.password;
          if (outbound.tls) {
            fixedOutbound.tls = {
              enabled: true,
              server_name: outbound.server
            };
          }
        }
        
        return fixedOutbound;
      });
      
      // 过滤掉无效的outbound并检查重复标签
      const validOutbounds = fixedOutbounds.filter((outbound: any) => outbound !== null);
      const existingTags = new Set(singboxConfig.outbounds.map((o: any) => o.tag));
      const uniqueOutbounds = validOutbounds.filter((outbound: any) => {
        if (existingTags.has(outbound.tag)) {
          console.warn(`跳过重复的 outbound 标签: ${outbound.tag}`);
          return false;
        }
        existingTags.add(outbound.tag);
        return true;
      });
      
      // 只有当有有效的用户配置时才添加到 outbounds
      if (uniqueOutbounds.length > 0) {
        singboxConfig.outbounds.unshift(...uniqueOutbounds);
        // 将 final 改为第一个用户配置的 tag
        singboxConfig.route.final = uniqueOutbounds[0].tag;
      }
    }

    // 添加调试日志
    console.log('Generated Sing-box config:', JSON.stringify(singboxConfig, null, 2));

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
        nameserver: [networkSettings.dnsServer || '8.8.8.8'],
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
        ]
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
