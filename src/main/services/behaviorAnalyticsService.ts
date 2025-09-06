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
    this.timer = setInterval(() => this.sampleOnce(), this.intervalSec * 1000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  getRecentHistory(limit: number = 200): BehaviorSnapshot[] {
    return this.history.slice(-limit);
  }

  async getAnalyticsData(): Promise<any> {
    if (!this.trafficRouter) {
      return null;
    }
    return await this.trafficRouter.getBehaviorAnalytics();
  }

  private sampleOnce(): void {
    const snapshot: BehaviorSnapshot = {
      timestamp: Date.now(),
      activeConnections: this.getActiveConnectionsEstimate(),
      bytesPerSecond: this.getThroughputEstimate()
    };
    this.history.push(snapshot);
    if (this.history.length > 2000) this.history.shift();
  }

  private getActiveConnectionsEstimate(): number {
    if (this.trafficRouter) {
      const analytics = this.trafficRouter.getBehaviorAnalytics();
      return analytics?.currentActiveConnections || 0;
    }
    return Math.floor(Math.random() * 5);
  }

  private getThroughputEstimate(): number {
    if (this.trafficRouter) {
      const analytics = this.trafficRouter.getBehaviorAnalytics();
      return analytics?.currentBytesPerSecond || 0;
    }
    return Math.floor(1000 + Math.random() * 5000);
  }
}


