import { dnsService } from './dnsService';
import { ipv6LeakProtectionService } from './ipv6LeakProtectionService';
import { webRTCLeakProtectionService } from './webRTCLeakProtectionService';
import { TlsFingerprintProtectionService } from './tlsFingerprintProtectionService';
import { HttpHeaderProtectionService } from './httpHeaderProtectionService';
import { TimingLeakProtectionService } from './timingLeakProtectionService';
import { MacAddressProtectionService } from './macAddressProtectionService';
import { TrafficDecoyService } from './trafficDecoyService';
import { BehaviorAnalyticsService } from './behaviorAnalyticsService';
import { httpProtocolManager } from './httpProtocolManager';
import { geolocationProtectionService } from './geolocationProtectionService';
import { geolocationLeakTester } from './geolocationLeakTester';
import { 
  LeakProtectionStatus, 
  DnsLeakResult, 
  Ipv6LeakResult, 
  WebRTCLeakResult,
  TlsFingerprintLeakResult,
  HttpHeaderLeakResult,
  TimingLeakResult,
  MacAddressLeakResult,
  Http2ProtectionResult,
  AppSettings 
} from '../../shared/types';

/**
 * 统一泄露防护管理器
 */
export class LeakProtectionManager {
  private static instance: LeakProtectionManager;
  private _settings: AppSettings | null = null;
  private monitoringEnabled: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastStatus: LeakProtectionStatus | null = null;
  // private trafficRouter: any = null; // 已通过setTrafficRouter方法注入到behaviorAnalyticsService
  
  // 新增高级防护服务实例
  private tlsFingerprintService: TlsFingerprintProtectionService;
  private httpHeaderService: HttpHeaderProtectionService;
  private timingLeakService: TimingLeakProtectionService;
  private macAddressService: MacAddressProtectionService;
  private trafficDecoyService: TrafficDecoyService;
  private behaviorAnalyticsService: BehaviorAnalyticsService;

  private constructor() {
    console.log('LeakProtectionManager initialized');
    
    // 初始化高级防护服务
    this.tlsFingerprintService = new TlsFingerprintProtectionService();
    this.httpHeaderService = new HttpHeaderProtectionService();
    this.timingLeakService = new TimingLeakProtectionService();
    this.macAddressService = new MacAddressProtectionService();
    this.trafficDecoyService = new TrafficDecoyService();
    this.behaviorAnalyticsService = new BehaviorAnalyticsService();
  }

  public static getInstance(): LeakProtectionManager {
    if (!LeakProtectionManager.instance) {
      LeakProtectionManager.instance = new LeakProtectionManager();
    }
    return LeakProtectionManager.instance;
  }

  public setTrafficRouter(router: any): void {
    this.behaviorAnalyticsService.setTrafficRouter(router);
  }

  /**
   * 初始化管理器
   */
  public init(settings: AppSettings): void {
    this._settings = settings;
    console.log('LeakProtectionManager settings updated');

    // 初始化各个防护服务
    dnsService.init(settings);
    ipv6LeakProtectionService.init(settings);
    webRTCLeakProtectionService.init(settings);
    
    // 初始化高级防护服务
    this.tlsFingerprintService.configure({
      enabled: settings.enableTlsFingerprintProtection || true,
      mode: settings.tlsFingerprintMode || 'strict',
      template: settings.tlsFingerprintTemplate || 'chrome'
    });
    
    this.httpHeaderService.configure({
      enabled: settings.enableHttpHeaderProtection || true,
      mode: settings.httpHeaderProtectionMode || 'strict',
      customUserAgent: settings.customUserAgent || ''
    });
    
    this.timingLeakService.configure({
      enabled: settings.enableTimingLeakProtection || true,
      mode: settings.timingLeakProtectionMode || 'relaxed',
      requestDelayRange: settings.requestDelayRange || [100, 500]
    });
    
    this.macAddressService.configure({
      enabled: settings.enableMacAddressProtection || true,
      mode: settings.macAddressProtectionMode || 'relaxed'
    });

    // HTTP协议管理
    httpProtocolManager.configure({
      enabled: settings.enableHttp2Protection ?? true,
      mode: settings.http2ProtectionMode || 'strict',
      forceHttp1: !!settings.http2ForceHttp1,
      http2Enabled: !settings.http2ForceHttp1,
      connectionIsolation: settings.http2ConnectionIsolation ?? true,
      protocolWhitelist: settings.http2ProtocolWhitelist || [],
      sensitiveDomains: settings.http2SensitiveDomains || []
    });

    // 地理位置防护
    geolocationProtectionService.configure({
      enabled: settings.enableHttp2Protection || true,
      mode: settings.http2ProtectionMode || 'strict',
      dnsProtection: {
        enabled: settings.enableDnsLeakProtection || true,
        forceProxyDns: true,
        blockDirectDns: true,
        dnsOverHttps: settings.enableDoh || false
      },
      ipv6Protection: {
        enabled: settings.enableIpv6LeakProtection || true,
        disableIpv6: true,
        blockIpv6Leaks: true
      },
      webrtcProtection: {
        enabled: settings.enableWebRTCLeakProtection || true,
        disableWebRTC: true,
        blockStunServers: true
      },
      fingerprintProtection: {
        enabled: settings.enableHttpHeaderProtection || true,
        randomizeUserAgent: true,
        hideTimezone: true,
        hideLanguage: true,
        hideScreenResolution: true,
        hideCanvasFingerprint: true
      },
      networkInterfaceProtection: {
        enabled: settings.enableMacAddressProtection || true,
        hideMacAddress: true,
        hideNetworkInterfaces: true,
        randomizeNetworkInfo: true
      },
      proxyChainValidation: {
        enabled: true,
        validateProxyChain: true,
        monitorProxyHealth: true,
        autoSwitchOnFailure: true
      }
    });

    // 行为混淆与分析
    this.trafficDecoyService.configure();
    this.behaviorAnalyticsService.configure();
    this.behaviorAnalyticsService.start();
  }

  /**
   * 获取完整的泄露防护状态
   */
  public async getLeakProtectionStatus(): Promise<LeakProtectionStatus> {
    const dnsStatus = dnsService.getLeakProtectionStatus();
    const ipv6Status = ipv6LeakProtectionService.getLeakProtectionStatus();
    const webRTCStatus = webRTCLeakProtectionService.getLeakProtectionStatus();
    const tlsFingerprintStatus = this.tlsFingerprintService.getProtectionStatus();
    const httpHeaderStatus = this.httpHeaderService.getProtectionStatus();
    const timingLeakStatus = this.timingLeakService.getProtectionStatus();
    const macAddressStatus = this.macAddressService.getProtectionStatus();
    const http2ProtectionStatus = httpProtocolManager.getProtectionStatus();

    const status: LeakProtectionStatus = {
      dns: {
        enabled: dnsStatus.enabled,
        mode: dnsStatus.mode as 'strict' | 'relaxed'
      },
      ipv6: {
        enabled: ipv6Status.enabled,
        mode: ipv6Status.mode as 'strict' | 'relaxed'
      },
      webrtc: {
        enabled: webRTCStatus.enabled,
        mode: webRTCStatus.mode as 'strict' | 'relaxed'
      },
      tlsFingerprint: {
        enabled: tlsFingerprintStatus.enabled,
        mode: tlsFingerprintStatus.mode
      },
      httpHeader: {
        enabled: httpHeaderStatus.enabled,
        mode: httpHeaderStatus.mode
      },
      timingLeak: {
        enabled: timingLeakStatus.enabled,
        mode: timingLeakStatus.mode
      },
      macAddress: {
        enabled: macAddressStatus.enabled,
        mode: macAddressStatus.mode
      },
      http2Protection: {
        enabled: http2ProtectionStatus.enabled,
        mode: http2ProtectionStatus.mode
      }
    };

    this.lastStatus = status;
    return status;
  }

  /**
   * 执行完整的泄露检测并返回结果
   */
  public async checkAllLeaks(): Promise<{
    dns: DnsLeakResult;
    ipv6: Ipv6LeakResult;
    webRTC: WebRTCLeakResult;
    tlsFingerprint: TlsFingerprintLeakResult;
    httpHeader: HttpHeaderLeakResult;
    timingLeak: TimingLeakResult;
    macAddress: MacAddressLeakResult;
    http2Protection: Http2ProtectionResult;
  }> {
    try {
      const [dnsResult, ipv6Result, webRTCResult, tlsFingerprintResult, httpHeaderResult, timingLeakResult, macAddressResult, http2ProtectionResult] = await Promise.all([
        dnsService.checkDnsLeak(),
        ipv6LeakProtectionService.checkIPv6Leak(),
        webRTCLeakProtectionService.checkWebRTCLeak(),
        this.tlsFingerprintService.checkTlsFingerprintLeak(),
        this.httpHeaderService.checkHttpHeaderLeak(),
        this.timingLeakService.checkTimingLeak(),
        this.macAddressService.checkMacAddressLeak(),
        this.checkHttp2Protection()
      ]);

      return {
        dns: dnsResult,
        ipv6: ipv6Result,
        webRTC: webRTCResult,
        tlsFingerprint: tlsFingerprintResult,
        httpHeader: httpHeaderResult,
        timingLeak: timingLeakResult,
        macAddress: macAddressResult,
        http2Protection: http2ProtectionResult
      };
    } catch (error) {
      console.error('执行泄露检测时出错:', error);
      throw error;
    }
  }

  /**
   * 执行完整的泄露检测
   */
  public async performFullLeakCheck(): Promise<{
    dns: DnsLeakResult;
    ipv6: Ipv6LeakResult;
    webrtc: WebRTCLeakResult;
    tlsFingerprint: TlsFingerprintLeakResult;
    httpHeader: HttpHeaderLeakResult;
    timingLeak: TimingLeakResult;
    macAddress: MacAddressLeakResult;
    http2Protection: Http2ProtectionResult;
    overallLeaked: boolean;
    summary: string[];
  }> {
    console.log('开始执行完整泄露检测...');
    
    const results = {
      dns: await dnsService.checkDnsLeak(),
      ipv6: await ipv6LeakProtectionService.checkIPv6Leak(),
      webrtc: await webRTCLeakProtectionService.checkWebRTCLeak(),
      tlsFingerprint: await this.tlsFingerprintService.checkTlsFingerprintLeak(),
      httpHeader: await this.httpHeaderService.checkHttpHeaderLeak(),
      timingLeak: await this.timingLeakService.checkTimingLeak(),
      macAddress: await this.macAddressService.checkMacAddressLeak(),
      http2Protection: await this.checkHttp2Protection(),
      overallLeaked: false,
      summary: [] as string[]
    };

    // 更新状态
    if (this.lastStatus) {
      this.lastStatus.dns.lastCheck = new Date();
      this.lastStatus.dns.lastResult = results.dns;
      this.lastStatus.ipv6.lastCheck = new Date();
      this.lastStatus.ipv6.lastResult = results.ipv6;
      this.lastStatus.webrtc.lastCheck = new Date();
      this.lastStatus.webrtc.lastResult = results.webrtc;
      this.lastStatus.tlsFingerprint.lastCheck = new Date();
      this.lastStatus.tlsFingerprint.lastResult = results.tlsFingerprint;
      this.lastStatus.httpHeader.lastCheck = new Date();
      this.lastStatus.httpHeader.lastResult = results.httpHeader;
      this.lastStatus.timingLeak.lastCheck = new Date();
      this.lastStatus.timingLeak.lastResult = results.timingLeak;
      this.lastStatus.macAddress.lastCheck = new Date();
      this.lastStatus.macAddress.lastResult = results.macAddress;
      this.lastStatus.http2Protection.lastCheck = new Date();
      this.lastStatus.http2Protection.lastResult = results.http2Protection;
    }

    // 分析总体泄露情况
    results.overallLeaked = results.dns.leaked || results.ipv6.leaked || results.webrtc.leaked || 
                           results.tlsFingerprint.leaked || results.httpHeader.leaked || 
                           results.timingLeak.leaked || results.macAddress.leaked || results.http2Protection.leaked;

    // 生成摘要
    if (results.dns.leaked) {
      results.summary.push(`DNS泄露: ${results.dns.leakSources.join(', ')}`);
    }
    if (results.ipv6.leaked) {
      results.summary.push(`IPv6泄露: ${results.ipv6.leakSources.join(', ')}`);
    }
    if (results.webrtc.leaked) {
      results.summary.push(`WebRTC泄露: ${results.webrtc.leakSources.join(', ')}`);
    }
    if (results.tlsFingerprint.leaked) {
      results.summary.push(`TLS指纹泄露: ${results.tlsFingerprint.leakSources.join(', ')}`);
    }
    if (results.httpHeader.leaked) {
      results.summary.push(`HTTP头泄露: ${results.httpHeader.leakSources.join(', ')}`);
    }
    if (results.timingLeak.leaked) {
      results.summary.push(`时间泄露: ${results.timingLeak.leakSources.join(', ')}`);
    }
    if (results.macAddress.leaked) {
      results.summary.push(`MAC地址泄露: ${results.macAddress.leakSources.join(', ')}`);
    }
    if (results.http2Protection.leaked) {
      results.summary.push(`HTTP/2.0防护泄露: ${results.http2Protection.leakSources.join(', ')}`);
    }

    if (!results.overallLeaked) {
      results.summary.push('✅ 所有泄露检测通过');
    }

    console.log('完整泄露检测完成:', results.summary);
    return results;
  }

  /**
   * 启用/禁用特定类型的泄露防护
   */
  public setProtectionEnabled(type: 'dns' | 'ipv6' | 'webrtc' | 'tlsFingerprint' | 'httpHeader' | 'timingLeak' | 'macAddress' | 'http2Protection', enabled: boolean): void {
    switch (type) {
      case 'dns':
        dnsService.setLeakProtectionEnabled(enabled);
        break;
      case 'ipv6':
        ipv6LeakProtectionService.setLeakProtectionEnabled(enabled);
        break;
      case 'webrtc':
        webRTCLeakProtectionService.setLeakProtectionEnabled(enabled);
        break;
      case 'tlsFingerprint':
        this.tlsFingerprintService.configure({
          enabled,
          mode: this.tlsFingerprintService.getProtectionStatus().mode,
          template: 'chrome'
        });
        break;
      case 'httpHeader':
        this.httpHeaderService.configure({
          enabled,
          mode: this.httpHeaderService.getProtectionStatus().mode,
          customUserAgent: this.httpHeaderService.getProtectionStatus().customUserAgent
        });
        break;
      case 'timingLeak':
        this.timingLeakService.configure({
          enabled,
          mode: this.timingLeakService.getProtectionStatus().mode,
          requestDelayRange: this.timingLeakService.getProtectionStatus().requestDelayRange
        });
        break;
      case 'macAddress':
        this.macAddressService.configure({
          enabled,
          mode: this.macAddressService.getProtectionStatus().mode
        });
        break;
      case 'http2Protection':
        httpProtocolManager.configure({
          enabled,
          mode: httpProtocolManager.getProtectionStatus().mode,
          forceHttp1: httpProtocolManager.getProtectionStatus().forceHttp1,
          http2Enabled: httpProtocolManager.getProtectionStatus().http2Enabled,
          connectionIsolation: httpProtocolManager.getProtectionStatus().connectionIsolation,
          protocolWhitelist: httpProtocolManager.getProtectionStatus().protocolWhitelist,
          sensitiveDomains: httpProtocolManager.getProtectionStatus().sensitiveDomains
        });
        break;
    }
    console.log(`${type.toUpperCase()}泄露防护已${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 启用/禁用所有泄露防护
   */
  public setAllProtectionEnabled(enabled: boolean): void {
    dnsService.setLeakProtectionEnabled(enabled);
    ipv6LeakProtectionService.setLeakProtectionEnabled(enabled);
    webRTCLeakProtectionService.setLeakProtectionEnabled(enabled);
    
    // 启用/禁用高级防护服务
    this.tlsFingerprintService.configure({
      enabled,
      mode: this.tlsFingerprintService.getProtectionStatus().mode,
      template: 'chrome'
    });
    
    this.httpHeaderService.configure({
      enabled,
      mode: this.httpHeaderService.getProtectionStatus().mode,
      customUserAgent: this.httpHeaderService.getProtectionStatus().customUserAgent
    });
    
    this.timingLeakService.configure({
      enabled,
      mode: this.timingLeakService.getProtectionStatus().mode,
      requestDelayRange: this.timingLeakService.getProtectionStatus().requestDelayRange
    });
    
    this.macAddressService.configure({
      enabled,
      mode: this.macAddressService.getProtectionStatus().mode
    });
    
    httpProtocolManager.configure({
      enabled,
      mode: httpProtocolManager.getProtectionStatus().mode,
      forceHttp1: httpProtocolManager.getProtectionStatus().forceHttp1,
      http2Enabled: httpProtocolManager.getProtectionStatus().http2Enabled,
      connectionIsolation: httpProtocolManager.getProtectionStatus().connectionIsolation,
      protocolWhitelist: httpProtocolManager.getProtectionStatus().protocolWhitelist,
      sensitiveDomains: httpProtocolManager.getProtectionStatus().sensitiveDomains
    });
    
    console.log(`所有泄露防护已${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 开始实时监控
   */
  public async startMonitoring(intervalMs: number = 60000): Promise<void> {
    if (this.monitoringEnabled) {
      console.log('泄露防护监控已在运行');
      return;
    }

    this.monitoringEnabled = true;
    console.log(`开始泄露防护监控，间隔: ${intervalMs}ms`);

    // 启动各个服务的监控
    await dnsService.startLeakMonitoring(intervalMs);
    await ipv6LeakProtectionService.startLeakMonitoring(intervalMs);
    await webRTCLeakProtectionService.startLeakMonitoring(intervalMs);

    // 启动混淆与分析
    this.trafficDecoyService.start();

    // 启动统一监控
    this.monitoringInterval = setInterval(async () => {
      try {
        const results = await this.performFullLeakCheck();
        if (results.overallLeaked) {
          console.warn('🚨 检测到泄露风险:', results.summary);
          // 这里可以添加通知逻辑
        } else {
          console.log('✅ 泄露防护检查通过');
        }
      } catch (error) {
        console.error('泄露防护监控执行失败:', error);
      }
    }, intervalMs);
  }

  /**
   * 停止实时监控
   */
  public stopMonitoring(): void {
    if (!this.monitoringEnabled) {
      console.log('泄露防护监控未运行');
      return;
    }

    this.monitoringEnabled = false;
    console.log('停止泄露防护监控');

    // 停止各个服务的监控
    ipv6LeakProtectionService.stopLeakMonitoring();
    webRTCLeakProtectionService.stopLeakMonitoring();
    this.trafficDecoyService.stop();
    this.behaviorAnalyticsService.stop();

    // 停止统一监控
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * 获取监控状态
   */
  public isMonitoringEnabled(): boolean {
    return this.monitoringEnabled;
  }

  /**
   * 获取最后一次检测结果
   */
  public getLastCheckResults(): LeakProtectionStatus | null {
    return this.lastStatus;
  }

  /**
   * 生成泄露防护报告
   */
  public generateProtectionReport(): string {
    if (!this.lastStatus) {
      return '暂无泄露防护数据';
    }

    const report = [
      '=== 泄露防护状态报告 ===',
      `生成时间: ${new Date().toLocaleString()}`,
      '',
      'DNS泄露防护:',
      `  状态: ${this.lastStatus.dns.enabled ? '启用' : '禁用'}`,
      `  模式: ${this.lastStatus.dns.mode}`,
      `  最后检查: ${this.lastStatus.dns.lastCheck?.toLocaleString() || '未检查'}`,
      `  泄露状态: ${this.lastStatus.dns.lastResult?.leaked ? '检测到泄露' : '正常'}`,
      '',
      'IPv6泄露防护:',
      `  状态: ${this.lastStatus.ipv6.enabled ? '启用' : '禁用'}`,
      `  模式: ${this.lastStatus.ipv6.mode}`,
      `  最后检查: ${this.lastStatus.ipv6.lastCheck?.toLocaleString() || '未检查'}`,
      `  泄露状态: ${this.lastStatus.ipv6.lastResult?.leaked ? '检测到泄露' : '正常'}`,
      '',
      'WebRTC泄露防护:',
      `  状态: ${this.lastStatus.webrtc.enabled ? '启用' : '禁用'}`,
      `  模式: ${this.lastStatus.webrtc.mode}`,
      `  最后检查: ${this.lastStatus.webrtc.lastCheck?.toLocaleString() || '未检查'}`,
      `  泄露状态: ${this.lastStatus.webrtc.lastResult?.leaked ? '检测到泄露' : '正常'}`,
      '',
      '监控状态:',
      `  实时监控: ${this.monitoringEnabled ? '启用' : '禁用'}`
    ];

    return report.join('\n');
  }

  /**
   * 获取行为分析数据
   */
  public async getBehaviorAnalytics(): Promise<any> {
    return await this.behaviorAnalyticsService.getAnalyticsData();
  }

  /**
   * 检查HTTP/2.0防护状态
   */
  public async checkHttp2Protection(): Promise<Http2ProtectionResult> {
    console.log('开始HTTP/2.0防护检查...');
    
    const result: Http2ProtectionResult = {
      leaked: false,
      details: [],
      leakSources: [],
      connectionIsolation: false,
      headerTableCleanup: false,
      timingObfuscation: false,
      protocolDowngrade: false,
      sensitiveDomains: [],
      connectionStats: {
        totalConnections: 0,
        http1Connections: 0,
        http2Connections: 0,
        isolatedConnections: 0,
        activePools: 0
      }
    };

    try {
      // 获取HTTP协议管理器状态
      const protocolStatus = httpProtocolManager.getProtectionStatus();
      const connectionStats = httpProtocolManager.getConnectionStats();
      
      result.connectionStats = connectionStats;
      result.sensitiveDomains = protocolStatus.sensitiveDomains;
      
      // 检查连接隔离
      result.connectionIsolation = protocolStatus.connectionIsolation;
      if (!result.connectionIsolation) {
        result.leaked = true;
        result.leakSources.push('连接隔离未启用');
        result.details.push('HTTP/2.0连接隔离未启用，可能存在连接复用泄露');
      } else {
        result.details.push('✅ HTTP/2.0连接隔离已启用');
      }
      
      // 检查协议降级
      result.protocolDowngrade = protocolStatus.forceHttp1;
      if (result.protocolDowngrade) {
        result.details.push('✅ 已强制使用HTTP/1.1协议');
      } else {
        result.details.push('使用HTTP/2.0协议，需要额外防护措施');
      }
      
      // 基于设置检查HTTP/2.0头部表清理（由网络/引擎层实现）
      const s = this._settings;
      result.headerTableCleanup = !!(s && s.http2HeaderTableCleanup);
      if (!result.headerTableCleanup) {
        result.leaked = true;
        result.leakSources.push('头部表清理未启用');
        result.details.push('HTTP/2.0头部表清理未启用，可能存在头部泄露');
      } else {
        result.details.push('✅ HTTP/2.0头部表清理已启用');
      }
      
      // 检查时序混淆（基于设置开关）
      result.timingObfuscation = !!(s && s.http2TimingObfuscation);
      if (!result.timingObfuscation) {
        result.leaked = true;
        result.leakSources.push('时序混淆未启用');
        result.details.push('HTTP/2.0时序混淆未启用，可能存在时序泄露');
      } else {
        result.details.push('✅ HTTP/2.0时序混淆已启用');
      }
      
      // 检查连接统计
      if (connectionStats.isolatedConnections === 0) {
        result.leaked = true;
        result.leakSources.push('无隔离连接');
        result.details.push('未创建任何隔离连接，敏感域名可能共享连接');
      } else {
        result.details.push(`✅ 已创建${connectionStats.isolatedConnections}个隔离连接`);
      }
      
      if (!result.leaked) {
        result.details.push('✅ HTTP/2.0防护检查通过');
      }

    } catch (error) {
      console.error('HTTP/2.0防护检查失败:', error);
      result.leaked = true;
      result.leakSources.push('检查失败');
      result.details.push(`检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    console.log('HTTP/2.0防护检查完成:', result);
    return result;
  }

  /**
   * 应用HTTP/2.0防护措施
   */
  public async applyHttp2Protection(): Promise<boolean> {
    try {
      console.log('应用HTTP/2.0防护措施...');
      
      // 应用头部与时间防护（通用接口）
      await this.httpHeaderService.applyProtection();
      await this.timingLeakService.applyProtection();
      
      // 启动连接清理任务
      httpProtocolManager.startCleanupTask();
      
      console.log('HTTP/2.0防护措施应用完成');
      return true;
    } catch (error) {
      console.error('应用HTTP/2.0防护措施失败:', error);
      return false;
    }
  }

  /**
   * 执行地理位置泄露测试
   */
  public async runGeolocationLeakTest(): Promise<{
    overallScore: number;
    tests: Array<{
      name: string;
      description: string;
      result: any;
      success: boolean;
      score: number;
    }>;
    recommendations: string[];
  }> {
    console.log('开始执行地理位置泄露测试...');
    
    try {
      const result = await geolocationLeakTester.runComprehensiveTest();
      console.log(`地理位置泄露测试完成，总分: ${result.overallScore}/100`);
      return result;
    } catch (error) {
      console.error('地理位置泄露测试失败:', error);
      throw error;
    }
  }

  /**
   * 应用全面的地理位置防护
   */
  public async applyComprehensiveGeolocationProtection(): Promise<boolean> {
    console.log('应用全面的地理位置防护...');
    
    try {
      const result = await geolocationProtectionService.applyComprehensiveProtection();
      console.log(`地理位置防护应用完成: ${result ? '成功' : '失败'}`);
      return result;
    } catch (error) {
      console.error('应用地理位置防护失败:', error);
      return false;
    }
  }

  /**
   * 获取地理位置防护状态
   */
  public getGeolocationProtectionStatus(): any {
    return geolocationProtectionService.getProtectionStatus();
  }

  /**
   * 获取地理位置泄露测试历史
   */
  public getGeolocationTestHistory(): Array<{
    timestamp: number;
    testType: string;
    result: any;
    success: boolean;
  }> {
    return geolocationLeakTester.getTestHistory();
  }

  /**
   * 清除地理位置测试历史
   */
  public clearGeolocationTestHistory(): void {
    geolocationLeakTester.clearTestHistory();
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.stopMonitoring();
    httpProtocolManager.stopCleanupTask();
    console.log('LeakProtectionManager 资源已清理');
  }
}

export const leakProtectionManager = LeakProtectionManager.getInstance();
