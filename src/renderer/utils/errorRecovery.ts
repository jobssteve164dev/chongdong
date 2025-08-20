// 移除循环依赖，直接定义枚举
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

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

import { log } from './logger';

/**
 * 错误恢复策略接口
 */
export interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  errorTypes: ErrorType[];
  severity: ErrorSeverity[];
  autoExecute: boolean;
  execute: () => Promise<boolean>;
  rollback?: () => Promise<void>;
}

/**
 * 错误恢复管理器
 * 负责自动检测和修复常见的应用错误
 */
export class ErrorRecoveryManager {
  private static instance: ErrorRecoveryManager;
  private strategies: Map<string, RecoveryStrategy> = new Map();
  private recoveryHistory: Array<{
    strategyId: string;
    timestamp: number;
    success: boolean;
    error?: string;
  }> = [];

  private constructor() {
    this.registerDefaultStrategies();
  }

  public static getInstance(): ErrorRecoveryManager {
    if (!ErrorRecoveryManager.instance) {
      ErrorRecoveryManager.instance = new ErrorRecoveryManager();
    }
    return ErrorRecoveryManager.instance;
  }

  /**
   * 注册默认的恢复策略
   */
  private registerDefaultStrategies(): void {
    // DNS错误恢复策略
    this.registerStrategy({
      id: 'dns-recovery',
      name: 'DNS配置恢复',
      description: '重置DNS配置为默认值',
      errorTypes: [ErrorType.DNS_ERROR],
      severity: [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH],
      autoExecute: true,
      execute: async () => {
        try {
          log.info('执行DNS配置恢复', null, 'ErrorRecovery');
          
          // 重置DNS相关设置
          const defaultSettings = {
            enableDns: false,
            dnsServer: '8.8.8.8',
            enableDoh: false,
            dohServer: 'https://dns.google/dns-query',
            enableDot: false,
            dotServer: 'tls://1.1.1.1:853',
            enableDnsCache: true,
            dnsCacheSize: 1000,
            dnsCacheTtl: 300,
            enableDnsLoadBalance: true,
            dnsServers: ['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1'],
            enableDnsLogging: false,
            enableDnsLeakProtection: true,
            dnsLeakProtectionMode: 'strict',
            enableDnsRules: true,
            dnsRules: [],
            enableDnsFallback: true,
            dnsFallbackServers: ['114.114.114.114', '223.5.5.5']
          };

          // 更新设置
          if (window.electron?.ipcRenderer) {
            await window.electron.ipcRenderer.invoke('settings:updated', {
              settings: defaultSettings
            });
          }

          log.info('DNS配置恢复完成', null, 'ErrorRecovery');
          return true;
        } catch (error) {
          log.error('DNS配置恢复失败', error, 'ErrorRecovery');
          return false;
        }
      }
    });

    // 代理错误恢复策略
    this.registerStrategy({
      id: 'proxy-recovery',
      name: '代理服务恢复',
      description: '重启代理服务',
      errorTypes: [ErrorType.PROXY_CRASH],
      severity: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
      autoExecute: true,
      execute: async () => {
        try {
          log.info('执行代理服务恢复', null, 'ErrorRecovery');
          
          // 停止所有代理
          if (window.electron?.ipcRenderer) {
            await window.electron.ipcRenderer.invoke('proxy:stopAll');
            
            // 等待一秒后重新启动
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            await window.electron.ipcRenderer.invoke('proxy:startAll');
          }

          log.info('代理服务恢复完成', null, 'ErrorRecovery');
          return true;
        } catch (error) {
          log.error('代理服务恢复失败', error, 'ErrorRecovery');
          return false;
        }
      }
    });

    // 配置错误恢复策略
    this.registerStrategy({
      id: 'config-recovery',
      name: '配置恢复',
      description: '重置配置为默认值',
      errorTypes: [ErrorType.CONFIG_ERROR],
      severity: [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH],
      autoExecute: false, // 需要用户确认
      execute: async () => {
        try {
          log.info('执行配置恢复', null, 'ErrorRecovery');
          
          // 重置为默认配置
          if (window.electron?.ipcRenderer) {
            await window.electron.ipcRenderer.invoke('settings:resetToDefault');
          }

          log.info('配置恢复完成', null, 'ErrorRecovery');
          return true;
        } catch (error) {
          log.error('配置恢复失败', error, 'ErrorRecovery');
          return false;
        }
      }
    });

    // 存储错误恢复策略
    this.registerStrategy({
      id: 'storage-recovery',
      name: '存储恢复',
      description: '清理和重建存储',
      errorTypes: [ErrorType.STORAGE_ERROR],
      severity: [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH],
      autoExecute: false, // 需要用户确认
      execute: async () => {
        try {
          log.info('执行存储恢复', null, 'ErrorRecovery');
          
          // 清理本地存储
          localStorage.clear();
          sessionStorage.clear();
          
          // 重新初始化存储
          if (window.electron?.ipcRenderer) {
            await window.electron.ipcRenderer.invoke('storage:reinitialize');
          }

          log.info('存储恢复完成', null, 'ErrorRecovery');
          return true;
        } catch (error) {
          log.error('存储恢复失败', error, 'ErrorRecovery');
          return false;
        }
      }
    });

    // IPC错误恢复策略
    this.registerStrategy({
      id: 'ipc-recovery',
      name: '进程通信恢复',
      description: '重新建立进程间通信',
      errorTypes: [ErrorType.IPC_ERROR],
      severity: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
      autoExecute: true,
      execute: async () => {
        try {
          log.info('执行IPC恢复', null, 'ErrorRecovery');
          
          // 重新加载页面以重建IPC连接
          window.location.reload();

          return true;
        } catch (error) {
          log.error('IPC恢复失败', error, 'ErrorRecovery');
          return false;
        }
      }
    });
  }

  /**
   * 注册恢复策略
   */
  public registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.set(strategy.id, strategy);
    log.info(`注册错误恢复策略: ${strategy.name}`, null, 'ErrorRecovery');
  }

  /**
   * 获取恢复策略
   */
  public getStrategy(strategyId: string): RecoveryStrategy | undefined {
    return this.strategies.get(strategyId);
  }

  /**
   * 获取所有恢复策略
   */
  public getAllStrategies(): RecoveryStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * 获取适用于特定错误的恢复策略
   */
  public getStrategiesForError(errorType: ErrorType, severity: ErrorSeverity): RecoveryStrategy[] {
    return Array.from(this.strategies.values()).filter(strategy => 
      strategy.errorTypes.includes(errorType) && 
      strategy.severity.includes(severity)
    );
  }

  /**
   * 自动执行恢复策略
   */
  public async autoRecover(errorType: ErrorType, severity: ErrorSeverity): Promise<boolean> {
    const strategies = this.getStrategiesForError(errorType, severity);
    const autoStrategies = strategies.filter(s => s.autoExecute);

    if (autoStrategies.length === 0) {
      log.info('没有找到自动恢复策略', { errorType, severity }, 'ErrorRecovery');
      return false;
    }

    log.info(`开始自动恢复，找到 ${autoStrategies.length} 个策略`, null, 'ErrorRecovery');

    for (const strategy of autoStrategies) {
      try {
        const success = await strategy.execute();
        
        this.recordRecoveryAttempt(strategy.id, success);
        
        if (success) {
          log.info(`自动恢复成功: ${strategy.name}`, null, 'ErrorRecovery');
          return true;
        } else {
          log.warn(`自动恢复失败: ${strategy.name}`, null, 'ErrorRecovery');
        }
      } catch (error) {
        log.error(`自动恢复执行错误: ${strategy.name}`, error, 'ErrorRecovery');
        this.recordRecoveryAttempt(strategy.id, false, error.message);
      }
    }

    return false;
  }

  /**
   * 手动执行恢复策略
   */
  public async executeStrategy(strategyId: string): Promise<boolean> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      log.error(`恢复策略不存在: ${strategyId}`, null, 'ErrorRecovery');
      return false;
    }

    try {
      log.info(`执行恢复策略: ${strategy.name}`, null, 'ErrorRecovery');
      const success = await strategy.execute();
      this.recordRecoveryAttempt(strategyId, success);
      return success;
    } catch (error) {
      log.error(`执行恢复策略失败: ${strategy.name}`, error, 'ErrorRecovery');
      this.recordRecoveryAttempt(strategyId, false, error.message);
      return false;
    }
  }

  /**
   * 回滚恢复策略
   */
  public async rollbackStrategy(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy || !strategy.rollback) {
      log.warn(`无法回滚策略: ${strategyId}`, null, 'ErrorRecovery');
      return;
    }

    try {
      log.info(`回滚恢复策略: ${strategy.name}`, null, 'ErrorRecovery');
      await strategy.rollback();
    } catch (error) {
      log.error(`回滚恢复策略失败: ${strategy.name}`, error, 'ErrorRecovery');
    }
  }

  /**
   * 记录恢复尝试
   */
  private recordRecoveryAttempt(strategyId: string, success: boolean, error?: string): void {
    this.recoveryHistory.push({
      strategyId,
      timestamp: Date.now(),
      success,
      error
    });

    // 只保留最近100条记录
    if (this.recoveryHistory.length > 100) {
      this.recoveryHistory = this.recoveryHistory.slice(-100);
    }
  }

  /**
   * 获取恢复历史
   */
  public getRecoveryHistory(): Array<{
    strategyId: string;
    timestamp: number;
    success: boolean;
    error?: string;
  }> {
    return [...this.recoveryHistory];
  }

  /**
   * 获取恢复统计信息
   */
  public getRecoveryStats(): {
    totalAttempts: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    successRate: number;
    byStrategy: Record<string, { attempts: number; successes: number; failures: number }>;
  } {
    const byStrategy: Record<string, { attempts: number; successes: number; failures: number }> = {};

    this.recoveryHistory.forEach(record => {
      if (!byStrategy[record.strategyId]) {
        byStrategy[record.strategyId] = { attempts: 0, successes: 0, failures: 0 };
      }
      
      byStrategy[record.strategyId].attempts++;
      if (record.success) {
        byStrategy[record.strategyId].successes++;
      } else {
        byStrategy[record.strategyId].failures++;
      }
    });

    const totalAttempts = this.recoveryHistory.length;
    const successfulRecoveries = this.recoveryHistory.filter(r => r.success).length;
    const failedRecoveries = totalAttempts - successfulRecoveries;
    const successRate = totalAttempts > 0 ? (successfulRecoveries / totalAttempts) * 100 : 0;

    return {
      totalAttempts,
      successfulRecoveries,
      failedRecoveries,
      successRate,
      byStrategy
    };
  }

  /**
   * 清除恢复历史
   */
  public clearRecoveryHistory(): void {
    this.recoveryHistory = [];
    log.info('恢复历史已清除', null, 'ErrorRecovery');
  }

  /**
   * 检查应用健康状态
   */
  public checkAppHealth(): {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getRecoveryStats();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 检查恢复成功率
    if (stats.totalAttempts > 0 && stats.successRate < 50) {
      issues.push(`错误恢复成功率较低: ${stats.successRate.toFixed(1)}%`);
      recommendations.push('建议检查系统配置或重启应用');
    }

    // 检查频繁的恢复尝试
    if (stats.totalAttempts > 10) {
      issues.push(`检测到频繁的错误恢复尝试: ${stats.totalAttempts} 次`);
      recommendations.push('建议检查应用配置或系统环境');
    }

    // 检查特定策略的失败率
    Object.entries(stats.byStrategy).forEach(([strategyId, strategyStats]) => {
      if (strategyStats.attempts > 5 && (strategyStats.failures / strategyStats.attempts) > 0.7) {
        const strategy = this.strategies.get(strategyId);
        issues.push(`${strategy?.name || strategyId} 恢复失败率较高`);
        recommendations.push(`建议手动检查 ${strategy?.description || '相关配置'}`);
      }
    });

    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }
}

export const errorRecoveryManager = ErrorRecoveryManager.getInstance();
