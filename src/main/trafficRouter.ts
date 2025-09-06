import { createServer, Server, Socket } from 'net';
import { 
  TrafficStats, 
  MonitoringEvent, 
  MonitoringEventType,
  ProtectionRule,
  IAdapter,
  AdapterStatus
} from '../shared/types/middleware';
import { settingsManager } from './settingsManager';
import { DefaultSettings } from '../shared/defaultSettings';
import { HttpHeaderProtectionService } from './services/httpHeaderProtectionService';

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
  // 新增：中间件级防护（真实生效）
  private httpHeaderProtector = new HttpHeaderProtectionService();
  private requestDelayRange: [number, number] = [100, 500];
  private timingProtectionEnabled: boolean = true;
  private lanIsolationEnabled: boolean = false;
  private lanAllowedCidrs: string[] = ['127.0.0.1/32'];
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

    // 同步加载应用设置，初始化中间件级防护参数
    try {
      const settings = settingsManager.getSettings?.() || DefaultSettings.getDefaultAppSettings();
      // 时间泄露防护
      if (typeof settings.enableTimingLeakProtection === 'boolean') {
        this.timingProtectionEnabled = settings.enableTimingLeakProtection;
      }
      if (Array.isArray(settings.requestDelayRange) && settings.requestDelayRange.length === 2) {
        const [min, max] = settings.requestDelayRange as [number, number];
        if (Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max >= min) {
          this.requestDelayRange = [min, max];
        }
      }
      // HTTP 头防护
      this.httpHeaderProtector.configure({
        enabled: settings.enableHttpHeaderProtection ?? true,
        mode: settings.httpHeaderProtectionMode || 'strict',
        customUserAgent: settings.customUserAgent || ''
      });
      // 局域网隔离
      this.lanIsolationEnabled = !!settings.enableLanIsolation;
      if (Array.isArray(settings.lanAllowedCidrs)) {
        this.lanAllowedCidrs = settings.lanAllowedCidrs.filter((s: any) => typeof s === 'string');
      }
    } catch (e) {
      console.warn('[TrafficRouter] 初始化中间件防护参数失败，使用默认值。', e);
    }
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
    // 客户端 -> 适配器（应用真实生效的中间件：请求延迟 + HTTP头标准化）
    clientSocket.on('data', async (data) => {
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

      let outBuf = data;

      try {
        // 0) 局域网隔离：基于首次包推断目的主机/端口，阻断同网段直连
        if (this.lanIsolationEnabled) {
          const parsed = this.parseHostnameFromFirstPacket(data);
          // 如果是明文HTTP并且目标是内网网段，则丢弃
          if (parsed?.host && this.isLanAddress(parsed.host) && !this.isAllowedLan(parsed.host)) {
            console.warn('[TrafficRouter] LAN Isolation: 阻断内网目标', parsed.host);
            return; // 丢弃该数据，不转发
          }
        }

        // 1) 时间泄露防护：请求延迟整形
        if (this.timingProtectionEnabled) {
          const [min, max] = this.requestDelayRange;
          const delay = Math.floor(Math.random() * (max - min + 1)) + min;
          if (delay > 0) {
            await new Promise((r) => setTimeout(r, delay));
          }
        }

        // 2) HTTP 头标准化：仅在HTTP明文请求场景下尝试改写首包头部
        //    注意：这不会解密TLS流量；若为TLS，保持透明转发
        const str = data.toString('utf8');
        const isHttp1 = /^GET\s|^POST\s|^HEAD\s|^PUT\s|^DELETE\s|^OPTIONS\s|^PATCH\s/i.test(str);
        if (isHttp1 && this.httpHeaderProtector.getProtectionStatus().enabled) {
          // 将首包按行拆分并重写关键头部
          const endOfHeaders = str.indexOf('\r\n\r\n');
          if (endOfHeaders > 0) {
            const headersPart = str.substring(0, endOfHeaders);
            const bodyPart = str.substring(endOfHeaders + 4);
            const lines = headersPart.split('\r\n');
            const requestLine = lines.shift() || '';

            // 构造标准化头
            const tpl = this.httpHeaderProtector.getStandardizedHeaders('chrome');
            const kv: Record<string, string> = {};
            for (const line of lines) {
              const idx = line.indexOf(':');
              if (idx > 0) {
                const key = line.substring(0, idx).trim();
                const value = line.substring(idx + 1).trim();
                kv[key] = value;
              }
            }
            // 应用标准化（保留Host和必要头，覆盖UA/Accept/Accept-Language等）
            const host = kv['Host'];
            const merged: Record<string, string> = { ...kv, ...tpl };
            if (host) merged['Host'] = host; // Host 必须保留，防止路由错误

            const rebuilt = [requestLine]
              .concat(Object.entries(merged).map(([k, v]) => `${k}: ${v}`))
              .join('\r\n') + '\r\n\r\n' + bodyPart;
            outBuf = Buffer.from(rebuilt, 'utf8');
          }
        }
      } catch (e) {
        // 中间件失败时，回退为透明转发
        console.warn('[TrafficRouter] 中间件处理失败，已降级为透明转发: ', (e as Error).message);
        outBuf = data;
      }
      
      if (!adapterSocket.destroyed) {
        adapterSocket.write(outBuf);
      }
      
      this.emitMonitoringEvent(MonitoringEventType.TRAFFIC_FLOW, {
        connectionId,
        direction: 'client_to_adapter',
        bytes: outBuf.length
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

  // 简易内网网段判断（CIDR: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, 127.0.0.0/8, *.local）
  private isLanAddress(host: string): boolean {
    if (/\.local$/i.test(host)) return true;
    const ip = this.tryParseIPv4(host);
    if (!ip) return false;
    const parts = ip.split('.').map(n => parseInt(n,10));
    const [a, b] = parts;
    if (a === undefined) return false;
    if (a === 10) return true;
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 127) return true;
    return false;
  }

  private tryParseIPv4(host: string): string | null {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return host;
    return null;
  }

  private isAllowedLan(host: string): boolean {
    // 简易CIDR匹配，仅支持 /8 /12 /16 /24 /32 常用前缀
    const ip = this.tryParseIPv4(host);
    if (!ip) return false;
    for (const cidr of this.lanAllowedCidrs) {
      const [base, maskStr] = cidr.split('/');
      if (!base) continue;
      const mask = parseInt(maskStr || '32', 10);
      if (this.cidrMatch(ip, base, mask)) return true;
    }
    return false;
  }

  private cidrMatch(ip: string, base: string, mask: number): boolean {
    const toInt = (x: string) => x.split('.').reduce((a,c)=> (a<<8) + (parseInt(c,10)&0xff), 0) >>> 0;
    const ipInt = toInt(ip);
    const baseInt = toInt(base);
    const maskInt = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;
    return (ipInt & maskInt) === (baseInt & maskInt);
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
