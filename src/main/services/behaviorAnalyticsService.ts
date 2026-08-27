import { settingsManager } from '../settingsManager';

export interface BehaviorSnapshot {
  timestamp: number;
  activeConnections: number;
  bytesPerSecond: number;
}

export class BehaviorAnalyticsService {
  private enabled: boolean = true;
  private intervalSec: number = 30;
  private timer: NodeJS.Timeout | null = null;
  private history: BehaviorSnapshot[] = [];
  private trafficRouter: any = null; // 将在初始化时注入

  configure(): void {
    try {
      const s = settingsManager.getSettings();
      this.enabled = s.enableBehaviorAnalytics !== false;
      this.intervalSec = Math.max(5, s.behaviorSamplingIntervalSec || 30);
    } catch {}
  }

  setTrafficRouter(router: any): void {
    this.trafficRouter = router;
  }

  start(): void {
    this.stop();
    if (!this.enabled) return;
    this.timer = setInterval(() => {
      void this.sampleOnce().catch(error => console.error('行为分析采样失败:', error));
    }, this.intervalSec * 1000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  getRecentHistory(limit: number = 200): BehaviorSnapshot[] {
    return this.history.slice(-limit);
  }

  async getAnalyticsData(): Promise<any> {
    // 若已注入路由器，则返回实时聚合数据
    if (this.trafficRouter) {
      return await this.trafficRouter.getBehaviorAnalytics();
    }

    // 否则回退到持久化的历史聚合数据，避免返回 null 造成渲染端回退为模拟数据
    try {
      const { behaviorDataManager } = await import('./behaviorDataManager');
      const historical = await behaviorDataManager.getAggregatedData();

      return {
        totalConnections: historical.totalConnections,
        totalBytes: historical.totalBytes,
        averageConnections: historical.averageConnections,
        peakConnections: historical.peakConnections,
        averageBytesPerSecond: historical.averageBytesPerSecond,
        peakBytesPerSecond: historical.peakBytesPerSecond,
        activeHours: historical.activeHours,
        connectionPatterns: historical.connectionPatterns,
        trafficPatterns: historical.trafficPatterns,
        currentActiveConnections: 0,
        currentBytesPerSecond: 0
      };
    } catch (error) {
      throw new Error(`无法读取行为分析观测数据: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async sampleOnce(): Promise<void> {
    if (!this.trafficRouter) return;
    const analytics = await this.trafficRouter.getBehaviorAnalytics();
    const snapshot: BehaviorSnapshot = {
      timestamp: Date.now(),
      activeConnections: Number(analytics.currentActiveConnections) || 0,
      bytesPerSecond: Number(analytics.currentBytesPerSecond) || 0
    };
    this.history.push(snapshot);
    if (this.history.length > 2000) this.history.shift();
  }
}
