import { RoutingRule, RuleType, RuleAction, RuleSource } from '../../shared/types';
import { log } from './logger';
import { 
  ClashRuleProcessor, 
  SingboxRuleProcessor, 
  V2RayRuleProcessor, 
  CustomRuleProcessor 
} from './ruleProcessors';
import { 
  DomainRuleOptimizer, 
  IPRuleOptimizer, 
  RedundancyOptimizer, 
  PriorityOptimizer 
} from './ruleOptimizers';
import { 
  RuleFormatValidator, 
  RuleLogicValidator, 
  RulePriorityValidator 
} from './ruleValidators';

/**
 * 智能规则解析框架
 * 参考GitHub上成熟项目的实现方式，提供智能的规则解析和优化
 */
export interface RuleParseContext {
  source: string;
  format: 'clash' | 'singbox' | 'v2ray' | 'custom';
  priority?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface RuleOptimizationOptions {
  mergeSimilarRules: boolean;
  removeRedundantRules: boolean;
  optimizeDomainRules: boolean;
  optimizeIPRules: boolean;
  preserveOrder: boolean;
  maxRulesPerGroup: number;
}

export interface RuleParseResult {
  rules: RoutingRule[];
  groups: RuleGroup[];
  statistics: RuleStatistics;
  conflicts: RuleConflict[];
  optimizations: RuleOptimization[];
}

export interface RuleGroup {
  id: string;
  name: string;
  type: RuleType;
  action: RuleAction;
  rules: RoutingRule[];
  priority: number;
  description?: string;
  tags: string[];
}

export interface RuleStatistics {
  totalRules: number;
  groupedRules: number;
  optimizedRules: number;
  removedRules: number;
  ruleTypes: Record<RuleType, number>;
  ruleActions: Record<RuleAction, number>;
  ruleSources: Record<RuleSource, number>;
}

export interface RuleConflict {
  type: 'duplicate' | 'overlap' | 'contradiction' | 'priority';
  severity: 'low' | 'medium' | 'high';
  rules: RoutingRule[];
  description: string;
  suggestion?: string;
}

export interface RuleOptimization {
  type: 'merge' | 'remove' | 'simplify' | 'reorder';
  description: string;
  before: RoutingRule[];
  after: RoutingRule[];
  impact: 'positive' | 'neutral' | 'negative';
}

export class SmartRuleParser {
  private static instance: SmartRuleParser;
  private ruleProcessors: Map<string, RuleProcessor> = new Map();
  private optimizers: RuleOptimizer[] = [];
  private validators: RuleValidator[] = [];

  private constructor() {
    this.initializeProcessors();
    this.initializeOptimizers();
    this.initializeValidators();
  }

  public static getInstance(): SmartRuleParser {
    if (!SmartRuleParser.instance) {
      SmartRuleParser.instance = new SmartRuleParser();
    }
    return SmartRuleParser.instance;
  }

  /**
   * 智能解析规则
   */
  public async parseRules(
    content: string, 
    context: RuleParseContext, 
    options: RuleOptimizationOptions = this.getDefaultOptions()
  ): Promise<RuleParseResult> {
    try {
      log.info('开始智能规则解析', { source: context.source, format: context.format }, 'SmartRuleParser');

      // 1. 解析原始规则
      const rawRules = await this.parseRawRules(content, context);
      
      // 2. 验证规则
      const validationResult = this.validateRules(rawRules);
      
      // 3. 优化规则
      const optimizationResult = this.optimizeRules(rawRules, options);
      
      // 4. 分组规则
      const groupedRules = this.groupRules(optimizationResult.rules);
      
      // 5. 检测冲突
      const conflicts = this.detectConflicts(groupedRules);
      
      // 6. 生成统计信息
      const statistics = this.generateStatistics(groupedRules, optimizationResult);

      const result: RuleParseResult = {
        rules: groupedRules,
        groups: this.createRuleGroups(groupedRules),
        statistics,
        conflicts,
        optimizations: optimizationResult.optimizations
      };

      log.info('智能规则解析完成', { 
        totalRules: statistics.totalRules,
        groupedRules: statistics.groupedRules,
        conflicts: conflicts.length,
        optimizations: optimizationResult.optimizations.length
      }, 'SmartRuleParser');

      return result;
    } catch (error) {
      log.error('智能规则解析失败', error, 'SmartRuleParser');
      throw error;
    }
  }

  /**
   * 解析原始规则
   */
  private async parseRawRules(content: string, context: RuleParseContext): Promise<RoutingRule[]> {
    const processor = this.ruleProcessors.get(context.format);
    if (!processor) {
      throw new Error(`不支持的规则格式: ${context.format}`);
    }

    return await processor.parse(content, context);
  }

  /**
   * 验证规则
   */
  private validateRules(rules: RoutingRule[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const validator of this.validators) {
      const result = validator.validate(rules);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    return { errors, warnings };
  }

  /**
   * 优化规则
   */
  private optimizeRules(rules: RoutingRule[], options: RuleOptimizationOptions): OptimizationResult {
    let optimizedRules = [...rules];
    const optimizations: RuleOptimization[] = [];

    for (const optimizer of this.optimizers) {
      const result = optimizer.optimize(optimizedRules, options);
      optimizedRules = result.rules;
      optimizations.push(...result.optimizations);
    }

    return { rules: optimizedRules, optimizations };
  }

  /**
   * 分组规则
   */
  private groupRules(rules: RoutingRule[]): RoutingRule[] {
    const groups = new Map<string, RoutingRule[]>();

    for (const rule of rules) {
      const key = `${rule.type}_${rule.action}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(rule);
    }

    const groupedRules: RoutingRule[] = [];
    for (const [key, groupRules] of groups) {
      if (groupRules.length === 1) {
        groupedRules.push(groupRules[0]);
      } else {
        const groupRule = this.createGroupRule(groupRules);
        groupedRules.push(groupRule);
      }
    }

    return groupedRules;
  }

  /**
   * 创建规则组
   */
  private createGroupRule(rules: RoutingRule[]): RoutingRule {
    const firstRule = rules[0];
    const values = rules.map(r => r.value).flat();

    return {
      id: this.generateId(),
      name: `${this.getRuleTypeLabel(firstRule.type)}规则组`,
      type: firstRule.type,
      value: values,
      action: firstRule.action,
      priority: Math.min(...rules.map(r => r.priority)),
      source: firstRule.source,
      enabled: true,
      description: `智能分组规则 (${rules.length} 条规则合并)`,
      tags: [...new Set(rules.flatMap(r => r.tags || []))],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * 检测规则冲突
   */
  private detectConflicts(rules: RoutingRule[]): RuleConflict[] {
    const conflicts: RuleConflict[] = [];

    // 检测重复规则
    const duplicates = this.findDuplicateRules(rules);
    if (duplicates.length > 0) {
      conflicts.push({
        type: 'duplicate',
        severity: 'medium',
        rules: duplicates,
        description: '发现重复规则',
        suggestion: '建议删除重复规则'
      });
    }

    // 检测重叠规则
    const overlaps = this.findOverlappingRules(rules);
    if (overlaps.length > 0) {
      conflicts.push({
        type: 'overlap',
        severity: 'low',
        rules: overlaps,
        description: '发现重叠规则',
        suggestion: '建议合并重叠规则'
      });
    }

    return conflicts;
  }

  /**
   * 生成统计信息
   */
  private generateStatistics(rules: RoutingRule[], optimizationResult: OptimizationResult): RuleStatistics {
    const ruleTypes: Record<RuleType, number> = {} as any;
    const ruleActions: Record<RuleAction, number> = {} as any;
    const ruleSources: Record<RuleSource, number> = {} as any;

    for (const rule of rules) {
      ruleTypes[rule.type] = (ruleTypes[rule.type] || 0) + 1;
      ruleActions[rule.action] = (ruleActions[rule.action] || 0) + 1;
      ruleSources[rule.source] = (ruleSources[rule.source] || 0) + 1;
    }

    return {
      totalRules: rules.length,
      groupedRules: rules.filter(r => Array.isArray(r.value) && r.value.length > 1).length,
      optimizedRules: optimizationResult.optimizations.length,
      removedRules: 0, // 需要计算
      ruleTypes,
      ruleActions,
      ruleSources
    };
  }

  /**
   * 创建规则组
   */
  private createRuleGroups(rules: RoutingRule[]): RuleGroup[] {
    const groups = new Map<string, RuleGroup>();

    for (const rule of rules) {
      const key = `${rule.type}_${rule.action}`;
      if (!groups.has(key)) {
        groups.set(key, {
          id: this.generateId(),
          name: `${this.getRuleTypeLabel(rule.type)}规则组`,
          type: rule.type,
          action: rule.action,
          rules: [],
          priority: rule.priority,
          description: `包含 ${rule.type} 类型的规则`,
          tags: rule.tags || []
        });
      }
      groups.get(key)!.rules.push(rule);
    }

    return Array.from(groups.values());
  }

  /**
   * 初始化处理器
   */
  private initializeProcessors(): void {
    this.ruleProcessors.set('clash', new ClashRuleProcessor());
    this.ruleProcessors.set('singbox', new SingboxRuleProcessor());
    this.ruleProcessors.set('v2ray', new V2RayRuleProcessor());
    this.ruleProcessors.set('custom', new CustomRuleProcessor());
  }

  /**
   * 初始化优化器
   */
  private initializeOptimizers(): void {
    this.optimizers.push(
      new DomainRuleOptimizer(),
      new IPRuleOptimizer(),
      new RedundancyOptimizer(),
      new PriorityOptimizer()
    );
  }

  /**
   * 初始化验证器
   */
  private initializeValidators(): void {
    this.validators.push(
      new RuleFormatValidator(),
      new RuleLogicValidator(),
      new RulePriorityValidator()
    );
  }

  /**
   * 获取默认优化选项
   */
  private getDefaultOptions(): RuleOptimizationOptions {
    return {
      mergeSimilarRules: true,
      removeRedundantRules: true,
      optimizeDomainRules: true,
      optimizeIPRules: true,
      preserveOrder: false,
      maxRulesPerGroup: 1000
    };
  }

  /**
   * 工具方法
   */
  private generateId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getRuleTypeLabel(ruleType: RuleType): string {
    const labels: Record<RuleType, string> = {
      [RuleType.DOMAIN]: '域名',
      [RuleType.DOMAIN_SUFFIX]: '域名后缀',
      [RuleType.DOMAIN_KEYWORD]: '域名关键词',
      [RuleType.DOMAIN_REGEX]: '域名正则',
      [RuleType.IP_CIDR]: 'IP段',
      [RuleType.IP_CIDR6]: 'IPv6段',
      [RuleType.GEOIP]: '地理位置',
      [RuleType.PROCESS]: '进程',
      [RuleType.PROCESS_PATH]: '进程路径',
      [RuleType.PROTOCOL]: '协议',
      [RuleType.SCRIPT]: '脚本',
      [RuleType.MATCH]: '匹配所有'
    };
    return labels[ruleType] || ruleType;
  }

  private findDuplicateRules(rules: RoutingRule[]): RoutingRule[] {
    // 实现重复规则检测逻辑
    return [];
  }

  private findOverlappingRules(rules: RoutingRule[]): RoutingRule[] {
    // 实现重叠规则检测逻辑
    return [];
  }
}

// 接口定义
export interface RuleProcessor {
  parse(content: string, context: RuleParseContext): Promise<RoutingRule[]>;
}

export interface RuleOptimizer {
  optimize(rules: RoutingRule[], options: RuleOptimizationOptions): OptimizationResult;
}

export interface RuleValidator {
  validate(rules: RoutingRule[]): ValidationResult;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export interface OptimizationResult {
  rules: RoutingRule[];
  optimizations: RuleOptimization[];
}

// 导出单例
export const smartRuleParser = SmartRuleParser.getInstance();
