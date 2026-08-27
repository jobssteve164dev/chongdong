import { 
  TrafficRuleGroup, 
  TrafficRuleTemplate, 
  TrafficRuleStats, 
  TrafficRuleParseResult,
  RoutingRule, 
  RuleType, 
  RuleAction, 
  RuleSource 
} from '../../shared/types';
import { Storage } from './storage';
import { log } from './logger';

class TrafficRuleManager {
  private readonly STORAGE_KEY = 'traffic_rule_groups';
  private readonly TEMPLATES_KEY = 'traffic_rule_templates';

  // 预置的分流规则模板
  private readonly PRESET_TEMPLATES: TrafficRuleTemplate[] = [
    {
      id: 'social-media',
      name: '社交媒体',
      description: '包含主流社交媒体平台的分流规则',
      category: 'social',
      icon: '🌐',
      color: '#1890ff',
      defaultProxy: 'auto',
      rules: [
        {
          name: 'Facebook',
          type: RuleType.DOMAIN_SUFFIX,
          value: ['facebook.com', 'fb.com', 'messenger.com', 'instagram.com'],
          action: RuleAction.PROXY,
          priority: 100,
          source: RuleSource.TEMPLATE,
          enabled: true,
          description: 'Facebook相关域名'
        },
        {
          name: 'Twitter',
          type: RuleType.DOMAIN_SUFFIX,
          value: ['twitter.com', 't.co', 'twimg.com'],
          action: RuleAction.PROXY,
          priority: 100,
          source: RuleSource.TEMPLATE,
          enabled: true,
          description: 'Twitter相关域名'
        },
        {
          name: 'YouTube',
          type: RuleType.DOMAIN_SUFFIX,
          value: ['youtube.com', 'ytimg.com', 'googlevideo.com'],
          action: RuleAction.PROXY,
          priority: 100,
          source: RuleSource.TEMPLATE,
          enabled: true,
          description: 'YouTube相关域名'
        },
        {
          name: 'Telegram',
          type: RuleType.DOMAIN_SUFFIX,
          value: ['telegram.org', 't.me', 'core.telegram.org'],
          action: RuleAction.PROXY,
          priority: 100,
          source: RuleSource.TEMPLATE,
          enabled: true,
          description: 'Telegram相关域名'
        }
      ]
    },
    {
      id: 'streaming',
      name: '流媒体',
      description: '包含主流流媒体平台的分流规则',
      category: 'streaming',
      icon: '📺',
      color: '#52c41a',
      defaultProxy: 'auto',
      rules: [
        {
          name: 'Netflix',
          type: RuleType.DOMAIN_SUFFIX,
          value: ['netflix.com', 'netflix.net', 'nflxext.com', 'nflximg.com', 'nflxso.net', 'nflxvideo.net'],
          action: RuleAction.PROXY,
          priority: 100,
          source: RuleSource.TEMPLATE,
          enabled: true,
          description: 'Netflix相关域名'
        },
        {
          name: 'Disney+',
          type: RuleType.DOMAIN_SUFFIX,
          value: ['disneyplus.com', 'disney.com', 'dssott.com'],
          action: RuleAction.PROXY,
          priority: 100,
          source: RuleSource.TEMPLATE,
          enabled: true,
          description: 'Disney+相关域名'
        },
        {
          name: 'HBO',
          type: RuleType.DOMAIN_SUFFIX,
          value: ['hbomax.com', 'hbo.com'],
          action: RuleAction.PROXY,
          priority: 100,
          source: RuleSource.TEMPLATE,
          enabled: true,
          description: 'HBO相关域名'
        }
      ]
    },
    {
      id: 'gaming',
      name: '游戏',
      description: '包含主流游戏平台的分流规则',
      category: 'gaming',
      icon: '🎮',
      color: '#722ed1',
      defaultProxy: 'auto',
      rules: [
        {
          name: 'Steam',
          type: RuleType.DOMAIN_SUFFIX,
          value: ['steamcommunity.com', 'steampowered.com', 'steamgames.com'],
          action: RuleAction.PROXY,
          priority: 100,
          source: RuleSource.TEMPLATE,
          enabled: true,
          description: 'Steam相关域名'
        },
        {
          name: 'Epic Games',
          type: RuleType.DOMAIN_SUFFIX,
          value: ['epicgames.com', 'unrealengine.com'],
          action: RuleAction.PROXY,
          priority: 100,
          source: RuleSource.TEMPLATE,
          enabled: true,
          description: 'Epic Games相关域名'
        }
      ]
    },
    {
      id: 'work',
      name: '工作',
      description: '包含工作相关网站的分流规则',
      category: 'work',
      icon: '💼',
      color: '#fa8c16',
      defaultProxy: 'auto',
      rules: [
        {
          name: 'Google Workspace',
          type: RuleType.DOMAIN_SUFFIX,
          value: ['google.com', 'googleapis.com', 'gmail.com', 'docs.google.com', 'drive.google.com'],
          action: RuleAction.PROXY,
          priority: 100,
          source: RuleSource.TEMPLATE,
          enabled: true,
          description: 'Google Workspace相关域名'
        },
        {
          name: 'Microsoft 365',
          type: RuleType.DOMAIN_SUFFIX,
          value: ['office.com', 'microsoft.com', 'outlook.com', 'onedrive.com'],
          action: RuleAction.PROXY,
          priority: 100,
          source: RuleSource.TEMPLATE,
          enabled: true,
          description: 'Microsoft 365相关域名'
        }
      ]
    },
    {
      id: 'education',
      name: '教育',
      description: '包含教育相关网站的分流规则',
      category: 'education',
      icon: '📚',
      color: '#13c2c2',
      defaultProxy: 'auto',
      rules: [
        {
          name: '学术网站',
          type: RuleType.DOMAIN_SUFFIX,
          value: ['sciencedirect.com', 'springer.com', 'ieee.org', 'acm.org'],
          action: RuleAction.PROXY,
          priority: 100,
          source: RuleSource.TEMPLATE,
          enabled: true,
          description: '学术研究网站'
        }
      ]
    },
    {
      id: 'shopping',
      name: '购物',
      description: '包含购物网站的分流规则',
      category: 'shopping',
      icon: '🛒',
      color: '#eb2f96',
      defaultProxy: 'auto',
      rules: [
        {
          name: 'Amazon',
          type: RuleType.DOMAIN_SUFFIX,
          value: ['amazon.com', 'amazonaws.com'],
          action: RuleAction.PROXY,
          priority: 100,
          source: RuleSource.TEMPLATE,
          enabled: true,
          description: 'Amazon相关域名'
        },
        {
          name: 'eBay',
          type: RuleType.DOMAIN_SUFFIX,
          value: ['ebay.com', 'ebayimg.com'],
          action: RuleAction.PROXY,
          priority: 100,
          source: RuleSource.TEMPLATE,
          enabled: true,
          description: 'eBay相关域名'
        }
      ]
    }
  ];

  constructor() {
    this.initializeTemplates();
  }

  // 初始化模板
  private initializeTemplates(): void {
    try {
      const existingTemplates = this.getTemplates();
      if (existingTemplates.length === 0) {
        Storage.set(this.TEMPLATES_KEY, this.PRESET_TEMPLATES);
        log.info('初始化分流规则模板', { count: this.PRESET_TEMPLATES.length }, 'TrafficRuleManager');
      }
    } catch (error) {
      log.error('初始化模板失败', error, 'TrafficRuleManager');
    }
  }

  // 获取所有分流规则组
  getAllGroups(): TrafficRuleGroup[] {
    try {
      const groups = Storage.get<TrafficRuleGroup[]>(this.STORAGE_KEY, []) || [];
      return groups.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      log.error('获取分流规则组失败', error, 'TrafficRuleManager');
      return [];
    }
  }

  // 获取启用的分流规则组
  getEnabledGroups(): TrafficRuleGroup[] {
    return this.getAllGroups().filter(group => group.enabled);
  }

  // 根据ID获取分流规则组
  getGroup(id: string): TrafficRuleGroup | null {
    const groups = this.getAllGroups();
    return groups.find(group => group.id === id) || null;
  }

  // 添加分流规则组
  addGroup(groupData: Omit<TrafficRuleGroup, 'id' | 'createdAt' | 'updatedAt'>): TrafficRuleGroup {
    try {
      const groups = this.getAllGroups();
      const newGroup: TrafficRuleGroup = {
        ...groupData,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      groups.push(newGroup);
      Storage.set(this.STORAGE_KEY, groups);
      
      log.info('添加分流规则组', { id: newGroup.id, name: newGroup.name }, 'TrafficRuleManager');
      return newGroup;
    } catch (error) {
      log.error('添加分流规则组失败', error, 'TrafficRuleManager');
      throw error;
    }
  }

  // 更新分流规则组
  updateGroup(id: string, updates: Partial<TrafficRuleGroup>): TrafficRuleGroup | null {
    try {
      const groups = this.getAllGroups();
      const index = groups.findIndex(group => group.id === id);
      
      if (index === -1) {
        return null;
      }

      groups[index] = {
        ...groups[index],
        ...updates,
        updatedAt: new Date()
      };

      Storage.set(this.STORAGE_KEY, groups);
      
      log.info('更新分流规则组', { id, name: groups[index].name }, 'TrafficRuleManager');
      return groups[index];
    } catch (error) {
      log.error('更新分流规则组失败', error, 'TrafficRuleManager');
      throw error;
    }
  }

  // 删除分流规则组
  deleteGroup(id: string): boolean {
    try {
      const groups = this.getAllGroups();
      const filteredGroups = groups.filter(group => group.id !== id);
      
      if (filteredGroups.length === groups.length) {
        return false;
      }

      Storage.set(this.STORAGE_KEY, filteredGroups);
      
      log.info('删除分流规则组', { id }, 'TrafficRuleManager');
      return true;
    } catch (error) {
      log.error('删除分流规则组失败', error, 'TrafficRuleManager');
      return false;
    }
  }

  // 启用/禁用分流规则组
  toggleGroup(id: string): boolean {
    try {
      const group = this.getGroup(id);
      if (!group) {
        return false;
      }

      const success = this.updateGroup(id, { enabled: !group.enabled });
      return success !== null;
    } catch (error) {
      log.error('切换分流规则组状态失败', error, 'TrafficRuleManager');
      return false;
    }
  }

  // 从模板创建分流规则组
  createFromTemplate(templateId: string, groupName: string, defaultProxy?: string): TrafficRuleGroup | null {
    try {
      const template = this.getTemplate(templateId);
      if (!template) {
        log.error('模板不存在', { templateId }, 'TrafficRuleManager');
        return null;
      }

      const rules: RoutingRule[] = template.rules.map(rule => ({
        ...rule,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const group: Omit<TrafficRuleGroup, 'id' | 'createdAt' | 'updatedAt'> = {
        name: groupName,
        description: template.description,
        defaultProxy: defaultProxy || template.defaultProxy,
        rules,
        enabled: true,
        source: RuleSource.TEMPLATE,
        priority: 100,
        tags: template.tags || [],
        autoUpdate: false
      };

      log.info('创建分流规则组', { 
        templateId, 
        groupName, 
        defaultProxy, 
        templateDefaultProxy: template.defaultProxy,
        finalDefaultProxy: group.defaultProxy 
      }, 'TrafficRuleManager');

      return this.addGroup(group);
    } catch (error) {
      log.error('从模板创建分流规则组失败', error, 'TrafficRuleManager');
      return null;
    }
  }

  // 获取所有模板
  getTemplates(): TrafficRuleTemplate[] {
    try {
      return Storage.get<TrafficRuleTemplate[]>(this.TEMPLATES_KEY, []) || [];
    } catch (error) {
      log.error('获取模板失败', error, 'TrafficRuleManager');
      return [];
    }
  }

  // 根据ID获取模板
  getTemplate(id: string): TrafficRuleTemplate | null {
    const templates = this.getTemplates();
    return templates.find(template => template.id === id) || null;
  }

  // 添加自定义模板
  addTemplate(template: Omit<TrafficRuleTemplate, 'id'>): TrafficRuleTemplate {
    try {
      const templates = this.getTemplates();
      const newTemplate: TrafficRuleTemplate = {
        ...template,
        id: this.generateId()
      };

      templates.push(newTemplate);
      Storage.set(this.TEMPLATES_KEY, templates);
      
      log.info('添加自定义模板', { id: newTemplate.id, name: newTemplate.name }, 'TrafficRuleManager');
      return newTemplate;
    } catch (error) {
      log.error('添加模板失败', error, 'TrafficRuleManager');
      throw error;
    }
  }

  // 从订阅链接解析分流规则
  async parseFromSubscription(url: string): Promise<TrafficRuleParseResult> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      const result: TrafficRuleParseResult = {
        success: false,
        groups: [],
        errors: [],
        warnings: [],
        totalRules: 0,
        totalGroups: 0
      };

      // 尝试解析不同格式
      if (content.includes('proxies:') || content.includes('proxy-groups:')) {
        // Clash格式
        this.parseClashFormat(content, result);
      } else if (content.includes('"outbounds"') || content.includes('"inbounds"')) {
        // Sing-box格式
        this.parseSingboxFormat(content, result);
      } else {
        // 尝试解析为简单的规则列表
        this.parseSimpleRules(content, result);
      }

      result.totalGroups = result.groups.length;
      result.totalRules = result.groups.reduce((sum, group) => sum + group.rules.length, 0);

      log.info('解析订阅链接', { success: result.success, groups: result.totalGroups, rules: result.totalRules }, 'TrafficRuleManager');
      return result;
    } catch (error) {
      log.error('解析订阅链接失败', error, 'TrafficRuleManager');
      return {
        success: false,
        groups: [],
        errors: [error instanceof Error ? error.message : '未知错误'],
        totalRules: 0,
        totalGroups: 0
      };
    }
  }

  // 解析Clash格式
  private parseClashFormat(content: string, result: TrafficRuleParseResult): void {
    try {
      // 这里实现Clash格式的解析逻辑
      // 由于Clash格式比较复杂，这里提供一个基础实现
      const lines = content.split('\n');
      const rules: RoutingRule[] = [];
      
      let inRulesSection = false;
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === 'rules:') {
          inRulesSection = true;
          continue;
        }
        
        if (inRulesSection && trimmedLine.startsWith('-')) {
          const ruleLine = trimmedLine.substring(1).trim();
          const rule = this.parseClashRule(ruleLine);
          if (rule) {
            rules.push(rule);
          }
        }
      }

      if (rules.length > 0) {
        result.groups.push({
          id: this.generateId(),
          name: '从订阅解析的规则',
          description: '从订阅链接自动解析的分流规则',
          rules,
          enabled: true,
          source: RuleSource.SUBSCRIPTION,
          priority: 50,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        result.success = true;
      }
    } catch (error) {
      result.errors?.push(`解析Clash格式失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 解析Clash规则行
  private parseClashRule(ruleLine: string): RoutingRule | null {
    try {
      const parts = ruleLine.split(',');
      if (parts.length < 3) return null;

      const [type, value, action, ...rest] = parts;
      
      return {
        id: this.generateId(),
        name: `${type}:${value}`,
        type: this.mapClashRuleType(type),
        value: value.trim(),
        action: this.mapClashAction(action.trim()),
        priority: 100,
        source: RuleSource.SUBSCRIPTION,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      return null;
    }
  }

  // 映射Clash规则类型
  private mapClashRuleType(type: string): RuleType {
    const typeMap: Record<string, RuleType> = {
      'DOMAIN': RuleType.DOMAIN,
      'DOMAIN-SUFFIX': RuleType.DOMAIN_SUFFIX,
      'DOMAIN-KEYWORD': RuleType.DOMAIN_KEYWORD,
      'IP-CIDR': RuleType.IP_CIDR,
      'IP-CIDR6': RuleType.IP_CIDR6,
      'GEOIP': RuleType.GEOIP,
      'MATCH': RuleType.MATCH
    };
    return typeMap[type] || RuleType.DOMAIN;
  }

  // 映射Clash动作
  private mapClashAction(action: string): RuleAction {
    const actionMap: Record<string, RuleAction> = {
      'PROXY': RuleAction.PROXY,
      'DIRECT': RuleAction.DIRECT,
      'REJECT': RuleAction.REJECT,
      'BLOCK': RuleAction.BLOCK
    };
    return actionMap[action] || RuleAction.PROXY;
  }

  // 解析Sing-box格式
  private parseSingboxFormat(content: string, result: TrafficRuleParseResult): void {
    try {
      // Sing-box格式解析逻辑
      result.warnings?.push('Sing-box格式解析功能正在开发中');
    } catch (error) {
      result.errors?.push(`解析Sing-box格式失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 解析简单规则格式
  private parseSimpleRules(content: string, result: TrafficRuleParseResult): void {
    try {
      const lines = content.split('\n');
      const rules: RoutingRule[] = [];
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const rule = this.parseSimpleRule(trimmedLine);
          if (rule) {
            rules.push(rule);
          }
        }
      }

      if (rules.length > 0) {
        result.groups.push({
          id: this.generateId(),
          name: '从订阅解析的规则',
          description: '从订阅链接自动解析的分流规则',
          rules,
          enabled: true,
          source: RuleSource.SUBSCRIPTION,
          priority: 50,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        result.success = true;
      }
    } catch (error) {
      result.errors?.push(`解析简单规则格式失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 解析简单规则
  private parseSimpleRule(line: string): RoutingRule | null {
    try {
      // 支持格式: domain,proxy 或 domain:proxy
      const separator = line.includes(',') ? ',' : ':';
      const parts = line.split(separator);
      
      if (parts.length >= 2) {
        const domain = parts[0].trim();
        const proxy = parts[1].trim();
        
        return {
          id: this.generateId(),
          name: domain,
          type: RuleType.DOMAIN_SUFFIX,
          value: domain,
          action: RuleAction.PROXY,
          target: proxy,
          priority: 100,
          source: RuleSource.SUBSCRIPTION,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // 获取统计信息
  getStats(): TrafficRuleStats {
    try {
      const groups = this.getAllGroups();
      const allRules = groups.flatMap(group => group.rules);
      
      const stats: TrafficRuleStats = {
        totalGroups: groups.length,
        enabledGroups: groups.filter(g => g.enabled).length,
        disabledGroups: groups.filter(g => !g.enabled).length,
        totalRules: allRules.length,
        enabledRules: allRules.filter(r => r.enabled).length,
        disabledRules: allRules.filter(r => !r.enabled).length,
        groupsByCategory: {},
        rulesByType: {} as Record<RuleType, number>,
        rulesByAction: {} as Record<RuleAction, number>,
        averageRulesPerGroup: groups.length > 0 ? allRules.length / groups.length : 0,
        mostUsedProxies: []
      };

      // 统计规则类型
      allRules.forEach(rule => {
        stats.rulesByType[rule.type] = (stats.rulesByType[rule.type] || 0) + 1;
        stats.rulesByAction[rule.action] = (stats.rulesByAction[rule.action] || 0) + 1;
      });

      // 统计最常用的代理
      const proxyCount: Record<string, number> = {};
      groups.forEach(group => {
        if (group.defaultProxy) {
          proxyCount[group.defaultProxy] = (proxyCount[group.defaultProxy] || 0) + 1;
        }
      });

      stats.mostUsedProxies = Object.entries(proxyCount)
        .map(([proxyId, count]) => ({ proxyId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return stats;
    } catch (error) {
      log.error('获取统计信息失败', error, 'TrafficRuleManager');
      return {
        totalGroups: 0,
        enabledGroups: 0,
        disabledGroups: 0,
        totalRules: 0,
        enabledRules: 0,
        disabledRules: 0,
        groupsByCategory: {},
        rulesByType: {} as Record<RuleType, number>,
        rulesByAction: {} as Record<RuleAction, number>,
        averageRulesPerGroup: 0,
        mostUsedProxies: []
      };
    }
  }

  // 生成唯一ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const trafficRuleManager = new TrafficRuleManager();
