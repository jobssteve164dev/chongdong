import {
  RoutingRule,
  RuleGroup,
  RuleTemplate,
  RuleType,
  RuleAction,
  RuleSource,
  RuleParseResult,
  RuleConflictResult,
  RuleMatchResult,
  RuleStats
} from '../../shared/types';
import { log } from './logger';
import { Storage, STORAGE_KEYS } from './storage';

export interface RuleManagerConfig {
  maxRules?: number;
  enableConflictDetection?: boolean;
  enableRuleStats?: boolean;
  autoBackup?: boolean;
  backupInterval?: number;
}

export class RuleManager {
  private static instance: RuleManager;
  private rules: Map<string, RoutingRule> = new Map();
  private groups: Map<string, RuleGroup> = new Map();
  private templates: Map<string, RuleTemplate> = new Map();
  private config: RuleManagerConfig;
  private stats: RuleStats;
  private backupTimer?: NodeJS.Timeout;

  private constructor(config: RuleManagerConfig = {}) {
    this.config = {
      maxRules: 10000,
      enableConflictDetection: true,
      enableRuleStats: true,
      autoBackup: true,
      backupInterval: 300000, // 5分钟
      ...config
    };
    
    this.stats = this.initializeStats();
    this.loadData();
    this.startAutoBackup();
  }

  public static getInstance(config?: RuleManagerConfig): RuleManager {
    if (!RuleManager.instance) {
      RuleManager.instance = new RuleManager(config);
    }
    return RuleManager.instance;
  }

  /**
   * 初始化统计信息
   */
  private initializeStats(): RuleStats {
    return {
      totalRules: 0,
      enabledRules: 0,
      disabledRules: 0,
      rulesByType: {} as Record<RuleType, number>,
      rulesByAction: {} as Record<RuleAction, number>,
      rulesBySource: {} as Record<RuleSource, number>,
      topMatchedRules: [],
      recentActivity: []
    };
  }

  /**
   * 从存储加载数据
   */
  private loadData(): void {
    try {
      // 加载规则
      const savedRules = Storage.get<RoutingRule[]>(STORAGE_KEYS.RULES, []);
      savedRules.forEach(rule => {
        this.rules.set(rule.id, {
          ...rule,
          createdAt: new Date(rule.createdAt),
          updatedAt: new Date(rule.updatedAt)
        });
      });

      // 加载规则组
      const savedGroups = Storage.get<RuleGroup[]>(STORAGE_KEYS.RULE_GROUPS, []);
      savedGroups.forEach(group => {
        this.groups.set(group.id, {
          ...group,
          rules: group.rules.map(rule => ({
            ...rule,
            createdAt: new Date(rule.createdAt),
            updatedAt: new Date(rule.updatedAt)
          })),
          createdAt: new Date(group.createdAt),
          updatedAt: new Date(group.updatedAt)
        });
      });

      // 加载规则模板
      const savedTemplates = Storage.get<RuleTemplate[]>(STORAGE_KEYS.RULE_TEMPLATES, []);
      savedTemplates.forEach(template => {
        this.templates.set(template.id, {
          ...template,
          rules: template.rules.map(rule => ({
            ...rule,
            createdAt: new Date(rule.createdAt),
            updatedAt: new Date(rule.updatedAt)
          })),
          createdAt: new Date(template.createdAt),
          updatedAt: new Date(template.updatedAt)
        });
      });

      this.updateStats();
      log.info('规则管理器数据加载完成', {
        rules: this.rules.size,
        groups: this.groups.size,
        templates: this.templates.size
      }, 'RuleManager');
    } catch (error) {
      log.error('加载规则数据失败', error, 'RuleManager');
    }
  }

  /**
   * 保存数据到存储
   */
  private saveData(): void {
    try {
      const rules = Array.from(this.rules.values());
      const groups = Array.from(this.groups.values());
      const templates = Array.from(this.templates.values());

      Storage.set(STORAGE_KEYS.RULES, rules);
      Storage.set(STORAGE_KEYS.RULE_GROUPS, groups);
      Storage.set(STORAGE_KEYS.RULE_TEMPLATES, templates);

      log.debug('规则数据保存完成', {
        rules: rules.length,
        groups: groups.length,
        templates: templates.length
      }, 'RuleManager');
    } catch (error) {
      log.error('保存规则数据失败', error, 'RuleManager');
    }
  }

  /**
   * 添加规则
   */
  public addRule(rule: Omit<RoutingRule, 'id' | 'createdAt' | 'updatedAt'>): RoutingRule {
    if (this.rules.size >= (this.config.maxRules || 10000)) {
      throw new Error('规则数量已达到上限');
    }

    const newRule: RoutingRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.rules.set(newRule.id, newRule);
    this.updateStats();
    this.saveData();
    this.addActivity('create', newRule);

    log.info('添加规则', { id: newRule.id, name: newRule.name }, 'RuleManager');
    return newRule;
  }

  /**
   * 更新规则
   */
  public updateRule(id: string, updates: Partial<RoutingRule>): RoutingRule | null {
    const rule = this.rules.get(id);
    if (!rule) {
      return null;
    }

    const updatedRule: RoutingRule = {
      ...rule,
      ...updates,
      id, // 确保ID不被修改
      updatedAt: new Date()
    };

    this.rules.set(id, updatedRule);
    this.updateStats();
    this.saveData();
    this.addActivity('update', updatedRule);

    log.info('更新规则', { id, name: updatedRule.name }, 'RuleManager');
    return updatedRule;
  }

  /**
   * 删除规则
   */
  public deleteRule(id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule) {
      return false;
    }

    this.rules.delete(id);
    this.updateStats();
    this.saveData();
    this.addActivity('delete', rule);

    log.info('删除规则', { id, name: rule.name }, 'RuleManager');
    return true;
  }

  /**
   * 获取规则
   */
  public getRule(id: string): RoutingRule | null {
    return this.rules.get(id) || null;
  }

  /**
   * 获取所有规则
   */
  public getAllRules(): RoutingRule[] {
    return Array.from(this.rules.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * 获取启用的规则
   */
  public getEnabledRules(): RoutingRule[] {
    return this.getAllRules().filter(rule => rule.enabled);
  }

  /**
   * 根据类型获取规则
   */
  public getRulesByType(type: RuleType): RoutingRule[] {
    return this.getAllRules().filter(rule => rule.type === type);
  }

  /**
   * 根据动作获取规则
   */
  public getRulesByAction(action: RuleAction): RoutingRule[] {
    return this.getAllRules().filter(rule => rule.action === action);
  }

  /**
   * 根据来源获取规则
   */
  public getRulesBySource(source: RuleSource): RoutingRule[] {
    return this.getAllRules().filter(rule => rule.source === source);
  }

  /**
   * 启用规则
   */
  public enableRule(id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule) {
      return false;
    }

    rule.enabled = true;
    rule.updatedAt = new Date();
    this.updateStats();
    this.saveData();
    this.addActivity('enable', rule);

    log.info('启用规则', { id, name: rule.name }, 'RuleManager');
    return true;
  }

  /**
   * 禁用规则
   */
  public disableRule(id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule) {
      return false;
    }

    rule.enabled = false;
    rule.updatedAt = new Date();
    this.updateStats();
    this.saveData();
    this.addActivity('disable', rule);

    log.info('禁用规则', { id, name: rule.name }, 'RuleManager');
    return true;
  }

  /**
   * 批量操作规则
   */
  public batchUpdateRules(ids: string[], updates: Partial<RoutingRule>): number {
    let count = 0;
    for (const id of ids) {
      if (this.updateRule(id, updates)) {
        count++;
      }
    }
    return count;
  }

  /**
   * 批量删除规则
   */
  public batchDeleteRules(ids: string[]): number {
    let count = 0;
    for (const id of ids) {
      if (this.deleteRule(id)) {
        count++;
      }
    }
    return count;
  }

  /**
   * 检测规则冲突
   */
  public detectConflicts(): RuleConflictResult {
    const conflicts: RuleConflictResult['conflicts'] = [];
    const suggestions: string[] = [];
    const rules = this.getAllRules();

    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const rule1 = rules[i];
        const rule2 = rules[j];

        // 检测重复规则
        if (this.isDuplicateRule(rule1, rule2)) {
          conflicts.push({
            rule1,
            rule2,
            type: 'duplicate',
            description: '发现重复的规则',
            severity: 'medium'
          });
          suggestions.push(`删除重复规则: ${rule2.name}`);
        }

        // 检测重叠规则
        if (this.isOverlappingRule(rule1, rule2)) {
          conflicts.push({
            rule1,
            rule2,
            type: 'overlap',
            description: '发现重叠的规则',
            severity: 'low'
          });
          suggestions.push(`检查规则优先级: ${rule1.name} vs ${rule2.name}`);
        }

        // 检测矛盾规则
        if (this.isContradictoryRule(rule1, rule2)) {
          conflicts.push({
            rule1,
            rule2,
            type: 'contradictory',
            description: '发现矛盾的规则',
            severity: 'high'
          });
          suggestions.push(`解决规则矛盾: ${rule1.name} vs ${rule2.name}`);
        }
      }
    }

    return { conflicts, suggestions };
  }

  /**
   * 检查是否为重复规则
   */
  private isDuplicateRule(rule1: RoutingRule, rule2: RoutingRule): boolean {
    return rule1.type === rule2.type &&
           rule1.value === rule2.value &&
           rule1.action === rule2.action;
  }

  /**
   * 检查是否为重叠规则
   */
  private isOverlappingRule(rule1: RoutingRule, rule2: RoutingRule): boolean {
    // 这里可以实现更复杂的重叠检测逻辑
    return rule1.type === rule2.type && rule1.value === rule2.value;
  }

  /**
   * 检查是否为矛盾规则
   */
  private isContradictoryRule(rule1: RoutingRule, rule2: RoutingRule): boolean {
    return rule1.type === rule2.type &&
           rule1.value === rule2.value &&
           rule1.action !== rule2.action;
  }

  /**
   * 匹配规则
   */
  public matchRule(domain?: string, ip?: string, port?: number, protocol?: string): RuleMatchResult {
    const rules = this.getEnabledRules();
    
    for (const rule of rules) {
      if (this.matchesRule(rule, domain, ip, port, protocol)) {
        return {
          matched: true,
          rule,
          action: rule.action,
          target: rule.target
        };
      }
    }

    return {
      matched: false,
      action: RuleAction.DIRECT
    };
  }

  /**
   * 检查是否匹配规则
   */
  private matchesRule(rule: RoutingRule, domain?: string, ip?: string, port?: number, protocol?: string): boolean {
    switch (rule.type) {
      case RuleType.DOMAIN:
        return domain === rule.value;
      case RuleType.DOMAIN_SUFFIX:
        return domain?.endsWith(rule.value as string) || false;
      case RuleType.DOMAIN_KEYWORD:
        return domain?.includes(rule.value as string) || false;
      case RuleType.IP_CIDR:
        return this.isIpInCidr(ip, rule.value as string);
      case RuleType.PROTOCOL:
        return protocol === rule.value;
      case RuleType.MATCH:
        return true;
      default:
        return false;
    }
  }

  /**
   * 检查IP是否在CIDR范围内
   */
  private isIpInCidr(ip?: string, cidr?: string): boolean {
    if (!ip || !cidr) return false;
    
    try {
      const [cidrIp, prefix] = cidr.split('/');
      const prefixNum = parseInt(prefix);
      
      // 简单的CIDR检查实现
      const ipParts = ip.split('.').map(Number);
      const cidrParts = cidrIp.split('.').map(Number);
      
      const mask = (0xFFFFFFFF << (32 - prefixNum)) >>> 0;
      const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
      const cidrNum = (cidrParts[0] << 24) + (cidrParts[1] << 16) + (cidrParts[2] << 8) + cidrParts[3];
      
      return (ipNum & mask) === (cidrNum & mask);
    } catch (error) {
      return false;
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    if (!this.config.enableRuleStats) return;

    const rules = this.getAllRules();
    const enabledRules = rules.filter(rule => rule.enabled);
    const disabledRules = rules.filter(rule => !rule.enabled);

    this.stats = {
      totalRules: rules.length,
      enabledRules: enabledRules.length,
      disabledRules: disabledRules.length,
      rulesByType: this.countByProperty(rules, 'type'),
      rulesByAction: this.countByProperty(rules, 'action'),
      rulesBySource: this.countByProperty(rules, 'source'),
      topMatchedRules: this.stats.topMatchedRules,
      recentActivity: this.stats.recentActivity
    };
  }

  /**
   * 按属性统计
   */
  private countByProperty<T extends keyof RoutingRule>(rules: RoutingRule[], property: T): Record<any, number> {
    const counts: Record<any, number> = {};
    rules.forEach(rule => {
      const value = rule[property];
      counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
  }

  /**
   * 添加活动记录
   */
  private addActivity(action: 'create' | 'update' | 'delete' | 'enable' | 'disable', rule: RoutingRule): void {
    if (!this.config.enableRuleStats) return;

    this.stats.recentActivity.unshift({
      action,
      rule,
      timestamp: new Date()
    });

    // 保持最近100条记录
    if (this.stats.recentActivity.length > 100) {
      this.stats.recentActivity = this.stats.recentActivity.slice(0, 100);
    }
  }

  /**
   * 获取统计信息
   */
  public getStats(): RuleStats {
    return this.stats;
  }

  /**
   * 导入规则
   */
  public importRules(rules: Omit<RoutingRule, 'id' | 'createdAt' | 'updatedAt'>[]): number {
    let count = 0;
    for (const rule of rules) {
      try {
        this.addRule(rule);
        count++;
      } catch (error) {
        log.warn('导入规则失败', { rule, error }, 'RuleManager');
      }
    }
    return count;
  }

  /**
   * 导出规则
   */
  public exportRules(ids?: string[]): RoutingRule[] {
    if (ids) {
      return ids.map(id => this.rules.get(id)).filter(Boolean) as RoutingRule[];
    }
    return this.getAllRules();
  }

  /**
   * 清空所有规则
   */
  public clearAllRules(): void {
    this.rules.clear();
    this.updateStats();
    this.saveData();
    log.info('清空所有规则', null, 'RuleManager');
  }

  /**
   * 开始自动备份
   */
  private startAutoBackup(): void {
    if (!this.config.autoBackup) return;

    this.backupTimer = setInterval(() => {
      this.saveData();
      log.debug('自动备份规则数据', null, 'RuleManager');
    }, this.config.backupInterval);
  }

  /**
   * 停止自动备份
   */
  private stopAutoBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = undefined;
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    this.stopAutoBackup();
    this.saveData();
    this.rules.clear();
    this.groups.clear();
    this.templates.clear();
    
    log.info('规则管理器已销毁', null, 'RuleManager');
  }
}

export const ruleManager = RuleManager.getInstance();
