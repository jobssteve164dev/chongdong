import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface BehaviorDataSnapshot {
  timestamp: number;
  totalConnections: number;
  totalBytes: number;
  hourlyConnections: Record<number, number>;
  hourlyBytes: Record<number, number>;
}

export interface PersistedBehaviorData {
  version: string;
  lastUpdated: number;
  snapshots: BehaviorDataSnapshot[];
  aggregated: {
    totalConnections: number;
    totalBytes: number;
    hourlyConnections: Record<number, number>;
    hourlyBytes: Record<number, number>;
  };
}

export class BehaviorDataManager {
  private static instance: BehaviorDataManager;
  private dataFilePath: string;
  private maxSnapshots: number = 1000; // 最多保存1000个快照
  private maxAgeDays: number = 30; // 最多保存30天的数据

  private constructor() {
    // 数据文件存储在用户数据目录
    const userDataPath = app.getPath('userData');
    this.dataFilePath = path.join(userDataPath, 'behavior-analytics.json');
  }

  public static getInstance(): BehaviorDataManager {
    if (!BehaviorDataManager.instance) {
      BehaviorDataManager.instance = new BehaviorDataManager();
    }
    return BehaviorDataManager.instance;
  }

  /**
   * 保存行为数据快照
   */
  public async saveSnapshot(snapshot: BehaviorDataSnapshot): Promise<void> {
    try {
      const existingData = await this.loadData();
      
      // 添加新快照
      existingData.snapshots.push(snapshot);
      
      // 清理过期数据
      this.cleanupOldData(existingData);
      
      // 更新聚合数据
      this.updateAggregatedData(existingData);
      
      // 更新元数据
      existingData.lastUpdated = Date.now();
      
      // 保存到文件
      await this.saveData(existingData);
      
      console.log(`[BehaviorDataManager] 已保存行为数据快照: ${new Date(snapshot.timestamp).toISOString()}`);
    } catch (error) {
      console.error('[BehaviorDataManager] 保存快照失败:', error);
    }
  }

  /**
   * 加载历史数据
   */
  public async loadData(): Promise<PersistedBehaviorData> {
    try {
      if (!fs.existsSync(this.dataFilePath)) {
        return this.createEmptyData();
      }

      const fileContent = fs.readFileSync(this.dataFilePath, 'utf-8');
      const data = JSON.parse(fileContent) as PersistedBehaviorData;
      
      // 验证数据格式
      if (!this.validateData(data)) {
        console.warn('[BehaviorDataManager] 数据格式无效，创建新数据');
        return this.createEmptyData();
      }

      return data;
    } catch (error) {
      console.error('[BehaviorDataManager] 加载数据失败:', error);
      return this.createEmptyData();
    }
  }

  /**
   * 获取聚合的历史数据
   */
  public async getAggregatedData(): Promise<{
    totalConnections: number;
    totalBytes: number;
    averageConnections: number;
    peakConnections: number;
    averageBytesPerSecond: number;
    peakBytesPerSecond: number;
    activeHours: number[];
    connectionPatterns: { hour: number; connections: number }[];
    trafficPatterns: { hour: number; bytes: number }[];
  }> {
    try {
      const data = await this.loadData();
      
      // 计算平均连接数
      const hourlyConnections = Object.values(data.aggregated.hourlyConnections);
      const averageConnections = hourlyConnections.length > 0 
        ? hourlyConnections.reduce((sum, count) => sum + count, 0) / hourlyConnections.length 
        : 0;
      
      // 计算峰值连接数
      const peakConnections = Math.max(...hourlyConnections, 0);
      
      // 计算平均和峰值流量
      const hourlyBytes = Object.values(data.aggregated.hourlyBytes);
      const averageBytesPerSecond = hourlyBytes.length > 0 
        ? hourlyBytes.reduce((sum, bytes) => sum + bytes, 0) / hourlyBytes.length / 3600 
        : 0;
      const peakBytesPerSecond = Math.max(...hourlyBytes, 0) / 3600;
      
      // 找出活跃时段
      const activeHours: number[] = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourConnections = data.aggregated.hourlyConnections[hour] || 0;
        if (hourConnections > averageConnections * 0.5) {
          activeHours.push(hour);
        }
      }
      
      // 生成24小时模式数据
      const connectionPatterns = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        connections: data.aggregated.hourlyConnections[hour] || 0
      }));
      
      const trafficPatterns = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        bytes: data.aggregated.hourlyBytes[hour] || 0
      }));
      
      return {
        totalConnections: data.aggregated.totalConnections,
        totalBytes: data.aggregated.totalBytes,
        averageConnections,
        peakConnections,
        averageBytesPerSecond,
        peakBytesPerSecond,
        activeHours,
        connectionPatterns,
        trafficPatterns
      };
    } catch (error) {
      console.error('[BehaviorDataManager] 获取聚合数据失败:', error);
      return {
        totalConnections: 0,
        totalBytes: 0,
        averageConnections: 0,
        peakConnections: 0,
        averageBytesPerSecond: 0,
        peakBytesPerSecond: 0,
        activeHours: [],
        connectionPatterns: Array.from({ length: 24 }, (_, hour) => ({ hour, connections: 0 })),
        trafficPatterns: Array.from({ length: 24 }, (_, hour) => ({ hour, bytes: 0 }))
      };
    }
  }

  /**
   * 清理数据
   */
  public async clearData(): Promise<void> {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        fs.unlinkSync(this.dataFilePath);
      }
      console.log('[BehaviorDataManager] 已清理所有行为分析数据');
    } catch (error) {
      console.error('[BehaviorDataManager] 清理数据失败:', error);
    }
  }

  /**
   * 获取数据统计信息
   */
  public async getDataStats(): Promise<{
    totalSnapshots: number;
    oldestSnapshot: Date | null;
    newestSnapshot: Date | null;
    dataSizeKB: number;
  }> {
    try {
      const data = await this.loadData();
      const dataSizeKB = fs.existsSync(this.dataFilePath) 
        ? Math.round(fs.statSync(this.dataFilePath).size / 1024)
        : 0;
      
      const timestamps = data.snapshots.map(s => s.timestamp);
      const oldestTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : null;
      const newestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : null;
      
      return {
        totalSnapshots: data.snapshots.length,
        oldestSnapshot: oldestTimestamp ? new Date(oldestTimestamp) : null,
        newestSnapshot: newestTimestamp ? new Date(newestTimestamp) : null,
        dataSizeKB
      };
    } catch (error) {
      console.error('[BehaviorDataManager] 获取数据统计失败:', error);
      return {
        totalSnapshots: 0,
        oldestSnapshot: null,
        newestSnapshot: null,
        dataSizeKB: 0
      };
    }
  }

  private createEmptyData(): PersistedBehaviorData {
    return {
      version: '1.0.0',
      lastUpdated: Date.now(),
      snapshots: [],
      aggregated: {
        totalConnections: 0,
        totalBytes: 0,
        hourlyConnections: {},
        hourlyBytes: {}
      }
    };
  }

  private validateData(data: any): data is PersistedBehaviorData {
    return (
      data &&
      typeof data.version === 'string' &&
      typeof data.lastUpdated === 'number' &&
      Array.isArray(data.snapshots) &&
      data.aggregated &&
      typeof data.aggregated.totalConnections === 'number' &&
      typeof data.aggregated.totalBytes === 'number' &&
      typeof data.aggregated.hourlyConnections === 'object' &&
      typeof data.aggregated.hourlyBytes === 'object'
    );
  }

  private cleanupOldData(data: PersistedBehaviorData): void {
    const cutoffTime = Date.now() - (this.maxAgeDays * 24 * 60 * 60 * 1000);
    
    // 清理过期快照
    data.snapshots = data.snapshots.filter(snapshot => snapshot.timestamp > cutoffTime);
    
    // 限制快照数量
    if (data.snapshots.length > this.maxSnapshots) {
      data.snapshots = data.snapshots
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.maxSnapshots);
    }
  }

  private updateAggregatedData(data: PersistedBehaviorData): void {
    // 重置聚合数据
    data.aggregated = {
      totalConnections: 0,
      totalBytes: 0,
      hourlyConnections: {},
      hourlyBytes: {}
    };

    // 从所有快照中聚合数据
    for (const snapshot of data.snapshots) {
      data.aggregated.totalConnections += snapshot.totalConnections;
      data.aggregated.totalBytes += snapshot.totalBytes;
      
      // 聚合小时数据
      for (const [hour, connections] of Object.entries(snapshot.hourlyConnections)) {
        const hourNum = parseInt(hour);
        data.aggregated.hourlyConnections[hourNum] = 
          (data.aggregated.hourlyConnections[hourNum] || 0) + connections;
      }
      
      for (const [hour, bytes] of Object.entries(snapshot.hourlyBytes)) {
        const hourNum = parseInt(hour);
        data.aggregated.hourlyBytes[hourNum] = 
          (data.aggregated.hourlyBytes[hourNum] || 0) + bytes;
      }
    }
  }

  private async saveData(data: PersistedBehaviorData): Promise<void> {
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(this.dataFilePath, jsonString, 'utf-8');
  }
}

export const behaviorDataManager = BehaviorDataManager.getInstance();
