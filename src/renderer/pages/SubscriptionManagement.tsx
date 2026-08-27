import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tag,
  Popconfirm,
  message,
  Typography,
  Row,
  Col,
  Statistic,
  InputNumber,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  CloudOutlined,
  ReloadOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import { Subscription, ProxyServer, ProxyProtocol } from '../../shared/types/index';
import { log } from '../utils/logger';
import { subscriptionManager } from '../utils/subscriptionManager';
import { Storage, STORAGE_KEYS } from '../utils/storage';
import { customServerManager } from '../utils/customServerManager';
import './SubscriptionManagement.css';
import { AppSettings } from '../../shared/types/index';

const { Title, Text } = Typography;
const { TextArea } = Input;

// 自定义服务器列表组件
interface CustomServerListProps {
  onEdit: (server: ProxyServer) => void;
  onDelete: (id: string) => void;
}

const CustomServerList: React.FC<CustomServerListProps> = ({ onEdit, onDelete }) => {
  const [customServers, setCustomServers] = useState<ProxyServer[]>([]);

  useEffect(() => {
    const servers = customServerManager.getCustomServers();
    setCustomServers(servers);
  }, []);

  const columns = [
    {
      title: '服务器名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '协议',
      dataIndex: 'protocol',
      key: 'protocol',
      render: (protocol: ProxyProtocol) => (
        <Tag color="blue">{protocol.toUpperCase()}</Tag>
      ),
    },
    {
      title: '地址',
      dataIndex: 'host',
      key: 'host',
    },
    {
      title: '端口',
      dataIndex: 'port',
      key: 'port',
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'red'}>
          {enabled ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ProxyServer) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个自定义服务器吗？"
            onConfirm={() => onDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (customServers.length === 0) {
    return (
      <Empty
        description="暂无自定义服务器"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <Table
      columns={columns}
      dataSource={customServers}
      rowKey="id"
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) =>
          `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
      }}
    />
  );
};

const SubscriptionManagement: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [form] = Form.useForm();
  
  // 自定义服务器相关状态
  const [customServerModalVisible, setCustomServerModalVisible] = useState(false);
  const [editingCustomServer, setEditingCustomServer] = useState<ProxyServer | null>(null);
  const [customServerForm] = Form.useForm();

  // 加载订阅配置
  useEffect(() => {
    loadSubscriptions();
  }, []);

  // 初始化订阅管理器
  useEffect(() => {
    if (subscriptions.length > 0) {
      subscriptionManager.initialize(subscriptions);
    }
  }, [subscriptions.length]);

  const loadSubscriptions = () => {
    try {
      // 从存储中加载订阅配置
      const savedSubscriptions = Storage.get<Subscription[]>(STORAGE_KEYS.SUBSCRIPTION_CONFIG, []) || [];

      setSubscriptions(savedSubscriptions);
    } catch (error: unknown) {
      message.error('加载订阅配置失败');
      log.error('加载订阅配置失败', error, 'SubscriptionManagement');
    }
  };

  // 保存订阅配置到存储，并通知主进程
  const saveSubscriptions = useCallback(async (newSubscriptions: Subscription[]) => {
    try {
      const currentSettings = Storage.get<AppSettings>(STORAGE_KEYS.SETTINGS);
      if (currentSettings) {
        const updatedSettings = { ...currentSettings, subscriptions: newSubscriptions };
        const result = await window.electron.ipcRenderer.invoke('settings:updated', { settings: updatedSettings });
        if (!result.success) throw new Error(result.error || '主进程未能保存订阅配置');
        Storage.set(STORAGE_KEYS.SETTINGS, updatedSettings);
      } else {
        throw new Error('未找到当前设置');
      }

      Storage.set(STORAGE_KEYS.SUBSCRIPTION_CONFIG, newSubscriptions);
      setSubscriptions(newSubscriptions);
    } catch (error: unknown) {
      log.error('保存订阅配置失败', error, 'SubscriptionManagement');
      throw error;
    }
  }, []);

  const handleAddSubscription = () => {
    setEditingSubscription(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    form.setFieldsValue(subscription);
    setModalVisible(true);
  };

  const handleDeleteSubscription = async (id: string) => {
    const updatedSubscriptions = subscriptions.filter(sub => sub.id !== id);
    try {
      await saveSubscriptions(updatedSubscriptions);
      message.success('订阅已删除');
      log.info('删除订阅', { id }, 'SubscriptionManagement');
    } catch {
      message.error('删除订阅失败');
    }
  };

  const handleToggleSubscription = async (id: string) => {
    const updatedSubscriptions = subscriptions.map(sub =>
      sub.id === id ? { ...sub, enabled: !sub.enabled } : sub
    );
    try {
      await saveSubscriptions(updatedSubscriptions);
    } catch {
      message.error('更新订阅状态失败');
    }
  };

  const handleUpdateSubscription = async (subscription: Subscription) => {
    setLoading(true);
    try {
      const result = await subscriptionManager.updateSubscription(subscription);
      if (result.success && result.updatedSubscription) {
        // 更新本地状态并保存到存储
        const updatedSubscriptions = subscriptions.map(sub =>
          sub.id === subscription.id 
            ? result.updatedSubscription!
            : sub
        );
        await saveSubscriptions(updatedSubscriptions);
        message.success('订阅更新成功');
        log.info('更新订阅成功', { subscription: subscription.name, serverCount: result.servers?.length }, 'SubscriptionManagement');
      } else {
        message.error(`更新失败: ${result.error}`);
        log.error('更新订阅失败', { subscription: subscription.name, error: result.error }, 'SubscriptionManagement');
      }
    } catch (error) {
      message.error('更新失败');
      log.error('更新订阅失败', error, 'SubscriptionManagement');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSubscription = async (values: any) => {
    try {
      if (editingSubscription) {
        // 编辑现有订阅
        const updatedSubscriptions = subscriptions.map(sub =>
          sub.id === editingSubscription.id ? { ...sub, ...values } : sub
        );
        await saveSubscriptions(updatedSubscriptions);
        message.success('订阅已更新');
        log.info('更新订阅', { subscription: editingSubscription.name }, 'SubscriptionManagement');
      } else {
        // 添加新订阅
        const newSubscription: Subscription = {
          id: Date.now().toString(),
          ...values,
          enabled: true,
          servers: [],
          groups: [],
          rules: [],
        };
        await saveSubscriptions([...subscriptions, newSubscription]);
        message.success('订阅已添加');
        log.info('添加订阅', { subscription: newSubscription.name }, 'SubscriptionManagement');
      }
      setModalVisible(false);
    } catch (error: unknown) {
      message.error('保存失败');
      log.error('保存订阅失败', error, 'SubscriptionManagement');
    }
  };

  // 自定义服务器相关处理函数
  const handleAddCustomServer = () => {
    setEditingCustomServer(null);
    customServerForm.resetFields();
    setCustomServerModalVisible(true);
  };

  const handleEditCustomServer = (server: ProxyServer) => {
    setEditingCustomServer(server);
    customServerForm.setFieldsValue(server);
    setCustomServerModalVisible(true);
  };

  const handleDeleteCustomServer = (id: string) => {
    const success = customServerManager.deleteCustomServer(id);
    if (success) {
      message.success('自定义服务器已删除');
      log.info('删除自定义服务器', { id }, 'SubscriptionManagement');
    } else {
      message.error('删除失败');
    }
  };

  const handleSaveCustomServer = async (values: any) => {
    try {
      // 验证服务器配置
      const validation = customServerManager.validateServerConfig(values);
      if (!validation.valid) {
        message.error(`配置验证失败: ${validation.errors.join(', ')}`);
        return;
      }

      if (editingCustomServer) {
        // 编辑现有自定义服务器
        const success = customServerManager.updateCustomServer(editingCustomServer.id, values);
        if (success) {
          message.success('自定义服务器已更新');
          log.info('更新自定义服务器', { server: editingCustomServer.name }, 'SubscriptionManagement');
        } else {
          message.error('更新失败');
        }
      } else {
        // 添加新的自定义服务器
        const newServer = customServerManager.addCustomServer(values);
        message.success('自定义服务器已添加');
        log.info('添加自定义服务器', { server: newServer.name }, 'SubscriptionManagement');
      }
      
      setCustomServerModalVisible(false);
      customServerForm.resetFields();
    } catch (error: unknown) {
      message.error('保存失败');
      log.error('保存自定义服务器失败', error, 'SubscriptionManagement');
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  };

  const getTimeUntilNextUpdate = (nextUpdate: number) => {
    const now = Date.now();
    const diff = nextUpdate - now;
    
    if (diff <= 0) return '已过期';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  };

  const columns = [
    {
      title: '订阅名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Subscription) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.url}
          </Text>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'success' : 'default'}>
          {enabled ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '自动更新',
      dataIndex: 'autoUpdate',
      key: 'autoUpdate',
      render: (autoUpdate: boolean) => (
        <Tag color={autoUpdate ? 'blue' : 'default'}>
          {autoUpdate ? '开启' : '关闭'}
        </Tag>
      ),
    },
    {
      title: '最后更新',
      dataIndex: 'lastUpdate',
      key: 'lastUpdate',
      render: (lastUpdate?: number) => (
        lastUpdate ? (
          <div>
            <Text>{formatTime(lastUpdate)}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {getTimeUntilNextUpdate(lastUpdate + (3600 * 1000))}
            </Text>
          </div>
        ) : (
          <Text type="secondary">从未更新</Text>
        )
      ),
    },
    {
      title: '节点数量',
      dataIndex: 'servers',
      key: 'servers',
      render: (servers: any[]) => (
        <Tag color="purple">{servers.length} 个节点</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Subscription) => (
        <Space>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleUpdateSubscription(record)}
            loading={loading}
            disabled={!record.enabled}
          >
            更新
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditSubscription(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个订阅吗？"
            onConfirm={() => handleDeleteSubscription(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button size="small" icon={<DeleteOutlined />} danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const enabledSubscriptions = subscriptions.filter(s => s.enabled);
  const totalSubscriptions = subscriptions.length;
  const totalServers = subscriptions.reduce((sum, sub) => sum + sub.servers.length, 0);
  const customServers = customServerManager.getCustomServers();
  const totalCustomServers = customServers.length;

  return (
    <div className="subscription-management-page">
      <div className="page-header">
        <Title level={2}>订阅管理</Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSubscription}>
            添加订阅
          </Button>
          <Button icon={<ImportOutlined />} onClick={handleAddCustomServer}>
            自定义导入
          </Button>
        </Space>
      </div>

      {/* 统计信息 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总订阅数"
              value={totalSubscriptions}
              prefix={<LinkOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="启用订阅"
              value={enabledSubscriptions.length}
              prefix={<CloudOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="订阅节点数"
              value={totalServers}
              prefix={<CloudOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="自定义服务器"
              value={totalCustomServers}
              prefix={<ImportOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 订阅列表 */}
      <Card title="订阅列表">
        <Table
          columns={columns}
          dataSource={subscriptions}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
        />
      </Card>

      {/* 自定义服务器列表 */}
      <Card title="自定义服务器" style={{ marginTop: 16 }}>
        <CustomServerList
          onEdit={handleEditCustomServer}
          onDelete={handleDeleteCustomServer}
        />
      </Card>

      {/* 添加/编辑订阅模态框 */}
      <Modal
        title={editingSubscription ? '编辑订阅' : '添加订阅'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveSubscription}
          initialValues={{
            enabled: true,
            autoUpdate: true,
            updateInterval: 3600,
          }}
        >
          <Form.Item
            name="name"
            label="订阅名称"
            rules={[{ required: true, message: '请输入订阅名称' }]}
          >
            <Input placeholder="例如：香港节点订阅" />
          </Form.Item>

          <Form.Item
            name="url"
            label="订阅链接"
            rules={[{ required: true, message: '请输入订阅链接' }]}
          >
            <TextArea
              rows={3}
              placeholder="请输入订阅链接地址"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="enabled" label="启用状态" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="autoUpdate" label="自动更新" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="updateInterval"
            label="更新间隔（秒）"
            rules={[{ required: true, message: '请输入更新间隔' }]}
          >
            <InputNumber
              min={300}
              max={86400}
              style={{ width: '100%' }}
              placeholder="3600"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingSubscription ? '更新' : '添加'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 自定义服务器模态框 */}
      <Modal
        title={editingCustomServer ? '编辑自定义服务器' : '添加自定义服务器'}
        open={customServerModalVisible}
        onCancel={() => setCustomServerModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={customServerForm}
          layout="vertical"
          onFinish={handleSaveCustomServer}
        >
          <Form.Item
            name="name"
            label="服务器名称"
            rules={[{ required: true, message: '请输入服务器名称' }]}
          >
            <Input placeholder="请输入服务器名称" />
          </Form.Item>

          <Form.Item
            name="protocol"
            label="代理协议"
            rules={[{ required: true, message: '请选择代理协议' }]}
          >
            <Select placeholder="请选择代理协议">
              <Select.Option value={ProxyProtocol.VMESS}>VMess</Select.Option>
              <Select.Option value={ProxyProtocol.VLESS}>VLESS</Select.Option>
              <Select.Option value={ProxyProtocol.TROJAN}>Trojan</Select.Option>
              <Select.Option value={ProxyProtocol.SOCKS5}>SOCKS5</Select.Option>
              <Select.Option value={ProxyProtocol.HTTP}>HTTP</Select.Option>
              <Select.Option value={ProxyProtocol.HTTPS}>HTTPS</Select.Option>
              <Select.Option value={ProxyProtocol.SHADOWSOCKS}>Shadowsocks</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="host"
            label="服务器地址"
            rules={[{ required: true, message: '请输入服务器地址' }]}
          >
            <Input placeholder="请输入服务器地址" />
          </Form.Item>

          <Form.Item
            name="port"
            label="端口"
            rules={[{ required: true, message: '请输入端口号' }]}
          >
            <InputNumber
              placeholder="请输入端口号"
              min={1}
              max={65535}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="uuid"
            label="UUID"
            rules={[
              ({ getFieldValue }) => ({
                required: ['vmess', 'vless'].includes(getFieldValue('protocol')),
                message: 'VMess/VLESS协议需要UUID',
              }),
            ]}
          >
            <Input placeholder="请输入UUID" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              ({ getFieldValue }) => ({
                required: getFieldValue('protocol') === 'trojan',
                message: 'Trojan协议需要密码',
              }),
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item
            name="username"
            label="用户名"
          >
            <Input placeholder="请输入用户名（可选）" />
          </Form.Item>

          <Form.Item
            name="encryption"
            label="加密方式"
          >
            <Input placeholder="请输入加密方式（可选）" />
          </Form.Item>

          <Form.Item
            name="network"
            label="传输协议"
          >
            <Select placeholder="请选择传输协议（可选）">
              <Select.Option value="tcp">TCP</Select.Option>
              <Select.Option value="ws">WebSocket</Select.Option>
              <Select.Option value="grpc">gRPC</Select.Option>
              <Select.Option value="h2">HTTP/2</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="wsPath"
            label="WebSocket路径"
          >
            <Input placeholder="请输入WebSocket路径（可选）" />
          </Form.Item>

          <Form.Item
            name="tls"
            label="启用TLS"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="sni"
            label="SNI"
          >
            <Input placeholder="请输入SNI（可选）" />
          </Form.Item>

          <Form.Item
            name="enabled"
            label="启用"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingCustomServer ? '更新' : '添加'}
              </Button>
              <Button onClick={() => setCustomServerModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SubscriptionManagement;
