import { 
  ProxyChainMiddlewareConfig,
  ProxyChainMiddlewareStatus,
  IProxyChainMiddleware,
  MonitoringEvent,
  ProtectionRule,
  TrafficStats,
  IAdapter
} from '../shared/types/middleware';
import { ProxyNode } from '../shared/types'; // [新增] 导入 ProxyNode 类型
import { TrafficRouter } from './trafficRouter';
// 废弃 UnifiedChainAdapter，因为它基于错误的单实例代理链假设
// import { UnifiedChainAdapter } from './unifiedChainAdapter'; 
import { ProtocolAdapter } from './protocolAdapter'; // [新增] 引入正确的单节点适配器
import { v4 as uuidv4 } from 'uuid';
import { PortManager } from './portManager'; // [修改] 从新的 portManager 文件导入

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
      
      // [重要] 启动前清理端口管理器，确保状态干净
      PortManager.getInstance().cleanup();

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
    console.log(`[ProxyChainMiddlewareManager] [重构] 采用多实例模式创建协议适配器...`);
    
    this.adapters = [];
    const nodes = this.config.nodes;
    if (nodes.length === 0) {
      console.warn('[ProxyChainMiddlewareManager] 警告: 代理链中没有节点。');
      return;
    }

    const portManager = PortManager.getInstance();

    // 为链中的每个节点分配一个本地监听端口
    const localPorts: (number | null)[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const port = await portManager.getAvailablePort();
      if (port === null) {
        // 添加安全检查以修复TS2532
        const nodeForError = nodes[i];
        if (nodeForError) {
          throw new Error(`无法为节点 ${nodeForError.name} 分配可用端口`);
        } else {
          throw new Error(`无法分配可用端口，并且在索引 ${i} 处找不到节点定义。`);
        }
      }
      localPorts.push(port);
    }

    // 依次创建每个节点的适配器实例
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const listenPort = localPorts[i];
      
      if (!node || listenPort == null) {
        console.warn(`[ProxyChainMiddlewareManager] 发现一个空的节点或无法分配端口在索引 ${i}，已跳过。`);
        continue;
      }
      
      // [核心逻辑] 为非首个节点创建特殊的 "inbound override" 配置
      let inboundOverride;
      if (i > 0) {
        const previousNode = nodes[i - 1];
        if (previousNode) {
          inboundOverride = this.createInboundOverride(listenPort, previousNode);
        }
      }

      // 决定下一跳的地址和端口
      const nextHopHost = '127.0.0.1';
      const nextHopPort = (i < nodes.length - 1) ? (localPorts[i+1] ?? undefined) : undefined;

      const adapterId = `adapter_${node.id}_${i}`;
      console.log(`[ProxyChainMiddlewareManager] 创建适配器: ${adapterId} for node ${node.name} (监听端口: ${listenPort}, 下一跳端口: ${nextHopPort || 'N/A (直连)'})`);
      
      const adapter = new ProtocolAdapter(adapterId, node, listenPort, nextHopHost, nextHopPort, inboundOverride);
      this.adapters.push(adapter);
    }
    
    console.log(`[ProxyChainMiddlewareManager] 创建了 ${this.adapters.length} 个独立的协议适配器`);
  }

  /**
   * [新增] 根据前一个节点的出站协议，为当前节点创建对应的入站配置
   */
  private createInboundOverride(listenPort: number, previousNode: ProxyNode): any {
    const baseInbound = {
      listen: '127.0.0.1',
      listen_port: listenPort,
      tag: `${previousNode.type}-in`,
    };

    switch (previousNode.type) {
      case 'vmess':
        return {
          ...baseInbound,
          type: 'vmess',
          users: [{ uuid: previousNode.uuid }], // [修复] vmess入站配置不包含 alter_id
        };
      case 'trojan':
         return {
          ...baseInbound,
          type: 'trojan',
          users: [{ password: previousNode.password }],
        };
      case 'shadowsocks':
        return {
          ...baseInbound,
          type: 'shadowsocks',
          method: previousNode.encryption,
          password: previousNode.password,
        };
      // 为其他支持的协议添加case
      default:
        // 如果前一个节点是不支持链式连接的协议（如socks, http），则返回一个标准的mixed入站
        // 这在逻辑上可能需要更复杂的处理，但作为默认值是合理的
        return {
          ...baseInbound,
          type: 'mixed',
          tag: 'mixed-in',
          users: []
        };
    }
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
    
    // 如果没有任何适配器（例如，没有节点），则不启动路由器
    if (this.adapters.length === 0) {
      console.warn('[ProxyChainMiddlewareManager] 没有可用的适配器，流量路由器将不会启动。');
      return;
    }

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
    // [重要] 中间件停止时，清理所有已分配的端口
    // PortManager 是一个单例，应该总是存在，直接调用即可
    PortManager.getInstance().cleanup();
  }
}
