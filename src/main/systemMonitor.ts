import { ipcMain, BrowserWindow } from 'electron';
import * as os from 'os';

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  systemProxyEnabled: boolean;
  systemProxyHost?: string;
  systemProxyPort?: number;
  timestamp: number;
}

export class SystemMonitor {
  private static instance: SystemMonitor;
  private updateInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private lastCpuUsage = 0;
  private lastCpuTime = 0;

  private constructor() {}

  public static getInstance(): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor();
    }
    return SystemMonitor.instance;
  }

  /**
   * 启动系统监控
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.updateInterval = setInterval(() => {
      this.updateMetrics();
    }, 2000); // 每2秒更新一次

    console.log('系统监控已启动');
  }

  /**
   * 停止系统监控
   */
  public stopMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isMonitoring = false;
    console.log('系统监控已停止');
  }

  /**
   * 获取当前系统指标
   */
  public async getSystemMetrics(): Promise<SystemMetrics> {
    const cpuUsage = await this.getCpuUsage();
    const memoryUsage = this.getMemoryUsage();
    const systemProxy = await this.getSystemProxyStatus();

    const metrics: SystemMetrics = {
      cpuUsage,
      memoryUsage,
      systemProxyEnabled: systemProxy.enabled,
      timestamp: Date.now()
    };

    // 只有当值不为undefined时才添加到对象中
    if (systemProxy.host !== undefined) {
      metrics.systemProxyHost = systemProxy.host;
    }
    if (systemProxy.port !== undefined) {
      metrics.systemProxyPort = systemProxy.port;
    }

    return metrics;
  }

  /**
   * 获取CPU使用率
   */
  private async getCpuUsage(): Promise<number> {
    try {
      const cpus = os.cpus();
      if (!cpus || cpus.length === 0) {
        return 0;
      }

      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
      });

      if (this.lastCpuTime > 0) {
        const idle = totalIdle - this.lastCpuUsage;
        const total = totalTick - this.lastCpuTime;
        const usage = 100 - (100 * idle / total);
        this.lastCpuUsage = totalIdle;
        this.lastCpuTime = totalTick;
        return Math.round(usage * 100) / 100; // 保留两位小数
      } else {
        this.lastCpuUsage = totalIdle;
        this.lastCpuTime = totalTick;
        return 0;
      }
    } catch (error) {
      console.error('获取CPU使用率失败:', error);
      return 0;
    }
  }

  /**
   * 获取内存使用率
   */
  private getMemoryUsage(): number {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const usage = (usedMem / totalMem) * 100;
      return Math.round(usage * 100) / 100; // 保留两位小数
    } catch (error) {
      console.error('获取内存使用率失败:', error);
      return 0;
    }
  }

  /**
   * 获取系统代理状态
   */
  private async getSystemProxyStatus(): Promise<{ enabled: boolean; host?: string; port?: number }> {
    try {
      // 这里需要根据平台实现具体的系统代理检测
      // 暂时返回一个基本实现，后续可以根据需要扩展
      switch (process.platform) {
        case 'darwin': // macOS
          return await this.getMacOSProxyStatus();
        case 'win32': // Windows
          return await this.getWindowsProxyStatus();
        case 'linux': // Linux
          return await this.getLinuxProxyStatus();
        default:
          return { enabled: false };
      }
    } catch (error) {
      console.error('获取系统代理状态失败:', error);
      return { enabled: false };
    }
  }

  /**
   * macOS系统代理状态检测
   */
  private async getMacOSProxyStatus(): Promise<{ enabled: boolean; host?: string; port?: number }> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // 检查HTTP代理
      const httpResult = await execAsync('networksetup -getwebproxy "Wi-Fi"');
      const httpEnabled = httpResult.stdout.includes('Enabled: Yes');
      
      if (httpEnabled) {
        const hostMatch = httpResult.stdout.match(/Server: (.+)/);
        const portMatch = httpResult.stdout.match(/Port: (\d+)/);
        const result: { enabled: boolean; host?: string; port?: number } = {
          enabled: true
        };
        
        if (hostMatch) {
          result.host = hostMatch[1];
        }
        if (portMatch) {
          result.port = parseInt(portMatch[1]);
        }
        
        return result;
      }

      // 检查SOCKS代理
      const socksResult = await execAsync('networksetup -getsocksfirewallproxy "Wi-Fi"');
      const socksEnabled = socksResult.stdout.includes('Enabled: Yes');
      
      if (socksEnabled) {
        const hostMatch = socksResult.stdout.match(/Server: (.+)/);
        const portMatch = socksResult.stdout.match(/Port: (\d+)/);
        const result: { enabled: boolean; host?: string; port?: number } = {
          enabled: true
        };
        
        if (hostMatch) {
          result.host = hostMatch[1];
        }
        if (portMatch) {
          result.port = parseInt(portMatch[1]);
        }
        
        return result;
      }

      return { enabled: false };
    } catch (error) {
      console.error('获取macOS代理状态失败:', error);
      return { enabled: false };
    }
  }

  /**
   * Windows系统代理状态检测
   */
  private async getWindowsProxyStatus(): Promise<{ enabled: boolean; host?: string; port?: number }> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const result = await execAsync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable');
      const enabled = result.stdout.includes('0x1');
      
      if (enabled) {
        const serverResult = await execAsync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer');
        const serverMatch = serverResult.stdout.match(/ProxyServer\s+REG_SZ\s+(.+)/);
        if (serverMatch) {
          const [host, port] = serverMatch[1].split(':');
          const result: { enabled: boolean; host?: string; port?: number } = {
            enabled: true,
            host
          };
          
          if (port) {
            result.port = parseInt(port);
          }
          
          return result;
        }
      }

      return { enabled: false };
    } catch (error) {
      console.error('获取Windows代理状态失败:', error);
      return { enabled: false };
    }
  }

  /**
   * Linux系统代理状态检测
   */
  private async getLinuxProxyStatus(): Promise<{ enabled: boolean; host?: string; port?: number }> {
    try {
      const httpProxy = process.env['HTTP_PROXY'] || process.env['http_proxy'];
      const httpsProxy = process.env['HTTPS_PROXY'] || process.env['https_proxy'];
      
      if (httpProxy || httpsProxy) {
        const proxyUrl = httpProxy || httpsProxy;
        if (proxyUrl) {
          const url = new URL(proxyUrl);
          return {
            enabled: true,
            host: url.hostname,
            port: parseInt(url.port)
          };
        }
      }

      return { enabled: false };
    } catch (error) {
      console.error('获取Linux代理状态失败:', error);
      return { enabled: false };
    }
  }

  /**
   * 更新指标并通知渲染进程
   */
  private async updateMetrics(): Promise<void> {
    try {
      const metrics = await this.getSystemMetrics();
      
      // 通知所有渲染进程
      const windows = BrowserWindow.getAllWindows();
      windows.forEach((window: BrowserWindow) => {
        if (!window.isDestroyed()) {
          window.webContents.send('system:metrics-updated', metrics);
        }
      });
    } catch (error) {
      console.error('更新系统指标失败:', error);
    }
  }

  /**
   * 注册IPC处理器
   */
  public registerIpcHandlers(): void {
    ipcMain.handle('system:get-metrics', async () => {
      return await this.getSystemMetrics();
    });

    ipcMain.handle('system:start-monitoring', () => {
      this.startMonitoring();
      return { success: true };
    });

    ipcMain.handle('system:stop-monitoring', () => {
      this.stopMonitoring();
      return { success: true };
    });
  }
}

export const systemMonitor = SystemMonitor.getInstance();
