import { RoutingRule, RuleType, RuleAction } from '../../shared/types';
import { RuleOptimizer, RuleOptimizationOptions, OptimizationResult, RuleOptimization } from './ruleParser';
import { log } from './logger';

/**
 * 域名规则优化器
 * 参考ClashX等项目的域名规则优化逻辑
 */
export class DomainRuleOptimizer implements RuleOptimizer {
  optimize(rules: RoutingRule[], options: RuleOptimizationOptions): OptimizationResult {
    if (!options.optimizeDomainRules) {
      return { rules, optimizations: [] };
    }

    const optimizations: RuleOptimization[] = [];
    let optimizedRules = [...rules];

    // 1. 合并域名后缀规则
    const suffixOptimization = this.optimizeDomainSuffixes(optimizedRules);
    if (suffixOptimization) {
      optimizations.push(suffixOptimization);
      optimizedRules = suffixOptimization.after;
    }

    // 2. 合并域名关键词规则
    const keywordOptimization = this.optimizeDomainKeywords(optimizedRules);
    if (keywordOptimization) {
      optimizations.push(keywordOptimization);
      optimizedRules = keywordOptimization.after;
    }

    // 3. 简化域名规则
    const simplifyOptimization = this.simplifyDomainRules(optimizedRules);
    if (simplifyOptimization) {
      optimizations.push(simplifyOptimization);
      optimizedRules = simplifyOptimization.after;
    }

    return { rules: optimizedRules, optimizations };
  }

  private optimizeDomainSuffixes(rules: RoutingRule[]): RuleOptimization | null {
    const suffixRules = rules.filter(r => r.type === RuleType.DOMAIN_SUFFIX);
    if (suffixRules.length < 2) return null;

    const suffixGroups = new Map<string, RoutingRule[]>();
    
    // 按动作分组
    for (const rule of suffixRules) {
      const key = `${rule.action}`;
      if (!suffixGroups.has(key)) {
        suffixGroups.set(key, []);
      }
      suffixGroups.get(key)!.push(rule);
    }

    const optimizations: RuleOptimization[] = [];
    const newRules: RoutingRule[] = [];

    for (const [action, groupRules] of suffixGroups) {
      if (groupRules.length > 1) {
        const mergedSuffixes = this.mergeSuffixes(groupRules.map(r => r.value as string));
        if (mergedSuffixes.length < groupRules.length) {
          const mergedRule = this.createMergedRule(groupRules, mergedSuffixes);
          newRules.push(mergedRule);
          
          optimizations.push({
            type: 'merge',
            description: `合并 ${groupRules.length} 个域名后缀规则为 ${mergedSuffixes.length} 个`,
            before: groupRules,
            after: [mergedRule],
            impact: 'positive'
          });
        } else {
          newRules.push(...groupRules);
        }
      } else {
        newRules.push(...groupRules);
      }
    }

    if (optimizations.length > 0) {
      const otherRules = rules.filter(r => r.type !== RuleType.DOMAIN_SUFFIX);
      return {
        type: 'merge',
        description: `域名后缀规则优化完成`,
        before: rules,
        after: [...otherRules, ...newRules],
        impact: 'positive'
      };
    }

    return null;
  }

  private optimizeDomainKeywords(rules: RoutingRule[]): RuleOptimization | null {
    const keywordRules = rules.filter(r => r.type === RuleType.DOMAIN_KEYWORD);
    if (keywordRules.length < 2) return null;

    const keywordGroups = new Map<string, RoutingRule[]>();
    
    // 按动作分组
    for (const rule of keywordRules) {
      const key = `${rule.action}`;
      if (!keywordGroups.has(key)) {
        keywordGroups.set(key, []);
      }
      keywordGroups.get(key)!.push(rule);
    }

    const optimizations: RuleOptimization[] = [];
    const newRules: RoutingRule[] = [];

    for (const [action, groupRules] of keywordGroups) {
      if (groupRules.length > 1) {
        const mergedKeywords = this.mergeKeywords(groupRules.map(r => r.value as string));
        if (mergedKeywords.length < groupRules.length) {
          const mergedRule = this.createMergedRule(groupRules, mergedKeywords);
          newRules.push(mergedRule);
          
          optimizations.push({
            type: 'merge',
            description: `合并 ${groupRules.length} 个域名关键词规则为 ${mergedKeywords.length} 个`,
            before: groupRules,
            after: [mergedRule],
            impact: 'positive'
          });
        } else {
          newRules.push(...groupRules);
        }
      } else {
        newRules.push(...groupRules);
      }
    }

    if (optimizations.length > 0) {
      const otherRules = rules.filter(r => r.type !== RuleType.DOMAIN_KEYWORD);
      return {
        type: 'merge',
        description: `域名关键词规则优化完成`,
        before: rules,
        after: [...otherRules, ...newRules],
        impact: 'positive'
      };
    }

    return null;
  }

  private simplifyDomainRules(rules: RoutingRule[]): RuleOptimization | null {
    const domainRules = rules.filter(r => r.type === RuleType.DOMAIN);
    if (domainRules.length < 2) return null;

    const simplifiedRules: RoutingRule[] = [];
    const removedRules: RoutingRule[] = [];

    // 检查是否有可以被后缀规则覆盖的域名规则
    const suffixRules = rules.filter(r => r.type === RuleType.DOMAIN_SUFFIX);
    const suffixValues = suffixRules.map(r => r.value as string);

    for (const domainRule of domainRules) {
      const domain = domainRule.value as string;
      const canBeSimplified = suffixValues.some(suffix => 
        domain.endsWith(suffix) && domain !== suffix
      );

      if (canBeSimplified) {
        removedRules.push(domainRule);
      } else {
        simplifiedRules.push(domainRule);
      }
    }

    if (removedRules.length > 0) {
      const otherRules = rules.filter(r => r.type !== RuleType.DOMAIN);
      return {
        type: 'remove',
        description: `移除 ${removedRules.length} 个可被后缀规则覆盖的域名规则`,
        before: rules,
        after: [...otherRules, ...simplifiedRules],
        impact: 'positive'
      };
    }

    return null;
  }

  private mergeSuffixes(suffixes: string[]): string[] {
    const sortedSuffixes = [...suffixes].sort((a, b) => b.length - a.length);
    const merged: string[] = [];

    for (const suffix of sortedSuffixes) {
      const isContained = merged.some(existing => 
        suffix.endsWith(existing) && suffix !== existing
      );
      
      if (!isContained) {
        merged.push(suffix);
      }
    }

    return merged;
  }

  private mergeKeywords(keywords: string[]): string[] {
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
    const merged: string[] = [];

    for (const keyword of sortedKeywords) {
      const isContained = merged.some(existing => 
        existing.includes(keyword) && existing !== keyword
      );
      
      if (!isContained) {
        merged.push(keyword);
      }
    }

    return merged;
  }

  private createMergedRule(rules: RoutingRule[], values: string[]): RoutingRule {
    const firstRule = rules[0];
    return {
      ...firstRule,
      id: this.generateId(),
      name: `${this.getRuleTypeLabel(firstRule.type)}规则组`,
      value: values,
      description: `智能合并规则 (${rules.length} 条规则合并)`,
      tags: [...(firstRule.tags || []), 'optimized']
    };
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

  private generateId(): string {
    return `optimized_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * IP规则优化器
 * 优化IP段规则
 */
export class IPRuleOptimizer implements RuleOptimizer {
  optimize(rules: RoutingRule[], options: RuleOptimizationOptions): OptimizationResult {
    if (!options.optimizeIPRules) {
      return { rules, optimizations: [] };
    }

    const optimizations: RuleOptimization[] = [];
    let optimizedRules = [...rules];

    // 合并IP段规则
    const ipOptimization = this.optimizeIPRanges(optimizedRules);
    if (ipOptimization) {
      optimizations.push(ipOptimization);
      optimizedRules = ipOptimization.after;
    }

    return { rules: optimizedRules, optimizations };
  }

  private optimizeIPRanges(rules: RoutingRule[]): RuleOptimization | null {
    const ipRules = rules.filter(r => r.type === RuleType.IP_CIDR || r.type === RuleType.IP_CIDR6);
    if (ipRules.length < 2) return null;

    // 这里可以实现IP段合并逻辑
    // 由于IP段合并比较复杂，暂时返回null
    return null;
  }
}

/**
 * 冗余规则优化器
 * 移除重复和冗余的规则
 */
export class RedundancyOptimizer implements RuleOptimizer {
  optimize(rules: RoutingRule[], options: RuleOptimizationOptions): OptimizationResult {
    if (!options.removeRedundantRules) {
      return { rules, optimizations: [] };
    }

    const optimizations: RuleOptimization[] = [];
    let optimizedRules = [...rules];

    // 移除重复规则
    const duplicateOptimization = this.removeDuplicateRules(optimizedRules);
    if (duplicateOptimization) {
      optimizations.push(duplicateOptimization);
      optimizedRules = duplicateOptimization.after;
    }

    // 移除冗余规则
    const redundantOptimization = this.removeRedundantRules(optimizedRules);
    if (redundantOptimization) {
      optimizations.push(redundantOptimization);
      optimizedRules = redundantOptimization.after;
    }

    return { rules: optimizedRules, optimizations };
  }

  private removeDuplicateRules(rules: RoutingRule[]): RuleOptimization | null {
    const seen = new Set<string>();
    const uniqueRules: RoutingRule[] = [];
    const duplicates: RoutingRule[] = [];

    for (const rule of rules) {
      const key = `${rule.type}:${rule.value}:${rule.action}`;
      if (seen.has(key)) {
        duplicates.push(rule);
      } else {
        seen.add(key);
        uniqueRules.push(rule);
      }
    }

    if (duplicates.length > 0) {
      return {
        type: 'remove',
        description: `移除 ${duplicates.length} 个重复规则`,
        before: rules,
        after: uniqueRules,
        impact: 'positive'
      };
    }

    return null;
  }

  private removeRedundantRules(rules: RoutingRule[]): RuleOptimization | null {
    // 实现冗余规则检测逻辑
    // 例如：如果有更具体的规则，可以移除更通用的规则
    return null;
  }
}

/**
 * 优先级优化器
 * 优化规则优先级
 */
export class PriorityOptimizer implements RuleOptimizer {
  optimize(rules: RoutingRule[], options: RuleOptimizationOptions): OptimizationResult {
    const optimizations: RuleOptimization[] = [];
    let optimizedRules = [...rules];

    // 重新排序规则
    if (!options.preserveOrder) {
      const reorderOptimization = this.reorderRules(optimizedRules);
      if (reorderOptimization) {
        optimizations.push(reorderOptimization);
        optimizedRules = reorderOptimization.after;
      }
    }

    return { rules: optimizedRules, optimizations };
  }

  private reorderRules(rules: RoutingRule[]): RuleOptimization | null {
    // 按优先级和类型重新排序规则
    const reorderedRules = [...rules].sort((a, b) => {
      // 首先按优先级排序
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // 然后按类型排序
      const typeOrder = {
        [RuleType.MATCH]: 0,
        [RuleType.SCRIPT]: 1,
        [RuleType.PROCESS]: 2,
        [RuleType.PROCESS_PATH]: 3,
        [RuleType.PROTOCOL]: 4,
        [RuleType.GEOIP]: 5,
        [RuleType.IP_CIDR]: 6,
        [RuleType.IP_CIDR6]: 7,
        [RuleType.DOMAIN_REGEX]: 8,
        [RuleType.DOMAIN_KEYWORD]: 9,
        [RuleType.DOMAIN_SUFFIX]: 10,
        [RuleType.DOMAIN]: 11
      };
      
      return (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0);
    });

    return {
      type: 'reorder',
      description: '按优先级和类型重新排序规则',
      before: rules,
      after: reorderedRules,
      impact: 'neutral'
    };
  }
}
