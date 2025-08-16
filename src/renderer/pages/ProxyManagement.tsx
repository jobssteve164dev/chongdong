import React, { useState, useEffect } from 'react';
import { Button, Card, Table, Tag, Switch, Modal, Form, Input, Select, message, Space, Tooltip, Progress } from 'antd';
import { PlayCircleOutlined, StopOutlined, SettingOutlined, PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { proxyEngine, ProxyConfig, ProxyStatus } from '../utils/proxyEngine';
import { systemProxy, ProxySettings } from '../utils/systemProxy';
import { chainProxyManager, ChainConfig } from '../utils/chainProxy';
import { Storage, STORAGE_KEYS } from '../utils/storage';
import './ProxyManagement.css';

const { Option } = Select;

interface ProxyManagementProps {
  // 可以添加props如果需要
}

const ProxyManagement: React.FC<ProxyManagementProps> = () => {
  const [proxyConfigs, setProxyConfigs] = useState<ProxyConfig[]>([]);
  const [chainConfigs, setChainConfigs] = useState<ChainConfig[]>([]);
  const [currentStatus, setCurrentStatus] = useState<ProxyStatus | null>(null);
  const [systemProxySettings, setSystemProxySettings] = useState<ProxySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [chainModalVisible, setChainModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ProxyConfig | null>(null);
  const [editingChain, setEditingChain] = useState<ChainConfig | null>(null);
  const [form] = Form.useForm();
  const [chainForm] = Form.useForm();

  // 加载配置
  useEffect(() => {
    loadConfigs();
    loadSystemProxy();
    startStatusPolling();
  }, []);

  const loadConfigs = async () => {
    try {
      // 从存储中加载代理配置
      const savedProxyConfigs = Storage.get<ProxyConfig[]>('proxy_configs', []) || [];
      const savedChainConfigs = Storage.get<ChainConfig[]>('chain_configs', []) || [];

      // 如果没有保存的配置，使用默认配置
      if (savedProxyConfigs.length === 0) {
        const defaultConfigs: ProxyConfig[] = [
          {
            id: '1',
            name: 'Sing-box 代理',
            type: 'singbox',
            config: {
              outbounds: [
                {
                  type: 'vmess',
                  tag: 'proxy-1',
                  server: 'example.com',
                  server_port: 443,
                  uuid: '12345678-1234-1234-1234-123456789012',
                  security: 'auto',
                  alter_id: 0,
                  network: 'ws',
                  ws_opts: {
                    path: '/path',
                    headers: {
                      Host: 'example.com'
                    }
                  }
                }
              ]
            },
            enabled: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        const defaultChains: ChainConfig[] = [
          {
            id: 'chain-1',
            name: '默认代理链',
            description: '包含多个代理的链式配置',
            proxies: ['1'],
            rules: [
              {
                id: 'rule-1',
                type: 'geoip',
                value: 'cn',
                action: 'direct',
                priority: 100
              }
            ],
            enabled: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        // 保存默认配置到存储
        Storage.set('proxy_configs', defaultConfigs);
        Storage.set('chain_configs', defaultChains);

        setProxyConfigs(defaultConfigs);
        setChainConfigs(defaultChains);
      } else {
        setProxyConfigs(savedProxyConfigs);
        setChainConfigs(savedChainConfigs);
      }
    } catch (error) {
      message.error('加载配置失败');
    }
  };

  // 保存代理配置到存储
  const saveProxyConfigs = (configs: ProxyConfig[]) => {
    try {
      Storage.set('proxy_configs', configs);
      setProxyConfigs(configs);
    } catch (error: unknown) {
      message.error('保存代理配置失败');
    }
  };

  // 保存代理链配置到存储
  const saveChainConfigs = (configs: ChainConfig[]) => {
    try {
      Storage.set('chain_configs', configs);
      setChainConfigs(configs);
    } catch (error: unknown) {
      message.error('保存代理链配置失败');
    }
  };

  const loadSystemProxy = async () => {
    try {
      const settings = await systemProxy.getSystemProxy();
      setSystemProxySettings(settings);
    } catch (error) {
      console.error('Failed to load system proxy:', error);
    }
  };

  const startStatusPolling = () => {
    const interval = setInterval(() => {
      const status = proxyEngine.getStatus();
      setCurrentStatus(status);
    }, 2000);

    return () => clearInterval(interval);
  };

  // 代理配置管理
  const handleStartProxy = async (config: ProxyConfig) => {
    setLoading(true);
    try {
      await proxyEngine.start(config);
      await systemProxy.setSystemProxy('127.0.0.1', 7890);
      message.success('代理启动成功');
      loadSystemProxy();
    } catch (error) {
      message.error(`启动失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopProxy = async () => {
    setLoading(true);
    try {
      await proxyEngine.stop();
      await systemProxy.clearSystemProxy();
      message.success('代理已停止');
      loadSystemProxy();
    } catch (error) {
      message.error(`停止失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (values: any) => {
    try {
      const config: ProxyConfig = {
        id: editingConfig?.id || `config_${Date.now()}`,
        name: values.name,
        type: values.type,
        config: values.config,
        enabled: false,
        createdAt: editingConfig?.createdAt || new Date(),
        updatedAt: new Date()
      };

      if (editingConfig) {
        // 更新配置
        const updatedConfigs = proxyConfigs.map(c => c.id === config.id ? config : c);
        saveProxyConfigs(updatedConfigs);
      } else {
        // 添加新配置
        saveProxyConfigs([...proxyConfigs, config]);
      }

      setModalVisible(false);
      setEditingConfig(null);
      form.resetFields();
      message.success('配置保存成功');
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleDeleteConfig = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个代理配置吗？',
      onOk: () => {
        const updatedConfigs = proxyConfigs.filter(c => c.id !== id);
        saveProxyConfigs(updatedConfigs);
        message.success('配置已删除');
      }
    });
  };

  // 代理链管理
  const handleSaveChain = async (values: any) => {
    try {
      const chain: ChainConfig = {
        id: editingChain?.id || `chain_${Date.now()}`,
        name: values.name,
        description: values.description,
        proxies: values.proxies || [],
        rules: values.rules || [],
        enabled: false,
        createdAt: editingChain?.createdAt || new Date(),
        updatedAt: new Date()
      };

      if (editingChain) {
        // 更新代理链
        const updatedChains = chainConfigs.map(c => c.id === chain.id ? chain : c);
        saveChainConfigs(updatedChains);
      } else {
        // 添加新代理链
        saveChainConfigs([...chainConfigs, chain]);
      }

      setChainModalVisible(false);
      setEditingChain(null);
      chainForm.resetFields();
      message.success('代理链保存成功');
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleDeleteChain = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个代理链吗？',
      onOk: () => {
        const updatedChains = chainConfigs.filter(c => c.id !== id);
        saveChainConfigs(updatedChains);
        message.success('代理链已删除');
      }
    });
  };

  // 表格列定义
  const proxyColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'singbox' ? 'blue' : type === 'xray' ? 'green' : 'orange'}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record: ProxyConfig) => (
        <Switch
          checked={currentStatus?.running && record.enabled}
          onChange={(checked) => {
            if (checked) {
              handleStartProxy(record);
            } else {
              handleStopProxy();
            }
          }}
          loading={loading}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: ProxyConfig) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingConfig(record);
                form.setFieldsValue(record);
                setModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="查看配置">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                Modal.info({
                  title: '配置详情',
                  content: (
                    <pre>{JSON.stringify(record.config, null, 2)}</pre>
                  ),
                  width: 600,
                });
              }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteConfig(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const chainColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '代理数量',
      key: 'proxyCount',
      render: (_, record: ChainConfig) => record.proxies.length,
    },
    {
      title: '规则数量',
      key: 'ruleCount',
      render: (_, record: ChainConfig) => record.rules.length,
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record: ChainConfig) => (
        <Switch
          checked={record.enabled}
          onChange={(checked) => {
            const updatedChains = chainConfigs.map(c =>
              c.id === record.id ? { ...c, enabled: checked } : c
            );
            saveChainConfigs(updatedChains);
          }}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: ChainConfig) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingChain(record);
                chainForm.setFieldsValue(record);
                setChainModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteChain(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="proxy-management">
      <div className="proxy-header">
        <h2>代理管理</h2>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingConfig(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            添加代理
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingChain(null);
              chainForm.resetFields();
              setChainModalVisible(true);
            }}
          >
            添加代理链
          </Button>
        </Space>
      </div>

      {/* 状态卡片 */}
      <div className="status-cards">
        <Card title="代理状态" className="status-card">
          <div className="status-content">
            <div className="status-item">
              <span>运行状态:</span>
              <Tag color={currentStatus?.running ? 'green' : 'red'}>
                {currentStatus?.running ? '运行中' : '已停止'}
              </Tag>
            </div>
            {currentStatus?.running && (
              <>
                <div className="status-item">
                  <span>运行时间:</span>
                  <span>{Math.floor((Date.now() - (currentStatus.uptime || 0)) / 1000)}秒</span>
                </div>
                <div className="status-item">
                  <span>连接数:</span>
                  <span>{currentStatus.connections}</span>
                </div>
                <div className="status-item">
                  <span>上传:</span>
                  <span>{(currentStatus.upload / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className="status-item">
                  <span>下载:</span>
                  <span>{(currentStatus.download / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card title="系统代理" className="status-card">
          <div className="status-content">
            <div className="status-item">
              <span>状态:</span>
              <Tag color={systemProxySettings?.enabled ? 'green' : 'red'}>
                {systemProxySettings?.enabled ? '已启用' : '未启用'}
              </Tag>
            </div>
            {systemProxySettings?.enabled && (
              <div className="status-item">
                <span>代理地址:</span>
                <span>{systemProxySettings.host}:{systemProxySettings.port}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 代理配置表格 */}
      <Card title="代理配置" className="config-card">
        <Table
          dataSource={proxyConfigs}
          columns={proxyColumns}
          rowKey="id"
          pagination={false}
        />
      </Card>

      {/* 代理链表格 */}
      <Card title="代理链配置" className="config-card">
        <Table
          dataSource={chainConfigs}
          columns={chainColumns}
          rowKey="id"
          pagination={false}
        />
      </Card>

      {/* 代理配置模态框 */}
      <Modal
        title={editingConfig ? '编辑代理配置' : '添加代理配置'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingConfig(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveConfig}
        >
          <Form.Item
            name="name"
            label="配置名称"
            rules={[{ required: true, message: '请输入配置名称' }]}
          >
            <Input placeholder="请输入配置名称" />
          </Form.Item>

          <Form.Item
            name="type"
            label="代理类型"
            rules={[{ required: true, message: '请选择代理类型' }]}
          >
            <Select placeholder="请选择代理类型">
              <Option value="singbox">Sing-box</Option>
              <Option value="xray">Xray</Option>
              <Option value="clash">Clash</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="config"
            label="配置内容"
            rules={[{ required: true, message: '请输入配置内容' }]}
          >
            <Input.TextArea
              rows={10}
              placeholder="请输入JSON格式的配置内容"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                setEditingConfig(null);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 代理链配置模态框 */}
      <Modal
        title={editingChain ? '编辑代理链' : '添加代理链'}
        open={chainModalVisible}
        onCancel={() => {
          setChainModalVisible(false);
          setEditingChain(null);
          chainForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={chainForm}
          layout="vertical"
          onFinish={handleSaveChain}
        >
          <Form.Item
            name="name"
            label="链名称"
            rules={[{ required: true, message: '请输入链名称' }]}
          >
            <Input placeholder="请输入链名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入描述信息"
            />
          </Form.Item>

          <Form.Item
            name="proxies"
            label="代理列表"
            rules={[{ required: true, message: '请选择代理' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择代理"
              options={proxyConfigs.map(p => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => {
                setChainModalVisible(false);
                setEditingChain(null);
                chainForm.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProxyManagement;
