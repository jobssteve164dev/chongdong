// 本地存储工具函数
export class Storage {
  private static prefix = 'chongdong_';

  /**
   * 设置存储项
   */
  static set(key: string, value: any): void {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(this.prefix + key, serializedValue);
    } catch (error) {
      console.error('Storage set error:', error);
    }
  }

  /**
   * 获取存储项
   */
  static get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (item === null) {
        return defaultValue || null;
      }
      return JSON.parse(item);
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue || null;
    }
  }

  /**
   * 删除存储项
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  }

  /**
   * 清空所有存储
   */
  static clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }

  /**
   * 获取所有存储键
   */
  static keys(): string[] {
    try {
      const keys = Object.keys(localStorage);
      return keys
        .filter(key => key.startsWith(this.prefix))
        .map(key => key.replace(this.prefix, ''));
    } catch (error) {
      console.error('Storage keys error:', error);
      return [];
    }
  }

  /**
   * 检查存储项是否存在
   */
  static has(key: string): boolean {
    try {
      return localStorage.getItem(this.prefix + key) !== null;
    } catch (error) {
      console.error('Storage has error:', error);
      return false;
    }
  }
}

// 常用存储键常量
export const STORAGE_KEYS = {
  THEME: 'theme',
  LANGUAGE: 'language',
  SETTINGS: 'settings',
  PROXY_CONFIG: 'proxy_config',
  SUBSCRIPTION_CONFIG: 'subscription_config',
  USER_PREFERENCES: 'user_preferences',
  // 规则管理相关
  RULES: 'rules',
  RULE_GROUPS: 'rule_groups',
  RULE_TEMPLATES: 'rule_templates',
  RULE_STATS: 'rule_stats',
  RULE_BACKUP: 'rule_backup',
  // 自定义服务器
  CUSTOM_SERVERS: 'custom_servers',
} as const;
