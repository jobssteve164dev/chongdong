import { settingsManager } from '../settingsManager';
import { randomBytes } from 'crypto';
import https from 'https';

export type DecoyIntensity = 'low' | 'medium' | 'high';

export class TrafficDecoyService {
  private enabled: boolean = false;
  private intensity: DecoyIntensity = 'low';
  private customDomains: string[] = [];
  private timer: NodeJS.Timeout | null = null;

  configure(): void {
    try {
      const s = settingsManager.getSettings();
      this.enabled = !!s.enableTrafficDecoy;
      this.intensity = (s.decoyIntensity as DecoyIntensity) || 'low';
      this.customDomains = Array.isArray(s.customDecoyDomains) ? s.customDecoyDomains : [];
    } catch {}
  }

  start(): void {
    this.stop();
    if (!this.enabled) return;
    const interval = this.pickIntervalMs();
    this.timer = setInterval(() => this.fireOnce(), interval);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private pickIntervalMs(): number {
    switch (this.intensity) {
      case 'high':
        return 5_000 + Math.floor(Math.random() * 5_000);
      case 'medium':
        return 15_000 + Math.floor(Math.random() * 10_000);
      case 'low':
      default:
        return 30_000 + Math.floor(Math.random() * 30_000);
    }
  }

  private fireOnce(): void {
    const host = this.pickDomain();
    const path = `/${randomBytes(6).toString('hex')}`;
    try {
      https.get({ host, path, timeout: 3000 }, (res) => {
        res.resume();
      }).on('error', () => {});
    } catch {}
  }

  private pickDomain(): string {
    // 优先使用自定义域名池，否则使用默认域名池
    const defaultPool = [
      'www.bing.com',
      'www.cloudflare.com',
      'www.wikipedia.org',
      'www.apple.com',
      'www.microsoft.com'
    ];
    
    const pool = this.customDomains.length > 0 ? this.customDomains : defaultPool;
    if (pool.length === 0) return defaultPool[0]!;
    
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx] || defaultPool[0]!;
  }
}


