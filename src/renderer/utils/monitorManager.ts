import { TrafficStats, ConnectionStatus } from '../../shared/types';
import { log } from './logger';

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkUsage: number;
  diskUsage: number;
  timestamp: number;
}

export interface ConnectionHistory {
  id: string;
  server: string;
  protocol: string;
  startTime: number;
  endTime?: number;
  duration: number;
  upload: number;
  download: number;
  status: 'active' | 'completed' | 'failed';
  error?: string;
}

export interface PerformanceMetrics {
  latency: number;
  throughput: number;
  packetLoss: number;
  jitter: number;
  timestamp: number;
}

export class MonitorManager {
  private static instance: MonitorManager;
  private trafficStats: TrafficStats = {
    upload: 0,
    download: 0,
    uploadSpeed: 0,
    downloadSpeed: 0,
    timestamp: Date.now()
  };
  private connectionStatus: ConnectionStatus = {
    connected: false,
    upload: 0,
    download: 0,
    uploadSpeed: 0,
    downloadSpeed: 0
  };
  private systemMetrics: SystemMetrics = {
    cpuUsage: 0,
    memoryUsage: 0,
    networkUsage: 0,
    diskUsage: 0,
    timestamp: Date.now()
  };
  private connectionHistory: ConnectionHistory[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  private constructor() {}

  public static getInstance(): MonitorManager {
    if (!MonitorManager.instance) {
      MonitorManager.instance = new MonitorManager();
    }
    return MonitorManager.instance;
  }

  /**
   * 开始监控
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.updateInterval = setInterval(() => {
      this.updateMetrics();
    }, 1000); // 每秒更新一次

    log.info('开始监控', null, 'MonitorManager');
  }

  /**
   * 停止监控
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    log.info('停止监控', null, 'MonitorManager');
  }

  /**
   * 获取流量统计
   */
  public getTrafficStats(): TrafficStats {
    return { ...this.trafficStats };
  }

  /**
   * 获取连接状态
   */
  public getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * 获取系统指标
   */
  public getSystemMetrics(): SystemMetrics {
    return { ...this.systemMetrics };
  }

  /**
   * 获取连接历史
   */
  public getConnectionHistory(limit: number = 100): ConnectionHistory[] {
    return this.connectionHistory
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  /**
   * 获取性能指标
   */
  public getPerformanceMetrics(limit: number = 100): PerformanceMetrics[] {
    return this.performanceMetrics
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * 更新连接状态
   */
  public updateConnectionStatus(status: Partial<ConnectionStatus>): void {
    this.connectionStatus = {
      ...this.connectionStatus,
      ...status
    };

    // 如果连接状态发生变化，记录到历史
    if (status.connected !== undefined && status.connected !== this.connectionStatus.connected) {
      if (status.connected) {
        this.addConnectionHistory({
          id: this.generateId(),
          server: status.currentServer || 'Unknown',
          protocol: 'unknown',
          startTime: Date.now(),
          duration: 0,
          upload: 0,
          download: 0,
          status: 'active'
        });
      } else {
        // 结束当前连接
        const activeConnection = this.connectionHistory.find(c => c.status === 'active');
        if (activeConnection) {
          activeConnection.endTime = Date.now();
          activeConnection.duration = activeConnection.endTime - activeConnection.startTime;
          activeConnection.status = 'completed';
          activeConnection.upload = this.connectionStatus.upload;
          activeConnection.download = this.connectionStatus.download;
        }
      }
    }
  }

  /**
   * 更新流量统计
   */
  public updateTrafficStats(stats: Partial<TrafficStats>): void {
    this.trafficStats = {
      ...this.trafficStats,
      ...stats,
      timestamp: Date.now()
    };
  }

  /**
   * 添加连接历史
   */
  public addConnectionHistory(history: ConnectionHistory): void {
    this.connectionHistory.push(history);
    
    // 限制历史记录数量
    if (this.connectionHistory.length > 1000) {
      this.connectionHistory = this.connectionHistory.slice(-500);
    }
  }

  /**
   * 添加性能指标
   */
  public addPerformanceMetrics(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    const performanceMetric: PerformanceMetrics = {
      ...metrics,
      timestamp: Date.now()
    };

    this.performanceMetrics.push(performanceMetric);
    
    // 限制性能指标数量
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-500);
    }
  }

  /**
   * 更新指标
   */
  private updateMetrics(): void {
    // 更新系统指标
    this.updateSystemMetrics();
    
    // 更新性能指标
    this.updatePerformanceMetrics();
  }

  /**
   * 更新系统指标
   */
  private updateSystemMetrics(): void {
    // 这里应该调用系统API获取真实的系统指标
    // 目前使用模拟数据
    this.systemMetrics = {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      networkUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      timestamp: Date.now()
    };
  }

  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(): void {
    if (!this.connectionStatus.connected) {
      return;
    }

    // 模拟性能指标
    const metrics: Omit<PerformanceMetrics, 'timestamp'> = {
      latency: Math.random() * 100 + 10, // 10-110ms
      throughput: Math.random() * 1000 + 100, // 100-1100 Mbps
      packetLoss: Math.random() * 5, // 0-5%
      jitter: Math.random() * 20 // 0-20ms
    };

    this.addPerformanceMetrics(metrics);
  }

  /**
   * 获取统计摘要
   */
  public getStatsSummary(): {
    totalUpload: number;
    totalDownload: number;
    totalConnections: number;
    averageLatency: number;
    uptime: number;
  } {
    const totalUpload = this.trafficStats.upload;
    const totalDownload = this.trafficStats.download;
    const totalConnections = this.connectionHistory.length;
    
    const completedConnections = this.connectionHistory.filter(c => c.status === 'completed');
    const averageLatency = completedConnections.length > 0
      ? completedConnections.reduce((sum, c) => sum + c.duration, 0) / completedConnections.length
      : 0;

    const uptime = this.connectionStatus.startTime 
      ? Date.now() - this.connectionStatus.startTime
      : 0;

    return {
      totalUpload,
      totalDownload,
      totalConnections,
      averageLatency,
      uptime
    };
  }

  /**
   * 清除历史数据
   */
  public clearHistory(): void {
    this.connectionHistory = [];
    this.performanceMetrics = [];
    log.info('清除历史数据', null, 'MonitorManager');
  }

  /**
   * 导出监控数据
   */
  public exportData(): {
    trafficStats: TrafficStats;
    connectionHistory: ConnectionHistory[];
    performanceMetrics: PerformanceMetrics[];
    systemMetrics: SystemMetrics;
    summary: ReturnType<typeof this.getStatsSummary>;
  } {
    return {
      trafficStats: this.getTrafficStats(),
      connectionHistory: this.getConnectionHistory(),
      performanceMetrics: this.getPerformanceMetrics(),
      systemMetrics: this.getSystemMetrics(),
      summary: this.getStatsSummary()
    };
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    this.stopMonitoring();
    this.clearHistory();
    log.info('监控管理器已销毁', null, 'MonitorManager');
  }
}

export const monitorManager = MonitorManager.getInstance();
