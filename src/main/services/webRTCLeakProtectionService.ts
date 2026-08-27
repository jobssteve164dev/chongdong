import { WebRTCLeakResult, AppSettings } from '../../shared/types';

/**
 * WebRTC泄露防护服务
 */
export class WebRTCLeakProtectionService {
  private static instance: WebRTCLeakProtectionService;
  private settings: AppSettings | null = null;
  private leakProtectionEnabled: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private stunServers: string[] = [];
  private turnServers: string[] = [];

  private constructor() {
    console.log('WebRTCLeakProtectionService initialized');
    this.initializeDefaultServers();
  }

  public static getInstance(): WebRTCLeakProtectionService {
    if (!WebRTCLeakProtectionService.instance) {
      WebRTCLeakProtectionService.instance = new WebRTCLeakProtectionService();
    }
    return WebRTCLeakProtectionService.instance;
  }

  /**
   * 初始化默认的STUN/TURN服务器列表
   */
  private initializeDefaultServers(): void {
    this.stunServers = [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:stun3.l.google.com:19302',
      'stun:stun4.l.google.com:19302',
      'stun:stun.ekiga.net',
      'stun:stun.ideasip.com',
      'stun:stun.schlund.de',
      'stun:stun.stunprotocol.org:3478',
      'stun:stun.voiparound.com',
      'stun:stun.voipbuster.com',
      'stun:stun.voipstunt.com',
      'stun:stun.counterpath.com',
      'stun:stun.1und1.de',
      'stun:stun.gmx.net',
      'stun:stun.qq.com',
      'stun:stun.miwifi.com',
      'stun:stun.aliyun.com'
    ];

    this.turnServers = [
      'turn:turn.bistri.com:80',
      'turn:turn.anyfirewall.com:443?transport=tcp',
      'turn:turn.anyfirewall.com:3478?transport=udp',
      'turn:turn.anyfirewall.com:3478?transport=tcp',
      'turn:turn.anyfirewall.com:443?transport=udp'
    ];
  }

  /**
   * 初始化服务
   */
  public init(settings: AppSettings): void {
    this.settings = settings;
    this.leakProtectionEnabled = settings.enableWebRTCLeakProtection || false;
    console.log('WebRTCLeakProtectionService settings updated');
  }

  /**
   * 启用/禁用WebRTC泄露防护
   */
  public setLeakProtectionEnabled(enabled: boolean): void {
    this.leakProtectionEnabled = enabled;
    console.log(`WebRTC泄露防护已${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 检测WebRTC泄露
   */
  public async checkWebRTCLeak(): Promise<WebRTCLeakResult> {
    const details: string[] = [];
    const leakSources: string[] = [];
    const detectedIPs: string[] = [];
    let leaked = false;

    if (!this.settings) {
      return {
        leaked: true,
        details: ['Settings not initialized'],
        leakSources: ['配置未初始化'],
        detectedIPs: [],
        stunServers: []
      };
    }

    if (!this.leakProtectionEnabled) {
      details.push('WebRTC 泄露防护未启用');
      leakSources.push('WebRTC 泄露防护未启用');
      leaked = true;
    }
    details.push('当前主进程未获得渲染环境的真实 ICE/STUN 候选观测，不能判定 WebRTC 无泄露');

    return {
      leaked,
      verified: false,
      details,
      leakSources,
      detectedIPs,
      stunServers: this.stunServers
    };
  }

  /**
   * 获取WebRTC泄露防护状态
   */
  public getLeakProtectionStatus(): { enabled: boolean; mode: string; strictMode: boolean } {
    return {
      enabled: this.leakProtectionEnabled,
      mode: this.settings?.webRTCLeakProtectionMode || 'relaxed',
      strictMode: this.settings?.webRTCLeakProtectionMode === 'strict'
    };
  }

  /**
   * 开始WebRTC泄露监控
   */
  public async startLeakMonitoring(intervalMs: number = 120000): Promise<void> {
    if (!this.leakProtectionEnabled) {
      console.log('WebRTC泄露防护未启用，跳过监控');
      return;
    }

    console.log(`开始WebRTC泄露监控，间隔: ${intervalMs}ms`);
    
    const monitor = async () => {
      try {
        const leakResult = await this.checkWebRTCLeak();
        if (leakResult.leaked) {
          console.warn('🚨 WebRTC泄露检测到:', leakResult.leakSources);
          // 这里可以添加通知逻辑
        } else if (leakResult.verified === true) {
          console.log('WebRTC 泄露检查已通过真实 ICE/STUN 观测');
        } else {
          console.log('WebRTC 检查未发现明确泄露，但缺少真实 ICE/STUN 证据');
        }
      } catch (error) {
        console.error('WebRTC泄露监控执行失败:', error);
      }
    };

    // 立即执行一次
    await monitor();
    
    // 设置定时监控
    this.monitoringInterval = setInterval(monitor, intervalMs);
  }

  /**
   * 停止WebRTC泄露监控
   */
  public stopLeakMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('WebRTC泄露监控已停止');
    }
  }

  /**
   * 检查WebRTC连接是否被允许
   */
  public async isWebRTCConnectionAllowed(domain: string): Promise<boolean> {
    if (!this.leakProtectionEnabled) {
      return true;
    }

    if (this.settings?.webRTCLeakProtectionMode === 'strict') {
      // 严格模式：检查域名是否在白名单中
      return this.settings.webRTCAllowedDomains?.includes(domain) || false;
    } else {
      // 宽松模式：允许所有WebRTC连接
      return true;
    }
  }

  /**
   * 获取STUN服务器列表
   */
  public getSTUNServers(): string[] {
    return [...this.stunServers];
  }

  /**
   * 获取TURN服务器列表
   */
  public getTURNServers(): string[] {
    return [...this.turnServers];
  }

  /**
   * 添加自定义STUN服务器
   */
  public addSTUNServer(server: string): void {
    if (!this.stunServers.includes(server)) {
      this.stunServers.push(server);
      console.log(`已添加STUN服务器: ${server}`);
    }
  }

  /**
   * 添加自定义TURN服务器
   */
  public addTURNServer(server: string): void {
    if (!this.turnServers.includes(server)) {
      this.turnServers.push(server);
      console.log(`已添加TURN服务器: ${server}`);
    }
  }
}

export const webRTCLeakProtectionService = WebRTCLeakProtectionService.getInstance();
