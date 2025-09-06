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

  configure(): void {
    try {
      const s = settingsManager.getSettings();
      this.enabled = s.enableBehaviorAnalytics !== false;
      this.intervalSec = Math.max(5, s.behaviorSamplingIntervalSec || 30);
    } catch {}
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
    // 这里可与 TrafficRouter 集成真实统计；先返回占位估计
    return Math.floor(Math.random() * 5);
  }

  private getThroughputEstimate(): number {
    // 这里可由 TrafficRouter 的字节计数器推导；先返回占位估计
    return Math.floor(1000 + Math.random() * 5000);
  }
}


