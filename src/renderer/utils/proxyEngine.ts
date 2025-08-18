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
  private currentConfig: ProxyConfig | null = null;
  private status: ProxyStatus = {
    running: false,
    uptime: 0,
    connections: 0,
    upload: 0,
    download: 0
  };

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
  public async start(config: ProxyConfig, networkSettings?: NetworkSettings): Promise<void> {
    try {
      this.currentConfig = config;
      
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
      this.currentConfig = null;
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
  private async startSingbox(config: ProxyConfig, networkSettings?: NetworkSettings): Promise<void> {
    const singboxConfig = this.convertToSingboxConfig(config, networkSettings);
    
    // 通过IPC调用主进程启动Sing-box
    await window.electron.ipcRenderer.invoke('proxy:startSingbox', singboxConfig);
  }

  /**
   * 启动Xray引擎
   */
  private async startXray(config: ProxyConfig, networkSettings?: NetworkSettings): Promise<void> {
    const xrayConfig = this.convertToXrayConfig(config, networkSettings);
    
    // 通过IPC调用主进程启动Xray
    await window.electron.ipcRenderer.invoke('proxy:startXray', xrayConfig);
  }

  /**
   * 启动Clash引擎
   */
  private async startClash(config: ProxyConfig, networkSettings?: NetworkSettings): Promise<void> {
    const clashConfig = this.convertToClashConfig(config, networkSettings);
    
    // 通过IPC调用主进程启动Clash
    await window.electron.ipcRenderer.invoke('proxy:startClash', clashConfig);
  }

  /**
   * 转换为Sing-box配置格式
   */
  private convertToSingboxConfig(config: ProxyConfig, networkSettings?: NetworkSettings): any {
    // 基础Sing-box配置结构
    const singboxConfig: any = {
      log: {
        level: networkSettings?.logLevel || 'info',
        output: networkSettings?.enableLog ? networkSettings.logFile || 'chongdong.log' : 'console'
      },
      dns: networkSettings?.enableDns ? {
        servers: [
          {
            tag: 'default',
            address: networkSettings.dnsServer || '8.8.8.8',
            detour: 'direct'
          },
          ...(networkSettings.enableDoh ? [{
            tag: 'doh',
            address: networkSettings.dohServer || 'https://dns.google/dns-query',
            detour: 'direct'
          }] : [])
        ],
        rules: [
          {
            outbound: 'dns'
          }
        ],
        final: 'default'
      } : undefined,
      inbounds: [
        {
          type: 'tun',
          tag: 'tun-in',
          interface_name: networkSettings?.tunDevice || 'utun0',
          mtu: 9000,
          stack: 'system',
          auto_route: true,
          inet4_address: networkSettings?.enableFakeIp ? [networkSettings.fakeIpRange || '198.18.0.1/16'] : ['172.19.0.1/28'],
          inet6_address: networkSettings?.enableIpv6 ? ['fdfe:dcba:9876::1/126'] : undefined,
          ...(networkSettings?.enableTun ? {} : { disabled: true })
        },
        {
          type: 'socks',
          tag: 'socks-in',
          listen: '127.0.0.1',
          listen_port: 1080,
          users: []
        },
        {
          type: 'http',
          tag: 'http-in',
          listen: '127.0.0.1',
          listen_port: 8080
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
      // 修复网络类型
      const fixedOutbounds = config.config.outbounds.map((outbound: any) => {
        if (outbound.network === 'ws') {
          // 在 Sing-box 中，WebSocket 使用 transport 字段
          const fixedOutbound = { ...outbound };
          delete fixedOutbound.network;
          delete fixedOutbound.ws_opts;
          fixedOutbound.transport = {
            type: "ws",
            path: outbound.ws_opts?.path || "/",
            headers: outbound.ws_opts?.headers || {}
          };
          return fixedOutbound;
        }
        return outbound;
      });
      
      singboxConfig.outbounds.unshift(...fixedOutbounds);
      // 如果有代理出站，将 final 改为第一个代理出站的 tag
      if (fixedOutbounds.length > 0 && fixedOutbounds[0].tag) {
        singboxConfig.route.final = fixedOutbounds[0].tag;
      }
    }

    return singboxConfig;
  }

  /**
   * 转换为Xray配置格式
   */
  private convertToXrayConfig(config: ProxyConfig, networkSettings?: NetworkSettings): any {
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
  private convertToClashConfig(config: ProxyConfig, networkSettings?: NetworkSettings): any {
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
        } catch (error) {
          console.error('Failed to update status:', error);
          // 如果获取状态失败，可能代理已经停止
          this.status.running = false;
          this.status.error = '状态更新失败';
        }
      }
    }, 5000);
  }
}

export const proxyEngine = ProxyEngine.getInstance();
