import { app } from 'electron';
import { join } from 'path';
import * as fs from 'fs';
import axios from 'axios';

export class CnCidrManager {
  private static instance: CnCidrManager;
  private fileName = 'china_ip_list.txt';
  private url = 'https://raw.githubusercontent.com/17mon/china_ip_list/master/china_ip_list.txt';

  private constructor() {}

  public static getInstance(): CnCidrManager {
    if (!CnCidrManager.instance) {
      CnCidrManager.instance = new CnCidrManager();
    }
    return CnCidrManager.instance;
  }

  public getFilePath(): string {
    const binDir = join(app.getPath('userData'), 'bin');
    try { if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true }); } catch {}
    return join(binDir, this.fileName);
  }

  public isPresent(): boolean {
    try { return fs.existsSync(this.getFilePath()); } catch { return false; }
  }

  public async downloadOrUpdate(): Promise<void> {
    try {
      const filePath = this.getFilePath();
      const resp = await axios.get(this.url, { responseType: 'text', timeout: 10000 });
      fs.writeFileSync(filePath, resp.data, 'utf8');
      console.log('[CnCidrManager] CN CIDR 列表已更新:', filePath);
    } catch (e) {
      console.warn('[CnCidrManager] 更新 CN CIDR 列表失败(可忽略):', e instanceof Error ? e.message : String(e));
    }
  }
}

export const cnCidrManager = CnCidrManager.getInstance();


