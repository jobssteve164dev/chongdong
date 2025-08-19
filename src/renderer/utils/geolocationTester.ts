import { log } from './logger';

export interface GeolocationResult {
  success: boolean;
  ip?: string;
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
  timezone?: string;
  error?: string;
  timestamp: number;
}

export class GeolocationTester {
  private static instance: GeolocationTester;

  public static getInstance(): GeolocationTester {
    if (!GeolocationTester.instance) {
      GeolocationTester.instance = new GeolocationTester();
    }
    return GeolocationTester.instance;
  }

  /**
   * 测试当前IP地址的地理位置
   */
  public async testCurrentIPLocation(): Promise<GeolocationResult> {
    try {
      log.info('开始测试当前IP地址地理位置', null, 'GeolocationTester');
      
      // 使用多个IP地理位置API服务，提高成功率
      const apis = [
        'https://ipapi.co/json/',
        'https://ipinfo.io/json',
        'https://api.ipify.org?format=json'
      ];

      for (const api of apis) {
        try {
          const response = await fetch(api, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Chongdong/1.0'
            },
            signal: AbortSignal.timeout(10000) // 10秒超时
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          
          // 处理不同的API响应格式
          let result: GeolocationResult;
          
          if (api.includes('ipapi.co')) {
            // ipapi.co 格式
            result = {
              success: true,
              ip: data.ip,
              country: data.country_name,
              region: data.region,
              city: data.city,
              isp: data.org,
              timezone: data.timezone,
              timestamp: Date.now()
            };
          } else if (api.includes('ipinfo.io')) {
            // ipinfo.io 格式
            result = {
              success: true,
              ip: data.ip,
              country: data.country,
              region: data.region,
              city: data.city,
              isp: data.org,
              timezone: data.timezone,
              timestamp: Date.now()
            };
          } else {
            // ipify.org 只返回IP
            result = {
              success: true,
              ip: data.ip,
              timestamp: Date.now()
            };
          }

          log.info('IP地理位置测试成功', result, 'GeolocationTester');
          return result;
          
        } catch (error) {
          log.warn(`IP地理位置API ${api} 测试失败`, error, 'GeolocationTester');
          continue; // 尝试下一个API
        }
      }

      // 所有API都失败了
      throw new Error('所有IP地理位置API都不可用');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('IP地理位置测试失败', error, 'GeolocationTester');
      
      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }

  /**
   * 通过代理测试IP地址的地理位置
   */
  public async testIPLocationViaProxy(proxyUrl: string): Promise<GeolocationResult> {
    try {
      log.info('开始通过代理测试IP地址地理位置', { proxyUrl }, 'GeolocationTester');
      
      // 这里需要实现通过代理获取IP地理位置的功能
      // 由于浏览器环境的限制，需要通过主进程来实现
      
      const result = await window.electron.ipcRenderer.invoke('geolocation:testViaProxy', {
        proxyUrl
      });
      
      if (result.success) {
        log.info('通过代理IP地理位置测试成功', result, 'GeolocationTester');
        return {
          ...result,
          timestamp: Date.now()
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('通过代理IP地理位置测试失败', error, 'GeolocationTester');
      
      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }

  /**
   * 格式化地理位置显示
   */
  public formatLocation(result: GeolocationResult): string {
    if (!result.success) {
      return '获取失败';
    }

    const parts = [];
    
    if (result.city) {
      parts.push(result.city);
    }
    
    if (result.region) {
      parts.push(result.region);
    }
    
    if (result.country) {
      parts.push(result.country);
    }

    if (parts.length === 0) {
      return result.ip || '未知位置';
    }

    return parts.join(', ');
  }
}

export const geolocationTester = GeolocationTester.getInstance();
