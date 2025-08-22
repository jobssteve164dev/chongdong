import { createServer, Server, Socket } from 'net';
import { 
  TrafficStats, 
  MonitoringEvent, 
  MonitoringEventType,
  ProtectionRule,
  IAdapter
} from '../shared/types/middleware';

/**
 * 流量路由器 - 在多个sing-box实例之间转发流量
 */
export class TrafficRouter {
  private server?: Server;
  private entryPort: number;
  private adapters: IAdapter[];
  private status: 'idle' | 'starting' | 'running' | 'stopping' | 'stopped' = 'idle';
  private trafficStats: TrafficStats;
  private monitoringListeners: ((event: MonitoringEvent) => void)[] = [];
  private protectionRules: ProtectionRule[] = [];
  private activeConnections: Map<string, Socket> = new Map();

  constructor(entryPort: number, adapters: IAdapter[]) {
    this.entryPort = entryPort;
    this.adapters = adapters;
    this.trafficStats = {
      bytesReceived: 0,
      bytesSent: 0,
      connections: 0,
      lastActivity: new Date()
    };
  }

  /**
   * 启动流量路由器
   */
  public async start(): Promise<void> {
    console.log(`[TrafficRouter] 启动流量路由器，入口端口: ${this.entryPort}`);
    console.log(`[TrafficRouter] 适配器详情:`);
    console.log(`  - 适配器数量: ${this.adapters.length}`);
    for (let i = 0; i < this.adapters.length; i++) {
      const adapter = this.adapters[i];
      if (adapter) {
        const info = adapter.getInfo();
        console.log(`  - 适配器${i + 1}: ${info.id} (端口: ${info.port})`);
      }
    }
    
    try {
      this.status = 'starting';
      console.log(`[TrafficRouter] 状态已设置为: starting`);
      
      console.log(`[TrafficRouter] 创建TCP服务器...`);
      this.server = createServer((clientSocket) => {
        console.log(`[TrafficRouter] 收到新的客户端连接: ${clientSocket.remoteAddress}:${clientSocket.remotePort}`);
        this.handleClientConnection(clientSocket);
      });
      console.log(`[TrafficRouter] TCP服务器创建完成`);
      
      console.log(`[TrafficRouter] 开始监听端口 ${this.entryPort}...`);
      await new Promise<void>((resolve, reject) => {
        this.server!.listen(this.entryPort, '127.0.0.1', () => {
          console.log(`✅ [TrafficRouter] 流量路由器启动成功，监听端口: ${this.entryPort}`);
          resolve();
        });
        this.server!.on('error', (error) => {
          console.error(`❌ [TrafficRouter] 流量路由器启动失败:`, error);
          reject(error);
        });
      });
      
      this.status = 'running';
      console.log(`[TrafficRouter] 状态已设置为: running`);
      
      this.emitMonitoringEvent(MonitoringEventType.CONNECTION_START, {
        routerPort: this.entryPort,
        adapterCount: this.adapters.length
      });
      
      console.log(`✅ [TrafficRouter] 流量路由器启动完成`);
    } catch (error) {
      this.status = 'stopped';
      console.error(`❌ [TrafficRouter] 流量路由器启动失败:`, error);
      console.error(`❌ [TrafficRouter] 错误详情:`, error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  /**
   * 停止流量路由器
   */
  public async stop(): Promise<void> {
    console.log(`[TrafficRouter] 停止流量路由器`);
    
    try {
      this.status = 'stopping';
      
      // 关闭所有活跃连接
      for (const [, socket] of this.activeConnections) {
        socket.destroy();
      }
      this.activeConnections.clear();
      
      // 关闭服务器
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server!.close(() => {
            resolve();
          });
        });
      }
      
      this.status = 'stopped';
      console.log(`✅ [TrafficRouter] 流量路由器停止成功`);
      
    } catch (error) {
      console.error(`❌ [TrafficRouter] 流量路由器停止失败:`, error);
      throw error;
    }
  }

  /**
   * 处理客户端连接
   */
  private async handleClientConnection(clientSocket: Socket): Promise<void> {
    const connectionId = this.generateConnectionId();
    const clientAddress = `${clientSocket.remoteAddress}:${clientSocket.remotePort}`;
    
    console.log(`[TrafficRouter] 新客户端连接: ${connectionId} (${clientAddress})`);
    
    // 检查防护规则
    if (!this.checkProtectionRules(clientAddress)) {
      console.log(`[TrafficRouter] 连接被防护规则阻止: ${clientAddress}`);
      clientSocket.destroy();
      return;
    }
    
    this.activeConnections.set(connectionId, clientSocket);
    this.trafficStats.connections++;
    this.trafficStats.lastActivity = new Date();
    
    try {
      // 创建到第一个适配器的连接
      const firstAdapter = this.adapters[0];
      if (!firstAdapter) {
        throw new Error('没有可用的协议适配器');
      }
      
      const adapterInfo = firstAdapter.getInfo();
      if (adapterInfo.status !== 'running') {
        throw new Error(`协议适配器未运行: ${adapterInfo.id}`);
      }
      
      console.log(`[TrafficRouter] 连接到第一个适配器: ${adapterInfo.id} (端口: ${adapterInfo.port})`);
      
      // 创建到适配器的连接
      const { createConnection } = require('net');
      const adapterSocket = createConnection(adapterInfo.port, '127.0.0.1');
      
      // 设置双向数据转发
      this.setupDataForwarding(clientSocket, adapterSocket, connectionId);
      
      // 处理连接关闭
      clientSocket.on('close', () => {
        console.log(`[TrafficRouter] 客户端连接关闭: ${connectionId}`);
        this.activeConnections.delete(connectionId);
        this.trafficStats.connections--;
        adapterSocket.destroy();
      });
      
      adapterSocket.on('close', () => {
        console.log(`[TrafficRouter] 适配器连接关闭: ${connectionId}`);
        this.activeConnections.delete(connectionId);
        this.trafficStats.connections--;
        clientSocket.destroy();
      });
      
      // 处理错误
      clientSocket.on('error', (error) => {
        console.error(`[TrafficRouter] 客户端连接错误: ${connectionId}`, error);
        this.emitMonitoringEvent(MonitoringEventType.ERROR_OCCURRED, {
          connectionId,
          error: error.message
        });
      });
      
      adapterSocket.on('error', (error: Error) => {
        console.error(`[TrafficRouter] 适配器连接错误: ${connectionId}`, error);
        this.emitMonitoringEvent(MonitoringEventType.ERROR_OCCURRED, {
          connectionId,
          error: error.message
        });
      });
      
    } catch (error) {
      console.error(`[TrafficRouter] 处理客户端连接失败: ${connectionId}`, error);
      clientSocket.destroy();
      this.activeConnections.delete(connectionId);
      
      this.emitMonitoringEvent(MonitoringEventType.ERROR_OCCURRED, {
        connectionId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 设置双向数据转发
   */
  private setupDataForwarding(clientSocket: Socket, adapterSocket: Socket, connectionId: string): void {
    // 客户端 -> 适配器
    clientSocket.on('data', (data) => {
      this.trafficStats.bytesReceived += data.length;
      this.trafficStats.lastActivity = new Date();
      
      if (!adapterSocket.destroyed) {
        adapterSocket.write(data);
      }
      
      this.emitMonitoringEvent(MonitoringEventType.TRAFFIC_FLOW, {
        connectionId,
        direction: 'client_to_adapter',
        bytes: data.length
      });
    });
    
    // 适配器 -> 客户端
    adapterSocket.on('data', (data) => {
      this.trafficStats.bytesSent += data.length;
      this.trafficStats.lastActivity = new Date();
      
      if (!clientSocket.destroyed) {
        clientSocket.write(data);
      }
      
      this.emitMonitoringEvent(MonitoringEventType.TRAFFIC_FLOW, {
        connectionId,
        direction: 'adapter_to_client',
        bytes: data.length
      });
    });
  }

  /**
   * 检查防护规则
   */
  private checkProtectionRules(clientAddress: string): boolean {
    for (const rule of this.protectionRules) {
      if (!rule.enabled) continue;
      
      switch (rule.type) {
        case 'blacklist':
          if (rule.config.addresses && rule.config.addresses.includes(clientAddress)) {
            console.log(`[TrafficRouter] 客户端地址在黑名单中: ${clientAddress}`);
            return false;
          }
          break;
          
        case 'whitelist':
          if (rule.config.addresses && !rule.config.addresses.includes(clientAddress)) {
            console.log(`[TrafficRouter] 客户端地址不在白名单中: ${clientAddress}`);
            return false;
          }
          break;
          
        case 'rate_limit':
          // 这里可以实现速率限制逻辑
          break;
      }
    }
    
    return true;
  }

  /**
   * 生成连接ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取流量统计
   */
  public getTrafficStats(): TrafficStats {
    return { ...this.trafficStats };
  }

  /**
   * 获取状态
   */
  public getStatus(): string {
    return this.status;
  }

  /**
   * 添加监控监听器
   */
  public addMonitoringListener(callback: (event: MonitoringEvent) => void): void {
    this.monitoringListeners.push(callback);
  }

  /**
   * 移除监控监听器
   */
  public removeMonitoringListener(callback: (event: MonitoringEvent) => void): void {
    const index = this.monitoringListeners.indexOf(callback);
    if (index > -1) {
      this.monitoringListeners.splice(index, 1);
    }
  }

  /**
   * 添加防护规则
   */
  public addProtectionRule(rule: ProtectionRule): void {
    this.protectionRules.push(rule);
    console.log(`[TrafficRouter] 添加防护规则: ${rule.name}`);
  }

  /**
   * 移除防护规则
   */
  public removeProtectionRule(ruleId: string): void {
    const index = this.protectionRules.findIndex(rule => rule.id === ruleId);
    if (index > -1) {
      const rule = this.protectionRules.splice(index, 1)[0];
      if (rule) {
        console.log(`[TrafficRouter] 移除防护规则: ${rule.name}`);
      }
    }
  }

  /**
   * 发送监控事件
   */
  private emitMonitoringEvent(type: MonitoringEventType, data?: any): void {
    const event: MonitoringEvent = {
      type,
      timestamp: new Date(),
      data
    };
    
    this.monitoringListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error(`[TrafficRouter] 监控监听器错误:`, error);
      }
    });
  }
}
