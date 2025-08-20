import { log } from './logger';
import { errorRecoveryManager } from './errorRecovery';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  RENDERER_CRASH = 'renderer_crash',
  GPU_CRASH = 'gpu_crash',
  NETWORK_CRASH = 'network_crash',
  PROXY_CRASH = 'proxy_crash',
  DNS_ERROR = 'dns_error',
  CONFIG_ERROR = 'config_error',
  STORAGE_ERROR = 'storage_error',
  IPC_ERROR = 'ipc_error',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * 错误严重程度枚举
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 错误信息接口
 */
export interface ErrorInfo {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  stack?: string;
  timestamp: number;
  context?: Record<string, any>;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

/**
 * 错误处理器
 * 负责捕获、记录和处理应用中的各种错误
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errors: Map<string, ErrorInfo> = new Map();
  private errorCallbacks: Array<(error: ErrorInfo) => void> = [];
  private crashReportQueue: ErrorInfo[] = [];
  private isReporting = false;

  private constructor() {
    this.setupGlobalErrorHandlers();
    this.setupUnhandledRejectionHandler();
    this.setupProcessErrorHandlers();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalErrorHandlers(): void {
    // 捕获JavaScript运行时错误
    window.addEventListener('error', (event) => {
      this.handleError({
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.HIGH,
        message: event.message || 'JavaScript运行时错误',
        details: `文件: ${event.filename}, 行: ${event.lineno}, 列: ${event.colno}`,
        stack: event.error?.stack,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        }
      });
    });

    // 捕获Promise未处理的拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: 'Promise未处理的拒绝',
        details: event.reason?.toString() || '未知原因',
        context: {
          reason: event.reason
        }
      });
    });
  }

  /**
   * 设置未处理拒绝处理器
   */
  private setupUnhandledRejectionHandler(): void {
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault();
      this.handleError({
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: '未处理的Promise拒绝',
        details: event.reason?.toString() || '未知原因',
        context: {
          reason: event.reason
        }
      });
    });
  }

  /**
   * 设置进程错误处理器
   */
  private setupProcessErrorHandlers(): void {
    // 监听主进程发送的错误信息
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('app:error', (error: any) => {
        this.handleError({
          type: this.mapErrorType(error.type),
          severity: this.mapErrorSeverity(error.severity),
          message: error.message || '主进程错误',
          details: error.details,
          stack: error.stack,
          context: error.context
        });
      });

      // 监听进程崩溃事件
      window.electron.ipcRenderer.on('app:crash', (crashInfo: any) => {
        this.handleError({
          type: this.mapCrashType(crashInfo.processType),
          severity: ErrorSeverity.CRITICAL,
          message: `${crashInfo.processType}进程崩溃`,
          details: `退出码: ${crashInfo.exitCode}, 原因: ${crashInfo.reason}`,
          context: crashInfo
        });
      });

      // 监听网络服务崩溃
      window.electron.ipcRenderer.on('network:crash', (crashInfo: any) => {
        this.handleError({
          type: ErrorType.NETWORK_CRASH,
          severity: ErrorSeverity.HIGH,
          message: '网络服务崩溃',
          details: crashInfo.details || '网络服务意外停止',
          context: crashInfo
        });
      });
    }
  }

  /**
   * 处理错误
   */
  public handleError(errorData: Omit<ErrorInfo, 'id' | 'timestamp' | 'resolved'>): string {
    const errorId = this.generateErrorId();
    const error: ErrorInfo = {
      ...errorData,
      id: errorId,
      timestamp: Date.now(),
      resolved: false
    };

    // 记录错误
    this.errors.set(errorId, error);
    
    // 记录到日志
    log.error(`错误 [${errorId}]: ${error.message}`, {
      type: error.type,
      severity: error.severity,
      details: error.details,
      stack: error.stack,
      context: error.context
    }, 'ErrorHandler');

    // 通知错误回调
    this.notifyErrorCallbacks(error);

    // 尝试自动恢复
    this.attemptAutoRecovery(error);

    // 对于严重错误，立即尝试报告
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.reportError(error);
    } else {
      // 将错误加入报告队列
      this.crashReportQueue.push(error);
    }

    return errorId;
  }

  /**
   * 处理DNS相关错误
   */
  public handleDnsError(error: Error, context?: Record<string, any>): string {
    return this.handleError({
      type: ErrorType.DNS_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: 'DNS解析错误',
      details: error.message,
      stack: error.stack,
      context: {
        ...context,
        originalError: error
      }
    });
  }

  /**
   * 处理代理相关错误
   */
  public handleProxyError(error: Error, context?: Record<string, any>): string {
    return this.handleError({
      type: ErrorType.PROXY_CRASH,
      severity: ErrorSeverity.HIGH,
      message: '代理服务错误',
      details: error.message,
      stack: error.stack,
      context: {
        ...context,
        originalError: error
      }
    });
  }

  /**
   * 处理配置相关错误
   */
  public handleConfigError(error: Error, context?: Record<string, any>): string {
    return this.handleError({
      type: ErrorType.CONFIG_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: '配置错误',
      details: error.message,
      stack: error.stack,
      context: {
        ...context,
        originalError: error
      }
    });
  }

  /**
   * 处理存储相关错误
   */
  public handleStorageError(error: Error, context?: Record<string, any>): string {
    return this.handleError({
      type: ErrorType.STORAGE_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: '存储错误',
      details: error.message,
      stack: error.stack,
      context: {
        ...context,
        originalError: error
      }
    });
  }

  /**
   * 处理IPC通信错误
   */
  public handleIpcError(error: Error, context?: Record<string, any>): string {
    return this.handleError({
      type: ErrorType.IPC_ERROR,
      severity: ErrorSeverity.HIGH,
      message: '进程间通信错误',
      details: error.message,
      stack: error.stack,
      context: {
        ...context,
        originalError: error
      }
    });
  }

  /**
   * 标记错误为已解决
   */
  public resolveError(errorId: string, resolvedBy: string = 'system'): boolean {
    const error = this.errors.get(errorId);
    if (error) {
      error.resolved = true;
      error.resolvedAt = Date.now();
      error.resolvedBy = resolvedBy;
      
      log.info(`错误 [${errorId}] 已解决`, { resolvedBy }, 'ErrorHandler');
      return true;
    }
    return false;
  }

  /**
   * 获取所有错误
   */
  public getAllErrors(): ErrorInfo[] {
    return Array.from(this.errors.values());
  }

  /**
   * 获取未解决的错误
   */
  public getUnresolvedErrors(): ErrorInfo[] {
    return Array.from(this.errors.values()).filter(error => !error.resolved);
  }

  /**
   * 获取特定类型的错误
   */
  public getErrorsByType(type: ErrorType): ErrorInfo[] {
    return Array.from(this.errors.values()).filter(error => error.type === type);
  }

  /**
   * 获取特定严重程度的错误
   */
  public getErrorsBySeverity(severity: ErrorSeverity): ErrorInfo[] {
    return Array.from(this.errors.values()).filter(error => error.severity === severity);
  }

  /**
   * 清除已解决的错误
   */
  public clearResolvedErrors(): void {
    const resolvedErrors = Array.from(this.errors.entries()).filter(([_, error]) => error.resolved);
    resolvedErrors.forEach(([id, _]) => this.errors.delete(id));
    
    log.info(`已清除 ${resolvedErrors.length} 个已解决的错误`, null, 'ErrorHandler');
  }

  /**
   * 清除所有错误
   */
  public clearAllErrors(): void {
    const count = this.errors.size;
    this.errors.clear();
    
    log.info(`已清除所有 ${count} 个错误`, null, 'ErrorHandler');
  }

  /**
   * 注册错误回调
   */
  public onError(callback: (error: ErrorInfo) => void): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * 移除错误回调
   */
  public offError(callback: (error: ErrorInfo) => void): void {
    const index = this.errorCallbacks.indexOf(callback);
    if (index > -1) {
      this.errorCallbacks.splice(index, 1);
    }
  }

  /**
   * 通知错误回调
   */
  private notifyErrorCallbacks(error: ErrorInfo): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        log.error('错误回调执行失败', callbackError, 'ErrorHandler');
      }
    });
  }

  /**
   * 报告错误
   */
  private async reportError(error: ErrorInfo): Promise<void> {
    if (this.isReporting) {
      return;
    }

    this.isReporting = true;
    
    try {
      // 发送错误报告到主进程
      if (window.electron?.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('error:report', {
          errorId: error.id,
          type: error.type,
          severity: error.severity,
          message: error.message,
          details: error.details,
          stack: error.stack,
          context: error.context,
          timestamp: error.timestamp
        });
      }

      log.info(`错误报告已发送: ${error.id}`, null, 'ErrorHandler');
    } catch (reportError) {
      log.error('发送错误报告失败', reportError, 'ErrorHandler');
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * 生成错误ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 映射错误类型
   */
  private mapErrorType(type: string): ErrorType {
    switch (type) {
      case 'renderer_crash': return ErrorType.RENDERER_CRASH;
      case 'gpu_crash': return ErrorType.GPU_CRASH;
      case 'network_crash': return ErrorType.NETWORK_CRASH;
      case 'proxy_crash': return ErrorType.PROXY_CRASH;
      case 'dns_error': return ErrorType.DNS_ERROR;
      case 'config_error': return ErrorType.CONFIG_ERROR;
      case 'storage_error': return ErrorType.STORAGE_ERROR;
      case 'ipc_error': return ErrorType.IPC_ERROR;
      default: return ErrorType.UNKNOWN_ERROR;
    }
  }

  /**
   * 映射错误严重程度
   */
  private mapErrorSeverity(severity: string): ErrorSeverity {
    switch (severity) {
      case 'low': return ErrorSeverity.LOW;
      case 'medium': return ErrorSeverity.MEDIUM;
      case 'high': return ErrorSeverity.HIGH;
      case 'critical': return ErrorSeverity.CRITICAL;
      default: return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * 映射崩溃类型
   */
  private mapCrashType(processType: string): ErrorType {
    switch (processType) {
      case 'renderer': return ErrorType.RENDERER_CRASH;
      case 'gpu': return ErrorType.GPU_CRASH;
      case 'network': return ErrorType.NETWORK_CRASH;
      default: return ErrorType.UNKNOWN_ERROR;
    }
  }

  /**
   * 尝试自动恢复
   */
  private async attemptAutoRecovery(error: ErrorInfo): Promise<void> {
    try {
      const success = await errorRecoveryManager.autoRecover(error.type, error.severity);
      if (success) {
        log.info(`错误自动恢复成功: ${error.id}`, null, 'ErrorHandler');
        // 标记错误为已解决
        this.resolveError(error.id, 'auto-recovery');
      } else {
        log.info(`错误自动恢复失败: ${error.id}`, null, 'ErrorHandler');
      }
    } catch (recoveryError) {
      log.error(`自动恢复过程中发生错误: ${error.id}`, recoveryError, 'ErrorHandler');
    }
  }

  /**
   * 获取错误统计信息
   */
  public getErrorStats(): {
    total: number;
    resolved: number;
    unresolved: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
  } {
    const errors = Array.from(this.errors.values());
    const byType: Record<ErrorType, number> = {} as any;
    const bySeverity: Record<ErrorSeverity, number> = {} as any;

    // 初始化计数
    Object.values(ErrorType).forEach(type => byType[type] = 0);
    Object.values(ErrorSeverity).forEach(severity => bySeverity[severity] = 0);

    // 统计
    errors.forEach(error => {
      byType[error.type]++;
      bySeverity[error.severity]++;
    });

    return {
      total: errors.length,
      resolved: errors.filter(e => e.resolved).length,
      unresolved: errors.filter(e => !e.resolved).length,
      byType,
      bySeverity
    };
  }
}

export const errorHandler = ErrorHandler.getInstance();
