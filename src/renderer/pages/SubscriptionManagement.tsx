import React, { useState, useEffect } from 'react';
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
  Alert,
  List,
  Avatar,
  Tooltip,
  Badge,
  Progress,
  Divider,
  Upload,
  InputNumber,
  DatePicker,
  TimePicker,
  Checkbox,
  Radio,
  Tabs,
  Collapse,
  Descriptions,
  Steps,
  Result,
  Empty,
  Skeleton,
  Spin,
  notification,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  SyncOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CloudOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  WifiOutlined,
  SettingOutlined,
  ReloadOutlined,
  FilterOutlined,
  ExportOutlined,
  ImportOutlined,
  CopyOutlined,
  ShareAltOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  StopOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import { Subscription } from '../../shared/types/index';
import { log } from '../utils/logger';
import { subscriptionManager } from '../utils/subscriptionManager';
import './SubscriptionManagement.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SubscriptionManagement: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([
    {
      id: '1',
      name: '香港节点订阅',
      url: 'https://example.com/hk-subscription',
      enabled: true,
      autoUpdate: true,
      updateInterval: 3600,
      lastUpdate: Date.now() - 1800000, // 30分钟前
      nextUpdate: Date.now() + 1800000, // 30分钟后
      servers: [],
      groups: [],
    },
    {
      id: '2',
      name: '新加坡节点订阅',
      url: 'https://example.com/sg-subscription',
      enabled: true,
      autoUpdate: false,
      updateInterval: 7200,
      lastUpdate: Date.now() - 3600000, // 1小时前
      nextUpdate: Date.now() + 3600000, // 1小时后
      servers: [],
      groups: [],
    },
  ]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

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

  const handleDeleteSubscription = (id: string) => {
    setSubscriptions(prev => prev.filter(sub => sub.id !== id));
    message.success('订阅已删除');
    log.info('删除订阅', { id }, 'SubscriptionManagement');
  };

  const handleToggleSubscription = (id: string) => {
    setSubscriptions(prev =>
      prev.map(sub =>
        sub.id === id ? { ...sub, enabled: !sub.enabled } : sub
      )
    );
  };

  const handleUpdateSubscription = async (subscription: Subscription) => {
    setLoading(true);
    try {
      const result = await subscriptionManager.updateSubscription(subscription);
      if (result.success) {
        // 更新本地状态
        setSubscriptions(prev =>
          prev.map(sub =>
            sub.id === subscription.id 
              ? { ...sub, servers: result.servers || [], groups: result.groups || [], lastUpdate: result.timestamp }
              : sub
          )
        );
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
        setSubscriptions(prev =>
          prev.map(sub =>
            sub.id === editingSubscription.id ? { ...sub, ...values } : sub
          )
        );
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
        };
        setSubscriptions(prev => [...prev, newSubscription]);
        message.success('订阅已添加');
        log.info('添加订阅', { subscription: newSubscription.name }, 'SubscriptionManagement');
      }
      setModalVisible(false);
    } catch (error) {
      message.error('保存失败');
      log.error('保存订阅失败', error, 'SubscriptionManagement');
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

  return (
    <div className="subscription-management-page">
      <div className="page-header">
        <Title level={2}>订阅管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSubscription}>
          添加订阅
        </Button>
      </div>

      {/* 统计信息 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总订阅数"
              value={totalSubscriptions}
              prefix={<LinkOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="启用订阅"
              value={enabledSubscriptions.length}
              prefix={<CloudOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总节点数"
              value={totalServers}
              prefix={<CloudOutlined />}
              valueStyle={{ color: '#faad14' }}
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
    </div>
  );
};

export default SubscriptionManagement;
