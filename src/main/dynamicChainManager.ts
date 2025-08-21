import { ChainConfig, ProxyNode, Subscription } from '../shared/types';
import { proxyManager } from './proxyManager';
import { settingsManager } from './settingsManager';

// 这是一个简化的本地存储替代方案，用于获取订阅信息
// 在实际应用中，这部分数据应该由一个专门的服务来管理
class LocalSubscriptionStore {
  getSubscriptions(): Subscription[] {
    // 注意：主进程无法直接访问 renderer 的 localStorage
    // 因此这里需要一种方式从持久化存储中获取订阅信息
    // 作为临时方案，我们从 settingsManager 读取
    const allSettings = settingsManager.getSettings();
    return allSettings.subscriptions || [];
  }
}

export class DynamicChainManager {
  private static instance: DynamicChainManager;
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private localSubscriptionStore: LocalSubscriptionStore;

  private constructor() {
    this.localSubscriptionStore = new LocalSubscriptionStore();
  }

  public static getInstance(): DynamicChainManager {
    if (!DynamicChainManager.instance) {
      DynamicChainManager.instance = new DynamicChainManager();
    }
    return DynamicChainManager.instance;
  }

  public async startChain(chainConfig: ChainConfig, listenPort: number): Promise<{ port: number }> {
    if (chainConfig.type !== 'dynamic' || !chainConfig.proxies) {
      throw new Error('Invalid dynamic chain configuration.');
    }

    console.log(`[DynamicChainManager] Starting dynamic chain: ${chainConfig.name} on port ${listenPort}`);
    const result = await this.updateAndApplyChain(chainConfig, listenPort);

    // 设置定时更新
    const updateInterval = 300000; // 5分钟
    if (this.activeTimers.has(chainConfig.id)) {
      clearInterval(this.activeTimers.get(chainConfig.id)!);
    }

    // Note: The timer will re-use the original listenPort for subsequent updates.
    // A more robust implementation might involve persisting this choice or having a default.
    const timer = setInterval(() => {
      console.log(`[DynamicChainManager] Auto-updating chain: ${chainConfig.name}`);
      this.updateAndApplyChain(chainConfig, listenPort).catch(error => {
        console.error(`[DynamicChainManager] Auto-update failed for chain ${chainConfig.name}:`, error);
      });
    }, updateInterval);

    this.activeTimers.set(chainConfig.id, timer);
    return result;
  }

  public stopChain(chainId: string): void {
    if (this.activeTimers.has(chainId)) {
      clearInterval(this.activeTimers.get(chainId)!);
      this.activeTimers.delete(chainId);
      console.log(`[DynamicChainManager] Stopped scheduled updates for chain ID: ${chainId}`);
      // 注意：这里仅停止了动态更新，代理核心的停止需要另外调用 proxyManager.stop()
    }
  }

  private async updateAndApplyChain(chainConfig: ChainConfig, listenPort: number): Promise<{ port: number }> {
    try {
      // 1. 获取所有订阅
      const allSubscriptions = this.localSubscriptionStore.getSubscriptions();
      
      // 2. 找到动态链中涉及的所有节点
      const nodesToTest: ProxyNode[] = [];
      const subscriptionNodeMap = new Map<string, ProxyNode[]>();

      for (const subId of chainConfig.proxies) {
        const subscription = allSubscriptions.find(s => s.id === subId);
        if (subscription && subscription.servers) {
          // 在 sing-box 中，ProxyNode 结构更简单，需要从 Subscription.servers 转换
          const subscriptionNodes: ProxyNode[] = subscription.servers.map(server => ({
                    // 直接从 server 对象映射到 ProxyNode 所需的字段
                    id: server.id,
                    name: server.name,
                    type: server.protocol, // `protocol` 映射到 `type`
                    server: server.host,   // `host` 映射到 `server`
                    port: server.port,
                    subscriptionId: subId,
                    // 确保 ProxyNode 定义中包含所有需要的字段，这里不再使用 ...server 以避免覆盖
                    // 如果 server 对象还有其他需要传递的属性，应在 ProxyNode 类型中定义并在此处显式映射
                  }));
          nodesToTest.push(...subscriptionNodes);
          subscriptionNodeMap.set(subId, subscriptionNodes);
        }
      }
      
      if (nodesToTest.length === 0) {
        console.warn(`[DynamicChainManager] No nodes found for dynamic chain ${chainConfig.name}.`);
        return { port: 0 }; // Return a default port or throw an error if no nodes are found
      }

      // 3. 测试所有节点的延迟
      console.log(`[DynamicChainManager] Testing latency for ${nodesToTest.length} nodes...`);
      const testResults = await proxyManager.testNodesLatency(nodesToTest);
      
      // 4. 从每个订阅组中选出最优节点
      const bestNodes: ProxyNode[] = [];
      for (const subId of chainConfig.proxies) {
        const nodesInSub = subscriptionNodeMap.get(subId) || [];
        const resultsForSub = testResults.filter(r => nodesInSub.some(n => n.id === r.nodeId));
        
        const validResults = resultsForSub.filter(r => r.success && r.latency > 0);
        if (validResults.length > 0) {
          validResults.sort((a, b) => a.latency - b.latency);
          const bestResult = validResults[0];
          const bestNode = nodesInSub.find(n => n.id === bestResult.nodeId);
          if (bestNode) {
            bestNodes.push(bestNode);
          }
        }
      }

      if (bestNodes.length === 0) {
        console.error(`[DynamicChainManager] Could not find any valid nodes for chain ${chainConfig.name} after testing.`);
        throw new Error(`Could not find any valid nodes for chain ${chainConfig.name} after testing.`);
      }
      
      // 5. 启动最优节点代理链
      if (bestNodes.length > 0) {
        console.log(`[DynamicChainManager] Starting proxy manager with ${bestNodes.length} best nodes.`);
        // 最终修复：直接传递最优节点对象数组，而不是节点ID数组
        const result = await proxyManager.startChain({ ...chainConfig, name: `${chainConfig.name}_dynamic` }, { listenPort }, bestNodes);
        console.log(`[DynamicChainManager] Proxy manager started successfully for chain: ${chainConfig.name}`);
        return result;
      } else {
        console.warn('[DynamicChainManager] No nodes found after latency test for dynamic chain', chainConfig.name);
        return { port: 0 }; // Return a default port or throw an error if no nodes are found
      }

    } catch (error) {
      console.error(`[DynamicChainManager] Failed to update and apply chain ${chainConfig.name}:`, error);
      throw error;
    }
  }
}

export const dynamicChainManager = DynamicChainManager.getInstance();