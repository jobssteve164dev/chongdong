import { ProxyServer } from '../../shared/types/index';
import { log } from './logger';

export interface LatencyTestResult {
  latency: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface LatencyTestConfig {
  testUrl: string;
  timeout: number;
  retries: number;
  testInterval: number;
}

export class LatencyTester {
  private static instance: LatencyTester;
  private defaultConfig: LatencyTestConfig = {
    testUrl: 'http://connectivitycheck.gstatic.com/generate_204',
    timeout: 10000, // 10秒超时
    retries: 3,
    testInterval: 600000 // 10分钟
  };

  private constructor() {}

  public static getInstance(): LatencyTester {
    if (!LatencyTester.instance) {
      LatencyTester.instance = new LatencyTester();
    }
    return LatencyTester.instance;
  }

  /**
   * 测试单个节点的延迟
   */
  public async testNodeLatency(node: ProxyServer, config?: Partial<LatencyTestConfig>): Promise<LatencyTestResult> {
    const testConfig = { ...this.defaultConfig, ...config };
    
    try {
      log.info(`开始测试节点延迟: ${node.name}`, { host: node.host, port: node.port }, 'LatencyTester');
      
      const startTime = Date.now();
      
      // 构建代理URL
      const proxyUrl = this.buildProxyUrl(node);
      
      // 创建测试请求
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), testConfig.timeout);
      
      try {
        const response = await fetch(testConfig.testUrl, {
          method: 'GET',
          signal: controller.signal,
          // 注意：这里需要根据实际的代理配置来设置
          // 在实际应用中，可能需要通过主进程来测试代理连接
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const endTime = Date.now();
          const latency = endTime - startTime;
          
          log.info(`节点延迟测试成功: ${node.name}`, { latency }, 'LatencyTester');
          
          return {
            latency,
            success: true,
            timestamp: Date.now()
          };
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error(`节点延迟测试失败: ${node.name}`, error, 'LatencyTester');
      
      return {
        latency: 0,
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }

  /**
   * 批量测试节点延迟
   */
  public async testNodesLatency(nodes: ProxyServer[], config?: Partial<LatencyTestConfig>): Promise<Map<string, LatencyTestResult>> {
    const results = new Map<string, LatencyTestResult>();
    const testConfig = { ...this.defaultConfig, ...config };
    
    log.info(`开始批量延迟测试`, { nodeCount: nodes.length }, 'LatencyTester');
    
    // 并发测试，但限制并发数量避免过载
    const concurrency = 5;
    const chunks = this.chunkArray(nodes, concurrency);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (node) => {
        const result = await this.testNodeLatency(node, testConfig);
        return { nodeId: node.id, result };
      });
      
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      chunkResults.forEach((promiseResult) => {
        if (promiseResult.status === 'fulfilled') {
          results.set(promiseResult.value.nodeId, promiseResult.value.result);
        } else {
          log.error('批量延迟测试中的单个测试失败', promiseResult.reason, 'LatencyTester');
        }
      });
      
      // 在批次之间稍作延迟
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const successCount = Array.from(results.values()).filter(r => r.success).length;
    log.info(`批量延迟测试完成`, { 
      total: nodes.length, 
      success: successCount, 
      failed: nodes.length - successCount 
    }, 'LatencyTester');
    
    return results;
  }

  /**
   * 通过主进程测试代理延迟（推荐方法）
   */
  public async testNodeLatencyViaMainProcess(node: ProxyServer, config?: Partial<LatencyTestConfig>): Promise<LatencyTestResult> {
    const testConfig = { ...this.defaultConfig, ...config };
    
    try {
      log.info(`通过主进程测试节点延迟: ${node.name}`, { host: node.host, port: node.port }, 'LatencyTester');
      
      const result = await window.electron.ipcRenderer.invoke('proxy:testLatency', {
        node,
        config: testConfig
      });
      
      if (result.success) {
        log.info(`主进程延迟测试成功: ${node.name}`, { latency: result.latency }, 'LatencyTester');
        return {
          latency: result.latency,
          success: true,
          timestamp: Date.now()
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error(`主进程延迟测试失败: ${node.name}`, error, 'LatencyTester');
      
      return {
        latency: 0,
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }

  /**
   * 批量通过主进程测试代理延迟
   */
  public async testNodesLatencyViaMainProcess(nodes: ProxyServer[], config?: Partial<LatencyTestConfig>): Promise<Map<string, LatencyTestResult>> {
    const results = new Map<string, LatencyTestResult>();
    const testConfig = { ...this.defaultConfig, ...config };
    
    log.info(`通过主进程开始批量延迟测试`, { nodeCount: nodes.length }, 'LatencyTester');
    
    // 并发测试，但限制并发数量
    const concurrency = 3; // 主进程测试并发数更少
    const chunks = this.chunkArray(nodes, concurrency);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (node) => {
        const result = await this.testNodeLatencyViaMainProcess(node, testConfig);
        return { nodeId: node.id, result };
      });
      
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      chunkResults.forEach((promiseResult) => {
        if (promiseResult.status === 'fulfilled') {
          results.set(promiseResult.value.nodeId, promiseResult.value.result);
        } else {
          log.error('主进程批量延迟测试中的单个测试失败', promiseResult.reason, 'LatencyTester');
        }
      });
      
      // 在批次之间稍作延迟
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const successCount = Array.from(results.values()).filter(r => r.success).length;
    log.info(`主进程批量延迟测试完成`, { 
      total: nodes.length, 
      success: successCount, 
      failed: nodes.length - successCount 
    }, 'LatencyTester');
    
    return results;
  }

  /**
   * 构建代理URL
   */
  private buildProxyUrl(node: ProxyServer): string {
    const protocol = node.tls ? 'https' : 'http';
    const auth = node.username && node.password ? `${node.username}:${node.password}@` : '';
    return `${protocol}://${auth}${node.host}:${node.port}`;
  }

  /**
   * 将数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 更新测试配置
   */
  public updateConfig(config: Partial<LatencyTestConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
    log.info('延迟测试配置已更新', this.defaultConfig, 'LatencyTester');
  }

  /**
   * 获取当前配置
   */
  public getConfig(): LatencyTestConfig {
    return { ...this.defaultConfig };
  }
}

export const latencyTester = LatencyTester.getInstance();
