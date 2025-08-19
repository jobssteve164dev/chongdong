import { AppSettings, UserPreferences } from './types';

/**
 * 统一的默认设置管理
 * 集中管理所有默认设置，供主进程和渲染进程共同使用
 */
export class DefaultSettings {
  /**
   * 获取默认应用设置
   */
  static getDefaultAppSettings(): AppSettings {
    return {
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
      proxyEngine: 'singbox',
      engineSettings: {},
      // 延迟测试设置
      latencyTestUrl: 'http://connectivitycheck.gstatic.com/generate_204',
      latencyTestTimeout: 10000,
      latencyTestRetries: 3,
      latencyTestInterval: 10,
      enableAutoLatencyTest: false,
      latencyTestConcurrency: 3,
      latencyTestUrls: 'http://connectivitycheck.gstatic.com/generate_204\nhttp://www.google.com/generate_204\nhttp://www.baidu.com',
      latencyTestValidityPeriod: 30
    };
  }

  /**
   * 获取默认用户偏好设置
   */
  static getDefaultUserPreferences(): UserPreferences {
    return {
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
    };
  }

  /**
   * 获取默认引擎设置
   */
  static getDefaultEngineSettings() {
    return {
      proxyEngine: 'singbox' as const,
      engineSettings: {}
    };
  }

  /**
   * 获取默认网络设置
   */
  static getDefaultNetworkSettings() {
    return {
      enableDns: true,
      dnsServer: '8.8.8.8',
      enableDoh: false,
      dohServer: 'https://dns.google/dns-query',
      enableTun: false,
      tunDevice: 'utun0',
      enableFakeIp: true,
      fakeIpRange: '198.18.0.1/16',
      enableUdp: true,
      enableIpv6: false,
      logLevel: 'info' as const,
      enableLog: true,
      logFile: 'chongdong.log'
    };
  }

  /**
   * 获取默认延迟测试设置
   */
  static getDefaultLatencyTestSettings() {
    return {
      latencyTestUrl: 'http://connectivitycheck.gstatic.com/generate_204',
      latencyTestTimeout: 10000,
      latencyTestRetries: 3,
      latencyTestInterval: 10,
      enableAutoLatencyTest: false,
      latencyTestConcurrency: 3,
      latencyTestUrls: 'http://connectivitycheck.gstatic.com/generate_204\nhttp://www.google.com/generate_204\nhttp://www.baidu.com',
      latencyTestValidityPeriod: 30
    };
  }
}
