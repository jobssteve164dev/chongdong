import { AppState, ApiResponse, ProxyServer, ProxyGroup, Subscription } from '../../shared/types';
import { logger } from './logger';
import { ConfigValidator } from './configValidator';

/**
 * 配置导入工具类
 * 支持多种格式的配置导入功能
 */
export class ConfigImporter {
  /**
   * 支持的导入格式
   */
  static readonly IMPORT_FORMATS = {
    JSON: 'json',
    YAML: 'yaml',
    CLASH: 'clash',
    V2RAY: 'v2ray',
    SINGBOX: 'singbox',
    SUBSCRIPTION: 'subscription'
  } as const;

  /**
   * 从JSON字符串导入配置
   */
  static importFromJson(jsonString: string, mergeMode: boolean = false): ApiResponse<AppState> {
    try {
      let parsedData: any;
      
      try {
        parsedData = JSON.parse(jsonString);
      } catch (parseError) {
        return {
          success: false,
          error: 'JSON解析失败',
          message: '文件格式不是有效的JSON'
        };
      }

      // 检查是否是带元数据的格式
      let configData: any;
      if (parsedData.metadata && parsedData.config) {
        configData = parsedData.config;
      } else {
        configData = parsedData;
      }

      // 验证配置数据
      const validationResult = ConfigValidator.validateAppState(configData);
      if (!validationResult.success) {
        return {
          success: false,
          error: '配置验证失败',
          message: validationResult.message
        };
      }

      const importedConfig = this.normalizeConfig(configData);
      
      return {
        success: true,
        data: importedConfig,
        message: '配置导入成功'
      };
    } catch (error) {
      logger.error('JSON导入失败:', error);
      return {
        success: false,
        error: 'JSON导入失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 从YAML字符串导入配置
   */
  static importFromYaml(yamlString: string, mergeMode: boolean = false): ApiResponse<AppState> {
    try {
      // 这里需要YAML解析库，暂时使用简单的解析
      // 在实际项目中应该使用 js-yaml 或其他YAML解析库
      const parsedData = this.parseYaml(yamlString);
      
      if (!parsedData) {
        return {
          success: false,
          error: 'YAML解析失败',
          message: '文件格式不是有效的YAML'
        };
      }

      // 检查是否是带元数据的格式
      let configData: any;
      if (parsedData.metadata && parsedData.config) {
        configData = parsedData.config;
      } else {
        configData = parsedData;
      }

      // 验证配置数据
      const validationResult = ConfigValidator.validateAppState(configData);
      if (!validationResult.success) {
        return {
          success: false,
          error: '配置验证失败',
          message: validationResult.message
        };
      }

      const importedConfig = this.normalizeConfig(configData);
      
      return {
        success: true,
        data: importedConfig,
        message: '配置导入成功'
      };
    } catch (error) {
      logger.error('YAML导入失败:', error);
      return {
        success: false,
        error: 'YAML导入失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 从Clash配置导入
   */
  static importFromClash(clashConfig: string): ApiResponse<AppState> {
    try {
      const parsedData = this.parseYaml(clashConfig);
      
      if (!parsedData) {
        return {
          success: false,
          error: 'Clash配置解析失败',
          message: '文件格式不是有效的YAML'
        };
      }

      const convertedConfig = this.convertFromClashFormat(parsedData);
      
      // 验证转换后的配置
      const validationResult = ConfigValidator.validateAppState(convertedConfig);
      if (!validationResult.success) {
        return {
          success: false,
          error: '配置验证失败',
          message: validationResult.message
        };
      }

      const importedConfig = this.normalizeConfig(convertedConfig);
      
      return {
        success: true,
        data: importedConfig,
        message: 'Clash配置导入成功'
      };
    } catch (error) {
      logger.error('Clash导入失败:', error);
      return {
        success: false,
        error: 'Clash导入失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 从V2Ray配置导入
   */
  static importFromV2Ray(v2rayConfig: string): ApiResponse<AppState> {
    try {
      let parsedData: any;
      
      try {
        parsedData = JSON.parse(v2rayConfig);
      } catch (parseError) {
        return {
          success: false,
          error: 'V2Ray配置解析失败',
          message: '文件格式不是有效的JSON'
        };
      }

      const convertedConfig = this.convertFromV2RayFormat(parsedData);
      
      // 验证转换后的配置
      const validationResult = ConfigValidator.validateAppState(convertedConfig);
      if (!validationResult.success) {
        return {
          success: false,
          error: '配置验证失败',
          message: validationResult.message
        };
      }

      const importedConfig = this.normalizeConfig(convertedConfig);
      
      return {
        success: true,
        data: importedConfig,
        message: 'V2Ray配置导入成功'
      };
    } catch (error) {
      logger.error('V2Ray导入失败:', error);
      return {
        success: false,
        error: 'V2Ray导入失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 从Sing-box配置导入
   */
  static importFromSingBox(singboxConfig: string): ApiResponse<AppState> {
    try {
      let parsedData: any;
      
      try {
        parsedData = JSON.parse(singboxConfig);
      } catch (parseError) {
        return {
          success: false,
          error: 'Sing-box配置解析失败',
          message: '文件格式不是有效的JSON'
        };
      }

      const convertedConfig = this.convertFromSingBoxFormat(parsedData);
      
      // 验证转换后的配置
      const validationResult = ConfigValidator.validateAppState(convertedConfig);
      if (!validationResult.success) {
        return {
          success: false,
          error: '配置验证失败',
          message: validationResult.message
        };
      }

      const importedConfig = this.normalizeConfig(convertedConfig);
      
      return {
        success: true,
        data: importedConfig,
        message: 'Sing-box配置导入成功'
      };
    } catch (error) {
      logger.error('Sing-box导入失败:', error);
      return {
        success: false,
        error: 'Sing-box导入失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 从订阅链接导入
   */
  static importFromSubscription(subscriptionUrl: string, name: string = 'Imported Subscription'): ApiResponse<Subscription> {
    try {
      // 验证URL格式
      if (!this.isValidUrl(subscriptionUrl)) {
        return {
          success: false,
          error: '订阅URL无效',
          message: '请提供有效的订阅链接'
        };
      }

      const subscription: Subscription = {
        id: this.generateId(),
        name: name,
        url: subscriptionUrl,
        enabled: true,
        autoUpdate: true,
        updateInterval: 3600, // 1小时
        servers: [],
        groups: []
      };

      // 验证订阅配置
      const validationResult = ConfigValidator.validateSubscription(subscription);
      if (!validationResult.success) {
        return {
          success: false,
          error: '订阅配置验证失败',
          message: validationResult.message
        };
      }

      return {
        success: true,
        data: subscription,
        message: '订阅导入成功'
      };
    } catch (error) {
      logger.error('订阅导入失败:', error);
      return {
        success: false,
        error: '订阅导入失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 检测文件格式
   */
  static detectFormat(content: string): string {
    try {
      // 尝试解析为JSON
      JSON.parse(content);
      return 'json';
    } catch {
      // 如果不是JSON，检查是否是YAML
      if (content.includes('port:') || content.includes('proxies:') || content.includes('proxy-groups:')) {
        return 'yaml';
      }
      return 'unknown';
    }
  }

  /**
   * 从Clash格式转换
   */
  private static convertFromClashFormat(clashConfig: any): Partial<AppState> {
    const convertedConfig: Partial<AppState> = {
      settings: {
        theme: 'auto',
        language: 'zh-CN',
        autoStart: false,
        systemProxy: true,
        proxyPort: clashConfig.port || 7890,
        socksPort: clashConfig['socks-port'] || 7891,
        mixedPort: clashConfig['mixed-port'] || 7890,
        allowLan: clashConfig['allow-lan'] || false,
        mode: clashConfig.mode || 'rule',
        logLevel: clashConfig['log-level'] || 'info',
        enableLog: true,
        logFile: 'chongdong.log',
        enableUdp: true,
        enableIpv6: false,
        enableTun: false,
        tunDevice: 'utun0',
        enableFakeIp: true,
        fakeIpRange: '198.18.0.1/16',
        enableDns: true,
        dnsServer: '8.8.8.8',
        enableDoh: false,
        dohServer: 'https://dns.google/dns-query'
      },
      preferences: {
        windowSize: { width: 1200, height: 800 },
        windowPosition: { x: 100, y: 100 },
        sidebarCollapsed: false,
        autoHideMenuBar: false,
        alwaysOnTop: false,
        minimizeToTray: true,
        startMinimized: false,
        enableNotifications: true,
        notificationSound: true,
        enableHotkeys: true,
        hotkeys: {
          toggleProxy: 'Ctrl+Shift+P',
          showMainWindow: 'Ctrl+Shift+M',
          quickSwitch: 'Ctrl+Shift+S'
        }
      },
      servers: [],
      groups: [],
      subscriptions: [],
      connection: {
        connected: false,
        upload: 0,
        download: 0,
        uploadSpeed: 0,
        downloadSpeed: 0
      },
      traffic: {
        upload: 0,
        download: 0,
        uploadSpeed: 0,
        downloadSpeed: 0,
        timestamp: Date.now()
      }
    };

    // 转换代理服务器
    if (clashConfig.proxies && Array.isArray(clashConfig.proxies)) {
      convertedConfig.servers = clashConfig.proxies.map((proxy: any) => 
        this.convertClashProxyToServer(proxy)
      ).filter(Boolean);
    }

    // 转换代理组
    if (clashConfig['proxy-groups'] && Array.isArray(clashConfig['proxy-groups'])) {
      convertedConfig.groups = clashConfig['proxy-groups'].map((group: any) => 
        this.convertClashGroupToGroup(group)
      ).filter(Boolean);
    }

    return convertedConfig;
  }

  /**
   * 转换Clash代理为服务器配置
   */
  private static convertClashProxyToServer(clashProxy: any): ProxyServer | null {
    try {
      const server: ProxyServer = {
        id: this.generateId(),
        name: clashProxy.name || 'Imported Server',
        protocol: clashProxy.type as any,
        host: clashProxy.server,
        port: clashProxy.port,
        enabled: true
      };

      // 根据协议类型设置特定字段
      switch (clashProxy.type) {
        case 'shadowsocks':
          server.encryption = clashProxy.cipher;
          server.password = clashProxy.password;
          break;
        case 'vmess':
        case 'vless':
          server.uuid = clashProxy.uuid;
          server.alterId = clashProxy.alterId;
          server.network = clashProxy.network;
          server.tls = clashProxy.tls;
          server.sni = clashProxy.servername;
          server.wsPath = clashProxy.path;
          server.wsHeaders = clashProxy.headers;
          break;
        case 'trojan':
          server.password = clashProxy.password;
          server.sni = clashProxy.sni;
          break;
      }

      return server;
    } catch (error) {
      logger.error('转换Clash代理失败:', error);
      return null;
    }
  }

  /**
   * 转换Clash组为代理组配置
   */
  private static convertClashGroupToGroup(clashGroup: any): ProxyGroup | null {
    try {
      const group: ProxyGroup = {
        id: this.generateId(),
        name: clashGroup.name || 'Imported Group',
        type: clashGroup.type,
        proxies: clashGroup.proxies || [],
        enabled: true
      };

      if (clashGroup.url) {
        group.url = clashGroup.url;
      }

      if (clashGroup.interval) {
        group.interval = clashGroup.interval;
      }

      return group;
    } catch (error) {
      logger.error('转换Clash组失败:', error);
      return null;
    }
  }

  /**
   * 从V2Ray格式转换
   */
  private static convertFromV2RayFormat(v2rayConfig: any): Partial<AppState> {
    const convertedConfig: Partial<AppState> = {
      settings: {
        theme: 'auto',
        language: 'zh-CN',
        autoStart: false,
        systemProxy: true,
        proxyPort: 7890,
        socksPort: 7891,
        mixedPort: 7890,
        allowLan: false,
        mode: 'rule',
        logLevel: v2rayConfig.log?.loglevel || 'info',
        enableLog: true,
        logFile: 'chongdong.log',
        enableUdp: true,
        enableIpv6: false,
        enableTun: false,
        tunDevice: 'utun0',
        enableFakeIp: true,
        fakeIpRange: '198.18.0.1/16',
        enableDns: true,
        dnsServer: '8.8.8.8',
        enableDoh: false,
        dohServer: 'https://dns.google/dns-query'
      },
      preferences: {
        windowSize: { width: 1200, height: 800 },
        windowPosition: { x: 100, y: 100 },
        sidebarCollapsed: false,
        autoHideMenuBar: false,
        alwaysOnTop: false,
        minimizeToTray: true,
        startMinimized: false,
        enableNotifications: true,
        notificationSound: true,
        enableHotkeys: true,
        hotkeys: {
          toggleProxy: 'Ctrl+Shift+P',
          showMainWindow: 'Ctrl+Shift+M',
          quickSwitch: 'Ctrl+Shift+S'
        }
      },
      servers: [],
      groups: [],
      subscriptions: [],
      connection: {
        connected: false,
        upload: 0,
        download: 0,
        uploadSpeed: 0,
        downloadSpeed: 0
      },
      traffic: {
        upload: 0,
        download: 0,
        uploadSpeed: 0,
        downloadSpeed: 0,
        timestamp: Date.now()
      }
    };

    // 转换出站代理
    if (v2rayConfig.outbounds && Array.isArray(v2rayConfig.outbounds)) {
      convertedConfig.servers = v2rayConfig.outbounds
        .filter((outbound: any) => outbound.protocol && outbound.protocol !== 'freedom' && outbound.protocol !== 'blackhole')
        .map((outbound: any) => this.convertV2RayOutboundToServer(outbound))
        .filter(Boolean);
    }

    return convertedConfig;
  }

  /**
   * 转换V2Ray出站为服务器配置
   */
  private static convertV2RayOutboundToServer(outbound: any): ProxyServer | null {
    try {
      const server: ProxyServer = {
        id: this.generateId(),
        name: outbound.tag || 'Imported V2Ray Server',
        protocol: outbound.protocol as any,
        host: '',
        port: 0,
        enabled: true
      };

      // 根据协议类型提取配置
      switch (outbound.protocol) {
        case 'vmess':
          if (outbound.settings?.vnext?.[0]) {
            const vnext = outbound.settings.vnext[0];
            server.host = vnext.address;
            server.port = vnext.port;
            if (vnext.users?.[0]) {
              server.uuid = vnext.users[0].id;
              server.alterId = vnext.users[0].alterId;
            }
          }
          if (outbound.streamSettings) {
            server.network = outbound.streamSettings.network;
            server.tls = outbound.streamSettings.security === 'tls';
            if (outbound.streamSettings.tlsSettings) {
              server.sni = outbound.streamSettings.tlsSettings.serverName;
            }
            if (outbound.streamSettings.wsSettings) {
              server.wsPath = outbound.streamSettings.wsSettings.path;
              server.wsHeaders = outbound.streamSettings.wsSettings.headers;
            }
          }
          break;
      }

      return server;
    } catch (error) {
      logger.error('转换V2Ray出站失败:', error);
      return null;
    }
  }

  /**
   * 从Sing-box格式转换
   */
  private static convertFromSingBoxFormat(singboxConfig: any): Partial<AppState> {
    const convertedConfig: Partial<AppState> = {
      settings: {
        theme: 'auto',
        language: 'zh-CN',
        autoStart: false,
        systemProxy: true,
        proxyPort: 7890,
        socksPort: 7891,
        mixedPort: singboxConfig.inbounds?.[0]?.listen_port || 7890,
        allowLan: false,
        mode: 'rule',
        logLevel: singboxConfig.log?.level || 'info',
        enableLog: true,
        logFile: 'chongdong.log',
        enableUdp: true,
        enableIpv6: false,
        enableTun: false,
        tunDevice: 'utun0',
        enableFakeIp: true,
        fakeIpRange: '198.18.0.1/16',
        enableDns: true,
        dnsServer: '8.8.8.8',
        enableDoh: false,
        dohServer: 'https://dns.google/dns-query'
      },
      preferences: {
        windowSize: { width: 1200, height: 800 },
        windowPosition: { x: 100, y: 100 },
        sidebarCollapsed: false,
        autoHideMenuBar: false,
        alwaysOnTop: false,
        minimizeToTray: true,
        startMinimized: false,
        enableNotifications: true,
        notificationSound: true,
        enableHotkeys: true,
        hotkeys: {
          toggleProxy: 'Ctrl+Shift+P',
          showMainWindow: 'Ctrl+Shift+M',
          quickSwitch: 'Ctrl+Shift+S'
        }
      },
      servers: [],
      groups: [],
      subscriptions: [],
      connection: {
        connected: false,
        upload: 0,
        download: 0,
        uploadSpeed: 0,
        downloadSpeed: 0
      },
      traffic: {
        upload: 0,
        download: 0,
        uploadSpeed: 0,
        downloadSpeed: 0,
        timestamp: Date.now()
      }
    };

    // 转换出站代理
    if (singboxConfig.outbounds && Array.isArray(singboxConfig.outbounds)) {
      convertedConfig.servers = singboxConfig.outbounds
        .filter((outbound: any) => outbound.type && outbound.type !== 'direct' && outbound.type !== 'block')
        .map((outbound: any) => this.convertSingBoxOutboundToServer(outbound))
        .filter(Boolean);
    }

    return convertedConfig;
  }

  /**
   * 转换Sing-box出站为服务器配置
   */
  private static convertSingBoxOutboundToServer(outbound: any): ProxyServer | null {
    try {
      const server: ProxyServer = {
        id: this.generateId(),
        name: outbound.tag || 'Imported Sing-box Server',
        protocol: outbound.type as any,
        host: outbound.server,
        port: outbound.server_port,
        enabled: true
      };

      // 根据协议类型提取配置
      switch (outbound.type) {
        case 'vmess':
          server.uuid = outbound.uuid;
          server.alterId = outbound.alter_id;
          if (outbound.transport) {
            server.network = outbound.transport.type;
            server.wsPath = outbound.transport.path;
            server.wsHeaders = outbound.transport.headers;
          }
          if (outbound.tls) {
            server.tls = outbound.tls.enabled;
            server.sni = outbound.tls.server_name;
          }
          break;
      }

      return server;
    } catch (error) {
      logger.error('转换Sing-box出站失败:', error);
      return null;
    }
  }

  /**
   * 标准化配置数据
   */
  private static normalizeConfig(config: any): AppState {
    // 确保所有必需的字段都存在
    const normalizedConfig: AppState = {
      settings: {
        theme: 'auto',
        language: 'zh-CN',
        autoStart: false,
        systemProxy: true,
        proxyPort: 7890,
        socksPort: 7891,
        mixedPort: 7890,
        allowLan: false,
        mode: 'rule',
        logLevel: 'info',
        enableLog: true,
        logFile: 'chongdong.log',
        enableUdp: true,
        enableIpv6: false,
        enableTun: false,
        tunDevice: 'utun0',
        enableFakeIp: true,
        fakeIpRange: '198.18.0.1/16',
        enableDns: true,
        dnsServer: '8.8.8.8',
        enableDoh: false,
        dohServer: 'https://dns.google/dns-query',
        ...config.settings
      },
      preferences: {
        windowSize: { width: 1200, height: 800 },
        windowPosition: { x: 100, y: 100 },
        sidebarCollapsed: false,
        autoHideMenuBar: false,
        alwaysOnTop: false,
        minimizeToTray: true,
        startMinimized: false,
        enableNotifications: true,
        notificationSound: true,
        enableHotkeys: true,
        hotkeys: {
          toggleProxy: 'Ctrl+Shift+P',
          showMainWindow: 'Ctrl+Shift+M',
          quickSwitch: 'Ctrl+Shift+S'
        },
        ...config.preferences
      },
      subscriptions: config.subscriptions || [],
      servers: config.servers || [],
      groups: config.groups || [],
      connection: {
        connected: false,
        upload: 0,
        download: 0,
        uploadSpeed: 0,
        downloadSpeed: 0,
        ...config.connection
      },
      traffic: {
        upload: 0,
        download: 0,
        uploadSpeed: 0,
        downloadSpeed: 0,
        timestamp: Date.now(),
        ...config.traffic
      }
    };

    return normalizedConfig;
  }

  /**
   * 简单的YAML解析（实际项目中应使用专门的YAML库）
   */
  private static parseYaml(yamlString: string): any {
    // 这是一个简化的YAML解析器，实际项目中应该使用 js-yaml 等专业库
    try {
      // 简单的键值对解析
      const lines = yamlString.split('\n');
      const result: any = {};
      let currentKey = '';
      let currentValue: any = null;
      let indentLevel = 0;

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;

        const colonIndex = trimmedLine.indexOf(':');
        if (colonIndex > 0) {
          const key = trimmedLine.substring(0, colonIndex).trim();
          const value = trimmedLine.substring(colonIndex + 1).trim();
          
          if (value) {
            result[key] = this.parseYamlValue(value);
          } else {
            currentKey = key;
            currentValue = {};
          }
        }
      }

      return result;
    } catch (error) {
      logger.error('YAML解析失败:', error);
      return null;
    }
  }

  /**
   * 解析YAML值
   */
  private static parseYamlValue(value: string): any {
    // 尝试解析为数字
    if (!isNaN(Number(value))) {
      return Number(value);
    }
    
    // 尝试解析为布尔值
    if (value === 'true' || value === 'false') {
      return value === 'true';
    }
    
    // 尝试解析为数组
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    
    // 尝试解析为对象
    if (value.startsWith('{') && value.endsWith('}')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    
    // 默认作为字符串
    return value;
  }

  /**
   * 验证URL格式
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 生成唯一ID
   */
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
