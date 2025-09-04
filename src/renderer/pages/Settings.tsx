import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Form,
  Switch,
  Input,
  Button,
  Space,
  Typography,
  Divider,
  Alert,
  Select,
  InputNumber,
  Upload,
  message,
  Row,
  Col,
  Badge,
  Descriptions,
  Tabs,
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
  ExportOutlined,
  ImportOutlined,
  KeyOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  CloudOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  SecurityScanOutlined,
  DesktopOutlined,
  ExperimentOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import { AppSettings, UserPreferences } from '../../shared/types/index';
import { log } from '../utils/logger';
import ConfigApi from '../utils/configApi';
import { Storage, STORAGE_KEYS } from '../utils/storage';
import CoreManager from '../components/CoreManager';
import { windowManager } from '../utils/windowManager';
import { DefaultSettings } from '../utils/defaultSettings';
import ErrorMonitor from '../components/ErrorMonitor';
import { proxyModeManager } from '../utils/proxyModeManager';
import './Settings.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const Settings: React.FC = () => {
  const { toggleTheme } = useTheme();
  const [form] = Form.useForm();
  const [preferencesForm] = Form.useForm();
  const [networkForm] = Form.useForm();
  const [securityForm] = Form.useForm();
  const [engineForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const networkSettingsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [settings, setSettings] = useState<AppSettings>(DefaultSettings.getDefaultAppSettings());

  const [preferences, setPreferences] = useState<UserPreferences>(DefaultSettings.getDefaultUserPreferences());

  // DNS测试相关状态
  const [dnsTestLoading, setDnsTestLoading] = useState(false);
  const [dnsLeakCheckLoading, setDnsLeakCheckLoading] = useState(false);
  const [dnsTestResult, setDnsTestResult] = useState<string>('');
  const [dnsLeakResult, setDnsLeakResult] = useState<string>('');
  const [dnsLeakDetected, setDnsLeakDetected] = useState(false);

  // 代理模式相关状态
  const [proxyModeLoading, setProxyModeLoading] = useState(false);
  const [currentProxyMode, setCurrentProxyMode] = useState<string>('rule');
  const [vpnStatus, setVpnStatus] = useState<{ connected: boolean; error?: string }>({ connected: false });

  // 加载已保存的设置
  useEffect(() => {
    loadSavedSettings();
    loadCurrentProxyMode();
  }, []);

  // 加载当前代理模式
  const loadCurrentProxyMode = async () => {
    try {
      const { mode } = await proxyModeManager.getCurrentMode();
      setCurrentProxyMode(mode);
      
      // 如果是VPN模式，检查VPN状态
      if (mode === 'vpn') {
        const status = await proxyModeManager.checkVpnStatus();
        setVpnStatus(status);
      }
    } catch (error) {
      console.error('加载当前代理模式失败:', error);
    }
  };

  // 应用代理模式
  const handleApplyProxyMode = async (mode: string) => {
    setProxyModeLoading(true);
    try {
      const result = await proxyModeManager.applyProxyMode(
        mode as 'rule' | 'global' | 'direct' | 'vpn',
        settings
      );

      if (result.success) {
        setCurrentProxyMode(mode);
        message.success(result.message);
        
        // 如果是VPN模式，检查VPN状态
        if (mode === 'vpn') {
          const status = await proxyModeManager.checkVpnStatus();
          setVpnStatus(status);
        }
      } else {
        message.error(result.message);
      }
    } catch (error) {
      console.error('应用代理模式失败:', error);
      message.error('应用代理模式失败');
    } finally {
      setProxyModeLoading(false);
    }
  };

  // 断开VPN连接
  const handleDisconnectVpn = async () => {
    try {
      const result = await proxyModeManager.disconnectVpn();
      if (result.success) {
        setCurrentProxyMode('rule');
        setVpnStatus({ connected: false });
        message.success(result.message);
      } else {
        message.error(result.message);
      }
    } catch (error) {
      console.error('断开VPN连接失败:', error);
      message.error('断开VPN连接失败');
    }
  };

  const loadSavedSettings = async () => {
    try {
      // 尝试从新的存储键加载设置
      let savedSettings = Storage.get<AppSettings>(STORAGE_KEYS.SETTINGS);
      
      // 如果没有找到，尝试从旧的存储键加载（迁移兼容）
      if (!savedSettings) {
        const oldSettings = Storage.get<AppSettings>('settings');
        if (oldSettings) {
          // 迁移旧设置到新的存储键
          savedSettings = oldSettings;
          Storage.set(STORAGE_KEYS.SETTINGS, oldSettings);
          Storage.remove('settings'); // 删除旧的存储键
          console.log('已迁移旧设置到新的存储键');
        }
      }
      
      // 处理引擎设置的迁移（修复 sing-box 到 singbox）
      if (savedSettings && (savedSettings.proxyEngine as any) === 'sing-box') {
        savedSettings.proxyEngine = 'singbox';
        Storage.set(STORAGE_KEYS.SETTINGS, savedSettings);
        console.log('已修复引擎设置：sing-box -> singbox');
      }
      
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...savedSettings }));
        form.setFieldsValue(savedSettings);
        networkForm.setFieldsValue(savedSettings);
        securityForm.setFieldsValue(savedSettings);
        // Special handling for engineForm to stringify engineSettings
        engineForm.setFieldsValue({
          ...savedSettings,
          engineSettings: savedSettings.engineSettings 
            ? JSON.stringify(savedSettings.engineSettings, null, 2) 
            : ''
        });
      }

      const savedPreferences = Storage.get<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES);
      if (savedPreferences) {
        setPreferences(prev => ({ ...prev, ...savedPreferences }));
        preferencesForm.setFieldsValue(savedPreferences);
        await applyWindowSettings(savedPreferences);
      }

      log.info('加载已保存的设置', { settings: savedSettings, preferences: savedPreferences }, 'Settings');
    } catch (error) {
      log.error('加载设置失败', error, 'Settings');
    }
  };

  const handleSaveSettings = async (values: any) => {
    setLoading(true);
    try {
      const newSettings = { ...settings, ...values };
      
      // 保存到本地存储
      Storage.set(STORAGE_KEYS.SETTINGS, newSettings);
      
      // 更新状态
      setSettings(newSettings);
      
      message.success('设置已保存');
      log.info('保存应用设置', values, 'Settings');
    } catch (error) {
      message.error('保存设置失败');
      log.error('保存设置失败', error, 'Settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async (values: any) => {
    setLoading(true);
    try {
      const newPreferences = { ...preferences, ...values };
      
      // 保存到本地存储
      Storage.set(STORAGE_KEYS.USER_PREFERENCES, newPreferences);
      
      // 更新状态
      setPreferences(newPreferences);
      
      message.success('偏好设置已保存');
      log.info('保存用户偏好设置', values, 'Settings');
    } catch (error) {
      message.error('保存偏好设置失败');
      log.error('保存偏好设置失败', error, 'Settings');
    } finally {
      setLoading(false);
    }
  };

  // 统一的保存处理函数
  const handleSaveAll = async () => {
    setLoading(true);
    try {
      // 获取所有表单的值
      const settingsValues = await form.validateFields();
      const preferencesValues = await preferencesForm.validateFields();
      const networkValues = await networkForm.validateFields().catch(() => ({}));
      const securityValues = await securityForm.validateFields().catch(() => ({}));
      const engineValues = await engineForm.validateFields().catch(() => ({}));
      
      // 在这里转换 engineSettings
      if (engineValues.engineSettings && typeof engineValues.engineSettings === 'string') {
        try {
          engineValues.engineSettings = JSON.parse(engineValues.engineSettings);
        } catch (e) {
          message.error('引擎特定配置不是有效的JSON格式，请检查！');
          log.error('无效的引擎配置JSON', e, 'Settings');
          setLoading(false);
          return; // 阻止保存
        }
      } else if (!engineValues.engineSettings) {
        engineValues.engineSettings = {}; // 确保它是一个对象
      }

      // 保存应用设置
      const newSettings = { ...settings, ...settingsValues };
      Storage.set(STORAGE_KEYS.SETTINGS, newSettings);
      setSettings(newSettings);
      
      // 保存用户偏好设置
      const newPreferences = { ...preferences, ...preferencesValues };
      Storage.set(STORAGE_KEYS.USER_PREFERENCES, newPreferences);
      setPreferences(newPreferences);
      
      // 保存网络和安全设置到应用设置中
      const allSettings = { ...newSettings, ...networkValues, ...securityValues, ...engineValues };
      Storage.set(STORAGE_KEYS.SETTINGS, allSettings);
      setSettings(allSettings);
      
      // 实时应用窗口设置
      await applyWindowSettings(newPreferences);
      
      // 通知主进程设置已更新
      try {
        const result = await window.electron.ipcRenderer.invoke('settings:updated', {
          settings: allSettings,
          preferences: newPreferences
        });
        if (result.success) {
          log.info('设置已成功保存到主进程', null, 'Settings');
        } else {
          log.warn('主进程保存设置失败', result.error, 'Settings');
          message.warning('部分设置应用失败，请检查代理状态');
        }
      } catch (error) {
        log.warn('通知主进程设置更新失败', error, 'Settings');
        message.warning('设置保存成功，但应用失败，请检查代理状态');
      }
      
      message.success('所有设置已保存');
      log.info('保存所有设置', { settings: allSettings, preferences: newPreferences }, 'Settings');
    } catch (error) {
      message.error('保存设置失败');
      log.error('保存设置失败', error, 'Settings');
    } finally {
      setLoading(false);
    }
  };

  // 网络设置变更处理
  const handleNetworkSettingsChange = async (changedValues: any, allValues: any) => {
    try {
      // 检查是否是网络相关的设置变更
      const networkKeys = [
        'enableDns', 'dnsServer', 'enableDoh', 'dohServer', 'enableDot', 'dotServer',
        'enableDnsCache', 'dnsCacheSize', 'dnsCacheTtl', 'enableDnsLoadBalance', 'dnsServers',
        'enableDnsLogging', 'enableDnsLeakProtection', 'dnsLeakProtectionMode',
        'enableDnsRules', 'dnsRules', 'enableDnsFallback', 'dnsFallbackServers',
        'enableTun', 'tunDevice', 'enableFakeIp', 'fakeIpRange',
        'enableUdp', 'enableIpv6', 'logLevel', 'enableLog', 'logFile',
        // 兼容端口（让未跟随系统代理的应用可用固定端口）
        'enableCompatProxy', 'compatHttpPort', 'compatSocksPort',
        // 延迟测试相关设置
        'latencyTestUrl', 'latencyTestTimeout', 'latencyTestRetries', 
        'latencyTestInterval', 'enableAutoLatencyTest', 'latencyTestConcurrency', 'latencyTestUrls'
      ];
      
      const hasNetworkChanges = Object.keys(changedValues).some(key => networkKeys.includes(key));
      
      if (hasNetworkChanges) {
        // 更新本地设置
        const newSettings = { ...settings, ...allValues };
        setSettings(newSettings);
        
        // 如果是延迟测试配置变更，更新延迟测试器配置
        const latencyTestKeys = [
          'latencyTestUrl', 'latencyTestTimeout', 'latencyTestRetries', 
          'latencyTestInterval', 'latencyTestConcurrency'
        ];
        const hasLatencyTestChanges = Object.keys(changedValues).some(key => latencyTestKeys.includes(key));
        
        if (hasLatencyTestChanges) {
          const { latencyTester } = await import('../utils/latencyTester');
          latencyTester.updateConfig({
            testUrl: allValues.latencyTestUrl || 'http://connectivitycheck.gstatic.com/generate_204',
            timeout: allValues.latencyTestTimeout || 10000,
            retries: allValues.latencyTestRetries || 3,
            testInterval: (allValues.latencyTestInterval || 10) * 60 * 1000 // 转换为毫秒
          });
        }
        
        // 使用防抖机制，避免频繁调用
        if (networkSettingsTimeoutRef.current) {
          clearTimeout(networkSettingsTimeoutRef.current);
        }
        
        networkSettingsTimeoutRef.current = setTimeout(async () => {
          try {
            // 通知主进程网络设置已更新
            const result = await window.electron.ipcRenderer.invoke('settings:updated', {
              settings: newSettings,
              preferences: preferences
            });
            
            if (result.success) {
              log.info('网络设置已实时应用', changedValues, 'Settings');
            } else {
              log.warn('网络设置应用失败', result.error, 'Settings');
              message.warning('网络设置应用失败，请检查代理状态');
            }
          } catch (error) {
            log.warn('网络设置应用失败', error, 'Settings');
            message.warning('网络设置应用失败，请检查代理状态');
          }
        }, 1000); // 1秒防抖
      }
    } catch (error) {
      log.error('处理网络设置变更失败', error, 'Settings');
    }
  };

  // DNS测试处理函数
  const handleTestDns = async () => {
    setDnsTestLoading(true);
    setDnsTestResult('');
    try {
      if (!settings?.dnsServer) {
        message.error('请先设置主DNS服务器');
        return;
      }
      const result = await window.api.dns.testDnsQuery('www.google.com', settings.dnsServer);

      if (result.success && result.result.success) {
        setDnsTestResult(
          `DNS查询成功!\n` +
          `IP地址: ${result.result.ip}\n` +
          `响应时间: ${result.result.responseTime}ms`
        );
      } else {
        setDnsTestResult(`DNS查询失败: ${result.result.error || '未知错误'}`);
      }
    } catch (error) {
      setDnsTestResult(`DNS测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setDnsTestLoading(false);
    }
  };

  const handleCheckDnsLeak = async () => {
    setDnsLeakCheckLoading(true);
    setDnsLeakResult('');
    setDnsLeakDetected(false);
    try {
      const result = await window.api.dns.checkDnsLeak();

      if (result.success) {
        const leakCheckResult = result.result;
        if (leakCheckResult.leaked) {
          setDnsLeakDetected(true);
          setDnsLeakResult(`检测到DNS泄露!\n${leakCheckResult.details.join('\n')}`);
        } else {
          setDnsLeakResult(`DNS泄露检查通过!\n${leakCheckResult.details.join('\n')}`);
        }
      } else {
        setDnsLeakResult(`DNS泄露检查失败: ${result.error || '未知错误'}`);
      }
    } catch (error) {
      setDnsLeakResult(`DNS泄露检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setDnsLeakCheckLoading(false);
    }
  };

  const handleClearDnsCache = async () => {
    try {
      await window.api.dns.clearDnsCache();
      message.success('DNS缓存已清除');
    } catch (error) {
      message.error('清除DNS缓存失败');
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (networkSettingsTimeoutRef.current) {
        clearTimeout(networkSettingsTimeoutRef.current);
      }
    };
  }, []);

  // 应用窗口设置
  const applyWindowSettings = async (preferences: UserPreferences) => {
    try {
      // 应用窗口置顶设置
      if (preferences.alwaysOnTop !== undefined) {
        const success = await windowManager.setAlwaysOnTop(preferences.alwaysOnTop);
        if (success) {
          log.info('窗口置顶设置已应用', { alwaysOnTop: preferences.alwaysOnTop }, 'Settings');
        } else {
          log.warn('窗口置顶设置应用失败', { alwaysOnTop: preferences.alwaysOnTop }, 'Settings');
        }
      }

      // 应用菜单栏自动隐藏设置
      if (preferences.autoHideMenuBar !== undefined) {
        const success = await windowManager.setAutoHideMenuBar(preferences.autoHideMenuBar);
        if (success) {
          log.info('菜单栏自动隐藏设置已应用', { autoHideMenuBar: preferences.autoHideMenuBar }, 'Settings');
        } else {
          log.warn('菜单栏自动隐藏设置应用失败', { autoHideMenuBar: preferences.autoHideMenuBar }, 'Settings');
        }
      }
    } catch (error) {
      log.error('应用窗口设置失败', error, 'Settings');
    }
  };

  const handleResetSettings = () => {
    // 清除存储的设置
    Storage.remove(STORAGE_KEYS.SETTINGS);
    Storage.remove(STORAGE_KEYS.USER_PREFERENCES);
    
    // 重置表单和状态
    form.resetFields();
    preferencesForm.resetFields();
    networkForm.resetFields();
    securityForm.resetFields();
    engineForm.resetFields();
    
    // 使用统一的默认设置
    const defaultSettings = DefaultSettings.getDefaultAppSettings();
    const defaultPreferences = DefaultSettings.getDefaultUserPreferences();
    
    setSettings(defaultSettings);
    setPreferences(defaultPreferences);
    
    message.info('设置已重置为默认值');
    log.info('重置应用设置', null, 'Settings');
  };

  const handleExportConfig = async (format: string) => {
    try {
      const result = ConfigApi.exportConfig(format);
      if (result.success) {
        // 创建下载链接
        const blob = new Blob([result.data!], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = ConfigApi.generateExportFileName(format);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        message.success(`${format.toUpperCase()}配置导出成功`);
      } else {
        message.error(`导出失败: ${result.message}`);
      }
    } catch (error) {
      message.error('导出配置失败');
      log.error('导出配置失败', error, 'Settings');
    }
  };

  const handleImportConfig = async (file: File) => {
    try {
      const content = await file.text();
      const result = ConfigApi.autoImportConfig(content);
      if (result.success) {
        message.success('配置导入成功');
        // 重新加载设置
        const newSettings = ConfigApi.getSettings();
        setSettings(newSettings);
      } else {
        message.error(`导入失败: ${result.message}`);
      }
    } catch (error) {
      message.error('导入配置失败');
      log.error('导入配置失败', error, 'Settings');
    }
  };

  const handleResetConfig = async () => {
    try {
      const result = ConfigApi.resetConfig();
      if (result.success) {
        message.success('配置重置成功');
        // 重新加载设置
        const newSettings = ConfigApi.getSettings();
        setSettings(newSettings);
      } else {
        message.error(`重置失败: ${result.message}`);
      }
    } catch (error) {
      message.error('重置配置失败');
      log.error('重置配置失败', error, 'Settings');
    }
  };

  // 通知相关处理函数
  const handleTestNotification = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('notification:test');
      if (result.success) {
        message.success('测试通知发送成功');
      } else {
        message.error(`测试通知失败: ${result.error}`);
      }
    } catch (error) {
      message.error('测试通知失败');
      log.error('测试通知失败', error, 'Settings');
    }
  };

  const handleCheckNotificationPermission = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('notification:checkPermission');
      if (result.hasPermission) {
        message.success('通知权限正常');
      } else {
        message.warning('没有通知权限，请在系统设置中启用');
      }
    } catch (error) {
      message.error('检查通知权限失败');
      log.error('检查通知权限失败', error, 'Settings');
    }
  };

  // 快捷键相关处理函数
  const handleTestHotkeys = async () => {
    try {
      const hotkeys = preferencesForm.getFieldValue('hotkeys');
      if (!hotkeys) {
        message.warning('请先设置快捷键');
        return;
      }

      const result = await window.electron.ipcRenderer.invoke('hotkeys:register', hotkeys);
      if (result.success) {
        message.success('快捷键注册成功，请尝试使用快捷键');
      } else {
        if (result.conflicts && result.conflicts.length > 0) {
          message.error(`快捷键冲突: ${result.conflicts.join(', ')}`);
        } else {
          message.error(`快捷键注册失败: ${result.error}`);
        }
      }
    } catch (error) {
      message.error('测试快捷键失败');
      log.error('测试快捷键失败', error, 'Settings');
    }
  };

  const handleValidateHotkeys = async () => {
    try {
      const hotkeys = preferencesForm.getFieldValue('hotkeys');
      if (!hotkeys) {
        message.warning('请先设置快捷键');
        return;
      }

      const validationResults = [];
      for (const [action, shortcut] of Object.entries(hotkeys)) {
        if (shortcut) {
          const result = await window.electron.ipcRenderer.invoke('hotkeys:validate', shortcut);
          validationResults.push({
            action,
            shortcut,
            valid: result.valid,
            error: result.error
          });
        }
      }

      const invalidHotkeys = validationResults.filter(r => !r.valid);
      if (invalidHotkeys.length > 0) {
        const errorMessages = invalidHotkeys.map(h => `${h.action}: ${h.error}`).join(', ');
        message.error(`快捷键格式错误: ${errorMessages}`);
      } else {
        message.success('所有快捷键格式正确');
      }
    } catch (error) {
      message.error('验证快捷键失败');
      log.error('验证快捷键失败', error, 'Settings');
    }
  };

  // 延迟测试相关处理函数
  const handleTestLatencyConfig = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('latency:test');
      if (result.success) {
        message.success('延迟测试配置已应用，请检查日志');
      } else {
        message.error(`延迟测试配置应用失败: ${result.error}`);
      }
    } catch (error) {
      message.error('延迟测试配置应用失败');
      log.error('延迟测试配置应用失败', error, 'Settings');
    }
  };

  const handleResetLatencyConfig = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('latency:reset');
      if (result.success) {
        message.success('延迟测试配置已重置为默认值');
        // 重新加载设置
        const newSettings = ConfigApi.getSettings();
        setSettings(newSettings);
      } else {
        message.error(`延迟测试配置重置失败: ${result.error}`);
      }
    } catch (error) {
      message.error('延迟测试配置重置失败');
      log.error('延迟测试配置重置失败', error, 'Settings');
    }
  };

  // 监听代理重启失败事件
  useEffect(() => {
    const handleProxyRestartFailed = (data: { error: string }) => {
      message.error(`代理重启失败: ${data.error}`);
      log.error('代理重启失败', { error: data.error }, 'Settings');
    };

    window.electron.ipcRenderer.on('proxy:restartFailed', handleProxyRestartFailed);

    return () => {
      // 移除事件监听器
      window.electron.ipcRenderer.on('proxy:restartFailed', () => {});
    };
  }, []);

  return (
    <div className="settings-page">
      <div className="page-header">
        <Title level={2}>设置</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleResetSettings}>
            重置
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveAll}
            loading={loading}
          >
            保存
          </Button>
        </Space>
      </div>

      <Tabs defaultActiveKey="general" size="large">
        <TabPane
          tab={
            <span>
              <SettingOutlined />
              常规设置
            </span>
          }
          key="general"
        >
          <Card title="应用设置">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveSettings}
              initialValues={settings}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="autoStart" label="开机自启" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="systemProxy" label="系统代理" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="allowLan" label="允许局域网连接" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="enableIpv6" label="启用IPv6" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Title level={4}>端口设置</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="proxyPort"
                    label="HTTP端口"
                    rules={[{ required: true, message: '请输入HTTP端口' }]}
                  >
                    <InputNumber min={1024} max={65535} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="socksPort"
                    label="SOCKS端口"
                    rules={[{ required: true, message: '请输入SOCKS端口' }]}
                  >
                    <InputNumber min={1024} max={65535} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="mixedPort"
                    label="混合端口"
                    rules={[{ required: true, message: '请输入混合端口' }]}
                  >
                    <InputNumber min={1024} max={65535} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Title level={4}>代理模式</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="mode" label="代理模式">
                    <Select
                      loading={proxyModeLoading}
                      onChange={handleApplyProxyMode}
                      value={currentProxyMode}
                    >
                      <Option value="rule">
                        <Space>
                          <span>{proxyModeManager.getModeIcon('rule')}</span>
                          <span>规则模式</span>
                        </Space>
                      </Option>
                      <Option value="global">
                        <Space>
                          <span>{proxyModeManager.getModeIcon('global')}</span>
                          <span>全局模式</span>
                        </Space>
                      </Option>
                      <Option value="direct">
                        <Space>
                          <span>{proxyModeManager.getModeIcon('direct')}</span>
                          <span>直连模式</span>
                        </Space>
                      </Option>
                      <Option value="vpn">
                        <Space>
                          <span>{proxyModeManager.getModeIcon('vpn')}</span>
                          <span>VPN模式</span>
                        </Space>
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <div style={{ marginTop: 32 }}>
                    <Text type="secondary">
                      {proxyModeManager.getModeDescription(currentProxyMode)}
                    </Text>
                  </div>
                </Col>
              </Row>

              {/* VPN状态显示 */}
              {currentProxyMode === 'vpn' && (
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col span={24}>
                    <Card size="small" title="VPN状态">
                      <Row gutter={[16, 16]} align="middle">
                        <Col>
                          <Badge 
                            status={vpnStatus.connected ? 'success' : 'error'} 
                            text={vpnStatus.connected ? '已连接' : '未连接'} 
                          />
                        </Col>
                        <Col>
                          {vpnStatus.error && (
                            <Text type="danger">{vpnStatus.error}</Text>
                          )}
                        </Col>
                        <Col>
                          <Button 
                            size="small" 
                            danger 
                            onClick={handleDisconnectVpn}
                            disabled={!vpnStatus.connected}
                          >
                            断开VPN
                          </Button>
                        </Col>
                      </Row>
                      
                      {/* VPN配置提示 */}
                      <Alert
                        message="TUN模式说明"
                        description={
                          <div>
                            <p><strong>已切换为 TUN 模式（系统 utun 设备）。</strong></p>
                            <ul>
                              <li>macOS 首次启用会弹出系统管理员授权，用于创建 utun 设备。</li>
                              <li>TUN 将在 IP 层劫持系统流量，无需在系统里新建 VPN 配置。</li>
                              <li>启用后会自动路由（auto_route），并清空系统代理以避免冲突。</li>
                              <li>如需自定义设备名或 FakeIP 范围，请在下方“TUN设置”中配置。</li>
                              <li>若授权被拒绝，TUN 启动会失败，请重新启用并允许授权。</li>
                            </ul>
                            <p>提示：切换到“直连/规则/全局模式”时，TUN 将被禁用并恢复常规代理。</p>
                          </div>
                        }
                        type="info"
                        showIcon
                        style={{ marginTop: 16 }}
                      />
                    </Card>
                  </Col>
                </Row>
              )}

              <Divider />

              <Title level={4}>兼容性代理</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Form.Item name="enableCompatProxy" label="启用兼容端口" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="compatHttpPort" label="兼容HTTP端口">
                    <InputNumber min={1024} max={65535} placeholder={1080} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="compatSocksPort" label="兼容SOCKS端口">
                    <InputNumber min={1024} max={65535} placeholder={1080} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              {/* 移除外部控制器地址和API密钥，这些在TUN模式下不需要 */}
            </Form>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <SecurityScanOutlined />
              安全设置
            </span>
          }
          key="security"
        >
          <Card title="安全配置">
            <Alert
              message="安全提示"
              description="配置应用的安全相关设置，包括日志、UDP和外部API访问。"
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Form 
              form={securityForm} 
              layout="vertical"
              onValuesChange={handleNetworkSettingsChange}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="enableUdp" label="启用UDP" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="logLevel" label="日志级别">
                    <Select>
                      <Option value="debug">调试</Option>
                      <Option value="info">信息</Option>
                      <Option value="warn">警告</Option>
                      <Option value="error">错误</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="enableLog" label="启用日志" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="logFile" label="日志文件">
                    <Input placeholder="chongdong.log" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Title level={4}>外部API设置（高级）</Title>
              <Alert
                message="外部API说明"
                description="启用外部API允许其他工具（如Clash for Windows）通过HTTP API控制虫洞。仅在需要时启用。"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="enableExternalApi" label="启用外部API" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="externalController" label="外部控制器地址">
                    <Input placeholder="127.0.0.1:9090" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="secret" label="API密钥">
                    <Input.Password placeholder="留空则不设置密钥" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <GlobalOutlined />
              网络设置
            </span>
          }
          key="network"
        >
          <Card title="网络配置">
            <Title level={4}>DNS设置</Title>
            <Alert
              message="DNS安全提示"
              description="启用DNS安全功能可以防止DNS泄露，保护您的隐私。建议同时启用DoH/DoT和DNS泄露防护。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Form 
              form={networkForm} 
              layout="vertical"
              onValuesChange={handleNetworkSettingsChange}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Form.Item name="enableDns" label="启用DNS" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="enableDoh" label="启用DoH" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="enableDot" label="启用DoT" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="enableDnsCache" label="启用DNS缓存" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="enableDnsLoadBalance" label="DNS负载均衡" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="enableDnsLeakProtection" label="DNS泄露防护" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="enableDnsLogging" label="DNS查询日志" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="enableDnsRules" label="启用DNS规则" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="enableDnsFallback" label="DNS故障转移" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="dnsServer" label="主DNS服务器">
                <Input placeholder="8.8.8.8" />
              </Form.Item>

              <Form.Item name="dohServer" label="DoH服务器">
                <Input placeholder="https://dns.google/dns-query" />
              </Form.Item>

              <Form.Item name="dotServer" label="DoT服务器">
                <Input placeholder="tls://1.1.1.1:853" />
              </Form.Item>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="dnsCacheSize" label="DNS缓存大小">
                    <InputNumber min={100} max={10000} placeholder="1000" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="dnsCacheTtl" label="DNS缓存TTL(秒)">
                    <InputNumber min={60} max={3600} placeholder="300" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="dnsLeakProtectionMode" label="DNS泄露防护模式">
                <Select>
                  <Option value="strict">严格模式</Option>
                  <Option value="relaxed">宽松模式</Option>
                </Select>
              </Form.Item>

              <Divider />

              <Space>
                <Button 
                  type="primary" 
                  onClick={handleTestDns}
                  loading={dnsTestLoading}
                >
                  测试DNS配置
                </Button>
                <Button 
                  onClick={handleCheckDnsLeak}
                  loading={dnsLeakCheckLoading}
                >
                  检查DNS泄露
                </Button>
                <Button 
                  onClick={handleClearDnsCache}
                >
                  清除DNS缓存
                </Button>
              </Space>

              {dnsTestResult && (
                <Alert
                  message="DNS测试结果"
                  description={<pre style={{ margin: 0 }}>{dnsTestResult}</pre>}
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}

              {dnsLeakResult && (
                <Alert
                  message="DNS泄露检查结果"
                  description={<pre style={{ margin: 0 }}>{dnsLeakResult}</pre>}
                  type={dnsLeakDetected ? "error" : "success"}
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
            </Form>

            <Divider />

            <Title level={4}>TUN设置</Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item name="enableTun" label="启用TUN" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="tunDevice" label="TUN设备">
                  <Input placeholder="utun0" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item name="enableFakeIp" label="启用FakeIP" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="fakeIpRange" label="FakeIP范围">
                  <Input placeholder="198.18.0.1/16" />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Title level={4}>延迟测试设置</Title>
            <Alert
              message="延迟测试说明"
              description="配置节点延迟测试的相关参数，用于评估代理节点的网络性能。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item name="latencyTestUrl" label="连接测试网址">
                  <Input placeholder="http://connectivitycheck.gstatic.com/generate_204" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="latencyTestTimeout" label="测试超时时间(毫秒)">
                  <InputNumber 
                    min={1000} 
                    max={30000} 
                    step={1000}
                    placeholder="10000"
                    style={{ width: '100%' }} 
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item name="latencyTestRetries" label="测试重试次数">
                  <InputNumber 
                    min={1} 
                    max={5} 
                    step={1}
                    placeholder="3"
                    style={{ width: '100%' }} 
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="latencyTestInterval" label="自动测试间隔(分钟)">
                  <InputNumber 
                    min={1} 
                    max={60} 
                    step={1}
                    placeholder="10"
                    style={{ width: '100%' }} 
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="latencyTestValidityPeriod" label="延迟测试结果有效期(分钟)">
                  <InputNumber 
                    min={5} 
                    max={120} 
                    step={5}
                    placeholder="30"
                    style={{ width: '100%' }} 
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item name="enableAutoLatencyTest" label="启用自动延迟测试" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="latencyTestConcurrency" label="并发测试数量">
                  <InputNumber 
                    min={1} 
                    max={10} 
                    step={1}
                    placeholder="3"
                    style={{ width: '100%' }} 
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <Form.Item name="latencyTestUrls" label="备用测试网址(每行一个)">
                  <Input.TextArea 
                    rows={3}
                    placeholder="http://connectivitycheck.gstatic.com/generate_204&#10;http://www.google.com/generate_204&#10;http://www.baidu.com"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<ThunderboltOutlined />}
                    onClick={handleTestLatencyConfig}
                  >
                    测试延迟配置
                  </Button>
                  <Button 
                    icon={<ReloadOutlined />}
                    onClick={handleResetLatencyConfig}
                  >
                    重置为默认值
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <DesktopOutlined />
              界面设置
            </span>
          }
          key="interface"
        >
          <Card title="界面偏好">
            <Form
              form={preferencesForm}
              layout="vertical"
              onFinish={handleSavePreferences}
              initialValues={preferences}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="theme" label="主题">
                    <Select onChange={toggleTheme}>
                      <Option value="light">浅色主题</Option>
                      <Option value="dark">深色主题</Option>
                      <Option value="auto">跟随系统</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="language" label="语言">
                    <Select>
                      <Option value="zh-CN">简体中文</Option>
                      <Option value="en-US">English</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Title level={4}>窗口设置</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="sidebarCollapsed" label="侧边栏折叠" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="autoHideMenuBar" label="自动隐藏菜单栏" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="alwaysOnTop" label="窗口置顶" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="minimizeToTray" label="最小化到托盘" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="startMinimized" label="启动时最小化" valuePropName="checked">
                <Switch />
              </Form.Item>

              <Divider />

              <Title level={4}>通知设置</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="enableNotifications" label="启用通知" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="notificationSound" label="声音提醒" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Button 
                    type="dashed" 
                    onClick={handleTestNotification}
                    icon={<InfoCircleOutlined />}
                  >
                    测试通知
                  </Button>
                </Col>
                <Col xs={24} sm={12}>
                  <Button 
                    type="dashed" 
                    onClick={handleCheckNotificationPermission}
                    icon={<SecurityScanOutlined />}
                  >
                    检查权限
                  </Button>
                </Col>
              </Row>

              <Divider />

              <Title level={4}>快捷键设置</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="enableHotkeys" label="启用快捷键" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Form.Item name={['hotkeys', 'toggleProxy']} label="切换代理">
                    <Input placeholder="Ctrl+Shift+P" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name={['hotkeys', 'showMainWindow']} label="显示主窗口">
                    <Input placeholder="Ctrl+Shift+M" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name={['hotkeys', 'quickSwitch']} label="快速切换">
                    <Input placeholder="Ctrl+Shift+S" />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Button 
                    type="dashed" 
                    onClick={handleTestHotkeys}
                    icon={<KeyOutlined />}
                  >
                    测试快捷键
                  </Button>
                </Col>
                <Col xs={24} sm={12}>
                  <Button 
                    type="dashed" 
                    onClick={handleValidateHotkeys}
                    icon={<CheckCircleOutlined />}
                  >
                    验证快捷键
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <CloudOutlined />
              配置管理
            </span>
          }
          key="config"
        >
          <Card title="配置管理">
            <Alert
              message="配置管理"
              description="您可以导入、导出或重置应用配置。支持多种格式的配置文件。"
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card title="导出配置" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>选择导出格式：</Text>
                    <Space wrap>
                      <Button 
                        icon={<ExportOutlined />} 
                        onClick={() => handleExportConfig('json')}
                      >
                        导出JSON
                      </Button>
                      <Button 
                        icon={<ExportOutlined />} 
                        onClick={() => handleExportConfig('yaml')}
                      >
                        导出YAML
                      </Button>
                      <Button 
                        icon={<ExportOutlined />} 
                        onClick={() => handleExportConfig('clash')}
                      >
                        导出Clash
                      </Button>
                      <Button 
                        icon={<ExportOutlined />} 
                        onClick={() => handleExportConfig('v2ray')}
                      >
                        导出V2Ray
                      </Button>
                      <Button 
                        icon={<ExportOutlined />} 
                        onClick={() => handleExportConfig('singbox')}
                      >
                        导出Sing-box
                      </Button>
                    </Space>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card title="导入配置" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>选择配置文件：</Text>
                    <Upload
                      accept=".json,.yaml,.yml,.txt"
                      showUploadList={false}
                      beforeUpload={(file) => {
                        handleImportConfig(file);
                        return false;
                      }}
                    >
                      <Button icon={<ImportOutlined />}>
                        选择文件
                      </Button>
                    </Upload>
                    <Text type="secondary">
                      支持JSON、YAML、Clash、V2Ray、Sing-box格式
                    </Text>
                  </Space>
                </Card>
              </Col>
            </Row>

            <Divider />

            <Card title="配置操作" size="small">
              <Space>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={handleResetConfig}
                  danger
                >
                  重置所有配置
                </Button>
                <Text type="secondary">
                  警告：此操作将重置所有配置为默认值，无法撤销！
                </Text>
              </Space>
            </Card>

            <Divider />

            <Card title="配置信息" size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="配置版本">1.0.0</Descriptions.Item>
                <Descriptions.Item label="最后更新">{new Date().toLocaleString()}</Descriptions.Item>
                <Descriptions.Item label="代理服务器数量">
                  {ConfigApi.getServers().length}
                </Descriptions.Item>
                <Descriptions.Item label="订阅数量">
                  {ConfigApi.getSubscriptions().length}
                </Descriptions.Item>
                <Descriptions.Item label="代理组数量">
                  {ConfigApi.getGroups().length}
                </Descriptions.Item>
                <Descriptions.Item label="配置状态">
                  <Badge status="success" text="正常" />
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <ThunderboltOutlined />
              引擎设置
            </span>
          }
          key="engine"
        >
          <Card title="代理引擎配置">
            <Form
              form={engineForm}
              layout="vertical"
              initialValues={settings}
            >
              <Form.Item
                name="proxyEngine"
                label="代理引擎"
                rules={[{ required: true, message: '请选择一个代理引擎' }]}
              >
                <Select>
                  <Option value="xray">Xray</Option>
                  <Option value="clash">Clash</Option>
                  <Option value="singbox">Sing-box</Option>
                  <Option value="v2ray">V2Ray (depricated)</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="engineSettings"
                label="引擎特定配置 (JSON)"
                tooltip="此处的配置将作为命令行参数或特定配置文件内容传递给所选引擎。"
              >
                <Input.TextArea 
                  rows={10}
                  placeholder='例如：&#10;{&#10;  "apiPort": 9090,&#10;  "logLevel": "debug"&#10;}'
                />
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <CloudOutlined />
              核心管理
            </span>
          }
          key="core"
        >
          <CoreManager />
        </TabPane>

        <TabPane
          tab={
            <span>
              <SecurityScanOutlined />
              日志查看器
            </span>
          }
          key="errors"
        >
          <ErrorMonitor />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Settings;


