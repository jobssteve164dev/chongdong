import { 
  AppState, 
  AppSettings, 
  UserPreferences, 
  Subscription, 
  ProxyServer, 
  ProxyGroup,
  ProxyProtocol,
  ApiResponse 
} from '../../shared/types';
import { logger } from './logger';

/**
 * 配置验证工具类
 * 负责验证各种配置数据的有效性
 */
export class ConfigValidator {
  /**
   * 验证应用设置
   */
  static validateSettings(settings: Partial<AppSettings>): ApiResponse<boolean> {
    try {
      const errors: string[] = [];

      // 验证端口范围
      if (settings.proxyPort !== undefined) {
        if (settings.proxyPort < 1 || settings.proxyPort > 65535) {
          errors.push('代理端口必须在1-65535范围内');
        }
      }

      if (settings.socksPort !== undefined) {
        if (settings.socksPort < 1 || settings.socksPort > 65535) {
          errors.push('SOCKS端口必须在1-65535范围内');
        }
      }

      if (settings.mixedPort !== undefined) {
        if (settings.mixedPort < 1 || settings.mixedPort > 65535) {
          errors.push('混合端口必须在1-65535范围内');
        }
      }

      // 验证端口冲突
      if (settings.proxyPort && settings.socksPort && settings.proxyPort === settings.socksPort) {
        errors.push('代理端口和SOCKS端口不能相同');
      }

      if (settings.proxyPort && settings.mixedPort && settings.proxyPort === settings.mixedPort) {
        errors.push('代理端口和混合端口不能相同');
      }

      if (settings.socksPort && settings.mixedPort && settings.socksPort === settings.mixedPort) {
        errors.push('SOCKS端口和混合端口不能相同');
      }

      // 验证DNS服务器格式
      if (settings.dnsServer && !this.isValidIpAddress(settings.dnsServer)) {
        errors.push('DNS服务器地址格式无效');
      }

      // 验证DoH服务器URL格式
      if (settings.dohServer && !this.isValidUrl(settings.dohServer)) {
        errors.push('DoH服务器URL格式无效');
      }

      // 验证FakeIP范围
      if (settings.fakeIpRange && !this.isValidCidr(settings.fakeIpRange)) {
        errors.push('FakeIP范围格式无效，应为CIDR格式（如：198.18.0.1/16）');
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: '设置验证失败',
          message: errors.join('; ')
        };
      }

      return {
        success: true,
        data: true,
        message: '设置验证通过'
      };
    } catch (error) {
      logger.error('设置验证失败:', error);
      return {
        success: false,
        error: '设置验证失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 验证用户偏好设置
   */
  static validatePreferences(preferences: Partial<UserPreferences>): ApiResponse<boolean> {
    try {
      const errors: string[] = [];

      // 验证窗口大小
      if (preferences.windowSize) {
        if (preferences.windowSize.width < 800 || preferences.windowSize.height < 600) {
          errors.push('窗口大小不能小于800x600');
        }
        if (preferences.windowSize.width > 3000 || preferences.windowSize.height > 2000) {
          errors.push('窗口大小不能大于3000x2000');
        }
      }

      // 验证窗口位置
      if (preferences.windowPosition) {
        if (preferences.windowPosition.x < 0 || preferences.windowPosition.y < 0) {
          errors.push('窗口位置不能为负数');
        }
      }

      // 验证快捷键格式
      if (preferences.hotkeys) {
        for (const [key, value] of Object.entries(preferences.hotkeys)) {
          if (!this.isValidHotkey(value)) {
            errors.push(`快捷键格式无效: ${key} = ${value}`);
          }
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: '偏好设置验证失败',
          message: errors.join('; ')
        };
      }

      return {
        success: true,
        data: true,
        message: '偏好设置验证通过'
      };
    } catch (error) {
      logger.error('偏好设置验证失败:', error);
      return {
        success: false,
        error: '偏好设置验证失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 验证代理服务器配置
   */
  static validateServer(server: Partial<ProxyServer>): ApiResponse<boolean> {
    try {
      const errors: string[] = [];

      // 验证必填字段
      if (!server.name || server.name.trim() === '') {
        errors.push('服务器名称不能为空');
      }

      if (!server.host || server.host.trim() === '') {
        errors.push('服务器地址不能为空');
      }

      if (server.port === undefined || server.port < 1 || server.port > 65535) {
        errors.push('服务器端口必须在1-65535范围内');
      }

      // 验证协议特定字段
      if (server.protocol) {
        switch (server.protocol) {
          case ProxyProtocol.SHADOWSOCKS:
            if (!server.password || server.password.trim() === '') {
              errors.push('Shadowsocks协议需要设置密码');
            }
            if (!server.encryption || server.encryption.trim() === '') {
              errors.push('Shadowsocks协议需要设置加密方式');
            }
            break;

          case ProxyProtocol.VMESS:
          case ProxyProtocol.VLESS:
            if (!server.uuid || server.uuid.trim() === '') {
              errors.push('VMess/VLess协议需要设置UUID');
            }
            break;

          case ProxyProtocol.TROJAN:
            if (!server.password || server.password.trim() === '') {
              errors.push('Trojan协议需要设置密码');
            }
            break;

          case ProxyProtocol.HYSTERIA:
            if (!server.password || server.password.trim() === '') {
              errors.push('Hysteria协议需要设置密码');
            }
            break;

          case ProxyProtocol.TUIC:
            if (!server.uuid || server.uuid.trim() === '') {
              errors.push('TUIC协议需要设置UUID');
            }
            if (!server.password || server.password.trim() === '') {
              errors.push('TUIC协议需要设置密码');
            }
            break;

          case ProxyProtocol.WIREGUARD:
            if (!server.privateKey || server.privateKey.trim() === '') {
              errors.push('WireGuard协议需要设置私钥');
            }
            if (!server.publicKey || server.publicKey.trim() === '') {
              errors.push('WireGuard协议需要设置公钥');
            }
            break;
        }
      }

      // 验证TLS配置
      if (server.tls && !server.sni) {
        errors.push('启用TLS时必须设置SNI');
      }

      // 验证WebSocket配置
      if (server.network === 'ws' && !server.wsPath) {
        errors.push('WebSocket传输需要设置路径');
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: '代理服务器配置验证失败',
          message: errors.join('; ')
        };
      }

      return {
        success: true,
        data: true,
        message: '代理服务器配置验证通过'
      };
    } catch (error) {
      logger.error('代理服务器配置验证失败:', error);
      return {
        success: false,
        error: '代理服务器配置验证失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 验证订阅配置
   */
  static validateSubscription(subscription: Partial<Subscription>): ApiResponse<boolean> {
    try {
      const errors: string[] = [];

      // 验证必填字段
      if (!subscription.name || subscription.name.trim() === '') {
        errors.push('订阅名称不能为空');
      }

      if (!subscription.url || subscription.url.trim() === '') {
        errors.push('订阅URL不能为空');
      }

      // 验证URL格式
      if (subscription.url && !this.isValidUrl(subscription.url)) {
        errors.push('订阅URL格式无效');
      }

      // 验证更新间隔
      if (subscription.updateInterval !== undefined && subscription.updateInterval < 300) {
        errors.push('更新间隔不能少于300秒（5分钟）');
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: '订阅配置验证失败',
          message: errors.join('; ')
        };
      }

      return {
        success: true,
        data: true,
        message: '订阅配置验证通过'
      };
    } catch (error) {
      logger.error('订阅配置验证失败:', error);
      return {
        success: false,
        error: '订阅配置验证失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 验证代理组配置
   */
  static validateGroup(group: Partial<ProxyGroup>): ApiResponse<boolean> {
    try {
      const errors: string[] = [];

      // 验证必填字段
      if (!group.name || group.name.trim() === '') {
        errors.push('代理组名称不能为空');
      }

      // 验证组类型
      if (group.type && !['select', 'url-test', 'fallback', 'load-balance'].includes(group.type)) {
        errors.push('代理组类型无效');
      }

      // 验证URL测试组
      if (group.type === 'url-test' || group.type === 'fallback') {
        if (!group.url || group.url.trim() === '') {
          errors.push('URL测试组需要设置测试URL');
        }
        if (!this.isValidUrl(group.url!)) {
          errors.push('测试URL格式无效');
        }
        if (!group.interval || group.interval < 300) {
          errors.push('测试间隔不能少于300秒');
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: '代理组配置验证失败',
          message: errors.join('; ')
        };
      }

      return {
        success: true,
        data: true,
        message: '代理组配置验证通过'
      };
    } catch (error) {
      logger.error('代理组配置验证失败:', error);
      return {
        success: false,
        error: '代理组配置验证失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 验证完整应用状态
   */
  static validateAppState(state: Partial<AppState>): ApiResponse<boolean> {
    try {
      const errors: string[] = [];

      // 验证设置
      if (state.settings) {
        const settingsResult = this.validateSettings(state.settings);
        if (!settingsResult.success) {
          errors.push(`设置验证失败: ${settingsResult.message}`);
        }
      }

      // 验证偏好设置
      if (state.preferences) {
        const preferencesResult = this.validatePreferences(state.preferences);
        if (!preferencesResult.success) {
          errors.push(`偏好设置验证失败: ${preferencesResult.message}`);
        }
      }

      // 验证订阅
      if (state.subscriptions) {
        for (let i = 0; i < state.subscriptions.length; i++) {
          const subscriptionResult = this.validateSubscription(state.subscriptions[i]);
          if (!subscriptionResult.success) {
            errors.push(`订阅[${i}]验证失败: ${subscriptionResult.message}`);
          }
        }
      }

      // 验证代理服务器
      if (state.servers) {
        for (let i = 0; i < state.servers.length; i++) {
          const serverResult = this.validateServer(state.servers[i]);
          if (!serverResult.success) {
            errors.push(`代理服务器[${i}]验证失败: ${serverResult.message}`);
          }
        }
      }

      // 验证代理组
      if (state.groups) {
        for (let i = 0; i < state.groups.length; i++) {
          const groupResult = this.validateGroup(state.groups[i]);
          if (!groupResult.success) {
            errors.push(`代理组[${i}]验证失败: ${groupResult.message}`);
          }
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: '应用状态验证失败',
          message: errors.join('; ')
        };
      }

      return {
        success: true,
        data: true,
        message: '应用状态验证通过'
      };
    } catch (error) {
      logger.error('应用状态验证失败:', error);
      return {
        success: false,
        error: '应用状态验证失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 验证IP地址格式
   */
  private static isValidIpAddress(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
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
   * 验证CIDR格式
   */
  private static isValidCidr(cidr: string): boolean {
    const cidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[1-2][0-9]|3[0-2])$/;
    return cidrRegex.test(cidr);
  }

  /**
   * 验证快捷键格式
   */
  private static isValidHotkey(hotkey: string): boolean {
    const hotkeyRegex = /^(Ctrl\+|Cmd\+|Alt\+|Shift\+)*[A-Za-z0-9]$/;
    return hotkeyRegex.test(hotkey);
  }
}
