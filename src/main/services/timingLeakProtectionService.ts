import { TimingLeakResult } from '../../shared/types';

/**
 * 时间泄露防护服务
 * 负责检测和防护时间泄露，通过请求时间随机化和流量整形防止行为模式分析
 */
export class TimingLeakProtectionService {
  private enabled: boolean = true;
  private mode: 'strict' | 'relaxed' = 'relaxed';
  private requestDelayRange: [number, number] = [100, 500]; // [min, max] milliseconds
  private requestHistory: Array<{ timestamp: number; duration: number; type: string }> = [];
  private maxHistorySize: number = 1000;

  // 时间模式检测配置
  private readonly timingPatterns = {
    // 检测规则
    patterns: {
      regularInterval: {
        threshold: 0.8, // 80%的请求在固定间隔内
        maxDeviation: 50 // 最大偏差50ms
      },
      burstPattern: {
        threshold: 5, // 5个请求在短时间内
        timeWindow: 1000 // 1秒内
      },
      idlePattern: {
        threshold: 30000, // 30秒无请求
        maxOccurrences: 3 // 最多3次
      }
    }
  };

  constructor() {
    console.log('时间泄露防护服务初始化完成');
  }

  /**
   * 配置时间泄露防护
   */
  public configure(config: {
    enabled: boolean;
    mode: 'strict' | 'relaxed';
    requestDelayRange: [number, number];
  }): void {
    this.enabled = config.enabled;
    this.mode = config.mode;
    this.requestDelayRange = config.requestDelayRange;
    
    console.log(`时间泄露防护配置更新: enabled=${this.enabled}, mode=${this.mode}, delayRange=${this.requestDelayRange}`);
  }

  /**
   * 检测时间泄露
   */
  public async checkTimingLeak(): Promise<TimingLeakResult> {
    console.log('开始时间泄露检测...');
    
    const result: TimingLeakResult = {
      leaked: false,
      verified: false,
      details: [],
      leakSources: [],
      timingPatterns: [],
      requestIntervals: []
    };

    try {
      // 分析请求历史
      const analysis = this.analyzeRequestTiming();
      
      if (this.requestHistory.length < 10) {
        result.details.push(`仅观测到 ${this.requestHistory.length} 个实际转发请求，样本不足，不能判定时序无泄露`);
      } else if (analysis.leaked) {
        result.leaked = true;
        result.verified = true;
        result.leakSources = analysis.sources;
        result.timingPatterns = analysis.patterns;
        result.details.push(`检测到时间泄露: ${analysis.sources.join(', ')}`);
        
        if (this.mode === 'strict') {
          result.details.push('严格模式下检测到时间泄露');
        }
      } else {
        result.verified = true;
        result.details.push('实际转发请求样本中未发现已定义的时间模式泄露');
      }

      // 记录请求间隔
      result.requestIntervals = this.getRequestIntervals();
      result.details.push(`分析了${this.requestHistory.length}个请求的时间模式`);

    } catch (error) {
      console.error('时间泄露检测失败:', error);
      result.details.push(`检测失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    console.log('时间泄露检测完成');
    return result;
  }

  /**
   * 分析请求时间模式
   */
  private analyzeRequestTiming(): {
    leaked: boolean;
    sources: string[];
    patterns: string[];
  } {
    const sources: string[] = [];
    const patterns: string[] = [];

    try {
      if (this.requestHistory.length < 10) {
        return { leaked: false, sources, patterns }; // 数据不足，无法分析
      }

      // 检测规律间隔模式
      const regularInterval = this.detectRegularIntervalPattern();
      if (regularInterval.detected) {
        sources.push('规律间隔请求模式');
        patterns.push(`规律间隔: ${regularInterval.interval}ms ± ${regularInterval.deviation}ms`);
      }

      // 检测突发模式
      const burstPattern = this.detectBurstPattern();
      if (burstPattern.detected) {
        sources.push('突发请求模式');
        patterns.push(`突发模式: ${burstPattern.count}个请求在${burstPattern.duration}ms内`);
      }

      // 检测空闲模式
      const idlePattern = this.detectIdlePattern();
      if (idlePattern.detected) {
        sources.push('规律空闲模式');
        patterns.push(`空闲模式: ${idlePattern.count}次超过${idlePattern.duration}ms的空闲`);
      }

      // 检测响应时间模式
      const responseTimePattern = this.detectResponseTimePattern();
      if (responseTimePattern.detected) {
        sources.push('响应时间模式');
        patterns.push(`响应时间模式: 平均${responseTimePattern.average}ms，偏差${responseTimePattern.deviation}ms`);
      }

      const leaked = sources.length > 0;
      
      if (leaked && this.mode === 'strict') {
        sources.push('严格模式检测到时间泄露');
      }

      return { leaked, sources, patterns };
    } catch (error) {
      console.error('分析请求时间模式失败:', error);
      return { leaked: false, sources: [], patterns: [] };
    }
  }

  /**
   * 检测规律间隔模式
   */
  private detectRegularIntervalPattern(): {
    detected: boolean;
    interval: number;
    deviation: number;
  } {
    if (this.requestHistory.length < 5) {
      return { detected: false, interval: 0, deviation: 0 };
    }

    const intervals = this.getRequestIntervals();
    if (intervals.length < 4) {
      return { detected: false, interval: 0, deviation: 0 };
    }

    // 计算平均间隔
    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    
    // 计算偏差
    const deviations = intervals.map(interval => Math.abs(interval - averageInterval));
    const averageDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
    
    // 检查是否在阈值内
    const threshold = this.timingPatterns.patterns.regularInterval.threshold;
    const maxDeviation = this.timingPatterns.patterns.regularInterval.maxDeviation;
    
    const withinThreshold = deviations.filter(dev => dev <= maxDeviation).length / deviations.length;
    
    return {
      detected: withinThreshold >= threshold,
      interval: Math.round(averageInterval),
      deviation: Math.round(averageDeviation)
    };
  }

  /**
   * 检测突发模式
   */
  private detectBurstPattern(): {
    detected: boolean;
    count: number;
    duration: number;
  } {
    const timeWindow = this.timingPatterns.patterns.burstPattern.timeWindow;
    const threshold = this.timingPatterns.patterns.burstPattern.threshold;
    
    let maxBurstCount = 0;
    let maxBurstDuration = 0;
    
    for (let i = 0; i < this.requestHistory.length - threshold; i++) {
      const startTime = this.requestHistory[i]?.timestamp;
      if (startTime === undefined) continue;
      const endTime = startTime + timeWindow;
      
      const burstCount = this.requestHistory.filter(req => 
        req.timestamp >= startTime && req.timestamp <= endTime
      ).length;
      
      if (burstCount > maxBurstCount) {
        maxBurstCount = burstCount;
        maxBurstDuration = timeWindow;
      }
    }
    
    return {
      detected: maxBurstCount >= threshold,
      count: maxBurstCount,
      duration: maxBurstDuration
    };
  }

  /**
   * 检测空闲模式
   */
  private detectIdlePattern(): {
    detected: boolean;
    count: number;
    duration: number;
  } {
    const threshold = this.timingPatterns.patterns.idlePattern.threshold;
    const maxOccurrences = this.timingPatterns.patterns.idlePattern.maxOccurrences;
    
    let idleCount = 0;
    
    for (let i = 1; i < this.requestHistory.length; i++) {
      const currentTimestamp = this.requestHistory[i]?.timestamp;
      const previousTimestamp = this.requestHistory[i - 1]?.timestamp;
      if (currentTimestamp === undefined || previousTimestamp === undefined) continue;
      const interval = currentTimestamp - previousTimestamp;
      if (interval >= threshold) {
        idleCount++;
      }
    }
    
    return {
      detected: idleCount >= maxOccurrences,
      count: idleCount,
      duration: threshold
    };
  }

  /**
   * 检测响应时间模式
   */
  private detectResponseTimePattern(): {
    detected: boolean;
    average: number;
    deviation: number;
  } {
    if (this.requestHistory.length < 5) {
      return { detected: false, average: 0, deviation: 0 };
    }

    const responseTimes = this.requestHistory.map(req => req.duration);
    const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    
    const deviations = responseTimes.map(time => Math.abs(time - average));
    const deviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
    
    // 如果响应时间过于一致，可能暴露系统特征
    const isTooConsistent = deviation < 10; // 偏差小于10ms
    
    return {
      detected: isTooConsistent,
      average: Math.round(average),
      deviation: Math.round(deviation)
    };
  }

  /**
   * 获取请求间隔
   */
  private getRequestIntervals(): number[] {
    const intervals: number[] = [];
    
    for (let i = 1; i < this.requestHistory.length; i++) {
      const currentTimestamp = this.requestHistory[i]?.timestamp;
      const previousTimestamp = this.requestHistory[i - 1]?.timestamp;
      if (currentTimestamp === undefined || previousTimestamp === undefined) continue;
      const interval = currentTimestamp - previousTimestamp;
      intervals.push(interval);
    }
    
    return intervals;
  }

  /**
   * 记录请求时间
   */
  public recordRequest(type: string, duration: number): void {
    const timestamp = Date.now();
    
    this.requestHistory.push({
      timestamp,
      duration,
      type
    });
    
    // 保持历史记录大小
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * 生成随机延迟
   */
  public generateRandomDelay(): number {
    if (!this.enabled) {
      return 0;
    }

    const [min, max] = this.requestDelayRange;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 应用时间泄露防护
   */
  public async applyProtection(): Promise<boolean> {
    if (!this.enabled) {
      console.log('时间泄露防护已禁用');
      return false;
    }

    throw new Error('当前构建未将时间混淆接入实际转发数据面');
  }

  /**
   * 获取防护状态
   */
  public getProtectionStatus(): {
    enabled: boolean;
    mode: 'strict' | 'relaxed';
    requestDelayRange: [number, number];
    requestCount: number;
    lastCheck?: Date;
  } {
    return {
      enabled: this.enabled,
      mode: this.mode,
      requestDelayRange: this.requestDelayRange,
      requestCount: this.requestHistory.length,
      lastCheck: new Date()
    };
  }

  /**
   * 清除请求历史
   */
  public clearHistory(): void {
    this.requestHistory = [];
    console.log('请求历史已清除');
  }
}
