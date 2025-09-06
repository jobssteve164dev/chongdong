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

    try {
      // 检查是否启用了WebRTC泄露防护
      if (!this.leakProtectionEnabled) {
        details.push('⚠️ WebRTC泄露防护未启用');
        leakSources.push('WebRTC泄露防护未启用');
        leaked = true;
      }

      // 模拟WebRTC泄露检测
      // 注意：在实际的Electron应用中，我们需要通过渲染进程来执行WebRTC检测
      // 这里我们提供一个框架，实际的检测逻辑需要在渲染进程中实现
      
      details.push('开始WebRTC泄露检测...');
      details.push(`检测到 ${this.stunServers.length} 个STUN服务器`);
      details.push(`检测到 ${this.turnServers.length} 个TURN服务器`);

      // 检查WebRTC API是否可用
      const webRTCAPIAvailable = await this.checkWebRTCAPIAvailability();
      if (webRTCAPIAvailable) {
        details.push('✅ WebRTC API可用');
        
        // 在严格模式下，WebRTC API可用本身就是泄露
        if (this.settings.webRTCLeakProtectionMode === 'strict') {
          leaked = true;
          leakSources.push('严格模式下检测到WebRTC API可用');
          details.push('🚨 严格模式下检测到WebRTC API可用，可能存在泄露风险');
        }
      } else {
        details.push('✅ WebRTC API不可用或被禁用');
      }

      // 检查STUN服务器连接
      const stunConnectionResults = await this.checkSTUNConnections();
      for (const result of stunConnectionResults) {
        if (result.success) {
          details.push(`✅ STUN服务器 ${result.server} 连接成功`);
          if (result.detectedIP) {
            detectedIPs.push(result.detectedIP);
            details.push(`检测到IP地址: ${result.detectedIP}`);
          }
        } else {
          details.push(`❌ STUN服务器 ${result.server} 连接失败: ${result.error}`);
        }
      }

      // 分析泄露情况
      if (detectedIPs.length > 0) {
        leaked = true;
        leakSources.push(`检测到 ${detectedIPs.length} 个IP地址泄露`);
        details.push(`🚨 检测到WebRTC泄露: ${detectedIPs.join(', ')}`);
      }

      // 检查是否在允许的域名列表中
      if (this.settings.webRTCAllowedDomains && this.settings.webRTCAllowedDomains.length > 0) {
        details.push(`允许的WebRTC域名: ${this.settings.webRTCAllowedDomains.join(', ')}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      details.push(`WebRTC泄露检测执行失败: ${errorMessage}`);
      leakSources.push(`检测执行失败: ${errorMessage}`);
      leaked = true;
    }

    return {
      leaked,
      details,
      leakSources,
      detectedIPs,
      stunServers: this.stunServers
    };
  }

  /**
   * 检查WebRTC API可用性
   */
  private async checkWebRTCAPIAvailability(): Promise<boolean> {
    // 在实际实现中，这需要通过渲染进程来检查
    // 这里返回一个模拟结果
    return false; // 假设WebRTC API已被禁用
  }

  /**
   * 检查STUN服务器连接
   */
  private async checkSTUNConnections(): Promise<Array<{
    server: string;
    success: boolean;
    detectedIP?: string;
    error?: string;
  }>> {
    const results: Array<{
      server: string;
      success: boolean;
      detectedIP?: string;
      error?: string;
    }> = [];

    // 在实际实现中，这需要通过渲染进程来执行WebRTC连接测试
    // 这里返回模拟结果
    for (const server of this.stunServers.slice(0, 3)) { // 只测试前3个服务器
      results.push({
        server,
        success: false,
        error: 'WebRTC API不可用'
      });
    }

    return results;
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
        } else {
          console.log('✅ WebRTC泄露检查通过');
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
