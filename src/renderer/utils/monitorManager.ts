import { TrafficStats, ConnectionStatus } from '../../shared/types';
import { log } from './logger';
import { proxyEngine } from './proxyEngine'; // 导入 proxyEngine



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
  // 新增真实性能指标字段
  latencyHistory: number[]; // 延迟历史数据，用于计算抖动
  averageLatency: number; // 平均延迟
  maxLatency: number; // 最大延迟
  minLatency: number; // 最小延迟
  throughputHistory: number[]; // 吞吐量历史数据
  averageThroughput: number; // 平均吞吐量
  packetLossHistory: number[]; // 丢包率历史数据
  averagePacketLoss: number; // 平均丢包率
  testCount: number; // 测试次数
  lastTestTime: number; // 最后测试时间
  testTarget: string; // 测试目标
  testMethod: 'ping' | 'http' | 'tcp'; // 测试方法
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

  private connectionHistory: ConnectionHistory[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private performanceTestInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private lastTrafficStats: { upload: number; download: number; timestamp: number } = { upload: 0, download: 0, timestamp: Date.now() };
  
  // 性能测试相关
  private currentPerformanceMetrics: PerformanceMetrics | null = null;
  private latencyTestQueue: Array<() => Promise<void>> = [];
  private isPerformanceTesting = false;

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
  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('监控已在运行中，跳过启动');
      return;
    }

    console.log('开始启动监控...');
    this.isMonitoring = true;
    
    // 强制检查代理状态
    console.log('启动监控时强制检查代理状态...');
    const isRunning = await proxyEngine.checkRunningStatus();
    console.log('代理运行状态检查结果:', isRunning);
    
    // 立即执行一次更新
    console.log('执行初始数据更新...');
    await this.updateMetrics();
    
    this.updateInterval = setInterval(() => {
      this.updateMetrics();
    }, 1000); // 每秒更新一次

    // 启动性能测试监控
    this.startPerformanceMonitoring();

    console.log('监控启动完成');
    log.info('开始监控', null, 'MonitorManager');
  }

  /**
   * 启动性能监控
   */
  private startPerformanceMonitoring(): void {
    if (this.performanceTestInterval) {
      clearInterval(this.performanceTestInterval);
    }

    // 每30秒进行一次性能测试
    this.performanceTestInterval = setInterval(async () => {
      if (this.connectionStatus.connected) {
        await this.updatePerformanceMetrics();
      }
    }, 30000);

    log.info('启动性能监控', null, 'MonitorManager');
  }

  /**
   * 停止性能监控
   */
  private stopPerformanceMonitoring(): void {
    if (this.performanceTestInterval) {
      clearInterval(this.performanceTestInterval);
      this.performanceTestInterval = null;
    }
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

    // 停止性能监控
    this.stopPerformanceMonitoring();

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
   * 获取当前性能指标
   */
  public getCurrentPerformanceMetrics(): PerformanceMetrics | null {
    return this.currentPerformanceMetrics;
  }

  /**
   * 获取性能统计摘要
   */
  public getPerformanceSummary(): {
    currentLatency: number;
    averageLatency: number;
    maxLatency: number;
    minLatency: number;
    currentThroughput: number;
    averageThroughput: number;
    currentPacketLoss: number;
    averagePacketLoss: number;
    currentJitter: number;
    testCount: number;
    lastTestTime: number;
  } {
    if (!this.currentPerformanceMetrics) {
      return {
        currentLatency: 0,
        averageLatency: 0,
        maxLatency: 0,
        minLatency: 0,
        currentThroughput: 0,
        averageThroughput: 0,
        currentPacketLoss: 0,
        averagePacketLoss: 0,
        currentJitter: 0,
        testCount: 0,
        lastTestTime: 0
      };
    }

    const metrics = this.currentPerformanceMetrics;
    return {
      currentLatency: metrics.latency,
      averageLatency: metrics.averageLatency,
      maxLatency: metrics.maxLatency,
      minLatency: metrics.minLatency,
      currentThroughput: metrics.throughput,
      averageThroughput: metrics.averageThroughput,
      currentPacketLoss: metrics.packetLoss,
      averagePacketLoss: metrics.averagePacketLoss,
      currentJitter: metrics.jitter,
      testCount: metrics.testCount,
      lastTestTime: metrics.lastTestTime
    };
  }

  /**
   * 手动触发性能测试
   */
  public async triggerPerformanceTest(): Promise<void> {
    if (!this.connectionStatus.connected) {
      log.warn('代理未连接，无法进行性能测试', null, 'MonitorManager');
      return;
    }

    log.info('手动触发性能测试', null, 'MonitorManager');
    await this.updatePerformanceMetrics();
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
  private async updateMetrics(): Promise<void> {
    // 检查代理运行状态
    const isProxyRunning = proxyEngine.isRunning();
    const proxyStatus = proxyEngine.getStatus();
    console.log('代理运行状态:', isProxyRunning);
    console.log('代理详细状态:', proxyStatus);
    
    // 只有在代理运行时才更新统计数据
    if (isProxyRunning) {
      try {
        console.log('开始获取代理统计信息...');
        const stats = await proxyEngine.getStats();
        console.log('获取到的统计信息:', stats);
        
        if (stats) {
          const now = Date.now();
          const timeDelta = (now - this.lastTrafficStats.timestamp) / 1000; // a seconds

          const uploadSpeed = timeDelta > 0 ? (stats.totalUpload - this.lastTrafficStats.upload) / timeDelta : 0;
          const downloadSpeed = timeDelta > 0 ? (stats.totalDownload - this.lastTrafficStats.download) / timeDelta : 0;
          
          console.log('计算的速度:', { uploadSpeed, downloadSpeed, timeDelta });
          
          this.trafficStats = {
            upload: stats.totalUpload || 0,
            download: stats.totalDownload || 0,
            uploadSpeed: uploadSpeed > 0 ? uploadSpeed : 0,
            downloadSpeed: downloadSpeed > 0 ? downloadSpeed : 0,
            timestamp: now
          };

          this.lastTrafficStats = {
            upload: stats.totalUpload || 0,
            download: stats.totalDownload || 0,
            timestamp: now,
          };
          
          this.connectionStatus = {
            ...this.connectionStatus,
            connected: true,
            upload: this.trafficStats.upload,
            download: this.trafficStats.download,
            uploadSpeed: this.trafficStats.uploadSpeed,
            downloadSpeed: this.trafficStats.downloadSpeed,
          };

          console.log('更新后的流量统计:', this.trafficStats);
          console.log('更新后的连接状态:', this.connectionStatus);

          // 更新连接历史
          if (stats.connections) {
            this.connectionHistory = stats.connections.map((c: any) => ({
              id: c.id,
              server: `${c.metadata.host}:${c.metadata.destinationPort}`,
              protocol: c.metadata.network,
              startTime: new Date(c.start).getTime(),
              upload: c.upload,
              download: c.download,
              status: 'active',
              rule: c.rule,
              chains: c.chains.join(' -> '),
            }));
          }
        } else {
          console.log('获取到的统计信息为空');
        }
      } catch (error) {
        console.error('更新代理统计失败:', error);
        log.error('更新代理统计失败', error, 'MonitorManager');
        this.connectionStatus.connected = false;
      }
    } else {
      console.log('代理未运行，设置连接状态为false');
      this.connectionStatus.connected = false;
    }
    
    // 更新性能指标 (真实网络性能测试)
    await this.updatePerformanceMetrics();
  }



  /**
   * 初始化性能指标
   */
  private initializePerformanceMetrics(): PerformanceMetrics {
    return {
      latency: 0,
      throughput: 0,
      packetLoss: 0,
      jitter: 0,
      timestamp: Date.now(),
      latencyHistory: [],
      averageLatency: 0,
      maxLatency: 0,
      minLatency: 0,
      throughputHistory: [],
      averageThroughput: 0,
      packetLossHistory: [],
      averagePacketLoss: 0,
      testCount: 0,
      lastTestTime: 0,
      testTarget: 'http://connectivitycheck.gstatic.com/generate_204',
      testMethod: 'http'
    };
  }

  /**
   * 计算抖动（基于延迟历史）
   */
  private calculateJitter(latencyHistory: number[]): number {
    if (latencyHistory.length < 2) return 0;
    
    const differences: number[] = [];
    for (let i = 1; i < latencyHistory.length; i++) {
      differences.push(Math.abs(latencyHistory[i] - latencyHistory[i - 1]));
    }
    
    return differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
  }

  /**
   * 计算吞吐量（基于流量统计）
   */
  private calculateThroughput(): number {
    const uploadSpeed = this.trafficStats.uploadSpeed;
    const downloadSpeed = this.trafficStats.downloadSpeed;
    // 转换为Mbps (bytes to bits, then to Mbps)
    return (uploadSpeed + downloadSpeed) * 8 / 1000000;
  }

  /**
   * 测试网络延迟
   */
  private async testLatency(): Promise<number> {
    try {
      const testUrl = 'http://connectivitycheck.gstatic.com/generate_204';
      const startTime = Date.now();
      
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10秒超时
      });
      
      if (response.ok) {
        const endTime = Date.now();
        return endTime - startTime;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      log.error('延迟测试失败', error, 'MonitorManager');
      return 0;
    }
  }

  /**
   * 测试丢包率
   */
  private async testPacketLoss(): Promise<number> {
    try {
      const testUrl = 'http://connectivitycheck.gstatic.com/generate_204';
      const testCount = 10;
      let successCount = 0;
      
      for (let i = 0; i < testCount; i++) {
        try {
          const response = await fetch(testUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5秒超时
          });
          
          if (response.ok) {
            successCount++;
          }
        } catch (error) {
          // 请求失败，计入丢包
        }
        
        // 短暂延迟避免过于频繁的请求
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return ((testCount - successCount) / testCount) * 100;
    } catch (error) {
      log.error('丢包率测试失败', error, 'MonitorManager');
      return 0;
    }
  }

  /**
   * 更新性能指标
   */
  private async updatePerformanceMetrics(): Promise<void> {
    if (!this.connectionStatus.connected) {
      return;
    }

    // 初始化或获取当前性能指标
    if (!this.currentPerformanceMetrics) {
      this.currentPerformanceMetrics = this.initializePerformanceMetrics();
    }

    const now = Date.now();
    const metrics = this.currentPerformanceMetrics;

    // 每30秒进行一次完整的性能测试
    if (now - metrics.lastTestTime > 30000) {
      try {
        // 测试延迟
        const latency = await this.testLatency();
        if (latency > 0) {
          metrics.latency = latency;
          metrics.latencyHistory.push(latency);
          
          // 保持最近20次测试结果
          if (metrics.latencyHistory.length > 20) {
            metrics.latencyHistory = metrics.latencyHistory.slice(-20);
          }
          
          // 计算统计值
          metrics.averageLatency = metrics.latencyHistory.reduce((sum, l) => sum + l, 0) / metrics.latencyHistory.length;
          metrics.maxLatency = Math.max(...metrics.latencyHistory);
          metrics.minLatency = Math.min(...metrics.latencyHistory);
          metrics.jitter = this.calculateJitter(metrics.latencyHistory);
        }

        // 测试丢包率
        const packetLoss = await this.testPacketLoss();
        metrics.packetLoss = packetLoss;
        metrics.packetLossHistory.push(packetLoss);
        
        if (metrics.packetLossHistory.length > 10) {
          metrics.packetLossHistory = metrics.packetLossHistory.slice(-10);
        }
        
        metrics.averagePacketLoss = metrics.packetLossHistory.reduce((sum, p) => sum + p, 0) / metrics.packetLossHistory.length;

        // 计算吞吐量
        const throughput = this.calculateThroughput();
        metrics.throughput = throughput;
        metrics.throughputHistory.push(throughput);
        
        if (metrics.throughputHistory.length > 10) {
          metrics.throughputHistory = metrics.throughputHistory.slice(-10);
        }
        
        metrics.averageThroughput = metrics.throughputHistory.reduce((sum, t) => sum + t, 0) / metrics.throughputHistory.length;

        metrics.testCount++;
        metrics.lastTestTime = now;
        metrics.timestamp = now;

        // 添加到历史记录
        this.addPerformanceMetrics({
          latency: metrics.latency,
          throughput: metrics.throughput,
          packetLoss: metrics.packetLoss,
          jitter: metrics.jitter,
          latencyHistory: [...metrics.latencyHistory],
          averageLatency: metrics.averageLatency,
          maxLatency: metrics.maxLatency,
          minLatency: metrics.minLatency,
          throughputHistory: [...metrics.throughputHistory],
          averageThroughput: metrics.averageThroughput,
          packetLossHistory: [...metrics.packetLossHistory],
          averagePacketLoss: metrics.averagePacketLoss,
          testCount: metrics.testCount,
          lastTestTime: metrics.lastTestTime,
          testTarget: metrics.testTarget,
          testMethod: metrics.testMethod
        });

        log.info('性能测试完成', {
          latency: metrics.latency,
          throughput: metrics.throughput,
          packetLoss: metrics.packetLoss,
          jitter: metrics.jitter
        }, 'MonitorManager');

      } catch (error) {
        log.error('性能测试失败', error, 'MonitorManager');
      }
    }
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
    summary: ReturnType<MonitorManager['getStatsSummary']>;
  } {
    return {
      trafficStats: this.getTrafficStats(),
      connectionHistory: this.getConnectionHistory(),
      performanceMetrics: this.getPerformanceMetrics(),
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
