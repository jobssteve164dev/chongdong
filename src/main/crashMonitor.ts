import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// 简单的日志函数，避免跨进程导入
const log = {
  info: (message: string, data?: any, category?: string) => {
    console.log(`[INFO] [${category || 'CrashMonitor'}] ${message}`, data || '');
  },
  error: (message: string, error?: any, category?: string) => {
    console.error(`[ERROR] [${category || 'CrashMonitor'}] ${message}`, error || '');
  },
  warn: (message: string, data?: any, category?: string) => {
    console.warn(`[WARN] [${category || 'CrashMonitor'}] ${message}`, data || '');
  }
};

/**
 * 崩溃信息接口
 */
export interface CrashInfo {
  processType: 'main' | 'renderer' | 'gpu' | 'network' | 'utility';
  exitCode: number;
  reason: string;
  timestamp: number;
  details?: string;
  stack?: string;
  context?: Record<string, any>;
}

/**
 * 崩溃监控器
 * 负责监控和管理Electron应用中的各种进程崩溃
 */
export class CrashMonitor {
  private static instance: CrashMonitor;
  private crashes: CrashInfo[] = [];
  private crashLogFile: string;
  private isMonitoring = false;
  private crashCallbacks: Array<(crash: CrashInfo) => void> = [];

  private constructor() {
    this.crashLogFile = path.join(app.getPath('userData'), 'crashes.json');
    this.loadCrashHistory();
  }

  public static getInstance(): CrashMonitor {
    if (!CrashMonitor.instance) {
      CrashMonitor.instance = new CrashMonitor();
    }
    return CrashMonitor.instance;
  }

  /**
   * 开始监控
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.setupProcessHandlers();
    this.setupIpcHandlers();
    
    log.info('崩溃监控已启动', null, 'CrashMonitor');
  }

  /**
   * 停止监控
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    log.info('崩溃监控已停止', null, 'CrashMonitor');
  }

  /**
   * 设置进程处理器
   */
  private setupProcessHandlers(): void {
    // 监听渲染进程崩溃
    app.on('render-process-gone', (_event, webContents, details) => {
      this.handleProcessCrash({
        processType: 'renderer',
        exitCode: details.exitCode,
        reason: details.reason,
        timestamp: Date.now(),
        details: `渲染进程崩溃: ${details.reason}`,
        context: {
          webContentsId: webContents.id,
          url: webContents.getURL(),
          userAgent: webContents.getUserAgent()
        }
      });
    });

    // 监听GPU进程崩溃
    app.on('gpu-process-crashed', (_event, killed) => {
      this.handleProcessCrash({
        processType: 'gpu',
        exitCode: killed ? -1 : 0,
        reason: killed ? 'GPU进程被杀死' : 'GPU进程崩溃',
        timestamp: Date.now(),
        details: `GPU进程崩溃: ${killed ? '被杀死' : '意外退出'}`,
        context: {
          killed,
          gpuInfo: app.getGPUInfo('basic')
        }
      });
    });

    // 监听子进程崩溃
    app.on('child-process-gone', (_event, details) => {
      this.handleProcessCrash({
        processType: 'utility',
        exitCode: details.exitCode,
        reason: details.type,
        timestamp: Date.now(),
        details: `子进程崩溃: ${details.type}`,
        context: {
          processType: details.type,
          serviceName: details.serviceName
        }
      });
    });

    // 监听未捕获的异常
    process.on('uncaughtException', (error) => {
      this.handleProcessCrash({
        processType: 'main',
        exitCode: -1,
        reason: '未捕获的异常',
        timestamp: Date.now(),
        details: error.message,
        stack: error.stack || '',
        context: {
          error: error.toString(),
          name: error.name
        }
      });
    });

    // 监听未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      this.handleProcessCrash({
        processType: 'main',
        exitCode: -1,
        reason: '未处理的Promise拒绝',
        timestamp: Date.now(),
        details: reason?.toString() || '未知原因',
        context: {
          reason: reason?.toString(),
          promise: promise.toString()
        }
      });
    });
  }

  /**
   * 设置IPC处理器
   */
  private setupIpcHandlers(): void {
    // 处理错误报告
    ipcMain.handle('error:report', async (_event, errorData) => {
      try {
        log.error('收到错误报告', errorData, 'CrashMonitor');
        
        // 将错误转换为崩溃信息
        const crashInfo: CrashInfo = {
          processType: this.mapErrorTypeToProcess(errorData.type),
          exitCode: -1,
          reason: errorData.message,
          timestamp: errorData.timestamp || Date.now(),
          details: errorData.details,
          stack: errorData.stack,
          context: errorData.context
        };

        this.handleProcessCrash(crashInfo);
        return { success: true };
      } catch (error) {
        log.error('处理错误报告失败', error, 'CrashMonitor');
        return { success: false, error: (error as Error).message };
      }
    });

    // 获取崩溃历史
    ipcMain.handle('crash:getHistory', async () => {
      return this.crashes;
    });

    // 清除崩溃历史
    ipcMain.handle('crash:clearHistory', async () => {
      this.crashes = [];
      this.saveCrashHistory();
      return { success: true };
    });

    // 获取崩溃统计
    ipcMain.handle('crash:getStats', async () => {
      return this.getCrashStats();
    });
  }

  /**
   * 处理进程崩溃
   */
  private handleProcessCrash(crashInfo: CrashInfo): void {
    // 记录崩溃信息
    this.crashes.push(crashInfo);
    
    // 保存到文件
    this.saveCrashHistory();
    
    // 记录日志
    log.error(`进程崩溃: ${crashInfo.processType}`, {
      exitCode: crashInfo.exitCode,
      reason: crashInfo.reason,
      details: crashInfo.details,
      stack: crashInfo.stack,
      context: crashInfo.context
    }, 'CrashMonitor');

    // 通知所有回调
    this.notifyCrashCallbacks(crashInfo);

    // 发送崩溃事件到渲染进程
    this.sendCrashToRenderer(crashInfo);

    // 对于严重崩溃，尝试自动恢复
    if (this.isCriticalCrash(crashInfo)) {
      this.handleCriticalCrash(crashInfo);
    }
  }

  /**
   * 判断是否为严重崩溃
   */
  private isCriticalCrash(crashInfo: CrashInfo): boolean {
    return crashInfo.processType === 'main' || 
           crashInfo.processType === 'renderer' ||
           crashInfo.exitCode === 15; // GPU进程退出码15
  }

  /**
   * 处理严重崩溃
   */
  private handleCriticalCrash(crashInfo: CrashInfo): void {
    log.warn('检测到严重崩溃，尝试恢复', crashInfo, 'CrashMonitor');

    // 如果是渲染进程崩溃，尝试重新加载
    if (crashInfo.processType === 'renderer') {
      setTimeout(() => {
        this.reloadRendererProcess();
      }, 2000);
    }

    // 如果是主进程崩溃，记录并准备重启
    if (crashInfo.processType === 'main') {
      log.error('主进程崩溃，应用将退出', crashInfo, 'CrashMonitor');
      // 延迟退出，给日志记录时间
      setTimeout(() => {
        app.quit();
      }, 1000);
    }
  }

  /**
   * 重新加载渲染进程
   */
  private reloadRendererProcess(): void {
    try {
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(window => {
        if (!window.isDestroyed()) {
          window.reload();
          log.info('渲染进程已重新加载', null, 'CrashMonitor');
        }
      });
    } catch (error) {
      log.error('重新加载渲染进程失败', error, 'CrashMonitor');
    }
  }

  /**
   * 发送崩溃信息到渲染进程
   */
  private sendCrashToRenderer(crashInfo: CrashInfo): void {
    try {
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(window => {
        if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
          window.webContents.send('app:crash', crashInfo);
        }
      });
    } catch (error) {
      log.error('发送崩溃信息到渲染进程失败', error, 'CrashMonitor');
    }
  }

  /**
   * 通知崩溃回调
   */
  private notifyCrashCallbacks(crashInfo: CrashInfo): void {
    this.crashCallbacks.forEach(callback => {
      try {
        callback(crashInfo);
      } catch (error) {
        log.error('崩溃回调执行失败', error, 'CrashMonitor');
      }
    });
  }

  /**
   * 注册崩溃回调
   */
  public onCrash(callback: (crash: CrashInfo) => void): void {
    this.crashCallbacks.push(callback);
  }

  /**
   * 移除崩溃回调
   */
  public offCrash(callback: (crash: CrashInfo) => void): void {
    const index = this.crashCallbacks.indexOf(callback);
    if (index > -1) {
      this.crashCallbacks.splice(index, 1);
    }
  }

  /**
   * 获取崩溃历史
   */
  public getCrashHistory(): CrashInfo[] {
    return [...this.crashes];
  }

  /**
   * 清除崩溃历史
   */
  public clearCrashHistory(): void {
    this.crashes = [];
    this.saveCrashHistory();
    log.info('崩溃历史已清除', null, 'CrashMonitor');
  }

  /**
   * 获取崩溃统计信息
   */
  public getCrashStats(): {
    total: number;
    byProcessType: Record<string, number>;
    byExitCode: Record<number, number>;
    recentCrashes: number;
  } {
    const byProcessType: Record<string, number> = {};
    const byExitCode: Record<number, number> = {};
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    this.crashes.forEach(crash => {
      // 按进程类型统计
      byProcessType[crash.processType] = (byProcessType[crash.processType] || 0) + 1;
      
      // 按退出码统计
      byExitCode[crash.exitCode] = (byExitCode[crash.exitCode] || 0) + 1;
    });

    // 统计最近一小时的崩溃
    const recentCrashes = this.crashes.filter(crash => crash.timestamp > oneHourAgo).length;

    return {
      total: this.crashes.length,
      byProcessType,
      byExitCode,
      recentCrashes
    };
  }

  /**
   * 加载崩溃历史
   */
  private loadCrashHistory(): void {
    try {
      if (fs.existsSync(this.crashLogFile)) {
        const data = fs.readFileSync(this.crashLogFile, 'utf8');
        this.crashes = JSON.parse(data);
        log.info(`已加载 ${this.crashes.length} 条崩溃记录`, null, 'CrashMonitor');
      }
    } catch (error) {
      log.error('加载崩溃历史失败', error, 'CrashMonitor');
      this.crashes = [];
    }
  }

  /**
   * 保存崩溃历史
   */
  private saveCrashHistory(): void {
    try {
      // 只保留最近1000条记录
      const recentCrashes = this.crashes.slice(-1000);
      fs.writeFileSync(this.crashLogFile, JSON.stringify(recentCrashes, null, 2));
    } catch (error) {
      log.error('保存崩溃历史失败', error, 'CrashMonitor');
    }
  }

  /**
   * 映射错误类型到进程类型
   */
  private mapErrorTypeToProcess(errorType: string): CrashInfo['processType'] {
    switch (errorType) {
      case 'renderer_crash': return 'renderer';
      case 'gpu_crash': return 'gpu';
      case 'network_crash': return 'network';
      case 'proxy_crash': return 'utility';
      case 'dns_error': return 'utility';
      case 'config_error': return 'main';
      case 'storage_error': return 'main';
      case 'ipc_error': return 'main';
      default: return 'main';
    }
  }

  /**
   * 检查应用健康状态
   */
  public checkAppHealth(): {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getCrashStats();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 检查最近一小时的崩溃
    if (stats.recentCrashes > 5) {
      issues.push(`最近一小时发生了 ${stats.recentCrashes} 次崩溃`);
      recommendations.push('建议重启应用或检查系统资源');
    }

    // 检查GPU进程崩溃
    if (stats.byProcessType['gpu'] && stats.byProcessType['gpu'] > 0) {
      issues.push('检测到GPU进程崩溃');
      recommendations.push('建议更新显卡驱动或禁用硬件加速');
    }

    // 检查渲染进程崩溃
    if (stats.byProcessType['renderer'] && stats.byProcessType['renderer'] > 0) {
      issues.push('检测到渲染进程崩溃');
      recommendations.push('建议检查内存使用情况或重启应用');
    }

    // 检查主进程崩溃
    if (stats.byProcessType['main'] && stats.byProcessType['main'] > 0) {
      issues.push('检测到主进程崩溃');
      recommendations.push('建议检查系统稳定性或重新安装应用');
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }
}

export const crashMonitor = CrashMonitor.getInstance();
