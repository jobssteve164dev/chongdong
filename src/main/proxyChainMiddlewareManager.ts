import { 
  ProxyChainMiddlewareConfig,
  ProxyChainMiddlewareStatus,
  IProxyChainMiddleware,
  MonitoringEvent,
  ProtectionRule,
  TrafficStats,
  IAdapter
} from '../shared/types/middleware';
import { TrafficRouter } from './trafficRouter';
import { UnifiedChainAdapter } from './unifiedChainAdapter';
import { v4 as uuidv4 } from 'uuid';

/**
 * 代理链中间件管理器 - 协调多个协议适配器和流量路由器
 */
export class ProxyChainMiddlewareManager implements IProxyChainMiddleware {
  private id: string;
  private config: ProxyChainMiddlewareConfig;
  private status: 'idle' | 'starting' | 'running' | 'error' | 'stopping' | 'stopped' = 'idle';
  private adapters: IAdapter[] = [];
  private router?: TrafficRouter | undefined;
  private error?: string | undefined;
  private startTime?: Date | undefined;
  private trafficStats: TrafficStats;
  private monitoringListeners: ((event: MonitoringEvent) => void)[] = [];
  private protectionRules: ProtectionRule[] = [];

  constructor(config: ProxyChainMiddlewareConfig) {
    this.id = uuidv4();
    this.config = config;
    this.trafficStats = {
      bytesReceived: 0,
      bytesSent: 0,
      connections: 0,
      lastActivity: new Date()
    };
  }

  /**
   * 启动代理链中间件
   */
  public async start(): Promise<void> {
    console.log(`[ProxyChainMiddlewareManager] 启动代理链中间件: ${this.id}`);
    console.log(`[ProxyChainMiddlewareManager] 配置详情:`);
    console.log(`  - 入口端口: ${this.config.entryPort}`);
    console.log(`  - 节点数量: ${this.config.nodes.length}`);
    console.log(`  - 启用监控: ${this.config.enableMonitoring}`);
    console.log(`  - 启用防护: ${this.config.enableProtection}`);
    console.log(`  - 最大重试: ${this.config.maxRetries}`);
    console.log(`  - 超时时间: ${this.config.timeout}ms`);
    
    try {
      this.status = 'starting';
      this.startTime = new Date();
      console.log(`[ProxyChainMiddlewareManager] 状态已设置为: starting`);
      
      console.log(`[ProxyChainMiddlewareManager] 步骤1: 创建协议适配器...`);
      await this.createProtocolAdapters();
      console.log(`[ProxyChainMiddlewareManager] 协议适配器创建完成，数量: ${this.adapters.length}`);
      
      console.log(`[ProxyChainMiddlewareManager] 步骤2: 启动协议适配器...`);
      await this.startProtocolAdapters();
      console.log(`[ProxyChainMiddlewareManager] 协议适配器启动完成`);
      
      console.log(`[ProxyChainMiddlewareManager] 步骤3: 创建并启动流量路由器...`);
      await this.createAndStartTrafficRouter();
      console.log(`[ProxyChainMiddlewareManager] 流量路由器启动完成`);
      
      this.status = 'running';
      console.log(`[ProxyChainMiddlewareManager] 状态已设置为: running`);
      console.log(`✅ [ProxyChainMiddlewareManager] 代理链中间件启动成功: ${this.id}`);
    } catch (error) {
      this.status = 'error';
      this.error = error instanceof Error ? error.message : String(error);
      console.error(`❌ [ProxyChainMiddlewareManager] 代理链中间件启动失败: ${this.id}`, error);
      console.error(`❌ [ProxyChainMiddlewareManager] 错误详情:`, error instanceof Error ? error.stack : error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * 停止代理链中间件
   */
  public async stop(): Promise<void> {
    console.log(`[ProxyChainMiddlewareManager] 停止代理链中间件: ${this.id}`);
    
    try {
      this.status = 'stopping';
      
      // 1. 停止流量路由器
      if (this.router) {
        await this.router.stop();
      }
      
      // 2. 停止所有协议适配器
      await this.stopProtocolAdapters();
      
      // 3. 清理资源
      await this.cleanup();
      
      this.status = 'stopped';
      
      console.log(`✅ [ProxyChainMiddlewareManager] 代理链中间件停止成功: ${this.id}`);
      
    } catch (error) {
      console.error(`❌ [ProxyChainMiddlewareManager] 代理链中间件停止失败: ${this.id}`, error);
      throw error;
    }
  }

  /**
   * 获取中间件状态
   */
  public getStatus(): ProxyChainMiddlewareStatus {
    return {
      id: this.id,
      status: this.status,
      adapters: this.adapters.map(adapter => adapter.getInfo()),
      entryPort: this.config.entryPort,
      error: this.error,
      startTime: this.startTime,
      trafficStats: { ...this.trafficStats }
    };
  }

  /**
   * 获取流量统计
   */
  public getTrafficStats(): TrafficStats {
    // 合并所有适配器和路由器的流量统计
    const totalStats: TrafficStats = {
      bytesReceived: 0,
      bytesSent: 0,
      connections: 0,
      lastActivity: new Date()
    };
    
    // 累加适配器统计
    for (const adapter of this.adapters) {
      const adapterStats = adapter.getInfo().trafficStats;
      totalStats.bytesReceived += adapterStats.bytesReceived;
      totalStats.bytesSent += adapterStats.bytesSent;
      totalStats.connections += adapterStats.connections;
    }
    
    // 累加路由器统计
    if (this.router) {
      const routerStats = this.router.getTrafficStats();
      totalStats.bytesReceived += routerStats.bytesReceived;
      totalStats.bytesSent += routerStats.bytesSent;
      totalStats.connections += routerStats.connections;
    }
    
    return totalStats;
  }

  /**
   * 添加监控监听器
   */
  public addMonitoringListener(callback: (event: MonitoringEvent) => void): void {
    this.monitoringListeners.push(callback);
    
    // 为所有适配器添加监听器
    for (const adapter of this.adapters) {
      adapter.addMonitoringListener(callback);
    }
    
    // 为路由器添加监听器
    if (this.router) {
      this.router.addMonitoringListener(callback);
    }
  }

  /**
   * 移除监控监听器
   */
  public removeMonitoringListener(callback: (event: MonitoringEvent) => void): void {
    const index = this.monitoringListeners.indexOf(callback);
    if (index > -1) {
      this.monitoringListeners.splice(index, 1);
    }
    
    // 从所有适配器移除监听器
    for (const adapter of this.adapters) {
      adapter.removeMonitoringListener(callback);
    }
    
    // 从路由器移除监听器
    if (this.router) {
      this.router.removeMonitoringListener(callback);
    }
  }

  /**
   * 添加防护规则
   */
  public addProtectionRule(rule: ProtectionRule): void {
    this.protectionRules.push(rule);
    
    // 添加到路由器
    if (this.router) {
      this.router.addProtectionRule(rule);
    }
    
    console.log(`[ProxyChainMiddlewareManager] 添加防护规则: ${rule.name}`);
  }

  /**
   * 移除防护规则
   */
  public removeProtectionRule(ruleId: string): void {
    const index = this.protectionRules.findIndex(rule => rule.id === ruleId);
    if (index > -1) {
      this.protectionRules.splice(index, 1);
    }
    
    // 从路由器移除
    if (this.router) {
      this.router.removeProtectionRule(ruleId);
    }
  }

  /**
   * 创建协议适配器
   */
  private async createProtocolAdapters(): Promise<void> {
    console.log(`[ProxyChainMiddlewareManager] 创建协议适配器...`);
    
    this.adapters = [];
    
    // 不再为每个节点创建独立的适配器
    // 而是创建一个统一的代理链配置，确保IP隐藏
    const unifiedPort = this.config.entryPort + 1; // 7896
    const unifiedAdapterId = `unified_chain_${this.id}`;
    
    console.log(`[ProxyChainMiddlewareManager] 创建统一代理链适配器: ${unifiedAdapterId} (端口: ${unifiedPort})`);
    
    // 创建一个统一的适配器，包含所有节点
    const unifiedAdapter = new UnifiedChainAdapter(unifiedAdapterId, this.config.nodes, unifiedPort);
    this.adapters.push(unifiedAdapter);
    
    console.log(`[ProxyChainMiddlewareManager] 创建了 1 个统一代理链适配器`);
  }

  /**
   * 启动协议适配器
   */
  private async startProtocolAdapters(): Promise<void> {
    console.log(`[ProxyChainMiddlewareManager] 启动协议适配器...`);
    
    for (const adapter of this.adapters) {
      try {
        await adapter.start();
        console.log(`✅ [ProxyChainMiddlewareManager] 适配器启动成功: ${adapter.getInfo().id}`);
      } catch (error) {
        console.error(`❌ [ProxyChainMiddlewareManager] 适配器启动失败: ${adapter.getInfo().id}`, error);
        throw error;
      }
    }
    
    console.log(`[ProxyChainMiddlewareManager] 所有协议适配器启动完成`);
  }

  /**
   * 停止协议适配器
   */
  private async stopProtocolAdapters(): Promise<void> {
    console.log(`[ProxyChainMiddlewareManager] 停止协议适配器...`);
    
    const stopPromises = this.adapters.map(async (adapter) => {
      try {
        await adapter.stop();
        console.log(`✅ [ProxyChainMiddlewareManager] 适配器停止成功: ${adapter.getInfo().id}`);
      } catch (error) {
        console.error(`❌ [ProxyChainMiddlewareManager] 适配器停止失败: ${adapter.getInfo().id}`, error);
      }
    });
    
    await Promise.all(stopPromises);
    console.log(`[ProxyChainMiddlewareManager] 所有协议适配器停止完成`);
  }

  /**
   * 创建并启动流量路由器
   */
  private async createAndStartTrafficRouter(): Promise<void> {
    console.log(`[ProxyChainMiddlewareManager] 创建并启动流量路由器...`);
    
    // 创建流量路由器
    this.router = new TrafficRouter(this.config.entryPort, this.adapters);
    
    // 添加防护规则
    for (const rule of this.protectionRules) {
      this.router.addProtectionRule(rule);
    }
    
    // 启动路由器
    await this.router.start();
    
    console.log(`✅ [ProxyChainMiddlewareManager] 流量路由器启动成功`);
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    this.adapters = [];
    this.router = undefined;
    this.error = undefined;
    this.startTime = undefined;
  }
}
