import React, { useState, useEffect } from 'react';
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
  ColorPicker,
  Slider,
  Radio,
  Checkbox,
  Upload,
  message,
  Row,
  Col,
  List,
  Avatar,
  Tag,
  Tooltip,
  Badge,
  Modal,
  Tabs,
  Collapse,
  Descriptions,
  Statistic,
  Progress,
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
  ExportOutlined,
  ImportOutlined,
  DeleteOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
  KeyOutlined,
  UserOutlined,
  GlobalOutlined,
  WifiOutlined,
  ThunderboltOutlined,
  CloudOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  SecurityScanOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import { AppSettings, UserPreferences } from '../../shared/types/index';
import { log } from '../utils/logger';
import ConfigApi from '../utils/configApi';
import { Storage, STORAGE_KEYS } from '../utils/storage';
import CoreManager from '../components/CoreManager';
import { CoreStatus } from '../utils/coreManager';
import { windowManager } from '../utils/windowManager';
import './Settings.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [form] = Form.useForm();
  const [preferencesForm] = Form.useForm();
  const [networkForm] = Form.useForm();
  const [securityForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [coresStatus, setCoresStatus] = useState<CoreStatus>({ 
    singbox: false, 
    xray: false, 
    clash: false,
    geoip: false,
    geosite: false
  });
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'auto',
    language: 'zh-CN',
    autoStart: false,
    systemProxy: true,
    proxyPort: 7890,
    socksPort: 7891,
    mixedPort: 7890,
    allowLan: false,
    mode: 'rule',
    logLevel: 'info',
    enableLog: true,
    logFile: 'chongdong.log',
    enableUdp: true,
    enableIpv6: false,
    enableTun: false,
    tunDevice: 'utun0',
    enableFakeIp: true,
    fakeIpRange: '198.18.0.1/16',
    enableDns: true,
    dnsServer: '8.8.8.8',
    enableDoh: false,
    dohServer: 'https://dns.google/dns-query'
  });

  const [preferences, setPreferences] = useState<UserPreferences>({
    windowSize: { width: 1200, height: 800 },
    windowPosition: { x: 100, y: 100 },
    sidebarCollapsed: false,
    autoHideMenuBar: false,
    alwaysOnTop: false,
    minimizeToTray: true,
    startMinimized: false,
    enableNotifications: true,
    notificationSound: true,
    enableHotkeys: true,
    hotkeys: {
      toggleProxy: 'Ctrl+Shift+P',
      showMainWindow: 'Ctrl+Shift+M',
      quickSwitch: 'Ctrl+Shift+S'
    }
  });

  // 加载已保存的设置
  useEffect(() => {
    loadSavedSettings();
  }, []);

  const loadSavedSettings = async () => {
    try {
      // 加载应用设置
      const savedSettings = Storage.get<AppSettings>(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...savedSettings }));
        form.setFieldsValue(savedSettings);
        networkForm.setFieldsValue(savedSettings);
        securityForm.setFieldsValue(savedSettings);
      }

      // 加载用户偏好设置
      const savedPreferences = Storage.get<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES);
      if (savedPreferences) {
        setPreferences(prev => ({ ...prev, ...savedPreferences }));
        preferencesForm.setFieldsValue(savedPreferences);
        
        // 应用窗口设置
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
      
      // 保存应用设置
      const newSettings = { ...settings, ...settingsValues };
      Storage.set(STORAGE_KEYS.SETTINGS, newSettings);
      setSettings(newSettings);
      
      // 保存用户偏好设置
      const newPreferences = { ...preferences, ...preferencesValues };
      Storage.set(STORAGE_KEYS.USER_PREFERENCES, newPreferences);
      setPreferences(newPreferences);
      
      // 保存网络和安全设置到应用设置中
      const allSettings = { ...newSettings, ...networkValues, ...securityValues };
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
        }
      } catch (error) {
        log.warn('通知主进程设置更新失败', error, 'Settings');
      }
      
      message.success('所有设置已保存');
      log.info('保存所有设置', { 
        settings: settingsValues, 
        preferences: preferencesValues,
        network: networkValues,
        security: securityValues
      }, 'Settings');
    } catch (error) {
      message.error('保存设置失败');
      log.error('保存设置失败', error, 'Settings');
    } finally {
      setLoading(false);
    }
  };

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
    setSettings({
      theme: 'auto',
      language: 'zh-CN',
      autoStart: false,
      systemProxy: true,
      proxyPort: 7890,
      socksPort: 7891,
      mixedPort: 7890,
      allowLan: false,
      mode: 'rule',
      logLevel: 'info',
      enableLog: true,
      logFile: 'chongdong.log',
      enableUdp: true,
      enableIpv6: false,
      enableTun: false,
      tunDevice: 'utun0',
      enableFakeIp: true,
      fakeIpRange: '198.18.0.1/16',
      enableDns: true,
      dnsServer: '8.8.8.8',
      enableDoh: false,
      dohServer: 'https://dns.google/dns-query'
    });
    setPreferences({
      windowSize: { width: 1200, height: 800 },
      windowPosition: { x: 100, y: 100 },
      sidebarCollapsed: false,
      autoHideMenuBar: false,
      alwaysOnTop: false,
      minimizeToTray: true,
      startMinimized: false,
      enableNotifications: true,
      notificationSound: true,
      enableHotkeys: true,
      hotkeys: {
        toggleProxy: 'Ctrl+Shift+P',
        showMainWindow: 'Ctrl+Shift+M',
        quickSwitch: 'Ctrl+Shift+S'
      }
    });
    
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
      const result = await window.api.notification.test();
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
      const result = await window.api.notification.checkPermission();
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

      const result = await window.api.hotkeys.register(hotkeys);
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
          const result = await window.api.hotkeys.validate(shortcut);
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
              <Form.Item name="mode" label="代理模式">
                <Select>
                  <Option value="rule">规则模式</Option>
                  <Option value="global">全局模式</Option>
                  <Option value="direct">直连模式</Option>
                </Select>
              </Form.Item>

              <Form.Item name="externalController" label="外部控制器地址">
                <Input placeholder="127.0.0.1:9090" />
              </Form.Item>

              <Form.Item name="secret" label="API密钥">
                <Input.Password placeholder="留空则不设置密钥" />
              </Form.Item>
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
              description="请确保API密钥的安全性，建议设置强密码。"
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Form form={securityForm} layout="vertical">
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
            <Form form={networkForm} layout="vertical">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="enableDns" label="启用DNS" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="enableDoh" label="启用DoH" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="dnsServer" label="DNS服务器">
                <Input placeholder="8.8.8.8" />
              </Form.Item>

              <Form.Item name="dohServer" label="DoH服务器">
                <Input placeholder="https://dns.google/dns-query" />
              </Form.Item>
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
              <CloudOutlined />
              核心管理
            </span>
          }
          key="core"
        >
          <CoreManager onCoreStatusChange={setCoresStatus} />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Settings;

