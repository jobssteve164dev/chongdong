import { RoutingRule, RuleType, RuleAction, RuleSource } from '../../shared/types';
import { log } from './logger';

export interface ExportFormat {
  name: string;
  extension: string;
  mimeType: string;
}

export interface ExportOptions {
  format: 'json' | 'clash' | 'singbox' | 'v2ray';
  includeMetadata?: boolean;
  includeDisabled?: boolean;
  filterBySource?: RuleSource[];
  filterByType?: RuleType[];
  filterByAction?: RuleAction[];
}

export interface ImportOptions {
  format: 'auto' | 'json' | 'clash' | 'singbox' | 'v2ray';
  mergeStrategy?: 'replace' | 'merge' | 'append';
  conflictResolution?: 'skip' | 'overwrite' | 'rename';
  validateRules?: boolean;
}

export class RuleExporter {
  private static instance: RuleExporter;

  private constructor() {}

  public static getInstance(): RuleExporter {
    if (!RuleExporter.instance) {
      RuleExporter.instance = new RuleExporter();
    }
    return RuleExporter.instance;
  }

  /**
   * 导出规则为JSON格式
   */
  public exportToJson(rules: RoutingRule[], options: ExportOptions = { format: 'json' }): string {
    try {
      const filteredRules = this.filterRules(rules, options);
      
      const exportData: any = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        rules: filteredRules
      };

      if (options.includeMetadata) {
        exportData.metadata = {
          totalRules: filteredRules.length,
          enabledRules: filteredRules.filter(r => r.enabled).length,
          disabledRules: filteredRules.filter(r => !r.enabled).length,
          sources: [...new Set(filteredRules.map(r => r.source))],
          types: [...new Set(filteredRules.map(r => r.type))],
          actions: [...new Set(filteredRules.map(r => r.action))]
        };
      }

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      log.error('导出JSON格式失败', error, 'RuleExporter');
      throw new Error('导出失败');
    }
  }

  /**
   * 导出规则为Clash格式
   */
  public exportToClash(rules: RoutingRule[], options: ExportOptions = { format: 'clash' }): string {
    try {
      const filteredRules = this.filterRules(rules, options);
      
      const clashRules: string[] = [];
      
      for (const rule of filteredRules) {
        const clashRule = this.convertRuleToClash(rule);
        if (clashRule) {
          clashRules.push(clashRule);
        }
      }

      const clashConfig = {
        port: 7890,
        'socks-port': 7891,
        'mixed-port': 7892,
        mode: 'rule',
        'log-level': 'info',
        rules: clashRules
      };

      return JSON.stringify(clashConfig, null, 2);
    } catch (error) {
      log.error('导出Clash格式失败', error, 'RuleExporter');
      throw new Error('导出失败');
    }
  }

  /**
   * 导出规则为Sing-box格式
   */
  public exportToSingbox(rules: RoutingRule[], options: ExportOptions = { format: 'singbox' }): string {
    try {
      const filteredRules = this.filterRules(rules, options);
      
      const singboxRules: any[] = [];
      
      for (const rule of filteredRules) {
        const singboxRule = this.convertRuleToSingbox(rule);
        if (singboxRule) {
          singboxRules.push(singboxRule);
        }
      }

      const singboxConfig = {
        log: {
          level: 'info',
          output: 'console'
        },
        route: {
          rules: singboxRules,
          final: 'direct'
        }
      };

      return JSON.stringify(singboxConfig, null, 2);
    } catch (error) {
      log.error('导出Sing-box格式失败', error, 'RuleExporter');
      throw new Error('导出失败');
    }
  }

  /**
   * 导出规则为V2Ray格式
   */
  public exportToV2Ray(rules: RoutingRule[], options: ExportOptions = { format: 'v2ray' }): string {
    try {
      const filteredRules = this.filterRules(rules, options);
      
      const v2rayRules: any[] = [];
      
      for (const rule of filteredRules) {
        const v2rayRule = this.convertRuleToV2Ray(rule);
        if (v2rayRule) {
          v2rayRules.push(v2rayRule);
        }
      }

      const v2rayConfig = {
        log: {
          access: 'access.log',
          error: 'error.log',
          loglevel: 'warning'
        },
        routing: {
          rules: v2rayRules
        }
      };

      return JSON.stringify(v2rayConfig, null, 2);
    } catch (error) {
      log.error('导出V2Ray格式失败', error, 'RuleExporter');
      throw new Error('导出失败');
    }
  }

  /**
   * 从JSON格式导入规则
   */
  public importFromJson(content: string, options: ImportOptions = { format: 'json' }): RoutingRule[] {
    try {
      const data = JSON.parse(content);
      let rules: RoutingRule[] = [];

      if (Array.isArray(data)) {
        rules = data;
      } else if (data.rules && Array.isArray(data.rules)) {
        rules = data.rules;
      } else {
        throw new Error('无效的JSON格式');
      }

      return this.processImportedRules(rules, options);
    } catch (error) {
      log.error('导入JSON格式失败', error, 'RuleExporter');
      throw new Error('导入失败');
    }
  }

  /**
   * 从Clash格式导入规则
   */
  public importFromClash(content: string, options: ImportOptions = { format: 'clash' }): RoutingRule[] {
    try {
      const config = JSON.parse(content);
      const rules: RoutingRule[] = [];

      if (config.rules && Array.isArray(config.rules)) {
        for (const clashRule of config.rules) {
          const rule = this.convertClashToRule(clashRule);
          if (rule) {
            rules.push(rule);
          }
        }
      }

      return this.processImportedRules(rules, options);
    } catch (error) {
      log.error('导入Clash格式失败', error, 'RuleExporter');
      throw new Error('导入失败');
    }
  }

  /**
   * 从Sing-box格式导入规则
   */
  public importFromSingbox(content: string, options: ImportOptions = { format: 'singbox' }): RoutingRule[] {
    try {
      const config = JSON.parse(content);
      const rules: RoutingRule[] = [];

      if (config.route?.rules && Array.isArray(config.route.rules)) {
        for (const singboxRule of config.route.rules) {
          const rule = this.convertSingboxToRule(singboxRule);
          if (rule) {
            rules.push(rule);
          }
        }
      }

      return this.processImportedRules(rules, options);
    } catch (error) {
      log.error('导入Sing-box格式失败', error, 'RuleExporter');
      throw new Error('导入失败');
    }
  }

  /**
   * 自动检测格式并导入
   */
  public importAuto(content: string, options: ImportOptions = { format: 'auto' }): RoutingRule[] {
    try {
      // 尝试检测格式
      const format = this.detectFormat(content);
      
      switch (format) {
        case 'json':
          return this.importFromJson(content, { ...options, format: 'json' });
        case 'clash':
          return this.importFromClash(content, { ...options, format: 'clash' });
        case 'singbox':
          return this.importFromSingbox(content, { ...options, format: 'singbox' });
        default:
          throw new Error('无法识别的格式');
      }
    } catch (error) {
      log.error('自动导入失败', error, 'RuleExporter');
      throw new Error('导入失败');
    }
  }

  /**
   * 检测文件格式
   */
  private detectFormat(content: string): string {
    try {
      const data = JSON.parse(content);
      
      if (data.rules && Array.isArray(data.rules)) {
        // 检查是否为Clash格式
        if (data.port !== undefined || data['socks-port'] !== undefined) {
          return 'clash';
        }
        // 检查是否为Sing-box格式
        if (data.route?.rules) {
          return 'singbox';
        }
      }
      
      return 'json';
    } catch (error) {
      throw new Error('无法解析JSON格式');
    }
  }

  /**
   * 过滤规则
   */
  private filterRules(rules: RoutingRule[], options: ExportOptions): RoutingRule[] {
    let filtered = rules;

    if (!options.includeDisabled) {
      filtered = filtered.filter(rule => rule.enabled);
    }

    if (options.filterBySource) {
      filtered = filtered.filter(rule => options.filterBySource!.includes(rule.source));
    }

    if (options.filterByType) {
      filtered = filtered.filter(rule => options.filterByType!.includes(rule.type));
    }

    if (options.filterByAction) {
      filtered = filtered.filter(rule => options.filterByAction!.includes(rule.action));
    }

    return filtered;
  }

  /**
   * 处理导入的规则
   */
  private processImportedRules(rules: RoutingRule[], options: ImportOptions): RoutingRule[] {
    const processedRules: RoutingRule[] = [];

    for (const rule of rules) {
      try {
        // 验证规则
        if (options.validateRules && !this.validateRule(rule)) {
          log.warn('跳过无效规则', { rule }, 'RuleExporter');
          continue;
        }

        // 处理冲突
        const processedRule = this.resolveConflicts(rule, options);
        if (processedRule) {
          processedRules.push(processedRule);
        }
      } catch (error) {
        log.warn('处理规则失败', { rule, error }, 'RuleExporter');
      }
    }

    return processedRules;
  }

  /**
   * 验证规则
   */
  private validateRule(rule: any): boolean {
    return rule &&
           typeof rule.name === 'string' &&
           typeof rule.type === 'string' &&
           typeof rule.value === 'string' &&
           typeof rule.action === 'string' &&
           typeof rule.priority === 'number';
  }

  /**
   * 解决冲突
   */
  private resolveConflicts(rule: RoutingRule, options: ImportOptions): RoutingRule | null {
    // 这里可以实现更复杂的冲突解决逻辑
    switch (options.conflictResolution) {
      case 'skip':
        // 跳过冲突的规则
        return rule;
      case 'overwrite':
        // 覆盖现有规则
        return rule;
      case 'rename':
        // 重命名规则
        return {
          ...rule,
          name: `${rule.name}_imported_${Date.now()}`
        };
      default:
        return rule;
    }
  }

  /**
   * 转换规则为Clash格式
   */
  private convertRuleToClash(rule: RoutingRule): string | null {
    try {
      const value = Array.isArray(rule.value) ? rule.value[0] : rule.value;
      const action = this.convertActionToClash(rule.action, rule.target);
      
      switch (rule.type) {
        case RuleType.DOMAIN:
          return `DOMAIN,${value},${action}`;
        case RuleType.DOMAIN_SUFFIX:
          return `DOMAIN-SUFFIX,${value},${action}`;
        case RuleType.DOMAIN_KEYWORD:
          return `DOMAIN-KEYWORD,${value},${action}`;
        case RuleType.IP_CIDR:
          return `IP-CIDR,${value},${action}`;
        case RuleType.GEOIP:
          return `GEOIP,${value},${action}`;
        case RuleType.MATCH:
          return `MATCH,${action}`;
        default:
          return null;
      }
    } catch (error) {
      log.warn('转换Clash规则失败', { rule, error }, 'RuleExporter');
      return null;
    }
  }

  /**
   * 转换动作为Clash格式
   */
  private convertActionToClash(action: RuleAction, target?: string): string {
    switch (action) {
      case RuleAction.PROXY:
        return target || 'Proxy';
      case RuleAction.DIRECT:
        return 'Direct';
      case RuleAction.BLOCK:
        return 'Reject';
      case RuleAction.CHAIN:
        return target || 'Proxy';
      default:
        return 'Direct';
    }
  }

  /**
   * 转换规则为Sing-box格式
   */
  private convertRuleToSingbox(rule: RoutingRule): any | null {
    try {
      const value = Array.isArray(rule.value) ? rule.value[0] : rule.value;
      const outbound = this.convertActionToSingbox(rule.action, rule.target);
      
      switch (rule.type) {
        case RuleType.DOMAIN:
          return {
            domain: [value],
            outbound
          };
        case RuleType.DOMAIN_SUFFIX:
          return {
            domain_suffix: [value],
            outbound
          };
        case RuleType.DOMAIN_KEYWORD:
          return {
            domain_keyword: [value],
            outbound
          };
        case RuleType.IP_CIDR:
          return {
            ip_cidr: [value],
            outbound
          };
        case RuleType.GEOIP:
          return {
            geoip: value,
            outbound
          };
        case RuleType.MATCH:
          return {
            outbound
          };
        default:
          return null;
      }
    } catch (error) {
      log.warn('转换Sing-box规则失败', { rule, error }, 'RuleExporter');
      return null;
    }
  }

  /**
   * 转换动作为Sing-box格式
   */
  private convertActionToSingbox(action: RuleAction, target?: string): string {
    switch (action) {
      case RuleAction.PROXY:
        return target || 'proxy';
      case RuleAction.DIRECT:
        return 'direct';
      case RuleAction.BLOCK:
        return 'block';
      case RuleAction.CHAIN:
        return target || 'proxy';
      default:
        return 'direct';
    }
  }

  /**
   * 转换规则为V2Ray格式
   */
  private convertRuleToV2Ray(rule: RoutingRule): any | null {
    try {
      const value = Array.isArray(rule.value) ? rule.value[0] : rule.value;
      const outboundTag = this.convertActionToV2Ray(rule.action, rule.target);
      
      switch (rule.type) {
        case RuleType.DOMAIN:
          return {
            type: 'field',
            domain: [value],
            outboundTag
          };
        case RuleType.IP_CIDR:
          return {
            type: 'field',
            ip: [value],
            outboundTag
          };
        case RuleType.GEOIP:
          return {
            type: 'field',
            geoip: [value],
            outboundTag
          };
        case RuleType.MATCH:
          return {
            type: 'field',
            outboundTag
          };
        default:
          return null;
      }
    } catch (error) {
      log.warn('转换V2Ray规则失败', { rule, error }, 'RuleExporter');
      return null;
    }
  }

  /**
   * 转换动作为V2Ray格式
   */
  private convertActionToV2Ray(action: RuleAction, target?: string): string {
    switch (action) {
      case RuleAction.PROXY:
        return target || 'proxy';
      case RuleAction.DIRECT:
        return 'direct';
      case RuleAction.BLOCK:
        return 'block';
      case RuleAction.CHAIN:
        return target || 'proxy';
      default:
        return 'direct';
    }
  }

  /**
   * 转换Clash规则为内部格式
   */
  private convertClashToRule(clashRule: string): RoutingRule | null {
    try {
      const parts = clashRule.split(',');
      if (parts.length < 2) return null;

      const [type, value, action] = parts;
      const ruleType = this.convertClashTypeToRuleType(type);
      const ruleAction = this.convertClashActionToRuleAction(action);

      if (!ruleType || !ruleAction) return null;

      return {
        id: this.generateId(),
        name: `${type}:${value}`,
        type: ruleType,
        value: value,
        action: ruleAction,
        priority: 100,
        source: RuleSource.SUBSCRIPTION,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      log.warn('转换Clash规则失败', { clashRule, error }, 'RuleExporter');
      return null;
    }
  }

  /**
   * 转换Sing-box规则为内部格式
   */
  private convertSingboxToRule(singboxRule: any): RoutingRule | null {
    try {
      const outbound = singboxRule.outbound;
      const ruleAction = this.convertSingboxActionToRuleAction(outbound);

      let ruleType: RuleType | null = null;
      let value: string = '';

      if (singboxRule.domain) {
        ruleType = RuleType.DOMAIN;
        value = Array.isArray(singboxRule.domain) ? singboxRule.domain[0] : singboxRule.domain;
      } else if (singboxRule.domain_suffix) {
        ruleType = RuleType.DOMAIN_SUFFIX;
        value = Array.isArray(singboxRule.domain_suffix) ? singboxRule.domain_suffix[0] : singboxRule.domain_suffix;
      } else if (singboxRule.domain_keyword) {
        ruleType = RuleType.DOMAIN_KEYWORD;
        value = Array.isArray(singboxRule.domain_keyword) ? singboxRule.domain_keyword[0] : singboxRule.domain_keyword;
      } else if (singboxRule.ip_cidr) {
        ruleType = RuleType.IP_CIDR;
        value = Array.isArray(singboxRule.ip_cidr) ? singboxRule.ip_cidr[0] : singboxRule.ip_cidr;
      } else if (singboxRule.geoip) {
        ruleType = RuleType.GEOIP;
        value = singboxRule.geoip;
      } else {
        ruleType = RuleType.MATCH;
        value = '*';
      }

      if (!ruleType || !ruleAction) return null;

      return {
        id: this.generateId(),
        name: `${ruleType}:${value}`,
        type: ruleType,
        value: value,
        action: ruleAction,
        priority: 100,
        source: RuleSource.SUBSCRIPTION,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      log.warn('转换Sing-box规则失败', { singboxRule, error }, 'RuleExporter');
      return null;
    }
  }

  /**
   * 转换Clash类型为规则类型
   */
  private convertClashTypeToRuleType(clashType: string): RuleType | null {
    switch (clashType) {
      case 'DOMAIN':
        return RuleType.DOMAIN;
      case 'DOMAIN-SUFFIX':
        return RuleType.DOMAIN_SUFFIX;
      case 'DOMAIN-KEYWORD':
        return RuleType.DOMAIN_KEYWORD;
      case 'IP-CIDR':
        return RuleType.IP_CIDR;
      case 'GEOIP':
        return RuleType.GEOIP;
      case 'MATCH':
        return RuleType.MATCH;
      default:
        return null;
    }
  }

  /**
   * 转换Clash动作为规则动作
   */
  private convertClashActionToRuleAction(clashAction: string): RuleAction | null {
    switch (clashAction) {
      case 'Proxy':
        return RuleAction.PROXY;
      case 'Direct':
        return RuleAction.DIRECT;
      case 'Reject':
        return RuleAction.BLOCK;
      default:
        return RuleAction.DIRECT;
    }
  }

  /**
   * 转换Sing-box动作为规则动作
   */
  private convertSingboxActionToRuleAction(singboxAction: string): RuleAction | null {
    switch (singboxAction) {
      case 'proxy':
        return RuleAction.PROXY;
      case 'direct':
        return RuleAction.DIRECT;
      case 'block':
        return RuleAction.BLOCK;
      default:
        return RuleAction.DIRECT;
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const ruleExporter = RuleExporter.getInstance();
