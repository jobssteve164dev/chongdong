import { createServer, Server, Socket } from 'net';
import { 
  TrafficStats, 
  MonitoringEvent, 
  MonitoringEventType,
  ProtectionRule,
  IAdapter,
  AdapterStatus
} from '../shared/types/middleware';
import { cfEdgeEgressService } from './services/cfEdgeEgressService';
import { cfEdgeClient } from './services/cfEdgeClient';
import { settingsManager } from './settingsManager';
import { DefaultSettings } from '../shared/defaultSettings';
import { HttpHeaderProtectionService } from './services/httpHeaderProtectionService';
import { behaviorDataManager, BehaviorDataSnapshot } from './services/behaviorDataManager';

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
  
  // 行为分析数据收集
  private behaviorData: {
    totalConnections: number;
    totalBytes: number;
    hourlyConnections: Map<number, number>;
    hourlyBytes: Map<number, number>;
    lastReset: number;
  } = {
    totalConnections: 0,
    totalBytes: 0,
    hourlyConnections: new Map(),
    hourlyBytes: new Map(),
    lastReset: Date.now()
  };

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
    
    // 记录连接活动用于行为分析
    this.recordConnectionActivity();
    
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

        // 2) 可选：若匹配 CF Edge 走向，则标记路径（此处仅决定是否继续做首包标准化；真正封装在后续迭代加入）
        const parsedMeta = this.parseHostnameFromFirstPacket(data);
        const targetHost = parsedMeta?.host;
        const useCfEdge = await cfEdgeEgressService.shouldUseForHostAsync(targetHost);

        // 3) HTTP 头标准化：仅在HTTP明文请求场景下尝试改写首包头部
        //    注意：这不会解密TLS流量；若为TLS，保持透明转发
        const str = data.toString('utf8');
        const isHttp1 = /^GET\s|^POST\s|^HEAD\s|^PUT\s|^DELETE\s|^OPTIONS\s|^PATCH\s/i.test(str);
        if (!useCfEdge && isHttp1 && this.httpHeaderProtector.getProtectionStatus().enabled) {
          // 将首包按行拆分并重写关键头部
          const endOfHeaders = str.indexOf('\r\n\r\n');
          if (endOfHeaders > 0) {
            const headersPart = str.substring(0, endOfHeaders);
            const bodyPart = str.substring(endOfHeaders + 4);
            const lines = headersPart.split('\r\n');
            const requestLine = lines.shift() || '';

            // 解析头并清洗去敏
            const kv: Record<string, string> = {};
            for (const line of lines) {
              const idx = line.indexOf(':');
              if (idx > 0) {
                const key = line.substring(0, idx).trim();
                const value = line.substring(idx + 1).trim();
                kv[key] = value;
              }
            }
            const sanitized = this.httpHeaderProtector.sanitizeHeaders(kv, 'chrome', { keep: ['host'] });

            const rebuilt = [requestLine]
              .concat(Object.entries(sanitized).map(([k, v]) => `${k}: ${v}`))
              .join('\r\n') + '\r\n\r\n' + bodyPart;
            outBuf = Buffer.from(rebuilt, 'utf8');
          }
        }
        // 若命中Edge策略且是HTTP明文GET首包，直接走Edge通道（简化首包转发）
        if (useCfEdge && isHttp1 && parsedMeta?.host) {
          const endOfHeaders = str.indexOf('\r\n\r\n');
          const headersPart = endOfHeaders > 0 ? str.substring(0, endOfHeaders) : str;
          const lines = headersPart.split('\r\n');
          const requestLine = lines.shift() || '';
          const [reqMethod, reqPath] = requestLine.split(' ');
          const hdr: Record<string,string> = {};
          for (const line of lines) {
            const idx = line.indexOf(':');
            if (idx > 0) {
              const k = line.substring(0, idx).trim();
              const v = line.substring(idx + 1).trim();
              hdr[k] = v;
            }
          }
          const url = `http://${hdr['Host'] || parsedMeta.host}${reqPath || '/'}`;
          try {
            const res = await cfEdgeClient.send({ url, method: reqMethod || 'GET', headers: hdr });
            // 回写响应到客户端
            const statusLine = `HTTP/1.1 ${res.status}\r\n`;
            const respHeaders: string[] = [];
            Object.entries(res.headers).forEach(([k,v]) => respHeaders.push(`${k}: ${v}`));
            const head = statusLine + respHeaders.join('\r\n') + '\r\n\r\n';
            if (!clientSocket.destroyed) {
              clientSocket.write(Buffer.from(head, 'utf8'));
              if (res.data && (res.data as any).byteLength > 0) clientSocket.write(Buffer.from(res.data));
            }
            return; // 已处理该首包
          } catch (e) {
            const errorMessage = (e as Error)?.message || String(e);
            console.error('[TrafficRouter] Edge 出口失败，已拒绝绕过所选路径:', errorMessage);
            this.emitMonitoringEvent(MonitoringEventType.ERROR_OCCURRED, {
              connectionId,
              error: `Edge 出口失败: ${errorMessage}`
            });
            clientSocket.destroy();
            adapterSocket.destroy();
            return;
          }
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error('[TrafficRouter] 信任中间件失败，已拒绝透明绕过:', errorMessage);
        this.emitMonitoringEvent(MonitoringEventType.ERROR_OCCURRED, {
          connectionId,
          error: `信任中间件失败: ${errorMessage}`
        });
        clientSocket.destroy();
        adapterSocket.destroy();
        return;
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

  /**
   * 获取行为分析数据（结合内存数据和持久化数据）
   */
  async getBehaviorAnalytics(): Promise<{
    totalConnections: number;
    totalBytes: number;
    averageConnections: number;
    peakConnections: number;
    averageBytesPerSecond: number;
    peakBytesPerSecond: number;
    activeHours: number[];
    connectionPatterns: { hour: number; connections: number }[];
    trafficPatterns: { hour: number; bytes: number }[];
    currentActiveConnections: number;
    currentBytesPerSecond: number;
  }> {
    try {
      // 获取持久化的历史数据
      const historicalData = await behaviorDataManager.getAggregatedData();
      
      // 结合当前内存数据
      const currentHour = new Date().getHours();
      const currentHourConnections = this.behaviorData.hourlyConnections.get(currentHour) || 0;
      const currentHourBytes = this.behaviorData.hourlyBytes.get(currentHour) || 0;
      
      // 合并历史数据和当前数据
      const combinedHourlyConnections: Record<number, number> = { ...historicalData.connectionPatterns.reduce((acc, p) => ({ ...acc, [p.hour]: p.connections }), {} as Record<number, number>) };
      const combinedHourlyBytes: Record<number, number> = { ...historicalData.trafficPatterns.reduce((acc, p) => ({ ...acc, [p.hour]: p.bytes }), {} as Record<number, number>) };
      
      // 更新当前小时的数据
      combinedHourlyConnections[currentHour] = (combinedHourlyConnections[currentHour] || 0) + currentHourConnections;
      combinedHourlyBytes[currentHour] = (combinedHourlyBytes[currentHour] || 0) + currentHourBytes;
      
      // 计算统计数据
      const hourlyConnections = Object.values(combinedHourlyConnections) as number[];
      const averageConnections = hourlyConnections.length > 0 
        ? hourlyConnections.reduce((sum, count) => sum + count, 0) / hourlyConnections.length 
        : 0;
      
      const peakConnections = Math.max(...hourlyConnections, 0);
      
      const hourlyBytes = Object.values(combinedHourlyBytes) as number[];
      const averageBytesPerSecond = hourlyBytes.length > 0 
        ? hourlyBytes.reduce((sum, bytes) => sum + bytes, 0) / hourlyBytes.length / 3600 
        : 0;
      const peakBytesPerSecond = Math.max(...hourlyBytes, 0) / 3600;
      
      // 找出活跃时段
      const activeHours: number[] = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourConnections = combinedHourlyConnections[hour] || 0;
        if (hourConnections > averageConnections * 0.5) {
          activeHours.push(hour);
        }
      }
      
      // 生成24小时模式数据
      const connectionPatterns = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        connections: combinedHourlyConnections[hour] || 0
      }));
      
      const trafficPatterns = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        bytes: combinedHourlyBytes[hour] || 0
      }));
      
      // 当前活跃连接数
      const currentActiveConnections = this.activeConnections.size;
      
      // 当前流量速度
      const currentBytesPerSecond = this.calculateCurrentThroughput();
      
      return {
        totalConnections: historicalData.totalConnections + this.behaviorData.totalConnections,
        totalBytes: historicalData.totalBytes + this.behaviorData.totalBytes,
        averageConnections,
        peakConnections,
        averageBytesPerSecond,
        peakBytesPerSecond,
        activeHours,
        connectionPatterns,
        trafficPatterns,
        currentActiveConnections,
        currentBytesPerSecond
      };
    } catch (error) {
      console.error('[TrafficRouter] 获取行为分析数据失败，使用内存数据:', error);
      
      // 降级到仅使用内存数据
      const recentConnections = Array.from(this.behaviorData.hourlyConnections.values());
      const averageConnections = recentConnections.length > 0 
        ? recentConnections.reduce((sum, count) => sum + count, 0) / recentConnections.length 
        : 0;
      
      const peakConnections = Math.max(...recentConnections, 0);
      
      const recentBytes = Array.from(this.behaviorData.hourlyBytes.values());
      const averageBytesPerSecond = recentBytes.length > 0 
        ? recentBytes.reduce((sum, bytes) => sum + bytes, 0) / recentBytes.length / 3600 
        : 0;
      const peakBytesPerSecond = Math.max(...recentBytes, 0) / 3600;
      
      const activeHours: number[] = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourConnections = this.behaviorData.hourlyConnections.get(hour) || 0;
        if (hourConnections > averageConnections * 0.5) {
          activeHours.push(hour);
        }
      }
      
      const connectionPatterns = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        connections: this.behaviorData.hourlyConnections.get(hour) || 0
      }));
      
      const trafficPatterns = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        bytes: this.behaviorData.hourlyBytes.get(hour) || 0
      }));
      
      return {
        totalConnections: this.behaviorData.totalConnections,
        totalBytes: this.behaviorData.totalBytes,
        averageConnections,
        peakConnections,
        averageBytesPerSecond,
        peakBytesPerSecond,
        activeHours,
        connectionPatterns,
        trafficPatterns,
        currentActiveConnections: this.activeConnections.size,
        currentBytesPerSecond: this.calculateCurrentThroughput()
      };
    }
  }

  private calculateCurrentThroughput(): number {
    // 计算最近1分钟内的流量速度
    const oneMinuteAgo = Date.now() - 60000;
    let recentBytes = 0;
    
    for (const [, stats] of this.connectionStats.entries()) {
      if (stats.start > oneMinuteAgo) {
        recentBytes += stats.upload + stats.download;
      }
    }
    
    return recentBytes / 60; // 字节/秒
  }

  private recordConnectionActivity(): void {
    const now = new Date();
    const currentHour = now.getHours();
    
    // 记录当前小时的连接数
    const currentHourConnections = this.behaviorData.hourlyConnections.get(currentHour) || 0;
    this.behaviorData.hourlyConnections.set(currentHour, currentHourConnections + 1);
    
    // 记录当前小时的流量
    const currentHourBytes = this.behaviorData.hourlyBytes.get(currentHour) || 0;
    const currentBytes = this.calculateCurrentThroughput() * 60; // 转换为小时流量
    this.behaviorData.hourlyBytes.set(currentHour, currentHourBytes + currentBytes);
    
    // 更新总计数
    this.behaviorData.totalConnections++;
    this.behaviorData.totalBytes += currentBytes;
    
    // 定期保存数据到持久化存储（每小时保存一次）
    this.scheduleDataPersistence();
  }

  private lastPersistenceTime: number = 0;
  private persistenceInterval: number = 60 * 60 * 1000; // 1小时

  private scheduleDataPersistence(): void {
    const now = Date.now();
    if (now - this.lastPersistenceTime > this.persistenceInterval) {
      this.persistBehaviorData();
      this.lastPersistenceTime = now;
    }
  }

  private async persistBehaviorData(): Promise<void> {
    try {
      const snapshot: BehaviorDataSnapshot = {
        timestamp: Date.now(),
        totalConnections: this.behaviorData.totalConnections,
        totalBytes: this.behaviorData.totalBytes,
        hourlyConnections: Object.fromEntries(this.behaviorData.hourlyConnections),
        hourlyBytes: Object.fromEntries(this.behaviorData.hourlyBytes)
      };

      await behaviorDataManager.saveSnapshot(snapshot);
      console.log('[TrafficRouter] 行为数据已保存到持久化存储');
    } catch (error) {
      console.error('[TrafficRouter] 保存行为数据失败:', error);
    }
  }
}
