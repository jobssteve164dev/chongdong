import { AppState, ApiResponse, FileInfo } from '../../shared/types';
import { log } from './logger';
import { ConfigValidator } from './configValidator';

/**
 * 配置导出工具类
 * 支持多种格式的配置导出功能
 */
export class ConfigExporter {
  /**
   * 导出格式枚举
   */
  static readonly EXPORT_FORMATS = {
    JSON: 'json',
    YAML: 'yaml',
    CLASH: 'clash',
    V2RAY: 'v2ray',
    SINGBOX: 'singbox'
  } as const;

  /**
   * 导出配置为JSON格式
   */
  static exportToJson(config: AppState, includeMetadata: boolean = true): ApiResponse<string> {
    try {
      // 验证配置
      const validationResult = ConfigValidator.validateAppState(config);
      if (!validationResult.success) {
        return {
          success: false,
          error: '配置验证失败',
          message: validationResult.message
        };
      }

      const exportData = includeMetadata ? {
        metadata: {
          version: '1.0.0',
          exportTime: new Date().toISOString(),
          appName: 'ChongDong Proxy Client',
          description: 'ChongDong代理客户端配置文件'
        },
        config: config
      } : config;

      const jsonString = JSON.stringify(exportData, null, 2);
      
      return {
        success: true,
        data: jsonString,
        message: '配置导出成功'
      };
    } catch (error) {
      log.error('JSON导出失败:', error);
      return {
        success: false,
        error: 'JSON导出失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 导出配置为YAML格式
   */
  static exportToYaml(config: AppState, includeMetadata: boolean = true): ApiResponse<string> {
    try {
      // 验证配置
      const validationResult = ConfigValidator.validateAppState(config);
      if (!validationResult.success) {
        return {
          success: false,
          error: '配置验证失败',
          message: validationResult.message
        };
      }

      const exportData = includeMetadata ? {
        metadata: {
          version: '1.0.0',
          exportTime: new Date().toISOString(),
          appName: 'ChongDong Proxy Client',
          description: 'ChongDong代理客户端配置文件'
        },
        config: config
      } : config;

      const yamlString = this.objectToYaml(exportData);
      
      return {
        success: true,
        data: yamlString,
        message: '配置导出成功'
      };
    } catch (error) {
      log.error('YAML导出失败:', error);
      return {
        success: false,
        error: 'YAML导出失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 导出配置为Clash格式
   */
  static exportToClash(config: AppState): ApiResponse<string> {
    try {
      // 验证配置
      const validationResult = ConfigValidator.validateAppState(config);
      if (!validationResult.success) {
        return {
          success: false,
          error: '配置验证失败',
          message: validationResult.message
        };
      }

      const clashConfig = this.convertToClashFormat(config);
      const yamlString = this.objectToYaml(clashConfig);
      
      return {
        success: true,
        data: yamlString,
        message: 'Clash配置导出成功'
      };
    } catch (error) {
      log.error('Clash导出失败:', error);
      return {
        success: false,
        error: 'Clash导出失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 导出配置为V2Ray格式
   */
  static exportToV2Ray(config: AppState): ApiResponse<string> {
    try {
      // 验证配置
      const validationResult = ConfigValidator.validateAppState(config);
      if (!validationResult.success) {
        return {
          success: false,
          error: '配置验证失败',
          message: validationResult.message
        };
      }

      const v2rayConfig = this.convertToV2RayFormat(config);
      const jsonString = JSON.stringify(v2rayConfig, null, 2);
      
      return {
        success: true,
        data: jsonString,
        message: 'V2Ray配置导出成功'
      };
    } catch (error) {
      log.error('V2Ray导出失败:', error);
      return {
        success: false,
        error: 'V2Ray导出失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 导出配置为Sing-box格式
   */
  static exportToSingBox(config: AppState): ApiResponse<string> {
    try {
      // 验证配置
      const validationResult = ConfigValidator.validateAppState(config);
      if (!validationResult.success) {
        return {
          success: false,
          error: '配置验证失败',
          message: validationResult.message
        };
      }

      const singboxConfig = this.convertToSingBoxFormat(config);
      const jsonString = JSON.stringify(singboxConfig, null, 2);
      
      return {
        success: true,
        data: jsonString,
        message: 'Sing-box配置导出成功'
      };
    } catch (error) {
      log.error('Sing-box导出失败:', error);
      return {
        success: false,
        error: 'Sing-box导出失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 生成导出文件名
   */
  static generateFileName(format: string, prefix: string = 'chongdong'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const extension = this.getFileExtension(format);
    return `${prefix}_config_${timestamp}.${extension}`;
  }

  /**
   * 获取文件扩展名
   */
  private static getFileExtension(format: string): string {
    switch (format.toLowerCase()) {
      case 'json':
        return 'json';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'clash':
        return 'yaml';
      case 'v2ray':
        return 'json';
      case 'singbox':
        return 'json';
      default:
        return 'json';
    }
  }

  /**
   * 将对象转换为YAML格式
   */
  private static objectToYaml(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          yaml += `${spaces}- ${this.objectToYaml(item, indent + 1).trim()}\n`;
        } else {
          yaml += `${spaces}- ${this.escapeYamlValue(item)}\n`;
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          return;
        }
        
        if (typeof value === 'object') {
          yaml += `${spaces}${key}:\n${this.objectToYaml(value, indent + 1)}`;
        } else {
          yaml += `${spaces}${key}: ${this.escapeYamlValue(value)}\n`;
        }
      });
    } else {
      yaml = this.escapeYamlValue(obj);
    }

    return yaml;
  }

  /**
   * 转义YAML值
   */
  private static escapeYamlValue(value: any): string {
    if (typeof value === 'string') {
      // 如果字符串包含特殊字符，用引号包围
      if (value.includes(':') || value.includes('"') || value.includes("'") || 
          value.includes('[') || value.includes(']') || value.includes('{') || 
          value.includes('}') || value.includes(',') || value.includes('&') || 
          value.includes('*') || value.includes('#') || value.includes('?') || 
          value.includes('|') || value.includes('-') || value.includes('>') || 
          value.includes('!') || value.includes('%') || value.includes('@') || 
          value.includes('`')) {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return value;
    }
    return String(value);
  }

  /**
   * 转换为Clash格式
   */
  private static convertToClashFormat(config: AppState): any {
    const clashConfig: any = {
      port: config.settings.proxyPort,
      'socks-port': config.settings.socksPort,
      'mixed-port': config.settings.mixedPort,
      'allow-lan': config.settings.allowLan,
      mode: config.settings.mode,
      'log-level': config.settings.logLevel,
      'external-controller': '127.0.0.1:9090',
      'external-ui': '',
      'secret': '',
      'dns': {
        enable: config.settings.enableDns,
        listen: '0.0.0.0:53',
        'default-nameserver': ['8.8.8.8', '8.8.4.4'],
        nameserver: [config.settings.dnsServer],
        'enhanced-mode': config.settings.enableFakeIp ? 'fake-ip' : 'redir-host',
        'fake-ip-range': config.settings.fakeIpRange
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
    config.servers.forEach(server => {
      if (server.enabled) {
        const clashProxy = this.convertServerToClash(server);
        if (clashProxy) {
          clashConfig.proxies.push(clashProxy);
        }
      }
    });

    // 转换代理组
    config.groups.forEach(group => {
      if (group.enabled) {
        const clashGroup = this.convertGroupToClash(group);
        if (clashGroup) {
          clashConfig['proxy-groups'].push(clashGroup);
        }
      }
    });

    return clashConfig;
  }

  /**
   * 转换服务器为Clash格式
   */
  private static convertServerToClash(server: any): any {
    const baseProxy = {
      name: server.name,
      type: server.protocol,
      server: server.host,
      port: server.port
    };

    switch (server.protocol) {
      case 'shadowsocks':
        return {
          ...baseProxy,
          cipher: server.encryption,
          password: server.password
        };
      case 'vmess':
        return {
          ...baseProxy,
          uuid: server.uuid,
          alterId: server.alterId || 0,
          network: server.network || 'tcp',
          tls: server.tls || false,
          'skip-cert-verify': true,
          servername: server.sni || server.host,
          path: server.wsPath || '',
          headers: server.wsHeaders || {}
        };
      case 'vless':
        return {
          ...baseProxy,
          uuid: server.uuid,
          network: server.network || 'tcp',
          tls: server.tls || false,
          'skip-cert-verify': true,
          servername: server.sni || server.host,
          path: server.wsPath || '',
          headers: server.wsHeaders || {}
        };
      case 'trojan':
        return {
          ...baseProxy,
          password: server.password,
          'skip-cert-verify': true,
          sni: server.sni || server.host
        };
      default:
        return baseProxy;
    }
  }

  /**
   * 转换代理组为Clash格式
   */
  private static convertGroupToClash(group: any): any {
    const baseGroup = {
      name: group.name,
      type: group.type,
      proxies: group.proxies
    };

    if (group.type === 'url-test' || group.type === 'fallback') {
      return {
        ...baseGroup,
        url: group.url,
        interval: group.interval || 300
      };
    }

    return baseGroup;
  }

  /**
   * 转换为V2Ray格式
   */
  private static convertToV2RayFormat(config: AppState): any {
    const v2rayConfig = {
      log: {
        loglevel: config.settings.logLevel,
        access: config.settings.enableLog ? config.settings.logFile : '',
        error: config.settings.enableLog ? config.settings.logFile : ''
      },
      inbounds: [
        {
          port: config.settings.proxyPort,
          protocol: 'http',
          settings: {
            timeout: 300
          }
        },
        {
          port: config.settings.socksPort,
          protocol: 'socks',
          settings: {
            auth: 'noauth',
            udp: config.settings.enableUdp
          }
        }
      ],
      outbounds: []
    };

    // 转换代理服务器为V2Ray格式
    config.servers.forEach(server => {
      if (server.enabled) {
        const v2rayOutbound = this.convertServerToV2Ray(server);
        if (v2rayOutbound) {
          v2rayConfig.outbounds.push(v2rayOutbound);
        }
      }
    });

    return v2rayConfig;
  }

  /**
   * 转换服务器为V2Ray格式
   */
  private static convertServerToV2Ray(server: any): any {
    const baseOutbound = {
      tag: server.name,
      protocol: server.protocol
    };

    switch (server.protocol) {
      case 'vmess':
        return {
          ...baseOutbound,
          settings: {
            vnext: [{
              address: server.host,
              port: server.port,
              users: [{
                id: server.uuid,
                alterId: server.alterId || 0
              }]
            }]
          },
          streamSettings: {
            network: server.network || 'tcp',
            security: server.tls ? 'tls' : 'none',
            tlsSettings: server.tls ? {
              serverName: server.sni || server.host,
              allowInsecure: true
            } : undefined,
            wsSettings: server.network === 'ws' ? {
              path: server.wsPath || '/',
              headers: server.wsHeaders || {}
            } : undefined
          }
        };
      default:
        return baseOutbound;
    }
  }

  /**
   * 转换为Sing-box格式
   */
  private static convertToSingBoxFormat(config: AppState): any {
    const singboxConfig = {
      log: {
        level: config.settings.logLevel,
        output: config.settings.enableLog ? config.settings.logFile : ''
      },
      inbounds: [
        {
          type: 'mixed',
          tag: 'mixed-in',
          listen: '::',
          listen_port: config.settings.mixedPort
        }
      ],
      outbounds: []
    };

    // 转换代理服务器为Sing-box格式
    config.servers.forEach(server => {
      if (server.enabled) {
        const singboxOutbound = this.convertServerToSingBox(server);
        if (singboxOutbound) {
          singboxConfig.outbounds.push(singboxOutbound);
        }
      }
    });

    return singboxConfig;
  }

  /**
   * 转换服务器为Sing-box格式
   */
  private static convertServerToSingBox(server: any): any {
    const baseOutbound = {
      type: server.protocol,
      tag: server.name
    };

    switch (server.protocol) {
      case 'vmess':
        return {
          ...baseOutbound,
          server: server.host,
          server_port: server.port,
          uuid: server.uuid,
          alter_id: server.alterId || 0,
          transport: {
            type: server.network || 'tcp',
            path: server.wsPath || '/',
            headers: server.wsHeaders || {}
          },
          tls: server.tls ? {
            enabled: true,
            server_name: server.sni || server.host,
            insecure: true
          } : undefined
        };
      default:
        return baseOutbound;
    }
  }
}
