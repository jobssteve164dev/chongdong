import React, { useState } from 'react';
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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import { ProxyServer, ProxyProtocol } from '@/shared/types';
import { log } from '@/utils/logger';
import './ProxyManagement.css';

const { Title, Text } = Typography;
const { Option } = Select;

const ProxyManagement: React.FC = () => {
  const [servers, setServers] = useState<ProxyServer[]>([
    {
      id: '1',
      name: '香港节点1',
      protocol: ProxyProtocol.VMESS,
      host: 'hk1.example.com',
      port: 443,
      enabled: true,
      latency: 50,
    },
    {
      id: '2',
      name: '新加坡节点1',
      protocol: ProxyProtocol.TROJAN,
      host: 'sg1.example.com',
      port: 443,
      enabled: true,
      latency: 80,
    },
  ]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingServer, setEditingServer] = useState<ProxyServer | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleAddServer = () => {
    setEditingServer(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditServer = (server: ProxyServer) => {
    setEditingServer(server);
    form.setFieldsValue(server);
    setModalVisible(true);
  };

  const handleDeleteServer = (id: string) => {
    setServers(prev => prev.filter(server => server.id !== id));
    message.success('代理服务器已删除');
    log.info('删除代理服务器', { id }, 'ProxyManagement');
  };

  const handleToggleServer = (id: string) => {
    setServers(prev =>
      prev.map(server =>
        server.id === id ? { ...server, enabled: !server.enabled } : server
      )
    );
  };

  const handleTestServer = async (server: ProxyServer) => {
    setLoading(true);
    try {
      // 模拟测试延迟
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      const latency = Math.floor(Math.random() * 200) + 10;
      
      setServers(prev =>
        prev.map(s =>
          s.id === server.id ? { ...s, latency, lastTest: Date.now() } : s
        )
      );
      
      message.success(`测试完成，延迟: ${latency}ms`);
      log.info('测试代理服务器', { server: server.name, latency }, 'ProxyManagement');
    } catch (error) {
      message.error('测试失败');
      log.error('测试代理服务器失败', error, 'ProxyManagement');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServer = async (values: any) => {
    try {
      if (editingServer) {
        // 编辑现有服务器
        setServers(prev =>
          prev.map(server =>
            server.id === editingServer.id ? { ...server, ...values } : server
          )
        );
        message.success('代理服务器已更新');
        log.info('更新代理服务器', { server: editingServer.name }, 'ProxyManagement');
      } else {
        // 添加新服务器
        const newServer: ProxyServer = {
          id: Date.now().toString(),
          ...values,
          enabled: true,
        };
        setServers(prev => [...prev, newServer]);
        message.success('代理服务器已添加');
        log.info('添加代理服务器', { server: newServer.name }, 'ProxyManagement');
      }
      setModalVisible(false);
    } catch (error) {
      message.error('保存失败');
      log.error('保存代理服务器失败', error, 'ProxyManagement');
    }
  };

  const getProtocolColor = (protocol: ProxyProtocol) => {
    const colors: Record<ProxyProtocol, string> = {
      [ProxyProtocol.HTTP]: 'blue',
      [ProxyProtocol.HTTPS]: 'green',
      [ProxyProtocol.SOCKS5]: 'orange',
      [ProxyProtocol.SHADOWSOCKS]: 'purple',
      [ProxyProtocol.VMESS]: 'cyan',
      [ProxyProtocol.VLESS]: 'magenta',
      [ProxyProtocol.TROJAN]: 'red',
      [ProxyProtocol.HYSTERIA]: 'volcano',
      [ProxyProtocol.TUIC]: 'gold',
      [ProxyProtocol.WIREGUARD]: 'lime',
    };
    return colors[protocol] || 'default';
  };

  const getLatencyColor = (latency?: number) => {
    if (!latency) return 'default';
    if (latency < 50) return 'success';
    if (latency < 100) return 'warning';
    return 'error';
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ProxyServer) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary">{record.host}:{record.port}</Text>
        </div>
      ),
    },
    {
      title: '协议',
      dataIndex: 'protocol',
      key: 'protocol',
      render: (protocol: ProxyProtocol) => (
        <Tag color={getProtocolColor(protocol)}>{protocol.toUpperCase()}</Tag>
      ),
    },
    {
      title: '延迟',
      dataIndex: 'latency',
      key: 'latency',
      render: (latency?: number) => (
        latency ? (
          <Tag color={getLatencyColor(latency)}>{latency}ms</Tag>
        ) : (
          <Text type="secondary">未测试</Text>
        )
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        <Switch
          checked={enabled}
          onChange={() => handleToggleServer(servers.find(s => s.enabled === enabled)?.id || '')}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: ProxyServer) => (
        <Space>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleTestServer(record)}
            loading={loading}
          >
            测试
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditServer(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个代理服务器吗？"
            onConfirm={() => handleDeleteServer(record.id)}
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

  const enabledServers = servers.filter(s => s.enabled);
  const totalServers = servers.length;

  return (
    <div className="proxy-management-page">
      <div className="page-header">
        <Title level={2}>代理管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddServer}>
          添加代理
        </Button>
      </div>

      {/* 统计信息 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总代理数"
              value={totalServers}
              prefix={<CloudOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="启用代理"
              value={enabledServers.length}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="禁用代理"
              value={totalServers - enabledServers.length}
              prefix={<PauseCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 代理服务器列表 */}
      <Card title="代理服务器列表">
        <Table
          columns={columns}
          dataSource={servers}
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

      {/* 添加/编辑代理服务器模态框 */}
      <Modal
        title={editingServer ? '编辑代理服务器' : '添加代理服务器'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveServer}
          initialValues={{
            protocol: ProxyProtocol.VMESS,
            port: 443,
            enabled: true,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="服务器名称"
                rules={[{ required: true, message: '请输入服务器名称' }]}
              >
                <Input placeholder="例如：香港节点1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="protocol"
                label="代理协议"
                rules={[{ required: true, message: '请选择代理协议' }]}
              >
                <Select placeholder="选择协议">
                  {Object.values(ProxyProtocol).map(protocol => (
                    <Option key={protocol} value={protocol}>
                      {protocol.toUpperCase()}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="host"
                label="服务器地址"
                rules={[{ required: true, message: '请输入服务器地址' }]}
              >
                <Input placeholder="例如：example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="port"
                label="端口"
                rules={[{ required: true, message: '请输入端口号' }]}
              >
                <Input type="number" placeholder="例如：443" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="username" label="用户名">
                <Input placeholder="用户名（可选）" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="password" label="密码">
                <Input.Password placeholder="密码（可选）" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="enabled" label="启用状态" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingServer ? '更新' : '添加'}
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

export default ProxyManagement;
