import { app } from 'electron';
import { spawn, exec, execFile } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync, chmodSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

export interface TunStartOptions {
  tunName?: string; // e.g., 'utun0'
  socksHost?: string; // default 127.0.0.1
  socksPort: number; // middleware entry port
  mtu?: number; // optional
  enableUdp?: boolean;
  enableIpv6?: boolean;
  dnsServer?: string;
}

const execFileAsync = promisify(execFile);

class TunControllerClass {
  private static instance: TunControllerClass;
  private binDir: string;
  private pidFile: string;
  private logFile: string;
  private runningPid: number | null = null;

  private constructor() {
    const userData = app.getPath('userData');
    this.binDir = join(userData, 'bin');
    this.pidFile = join(this.binDir, 'tun2socks.pid');
    this.logFile = join(this.binDir, 'tun2socks.log');
  }

  public static getInstance(): TunControllerClass {
    if (!TunControllerClass.instance) {
      TunControllerClass.instance = new TunControllerClass();
    }
    return TunControllerClass.instance;
  }

  private resolveTunBinaryPath(): string {
    // Priority 1: app bin dir
    const localPath = join(this.binDir, process.platform === 'win32' ? 'tun2socks.exe' : 'tun2socks');
    if (existsSync(localPath)) {
      try { if (process.platform !== 'win32') chmodSync(localPath, 0o755); } catch (_) {}
      return localPath;
    }
    // Priority 2: common Homebrew paths on macOS
    const brewArm = '/opt/homebrew/bin/tun2socks';
    const brewX86 = '/usr/local/bin/tun2socks';
    if (existsSync(brewArm)) return brewArm;
    if (existsSync(brewX86)) return brewX86;
    // Fallback: rely on PATH
    return 'tun2socks';
  }

  public async start(options: TunStartOptions): Promise<void> {
    const isDarwin = process.platform === 'darwin';
    const tunName = options.tunName || 'utun0';
    const socksHost = options.socksHost || '127.0.0.1';
    const socksPort = options.socksPort;
    const mtu = options.mtu || 9000;
    const enableUdp = options.enableUdp !== false; // default true
    const enableIpv6 = !!options.enableIpv6; // default false
    const dnsServer = options.dnsServer; // optional
    if (!/^[A-Za-z0-9_.-]{1,32}$/.test(tunName)) throw new Error('TUN 设备名称无效');
    if (socksHost !== '127.0.0.1' && socksHost !== '::1' && socksHost !== 'localhost') {
      throw new Error('TUN 上游必须是本机可信 SOCKS 入口');
    }
    if (!Number.isInteger(socksPort) || socksPort < 1 || socksPort > 65535) throw new Error('SOCKS 入口端口无效');
    if (!Number.isInteger(mtu) || mtu < 576 || mtu > 65535) throw new Error('TUN MTU 无效');

    // If already running, stop first
    await this.stop().catch(() => {});

    const tun2socksPath = this.resolveTunBinaryPath();

    void enableUdp;
    void enableIpv6;
    void dnsServer;
    const args = [
      '--device', `tun://${tunName}`,
      '--proxy', `socks5://${socksHost}:${socksPort}`,
      '--mtu', String(mtu),
      '--loglevel', 'info'
    ];

    // Assemble shell command for elevation on macOS
    const logRedir = `>> "${this.logFile}" 2>&1`;
    const cmd = `"${tun2socksPath}" ${args.map(a => a.replace(/"/g, '\\"')).join(' ')} ${logRedir}`;

    if (isDarwin) {
      const shell = `sh -c 'cd "${this.binDir}"; nohup ${cmd} & echo $! > "${this.pidFile}"'`;
      const appleScript = `do shell script "${shell.replace(/"/g, '\\"')}" with administrator privileges`;

      await new Promise<void>((resolve, reject) => {
        const osa = spawn('/usr/bin/osascript', ['-e', appleScript], { stdio: ['ignore', 'pipe', 'pipe'] });
        let stderr = '';
        osa.stderr.on('data', (d) => { stderr += d.toString(); });
        osa.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`osascript failed: ${stderr || 'unknown error'}`));
            return;
          }
          try {
            if (existsSync(this.pidFile)) {
              const t = readFileSync(this.pidFile, 'utf8').trim();
              this.runningPid = parseInt(t, 10);
            }
          } catch (_) {}
          resolve();
        });
      });
    } else {
      // Non-macOS: run without elevation by default
      const child = spawn(tun2socksPath, args, {
        cwd: this.binDir,
        stdio: ['ignore', 'ignore', 'ignore'],
        detached: false
      });
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const finish = (error?: Error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          error ? reject(error) : resolve();
        };
        const timer = setTimeout(() => finish(), 750);
        child.once('error', error => finish(error));
        child.once('exit', code => finish(new Error(`tun2socks 启动后立即退出，退出码: ${code}`)));
      });
      this.runningPid = child.pid || null;
      if (!this.runningPid || !this.isRunning()) throw new Error('tun2socks 进程未保持运行');
      try { writeFileSync(this.pidFile, String(this.runningPid || '')); } catch (_) {}
    }
  }

  public async verifyTrafficCapture(tunName: string): Promise<boolean> {
    if (!/^[A-Za-z0-9_.-]{1,32}$/.test(tunName)) return false;
    try {
      if (process.platform === 'linux') {
        const { stdout } = await execFileAsync('ip', ['-4', 'route', 'show', 'default'], { timeout: 4000 });
        return stdout.split(/\r?\n/).some(line => new RegExp(`\\bdev\\s+${tunName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(line));
      }
      if (process.platform === 'darwin') {
        const { stdout } = await execFileAsync('route', ['-n', 'get', 'default'], { timeout: 4000 });
        return new RegExp(`interface:\\s*${tunName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(stdout);
      }
      return false;
    } catch {
      return false;
    }
  }

  public async stop(): Promise<void> {
    // Try pid file first
    try {
      if (existsSync(this.pidFile)) {
        const t = readFileSync(this.pidFile, 'utf8').trim();
        const pid = parseInt(t, 10);
        if (!isNaN(pid) && pid > 0) {
          try { process.kill(pid); } catch (_) {}
        }
        try { unlinkSync(this.pidFile); } catch (_) {}
      }
    } catch (_) {}
    this.runningPid = null;
  }

  public isRunning(): boolean {
    if (this.runningPid && this.runningPid > 0) {
      try {
        process.kill(this.runningPid, 0);
        return true;
      } catch (e: any) {
        if (e && (e.code === 'EPERM' || e.errno === -1)) {
          // 权限不足也可能意味着进程存在但不可触达
          return true;
        }
        // not running
      }
    }
    // fallback: pidfile check
    try {
      if (existsSync(this.pidFile)) {
        const t = readFileSync(this.pidFile, 'utf8').trim();
        const pid = parseInt(t, 10);
        if (!isNaN(pid)) {
          try { process.kill(pid, 0); return true; } catch (e: any) {
            if (e && (e.code === 'EPERM' || e.errno === -1)) {
              return true;
            }
          }
        }
      }
    } catch (_) {}
    // 兜底：通过系统命令检测进程或 utun 接口（避免状态误判）
    try {
      const out = readFileSync(this.logFile, { encoding: 'utf8' });
      if (out && /tun2socks/i.test(out)) {
        // 有近期日志不代表进程存在，但作为弱信号
      }
    } catch (_) {}
    try {
      // 优先查找进程
      const check = require('child_process').execSync(
        process.platform === 'win32' ? 'tasklist | findstr /i tun2socks' : 'pgrep -fl tun2socks || true',
        { stdio: ['ignore', 'pipe', 'ignore'] }
      ).toString();
      if (check && check.trim().length > 0) {
        return true;
      }
    } catch (_) {}
    try {
      // macOS 下检查 utun 接口是否存在
      if (process.platform === 'darwin') {
        const ifc = require('child_process').execSync('ifconfig -l | tr " " "\n" | grep -E "^utun[0-9]+$" | head -n 1 || true', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
        if (ifc && ifc.trim().length > 0) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  public getPid(): number | null {
    if (this.runningPid) return this.runningPid;
    try {
      if (existsSync(this.pidFile)) {
        const t = readFileSync(this.pidFile, 'utf8').trim();
        const pid = parseInt(t, 10);
        if (!isNaN(pid)) return pid;
      }
    } catch (_) {}
    return null;
  }

  private async runCmd(command: string, timeoutMs: number = 4000): Promise<string> {
    return new Promise((resolve) => {
      const child = exec(command, { timeout: timeoutMs }, (err, stdout, stderr) => {
        if (err) {
          resolve(`ERR: ${err.message}\n${stderr || ''}`);
          return;
        }
        resolve(stdout.toString());
      });
      child.on('error', () => resolve('ERR: spawn error'));
    });
  }

  public async diagnose(tunName: string = 'utun0'): Promise<{
    running: boolean;
    pid: number | null;
    ifconfig: string;
    routesIpv4: string;
    routesIpv6: string;
    dns: string;
  }> {
    const running = this.isRunning();
    const pid = this.getPid();
    const ifconfig = await this.runCmd(`ifconfig ${tunName} | cat`);
    const routesIpv4 = await this.runCmd(`netstat -rn -f inet | cat`);
    const routesIpv6 = await this.runCmd(`netstat -rn -f inet6 | cat`);
    const dns = process.platform === 'darwin'
      ? await this.runCmd('scutil --dns | cat')
      : await this.runCmd('cat /etc/resolv.conf | cat');
    return { running, pid, ifconfig, routesIpv4, routesIpv6, dns };
  }
}

export const TunController = TunControllerClass.getInstance();

