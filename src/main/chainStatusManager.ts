import { 
  ChainNodeStatus, 
  ProxyChainStatus, 
  ChainIPDetectionResult, 
  ChainNodeIPInfo 
} from '../shared/types/chainStatus';
import { ProxyNode } from '../shared/types';
import { ProxyChainMiddlewareManager } from './proxyChainMiddlewareManager';

/**
 * 代理链状态管理器
 * 负责收集和提供代理链的详细状态信息
 */
export class ChainStatusManager {
  private static instance: ChainStatusManager;
  private chainStatuses: Map<string, ProxyChainStatus> = new Map();
  private ipDetectionCache: Map<string, ChainIPDetectionResult> = new Map();
  private detectionInterval?: NodeJS.Timeout;

  private constructor() {
    // 取消自动定时IP检测，改为手动触发
    // this.startPeriodicDetection();
  }

  public static getInstance(): ChainStatusManager {
    if (!ChainStatusManager.instance) {
      ChainStatusManager.instance = new ChainStatusManager();
    }
    return ChainStatusManager.instance;
  }

  /**
   * 更新代理链状态
   */
  public updateChainStatus(
    chainId: string, 
    chainName: string, 
    chainType: 'static' | 'dynamic',
    middlewareManager: ProxyChainMiddlewareManager,
    nodes: ProxyNode[]
  ): void {
    try {
      const middlewareStatus = middlewareManager.getStatus();
      const adapters = middlewareStatus.adapters;
      
      // 构建节点状态列表
      const nodeStatuses: ChainNodeStatus[] = nodes.map((node) => {
        const adapter = adapters.find(adapter => adapter.node.id === node.id);
        
        return {
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.type,
          server: node.server,
          port: node.port,
          localPort: adapter?.port || 0,
          status: adapter?.status === 'running' ? 'connected' : 'disconnected',
          traffic: {
            upload: adapter?.trafficStats?.bytesSent || 0,
            download: adapter?.trafficStats?.bytesReceived || 0,
            connections: adapter?.trafficStats?.connections || 0
          },
          error: adapter?.error || undefined,
          connectTime: adapter?.startTime || undefined
        };
      });

      // 计算总流量
      const totalTraffic = nodeStatuses.reduce((total, node) => ({
        upload: total.upload + node.traffic.upload,
        download: total.download + node.traffic.download,
        connections: total.connections + node.traffic.connections
      }), { upload: 0, download: 0, connections: 0 });

      const chainStatus: ProxyChainStatus = {
        chainId,
        chainName,
        chainType,
        status: middlewareStatus.status === 'running' ? 'running' : 'stopped',
        nodes: nodeStatuses,
        entryPort: middlewareStatus.entryPort,
        totalTraffic,
        startTime: middlewareStatus.startTime || undefined,
        error: middlewareStatus.error || undefined
      };

      this.chainStatuses.set(chainId, chainStatus);
      
      // 取消自动IP检测：仅在用户手动触发时进行
      
      console.log(`[ChainStatusManager] 代理链状态已更新: ${chainName}`, { chainId, nodeCount: nodes.length });
    } catch (error) {
      console.error(`[ChainStatusManager] 更新代理链状态失败: ${chainId}`, error);
    }
  }

  /**
   * 获取代理链状态
   */
  public getChainStatus(chainId: string): ProxyChainStatus | null {
    return this.chainStatuses.get(chainId) || null;
  }

  /**
   * 获取所有代理链状态
   */
  public getAllChainStatuses(): ProxyChainStatus[] {
    return Array.from(this.chainStatuses.values());
  }

  /**
   * 移除代理链状态
   */
  public removeChainStatus(chainId: string): void {
    this.chainStatuses.delete(chainId);
    this.ipDetectionCache.delete(chainId);
  }

  /**
   * 检测代理链中每个节点的IP地址
   * 注意：这是一个敏感操作，需要谨慎处理
   */
  public async detectChainNodeIPs(chainId: string): Promise<ChainNodeIPInfo[]> {
    const chainStatus = this.chainStatuses.get(chainId);
    if (!chainStatus) {
      throw new Error(`代理链不存在: ${chainId}`);
    }

    const results: ChainNodeIPInfo[] = [];
    
    for (let i = 0; i < chainStatus.nodes.length; i++) {
      const node = chainStatus.nodes[i];
      if (!node) continue;
      
      try {
        // 为每个节点创建独立的检测
        const detection = await this.detectNodeIP(node, i, chainStatus.entryPort, i === chainStatus.nodes.length - 1);
        
        results.push({
          nodeId: node.nodeId,
          nodeName: node.nodeName,
          position: i,
          detection,
          detected: detection.success
        });
        
        // 缓存检测结果
        const cacheKey = `${chainId}_${node.nodeId}`;
        this.ipDetectionCache.set(cacheKey, detection);
        
      } catch (error) {
        console.error(`[ChainStatusManager] 检测节点IP失败: ${node.nodeName}`, error);
        
        results.push({
          nodeId: node.nodeId,
          nodeName: node.nodeName,
          position: i,
          detection: {
            success: false,
            method: 'chain',
            timestamp: Date.now(),
            error: error instanceof Error ? error.message : String(error)
          },
          detected: false
        });
      }
    }
    
    return results;
  }

  /**
   * 检测单个节点的IP地址
   */
  private async detectNodeIP(
    node: ChainNodeStatus,
    _position: number,
    fallbackPort?: number,
    isLastNode: boolean = false
  ): Promise<ChainIPDetectionResult> {
    try {
      // 方法1: 通过节点的本地端口进行检测
      if (node.localPort && node.status === 'connected') {
        const result = await this.detectIPViaPort(node.localPort);
        if (result.success) {
          return { ...result, method: 'proxy' };
        }
      }

      // 对最终节点做回退：其入站可能不是mixed/不支持SOCKS/HTTP，
      // 回退使用链入口端口（TrafficRouter 的 mixed 端口）检测，以代表最终出口IP
      if (isLastNode && typeof fallbackPort === 'number' && fallbackPort > 0) {
        const fallback = await this.detectIPViaPort(fallbackPort);
        if (fallback.success) {
          return { ...fallback, method: 'chain' };
        }
      }
      
      // 方法2: 直接检测（仅用于测试，实际使用中应避免）
      // 这里可以添加直接检测逻辑，但需要谨慎处理隐私问题
      
      return {
        success: false,
        method: 'chain',
        timestamp: Date.now(),
        error: '无法检测到节点IP地址'
      };
      
    } catch (error) {
      return {
        success: false,
        method: 'chain',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 通过端口检测IP地址
   */
  private async detectIPViaPort(port: number): Promise<ChainIPDetectionResult> {
    try {
      // 使用多个IP检测API
      const apis = [
        'https://ipapi.co/json/',
        'https://ipinfo.io/json',
        'https://api.ipify.org?format=json'
      ];

      for (const api of apis) {
        try {
          const result = await this.fetchIPViaProxy(api, port);
          if (result.success) {
            return result;
          }
        } catch (error) {
          console.warn(`[ChainStatusManager] IP检测API失败: ${api}`, error);
        }
      }
      
      return {
        success: false,
        method: 'proxy',
        timestamp: Date.now(),
        error: '所有IP检测API都不可用'
      };
      
    } catch (error) {
      return {
        success: false,
        method: 'proxy',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 通过代理端口获取IP信息
   */
  private async fetchIPViaProxy(apiUrl: string, port: number): Promise<ChainIPDetectionResult> {
    return new Promise((resolve) => {
      try {
        const { SocksClient } = require('socks');
        const { URL } = require('url');
        
        const targetUrl = new URL(apiUrl);
        
        // 尝试SOCKS5连接
        SocksClient.createConnection({
          proxy: {
            host: '127.0.0.1',
            port: port,
            type: 5 // SOCKS5
          },
          command: 'connect',
          destination: {
            host: targetUrl.hostname,
            port: parseInt(targetUrl.port) || (targetUrl.protocol === 'https:' ? 443 : 80)
          },
          timeout: 10000
        }).then(({ socket }: any) => {
          const onError = (err: any) => {
            resolve({
              success: false,
              method: 'proxy',
              timestamp: Date.now(),
              error: err?.message || String(err)
            });
          };
          
          socket.on('error', onError);
          
          if (targetUrl.protocol === 'https:') {
            const tls = require('tls');
            const secureSocket = tls.connect({
              socket: socket,
              servername: targetUrl.hostname,
              rejectUnauthorized: false,
              timeout: 8000
            }, () => {
              const requestLines = [
                `GET ${targetUrl.pathname + targetUrl.search} HTTP/1.1`,
                `Host: ${targetUrl.hostname}`,
                'Accept: application/json',
                'User-Agent: Chongdong/1.0',
                'Connection: close',
                '',
                ''
              ].join('\r\n');
              
              let data = '';
              secureSocket.write(requestLines);
              secureSocket
                .on('data', (chunk: any) => (data += chunk.toString()))
                .on('error', onError)
                .on('end', () => {
                  try {
                    const body = data.split('\r\n\r\n')[1] || '';
                    const jsonData = JSON.parse(body);
                    
                    resolve({
                      success: true,
                      ip: jsonData.ip,
                      geolocation: {
                        country: jsonData.country || jsonData.country_name,
                        region: jsonData.region,
                        city: jsonData.city,
                        isp: jsonData.org || jsonData.isp
                      },
                      method: 'proxy',
                      timestamp: Date.now()
                    });
                  } catch (e) {
                    resolve({
                      success: false,
                      method: 'proxy',
                      timestamp: Date.now(),
                      error: 'Failed to parse response'
                    });
                  }
                });
            });
            
            // 添加TLS连接错误处理
            secureSocket.on('error', (err: any) => {
              console.warn(`[ChainStatusManager] TLS连接错误: ${apiUrl}`, err.message);
              onError(err);
            });
            
            secureSocket.on('timeout', () => {
              console.warn(`[ChainStatusManager] TLS连接超时: ${apiUrl}`);
              secureSocket.destroy();
              onError(new Error('TLS连接超时'));
            });
          } else {
            const requestLines = [
              `GET ${targetUrl.pathname + targetUrl.search} HTTP/1.1`,
              `Host: ${targetUrl.hostname}`,
              'Accept: application/json',
              'User-Agent: Chongdong/1.0',
              'Connection: close',
              '',
              ''
            ].join('\r\n');
            
            let data = '';
            socket.write(requestLines);
            socket
              .on('data', (chunk: any) => (data += chunk.toString()))
              .on('error', onError)
              .on('end', () => {
                try {
                  const body = data.split('\r\n\r\n')[1] || '';
                  const jsonData = JSON.parse(body);
                  
                  resolve({
                    success: true,
                    ip: jsonData.ip,
                    geolocation: {
                      country: jsonData.country || jsonData.country_name,
                      region: jsonData.region,
                      city: jsonData.city,
                      isp: jsonData.org || jsonData.isp
                    },
                    method: 'proxy',
                    timestamp: Date.now()
                  });
                } catch (e) {
                  resolve({
                    success: false,
                    method: 'proxy',
                    timestamp: Date.now(),
                    error: 'Failed to parse response'
                  });
                }
              });
          }
        }).catch((err: any) => {
          // SOCKS5失败，尝试HTTP代理
          console.warn(`[ChainStatusManager] SOCKS5连接失败，尝试HTTP代理: ${err?.message}`);
          this.tryHttpProxy(apiUrl, port).then(resolve).catch(() => {
            resolve({
              success: false,
              method: 'proxy',
              timestamp: Date.now(),
              error: err?.message || String(err)
            });
          });
        });
      } catch (e) {
        resolve({
          success: false,
          method: 'proxy',
          timestamp: Date.now(),
          error: (e as any)?.message || String(e)
        });
      }
    });
  }

  /**
   * 尝试通过HTTP代理获取IP信息
   */
  private async tryHttpProxy(apiUrl: string, port: number): Promise<ChainIPDetectionResult> {
    return new Promise((resolve) => {
      try {
        const { URL } = require('url');
        const http = require('http');
        const https = require('https');
        
        const targetUrl = new URL(apiUrl);
        const isHttps = targetUrl.protocol === 'https:';
        const httpModule = isHttps ? https : http;
        
        const options = {
          hostname: '127.0.0.1',
          port: port,
          path: apiUrl,
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Chongdong/1.0',
            'Connection': 'close'
          },
          timeout: 10000
        };

        const req = httpModule.request(options, (res: any) => {
          let data = '';
          res.on('data', (chunk: any) => {
            data += chunk.toString();
          });
          res.on('end', () => {
            try {
              const jsonData = JSON.parse(data);
              resolve({
                success: true,
                ip: jsonData.ip,
                geolocation: {
                  country: jsonData.country || jsonData.country_name,
                  region: jsonData.region,
                  city: jsonData.city,
                  isp: jsonData.org || jsonData.isp
                },
                method: 'proxy',
                timestamp: Date.now()
              });
            } catch (e) {
              resolve({
                success: false,
                method: 'proxy',
                timestamp: Date.now(),
                error: 'Failed to parse HTTP response'
              });
            }
          });
        });

        req.on('error', (err: any) => {
          console.warn(`[ChainStatusManager] HTTP代理请求错误: ${apiUrl}`, err.message);
          resolve({
            success: false,
            method: 'proxy',
            timestamp: Date.now(),
            error: err?.message || String(err)
          });
        });
        
        req.on('timeout', () => {
          console.warn(`[ChainStatusManager] HTTP代理请求超时: ${apiUrl}`);
          req.destroy();
          resolve({
            success: false,
            method: 'proxy',
            timestamp: Date.now(),
            error: 'HTTP代理请求超时'
          });
        });


        req.end();
      } catch (e) {
        resolve({
          success: false,
          method: 'proxy',
          timestamp: Date.now(),
          error: (e as any)?.message || String(e)
        });
      }
    });
  }

  /**
   * 启动定期检测
   */
  private startPeriodicDetection(): void {
    // 每5分钟检测一次活跃的代理链
    this.detectionInterval = setInterval(() => {
      this.performPeriodicDetection();
    }, 5 * 60 * 1000);
  }

  /**
   * 执行定期检测
   */
  private async performPeriodicDetection(): Promise<void> {
    try {
      const activeChains = Array.from(this.chainStatuses.values())
        .filter(chain => chain.status === 'running');
      
      for (const chain of activeChains) {
        // 只检测最终出口节点的IP
        if (chain.nodes.length > 0) {
          const lastNode = chain.nodes[chain.nodes.length - 1];
          if (lastNode && lastNode.status === 'connected') {
            await this.detectNodeIP(lastNode, chain.nodes.length - 1);
          }
        }
      }
    } catch (error) {
      console.error('[ChainStatusManager] 定期IP检测失败', error);
    }
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = undefined as any;
    }
    this.chainStatuses.clear();
    this.ipDetectionCache.clear();
  }
}

export const chainStatusManager = ChainStatusManager.getInstance();
