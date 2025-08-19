import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProxyNode, ChainConfig } from '../../shared/types';

// 延迟信息接口
export interface LatencyInfo {
  latency: number;
  timestamp: number;
}

// IP地理位置信息接口
export interface GeolocationInfo {
  ip?: string;
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
  timezone?: string;
  timestamp: number;
}

export interface NodeStore {
  nodes: ProxyNode[];
  setNodes: (nodes: ProxyNode[]) => void;
  // 节点延迟信息 - 修改为包含时间戳的对象
  nodeLatencies: Map<string, LatencyInfo>;
  setNodeLatency: (nodeId: string, latency: number, timestamp?: number) => void;
  setNodeLatencies: (latencies: Map<string, LatencyInfo>) => void;
  // 检查延迟是否在有效期内
  isLatencyValid: (nodeId: string, validityPeriod?: number) => boolean;
  // 获取有效的延迟信息
  getValidLatency: (nodeId: string, validityPeriod?: number) => number | null;
  // 默认代理链
  defaultChainId: string | null;
  setDefaultChainId: (chainId: string | null) => void;
  // 获取延迟最小的可用节点
  getBestNode: () => ProxyNode | null;
  // 全局代理连接状态
  proxyConnected: boolean;
  setProxyConnected: (connected: boolean) => void;
  proxyStartTime: number | null;
  setProxyStartTime: (startTime: number | null) => void;
  currentProxyNode: ProxyNode | null;
  setCurrentProxyNode: (node: ProxyNode | null) => void;
  currentProxyChain: ChainConfig | null;
  setCurrentProxyChain: (chain: ChainConfig | null) => void;
  // 流量统计
  trafficStats: {
    upload: number;
    download: number;
    uploadSpeed: number;
    downloadSpeed: number;
    connections: number;
  };
  setTrafficStats: (stats: Partial<NodeStore['trafficStats']>) => void;
  // IP地理位置信息
  currentGeolocation: GeolocationInfo | null;
  setCurrentGeolocation: (geolocation: GeolocationInfo | null) => void;
  isGeolocationValid: (validityPeriod?: number) => boolean;
}

export const useNodeStore = create<NodeStore>()(
  persist(
    (set, get) => ({
      nodes: [],
      setNodes: (nodes: ProxyNode[]) => set({ nodes }),
      
      nodeLatencies: new Map(),
      setNodeLatency: (nodeId, latency, timestamp = Date.now()) => set((state) => {
        // 确保 nodeLatencies 是 Map 对象
        const currentLatencies = state.nodeLatencies instanceof Map 
          ? state.nodeLatencies 
          : new Map();
        const newLatencies = new Map(currentLatencies);
        newLatencies.set(nodeId, { latency, timestamp });
        return { nodeLatencies: newLatencies };
      }),
      setNodeLatencies: (latencies) => set({ nodeLatencies: latencies }),
      
      // 检查延迟是否在有效期内（默认30分钟）
      isLatencyValid: (nodeId, validityPeriod = 30 * 60 * 1000) => {
        const state = get();
        // 确保 nodeLatencies 是 Map 对象
        const nodeLatencies = state.nodeLatencies instanceof Map 
          ? state.nodeLatencies 
          : new Map();
        const latencyInfo = nodeLatencies.get(nodeId);
        if (!latencyInfo) return false;
        
        const now = Date.now();
        const age = now - latencyInfo.timestamp;
        return age < validityPeriod;
      },
      
      // 获取有效的延迟信息
      getValidLatency: (nodeId, validityPeriod = 30 * 60 * 1000) => {
        const state = get();
        // 确保 nodeLatencies 是 Map 对象
        const nodeLatencies = state.nodeLatencies instanceof Map 
          ? state.nodeLatencies 
          : new Map();
        const latencyInfo = nodeLatencies.get(nodeId);
        if (!latencyInfo) return null;
        
        const now = Date.now();
        const age = now - latencyInfo.timestamp;
        if (age >= validityPeriod) return null;
        
        return latencyInfo.latency;
      },
      
      defaultChainId: null,
      setDefaultChainId: (chainId) => set({ defaultChainId: chainId }),
      
      // 全局代理连接状态
      proxyConnected: false,
      setProxyConnected: (connected) => set({ proxyConnected: connected }),
      proxyStartTime: null,
      setProxyStartTime: (startTime) => set({ proxyStartTime: startTime }),
      currentProxyNode: null,
      setCurrentProxyNode: (node) => set({ currentProxyNode: node }),
      currentProxyChain: null,
      setCurrentProxyChain: (chain) => set({ currentProxyChain: chain }),
      
      // 流量统计
      trafficStats: {
        upload: 0,
        download: 0,
        uploadSpeed: 0,
        downloadSpeed: 0,
        connections: 0,
      },
      setTrafficStats: (stats) => set((state) => ({
        trafficStats: { ...state.trafficStats, ...stats }
      })),
      
      // IP地理位置信息
      currentGeolocation: null,
      setCurrentGeolocation: (geolocation) => set({ currentGeolocation: geolocation }),
      isGeolocationValid: (validityPeriod = 30 * 60 * 1000) => {
        const state = get();
        if (!state.currentGeolocation) return false;
        
        const now = Date.now();
        const age = now - state.currentGeolocation.timestamp;
        return age < validityPeriod;
      },
      
      getBestNode: () => {
        const state = get();
        
        console.log('=== getBestNode 调试信息 ===');
        console.log('state.nodes.length:', state.nodes.length);
        console.log('state.nodeLatencies 类型:', typeof state.nodeLatencies, state.nodeLatencies instanceof Map);
        
        // 确保 nodeLatencies 是 Map 对象
        if (!(state.nodeLatencies instanceof Map)) {
          console.warn('nodeLatencies 不是 Map 对象，重新初始化');
          console.log('nodeLatencies 内容:', state.nodeLatencies);
          // 如果没有延迟信息，返回第一个节点
          if (state.nodes.length > 0) {
            console.log('返回第一个节点:', state.nodes[0]);
            return state.nodes[0];
          }
          console.log('没有可用节点，返回 null');
          return null;
        }
        
        // 首先尝试找到有有效延迟信息且延迟大于0的节点
        const availableNodes = state.nodes.filter(node => {
          const latency = state.getValidLatency(node.id);
          console.log(`节点 ${node.name} (${node.id}) 延迟:`, latency);
          return latency && latency > 0; // 延迟存在且不为0
        });
        
        console.log('有有效延迟信息的节点数量:', availableNodes.length);
        
        if (availableNodes.length > 0) {
          // 按延迟排序，选择延迟最小的节点
          const sortedNodes = availableNodes.sort((a, b) => {
            const latencyA = state.getValidLatency(a.id) || Infinity;
            const latencyB = state.getValidLatency(b.id) || Infinity;
            return latencyA - latencyB;
          });
          console.log('选择的最佳节点:', sortedNodes[0]);
          return sortedNodes[0];
        }
        
        // 如果没有有效延迟信息，返回第一个节点
        if (state.nodes.length > 0) {
          console.log('没有有效延迟信息，返回第一个节点:', state.nodes[0]);
          return state.nodes[0];
        }
        
        console.log('没有任何可用节点，返回 null');
        return null;
      }
    }),
    {
      name: 'node-store',
      // 只持久化非Map数据，Map数据在初始化时重新创建
      partialize: (state: NodeStore) => ({
        nodes: state.nodes,
        defaultChainId: state.defaultChainId,
        proxyConnected: state.proxyConnected,
        currentProxyNode: state.currentProxyNode,
        currentProxyChain: state.currentProxyChain,
        trafficStats: state.trafficStats,
              // 将Map转换为数组进行持久化
      nodeLatenciesArray: Array.from(state.nodeLatencies.entries()),
      currentGeolocation: state.currentGeolocation
      })
    }
  )
);
