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
      v2rayPath: '',
      clashPath: '',
      singBoxPath: '',
      theme: 'auto',
      language: 'zh-CN',
      autoStart: false,
      systemProxy: true,
      proxyPort: 7897, // HTTP端口
      socksPort: 7896, // SOCKS端口
      mixedPort: 7897, // 混合端口使用HTTP端口
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
      // 新增IPv6泄露防护配置
      enableIpv6LeakProtection: true,
      ipv6LeakProtectionMode: 'relaxed',
      // 新增WebRTC泄露防护配置
      enableWebRTCLeakProtection: true,
      webRTCLeakProtectionMode: 'strict',
      webRTCAllowedDomains: [],
      enableDns: true,
      dnsServer: '8.8.8.8',
      enableDoh: false,
      dohServer: 'https://dns.google/dns-query',
      // 新增DNS安全性和隐私性配置
      enableDot: false,
      dotServer: 'tls://1.1.1.1:853',
      enableDnsCache: true,
      dnsCacheSize: 1000,
      dnsCacheTtl: 300,
      enableDnsLoadBalance: true,
      dnsServers: [
        '8.8.8.8',
        '8.8.4.4',
        '1.1.1.1',
        '1.0.0.1'
      ],
      enableDnsLogging: false,
      enableDnsLeakProtection: true,
      dnsLeakProtectionMode: 'strict',
      dnsLeakStrict: false, // 严格模式默认关闭
      enableDnsRules: true,
      dnsRules: [
        {
          id: 'block-ads',
          name: '屏蔽广告域名',
          pattern: 'ads.',
          patternType: 'suffix',
          action: 'block',
          enabled: true,
          priority: 100
        },
        {
          id: 'block-tracking',
          name: '屏蔽追踪域名',
          pattern: 'tracking.',
          patternType: 'suffix',
          action: 'block',
          enabled: true,
          priority: 100
        },
        {
          id: 'local-domains',
          name: '本地域名直连',
          pattern: '.local',
          patternType: 'suffix',
          action: 'direct',
          enabled: true,
          priority: 200
        }
      ],
      enableDnsFallback: true,
      dnsFallbackServers: [
        '114.114.114.114',
        '223.5.5.5'
      ],
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
      latencyTestValidityPeriod: 30,
      // 数据库自动更新设置
      enableDatabaseAutoUpdate: false,
      databaseUpdateInterval: 24, // 默认24小时
      databaseUpdateCheckOnStartup: true
      // databaseLastUpdateCheck 是可选的，不需要在默认设置中定义
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
      // 新增DNS安全性和隐私性配置
      enableDot: false,
      dotServer: 'tls://1.1.1.1:853',
      enableDnsCache: true,
      dnsCacheSize: 1000,
      dnsCacheTtl: 300,
      enableDnsLoadBalance: true,
      dnsServers: [
        '8.8.8.8',
        '8.8.4.4',
        '1.1.1.1',
        '1.0.0.1'
      ],
      enableDnsLogging: false,
      enableDnsLeakProtection: true,
      dnsLeakProtectionMode: 'strict',
      enableDnsRules: true,
      dnsRules: [
        {
          id: 'block-ads',
          name: '屏蔽广告域名',
          pattern: 'ads.',
          patternType: 'suffix',
          action: 'block',
          enabled: true,
          priority: 100
        },
        {
          id: 'block-tracking',
          name: '屏蔽追踪域名',
          pattern: 'tracking.',
          patternType: 'suffix',
          action: 'block',
          enabled: true,
          priority: 100
        },
        {
          id: 'local-domains',
          name: '本地域名直连',
          pattern: '.local',
          patternType: 'suffix',
          action: 'direct',
          enabled: true,
          priority: 200
        }
      ],
      enableDnsFallback: true,
      dnsFallbackServers: [
        '114.114.114.114',
        '223.5.5.5'
      ],
      enableTun: false,
      tunDevice: 'utun0',
      enableFakeIp: true,
      fakeIpRange: '198.18.0.1/16',
      enableUdp: true,
      enableIpv6: false,
      // 新增IPv6泄露防护配置
      enableIpv6LeakProtection: true,
      ipv6LeakProtectionMode: 'relaxed',
      // 新增WebRTC泄露防护配置
      enableWebRTCLeakProtection: true,
      webRTCLeakProtectionMode: 'strict',
      webRTCAllowedDomains: [],
      // 新增高级泄露防护配置
      enableTlsFingerprintProtection: true,
      tlsFingerprintMode: 'strict',
      tlsFingerprintTemplate: 'chrome',
      enableHttpHeaderProtection: true,
      httpHeaderProtectionMode: 'strict',
      customUserAgent: '',
      enableTimingLeakProtection: true,
      timingLeakProtectionMode: 'relaxed',
      requestDelayRange: [100, 500] as [number, number],
      enableMacAddressProtection: true,
      macAddressProtectionMode: 'relaxed',
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
