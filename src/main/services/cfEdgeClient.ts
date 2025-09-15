import crypto from 'crypto';
import axios from 'axios';
import { settingsManager } from '../settingsManager';
import { AppSettings } from '../../shared/types';

export interface EdgeRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  bodyBase64?: string;
}

export class CfEdgeClient {
  private static instance: CfEdgeClient;
  private constructor() {}

  public static getInstance(): CfEdgeClient {
    if (!CfEdgeClient.instance) CfEdgeClient.instance = new CfEdgeClient();
    return CfEdgeClient.instance;
  }

  public async send(req: EdgeRequest): Promise<{ status: number; headers: Record<string,string>; data: any }>{
    const s: AppSettings = settingsManager.getSettings();
    if (!s.cfEdgeEndpoint) throw new Error('cfEdgeEndpoint not configured');
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      url: req.url,
      method: req.method,
      headers: req.headers || {},
      body: req.bodyBase64 || '',
      ts: now,
      kid: s.cfEdgePSKId || ''
    } as any;

    // HMAC 签名 (PSK + ts + url + method + body)
    const psk = s.cfEdgePSK || '';
    const signBase = `${payload.kid}|${payload.ts}|${payload.method}|${payload.url}|${payload.body}`;
    const hmac = crypto.createHmac('sha256', psk).update(signBase).digest('hex');
    payload.sig = hmac;

    const res = await axios.post(s.cfEdgeEndpoint, payload, { responseType: 'arraybuffer', validateStatus: () => true });
    const headers: Record<string, string> = {};
    Object.entries(res.headers || {}).forEach(([k, v]) => headers[k] = Array.isArray(v) ? v.join(',') : String(v));
    return { status: res.status, headers, data: res.data };
  }
}

export const cfEdgeClient = CfEdgeClient.getInstance();


