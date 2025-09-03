import { createServer, Server, Socket } from 'net';
import { 
  TrafficStats, 
  MonitoringEvent, 
  MonitoringEventType,
  ProtectionRule,
  IAdapter,
  AdapterStatus
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
  // 新增：按连接统计上传/下载与起始时间，并尽力解析远端主机/端口
  private connectionStats: Map<string, { upload: number; download: number; start: number; chains: string[]; clientAddress: string; host?: string; port?: number; parsed?: boolean } > = new Map();

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
    // 初始化连接统计
    this.connectionStats.set(connectionId, {
      upload: 0,
      download: 0,
      start: Date.now(),
      chains: this.adapters.map(a => a.getInfo().id),
      clientAddress,
      parsed: false
    });
    
    try {
      // 创建到第一个适配器的连接
      const firstAdapter = this.adapters[0];
      if (!firstAdapter) {
        // [修改] 修正错误信息，因为现在可能有0个适配器
        throw new Error('没有可用的协议适配器。请检查代理链配置。');
      }
      
      const adapterInfo = firstAdapter.getInfo();
      // [修改] 状态检查应该检查是否为 'running'
      if (adapterInfo.status !== AdapterStatus.RUNNING) {
        throw new Error(`代理链的第一个适配器 (${adapterInfo.id}) 未在运行状态。当前状态: ${adapterInfo.status}`);
      }
      
      console.log(`[TrafficRouter] 连接到代理链的第一个适配器: ${adapterInfo.id} (端口: ${adapterInfo.port})`);
      
      // 创建到适配器的连接
      const { createConnection } = require('net');
      const adapterSocket = createConnection(adapterInfo.port, '127.0.0.1');
      
      // 连接开始事件（用于历史记录）
      this.emitMonitoringEvent(MonitoringEventType.CONNECTION_START, {
        connectionId,
        clientAddress,
        chains: this.adapters.map(a => a.getInfo().id)
      });

      // 设置双向数据转发
      this.setupDataForwarding(clientSocket, adapterSocket, connectionId);
      
      // 处理连接关闭
      clientSocket.on('close', () => {
        console.log(`[TrafficRouter] 客户端连接关闭: ${connectionId}`);
        this.activeConnections.delete(connectionId);
        this.trafficStats.connections--;
        adapterSocket.destroy();
        // 结束事件
        const st = this.connectionStats.get(connectionId);
        if (st) {
          this.emitMonitoringEvent(MonitoringEventType.CONNECTION_END, {
            connectionId,
            upload: st.upload,
            download: st.download,
            start: new Date(st.start).toISOString(),
            metadata: { host: st.host || st.clientAddress, destinationPort: st.port || 0, network: 'tcp' },
            rule: 'chain',
            chains: st.chains
          });
          this.connectionStats.delete(connectionId);
        }
      });
      
      adapterSocket.on('close', () => {
        console.log(`[TrafficRouter] 适配器连接关闭: ${connectionId}`);
        this.activeConnections.delete(connectionId);
        this.trafficStats.connections--;
        clientSocket.destroy();
        // 结束事件（若前面未触发）
        const st = this.connectionStats.get(connectionId);
        if (st) {
          this.emitMonitoringEvent(MonitoringEventType.CONNECTION_END, {
            connectionId,
            upload: st.upload,
            download: st.download,
            start: new Date(st.start).toISOString(),
            metadata: { host: st.host || st.clientAddress, destinationPort: st.port || 0, network: 'tcp' },
            rule: 'chain',
            chains: st.chains
          });
          this.connectionStats.delete(connectionId);
        }
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
        // [新增] 当连接被拒绝时，提供更明确的错误日志，帮助调试
        if ((error as any).code === 'ECONNREFUSED') {
            console.error(`[TrafficRouter] [调试信息] 连接到适配器 ${adapterInfo.id} (端口: ${adapterInfo.port}) 被拒绝。请确认该适配器实例已成功启动并正在监听该端口。`);
        }
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
      const st = this.connectionStats.get(connectionId);
      if (st) {
        st.upload += data.length;
        if (!st.parsed) {
          const parsed = this.parseHostnameFromFirstPacket(data);
          if (parsed) {
            if (parsed.host) st.host = parsed.host;
            if (parsed.port !== undefined) st.port = parsed.port;
          }
          st.parsed = true;
        }
      }
      
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
      const st = this.connectionStats.get(connectionId);
      if (st) st.download += data.length;
      
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

  // 解析 HTTP 请求首包中的 Host 头，或解析 TLS SNI（简单推断）
  private parseHostnameFromFirstPacket(buf: Buffer): { host?: string; port?: number } | null {
    try {
      const str = buf.toString('utf8');
      // HTTP/1.1 GET/POST ...\r\nHost: example.com[:port]\r\n
      const hostHeader = str.match(/\r\nHost:\s*([^\r\n]+)/i);
      if (hostHeader && hostHeader[1]) {
        const hostPort = hostHeader[1].trim();
        const [h, p] = hostPort.split(':');
        const result: { host?: string; port?: number } = {};
        if (h) result.host = h;
        if (p) result.port = parseInt(p, 10);
        return result;
      }
      // 简易 TLS ClientHello 检测（SNI 提取较复杂，此处不深挖，返回空）
      return null;
    } catch {
      return null;
    }
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
