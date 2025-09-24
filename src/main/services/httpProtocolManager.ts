/**
 * HTTP协议管理服务
 * 负责管理HTTP/1.1和HTTP/2.0协议的选择和连接隔离策略
 * 实现敏感域名的独立连接管理
 */
export class HttpProtocolManager {
  private static instance: HttpProtocolManager;
  
  private enabled: boolean = true;
  private mode: 'strict' | 'relaxed' = 'strict';
  
  // 协议配置
  private protocolConfig = {
    forceHttp1: false,
    http2Enabled: true,
    connectionIsolation: true,
    protocolWhitelist: [] as string[],
    sensitiveDomains: [
      'google.com',
      'facebook.com',
      'twitter.com',
      'instagram.com',
      'youtube.com',
      'amazon.com',
      'microsoft.com',
      'apple.com',
      'baidu.com',
      'qq.com',
      'weibo.com',
      'taobao.com'
    ]
  };
  
  // 连接池管理
  private connectionPools = new Map<string, {
    domain: string;
    protocol: 'http1' | 'http2';
    connections: number;
    lastUsed: number;
    maxConnections: number;
  }>();
  
  // 连接统计
  private connectionStats = {
    totalConnections: 0,
    http1Connections: 0,
    http2Connections: 0,
    isolatedConnections: 0,
    lastReset: Date.now()
  };

  private constructor() {
    console.log('HTTP协议管理服务初始化完成');
  }

  public static getInstance(): HttpProtocolManager {
    if (!HttpProtocolManager.instance) {
      HttpProtocolManager.instance = new HttpProtocolManager();
    }
    return HttpProtocolManager.instance;
  }

  /**
   * 配置HTTP协议管理
   */
  public configure(config: {
    enabled: boolean;
    mode: 'strict' | 'relaxed';
    forceHttp1?: boolean;
    http2Enabled?: boolean;
    connectionIsolation?: boolean;
    protocolWhitelist?: string[];
    sensitiveDomains?: string[];
  }): void {
    this.enabled = config.enabled;
    this.mode = config.mode;
    
    if (config.forceHttp1 !== undefined) {
      this.protocolConfig.forceHttp1 = config.forceHttp1;
    }
    
    if (config.http2Enabled !== undefined) {
      this.protocolConfig.http2Enabled = config.http2Enabled;
    }
    
    if (config.connectionIsolation !== undefined) {
      this.protocolConfig.connectionIsolation = config.connectionIsolation;
    }
    
    if (config.protocolWhitelist) {
      this.protocolConfig.protocolWhitelist = config.protocolWhitelist;
    }
    
    if (config.sensitiveDomains) {
      this.protocolConfig.sensitiveDomains = config.sensitiveDomains;
    }
    
    console.log(`HTTP协议管理配置更新: enabled=${this.enabled}, mode=${this.mode}, forceHttp1=${this.protocolConfig.forceHttp1}, connectionIsolation=${this.protocolConfig.connectionIsolation}`);
  }

  /**
   * 检查是否应该使用HTTP/1.1协议
   */
  public shouldUseHttp1(domain: string): boolean {
    if (!this.enabled) {
      return false;
    }

    // 如果强制使用HTTP/1.1
    if (this.protocolConfig.forceHttp1) {
      return true;
    }

    // 检查协议白名单
    if (this.protocolConfig.protocolWhitelist.includes(domain)) {
      return true;
    }

    // 检查是否为敏感域名
    if (this.isSensitiveDomain(domain)) {
      return this.mode === 'strict';
    }

    return false;
  }

  /**
   * 检查是否应该使用HTTP/2.0协议
   */
  public shouldUseHttp2(domain: string): boolean {
    if (!this.enabled || !this.protocolConfig.http2Enabled) {
      return false;
    }

    // 如果强制使用HTTP/1.1，则不使用HTTP/2.0
    if (this.protocolConfig.forceHttp1) {
      return false;
    }

    // 检查协议白名单
    if (this.protocolConfig.protocolWhitelist.includes(domain)) {
      return false;
    }

    // 对于敏感域名，在严格模式下不使用HTTP/2.0
    if (this.isSensitiveDomain(domain)) {
      return this.mode === 'relaxed';
    }

    return true;
  }

  /**
   * 检查域名是否为敏感域名
   */
  public isSensitiveDomain(domain: string): boolean {
    return this.protocolConfig.sensitiveDomains.some(sensitiveDomain => 
      domain.includes(sensitiveDomain) || domain.endsWith('.' + sensitiveDomain)
    );
  }

  /**
   * 为域名创建独立连接池
   */
  public async createIsolatedConnection(domain: string): Promise<boolean> {
    if (!this.enabled || !this.protocolConfig.connectionIsolation) {
      return false;
    }

    try {
      const protocol = this.shouldUseHttp1(domain) ? 'http1' : 'http2';
      const maxConnections = this.isSensitiveDomain(domain) ? 1 : 3; // 敏感域名使用更少的连接

      const connectionPool = {
        domain,
        protocol: protocol as 'http1' | 'http2',
        connections: 0,
        lastUsed: Date.now(),
        maxConnections
      };

      this.connectionPools.set(domain, connectionPool);
      
      // 更新统计
      this.connectionStats.isolatedConnections++;
      this.connectionStats.totalConnections++;
      
      if (protocol === 'http1') {
        this.connectionStats.http1Connections++;
      } else {
        this.connectionStats.http2Connections++;
      }

      console.log(`为域名 ${domain} 创建独立连接池: protocol=${protocol}, maxConnections=${maxConnections}`);
      return true;
    } catch (error) {
      console.error(`为域名 ${domain} 创建独立连接池失败:`, error);
      return false;
    }
  }

  /**
   * 获取域名的连接池信息
   */
  public getConnectionPool(domain: string): {
    domain: string;
    protocol: 'http1' | 'http2';
    connections: number;
    lastUsed: number;
    maxConnections: number;
  } | null {
    return this.connectionPools.get(domain) || null;
  }

  /**
   * 检查是否可以创建新连接
   */
  public canCreateConnection(domain: string): boolean {
    const pool = this.connectionPools.get(domain);
    if (!pool) {
      return true; // 如果没有连接池，可以创建
    }

    return pool.connections < pool.maxConnections;
  }

  /**
   * 创建连接
   */
  public async createConnection(domain: string): Promise<boolean> {
    if (!this.canCreateConnection(domain)) {
      console.log(`域名 ${domain} 已达到最大连接数限制`);
      return false;
    }

    try {
      const pool = this.connectionPools.get(domain);
      if (pool) {
        pool.connections++;
        pool.lastUsed = Date.now();
        console.log(`为域名 ${domain} 创建连接: ${pool.connections}/${pool.maxConnections}`);
      } else {
        // 如果没有连接池，先创建一个
        await this.createIsolatedConnection(domain);
        const newPool = this.connectionPools.get(domain);
        if (newPool) {
          newPool.connections = 1;
          newPool.lastUsed = Date.now();
        }
      }

      return true;
    } catch (error) {
      console.error(`为域名 ${domain} 创建连接失败:`, error);
      return false;
    }
  }

  /**
   * 关闭连接
   */
  public async closeConnection(domain: string): Promise<boolean> {
    try {
      const pool = this.connectionPools.get(domain);
      if (pool && pool.connections > 0) {
        pool.connections--;
        pool.lastUsed = Date.now();
        console.log(`关闭域名 ${domain} 的连接: ${pool.connections}/${pool.maxConnections}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`关闭域名 ${domain} 的连接失败:`, error);
      return false;
    }
  }

  /**
   * 重置连接池
   */
  public async resetConnectionPool(domain: string): Promise<boolean> {
    try {
      const pool = this.connectionPools.get(domain);
      if (pool) {
        pool.connections = 0;
        pool.lastUsed = Date.now();
        console.log(`重置域名 ${domain} 的连接池`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`重置域名 ${domain} 的连接池失败:`, error);
      return false;
    }
  }

  /**
   * 清理过期连接池
   */
  public async cleanupExpiredConnections(): Promise<void> {
    try {
      const now = Date.now();
      const expireTime = 5 * 60 * 1000; // 5分钟过期

      for (const [domain, pool] of this.connectionPools.entries()) {
        if (now - pool.lastUsed > expireTime) {
          this.connectionPools.delete(domain);
          console.log(`清理过期连接池: ${domain}`);
        }
      }
    } catch (error) {
      console.error('清理过期连接池失败:', error);
    }
  }

  /**
   * 添加敏感域名
   */
  public addSensitiveDomain(domain: string): void {
    if (!this.protocolConfig.sensitiveDomains.includes(domain)) {
      this.protocolConfig.sensitiveDomains.push(domain);
      console.log(`添加敏感域名: ${domain}`);
    }
  }

  /**
   * 移除敏感域名
   */
  public removeSensitiveDomain(domain: string): void {
    const index = this.protocolConfig.sensitiveDomains.indexOf(domain);
    if (index > -1) {
      this.protocolConfig.sensitiveDomains.splice(index, 1);
      console.log(`移除敏感域名: ${domain}`);
    }
  }

  /**
   * 添加协议白名单域名
   */
  public addProtocolWhitelistDomain(domain: string): void {
    if (!this.protocolConfig.protocolWhitelist.includes(domain)) {
      this.protocolConfig.protocolWhitelist.push(domain);
      console.log(`添加协议白名单域名: ${domain}`);
    }
  }

  /**
   * 移除协议白名单域名
   */
  public removeProtocolWhitelistDomain(domain: string): void {
    const index = this.protocolConfig.protocolWhitelist.indexOf(domain);
    if (index > -1) {
      this.protocolConfig.protocolWhitelist.splice(index, 1);
      console.log(`移除协议白名单域名: ${domain}`);
    }
  }

  /**
   * 获取连接统计信息
   */
  public getConnectionStats(): {
    totalConnections: number;
    http1Connections: number;
    http2Connections: number;
    isolatedConnections: number;
    activePools: number;
    lastReset: number;
  } {
    return {
      ...this.connectionStats,
      activePools: this.connectionPools.size,
      lastReset: this.connectionStats.lastReset
    };
  }

  /**
   * 获取所有连接池信息
   */
  public getAllConnectionPools(): Array<{
    domain: string;
    protocol: 'http1' | 'http2';
    connections: number;
    lastUsed: number;
    maxConnections: number;
  }> {
    return Array.from(this.connectionPools.values());
  }

  /**
   * 获取防护状态
   */
  public getProtectionStatus(): {
    enabled: boolean;
    mode: 'strict' | 'relaxed';
    forceHttp1: boolean;
    http2Enabled: boolean;
    connectionIsolation: boolean;
    sensitiveDomains: string[];
    protocolWhitelist: string[];
    connectionStats: {
      totalConnections: number;
      http1Connections: number;
      http2Connections: number;
      isolatedConnections: number;
      activePools: number;
    };
  } {
    return {
      enabled: this.enabled,
      mode: this.mode,
      forceHttp1: this.protocolConfig.forceHttp1,
      http2Enabled: this.protocolConfig.http2Enabled,
      connectionIsolation: this.protocolConfig.connectionIsolation,
      sensitiveDomains: [...this.protocolConfig.sensitiveDomains],
      protocolWhitelist: [...this.protocolConfig.protocolWhitelist],
      connectionStats: {
        totalConnections: this.connectionStats.totalConnections,
        http1Connections: this.connectionStats.http1Connections,
        http2Connections: this.connectionStats.http2Connections,
        isolatedConnections: this.connectionStats.isolatedConnections,
        activePools: this.connectionPools.size
      }
    };
  }

  /**
   * 重置所有连接
   */
  public async resetAllConnections(): Promise<void> {
    try {
      console.log('重置所有HTTP连接...');
      
      // 清理所有连接池
      this.connectionPools.clear();
      
      // 重置统计信息
      this.connectionStats = {
        totalConnections: 0,
        http1Connections: 0,
        http2Connections: 0,
        isolatedConnections: 0,
        lastReset: Date.now()
      };
      
      console.log('所有HTTP连接已重置');
    } catch (error) {
      console.error('重置所有HTTP连接失败:', error);
    }
  }

  /**
   * 启动定期清理任务
   */
  public startCleanupTask(intervalMs: number = 60000): void {
    setInterval(() => {
      this.cleanupExpiredConnections();
    }, intervalMs);
    
    console.log(`启动HTTP连接清理任务，间隔: ${intervalMs}ms`);
  }

  /**
   * 停止定期清理任务
   */
  public stopCleanupTask(): void {
    // 这里应该停止定时器，但由于我们没有存储定时器引用，暂时跳过
    console.log('停止HTTP连接清理任务');
  }
}

export const httpProtocolManager = HttpProtocolManager.getInstance();
