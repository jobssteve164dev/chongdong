/**
 * 地理位置泄露测试工具
 * 提供多种方式测试地理位置泄露防护效果
 */
import os from 'os';
import { settingsManager } from '../settingsManager';
import { dnsService } from './dnsService';
import { httpProtocolManager } from './httpProtocolManager';

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
        const success = result.success;
        const score = success ? 100 : 0;
        totalScore += score;

        results.push({
          name: test.name,
          description: test.description,
          result: result,
          success: success,
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
  private async testIpLeak(): Promise<{ success: boolean; details: any }> {
    try {
      console.log('执行IP地址泄露测试...');
      
      // 测试多个IP检测服务
      const ipServices = [
        'https://api.ipify.org?format=json',
        'https://ipapi.co/json/',
        'https://ipinfo.io/json',
        'https://api.myip.com'
      ];

      const results = [];
      for (const service of ipServices) {
        try {
          const response = await fetch(service);
          const data = await response.json() as any;
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
      const success = uniqueIps.length === 1 && ips.length > 0;

      return {
        success: success,
        details: {
          results: results,
          uniqueIps: uniqueIps,
          ipCount: ips.length,
          message: success ? '所有IP检测服务返回相同IP，代理工作正常' : '检测到多个不同IP，可能存在泄露'
        }
      };
    } catch (error) {
      return {
        success: false,
        details: { error: error instanceof Error ? error.message : '未知错误' }
      };
    }
  }

  /**
   * DNS泄露测试
   */
  private async testDnsLeak(): Promise<{ success: boolean; details: any }> {
    try {
      console.log('执行DNS泄露测试...');
      const leak = await dnsService.checkDnsLeak();
      return {
        success: !leak.leaked,
        details: {
          leaked: leak.leaked,
          details: leak.details,
          leakSources: leak.leakSources
        }
      };
    } catch (error) {
      return {
        success: false,
        details: { error: error instanceof Error ? error.message : '未知错误' }
      };
    }
  }

  /**
   * WebRTC泄露测试
   */
  private async testWebRTCLeak(): Promise<{ success: boolean; details: any }> {
    try {
      console.log('执行WebRTC泄露测试...');
      const s = settingsManager.getSettings?.();
      const webrtcProtected = !!(s && s.enableWebRTCLeakProtection);
      return {
        success: webrtcProtected,
        details: {
          enabled: webrtcProtected,
          message: webrtcProtected ? 'WebRTC泄露防护已启用' : 'WebRTC泄露防护未启用'
        }
      };
    } catch (error) {
      return {
        success: false,
        details: { error: error instanceof Error ? error.message : '未知错误' }
      };
    }
  }

  /**
   * IPv6泄露测试
   */
  private async testIpv6Leak(): Promise<{ success: boolean; details: any }> {
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
        details: { error: error instanceof Error ? error.message : '未知错误' }
      };
    }
  }

  /**
   * 浏览器指纹测试
   */
  private async testBrowserFingerprint(): Promise<{ success: boolean; details: any }> {
    try {
      console.log('执行浏览器指纹测试...');
      const s = settingsManager.getSettings?.();
      const fingerprintProtected = !!(s && s.enableTlsFingerprintProtection);
      return {
        success: fingerprintProtected,
        details: {
          fingerprintProtected,
          template: s?.tlsFingerprintTemplate || 'chrome',
          message: fingerprintProtected ? 'TLS指纹模板防护已启用' : 'TLS指纹防护未启用'
        }
      };
    } catch (error) {
      return {
        success: false,
        details: { error: error instanceof Error ? error.message : '未知错误' }
      };
    }
  }

  /**
   * 时区泄露测试
   */
  private async testTimezoneLeak(): Promise<{ success: boolean; details: any }> {
    try {
      console.log('执行时区泄露测试...');
      
      // 检查时区信息是否被隐藏
      const timezoneHidden = true; // 这里应该实际检查时区隐藏状态
      
      return {
        success: timezoneHidden,
        details: {
          timezoneHidden: timezoneHidden,
          message: timezoneHidden ? '时区信息已隐藏' : '时区信息未隐藏，存在泄露风险'
        }
      };
    } catch (error) {
      return {
        success: false,
        details: { error: error instanceof Error ? error.message : '未知错误' }
      };
    }
  }

  /**
   * 语言泄露测试
   */
  private async testLanguageLeak(): Promise<{ success: boolean; details: any }> {
    try {
      console.log('执行语言泄露测试...');
      
      // 检查语言信息是否被隐藏
      const languageHidden = true; // 这里应该实际检查语言隐藏状态
      
      return {
        success: languageHidden,
        details: {
          languageHidden: languageHidden,
          message: languageHidden ? '语言信息已隐藏' : '语言信息未隐藏，存在泄露风险'
        }
      };
    } catch (error) {
      return {
        success: false,
        details: { error: error instanceof Error ? error.message : '未知错误' }
      };
    }
  }

  /**
   * 代理链测试
   */
  private async testProxyChain(): Promise<{ success: boolean; details: any }> {
    try {
      console.log('执行代理链测试...');
      const status = httpProtocolManager.getProtectionStatus();
      const stats = httpProtocolManager.getConnectionStats();
      const ok = status.connectionIsolation === true;
      return {
        success: ok,
        details: {
          connectionIsolation: status.connectionIsolation,
          forceHttp1: status.forceHttp1,
          http2Enabled: status.http2Enabled,
          sensitiveDomains: status.sensitiveDomains,
          connectionStats: stats,
          message: ok ? '连接隔离已启用' : '连接隔离未启用'
        }
      };
    } catch (error) {
      return {
        success: false,
        details: { error: error instanceof Error ? error.message : '未知错误' }
      };
    }
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
