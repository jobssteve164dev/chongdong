import { ProxyNode } from './index';

/**
 * 协议适配器状态
 */
export enum AdapterStatus {
  IDLE = 'idle',
  STARTING = 'starting',
  RUNNING = 'running',
  ERROR = 'error',
  STOPPING = 'stopping',
  STOPPED = 'stopped'
}

/**
 * 协议适配器信息
 */
export interface ProtocolAdapterInfo {
  id: string;
  node: ProxyNode;
  status: AdapterStatus;
  port: number;
  processId?: number | undefined;
  error?: string | undefined;
  startTime?: Date | undefined;
  trafficStats: TrafficStats;
}

/**
 * 流量统计信息
 */
export interface TrafficStats {
  bytesReceived: number;
  bytesSent: number;
  connections: number;
  lastActivity: Date;
}

/**
 * 代理链中间件配置
 */
export interface ProxyChainMiddlewareConfig {
  entryPort: number;
  nodes: ProxyNode[];
  enableMonitoring: boolean;
  enableProtection: boolean;
  maxRetries: number;
  timeout: number;
}

/**
 * 代理链中间件状态
 */
export interface ProxyChainMiddlewareStatus {
  id: string;
  status: 'idle' | 'starting' | 'running' | 'error' | 'stopping' | 'stopped';
  adapters: ProtocolAdapterInfo[];
  entryPort: number;
  error?: string | undefined;
  startTime?: Date | undefined;
  trafficStats: TrafficStats;
}

/**
 * 流量路由规则
 */
export interface TrafficRouteRule {
  source: string;
  target: string;
  condition?: string;
  priority: number;
}

/**
 * 监控事件类型
 */
export enum MonitoringEventType {
  CONNECTION_START = 'connection_start',
  CONNECTION_END = 'connection_end',
  TRAFFIC_FLOW = 'traffic_flow',
  ERROR_OCCURRED = 'error_occurred',
  NODE_FAILURE = 'node_failure',
  NODE_RECOVERY = 'node_recovery'
}

/**
 * 监控事件
 */
export interface MonitoringEvent {
  type: MonitoringEventType;
  timestamp: Date;
  adapterId?: string;
  nodeId?: string;
  data?: any;
  error?: string;
}

/**
 * 防护规则
 */
export interface ProtectionRule {
  id: string;
  name: string;
  type: 'rate_limit' | 'blacklist' | 'whitelist' | 'traffic_analysis';
  enabled: boolean;
  config: any;
}

/**
 * 中间件API接口
 */
export interface IProxyChainMiddleware {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): ProxyChainMiddlewareStatus;
  getTrafficStats(): TrafficStats;
  addMonitoringListener(callback: (event: MonitoringEvent) => void): void;
  removeMonitoringListener(callback: (event: MonitoringEvent) => void): void;
  addProtectionRule(rule: ProtectionRule): void;
  removeProtectionRule(ruleId: string): void;
}
