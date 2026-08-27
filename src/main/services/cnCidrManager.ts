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
    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true, mode: 0o700 });
    return join(binDir, this.fileName);
  }

  public isPresent(): boolean {
    try { return fs.existsSync(this.getFilePath()); } catch { return false; }
  }

  public async downloadOrUpdate(): Promise<void> {
    const filePath = this.getFilePath();
    const resp = await axios.get<string>(this.url, {
      responseType: 'text',
      timeout: 10000,
      maxRedirects: 0,
      maxContentLength: 2 * 1024 * 1024
    });
    const content = String(resp.data);
    const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length < 100) {
      throw new Error('CN CIDR 列表条目过少，拒绝覆盖本地可信数据');
    }
    const valid = lines.every(line => {
      const [address, maskText] = line.split('/');
      const octets = address?.split('.').map(Number) || [];
      const mask = Number(maskText);
      return octets.length === 4 && octets.every(value => Number.isInteger(value) && value >= 0 && value <= 255) &&
        Number.isInteger(mask) && mask >= 0 && mask <= 32;
    });
    if (!valid) {
      throw new Error('CN CIDR 列表格式校验失败，拒绝覆盖本地可信数据');
    }
    fs.writeFileSync(filePath, `${lines.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
    console.log('[CnCidrManager] CN CIDR 列表已通过格式校验并更新');
  }
}

export const cnCidrManager = CnCidrManager.getInstance();

