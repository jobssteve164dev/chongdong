import { ProxyConfig } from './proxyEngine';

// 由于此文件不直接与主进程通信，因此不需要ipcRenderer
// const { ipcRenderer } = window.require('electron');

export interface ChainConfig {
  id: string;
  name: string;
  description?: string;
  proxies: string[]; // 代理ID数组，按顺序排列
  rules: RoutingRule[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoutingRule {
  id: string;
  type: 'domain' | 'ip' | 'geoip' | 'process' | 'protocol';
  value: string;
  action: 'proxy' | 'direct' | 'block' | 'chain';
  target?: string; // 当action为chain时，指定使用的代理链ID
  priority: number;
}

export interface ChainStatus {
  id: string;
  running: boolean;
  currentProxy: string | null;
  latency: number;
  throughput: number;
  error?: string;
}

export class ChainProxyManager {
  private static instance: ChainProxyManager;
  private chains: Map<string, ChainConfig> = new Map();
  private status: Map<string, ChainStatus> = new Map();

  private constructor() {}

  public static getInstance(): ChainProxyManager {
    if (!ChainProxyManager.instance) {
      ChainProxyManager.instance = new ChainProxyManager();
    }
    return ChainProxyManager.instance;
  }

  /**
   * 创建新的代理链
   */
  public createChain(config: Omit<ChainConfig, 'id' | 'createdAt' | 'updatedAt'>): ChainConfig {
    const id = this.generateId();
    const now = new Date();
    
    const chain: ChainConfig = {
      ...config,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.chains.set(id, chain);
    this.status.set(id, {
      id,
      running: false,
      currentProxy: null,
      latency: 0,
      throughput: 0
    });

    return chain;
  }

  /**
   * 更新代理链配置
   */
  public updateChain(id: string, updates: Partial<ChainConfig>): ChainConfig | null {
    const chain = this.chains.get(id);
    if (!chain) {
      return null;
    }

    const updatedChain: ChainConfig = {
      ...chain,
      ...updates,
      id, // 确保ID不被修改
      updatedAt: new Date()
    };

    this.chains.set(id, updatedChain);
    return updatedChain;
  }

  /**
   * 删除代理链
   */
  public deleteChain(id: string): boolean {
    const deleted = this.chains.delete(id);
    this.status.delete(id);
    return deleted;
  }

  /**
   * 获取代理链配置
   */
  public getChain(id: string): ChainConfig | null {
    return this.chains.get(id) || null;
  }

  /**
   * 获取所有代理链
   */
  public getAllChains(): ChainConfig[] {
    return Array.from(this.chains.values());
  }

  /**
   * 获取代理链状态
   */
  public getChainStatus(id: string): ChainStatus | null {
    return this.status.get(id) || null;
  }

  /**
   * 获取所有代理链状态
   */
  public getAllChainStatus(): ChainStatus[] {
    return Array.from(this.status.values());
  }

  /**
   * 启用代理链
   */
  public enableChain(id: string): boolean {
    const chain = this.chains.get(id);
    if (!chain) {
      return false;
    }

    chain.enabled = true;
    chain.updatedAt = new Date();
    return true;
  }

  /**
   * 禁用代理链
   */
  public disableChain(id: string): boolean {
    const chain = this.chains.get(id);
    if (!chain) {
      return false;
    }

    chain.enabled = false;
    chain.updatedAt = new Date();
    
    // 更新状态
    const status = this.status.get(id);
    if (status) {
      status.running = false;
      status.currentProxy = null;
    }

    return true;
  }

  /**
   * 验证代理链配置
   */
  public validateChain(chain: ChainConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查基本信息
    if (!chain.name || chain.name.trim().length === 0) {
      errors.push('代理链名称不能为空');
    }

    if (chain.name && chain.name.length > 50) {
      errors.push('代理链名称不能超过50个字符');
    }

    // 检查代理列表
    if (!chain.proxies || chain.proxies.length === 0) {
      errors.push('代理链必须包含至少一个代理');
    }

    if (chain.proxies && chain.proxies.length > 10) {
      errors.push('代理链最多支持10个代理');
    }

    // 检查规则配置
    if (chain.rules) {
      for (const rule of chain.rules) {
        const ruleErrors = this.validateRule(rule);
        errors.push(...ruleErrors);
      }
    }

    // 检查循环引用
    if (this.hasCircularReference(chain)) {
      errors.push('代理链配置存在循环引用');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证路由规则
   */
  private validateRule(rule: RoutingRule): string[] {
    const errors: string[] = [];

    if (!rule.type) {
      errors.push('规则类型不能为空');
    }

    if (!rule.value || rule.value.trim().length === 0) {
      errors.push('规则值不能为空');
    }

    if (!rule.action) {
      errors.push('规则动作不能为空');
    }

    if (rule.action === 'chain' && !rule.target) {
      errors.push('链式规则必须指定目标代理链');
    }

    if (rule.priority < 0 || rule.priority > 1000) {
      errors.push('规则优先级必须在0-1000之间');
    }

    return errors;
  }

  /**
   * 检查循环引用
   */
  private hasCircularReference(chain: ChainConfig): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (chainId: string): boolean => {
      if (recursionStack.has(chainId)) {
        return true; // 发现循环
      }

      if (visited.has(chainId)) {
        return false; // 已访问过，无循环
      }

      visited.add(chainId);
      recursionStack.add(chainId);

      const currentChain = this.chains.get(chainId);
      if (!currentChain) {
        recursionStack.delete(chainId);
        return false;
      }

      // 检查规则中的链式引用
      for (const rule of currentChain.rules) {
        if (rule.action === 'chain' && rule.target) {
          if (dfs(rule.target)) {
            recursionStack.delete(chainId);
            return true;
          }
        }
      }

      recursionStack.delete(chainId);
      return false;
    };

    return dfs(chain.id);
  }

  /**
   * 生成Sing-box链式代理配置
   */
  public generateSingboxConfig(chain: ChainConfig, proxyConfigs: ProxyConfig[]): any {
    const outbounds: any[] = [];
    const proxyMap = new Map(proxyConfigs.map(p => [p.id, p]));

    // 创建代理出站
    for (const proxyId of chain.proxies) {
      const proxy = proxyMap.get(proxyId);
      if (!proxy) continue;

      const outbound = this.convertProxyToSingboxOutbound(proxy);
      if (outbound) {
        outbounds.push(outbound);
      }
    }

    // 创建链式出站
    if (outbounds.length > 1) {
      const chainOutbound = {
        type: "chain",
        tag: `chain-${chain.id}`,
        outbounds: outbounds.map(o => o.tag)
      };
      outbounds.push(chainOutbound);
    }

    // 添加直连和阻止出站
    outbounds.push(
      {
        type: "direct",
        tag: "direct"
      },
      {
        type: "block",
        tag: "block"
      }
    );

    // 生成路由规则
    const rules = this.generateSingboxRules(chain);

    return {
      outbounds,
      route: {
        rules,
        final: outbounds.length > 1 ? `chain-${chain.id}` : outbounds[0]?.tag || "direct"
      }
    };
  }

  /**
   * 转换代理配置为Sing-box出站
   */
  private convertProxyToSingboxOutbound(proxy: ProxyConfig): any {
    switch (proxy.type) {
      case 'singbox':
        return {
          ...proxy.config,
          tag: `proxy-${proxy.id}`
        };
      
      case 'xray':
        return this.convertXrayToSingbox(proxy.config, proxy.id);
      
      case 'clash':
        return this.convertClashToSingbox(proxy.config, proxy.id);
      
      default:
        return null;
    }
  }

  /**
   * 转换Xray配置为Sing-box格式
   */
  private convertXrayToSingbox(xrayConfig: any, proxyId: string): any {
    // 这里需要根据具体的Xray配置进行转换
    // 简化示例
    return {
      type: "vmess", // 根据实际协议类型
      tag: `proxy-${proxyId}`,
      server: xrayConfig.server || "127.0.0.1",
      server_port: xrayConfig.port || 1080,
      // 其他配置项...
    };
  }

  /**
   * 转换Clash配置为Sing-box格式
   */
  private convertClashToSingbox(clashConfig: any, proxyId: string): any {
    // 这里需要根据具体的Clash配置进行转换
    // 简化示例
    return {
      type: "vmess", // 根据实际协议类型
      tag: `proxy-${proxyId}`,
      server: clashConfig.server || "127.0.0.1",
      server_port: clashConfig.port || 7890,
      // 其他配置项...
    };
  }

  /**
   * 生成Sing-box路由规则
   */
  private generateSingboxRules(chain: ChainConfig): any[] {
    const rules: any[] = [];

    // 添加内置规则
    rules.push(
      {
        geoip: "private",
        outbound: "direct"
      },
      {
        geoip: "cn",
        outbound: "direct"
      }
    );

    // 添加用户自定义规则
    for (const rule of chain.rules) {
      const singboxRule = this.convertRuleToSingbox(rule);
      if (singboxRule) {
        rules.push(singboxRule);
      }
    }

    return rules;
  }

  /**
   * 转换路由规则为Sing-box格式
   */
  private convertRuleToSingbox(rule: RoutingRule): any {
    const baseRule: any = {
      outbound: rule.action === 'chain' && rule.target ? `chain-${rule.target}` : rule.action
    };

    switch (rule.type) {
      case 'domain':
        baseRule.domain = [rule.value];
        break;
      case 'ip':
        baseRule.ip_cidr = [rule.value];
        break;
      case 'geoip':
        baseRule.geoip = rule.value;
        break;
      case 'process':
        baseRule.process_name = [rule.value];
        break;
      case 'protocol':
        baseRule.protocol = [rule.value];
        break;
    }

    return baseRule;
  }

  /**
   * 测试代理链延迟
   */
  public async testChainLatency(chainId: string): Promise<number> {
    const chain = this.chains.get(chainId);
    if (!chain || !chain.enabled) {
      throw new Error('代理链不存在或未启用');
    }

    // 这里应该实现实际的延迟测试逻辑
    // 简化示例，返回随机延迟
    return Math.random() * 100 + 50; // 50-150ms
  }

  /**
   * 获取代理链性能统计
   */
  public async getChainStats(chainId: string): Promise<{
    latency: number;
    throughput: number;
    successRate: number;
    lastTest: Date;
  }> {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error('代理链不存在');
    }

    // 这里应该实现实际的统计逻辑
    // 简化示例
    return {
      latency: Math.random() * 100 + 50,
      throughput: Math.random() * 1000 + 500,
      successRate: Math.random() * 0.3 + 0.7, // 70%-100%
      lastTest: new Date()
    };
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 导出代理链配置
   */
  public exportChain(id: string): string {
    const chain = this.chains.get(id);
    if (!chain) {
      throw new Error('代理链不存在');
    }

    return JSON.stringify(chain, null, 2);
  }

  /**
   * 导入代理链配置
   */
  public importChain(configJson: string): ChainConfig {
    try {
      const config = JSON.parse(configJson);
      const validation = this.validateChain(config);
      
      if (!validation.valid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }

      // 生成新的ID和时间戳
      const importedChain: ChainConfig = {
        ...config,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.chains.set(importedChain.id, importedChain);
      this.status.set(importedChain.id, {
        id: importedChain.id,
        running: false,
        currentProxy: null,
        latency: 0,
        throughput: 0
      });

      return importedChain;
    } catch (error) {
      throw new Error(`导入配置失败: ${error}`);
    }
  }
}

export const chainProxyManager = ChainProxyManager.getInstance();
