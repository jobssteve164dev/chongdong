import { Storage } from './storage';
import { 
  AppState, 
  AppSettings, 
  UserPreferences, 
  Subscription, 
  ProxyServer, 
  ProxyGroup,
  AppEvent,
  ApiResponse 
} from '../../shared/types';
import { log } from './logger';
import { DefaultSettings } from '../../shared/defaultSettings';

/**
 * 配置管理类
 * 负责处理应用所有配置的CRUD操作
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppState;
  private listeners: Map<AppEvent, Set<Function>> = new Map();

  private constructor() {
    this.config = this.loadDefaultConfig();
    this.loadConfig();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 加载默认配置
   */
  private loadDefaultConfig(): AppState {
    return {
      settings: DefaultSettings.getDefaultAppSettings(),
      preferences: DefaultSettings.getDefaultUserPreferences(),
      subscriptions: [],
      servers: [],
      groups: [],
      connection: {
        connected: false,
        upload: 0,
        download: 0,
        uploadSpeed: 0,
        downloadSpeed: 0
      },
      traffic: {
        upload: 0,
        download: 0,
        uploadSpeed: 0,
        downloadSpeed: 0,
        timestamp: Date.now()
      }
    };
  }

  /**
   * 从存储中加载配置
   */
  private loadConfig(): void {
    try {
      const savedConfig = Storage.get<AppState>('app_config');
      if (savedConfig) {
        this.config = { ...this.config, ...savedConfig };
        log.info('配置加载成功');
      }
    } catch (error) {
      log.error('配置加载失败:', error);
    }
  }

  /**
   * 保存配置到存储
   */
  private saveConfig(): void {
    try {
      Storage.set('app_config', this.config);
      log.info('配置保存成功');
    } catch (error) {
              log.error('配置保存失败:', error);
    }
  }

  /**
   * 获取完整配置
   */
  getConfig(): AppState {
    return { ...this.config };
  }

  /**
   * 获取应用设置
   */
  getSettings(): AppSettings {
    return { ...this.config.settings };
  }

  /**
   * 更新应用设置
   */
  updateSettings(settings: Partial<AppSettings>): ApiResponse<AppSettings> {
    try {
      this.config.settings = { ...this.config.settings, ...settings };
      this.saveConfig();
      this.emitEvent(AppEvent.SETTINGS_CHANGED, this.config.settings);
      
      return {
        success: true,
        data: this.config.settings,
        message: '设置更新成功'
      };
    } catch (error) {
      log.error('更新设置失败:', error);
      return {
        success: false,
        error: '更新设置失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 获取用户偏好设置
   */
  getPreferences(): UserPreferences {
    return { ...this.config.preferences };
  }

  /**
   * 更新用户偏好设置
   */
  updatePreferences(preferences: Partial<UserPreferences>): ApiResponse<UserPreferences> {
    try {
      this.config.preferences = { ...this.config.preferences, ...preferences };
      this.saveConfig();
      
      return {
        success: true,
        data: this.config.preferences,
        message: '偏好设置更新成功'
      };
    } catch (error) {
      log.error('更新偏好设置失败:', error);
      return {
        success: false,
        error: '更新偏好设置失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 获取所有订阅
   */
  getSubscriptions(): Subscription[] {
    return [...this.config.subscriptions];
  }

  /**
   * 添加订阅
   */
  addSubscription(subscription: Omit<Subscription, 'id'>): ApiResponse<Subscription> {
    try {
      const newSubscription: Subscription = {
        ...subscription,
        id: this.generateId()
      };
      
      this.config.subscriptions.push(newSubscription);
      this.saveConfig();
      this.emitEvent(AppEvent.SUBSCRIPTION_UPDATED, newSubscription);
      
      return {
        success: true,
        data: newSubscription,
        message: '订阅添加成功'
      };
    } catch (error) {
      log.error('添加订阅失败:', error);
      return {
        success: false,
        error: '添加订阅失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 更新订阅
   */
  updateSubscription(id: string, updates: Partial<Subscription>): ApiResponse<Subscription> {
    try {
      const index = this.config.subscriptions.findIndex(sub => sub.id === id);
      if (index === -1) {
        return {
          success: false,
          error: '订阅不存在',
          message: '找不到指定的订阅'
        };
      }

      this.config.subscriptions[index] = { 
        ...this.config.subscriptions[index], 
        ...updates 
      };
      this.saveConfig();
      this.emitEvent(AppEvent.SUBSCRIPTION_UPDATED, this.config.subscriptions[index]);
      
      return {
        success: true,
        data: this.config.subscriptions[index],
        message: '订阅更新成功'
      };
    } catch (error) {
      log.error('更新订阅失败:', error);
      return {
        success: false,
        error: '更新订阅失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 删除订阅
   */
  deleteSubscription(id: string): ApiResponse<boolean> {
    try {
      const index = this.config.subscriptions.findIndex(sub => sub.id === id);
      if (index === -1) {
        return {
          success: false,
          error: '订阅不存在',
          message: '找不到指定的订阅'
        };
      }

      this.config.subscriptions.splice(index, 1);
      this.saveConfig();
      
      return {
        success: true,
        data: true,
        message: '订阅删除成功'
      };
    } catch (error) {
      log.error('删除订阅失败:', error);
      return {
        success: false,
        error: '删除订阅失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 获取所有代理服务器
   */
  getServers(): ProxyServer[] {
    return [...this.config.servers];
  }

  /**
   * 添加代理服务器
   */
  addServer(server: Omit<ProxyServer, 'id'>): ApiResponse<ProxyServer> {
    try {
      const newServer: ProxyServer = {
        ...server,
        id: this.generateId()
      };
      
      this.config.servers.push(newServer);
      this.saveConfig();
      this.emitEvent(AppEvent.SERVER_ADDED, newServer);
      
      return {
        success: true,
        data: newServer,
        message: '代理服务器添加成功'
      };
    } catch (error) {
      log.error('添加代理服务器失败:', error);
      return {
        success: false,
        error: '添加代理服务器失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 更新代理服务器
   */
  updateServer(id: string, updates: Partial<ProxyServer>): ApiResponse<ProxyServer> {
    try {
      const index = this.config.servers.findIndex(server => server.id === id);
      if (index === -1) {
        return {
          success: false,
          error: '代理服务器不存在',
          message: '找不到指定的代理服务器'
        };
      }

      this.config.servers[index] = { 
        ...this.config.servers[index], 
        ...updates 
      };
      this.saveConfig();
      this.emitEvent(AppEvent.SERVER_UPDATED, this.config.servers[index]);
      
      return {
        success: true,
        data: this.config.servers[index],
        message: '代理服务器更新成功'
      };
    } catch (error) {
      log.error('更新代理服务器失败:', error);
      return {
        success: false,
        error: '更新代理服务器失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 删除代理服务器
   */
  deleteServer(id: string): ApiResponse<boolean> {
    try {
      const index = this.config.servers.findIndex(server => server.id === id);
      if (index === -1) {
        return {
          success: false,
          error: '代理服务器不存在',
          message: '找不到指定的代理服务器'
        };
      }

      this.config.servers.splice(index, 1);
      this.saveConfig();
      this.emitEvent(AppEvent.SERVER_REMOVED, id);
      
      return {
        success: true,
        data: true,
        message: '代理服务器删除成功'
      };
    } catch (error) {
      log.error('删除代理服务器失败:', error);
      return {
        success: false,
        error: '删除代理服务器失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 获取所有代理组
   */
  getGroups(): ProxyGroup[] {
    return [...this.config.groups];
  }

  /**
   * 添加代理组
   */
  addGroup(group: Omit<ProxyGroup, 'id'>): ApiResponse<ProxyGroup> {
    try {
      const newGroup: ProxyGroup = {
        ...group,
        id: this.generateId()
      };
      
      this.config.groups.push(newGroup);
      this.saveConfig();
      
      return {
        success: true,
        data: newGroup,
        message: '代理组添加成功'
      };
    } catch (error) {
      log.error('添加代理组失败:', error);
      return {
        success: false,
        error: '添加代理组失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 更新代理组
   */
  updateGroup(id: string, updates: Partial<ProxyGroup>): ApiResponse<ProxyGroup> {
    try {
      const index = this.config.groups.findIndex(group => group.id === id);
      if (index === -1) {
        return {
          success: false,
          error: '代理组不存在',
          message: '找不到指定的代理组'
        };
      }

      this.config.groups[index] = { 
        ...this.config.groups[index], 
        ...updates 
      };
      this.saveConfig();
      
      return {
        success: true,
        data: this.config.groups[index],
        message: '代理组更新成功'
      };
    } catch (error) {
      log.error('更新代理组失败:', error);
      return {
        success: false,
        error: '更新代理组失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 删除代理组
   */
  deleteGroup(id: string): ApiResponse<boolean> {
    try {
      const index = this.config.groups.findIndex(group => group.id === id);
      if (index === -1) {
        return {
          success: false,
          error: '代理组不存在',
          message: '找不到指定的代理组'
        };
      }

      this.config.groups.splice(index, 1);
      this.saveConfig();
      
      return {
        success: true,
        data: true,
        message: '代理组删除成功'
      };
    } catch (error) {
      log.error('删除代理组失败:', error);
      return {
        success: false,
        error: '删除代理组失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 重置配置为默认值
   */
  resetConfig(): ApiResponse<boolean> {
    try {
      this.config = this.loadDefaultConfig();
      this.saveConfig();
      
      return {
        success: true,
        data: true,
        message: '配置重置成功'
      };
    } catch (error) {
      log.error('重置配置失败:', error);
      return {
        success: false,
        error: '重置配置失败',
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 添加事件监听器
   */
  addEventListener(event: AppEvent, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(event: AppEvent, listener: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 触发事件
   */
  private emitEvent(event: AppEvent, data?: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          log.error(`事件监听器执行失败 [${event}]:`, error);
        }
      });
    }
  }
}

// 导出单例实例
export const configManager = ConfigManager.getInstance();
