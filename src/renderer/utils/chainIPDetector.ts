import { ChainNodeIPInfo, ChainIPDetectionResult } from '../../shared/types/chainStatus';

/**
 * 代理链IP检测工具
 * 提供安全的IP地址检测功能，保护用户隐私
 */
export class ChainIPDetector {
  private static instance: ChainIPDetector;
  private detectionCache: Map<string, ChainIPDetectionResult> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  private constructor() {}

  public static getInstance(): ChainIPDetector {
    if (!ChainIPDetector.instance) {
      ChainIPDetector.instance = new ChainIPDetector();
    }
    return ChainIPDetector.instance;
  }

  /**
   * 检测代理链中所有节点的IP地址
   * @param chainId 代理链ID
   * @returns 节点IP信息列表
   */
  public async detectChainNodeIPs(chainId: string): Promise<ChainNodeIPInfo[]> {
    try {
      const result = await window.electron.ipcRenderer.invoke('chain:detectNodeIPs', chainId);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || '检测失败');
      }
    } catch (error) {
      console.error('检测代理链节点IP失败:', error);
      throw error;
    }
  }

  /**
   * 获取代理链状态
   * @param chainId 代理链ID
   * @returns 代理链状态
   */
  public async getChainStatus(chainId: string) {
    try {
      const result = await window.electron.ipcRenderer.invoke('chain:getStatus', chainId);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || '获取状态失败');
      }
    } catch (error) {
      console.error('获取代理链状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有代理链状态
   * @returns 所有代理链状态列表
   */
  public async getAllChainStatuses() {
    try {
      const result = await window.electron.ipcRenderer.invoke('chain:getAllStatuses');
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || '获取状态失败');
      }
    } catch (error) {
      console.error('获取所有代理链状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取代理链配置信息
   * @param chainId 代理链ID
   * @returns 代理链配置
   */
  public async getChainConfig(chainId: string) {
    try {
      const result = await window.electron.ipcRenderer.invoke('chain:getConfig', chainId);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || '获取代理链配置失败');
      }
    } catch (error) {
      console.error('获取代理链配置失败:', error);
      throw error;
    }
  }

  /**
   * 安全地检测单个节点的IP地址
   * 使用多种方法确保检测的准确性和隐私保护
   * @param nodeId 节点ID
   * @param localPort 本地端口
   * @returns IP检测结果
   */
  public async detectNodeIP(nodeId: string, localPort: number): Promise<ChainIPDetectionResult> {
    const cacheKey = `${nodeId}_${localPort}`;
    const cached = this.detectionCache.get(cacheKey);
    
    // 检查缓存是否有效
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached;
    }

    try {
      // 使用多个IP检测API提高成功率
      const apis = [
        'https://ipapi.co/json/',
        'https://ipinfo.io/json',
        'https://api.ipify.org?format=json'
      ];

      for (const api of apis) {
        try {
          const result = await this.fetchIPViaProxy(api, localPort);
          if (result.success) {
            // 缓存结果
            this.detectionCache.set(cacheKey, result);
            return result;
          }
        } catch (error) {
          console.warn(`IP检测API失败: ${api}`, error);
        }
      }

      const errorResult: ChainIPDetectionResult = {
        success: false,
        method: 'proxy',
        timestamp: Date.now(),
        error: '所有IP检测API都不可用'
      };

      this.detectionCache.set(cacheKey, errorResult);
      return errorResult;

    } catch (error) {
      const errorResult: ChainIPDetectionResult = {
        success: false,
        method: 'proxy',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error)
      };

      this.detectionCache.set(cacheKey, errorResult);
      return errorResult;
    }
  }

  /**
   * 通过代理端口获取IP信息
   * @param apiUrl API地址
   * @param port 代理端口
   * @returns IP检测结果
   */
  private async fetchIPViaProxy(apiUrl: string, port: number): Promise<ChainIPDetectionResult> {
    return new Promise((resolve) => {
      try {
        const { SocksClient } = require('socks');
        const { URL } = require('url');
        
        const targetUrl = new URL(apiUrl);
        
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
              rejectUnauthorized: true
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
          resolve({
            success: false,
            method: 'proxy',
            timestamp: Date.now(),
            error: err?.message || String(err)
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
   * 清理缓存
   */
  public clearCache(): void {
    this.detectionCache.clear();
  }

  /**
   * 获取缓存统计
   */
  public getCacheStats() {
    return {
      size: this.detectionCache.size,
      keys: Array.from(this.detectionCache.keys())
    };
  }
}

export const chainIPDetector = ChainIPDetector.getInstance();
