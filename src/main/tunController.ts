import { app } from 'electron';
import { spawn, exec } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync, chmodSync } from 'fs';
import { join } from 'path';

export interface TunStartOptions {
  tunName?: string; // e.g., 'utun0'
  socksHost?: string; // default 127.0.0.1
  socksPort: number; // middleware entry port
  mtu?: number; // optional
  enableUdp?: boolean;
  enableIpv6?: boolean;
  dnsServer?: string;
  extraArgs?: string[]; // allow user to tune flags when needed
}

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
    const extraArgs = options.extraArgs || [];

    // If already running, stop first
    await this.stop().catch(() => {});

    const tun2socksPath = this.resolveTunBinaryPath();

    // Build args conservatively to avoid tight coupling to a specific distribution
    // Many tun2socks variants support flags in the form of:
    //   --interface <name>
    //   --proxy socks5://host:port
    //   --loglevel info
    //   --udp (enable udp)
    // Some variants use: -device utun, -tunName, -proxyServer, etc.
    // We allow override via extraArgs and keep the common subset below.
    const args: string[] = [];
    // Interface / device
    args.push('--interface', tunName);
    // Proxy endpoint
    args.push('--proxy', `socks5://${socksHost}:${socksPort}`);
    // MTU (best-effort; some variants may ignore or use different flag)
    args.push('--mtu', String(mtu));
    // Log level
    args.push('--loglevel', 'info');
    // UDP support
    if (enableUdp) args.push('--udp');
    // IPv6 enable (best-effort)
    if (enableIpv6) args.push('--ipv6');
    // DNS intercept/forward (best-effort)
    if (dnsServer) {
      args.push('--dns-addr', dnsServer);
    }
    // User-provided extra args
    args.push(...extraArgs);

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
      this.runningPid = child.pid || null;
      try { writeFileSync(this.pidFile, String(this.runningPid || '')); } catch (_) {}
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


