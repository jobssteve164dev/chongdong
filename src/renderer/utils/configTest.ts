import ConfigApi from './configApi';
import { ProxyProtocol, AppEvent } from '../../shared/types';

/**
 * 配置管理功能测试
 */
export class ConfigTest {
  /**
   * 运行所有测试
   */
  static async runAllTests(): Promise<void> {
    console.log('开始配置管理功能测试...\n');

    try {
      // 测试基础配置操作
      await this.testBasicConfigOperations();
      
      // 测试代理服务器管理
      await this.testServerManagement();
      
      // 测试订阅管理
      await this.testSubscriptionManagement();
      
      // 测试代理组管理
      await this.testGroupManagement();
      
      // 测试配置验证
      await this.testConfigValidation();
      
      // 测试配置导入导出
      await this.testConfigImportExport();
      
      // 测试事件监听
      await this.testEventListeners();

      console.log('\n✅ 所有测试通过！');
    } catch (error) {
      console.error('\n❌ 测试失败:', error);
    }
  }

  /**
   * 测试基础配置操作
   */
  private static async testBasicConfigOperations(): Promise<void> {
    console.log('📋 测试基础配置操作...');

    // 测试获取配置
    const config = ConfigApi.getConfig();
    console.log(`  ✅ 获取配置成功，配置项数量: ${Object.keys(config).length}`);

    // 测试获取设置
    const settings = ConfigApi.getSettings();
    console.log(`  ✅ 获取设置成功，主题: ${settings.theme}, 语言: ${settings.language}`);

    // 测试更新设置
    const updateResult = ConfigApi.updateSettings({
      theme: 'dark',
      language: 'en-US'
    });
    
    if (updateResult.success) {
      console.log('  ✅ 更新设置成功');
    } else {
      throw new Error(`更新设置失败: ${updateResult.message}`);
    }

    // 测试获取偏好设置
    const preferences = ConfigApi.getPreferences();
    console.log(`  ✅ 获取偏好设置成功，窗口大小: ${preferences.windowSize.width}x${preferences.windowSize.height}`);

    // 测试更新偏好设置
    const updatePrefResult = ConfigApi.updatePreferences({
      windowSize: { width: 1400, height: 900 }
    });
    
    if (updatePrefResult.success) {
      console.log('  ✅ 更新偏好设置成功');
    } else {
      throw new Error(`更新偏好设置失败: ${updatePrefResult.message}`);
    }
  }

  /**
   * 测试代理服务器管理
   */
  private static async testServerManagement(): Promise<void> {
    console.log('🖥️  测试代理服务器管理...');

    // 测试添加服务器
    const addServerResult = ConfigApi.addServer({
      name: 'Test Server',
      protocol: ProxyProtocol.VMESS,
      host: 'test.example.com',
      port: 443,
      uuid: 'test-uuid-123',
      enabled: true
    });

    if (addServerResult.success) {
      console.log('  ✅ 添加服务器成功');
    } else {
      throw new Error(`添加服务器失败: ${addServerResult.message}`);
    }

    // 测试获取服务器列表
    const servers = ConfigApi.getServers();
    if (servers.length > 0) {
      console.log('  ✅ 获取服务器列表成功');
    } else {
      throw new Error('服务器列表为空');
    }

    // 测试更新服务器
    const serverId = servers[0].id;
    const updateServerResult = ConfigApi.updateServer(serverId, {
      name: 'Updated Test Server'
    });

    if (updateServerResult.success) {
      console.log('  ✅ 更新服务器成功');
    } else {
      throw new Error(`更新服务器失败: ${updateServerResult.message}`);
    }

    // 测试删除服务器
    const deleteServerResult = ConfigApi.deleteServer(serverId);
    if (deleteServerResult.success) {
      console.log('  ✅ 删除服务器成功');
    } else {
      throw new Error(`删除服务器失败: ${deleteServerResult.message}`);
    }
  }

  /**
   * 测试订阅管理
   */
  private static async testSubscriptionManagement(): Promise<void> {
    console.log('📡 测试订阅管理...');

    // 测试添加订阅
    const addSubResult = ConfigApi.addSubscription({
      name: 'Test Subscription',
      url: 'https://example.com/subscription',
      enabled: true,
      autoUpdate: true,
      updateInterval: 3600,
      servers: [],
      groups: [],
      rules: []
    });

    if (addSubResult.success) {
      console.log('  ✅ 添加订阅成功');
    } else {
      throw new Error(`添加订阅失败: ${addSubResult.message}`);
    }

    // 测试获取订阅列表
    const subscriptions = ConfigApi.getSubscriptions();
    if (subscriptions.length > 0) {
      console.log('  ✅ 获取订阅列表成功');
    } else {
      throw new Error('订阅列表为空');
    }

    // 测试更新订阅
    const subId = subscriptions[0].id;
    const updateSubResult = ConfigApi.updateSubscription(subId, {
      name: 'Updated Test Subscription'
    });

    if (updateSubResult.success) {
      console.log('  ✅ 更新订阅成功');
    } else {
      throw new Error(`更新订阅失败: ${updateSubResult.message}`);
    }

    // 测试删除订阅
    const deleteSubResult = ConfigApi.deleteSubscription(subId);
    if (deleteSubResult.success) {
      console.log('  ✅ 删除订阅成功');
    } else {
      throw new Error(`删除订阅失败: ${deleteSubResult.message}`);
    }
  }

  /**
   * 测试代理组管理
   */
  private static async testGroupManagement(): Promise<void> {
    console.log('👥 测试代理组管理...');

    // 测试添加代理组
    const addGroupResult = ConfigApi.addGroup({
      name: 'Test Group',
      type: 'select',
      proxies: [],
      enabled: true
    });

    if (addGroupResult.success) {
      console.log('  ✅ 添加代理组成功');
    } else {
      throw new Error(`添加代理组失败: ${addGroupResult.message}`);
    }

    // 测试获取代理组列表
    const groups = ConfigApi.getGroups();
    if (groups.length > 0) {
      console.log('  ✅ 获取代理组列表成功');
    } else {
      throw new Error('代理组列表为空');
    }

    // 测试更新代理组
    const groupId = groups[0].id;
    const updateGroupResult = ConfigApi.updateGroup(groupId, {
      name: 'Updated Test Group'
    });

    if (updateGroupResult.success) {
      console.log('  ✅ 更新代理组成功');
    } else {
      throw new Error(`更新代理组失败: ${updateGroupResult.message}`);
    }

    // 测试删除代理组
    const deleteGroupResult = ConfigApi.deleteGroup(groupId);
    if (deleteGroupResult.success) {
      console.log('  ✅ 删除代理组成功');
    } else {
      throw new Error(`删除代理组失败: ${deleteGroupResult.message}`);
    }
  }

  /**
   * 测试配置验证
   */
  private static async testConfigValidation(): Promise<void> {
    console.log('🔍 测试配置验证...');

    // 测试有效设置验证
    const validSettingsResult = ConfigApi.validateSettings({
      proxyPort: 7890,
      socksPort: 7891,
      mixedPort: 7890
    });

    if (validSettingsResult.success) {
      console.log('  ✅ 有效设置验证通过');
    } else {
      throw new Error(`有效设置验证失败: ${validSettingsResult.message}`);
    }

    // 测试无效设置验证
    const invalidSettingsResult = ConfigApi.validateSettings({
      proxyPort: 99999 // 无效端口
    });

    if (!invalidSettingsResult.success) {
      console.log('  ✅ 无效设置验证正确拒绝');
    } else {
      throw new Error('无效设置验证应该失败');
    }

    // 测试有效服务器验证
    const validServerResult = ConfigApi.validateServer({
      name: 'Test Server',
      protocol: ProxyProtocol.VMESS,
      host: 'test.example.com',
      port: 443,
      uuid: 'test-uuid-123'
    });

    if (validServerResult.success) {
      console.log('  ✅ 有效服务器验证通过');
    } else {
      throw new Error(`有效服务器验证失败: ${validServerResult.message}`);
    }

    // 测试无效服务器验证
    const invalidServerResult = ConfigApi.validateServer({
      name: '', // 空名称
      protocol: ProxyProtocol.VMESS,
      host: 'test.example.com',
      port: 443
      // 缺少UUID
    });

    if (!invalidServerResult.success) {
      console.log('  ✅ 无效服务器验证正确拒绝');
    } else {
      throw new Error('无效服务器验证应该失败');
    }
  }

  /**
   * 测试配置导入导出
   */
  private static async testConfigImportExport(): Promise<void> {
    console.log('📤📥 测试配置导入导出...');

    // 测试JSON导出
    const jsonExportResult = ConfigApi.exportConfig('json');
    if (jsonExportResult.success) {
      console.log('  ✅ JSON导出成功');
    } else {
      throw new Error(`JSON导出失败: ${jsonExportResult.message}`);
    }

    // 测试YAML导出
    const yamlExportResult = ConfigApi.exportConfig('yaml');
    if (yamlExportResult.success) {
      console.log('  ✅ YAML导出成功');
    } else {
      throw new Error(`YAML导出失败: ${yamlExportResult.message}`);
    }

    // 测试Clash导出
    const clashExportResult = ConfigApi.exportConfig('clash');
    if (clashExportResult.success) {
      console.log('  ✅ Clash导出成功');
    } else {
      throw new Error(`Clash导出失败: ${clashExportResult.message}`);
    }

    // 测试V2Ray导出
    const v2rayExportResult = ConfigApi.exportConfig('v2ray');
    if (v2rayExportResult.success) {
      console.log('  ✅ V2Ray导出成功');
    } else {
      throw new Error(`V2Ray导出失败: ${v2rayExportResult.message}`);
    }

    // 测试Sing-box导出
    const singboxExportResult = ConfigApi.exportConfig('singbox');
    if (singboxExportResult.success) {
      console.log('  ✅ Sing-box导出成功');
    } else {
      throw new Error(`Sing-box导出失败: ${singboxExportResult.message}`);
    }

    // 测试JSON导入
    const jsonImportResult = ConfigApi.importConfig(jsonExportResult.data!, 'json');
    if (jsonImportResult.success) {
      console.log('  ✅ JSON导入成功');
    } else {
      throw new Error(`JSON导入失败: ${jsonImportResult.message}`);
    }

    // 测试自动检测导入
    const autoImportResult = ConfigApi.autoImportConfig(jsonExportResult.data!);
    if (autoImportResult.success) {
      console.log('  ✅ 自动检测导入成功');
    } else {
      throw new Error(`自动检测导入失败: ${autoImportResult.message}`);
    }

    // 测试生成文件名
    const fileName = ConfigApi.generateExportFileName('json');
    if (fileName.includes('chongdong_config_') && fileName.endsWith('.json')) {
      console.log('  ✅ 文件名生成成功');
    } else {
      throw new Error('文件名生成失败');
    }
  }

  /**
   * 测试事件监听
   */
  private static async testEventListeners(): Promise<void> {
    console.log('👂 测试事件监听...');

    let eventReceived = false;

    // 添加事件监听器
    const listener = () => {
      eventReceived = true;
      console.log('  ✅ 事件监听器被触发');
    };

    ConfigApi.addEventListener(AppEvent.SETTINGS_CHANGED, listener);

    // 触发事件
    ConfigApi.updateSettings({ theme: 'light' });

    // 等待事件处理
    await new Promise(resolve => setTimeout(resolve, 100));

    if (eventReceived) {
      console.log('  ✅ 事件监听测试通过');
    } else {
      throw new Error('事件监听器未被触发');
    }

    // 移除事件监听器
    ConfigApi.removeEventListener(AppEvent.SETTINGS_CHANGED, listener);
  }
}

// 导出测试类
export default ConfigTest;
