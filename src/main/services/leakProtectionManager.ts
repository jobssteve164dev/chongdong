import { dnsService } from './dnsService';
import { ipv6LeakProtectionService } from './ipv6LeakProtectionService';
import { webRTCLeakProtectionService } from './webRTCLeakProtectionService';
import { TlsFingerprintProtectionService } from './tlsFingerprintProtectionService';
import { HttpHeaderProtectionService } from './httpHeaderProtectionService';
import { TimingLeakProtectionService } from './timingLeakProtectionService';
import { MacAddressProtectionService } from './macAddressProtectionService';
import { TrafficDecoyService } from './trafficDecoyService';
import { BehaviorAnalyticsService } from './behaviorAnalyticsService';
import { 
  LeakProtectionStatus, 
  DnsLeakResult, 
  Ipv6LeakResult, 
  WebRTCLeakResult,
  TlsFingerprintLeakResult,
  HttpHeaderLeakResult,
  TimingLeakResult,
  MacAddressLeakResult,
  AppSettings 
} from '../../shared/types';

/**
 * 统一泄露防护管理器
 */
export class LeakProtectionManager {
  private static instance: LeakProtectionManager;
  // private _settings: AppSettings | null = null;
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
    // this._settings = settings;
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
  }> {
    try {
      const [dnsResult, ipv6Result, webRTCResult, tlsFingerprintResult, httpHeaderResult, timingLeakResult, macAddressResult] = await Promise.all([
        dnsService.checkDnsLeak(),
        ipv6LeakProtectionService.checkIPv6Leak(),
        webRTCLeakProtectionService.checkWebRTCLeak(),
        this.tlsFingerprintService.checkTlsFingerprintLeak(),
        this.httpHeaderService.checkHttpHeaderLeak(),
        this.timingLeakService.checkTimingLeak(),
        this.macAddressService.checkMacAddressLeak()
      ]);

      return {
        dns: dnsResult,
        ipv6: ipv6Result,
        webRTC: webRTCResult,
        tlsFingerprint: tlsFingerprintResult,
        httpHeader: httpHeaderResult,
        timingLeak: timingLeakResult,
        macAddress: macAddressResult
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
    }

    // 分析总体泄露情况
    results.overallLeaked = results.dns.leaked || results.ipv6.leaked || results.webrtc.leaked || 
                           results.tlsFingerprint.leaked || results.httpHeader.leaked || 
                           results.timingLeak.leaked || results.macAddress.leaked;

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

    if (!results.overallLeaked) {
      results.summary.push('✅ 所有泄露检测通过');
    }

    console.log('完整泄露检测完成:', results.summary);
    return results;
  }

  /**
   * 启用/禁用特定类型的泄露防护
   */
  public setProtectionEnabled(type: 'dns' | 'ipv6' | 'webrtc' | 'tlsFingerprint' | 'httpHeader' | 'timingLeak' | 'macAddress', enabled: boolean): void {
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
  public getBehaviorAnalytics(): any {
    return this.behaviorAnalyticsService.getAnalyticsData();
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.stopMonitoring();
    console.log('LeakProtectionManager 资源已清理');
  }
}

export const leakProtectionManager = LeakProtectionManager.getInstance();
