import { app } from 'electron';
import { writeFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { obsLogger } from './obsLogger';

const execAsync = promisify(exec);

export interface KillSwitchOptions {
  enabled: boolean;
  allowedLocalPorts: number[]; // 允许本机 127.0.0.1 的端口（HTTP/SOCKS/DNS/DoH/DoT 等）
  tunInterface?: string; // 例如 utun0；如果提供则放行该接口的出站
}

class KillSwitchServiceClass {
  private static instance: KillSwitchServiceClass;
  private rulesFilePath: string;
  private stateFilePath: string;

  private constructor() {
    const userData = app.getPath('userData');
    const dir = join(userData, 'firewall');
    try { if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); } catch {}
    this.rulesFilePath = join(dir, 'killswitch.pf.conf');
    this.stateFilePath = join(dir, 'killswitch.state.json');
  }

  public static getInstance(): KillSwitchServiceClass {
    if (!KillSwitchServiceClass.instance) {
      KillSwitchServiceClass.instance = new KillSwitchServiceClass();
    }
    return KillSwitchServiceClass.instance;
  }

  public isSupported(): boolean {
    return process.platform === 'darwin';
  }

  private buildPfRules(options: KillSwitchOptions): string {
    const ports = Array.from(new Set((options.allowedLocalPorts || [])
      .filter(p => Number.isFinite(p) && p > 0 && p < 65536)))
      .sort((a, b) => a - b);
    const tun = options.tunInterface && options.tunInterface.trim();

    const portList = ports.length > 0 ? ports.join(', ') : '';

    const lines: string[] = [];
    lines.push('# Chongdong Kill Switch Rules (pf)');
    lines.push('set block-policy drop');
    lines.push('set skip on lo0');
    lines.push('block all');
    // 放行本地回环代理端口（IPv4/IPv6）
    if (portList) {
      lines.push(`pass out quick on lo0 proto { tcp udp } from any to 127.0.0.1 port { ${portList} }`);
      lines.push(`pass out quick on lo0 proto { tcp udp } from any to ::1 port { ${portList} }`);
    } else {
      lines.push('pass out quick on lo0');
    }
    // 放行 TUN 接口的出站
    if (tun) {
      lines.push(`pass out quick on ${tun} all`);
      // 允许与 TUN 交互的入站最小化（可选）
      lines.push(`pass in quick on ${tun} all`);
    }
    return lines.join('\n') + '\n';
  }

  private async runWithAdmin(command: string, timeoutMs: number = 6000): Promise<void> {
    if (process.platform !== 'darwin') {
      throw new Error('Kill Switch only implemented for macOS in this version');
    }
    return new Promise<void>((resolve, reject) => {
      const shell = `sh -c '${command.replace(/'/g, "'\\''")}'`;
      const appleScript = `do shell script "${shell.replace(/"/g, '\\"')}" with administrator privileges`;
      const osa = spawn('/usr/bin/osascript', ['-e', appleScript], { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          try { osa.kill(); } catch {}
          reject(new Error('osascript timeout'));
        }
      }, timeoutMs);
      osa.stderr.on('data', (d) => { stderr += d.toString(); });
      osa.on('exit', (code) => {
        clearTimeout(timer);
        resolved = true;
        if (code !== 0) return reject(new Error(stderr || 'osascript failed'));
        resolve();
      });
    });
  }

  public async enable(options: KillSwitchOptions): Promise<{ success: boolean; message?: string }> {
    if (!this.isSupported()) return { success: false, message: 'Kill Switch not supported on this platform' };

    const rules = this.buildPfRules(options);
    try { writeFileSync(this.rulesFilePath, rules, 'utf8'); } catch (e) { return { success: false, message: String(e) }; }

    try {
      // 记录之前 PF 是否启用，便于回滚
      let wasEnabled = false;
      try {
        const { stdout } = await execAsync('pfctl -s info | grep -i "Status:" | awk \'{print $2}\'');
        wasEnabled = stdout.trim().toLowerCase().includes('enabled');
      } catch {}
      const state = { wasEnabled, options } as any;
      try { writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2), 'utf8'); } catch {}

      // 加载我们的规则并启用 PF
      await this.runWithAdmin(`pfctl -f "${this.rulesFilePath}"`);
      await this.runWithAdmin('pfctl -e');
      obsLogger.add('KillSwitch', 'info', 'enabled', { options });
      return { success: true, message: 'Kill Switch enabled' };
    } catch (e) {
      obsLogger.add('KillSwitch', 'error', 'enableFailed', { error: String(e) });
      return { success: false, message: String(e) };
    }
  }

  public async disable(): Promise<{ success: boolean; message?: string }> {
    if (!this.isSupported()) return { success: false, message: 'Kill Switch not supported on this platform' };
    try {
      let wasEnabled = false;
      try {
        const raw = readFileSync(this.stateFilePath, 'utf8');
        const s = JSON.parse(raw);
        wasEnabled = !!s?.wasEnabled;
      } catch {}
      // 回滚：若之前未启用 PF，则直接关闭；否则恢复系统默认规则
      if (wasEnabled) {
        await this.runWithAdmin('pfctl -f /etc/pf.conf');
      } else {
        await this.runWithAdmin('pfctl -d');
      }
      try { unlinkSync(this.stateFilePath); } catch {}
      obsLogger.add('KillSwitch', 'info', 'disabled', {});
      return { success: true, message: 'Kill Switch disabled' };
    } catch (e) {
      obsLogger.add('KillSwitch', 'error', 'disableFailed', { error: String(e) });
      return { success: false, message: String(e) };
    }
  }

  public async status(): Promise<{ supported: boolean; enabled: boolean; usingChongdongRules: boolean; details?: string }>
  {
    const supported = this.isSupported();
    if (!supported) return { supported, enabled: false, usingChongdongRules: false };
    try {
      const { stdout } = await execAsync('pfctl -s info | grep -i "Status:" | awk \'{print $2}\'');
      const enabled = stdout.trim().toLowerCase().includes('enabled');
      let using = false;
      try {
        const rules = readFileSync(this.rulesFilePath, 'utf8');
        using = rules.includes('Chongdong Kill Switch Rules');
      } catch {}
      return { supported, enabled, usingChongdongRules: using };
    } catch (e) {
      return { supported, enabled: false, usingChongdongRules: false, details: String(e) };
    }
  }
}

export const killSwitchService = KillSwitchServiceClass.getInstance();


