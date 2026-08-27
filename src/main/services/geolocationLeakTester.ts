/**
 * 地理位置泄露测试工具
 * 提供多种方式测试地理位置泄露防护效果
 */
import os from 'os';
import tls from 'tls';
import { SocksClient } from 'socks';
import { settingsManager } from '../settingsManager';
import { dnsService } from './dnsService';
import { httpProtocolManager } from './httpProtocolManager';

interface LeakTestResult {
  success: boolean;
  verified: boolean;
  details: any;
}

export class GeolocationLeakTester {
  private static instance: GeolocationLeakTester;
  
  private testResults: Array<{
    timestamp: number;
    testType: string;
    result: any;
    success: boolean;
  }> = [];

  private constructor() {
    console.log('地理位置泄露测试工具初始化完成');
  }

  public static getInstance(): GeolocationLeakTester {
    if (!GeolocationLeakTester.instance) {
      GeolocationLeakTester.instance = new GeolocationLeakTester();
    }
    return GeolocationLeakTester.instance;
  }

  /**
   * 执行完整的地理位置泄露测试
   */
  public async runComprehensiveTest(): Promise<{
    overallScore: number;
    tests: Array<{
      name: string;
      description: string;
      result: any;
      success: boolean;
      verified: boolean;
      score: number;
    }>;
    recommendations: string[];
  }> {
    console.log('开始执行完整的地理位置泄露测试...');
    
    const tests = [
      {
        name: 'IP地址泄露测试',
        description: '检测真实IP地址是否泄露',
        test: () => this.testIpLeak()
      },
      {
        name: 'DNS泄露测试',
        description: '检测DNS查询是否泄露真实位置',
        test: () => this.testDnsLeak()
      },
      {
        name: 'WebRTC泄露测试',
        description: '检测WebRTC是否泄露真实IP',
        test: () => this.testWebRTCLeak()
      },
      {
        name: 'IPv6泄露测试',
        description: '检测IPv6地址是否泄露',
        test: () => this.testIpv6Leak()
      },
      {
        name: '浏览器指纹测试',
        description: '检测浏览器指纹是否暴露位置信息',
        test: () => this.testBrowserFingerprint()
      },
      {
        name: '时区泄露测试',
        description: '检测时区信息是否泄露',
        test: () => this.testTimezoneLeak()
      },
      {
        name: '语言泄露测试',
        description: '检测语言设置是否泄露位置',
        test: () => this.testLanguageLeak()
      },
      {
        name: '代理链测试',
        description: '检测代理链是否正常工作',
        test: () => this.testProxyChain()
      }
    ];

    const results = [];
    let totalScore = 0;

    for (const test of tests) {
      try {
        console.log(`执行测试: ${test.name}`);
        const result = await test.test();
        const success = result.verified === true && result.success === true;
        const score = success ? 100 : 0;
        totalScore += score;

        results.push({
          name: test.name,
          description: test.description,
          result: result,
          success: success,
          verified: result.verified === true,
          score: score
        });

        // 记录测试结果
        this.testResults.push({
          timestamp: Date.now(),
          testType: test.name,
          result: result,
          success: success
        });

      } catch (error) {
        console.error(`测试 ${test.name} 失败:`, error);
        results.push({
          name: test.name,
          description: test.description,
          result: { error: error instanceof Error ? error.message : '未知错误' },
          success: false,
          verified: false,
          score: 0
        });
      }
    }

    const overallScore = Math.round(totalScore / tests.length);
    const recommendations = this.generateRecommendations(results);

    console.log(`地理位置泄露测试完成，总分: ${overallScore}/100`);

    return {
      overallScore,
      tests: results,
      recommendations
    };
  }

  /**
   * IP地址泄露测试
   */
  private async testIpLeak(): Promise<LeakTestResult> {
    try {
      console.log('执行IP地址泄露测试...');
      
      const ipServices = [
        'https://api.ipify.org?format=json',
        'https://ipapi.co/json/',
        'https://ipinfo.io/json'
      ];
      const socksPort = Number(settingsManager.getSettings().socksPort);
      if (!Number.isInteger(socksPort) || socksPort < 1 || socksPort > 65535) {
        return { success: false, verified: false, details: { message: '本地 SOCKS 入口未配置' } };
      }

      const results = [];
      for (const service of ipServices) {
        try {
          const data = await this.requestJsonViaSocks(service, socksPort);
          results.push({
            service: service,
            ip: data.ip || data.query,
            country: data.country || data.country_code,
            region: data.region || data.regionName,
            city: data.city,
            isp: data.isp || data.org
          });
        } catch (error) {
          console.error(`IP服务 ${service} 测试失败:`, error);
        }
      }

      // 检查是否所有IP都相同（表示代理工作正常）
      const ips = results.map(r => r.ip).filter(ip => ip);
      const uniqueIps = [...new Set(ips)];
      const verified = ips.length >= 2;
      const success = verified && uniqueIps.length === 1;

      return {
        success: success,
        verified,
        details: {
          results: results,
          uniqueIps: uniqueIps,
          ipCount: ips.length,
          message: !verified ? '无法通过本地 SOCKS 入口取得足够观测结果' :
            success ? '多个独立服务观测到一致的代理出口IP' : '代理出口观测结果不一致'
        }
      };
    } catch (error) {
      return {
        success: false,
        verified: false,
        details: { error: error instanceof Error ? error.message : '未知错误' }
      };
    }
  }

  /**
   * DNS泄露测试
   */
  private async testDnsLeak(): Promise<LeakTestResult> {
    try {
      console.log('执行DNS泄露测试...');
      const leak = await dnsService.checkDnsLeak();
      return {
        success: leak.verified === true && !leak.leaked,
        verified: leak.verified === true,
        details: {
          leaked: leak.leaked,
          details: leak.details,
          leakSources: leak.leakSources
        }
      };
    } catch (error) {
      return {
        success: false,
        verified: false,
        details: { error: error instanceof Error ? error.message : '未知错误' }
      };
    }
  }

  /**
   * WebRTC泄露测试
   */
  private async testWebRTCLeak(): Promise<LeakTestResult> {
    try {
      console.log('执行WebRTC泄露测试...');
      const s = settingsManager.getSettings?.();
      const webrtcProtected = !!(s && s.enableWebRTCLeakProtection);
      return {
        success: false,
        verified: false,
        details: {
          enabled: webrtcProtected,
          message: webrtcProtected ? '防护策略已启用，但尚未观测 ICE 候选地址' : 'WebRTC泄露防护未启用'
        }
      };
    } catch (error) {
      return {
        success: false,
        verified: false,
        details: { error: error instanceof Error ? error.message : '未知错误' }
      };
    }
  }

  /**
   * IPv6泄露测试
   */
  private async testIpv6Leak(): Promise<LeakTestResult> {
    try {
      console.log('执行IPv6泄露测试...');
      const s = settingsManager.getSettings?.();
      const ifaces = os.networkInterfaces();
      let hasGlobalIPv6 = false;
      for (const [, list] of Object.entries(ifaces)) {
        for (const info of list || []) {
          if (info.family === 'IPv6' && !info.internal && info.address && !info.address.startsWith('fe80::')) {
            hasGlobalIPv6 = true;
          }
        }
      }
      const protectionOn = !!(s && s.enableIpv6LeakProtection);
      const ipv6Disabled = !!(s && !s.enableIpv6);
      const success = protectionOn && (ipv6Disabled || !hasGlobalIPv6);
      return {
        success,
        verified: true,
        details: {
          protectionOn,
          ipv6Disabled,
          hasGlobalIPv6,
          message: success ? 'IPv6泄露防护有效' : '检测到可能的IPv6泄露风险'
        }
      };
    } catch (error) {
      return {
        success: false,
        verified: false,
        details: { error: error instanceof Error ? error.message : '未知错误' }
      };
    }
  }

  /**
   * 浏览器指纹测试
   */
  private async testBrowserFingerprint(): Promise<LeakTestResult> {
    try {
      console.log('执行浏览器指纹测试...');
      const s = settingsManager.getSettings?.();
      const fingerprintProtected = !!(s && s.enableTlsFingerprintProtection);
      return {
        success: false,
        verified: false,
        details: {
          fingerprintProtected,
          template: s?.tlsFingerprintTemplate || 'chrome',
          message: fingerprintProtected ? 'TLS指纹策略已启用，但尚未从外部观测握手指纹' : 'TLS指纹防护未启用'
        }
      };
    } catch (error) {
      return {
        success: false,
        verified: false,
        details: { error: error instanceof Error ? error.message : '未知错误' }
      };
    }
  }

  /**
   * 时区泄露测试
   */
  private async testTimezoneLeak(): Promise<LeakTestResult> {
    try {
      console.log('执行时区泄露测试...');
      
      return {
        success: false,
        verified: false,
        details: {
          observedTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          message: '当前未实现可由外部观测验证的时区隔离'
        }
      };
    } catch (error) {
      return {
        success: false,
        verified: false,
        details: { error: error instanceof Error ? error.message : '未知错误' }
      };
    }
  }

  /**
   * 语言泄露测试
   */
  private async testLanguageLeak(): Promise<LeakTestResult> {
    try {
      console.log('执行语言泄露测试...');
      
      return {
        success: false,
        verified: false,
        details: {
          observedLocale: Intl.DateTimeFormat().resolvedOptions().locale,
          message: '当前未实现可由外部观测验证的语言隔离'
        }
      };
    } catch (error) {
      return {
        success: false,
        verified: false,
        details: { error: error instanceof Error ? error.message : '未知错误' }
      };
    }
  }

  /**
   * 代理链测试
   */
  private async testProxyChain(): Promise<LeakTestResult> {
    try {
      console.log('执行代理链测试...');
      const status = httpProtocolManager.getProtectionStatus();
      const stats = httpProtocolManager.getConnectionStats();
      return {
        success: false,
        verified: false,
        details: {
          connectionIsolation: status.connectionIsolation,
          forceHttp1: status.forceHttp1,
          http2Enabled: status.http2Enabled,
          sensitiveDomains: status.sensitiveDomains,
          connectionStats: stats,
          message: '连接隔离配置已读取，但缺少逐跳外部观测，不能判定链路通过'
        }
      };
    } catch (error) {
      return {
        success: false,
        verified: false,
        details: { error: error instanceof Error ? error.message : '未知错误' }
      };
    }
  }

  private async requestJsonViaSocks(target: string, socksPort: number): Promise<any> {
    const targetUrl = new URL(target);
    if (targetUrl.protocol !== 'https:') {
      throw new Error('出口观测仅允许 HTTPS');
    }

    const { socket } = await SocksClient.createConnection({
      proxy: { host: '127.0.0.1', port: socksPort, type: 5 },
      command: 'connect',
      destination: { host: targetUrl.hostname, port: 443 },
      timeout: 8000
    });

    return await new Promise((resolve, reject) => {
      const secureSocket = tls.connect({
        socket,
        servername: targetUrl.hostname,
        rejectUnauthorized: true
      });
      let response = '';
      const timeout = setTimeout(() => secureSocket.destroy(new Error('出口观测请求超时')), 10000);

      secureSocket.once('secureConnect', () => {
        secureSocket.write([
          `GET ${targetUrl.pathname}${targetUrl.search} HTTP/1.1`,
          `Host: ${targetUrl.hostname}`,
          'Accept: application/json',
          'User-Agent: Chongdong/1.0',
          'Connection: close', '', ''
        ].join('\r\n'));
      });
      secureSocket.on('data', chunk => { response += chunk.toString('utf8'); });
      secureSocket.once('error', error => {
        clearTimeout(timeout);
        reject(error);
      });
      secureSocket.once('end', () => {
        clearTimeout(timeout);
        try {
          const separator = response.indexOf('\r\n\r\n');
          const statusLine = response.slice(0, response.indexOf('\r\n'));
          if (separator < 0 || !/^HTTP\/1\.[01] 2\d\d\b/.test(statusLine)) {
            throw new Error(`出口观测服务响应无效: ${statusLine || 'empty response'}`);
          }
          resolve(JSON.parse(response.slice(separator + 4).trim()));
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(testResults: Array<{ name: string; success: boolean; result: any }>): string[] {
    const recommendations: string[] = [];

    const failedTests = testResults.filter(test => !test.success);

    if (failedTests.length === 0) {
      recommendations.push('✅ 所有测试通过，地理位置防护效果良好');
      return recommendations;
    }

    for (const test of failedTests) {
      switch (test.name) {
        case 'IP地址泄露测试':
          recommendations.push('🔧 检查代理配置，确保所有流量都通过代理');
          break;
        case 'DNS泄露测试':
          recommendations.push('🔧 启用DNS over HTTPS，强制DNS查询通过代理');
          break;
        case 'WebRTC泄露测试':
          recommendations.push('🔧 完全禁用WebRTC功能');
          break;
        case 'IPv6泄露测试':
          recommendations.push('🔧 禁用IPv6连接');
          break;
        case '浏览器指纹测试':
          recommendations.push('🔧 启用浏览器指纹保护');
          break;
        case '时区泄露测试':
          recommendations.push('🔧 隐藏时区信息');
          break;
        case '语言泄露测试':
          recommendations.push('🔧 隐藏语言设置信息');
          break;
        case '代理链测试':
          recommendations.push('🔧 检查代理链配置，确保代理服务器正常工作');
          break;
      }
    }

    recommendations.push('💡 建议定期运行此测试以监控防护效果');
    recommendations.push('💡 考虑使用更严格的防护模式');

    return recommendations;
  }

  /**
   * 获取测试历史
   */
  public getTestHistory(): Array<{
    timestamp: number;
    testType: string;
    result: any;
    success: boolean;
  }> {
    return [...this.testResults];
  }

  /**
   * 清除测试历史
   */
  public clearTestHistory(): void {
    this.testResults = [];
    console.log('测试历史已清除');
  }
}

export const geolocationLeakTester = GeolocationLeakTester.getInstance();
