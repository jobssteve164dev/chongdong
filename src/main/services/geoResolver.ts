import * as fs from 'fs';
import { dnsService } from './dnsService';
import { cnCidrManager } from './cnCidrManager';

export interface GeoResolver {
  resolveCountry(domain: string): Promise<string | null>;
}

/**
 * 基于 sing-geoip 的简易解析器占位：
 * 由于 sing-geoip 的 geoip.db 为自有格式，完整解析较复杂；
 * 这里先提供占位实现：若 geoip.db 存在，返回 'UNKNOWN'，
 * 后续替换为 mmdb 或引入解析器库后再完成精确判定。
 */
export class OfflineGeoResolver implements GeoResolver {
  private cidrs: Array<{ base: number; mask: number }>|null = null;

  constructor() {}

  public async resolveCountry(domain: string): Promise<string | null> {
    try {
      // 1) 域名解析为IP，仅使用配置中的加密 DNS
      let ip: string | null = null;
      try {
        const settingsManager = (await import('../settingsManager')).settingsManager;
        const s = settingsManager.getSettings();
        const candidates: string[] = [];
        const pushSafe = (arr?: string[]) => { (arr||[]).forEach(x => { if (x && typeof x === 'string') candidates.push(x); }); };
        // 优先DoH/DoT
        pushSafe((s.dnsServers || []).filter(x => x.startsWith('https://') || x.startsWith('tls://')));
        if (s.dnsServer && /^(https|tls):\/\//.test(s.dnsServer)) candidates.push(s.dnsServer);
        if (candidates.length === 0) candidates.push('https://cloudflare-dns.com/dns-query');
        for (const server of candidates) {
          ip = await dnsService.resolveDomainOnce(domain, server);
          if (ip) break;
        }
      } catch {}
      if (!ip) return null;

      // 2) 准备/加载CN CIDR
      if (!this.cidrs) {
        if (!cnCidrManager.isPresent()) {
          await cnCidrManager.downloadOrUpdate();
        }
        this.cidrs = this.loadCidrs(cnCidrManager.getFilePath());
      }
      if (!this.cidrs || this.cidrs.length === 0) return null;

      // 3) CIDR 匹配
      const isCn = this.isIpInCn(ip, this.cidrs);
      return isCn ? 'CN' : 'NON-CN';
    } catch {
      return null;
    }
  }

  private loadCidrs(pathStr: string): Array<{ base: number; mask: number }> {
    try {
      const text = fs.readFileSync(pathStr, 'utf8');
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
      const list: Array<{ base: number; mask: number }> = [];
      for (const line of lines) {
        const [baseStr, maskStr] = line.split('/');
        if (!baseStr) { continue; }
        const base = this.ipToInt(baseStr);
        const maskBits = parseInt(maskStr || '32', 10);
        const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
        list.push({ base: base & mask, mask });
      }
      return list;
    } catch {
      return [];
    }
  }

  private ipToInt(ip: string): number {
    const parts = ip.split('.').map(p => parseInt(p, 10) & 0xff);
    const p0 = parts[0] ?? 0;
    const p1 = parts[1] ?? 0;
    const p2 = parts[2] ?? 0;
    const p3 = parts[3] ?? 0;
    return ((p0 << 24) | (p1 << 16) | (p2 << 8) | (p3)) >>> 0;
  }

  private isIpInCn(ip: string, cidrs: Array<{ base: number; mask: number }>): boolean {
    const ipInt = this.ipToInt(ip);
    for (const { base, mask } of cidrs) {
      if ((ipInt & mask) === base) return true;
    }
    return false;
  }
}

export const offlineGeoResolver = new OfflineGeoResolver();

