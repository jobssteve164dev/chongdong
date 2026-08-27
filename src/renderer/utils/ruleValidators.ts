import { RoutingRule, RuleType } from '../../shared/types';
import { RuleValidator, ValidationResult } from './ruleParser';

/**
 * 规则格式验证器
 * 验证规则的基本格式是否正确
 */
export class RuleFormatValidator implements RuleValidator {
  validate(rules: RoutingRule[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
      // 验证必需字段
      if (!rule.id) {
        errors.push(`规则缺少ID: ${rule.name || '未知规则'}`);
      }

      if (!rule.name) {
        errors.push(`规则缺少名称: ${rule.id}`);
      }

      if (!rule.type) {
        errors.push(`规则缺少类型: ${rule.name || rule.id}`);
      }

      if (!rule.value) {
        errors.push(`规则缺少值: ${rule.name || rule.id}`);
      }

      if (!rule.action) {
        errors.push(`规则缺少动作: ${rule.name || rule.id}`);
      }

      // 验证值格式
      if (rule.value) {
        const valueValidation = this.validateRuleValue(rule);
        errors.push(...valueValidation.errors);
        warnings.push(...valueValidation.warnings);
      }

      // 验证优先级
      if (rule.priority !== undefined) {
        if (rule.priority < 1 || rule.priority > 1000) {
          warnings.push(`规则优先级超出建议范围 (1-1000): ${rule.name || rule.id}`);
        }
      }
    }

    return { errors, warnings };
  }

  private validateRuleValue(rule: RoutingRule): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (Array.isArray(rule.value)) {
      // 验证数组值
      if (rule.value.length === 0) {
        errors.push(`规则值不能为空数组: ${rule.name || rule.id}`);
      }

      for (const value of rule.value) {
        const singleValueValidation = this.validateSingleValue(value, rule.type, rule.name || rule.id);
        errors.push(...singleValueValidation.errors);
        warnings.push(...singleValueValidation.warnings);
      }
    } else {
      // 验证单个值
      const singleValueValidation = this.validateSingleValue(rule.value, rule.type, rule.name || rule.id);
      errors.push(...singleValueValidation.errors);
      warnings.push(...singleValueValidation.warnings);
    }

    return { errors, warnings };
  }

  private validateSingleValue(value: string, type: RuleType, ruleName: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!value || value.trim() === '') {
      errors.push(`规则值不能为空: ${ruleName}`);
      return { errors, warnings };
    }

    switch (type) {
      case RuleType.DOMAIN:
      case RuleType.DOMAIN_SUFFIX:
        if (!this.isValidDomain(value)) {
          errors.push(`无效的域名格式: ${value} (规则: ${ruleName})`);
        }
        break;

      case RuleType.DOMAIN_KEYWORD:
        if (value.length < 2) {
          warnings.push(`域名关键词过短: ${value} (规则: ${ruleName})`);
        }
        break;

      case RuleType.DOMAIN_REGEX:
        if (!this.isValidRegex(value)) {
          errors.push(`无效的正则表达式: ${value} (规则: ${ruleName})`);
        }
        break;

      case RuleType.IP_CIDR:
        if (!this.isValidIPCIDR(value)) {
          errors.push(`无效的IP CIDR格式: ${value} (规则: ${ruleName})`);
        }
        break;

      case RuleType.IP_CIDR6:
        if (!this.isValidIPv6CIDR(value)) {
          errors.push(`无效的IPv6 CIDR格式: ${value} (规则: ${ruleName})`);
        }
        break;

      case RuleType.GEOIP:
        if (!this.isValidGeoIP(value)) {
          warnings.push(`可能无效的地理位置代码: ${value} (规则: ${ruleName})`);
        }
        break;

      case RuleType.PROCESS:
      case RuleType.PROCESS_PATH:
        if (value.length === 0) {
          errors.push(`进程名称不能为空: ${ruleName}`);
        }
        break;

      case RuleType.PROTOCOL:
        if (!this.isValidProtocol(value)) {
          errors.push(`无效的协议: ${value} (规则: ${ruleName})`);
        }
        break;
    }

    return { errors, warnings };
  }

  private isValidDomain(domain: string): boolean {
    // 简单的域名验证
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  }

  private isValidRegex(regex: string): boolean {
    try {
      new RegExp(regex);
      return true;
    } catch {
      return false;
    }
  }

  private isValidIPCIDR(cidr: string): boolean {
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!cidrRegex.test(cidr)) return false;

    const [ip, prefix] = cidr.split('/');
    const prefixNum = parseInt(prefix);
    if (prefixNum < 0 || prefixNum > 32) return false;

    const ipParts = ip.split('.').map(Number);
    return ipParts.every(part => part >= 0 && part <= 255);
  }

  private isValidIPv6CIDR(cidr: string): boolean {
    const cidrRegex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\/\d{1,3}$/;
    if (!cidrRegex.test(cidr)) return false;

    const [, prefix] = cidr.split('/');
    const prefixNum = parseInt(prefix);
    return prefixNum >= 0 && prefixNum <= 128;
  }

  private isValidGeoIP(code: string): boolean {
    // 简单的GeoIP代码验证（ISO 3166-1 alpha-2）
    const geoIPRegex = /^[A-Z]{2}$/;
    return geoIPRegex.test(code);
  }

  private isValidProtocol(protocol: string): boolean {
    const validProtocols = ['http', 'https', 'tcp', 'udp', 'icmp', 'tls', 'quic'];
    return validProtocols.includes(protocol.toLowerCase());
  }
}

/**
 * 规则逻辑验证器
 * 验证规则的逻辑正确性
 */
export class RuleLogicValidator implements RuleValidator {
  validate(rules: RoutingRule[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查是否有MATCH规则
    const matchRules = rules.filter(r => r.type === RuleType.MATCH);
    if (matchRules.length > 1) {
      warnings.push('发现多个MATCH规则，可能导致冲突');
    }

    // 检查规则顺序
    const orderedRules = [...rules].sort((a, b) => a.priority - b.priority);
    const matchRuleIndex = orderedRules.findIndex(r => r.type === RuleType.MATCH);
    if (matchRuleIndex !== -1 && matchRuleIndex !== orderedRules.length - 1) {
      warnings.push('MATCH规则应该在最后，当前位置可能导致其他规则失效');
    }

    // 检查重复规则
    const duplicates = this.findDuplicateRules(rules);
    if (duplicates.length > 0) {
      warnings.push(`发现 ${duplicates.length} 个重复规则`);
    }

    // 检查冲突规则
    const conflicts = this.findConflictingRules(rules);
    if (conflicts.length > 0) {
      warnings.push(`发现 ${conflicts.length} 个潜在冲突规则`);
    }

    return { errors, warnings };
  }

  private findDuplicateRules(rules: RoutingRule[]): RoutingRule[] {
    const seen = new Set<string>();
    const duplicates: RoutingRule[] = [];

    for (const rule of rules) {
      const key = `${rule.type}:${rule.value}:${rule.action}`;
      if (seen.has(key)) {
        duplicates.push(rule);
      } else {
        seen.add(key);
      }
    }

    return duplicates;
  }

  private findConflictingRules(rules: RoutingRule[]): RoutingRule[] {
    const conflicts: RoutingRule[] = [];

    // 检查域名和域名后缀的冲突
    const domainRules = rules.filter(r => r.type === RuleType.DOMAIN);
    const suffixRules = rules.filter(r => r.type === RuleType.DOMAIN_SUFFIX);

    for (const domainRule of domainRules) {
      const domain = domainRule.value as string;
      for (const suffixRule of suffixRules) {
        const suffix = suffixRule.value as string;
        if (domain.endsWith(suffix) && domain !== suffix) {
          if (domainRule.action !== suffixRule.action) {
            conflicts.push(domainRule, suffixRule);
          }
        }
      }
    }

    return conflicts;
  }
}

/**
 * 规则优先级验证器
 * 验证规则优先级的合理性
 */
export class RulePriorityValidator implements RuleValidator {
  validate(rules: RoutingRule[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查优先级范围
    for (const rule of rules) {
      if (rule.priority < 1) {
        errors.push(`规则优先级不能小于1: ${rule.name || rule.id}`);
      }
      if (rule.priority > 1000) {
        warnings.push(`规则优先级过高: ${rule.name || rule.id}`);
      }
    }

    // 检查优先级冲突
    const priorityGroups = new Map<number, RoutingRule[]>();
    for (const rule of rules) {
      if (!priorityGroups.has(rule.priority)) {
        priorityGroups.set(rule.priority, []);
      }
      priorityGroups.get(rule.priority)!.push(rule);
    }

    for (const [priority, groupRules] of priorityGroups) {
      if (groupRules.length > 1) {
        warnings.push(`发现 ${groupRules.length} 个规则具有相同优先级 ${priority}`);
      }
    }

    // 检查优先级顺序
    const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);
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

    for (let i = 0; i < sortedRules.length - 1; i++) {
      const current = sortedRules[i];
      const next = sortedRules[i + 1];
      
      if (current.priority === next.priority) {
        const currentOrder = typeOrder[current.type] || 0;
        const nextOrder = typeOrder[next.type] || 0;
        
        if (currentOrder > nextOrder) {
          warnings.push(`规则类型顺序可能不合理: ${current.name} (${current.type}) 在 ${next.name} (${next.type}) 之前`);
        }
      }
    }

    return { errors, warnings };
  }
}
