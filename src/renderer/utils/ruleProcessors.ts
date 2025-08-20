import { RoutingRule, RuleType, RuleAction, RuleSource } from '../../shared/types';
import { RuleProcessor, RuleParseContext } from './ruleParser';
import { log } from './logger';
import { parse as parseYaml } from 'yaml';

/**
 * Clash规则处理器
 * 参考Clash项目的规则解析逻辑
 */
export class ClashRuleProcessor implements RuleProcessor {
  async parse(content: string, context: RuleParseContext): Promise<RoutingRule[]> {
    try {
      let config: any;
      
      // 尝试解析YAML或JSON
      try {
        config = parseYaml(content);
      } catch (e) {
        try {
          config = JSON.parse(content);
        } catch (e2) {
          throw new Error('Clash配置格式无效');
        }
      }

      const rules: RoutingRule[] = [];

      // 解析rules数组
      if (config.rules && Array.isArray(config.rules)) {
        for (const ruleString of config.rules) {
          const rule = this.parseClashRule(ruleString, context);
          if (rule) {
            rules.push(rule);
          }
        }
      }

      log.info('Clash规则解析完成', { 
        source: context.source, 
        ruleCount: rules.length 
      }, 'ClashRuleProcessor');

      return rules;
    } catch (error) {
      log.error('Clash规则解析失败', error, 'ClashRuleProcessor');
      throw error;
    }
  }

  private parseClashRule(ruleString: string, context: RuleParseContext): RoutingRule | null {
    try {
      const parts = ruleString.split(',');
      if (parts.length < 2) return null;

      const [type, value, action] = parts;
      const ruleType = this.convertClashType(type);
      const ruleAction = this.convertClashAction(action);

      if (!ruleType || !ruleAction) return null;

      return {
        id: this.generateId(),
        name: `${type}:${value}`,
        type: ruleType,
        value: value,
        action: ruleAction,
        priority: context.priority || 100,
        source: RuleSource.SUBSCRIPTION,
        enabled: true,
        description: `从Clash配置导入的规则`,
        tags: [...(context.tags || []), 'clash'],
        createdAt: new Date(),
        updatedAt: new Date(),
        clashRule: ruleString
      };
    } catch (error) {
      log.warn('解析Clash规则失败', { ruleString, error }, 'ClashRuleProcessor');
      return null;
    }
  }

  private convertClashType(clashType: string): RuleType | null {
    const typeMap: Record<string, RuleType> = {
      'DOMAIN': RuleType.DOMAIN,
      'DOMAIN-SUFFIX': RuleType.DOMAIN_SUFFIX,
      'DOMAIN-KEYWORD': RuleType.DOMAIN_KEYWORD,
      'DOMAIN-REGEX': RuleType.DOMAIN_REGEX,
      'IP-CIDR': RuleType.IP_CIDR,
      'IP-CIDR6': RuleType.IP_CIDR6,
      'GEOIP': RuleType.GEOIP,
      'PROCESS': RuleType.PROCESS,
      'PROCESS-PATH': RuleType.PROCESS_PATH,
      'PROTOCOL': RuleType.PROTOCOL,
      'SCRIPT': RuleType.SCRIPT,
      'MATCH': RuleType.MATCH
    };
    return typeMap[clashType] || null;
  }

  private convertClashAction(clashAction: string): RuleAction | null {
    const actionMap: Record<string, RuleAction> = {
      'Proxy': RuleAction.PROXY,
      'proxy': RuleAction.PROXY,
      'Direct': RuleAction.DIRECT,
      'direct': RuleAction.DIRECT,
      'Reject': RuleAction.BLOCK,
      'reject': RuleAction.BLOCK,
      'Chain': RuleAction.CHAIN,
      'chain': RuleAction.CHAIN
    };
    return actionMap[clashAction] || RuleAction.DIRECT;
  }

  private generateId(): string {
    return `clash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Sing-box规则处理器
 * 参考Sing-box项目的规则解析逻辑
 */
export class SingboxRuleProcessor implements RuleProcessor {
  async parse(content: string, context: RuleParseContext): Promise<RoutingRule[]> {
    try {
      const config = JSON.parse(content);
      const rules: RoutingRule[] = [];

      // 解析route.rules
      if (config.route?.rules && Array.isArray(config.route.rules)) {
        for (const ruleObj of config.route.rules) {
          const rule = this.parseSingboxRule(ruleObj, context);
          if (rule) {
            rules.push(rule);
          }
        }
      }

      log.info('Sing-box规则解析完成', { 
        source: context.source, 
        ruleCount: rules.length 
      }, 'SingboxRuleProcessor');

      return rules;
    } catch (error) {
      log.error('Sing-box规则解析失败', error, 'SingboxRuleProcessor');
      throw error;
    }
  }

  private parseSingboxRule(ruleObj: any, context: RuleParseContext): RoutingRule | null {
    try {
      const ruleType = this.convertSingboxType(ruleObj);
      const ruleAction = this.convertSingboxAction(ruleObj.outbound);

      if (!ruleType || !ruleAction) return null;

      return {
        id: this.generateId(),
        name: ruleObj.domain || ruleObj.ip || 'Sing-box规则',
        type: ruleType,
        value: ruleObj.domain || ruleObj.ip || '',
        action: ruleAction,
        priority: context.priority || 100,
        source: RuleSource.SUBSCRIPTION,
        enabled: true,
        description: `从Sing-box配置导入的规则`,
        tags: [...(context.tags || []), 'singbox'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      log.warn('解析Sing-box规则失败', { ruleObj, error }, 'SingboxRuleProcessor');
      return null;
    }
  }

  private convertSingboxType(ruleObj: any): RuleType | null {
    if (ruleObj.domain) {
      if (Array.isArray(ruleObj.domain)) {
        return RuleType.DOMAIN;
      } else if (ruleObj.domain.startsWith('regexp:')) {
        return RuleType.DOMAIN_REGEX;
      } else if (ruleObj.domain.startsWith('keyword:')) {
        return RuleType.DOMAIN_KEYWORD;
      } else if (ruleObj.domain.startsWith('suffix:')) {
        return RuleType.DOMAIN_SUFFIX;
      }
    }
    if (ruleObj.ip) {
      return RuleType.IP_CIDR;
    }
    if (ruleObj.protocol) {
      return RuleType.PROTOCOL;
    }
    return null;
  }

  private convertSingboxAction(outbound: string): RuleAction | null {
    const actionMap: Record<string, RuleAction> = {
      'proxy': RuleAction.PROXY,
      'direct': RuleAction.DIRECT,
      'block': RuleAction.BLOCK,
      'dns-out': RuleAction.DIRECT
    };
    return actionMap[outbound] || RuleAction.DIRECT;
  }

  private generateId(): string {
    return `singbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * V2Ray规则处理器
 * 参考V2Ray项目的规则解析逻辑
 */
export class V2RayRuleProcessor implements RuleProcessor {
  async parse(content: string, context: RuleParseContext): Promise<RoutingRule[]> {
    try {
      const config = JSON.parse(content);
      const rules: RoutingRule[] = [];

      // V2Ray的规则通常在routing.rules中
      if (config.routing?.rules && Array.isArray(config.routing.rules)) {
        for (const ruleObj of config.routing.rules) {
          const rule = this.parseV2RayRule(ruleObj, context);
          if (rule) {
            rules.push(rule);
          }
        }
      }

      log.info('V2Ray规则解析完成', { 
        source: context.source, 
        ruleCount: rules.length 
      }, 'V2RayRuleProcessor');

      return rules;
    } catch (error) {
      log.error('V2Ray规则解析失败', error, 'V2RayRuleProcessor');
      throw error;
    }
  }

  private parseV2RayRule(ruleObj: any, context: RuleParseContext): RoutingRule | null {
    try {
      const ruleType = this.convertV2RayType(ruleObj);
      const ruleAction = this.convertV2RayAction(ruleObj.outboundTag);

      if (!ruleType || !ruleAction) return null;

      return {
        id: this.generateId(),
        name: ruleObj.tag || 'V2Ray规则',
        type: ruleType,
        value: ruleObj.domain || ruleObj.ip || '',
        action: ruleAction,
        priority: context.priority || 100,
        source: RuleSource.SUBSCRIPTION,
        enabled: true,
        description: `从V2Ray配置导入的规则`,
        tags: [...(context.tags || []), 'v2ray'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      log.warn('解析V2Ray规则失败', { ruleObj, error }, 'V2RayRuleProcessor');
      return null;
    }
  }

  private convertV2RayType(ruleObj: any): RuleType | null {
    if (ruleObj.domain) {
      return RuleType.DOMAIN;
    }
    if (ruleObj.ip) {
      return RuleType.IP_CIDR;
    }
    if (ruleObj.protocol) {
      return RuleType.PROTOCOL;
    }
    return null;
  }

  private convertV2RayAction(outboundTag: string): RuleAction | null {
    const actionMap: Record<string, RuleAction> = {
      'proxy': RuleAction.PROXY,
      'direct': RuleAction.DIRECT,
      'block': RuleAction.BLOCK
    };
    return actionMap[outboundTag] || RuleAction.DIRECT;
  }

  private generateId(): string {
    return `v2ray_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 自定义规则处理器
 * 用于处理自定义格式的规则
 */
export class CustomRuleProcessor implements RuleProcessor {
  async parse(content: string, context: RuleParseContext): Promise<RoutingRule[]> {
    try {
      const lines = content.split('\n').filter(line => line.trim());
      const rules: RoutingRule[] = [];

      for (const line of lines) {
        const rule = this.parseCustomRule(line, context);
        if (rule) {
          rules.push(rule);
        }
      }

      log.info('自定义规则解析完成', { 
        source: context.source, 
        ruleCount: rules.length 
      }, 'CustomRuleProcessor');

      return rules;
    } catch (error) {
      log.error('自定义规则解析失败', error, 'CustomRuleProcessor');
      throw error;
    }
  }

  private parseCustomRule(line: string, context: RuleParseContext): RoutingRule | null {
    try {
      // 尝试解析各种格式
      const patterns = [
        /^([^,]+),([^,]+),([^,]+)$/, // type,value,action
        /^([^:]+):([^:]+)$/, // type:value
        /^([^\s]+)\s+([^\s]+)$/ // type value
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const [, type, value, action] = match;
          const ruleType = this.convertCustomType(type);
          const ruleAction = this.convertCustomAction(action);

          if (ruleType) {
            return {
              id: this.generateId(),
              name: `${type}:${value}`,
              type: ruleType,
              value: value,
              action: ruleAction || RuleAction.DIRECT,
              priority: context.priority || 100,
              source: RuleSource.SUBSCRIPTION,
              enabled: true,
              description: `从自定义配置导入的规则`,
              tags: [...(context.tags || []), 'custom'],
              createdAt: new Date(),
              updatedAt: new Date()
            };
          }
        }
      }

      return null;
    } catch (error) {
      log.warn('解析自定义规则失败', { line, error }, 'CustomRuleProcessor');
      return null;
    }
  }

  private convertCustomType(type: string): RuleType | null {
    const typeMap: Record<string, RuleType> = {
      'DOMAIN': RuleType.DOMAIN,
      'DOMAIN-SUFFIX': RuleType.DOMAIN_SUFFIX,
      'DOMAIN-KEYWORD': RuleType.DOMAIN_KEYWORD,
      'IP-CIDR': RuleType.IP_CIDR,
      'GEOIP': RuleType.GEOIP,
      'PROTOCOL': RuleType.PROTOCOL
    };
    return typeMap[type.toUpperCase()] || null;
  }

  private convertCustomAction(action: string): RuleAction | null {
    if (!action) return null;
    
    const actionMap: Record<string, RuleAction> = {
      'PROXY': RuleAction.PROXY,
      'DIRECT': RuleAction.DIRECT,
      'BLOCK': RuleAction.BLOCK,
      'REJECT': RuleAction.BLOCK
    };
    return actionMap[action.toUpperCase()] || null;
  }

  private generateId(): string {
    return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
