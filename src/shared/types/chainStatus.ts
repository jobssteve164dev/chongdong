/**
 * 代理链状态相关类型定义
 */

export interface ChainNodeStatus {
    /** 节点ID */
    nodeId: string;
    /** 节点名称 */
    nodeName: string;
    /** 节点类型 */
    nodeType: string;
    /** 服务器地址 */
    server: string;
    /** 端口 */
    port: number;
    /** 本地监听端口 */
    localPort: number;
    /** 连接状态 */
    status: 'connected' | 'disconnected' | 'error';
    /** 延迟（毫秒） */
    latency?: number;
    /** 流量统计 */
    traffic: {
      upload: number;
      download: number;
      connections: number;
    };
    /** 错误信息 */
    error?: string;
    /** 连接时间 */
    connectTime?: Date;
  }
  
  export interface ProxyChainStatus {
    /** 代理链ID */
    chainId: string;
    /** 代理链名称 */
    chainName: string;
    /** 代理链类型 */
    chainType: 'static' | 'dynamic';
    /** 整体状态 */
    status: 'running' | 'stopped' | 'error';
    /** 节点状态列表 */
    nodes: ChainNodeStatus[];
    /** 入口端口 */
    entryPort: number;
    /** 总流量统计 */
    totalTraffic: {
      upload: number;
      download: number;
      connections: number;
    };
    /** 启动时间 */
    startTime?: Date;
    /** 错误信息 */
    error?: string;
  }
  
  export interface ChainIPDetectionResult {
    /** 检测是否成功 */
    success: boolean;
    /** 检测到的IP地址 */
    ip?: string;
    /** 地理位置信息 */
    geolocation?: {
      country?: string;
      region?: string;
      city?: string;
      isp?: string;
    };
    /** 检测方法 */
    method: 'direct' | 'proxy' | 'chain';
    /** 检测时间 */
    timestamp: number;
    /** 错误信息 */
    error?: string;
  }
  
  export interface ChainNodeIPInfo {
    /** 节点ID */
    nodeId: string;
    /** 节点名称 */
    nodeName: string;
    /** 节点在链中的位置 */
    position: number;
    /** 检测结果 */
    detection: ChainIPDetectionResult;
    /** 是否检测成功 */
    detected: boolean;
  }