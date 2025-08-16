import { configManager } from './configManager';
import { ConfigValidator } from './configValidator';
import { ConfigExporter } from './configExporter';
import { ConfigImporter } from './configImporter';
import { 
  AppState, 
  AppSettings, 
  UserPreferences, 
  Subscription, 
  ProxyServer, 
  ProxyGroup,
  ApiResponse,
  AppEvent 
} from '../../shared/types';

/**
 * 配置管理API
 * 提供统一的配置管理接口
 */
export class ConfigApi {
  /**
   * 获取完整配置
   */
  static getConfig(): AppState {
    return configManager.getConfig();
  }

  /**
   * 获取应用设置
   */
  static getSettings(): AppSettings {
    return configManager.getSettings();
  }

  /**
   * 更新应用设置
   */
  static updateSettings(settings: Partial<AppSettings>): ApiResponse<AppSettings> {
    // 先验证设置
    const validationResult = ConfigValidator.validateSettings(settings);
    if (!validationResult.success) {
      return {
        success: false,
        error: '设置验证失败',
        message: validationResult.message
      };
    }

    return configManager.updateSettings(settings);
  }

  /**
   * 获取用户偏好设置
   */
  static getPreferences(): UserPreferences {
    return configManager.getPreferences();
  }

  /**
   * 更新用户偏好设置
   */
  static updatePreferences(preferences: Partial<UserPreferences>): ApiResponse<UserPreferences> {
    // 先验证偏好设置
    const validationResult = ConfigValidator.validatePreferences(preferences);
    if (!validationResult.success) {
      return {
        success: false,
        error: '偏好设置验证失败',
        message: validationResult.message
      };
    }

    return configManager.updatePreferences(preferences);
  }

  /**
   * 获取所有订阅
   */
  static getSubscriptions(): Subscription[] {
    return configManager.getSubscriptions();
  }

  /**
   * 添加订阅
   */
  static addSubscription(subscription: Omit<Subscription, 'id'>): ApiResponse<Subscription> {
    // 先验证订阅
    const validationResult = ConfigValidator.validateSubscription(subscription);
    if (!validationResult.success) {
      return {
        success: false,
        error: '订阅验证失败',
        message: validationResult.message
      };
    }

    return configManager.addSubscription(subscription);
  }

  /**
   * 更新订阅
   */
  static updateSubscription(id: string, updates: Partial<Subscription>): ApiResponse<Subscription> {
    // 先验证更新内容
    const validationResult = ConfigValidator.validateSubscription(updates);
    if (!validationResult.success) {
      return {
        success: false,
        error: '订阅验证失败',
        message: validationResult.message
      };
    }

    return configManager.updateSubscription(id, updates);
  }

  /**
   * 删除订阅
   */
  static deleteSubscription(id: string): ApiResponse<boolean> {
    return configManager.deleteSubscription(id);
  }

  /**
   * 获取所有代理服务器
   */
  static getServers(): ProxyServer[] {
    return configManager.getServers();
  }

  /**
   * 添加代理服务器
   */
  static addServer(server: Omit<ProxyServer, 'id'>): ApiResponse<ProxyServer> {
    // 先验证服务器配置
    const validationResult = ConfigValidator.validateServer(server);
    if (!validationResult.success) {
      return {
        success: false,
        error: '代理服务器配置验证失败',
        message: validationResult.message
      };
    }

    return configManager.addServer(server);
  }

  /**
   * 更新代理服务器
   */
  static updateServer(id: string, updates: Partial<ProxyServer>): ApiResponse<ProxyServer> {
    // 先验证更新内容
    const validationResult = ConfigValidator.validateServer(updates);
    if (!validationResult.success) {
      return {
        success: false,
        error: '代理服务器配置验证失败',
        message: validationResult.message
      };
    }

    return configManager.updateServer(id, updates);
  }

  /**
   * 删除代理服务器
   */
  static deleteServer(id: string): ApiResponse<boolean> {
    return configManager.deleteServer(id);
  }

  /**
   * 获取所有代理组
   */
  static getGroups(): ProxyGroup[] {
    return configManager.getGroups();
  }

  /**
   * 添加代理组
   */
  static addGroup(group: Omit<ProxyGroup, 'id'>): ApiResponse<ProxyGroup> {
    // 先验证代理组配置
    const validationResult = ConfigValidator.validateGroup(group);
    if (!validationResult.success) {
      return {
        success: false,
        error: '代理组配置验证失败',
        message: validationResult.message
      };
    }

    return configManager.addGroup(group);
  }

  /**
   * 更新代理组
   */
  static updateGroup(id: string, updates: Partial<ProxyGroup>): ApiResponse<ProxyGroup> {
    // 先验证更新内容
    const validationResult = ConfigValidator.validateGroup(updates);
    if (!validationResult.success) {
      return {
        success: false,
        error: '代理组配置验证失败',
        message: validationResult.message
      };
    }

    return configManager.updateGroup(id, updates);
  }

  /**
   * 删除代理组
   */
  static deleteGroup(id: string): ApiResponse<boolean> {
    return configManager.deleteGroup(id);
  }

  /**
   * 重置配置为默认值
   */
  static resetConfig(): ApiResponse<boolean> {
    return configManager.resetConfig();
  }

  /**
   * 导出配置
   */
  static exportConfig(format: string, includeMetadata: boolean = true): ApiResponse<string> {
    const config = configManager.getConfig();

    switch (format.toLowerCase()) {
      case 'json':
        return ConfigExporter.exportToJson(config, includeMetadata);
      case 'yaml':
        return ConfigExporter.exportToYaml(config, includeMetadata);
      case 'clash':
        return ConfigExporter.exportToClash(config);
      case 'v2ray':
        return ConfigExporter.exportToV2Ray(config);
      case 'singbox':
        return ConfigExporter.exportToSingBox(config);
      default:
        return {
          success: false,
          error: '不支持的导出格式',
          message: `不支持的导出格式: ${format}`
        };
    }
  }

  /**
   * 导入配置
   */
  static importConfig(content: string, format: string): ApiResponse<AppState> {
    switch (format.toLowerCase()) {
      case 'json':
        return ConfigImporter.importFromJson(content);
      case 'yaml':
        return ConfigImporter.importFromYaml(content);
      case 'clash':
        return ConfigImporter.importFromClash(content);
      case 'v2ray':
        return ConfigImporter.importFromV2Ray(content);
      case 'singbox':
        return ConfigImporter.importFromSingBox(content);
      default:
        return {
          success: false,
          error: '不支持的导入格式',
          message: `不支持的导入格式: ${format}`
        };
    }
  }

  /**
   * 自动检测并导入配置
   */
  static autoImportConfig(content: string): ApiResponse<AppState> {
    const format = ConfigImporter.detectFormat(content);
    
    if (format === 'unknown') {
      return {
        success: false,
        error: '无法识别的配置格式',
        message: '无法自动识别配置文件格式，请手动选择格式'
      };
    }

    return this.importConfig(content, format);
  }

  /**
   * 导入订阅
   */
  static importSubscription(url: string, name: string = 'Imported Subscription'): ApiResponse<Subscription> {
    return ConfigImporter.importFromSubscription(url, name);
  }

  /**
   * 生成导出文件名
   */
  static generateExportFileName(format: string, prefix: string = 'chongdong'): string {
    return ConfigExporter.generateFileName(format, prefix);
  }

  /**
   * 添加事件监听器
   */
  static addEventListener(event: AppEvent, listener: Function): void {
    configManager.addEventListener(event, listener);
  }

  /**
   * 移除事件监听器
   */
  static removeEventListener(event: AppEvent, listener: Function): void {
    configManager.removeEventListener(event, listener);
  }

  /**
   * 验证配置
   */
  static validateConfig(config: Partial<AppState>): ApiResponse<boolean> {
    return ConfigValidator.validateAppState(config);
  }

  /**
   * 验证应用设置
   */
  static validateSettings(settings: Partial<AppSettings>): ApiResponse<boolean> {
    return ConfigValidator.validateSettings(settings);
  }

  /**
   * 验证用户偏好设置
   */
  static validatePreferences(preferences: Partial<UserPreferences>): ApiResponse<boolean> {
    return ConfigValidator.validatePreferences(preferences);
  }

  /**
   * 验证代理服务器配置
   */
  static validateServer(server: Partial<ProxyServer>): ApiResponse<boolean> {
    return ConfigValidator.validateServer(server);
  }

  /**
   * 验证订阅配置
   */
  static validateSubscription(subscription: Partial<Subscription>): ApiResponse<boolean> {
    return ConfigValidator.validateSubscription(subscription);
  }

  /**
   * 验证代理组配置
   */
  static validateGroup(group: Partial<ProxyGroup>): ApiResponse<boolean> {
    return ConfigValidator.validateGroup(group);
  }

  /**
   * 获取支持的导出格式
   */
  static getSupportedExportFormats(): string[] {
    return Object.values(ConfigExporter.EXPORT_FORMATS);
  }

  /**
   * 获取支持的导入格式
   */
  static getSupportedImportFormats(): string[] {
    return Object.values(ConfigImporter.IMPORT_FORMATS);
  }
}

// 导出默认实例
export default ConfigApi;
