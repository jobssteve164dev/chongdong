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
import './Settings.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [form] = Form.useForm();
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

  const loadSavedSettings = () => {
    try {
      // 加载应用设置
      const savedSettings = Storage.get<AppSettings>(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...savedSettings }));
        form.setFieldsValue(savedSettings);
      }

      // 加载用户偏好设置
      const savedPreferences = Storage.get<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES);
      if (savedPreferences) {
        setPreferences(prev => ({ ...prev, ...savedPreferences }));
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

  const handleResetSettings = () => {
    // 清除存储的设置
    Storage.remove(STORAGE_KEYS.SETTINGS);
    Storage.remove(STORAGE_KEYS.USER_PREFERENCES);
    
    // 重置表单和状态
    form.resetFields();
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
            onClick={() => form.submit()}
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
                  <Form.Item name="ipv6" label="启用IPv6" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Title level={4}>端口设置</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="port"
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

            <Form layout="vertical">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="tcpConcurrent" label="TCP并发" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="findProcessMode" label="进程查找模式">
                    <Select>
                      <Option value="strict">严格模式</Option>
                      <Option value="normal">普通模式</Option>
                      <Option value="off">关闭</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="globalClientFingerprint" label="全局客户端指纹">
                <Select>
                  <Option value="chrome">Chrome</Option>
                  <Option value="firefox">Firefox</Option>
                  <Option value="safari">Safari</Option>
                  <Option value="random">随机</Option>
                </Select>
              </Form.Item>
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
            <Form layout="vertical">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="dns.enable" label="启用DNS" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="dns.listen" label="DNS监听地址">
                    <Input placeholder="0.0.0.0:53" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="dns.defaultNameserver" label="默认DNS服务器">
                <Select mode="tags" placeholder="输入DNS服务器地址">
                  <Option value="223.5.5.5">223.5.5.5</Option>
                  <Option value="119.29.29.29">119.29.29.29</Option>
                  <Option value="8.8.8.8">8.8.8.8</Option>
                </Select>
              </Form.Item>

              <Form.Item name="dns.nameserver" label="DNS服务器">
                <Select mode="tags" placeholder="输入DNS服务器地址">
                  <Option value="https://doh.pub/dns-query">https://doh.pub/dns-query</Option>
                  <Option value="https://dns.alidns.com/dns-query">https://dns.alidns.com/dns-query</Option>
                </Select>
              </Form.Item>
            </Form>

            <Divider />

            <Title level={4}>TUN设置</Title>
            <Form layout="vertical">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="tun.enable" label="启用TUN" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="tun.device" label="TUN设备">
                    <Input placeholder="utun0" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="tun.stack" label="网络栈">
                <Select>
                  <Option value="system">系统</Option>
                  <Option value="gvisor">gVisor</Option>
                </Select>
              </Form.Item>

              <Form.Item name="tun.autoRoute" label="自动路由" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Form>
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

              <Title level={4}>通知设置</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="notifications" label="启用通知" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="soundEnabled" label="声音提醒" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Title level={4}>托盘设置</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="showTrayIcon" label="显示托盘图标" valuePropName="checked">
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

              <Title level={4}>更新设置</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="autoUpdate" label="自动检查更新" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="checkUpdateInterval"
                    label="检查间隔（秒）"
                    rules={[{ required: true, message: '请输入检查间隔' }]}
                  >
                    <InputNumber min={3600} max={86400} style={{ width: '100%' }} />
                  </Form.Item>
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
