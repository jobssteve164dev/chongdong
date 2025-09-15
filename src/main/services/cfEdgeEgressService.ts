import { settingsManager } from '../settingsManager';
import { AppSettings } from '../../shared/types';
import { offlineGeoResolver } from './geoResolver';

// 可插拔地理解析器接口
export interface GeoResolver {
  resolveCountry(host: string): Promise<string | null>;
}

class NoopGeoResolver implements GeoResolver {
  async resolveCountry(): Promise<string | null> {
    return null;
  }
}

export interface CfEdgeEnvelopeMeta {
  host: string;
  port?: number;
  method?: string;
  path?: string;
  headers?: Record<string, string>;
}

export class CfEdgeEgressService {
  private static instance: CfEdgeEgressService;
  private constructor() {}
  private geo: GeoResolver = offlineGeoResolver;

  public static getInstance(): CfEdgeEgressService {
    if (!CfEdgeEgressService.instance) {
      CfEdgeEgressService.instance = new CfEdgeEgressService();
    }
    return CfEdgeEgressService.instance;
  }

  public isEnabled(): boolean {
    const s: AppSettings = settingsManager.getSettings();
    return !!s.enableCfEdgeEgress && !!s.cfEdgeEndpoint;
  }

  public shouldUseForHost(host?: string): boolean {
    const s: AppSettings = settingsManager.getSettings();
    if (!this.isEnabled()) return false;
    if (!host) return false;
    const policy = s.cfEdgePolicy || 'allowlist';
    // denylist 优先阻断
    if (Array.isArray(s.cfEdgeDomainDenylist) && s.cfEdgeDomainDenylist.some(d => this.hostMatch(host, d))) return false;
    switch (policy) {
      case 'global':
        return true;
      case 'allowlist':
        return Array.isArray(s.cfEdgeDomainAllowlist) && s.cfEdgeDomainAllowlist.some(d => this.hostMatch(host, d));
      case 'denylist':
        // 除了denylist的都允许
        return true;
      case 'non_mainland':
        // 需要地理解析器支持；若不可用则保守为false
        // 注意：异步解析在目前同步路径中不可用，后续迭代改为异步判定
        return false;
      default:
        return false;
    }
  }

  /**
   * 异步判定（支持 non_mainland 策略）
   */
  public async shouldUseForHostAsync(host?: string): Promise<boolean> {
    const s: AppSettings = settingsManager.getSettings();
    if (!this.isEnabled()) return false;
    if (!host) return false;
    const policy = s.cfEdgePolicy || 'allowlist';
    // denylist 优先阻断
    if (Array.isArray(s.cfEdgeDomainDenylist) && s.cfEdgeDomainDenylist.some(d => this.hostMatch(host, d))) return false;
    if (policy === 'non_mainland') {
      try {
        const country = await this.geo.resolveCountry(host);
        if (!country) return false; // 无法判定则保守
        return country.toUpperCase() !== 'CN';
      } catch {
        return false;
      }
    }
    // 其他策略复用同步逻辑
    return this.shouldUseForHost(host);
  }

  public setGeoResolver(resolver: GeoResolver) {
    this.geo = resolver || new NoopGeoResolver();
  }

  private hostMatch(host: string, pattern: string): boolean {
    if (!pattern) return false;
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(1); // .example.com
      return host.endsWith(suffix);
    }
    return host === pattern;
  }
}

export const cfEdgeEgressService = CfEdgeEgressService.getInstance();


