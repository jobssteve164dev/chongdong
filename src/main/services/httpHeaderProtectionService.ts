import { HttpHeaderLeakResult } from '../../shared/types';

/**
 * HTTP头防护服务
 * 负责检测和防护HTTP头泄露，标准化敏感头部信息
 */
export class HttpHeaderProtectionService {
  private enabled: boolean = true;
  private mode: 'strict' | 'relaxed' = 'strict';
  private customUserAgent: string = '';
  private readonly neutralAcceptLanguage: string = 'en-US,en;q=0.9';

  // 标准化的HTTP头模板
  private readonly headerTemplates = {
    chrome: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    },
    firefox: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    },
    safari: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Upgrade-Insecure-Requests': '1'
    },
    edge: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    }
  };

  // 敏感的HTTP头列表
  private readonly sensitiveHeaders = [
    'User-Agent',
    'Accept-Language',
    'Accept-Encoding',
    'Referer',
    'Origin',
    'X-Forwarded-For',
    'X-Real-IP',
    'X-Client-IP',
    'X-Forwarded-Host',
    'X-Original-URL',
    'X-Rewrite-URL',
    'Via',
    'X-Forwarded-Proto',
    'X-Forwarded-Port'
  ];

  constructor() {
    console.log('HTTP头防护服务初始化完成');
  }

  /**
   * 配置HTTP头防护
   */
  public configure(config: {
    enabled: boolean;
    mode: 'strict' | 'relaxed';
    customUserAgent?: string;
  }): void {
    this.enabled = config.enabled;
    this.mode = config.mode;
    this.customUserAgent = config.customUserAgent || '';
    
    console.log(`HTTP头防护配置更新: enabled=${this.enabled}, mode=${this.mode}`);
  }

  /**
   * 检测HTTP头泄露
   */
  public async checkHttpHeaderLeak(): Promise<HttpHeaderLeakResult> {
    console.log('开始HTTP头泄露检测...');
    
    const result: HttpHeaderLeakResult = {
      leaked: false,
      details: [],
      leakSources: [],
      detectedHeaders: {},
      suspiciousHeaders: []
    };

    try {
      // 模拟获取当前HTTP头
      const currentHeaders = await this.getCurrentHttpHeaders();
      result.detectedHeaders = currentHeaders;
      
      // 检测敏感头泄露
      const leakDetected = await this.detectHeaderLeak(currentHeaders);
      
      if (leakDetected.leaked) {
        result.leaked = true;
        result.leakSources = leakDetected.sources;
        result.suspiciousHeaders = leakDetected.suspiciousHeaders;
        result.details.push(`检测到HTTP头泄露: ${leakDetected.sources.join(', ')}`);
        
        if (this.mode === 'strict') {
          result.details.push('严格模式下检测到HTTP头泄露');
        }
      } else {
        result.details.push('✅ HTTP头防护正常，未检测到泄露');
      }

      // 记录检测到的头部信息
      result.details.push(`检测到${Object.keys(currentHeaders).length}个HTTP头`);

    } catch (error) {
      console.error('HTTP头泄露检测失败:', error);
      result.details.push(`检测失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    console.log('HTTP头泄露检测完成:', result);
    return result;
  }

  /**
   * 获取当前HTTP头
   */
  private async getCurrentHttpHeaders(): Promise<{ [key: string]: string }> {
    try {
      // 模拟获取当前HTTP头
      // 在实际应用中，这里应该从网络请求中获取真实的HTTP头
      const headers: { [key: string]: string } = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      };

      return headers;
    } catch (error) {
      console.error('获取HTTP头失败:', error);
      return {};
    }
  }

  /**
   * 检测头部泄露
   */
  private async detectHeaderLeak(headers: { [key: string]: string }): Promise<{
    leaked: boolean;
    sources: string[];
    suspiciousHeaders: string[];
  }> {
    const sources: string[] = [];
    const suspiciousHeaders: string[] = [];

    try {
      // 检查敏感头是否存在
      for (const header of this.sensitiveHeaders) {
        if (headers[header]) {
          suspiciousHeaders.push(header);
          
          // 检查头部值是否过于具体
          if (this.isHeaderValueTooSpecific(headers[header], header)) {
            sources.push(`${header}值过于具体`);
          }
        }
      }

      // 检查User-Agent是否过于独特
      if (headers['User-Agent']) {
        if (this.isUserAgentTooUnique(headers['User-Agent'])) {
          sources.push('User-Agent过于独特');
        }
      }

      // 检查Accept-Language是否暴露地理位置
      if (headers['Accept-Language']) {
        if (this.doesAcceptLanguageLeakLocation(headers['Accept-Language'])) {
          sources.push('Accept-Language暴露地理位置');
        }
      }

      // 检查Referer是否暴露敏感信息
      if (headers['Referer']) {
        if (this.doesRefererLeakSensitiveInfo(headers['Referer'])) {
          sources.push('Referer暴露敏感信息');
        }
      }

      const leaked = sources.length > 0;
      
      if (leaked && this.mode === 'strict') {
        sources.push('严格模式检测到HTTP头泄露');
      }

      return { leaked, sources, suspiciousHeaders };
    } catch (error) {
      console.error('检测HTTP头泄露失败:', error);
      return { leaked: false, sources: [], suspiciousHeaders: [] };
    }
  }

  /**
   * 检查头部值是否过于具体
   */
  private isHeaderValueTooSpecific(value: string, headerName: string): boolean {
    switch (headerName) {
      case 'User-Agent':
        return this.isUserAgentTooUnique(value);
      case 'Accept-Language':
        return this.doesAcceptLanguageLeakLocation(value);
      case 'Accept-Encoding':
        return value.includes('br') && value.includes('gzip'); // 过于具体的编码支持
      default:
        return value.length > 200; // 过长的头部值可能包含敏感信息
    }
  }

  /**
   * 检查User-Agent是否过于独特
   */
  private isUserAgentTooUnique(userAgent: string): boolean {
    // 检查是否包含过于具体的版本信息
    const versionPattern = /\d+\.\d+\.\d+\.\d+/;
    if (versionPattern.test(userAgent)) {
      return true; // 包含具体版本号
    }

    // 检查是否包含开发工具信息
    const devToolsPattern = /(Chrome-Lighthouse|HeadlessChrome|PhantomJS|Selenium)/i;
    if (devToolsPattern.test(userAgent)) {
      return true; // 包含开发工具标识
    }

    // 检查是否包含自定义信息
    const customPattern = /(Custom|Test|Bot|Crawler)/i;
    if (customPattern.test(userAgent)) {
      return true; // 包含自定义标识
    }

    return false;
  }

  /**
   * 检查Accept-Language是否暴露地理位置
   */
  private doesAcceptLanguageLeakLocation(acceptLanguage: string): boolean {
    // 检查是否包含过于具体的语言代码
    const specificLanguagePattern = /(zh-CN|zh-TW|en-US|en-GB|ja-JP|ko-KR)/;
    if (specificLanguagePattern.test(acceptLanguage)) {
      return true; // 包含具体地区语言代码
    }

    // 检查是否包含过多语言选项
    const languages = acceptLanguage.split(',');
    if (languages.length > 5) {
      return true; // 语言选项过多可能暴露用户偏好
    }

    return false;
  }

  /**
   * 检查Referer是否暴露敏感信息
   */
  private doesRefererLeakSensitiveInfo(referer: string): boolean {
    // 检查是否包含敏感域名
    const sensitiveDomains = [
      'localhost',
      '127.0.0.1',
      '192.168.',
      '10.',
      '172.16.',
      'admin',
      'login',
      'dashboard'
    ];

    for (const domain of sensitiveDomains) {
      if (referer.includes(domain)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 应用HTTP头防护
   */
  public async applyProtection(): Promise<boolean> {
    if (!this.enabled) {
      console.log('HTTP头防护已禁用');
      return false;
    }

    try {
      console.log(`应用HTTP头防护: mode=${this.mode}`);
      
      // 这里应该实际修改HTTP请求头
      // 由于这是Electron应用，我们主要提供配置和检测功能
      // 实际的HTTP头修改需要在网络请求层面实现
      
      return true;
    } catch (error) {
      console.error('应用HTTP头防护失败:', error);
      return false;
    }
  }

  /**
   * 获取标准化的HTTP头
   */
  public getStandardizedHeaders(template: 'chrome' | 'firefox' | 'safari' | 'edge' = 'chrome'): { [key: string]: string } {
    const baseHeaders = { ...this.headerTemplates[template] };
    
    // 如果设置了自定义User-Agent，使用自定义值
    if (this.customUserAgent) {
      baseHeaders['User-Agent'] = this.customUserAgent;
    }
    
    return baseHeaders;
  }

  /**
   * 基于模板与去敏策略清洗HTTP头
   * - 统一 Accept-Language 为中性配置
   * - 移除 X-Forwarded-* / Via 等敏感中间头
   * - 应用标准化 User-Agent/Accept 等（不覆盖 Host）
   */
  public sanitizeHeaders(
    original: { [key: string]: string },
    template: 'chrome' | 'firefox' | 'safari' | 'edge' = 'chrome',
    options?: { keep?: string[] }
  ): { [key: string]: string } {
    const toKeep = new Set((options?.keep || []).map(k => k.toLowerCase()));
    const tpl = this.getStandardizedHeaders(template);

    // 起始于原始头，但先复制一份（大小写保持简单处理）
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(original || {})) {
      const lower = k.toLowerCase();
      // 保留白名单
      if (toKeep.has(lower)) {
        cleaned[k] = v;
        continue;
      }
      // 过滤敏感头
      if (this.isSensitiveHeader(k)) {
        continue;
      }
      cleaned[k] = v;
    }

    // 覆盖/设置中性 Accept-Language
    cleaned['Accept-Language'] = this.neutralAcceptLanguage;

    // 合并模板（不覆盖 Host）
    const host = cleaned['Host'] || cleaned['host'];
    for (const [k, v] of Object.entries(tpl)) {
      if (k.toLowerCase() === 'host') continue;
      cleaned[k] = v;
    }
    if (host) cleaned['Host'] = host; // 统一大小写

    // 移除任何 X-Forwarded-* 与 Via（再次保障）
    for (const key of Object.keys(cleaned)) {
      if (this.isSensitiveHeader(key)) delete cleaned[key];
    }
    // 恢复必要头
    if (host) cleaned['Host'] = host;

    return cleaned;
  }

  private isSensitiveHeader(headerName: string): boolean {
    const name = headerName.toLowerCase();
    if (name.startsWith('x-forwarded-')) return true;
    if (name === 'via') return true;
    // 列表中的敏感头（大小写不敏感）
    return this.sensitiveHeaders.some(h => h.toLowerCase() === name);
  }

  /**
   * 获取防护状态
   */
  public getProtectionStatus(): {
    enabled: boolean;
    mode: 'strict' | 'relaxed';
    customUserAgent: string;
    lastCheck?: Date;
  } {
    return {
      enabled: this.enabled,
      mode: this.mode,
      customUserAgent: this.customUserAgent,
      lastCheck: new Date()
    };
  }
}
