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

  public async startChain(chainConfig: ChainConfig): Promise<void> {
    if (chainConfig.type !== 'dynamic' || !chainConfig.proxies) {
      throw new Error('Invalid dynamic chain configuration.');
    }

    console.log(`[DynamicChainManager] Starting dynamic chain: ${chainConfig.name}`);
    await this.updateAndApplyChain(chainConfig);

    // 设置定时更新
    const updateInterval = 300000; // 5分钟
    if (this.activeTimers.has(chainConfig.id)) {
      clearInterval(this.activeTimers.get(chainConfig.id)!);
    }

    const timer = setInterval(() => {
      console.log(`[DynamicChainManager] Performing scheduled update for chain: ${chainConfig.name}`);
      this.updateAndApplyChain(chainConfig);
    }, updateInterval);

    this.activeTimers.set(chainConfig.id, timer);
  }

  public stopChain(chainId: string): void {
    if (this.activeTimers.has(chainId)) {
      clearInterval(this.activeTimers.get(chainId)!);
      this.activeTimers.delete(chainId);
      console.log(`[DynamicChainManager] Stopped scheduled updates for chain ID: ${chainId}`);
      // 注意：这里仅停止了动态更新，代理核心的停止需要另外调用 proxyManager.stop()
    }
  }

  private async updateAndApplyChain(chainConfig: ChainConfig): Promise<void> {
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
        return;
      }

      // 3. 批量测试节点延迟
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
        return;
      }
      
      console.log(`[DynamicChainManager] Best nodes selected for ${chainConfig.name}:`, bestNodes.map(n => n.name));

      // 5. 构建并启动真正的代理链
      const tempChainConfig: ChainConfig = {
        id: chainConfig.id,
        name: `${chainConfig.name}_dynamic`,
        description: `Dynamic chain based on ${chainConfig.name}`,
        type: 'static',
        proxies: bestNodes.map(n => n.id),
        rules: [],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // 获取网络设置
      const settings = settingsManager.getSettings();
      const networkSettings = {
        enableDns: settings.enableDns || false,
        dnsServer: settings.dnsServer || '8.8.8.8',
        enableDoh: settings.enableDoh || false,
        dohServer: settings.dohServer || '',
        enableDot: settings.enableDot || false,
        dotServer: settings.dotServer || '',
        enableDnsCache: settings.enableDnsCache || false,
        dnsCacheSize: settings.dnsCacheSize || 1000,
        dnsCacheTtl: settings.dnsCacheTtl || 300,
        enableDnsLoadBalance: settings.enableDnsLoadBalance || false,
        dnsServers: settings.dnsServers || [],
        enableDnsLogging: settings.enableDnsLogging || false,
        enableDnsLeakProtection: settings.enableDnsLeakProtection || false,
        dnsLeakProtectionMode: settings.dnsLeakProtectionMode || 'relaxed',
        enableDnsRules: settings.enableDnsRules || false,
        dnsRules: settings.dnsRules || [],
        enableDnsFallback: settings.enableDnsFallback || false,
        dnsFallbackServers: settings.dnsFallbackServers || [],
        enableTun: settings.enableTun || false,
        tunDevice: settings.tunDevice || 'utun0',
        enableFakeIp: settings.enableFakeIp || false,
        fakeIpRange: settings.fakeIpRange || '198.18.0.1/16',
        enableUdp: settings.enableUdp || true,
        enableIpv6: settings.enableIpv6 || false,
        logLevel: settings.logLevel || 'info',
        enableLog: settings.enableLog || false,
        logFile: settings.logFile || ''
      };
      
      console.log("[DynamicChainManager] Starting real proxy chain with selected nodes.");
      await proxyManager.startChain(tempChainConfig, networkSettings);

    } catch (error) {
      console.error(`[DynamicChainManager] Failed to update and apply chain ${chainConfig.name}:`, error);
    }
  }

  // 可选：如果需要一个完整的临时配置对象
  /*
  private createTempStaticConfig(originalChain: ChainConfig, nodes: ProxyNode[]): ChainConfig {
    return {
      ...originalChain,
      type: 'static',
      proxies: nodes.map(n => n.id),
      // 注意：这里的 nodes 数组需要在 proxyManager 中被正确解析
    };
  }
  */
}

export const dynamicChainManager = DynamicChainManager.getInstance();
