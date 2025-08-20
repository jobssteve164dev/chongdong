import { AppSettings } from '../../shared/types';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
  category: string;
}

/**
 * 日志配置接口
 */
export interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableStorage: boolean;
  maxEntries: number;
  categories: string[];
}

/**
 * 日志管理器
 */
export class Logger {
  private static instance: Logger;
  private config: LogConfig;
  private logs: LogEntry[] = [];
  private isInitialized = false;

  private constructor() {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      enableStorage: true,
      maxEntries: 1000,
      categories: ['default']
    };
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * 初始化日志系统
   */
  public initialize(config?: Partial<LogConfig>): void {
    if (this.isInitialized) {
      return;
    }

    if (config) {
      this.config = { ...this.config, ...config };
    }

    // 加载历史日志
    this.loadLogs();

    this.isInitialized = true;
    this.info('日志系统已初始化', { config: this.config });
  }

  /**
   * 设置日志级别
   */
  public setLevel(level: LogLevel): void {
    this.config.level = level;
    this.info('日志级别已更新', { level });
  }

  /**
   * 添加日志类别
   */
  public addCategory(category: string): void {
    if (!this.config.categories.includes(category)) {
      this.config.categories.push(category);
    }
  }

  /**
   * 记录调试日志
   */
  public debug(message: string, data?: any, category?: string): void {
    this.log(LogLevel.DEBUG, message, data, category);
  }

  /**
   * 记录信息日志
   */
  public info(message: string, data?: any, category?: string): void {
    this.log(LogLevel.INFO, message, data, category);
  }

  /**
   * 记录警告日志
   */
  public warn(message: string, data?: any, category?: string): void {
    this.log(LogLevel.WARN, message, data, category);
  }

  /**
   * 记录错误日志
   */
  public error(message: string, data?: any, category?: string): void {
    this.log(LogLevel.ERROR, message, data, category);
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, data?: any, category?: string): void {
    // 检查日志级别
    if (this.getLevelPriority(level) < this.getLevelPriority(this.config.level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
      category: category || 'default'
    };

    // 添加到内存
    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(-this.config.maxEntries);
    }

    // 控制台输出
    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    // 文件输出
    if (this.config.enableFile) {
      this.writeToFile(entry);
    }

    // 存储输出
    if (this.config.enableStorage) {
      this.saveToStorage(entry);
    }
  }

  /**
   * 获取日志级别优先级
   */
  private getLevelPriority(level: LogLevel): number {
    switch (level) {
      case LogLevel.DEBUG: return 0;
      case LogLevel.INFO: return 1;
      case LogLevel.WARN: return 2;
      case LogLevel.ERROR: return 3;
      default: return 1;
    }
  }

  /**
   * 写入控制台
   */
  private writeToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.data || '');
        break;
    }
  }

  /**
   * 写入文件
   */
  private writeToFile(entry: LogEntry): void {
    // 文件写入功能待实现
    // 这里可以集成文件系统API
  }

  /**
   * 保存到存储
   */
  private saveToStorage(entry: LogEntry): void {
    try {
      const storageKey = 'chongdong_logs';
      const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      existingLogs.push(entry);
      
      // 限制存储中的日志数量
      if (existingLogs.length > this.config.maxEntries) {
        existingLogs.splice(0, existingLogs.length - this.config.maxEntries);
      }
      
      localStorage.setItem(storageKey, JSON.stringify(existingLogs));
    } catch (error) {
      console.error('保存日志到存储失败:', error);
    }
  }

  /**
   * 加载历史日志
   */
  private loadLogs(): void {
    try {
      const storageKey = 'chongdong_logs';
      const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      this.logs = existingLogs;
    } catch (error) {
      console.error('加载历史日志失败:', error);
      this.logs = [];
    }
  }

  /**
   * 获取所有日志
   */
  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 获取指定级别的日志
   */
  public getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * 获取指定类别的日志
   */
  public getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * 获取指定时间范围的日志
   */
  public getLogsByTimeRange(startTime: number, endTime: number): LogEntry[] {
    return this.logs.filter(log => log.timestamp >= startTime && log.timestamp <= endTime);
  }

  /**
   * 清除所有日志
   */
  public clearLogs(): void {
    this.logs = [];
    try {
      localStorage.removeItem('chongdong_logs');
    } catch (error) {
      console.error('清除存储日志失败:', error);
    }
  }

  /**
   * 导出日志
   */
  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 获取日志统计信息
   */
  public getLogStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<string, number>;
    recentLogs: number;
  } {
    const byLevel: Record<LogLevel, number> = {} as any;
    const byCategory: Record<string, number> = {};
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // 初始化级别统计
    Object.values(LogLevel).forEach(level => {
      byLevel[level] = 0;
    });

    this.logs.forEach(log => {
      byLevel[log.level]++;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    });

    const recentLogs = this.logs.filter(log => log.timestamp > oneHourAgo).length;

    return {
      total: this.logs.length,
      byLevel,
      byCategory,
      recentLogs
    };
  }
}

// 创建全局日志实例
export const log = Logger.getInstance();

// 初始化日志系统
log.initialize();
