// 日志级别
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// 日志配置
interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageLogs: number;
}

// 日志条目
interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
  category?: string;
}

// 日志工具类
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logs: LogEntry[] = [];

  private constructor() {
    this.config = {
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableStorage: true,
      maxStorageLogs: 1000,
    };
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * 设置日志配置
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 记录调试日志
   */
  debug(message: string, data?: any, category?: string): void {
    this.log(LogLevel.DEBUG, message, data, category);
  }

  /**
   * 记录信息日志
   */
  info(message: string, data?: any, category?: string): void {
    this.log(LogLevel.INFO, message, data, category);
  }

  /**
   * 记录警告日志
   */
  warn(message: string, data?: any, category?: string): void {
    this.log(LogLevel.WARN, message, data, category);
  }

  /**
   * 记录错误日志
   */
  error(message: string, data?: any, category?: string): void {
    this.log(LogLevel.ERROR, message, data, category);
  }

  /**
   * 内部日志记录方法
   */
  private log(level: LogLevel, message: string, data?: any, category?: string): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
      category,
    };

    // 添加到内存日志
    this.logs.push(entry);

    // 限制内存日志数量
    if (this.logs.length > this.config.maxStorageLogs) {
      this.logs = this.logs.slice(-this.config.maxStorageLogs);
    }

    // 控制台输出
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // 存储日志
    if (this.config.enableStorage) {
      this.saveToStorage(entry);
    }
  }

  /**
   * 输出到控制台
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelStr = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${levelStr}]`;
    const categoryStr = entry.category ? ` [${entry.category}]` : '';

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`${prefix}${categoryStr} ${entry.message}`, entry.data);
        break;
      case LogLevel.INFO:
        console.info(`${prefix}${categoryStr} ${entry.message}`, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(`${prefix}${categoryStr} ${entry.message}`, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(`${prefix}${categoryStr} ${entry.message}`, entry.data);
        break;
    }
  }

  /**
   * 保存到本地存储
   */
  private saveToStorage(entry: LogEntry): void {
    try {
      const storageKey = 'chongdong_logs';
      const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existingLogs.push(entry);

      // 限制存储的日志数量
      if (existingLogs.length > this.config.maxStorageLogs) {
        existingLogs.splice(0, existingLogs.length - this.config.maxStorageLogs);
      }

      localStorage.setItem(storageKey, JSON.stringify(existingLogs));
    } catch (error) {
      console.error('Failed to save log to storage:', error);
    }
  }

  /**
   * 获取所有日志
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 获取指定级别的日志
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level >= level);
  }

  /**
   * 获取指定分类的日志
   */
  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.logs = [];
    try {
      localStorage.removeItem('chongdong_logs');
    } catch (error) {
      console.error('Failed to clear logs from storage:', error);
    }
  }

  /**
   * 导出日志
   */
  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// 创建全局日志实例
export const logger = Logger.getInstance();

// 便捷的日志函数
export const log = {
  debug: (message: string, data?: any, category?: string) => logger.debug(message, data, category),
  info: (message: string, data?: any, category?: string) => logger.info(message, data, category),
  warn: (message: string, data?: any, category?: string) => logger.warn(message, data, category),
  error: (message: string, data?: any, category?: string) => logger.error(message, data, category),
};
