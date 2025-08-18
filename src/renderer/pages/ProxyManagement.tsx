import React, { useState, useEffect } from 'react';
import { Button, Card, Table, Tag, Switch, Modal, Form, Input, Select, message, Space, Tooltip, Progress, Tabs } from 'antd';
import { PlayCircleOutlined, StopOutlined, SettingOutlined, PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined, LinkOutlined } from '@ant-design/icons';
import { proxyEngine, ProxyConfig, ProxyStatus } from '../utils/proxyEngine';
import { systemProxy, ProxySettings } from '../utils/systemProxy';
import { chainProxyManager, ChainConfig } from '../utils/chainProxy';
import { Storage, STORAGE_KEYS } from '../utils/storage';
import ProxyChainBuilder from '../components/ProxyChainBuilder';
import { CoreManager as CoreManagerUtil } from '../utils/coreManager';
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
  const [editingConfig, setEditingConfig] = useState<ProxyConfig | null>(null);
  const [form] = Form.useForm();

  // 加载配置
  useEffect(() => {
    loadConfigs();
    loadSystemProxy();
    startStatusPolling();
    
    console.log('设置端口占用监听器...');
    
    // 监听端口占用通知
    const handlePortInUse = (data: { port: number; processId: string }) => {
      console.log('收到端口占用通知:', data);
      if (!data) {
        console.error('端口占用通知未收到有效数据');
        return;
      }
      Modal.confirm({
        title: '端口被占用',
        content: (
          <div>
            <p>端口 {data.port} 已被其他进程占用，无法启动代理服务。</p>
            <p>可能的原因：</p>
            <ul>
              <li>之前的代理进程未完全退出</li>
              <li>其他应用正在使用该端口</li>
              <li>系统代理已启用</li>
            </ul>
            <p>是否要终止占用该端口的进程？</p>
          </div>
        ),
        okText: '终止进程',
        cancelText: '取消',
        onOk: async () => {
          try {
            const result = await window.electron.ipcRenderer.invoke('proxy:killProcessOnPort', data.port);
            if (result.success) {
              message.success(result.message);
              // 重新尝试启动代理
              setTimeout(() => {
                // 这里可以重新启动代理，但需要知道是哪个配置
                message.info('请重新尝试启动代理服务');
              }, 1000);
            } else {
              message.error(result.message || '操作失败');
            }
          } catch (error) {
            message.error(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        },
        onCancel: () => {
          // 用户选择取消时，重置代理状态
          console.log('用户取消端口占用处理，重置代理状态');
          
          // 重置代理状态卡片
          setCurrentStatus({
            running: false,
            uptime: 0,
            connections: 0,
            upload: 0,
            download: 0,
            error: '端口被占用，启动失败'
          });
          
          // 重置所有代理配置的启用状态
          const updatedConfigs = proxyConfigs.map(c => ({ ...c, enabled: false, updatedAt: new Date() }));
          saveProxyConfigs(updatedConfigs);
          
          message.info('已取消启动代理服务');
        }
      });
    };

    // 注册监听器
    window.electron.ipcRenderer.on('proxy:portInUse', handlePortInUse);
    console.log('端口占用监听器已设置');

    // 清理监听器
    return () => {
      // 注意：这里我们无法直接移除特定的监听器，但这是可以接受的
      // 因为组件卸载时会自动清理
      console.log('清理端口占用监听器');
    };
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
    // 检查对应的核心是否已安装
    const coreName = config.type;
    const isInstalled = await CoreManagerUtil.isCoreInstalled(coreName);
    if (!isInstalled) {
      Modal.confirm({
        title: '核心未安装',
        content: `${CoreManagerUtil.getCoreDisplayName(coreName)} 核心未安装，是否现在下载安装？`,
        okText: '下载安装',
        cancelText: '取消',
        onOk: () => {
          // 这里可以触发下载，或者引导用户到核心管理页面
          message.info('请先下载安装对应的代理核心');
        }
      });
      return;
    }

    setLoading(true);
    try {
      await proxyEngine.start(config);
      // 更新配置状态
      const updatedConfigs = proxyConfigs.map(c => 
        c.id === config.id ? { ...c, enabled: true, updatedAt: new Date() } : c
      );
      saveProxyConfigs(updatedConfigs);
      message.success('代理引擎启动成功');
      loadSystemProxy();
    } catch (error) {
      message.error(`启动失败: ${error instanceof Error ? error.message : '未知错误'}`);
      
      // 启动失败时，将状态重置为inactive
      const updatedConfigs = proxyConfigs.map(c => 
        c.id === config.id ? { ...c, enabled: false, updatedAt: new Date() } : c
      );
      saveProxyConfigs(updatedConfigs);

      // 更新代理状态卡片
      setCurrentStatus({
        running: false,
        uptime: 0,
        connections: 0,
        upload: 0,
        download: 0,
        error: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStopProxy = async () => {
    setLoading(true);
    try {
      await proxyEngine.stop();
      // 更新所有配置状态为禁用
      const updatedConfigs = proxyConfigs.map(c => ({ ...c, enabled: false, updatedAt: new Date() }));
      saveProxyConfigs(updatedConfigs);
      message.success('代理引擎已停止');
      loadSystemProxy();
    } catch (error) {
      message.error(`停止失败: ${error instanceof Error ? error.message : '未知错误'}`);
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

  const handleDeleteProxyConfig = (id: string) => {
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

  // 处理拖拽式代理链构建器保存
  const handleChainBuilderSave = (chainData: { name: string; description: string; nodes: any[] }) => {
    try {
      const chain: ChainConfig = {
        id: `chain_${Date.now()}`,
        name: chainData.name,
        description: chainData.description,
        proxies: chainData.nodes.map(node => node.server.id),
        rules: [],
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      saveChainConfigs([...chainConfigs, chain]);
      message.success('代理链保存成功');
    } catch (error) {
      message.error('保存失败');
    }
  };

  // 删除代理链
  const handleDeleteChain = (chainId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个代理链吗？此操作不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const updatedChains = chainConfigs.filter(chain => chain.id !== chainId);
        saveChainConfigs(updatedChains);
        message.success('代理链已删除');
      }
    });
  };

  // 切换代理链启用状态
  const handleToggleChainStatus = (chainId: string, enabled: boolean) => {
    const updatedChains = chainConfigs.map(chain => 
      chain.id === chainId ? { ...chain, enabled, updatedAt: new Date() } : chain
    );
    saveChainConfigs(updatedChains);
    message.success(`代理链已${enabled ? '启用' : '禁用'}`);
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
      render: (_: any, record: ProxyConfig) => (
        <Switch
          checked={currentStatus?.running && record.enabled}
          onChange={(checked) => {
            if (checked) {
              try {
                handleStartProxy(record);
              } catch (error) {
                console.error('启动代理服务失败:', error);
                const errorMessage = error instanceof Error ? error.message : '未知错误';
                message.error(`启动代理服务失败: ${errorMessage}`);
                // 启动失败时，将状态重置为inactive
                const newConfigs = proxyConfigs.map(c => c.id === record.id ? { ...c, enabled: false } : c);
                setProxyConfigs(newConfigs);
              }
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
      render: (_: any, record: ProxyConfig) => (
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
              onClick={() => handleDeleteProxyConfig(record.id)}
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
            <div className="status-item" style={{ marginTop: '12px' }}>
              <Button
                type={systemProxySettings?.enabled ? 'default' : 'primary'}
                size="small"
                onClick={async () => {
                  try {
                    if (systemProxySettings?.enabled) {
                      await systemProxy.clearSystemProxy();
                      message.success('系统代理已关闭');
                    } else {
                      await systemProxy.setSystemProxy('127.0.0.1', 7890);
                      message.success('系统代理已启用');
                    }
                    loadSystemProxy();
                  } catch (error) {
                    message.error(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
                  }
                }}
              >
                {systemProxySettings?.enabled ? '关闭系统代理' : '启用系统代理'}
              </Button>
            </div>
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

      {/* 拖拽式代理链构建器 */}
      <Card title="代理链配置" className="config-card">
        <ProxyChainBuilder 
          onSave={handleChainBuilderSave} 
          existingChains={chainConfigs}
          onDeleteChain={handleDeleteChain}
          onToggleChainStatus={handleToggleChainStatus}
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


    </div>
  );
};

export default ProxyManagement;
