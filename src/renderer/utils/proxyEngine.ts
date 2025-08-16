import { ipcRenderer } from 'electron';

export interface ProxyConfig {
  id: string;
  name: string;
  type: 'singbox' | 'xray' | 'clash';
  config: any;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  public async start(config: ProxyConfig): Promise<void> {
    try {
      this.currentConfig = config;
      
      // 根据配置类型选择引擎
      switch (config.type) {
        case 'singbox':
          await this.startSingbox(config);
          break;
        case 'xray':
          await this.startXray(config);
          break;
        case 'clash':
          await this.startClash(config);
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
   * 获取当前状态
   */
  public getStatus(): ProxyStatus {
    return { ...this.status };
  }

  /**
   * 获取统计信息
   */
  public async getStats(): Promise<ProxyStats> {
    try {
      return await ipcRenderer.invoke('proxy:getStats');
    } catch (error) {
      throw new Error(`Failed to get stats: ${error}`);
    }
  }

  /**
   * 启动Sing-box引擎
   */
  private async startSingbox(config: ProxyConfig): Promise<void> {
    const singboxConfig = this.convertToSingboxConfig(config);
    await ipcRenderer.invoke('proxy:startSingbox', singboxConfig);
  }

  /**
   * 启动Xray引擎
   */
  private async startXray(config: ProxyConfig): Promise<void> {
    const xrayConfig = this.convertToXrayConfig(config);
    await ipcRenderer.invoke('proxy:startXray', xrayConfig);
  }

  /**
   * 启动Clash引擎
   */
  private async startClash(config: ProxyConfig): Promise<void> {
    const clashConfig = this.convertToClashConfig(config);
    await ipcRenderer.invoke('proxy:startClash', clashConfig);
  }

  /**
   * 转换为Sing-box配置格式
   */
  private convertToSingboxConfig(config: ProxyConfig): any {
    // 基础Sing-box配置结构
    const singboxConfig = {
      log: {
        level: "info",
        output: "stdout"
      },
      inbounds: [
        {
          type: "mixed",
          tag: "mixed-in",
          listen: "127.0.0.1",
          listen_port: 7890
        }
      ],
      outbounds: [
        {
          type: "direct",
          tag: "direct"
        },
        {
          type: "block",
          tag: "block"
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
        final: "proxy"
      }
    };

    // 根据具体配置添加代理出站
    if (config.config.outbounds) {
      singboxConfig.outbounds.unshift(...config.config.outbounds);
    }

    return singboxConfig;
  }

  /**
   * 转换为Xray配置格式
   */
  private convertToXrayConfig(config: ProxyConfig): any {
    // 基础Xray配置结构
    const xrayConfig = {
      log: {
        loglevel: "info"
      },
      inbounds: [
        {
          port: 1080,
          protocol: "socks",
          settings: {
            auth: "noauth",
            udp: true
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
  private convertToClashConfig(config: ProxyConfig): any {
    // 基础Clash配置结构
    const clashConfig = {
      port: 7890,
      "socks-port": 7891,
      "mixed-port": 7892,
      "allow-lan": false,
      mode: "rule",
      "log-level": "info",
      "external-controller": "127.0.0.1:9090",
      proxies: [],
      "proxy-groups": [
        {
          name: "Proxy",
          type: "select",
          proxies: ["DIRECT"]
        }
      ],
      rules: [
        "DOMAIN-SUFFIX,cn,DIRECT",
        "GEOIP,CN,DIRECT",
        "MATCH,Proxy"
      ]
    };

    // 根据具体配置添加代理
    if (config.config.proxies) {
      clashConfig.proxies = config.config.proxies;
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
          this.status.connections = stats.activeConnections;
          this.status.upload = stats.totalUpload;
          this.status.download = stats.totalDownload;
        } catch (error) {
          console.error('Failed to update status:', error);
        }
      }
    }, 5000);
  }
}

export const proxyEngine = ProxyEngine.getInstance();
