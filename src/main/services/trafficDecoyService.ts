import { settingsManager } from '../settingsManager';
import { randomBytes } from 'crypto';
import tls from 'tls';
import { SocksClient } from 'socks';

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
    this.timer = setInterval(() => {
      void this.fireOnce().catch(error => {
        console.warn(`诱饵流量未发送: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, interval);
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

  private async fireOnce(): Promise<void> {
    const host = this.pickDomain();
    const path = `/${randomBytes(6).toString('hex')}`;
    const settings = settingsManager.getSettings();
    const socksPort = Number(settings.socksPort || settings.mixedPort || settings.proxyPort);
    if (!Number.isInteger(socksPort) || socksPort < 1 || socksPort > 65535) {
      throw new Error('可信 SOCKS 入口端口无效');
    }

    const { socket } = await SocksClient.createConnection({
      proxy: { host: '127.0.0.1', port: socksPort, type: 5 },
      command: 'connect',
      destination: { host, port: 443 },
      timeout: 5000
    });

    await new Promise<void>((resolve, reject) => {
      const secureSocket = tls.connect({ socket, servername: host, rejectUnauthorized: true });
      const finish = (error?: Error) => {
        secureSocket.destroy();
        if (error) reject(error);
        else resolve();
      };
      secureSocket.setTimeout(5000, () => finish(new Error('诱饵请求超时')));
      secureSocket.once('secureConnect', () => {
        secureSocket.write([
          `HEAD ${path} HTTP/1.1`,
          `Host: ${host}`,
          'Connection: close',
          '',
          ''
        ].join('\r\n'));
      });
      secureSocket.once('data', () => finish());
      secureSocket.once('error', finish);
      secureSocket.once('end', () => finish());
    });
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

