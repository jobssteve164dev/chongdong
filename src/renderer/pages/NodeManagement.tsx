import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Tabs,
  Tooltip,
  Badge,
  Empty,
  message,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ThunderboltOutlined,
  CloudOutlined,
  CheckCircleOutlined,
  ClusterOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { ProxyServer, Subscription } from '../../shared/types/index';
import { log } from '../utils/logger';
import { subscriptionManager } from '../utils/subscriptionManager';
import { Storage, STORAGE_KEYS } from '../utils/storage';
import { latencyTester } from '../utils/latencyTester';
import { useNodeStore } from '../utils/stores'; // 导入 Zustand store
import { ProxyNode } from '../../shared/types';
import { DefaultSettings } from '../utils/defaultSettings';
import './NodeManagement.css';

const { Title, Text } = Typography;

interface NodeWithSubscription extends ProxyServer {
  subscriptionName: string;
  subscriptionId: string;
}

// 排序类型定义
type SortOrder = 'ascend' | 'descend' | null;

const NodeManagement: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [allNodes, setAllNodes] = useState<NodeWithSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  // 添加排序状态
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);


  // 加载订阅和节点数据
  useEffect(() => {
    loadSubscriptionsAndNodes();
  }, []);

  // 程序启动时自动更新所有启用的订阅
  useEffect(() => {
    const autoUpdateSubscriptions = async () => {
      const enabledSubscriptions = subscriptions.filter(sub => sub.enabled);
      if (enabledSubscriptions.length > 0) {
        setLoading(true);
        try {
          const updatePromises = enabledSubscriptions.map(sub => 
            subscriptionManager.updateSubscription(sub)
          );
          
          const results = await Promise.allSettled(updatePromises);
          
          // 处理更新结果并保存到存储
          const updatedSubscriptions = [...subscriptions];
          results.forEach((result, index) => {
            const subscription = enabledSubscriptions[index];
            if (result.status === 'fulfilled' && result.value.success && result.value.updatedSubscription) {
              // 更新订阅数据
              const subscriptionIndex = updatedSubscriptions.findIndex(sub => sub.id === subscription.id);
              if (subscriptionIndex !== -1) {
                updatedSubscriptions[subscriptionIndex] = result.value.updatedSubscription;
              }
              log.info('自动更新订阅成功', { 
                subscription: subscription.name, 
                serverCount: result.value.servers?.length 
              }, 'NodeManagement');
            } else {
              log.error('自动更新订阅失败', { 
                subscription: subscription.name, 
                error: result.status === 'rejected' ? result.reason : result.value?.error 
              }, 'NodeManagement');
            }
          });
          
          // 保存更新后的数据到存储
          Storage.set(STORAGE_KEYS.SUBSCRIPTION_CONFIG, updatedSubscriptions);
          
          // 重新加载数据
          loadSubscriptionsAndNodes();
          message.success('节点数据已自动更新');
        } catch (error) {
          log.error('自动更新订阅失败', error, 'NodeManagement');
          message.error('自动更新失败');
        } finally {
          setLoading(false);
        }
      }
    };

    // 延迟执行自动更新，避免与初始加载冲突
    const timer = setTimeout(autoUpdateSubscriptions, 1000);
    return () => clearTimeout(timer);
  }, [subscriptions.length]);

  const loadSubscriptionsAndNodes = useCallback(() => {
    try {
      // 从存储中加载订阅配置
      const savedSubscriptions = Storage.get<Subscription[]>(STORAGE_KEYS.SUBSCRIPTION_CONFIG, []) || [];
      setSubscriptions(savedSubscriptions);

      // 合并所有订阅的节点数据
      const nodesWithSubscription: NodeWithSubscription[] = [];
      savedSubscriptions.forEach(subscription => {
        subscription.servers.forEach(server => {
          nodesWithSubscription.push({
            ...server,
            subscriptionName: subscription.name,
            subscriptionId: subscription.id,
          });
        });
      });

      setAllNodes(nodesWithSubscription);

      // 将节点数据更新到 Zustand store
      const plainNodes: ProxyNode[] = nodesWithSubscription.map(n => ({
        id: n.id,
        name: n.name,
        type: n.protocol,
        server: n.host,
        port: n.port,
        uuid: n.uuid,
        password: n.password,
        security: n.encryption,
        network: n.network,
        wsPath: n.wsPath,
        wsHost: n.wsHeaders?.Host,
      }));
      useNodeStore.getState().setNodes(plainNodes);

    } catch (error: unknown) {
      message.error('加载节点数据失败');
      log.error('加载节点数据失败', error, 'NodeManagement');
    }
  }, []);

  const handleRefreshNodes = async () => {
    setLoading(true);
    try {
      const enabledSubscriptions = subscriptions.filter(sub => sub.enabled);
      if (enabledSubscriptions.length === 0) {
        message.warning('没有启用的订阅');
        return;
      }

      const updatePromises = enabledSubscriptions.map(sub => 
        subscriptionManager.updateSubscription(sub)
      );
      
      const results = await Promise.allSettled(updatePromises);
      
      // 处理更新结果并保存到存储
      const updatedSubscriptions = [...subscriptions];
      let successCount = 0;
      let failCount = 0;
      
      results.forEach((result, index) => {
        const subscription = enabledSubscriptions[index];
        if (result.status === 'fulfilled' && result.value.success && result.value.updatedSubscription) {
          successCount++;
          // 更新订阅数据
          const subscriptionIndex = updatedSubscriptions.findIndex(sub => sub.id === subscription.id);
          if (subscriptionIndex !== -1) {
            updatedSubscriptions[subscriptionIndex] = result.value.updatedSubscription;
          }
          log.info('更新订阅成功', { 
            subscription: subscription.name, 
            serverCount: result.value.servers?.length 
          }, 'NodeManagement');
        } else {
          failCount++;
          log.error('更新订阅失败', { 
            subscription: subscription.name, 
            error: result.status === 'rejected' ? result.reason : result.value?.error 
          }, 'NodeManagement');
        }
      });

      // 保存更新后的数据到存储
      Storage.set(STORAGE_KEYS.SUBSCRIPTION_CONFIG, updatedSubscriptions);

      // 重新加载数据
      loadSubscriptionsAndNodes();
      
      if (successCount > 0) {
        message.success(`成功更新 ${successCount} 个订阅`);
      }
      if (failCount > 0) {
        message.error(`${failCount} 个订阅更新失败`);
      }
    } catch (error) {
      message.error('更新失败');
      log.error('更新节点失败', error, 'NodeManagement');
    } finally {
      setLoading(false);
    }
  };

  const getProtocolColor = (protocol: string) => {
    const colors: Record<string, string> = {
      'vmess': 'blue',
      'vless': 'green',
      'trojan': 'purple',
      'shadowsocks': 'orange',
      'http': 'cyan',
      'https': 'geekblue',
      'socks5': 'magenta',
    };
    return colors[protocol] || 'default';
  };

  const getLatencyColor = (latency?: number) => {
    if (!latency) return 'default';
    if (latency < 100) return 'success';
    if (latency < 300) return 'warning';
    return 'error';
  };

  const formatLatency = (latency?: number) => {
    if (!latency) return '未测试';
    return `${latency}ms`;
  };

  const formatLastTest = (lastTest?: number) => {
    if (!lastTest) return '从未测试';
    const date = new Date(lastTest);
    return date.toLocaleString('zh-CN');
  };

  // 添加排序处理函数
  const handleTableChange = (_pagination: any, _filters: any, sorter: any) => {
    setSortField(sorter.field || '');
    setSortOrder(sorter.order || null);
  };

  // 获取排序后的节点数据
  const getSortedNodes = (nodes: NodeWithSubscription[]) => {
    if (!sortField || !sortOrder) {
      return nodes;
    }

    return [...nodes].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'latency':
          aValue = a.latency || Number.MAX_SAFE_INTEGER;
          bValue = b.latency || Number.MAX_SAFE_INTEGER;
          break;
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'protocol':
          aValue = a.protocol || '';
          bValue = b.protocol || '';
          break;
        case 'enabled':
          aValue = a.enabled ? 1 : 0;
          bValue = b.enabled ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'ascend') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const nodeColumns = [
    {
      title: '节点名称',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (text: string, record: NodeWithSubscription) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.host}:{record.port}
          </Text>
        </div>
      ),
    },
    {
      title: '协议',
      dataIndex: 'protocol',
      key: 'protocol',
      sorter: true,
      render: (protocol: string) => (
        <Tag color={getProtocolColor(protocol)}>
          {protocol.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: '延迟',
      dataIndex: 'latency',
      key: 'latency',
      sorter: true,
      defaultSortOrder: 'ascend' as SortOrder,
      render: (latency?: number) => (
        <Tag color={getLatencyColor(latency)}>
          {formatLatency(latency)}
        </Tag>
      ),
    },
    {
      title: '最后测试',
      dataIndex: 'lastTest',
      key: 'lastTest',
      render: (lastTest?: number) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatLastTest(lastTest)}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      sorter: true,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'success' : 'default'}>
          {enabled ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: NodeWithSubscription) => (
        <Space>
          <Tooltip title="测试延迟">
            <Button
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => handleTestLatency(record)}
            >
              测试
            </Button>
          </Tooltip>
          <Tooltip title={record.enabled ? '禁用节点' : '启用节点'}>
            <Button
              size="small"
              icon={record.enabled ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={() => handleToggleNode(record)}
            >
              {record.enabled ? '禁用' : '启用'}
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 批量延迟测试
  const handleBatchTestLatency = async () => {
    setLoading(true);
          try {
        // 获取延迟测试有效期配置（默认30分钟）
        const settings = Storage.get(STORAGE_KEYS.SETTINGS, DefaultSettings.getDefaultAppSettings()) || DefaultSettings.getDefaultAppSettings();
        const latencyValidityPeriod = (settings.latencyTestValidityPeriod || 30) * 60 * 1000; // 转换为毫秒
      
      // 筛选需要测试的节点（没有延迟信息、延迟为0或延迟已过期）
      const { isLatencyValid, setNodeLatency } = useNodeStore.getState();
      const nodesToTest = allNodes.filter(node => {
        const hasValidLatency = isLatencyValid(node.id, latencyValidityPeriod);
        const hasLatency = node.latency && node.latency > 0;
        return !hasValidLatency || !hasLatency;
      });
      
      if (nodesToTest.length === 0) {
        message.info('所有节点的延迟信息都在有效期内，无需测试');
        return;
      }

      message.info(`开始测试 ${nodesToTest.length} 个节点的延迟...`);
      
      // 实时更新的延迟测试
      const interimNodes = [...allNodes];
      const results = await latencyTester.testNodesLatencyViaMainProcess(
        nodesToTest,
        undefined,
        (nodeId, result) => {
          const latency = result.success ? result.latency : 0;
          setNodeLatency(nodeId, latency, result.timestamp);
          const idx = interimNodes.findIndex(n => n.id === nodeId);
          if (idx !== -1) {
            interimNodes[idx] = {
              ...interimNodes[idx],
              latency: result.success ? result.latency : undefined,
              lastTest: result.timestamp
            };
            setAllNodes([...interimNodes]);
          }
        }
      );
      
      // 保存到存储
      const updatedSubscriptions = subscriptions.map(sub => {
        const subscriptionNodes = updatedNodes.filter(node => node.subscriptionId === sub.id);
        return {
          ...sub,
          servers: subscriptionNodes
        };
      });
      Storage.set(STORAGE_KEYS.SUBSCRIPTION_CONFIG, updatedSubscriptions);
      
      const successCount = Array.from(results.values()).filter(r => r.success).length;
      message.success(`延迟测试完成！成功测试 ${successCount}/${nodesToTest.length} 个节点`);
      
    } catch (error) {
      message.error('批量延迟测试失败');
      log.error('批量延迟测试失败', error, 'NodeManagement');
    } finally {
      setLoading(false);
    }
  };

  // 节点启用/禁用功能
  const handleToggleNode = async (node: NodeWithSubscription) => {
    try {
      const updatedNodes = allNodes.map(n => 
        n.id === node.id ? { ...n, enabled: !n.enabled } : n
      );
      setAllNodes(updatedNodes);
      
      // 保存到存储
      const updatedSubscriptions = subscriptions.map(sub => {
        const subscriptionNodes = updatedNodes.filter(n => n.subscriptionId === sub.id);
        return {
          ...sub,
          servers: subscriptionNodes
        };
      });
      Storage.set(STORAGE_KEYS.SUBSCRIPTION_CONFIG, updatedSubscriptions);
      
      message.success(`${node.enabled ? '禁用' : '启用'}节点成功`);
    } catch (error) {
      message.error('节点状态切换失败');
      log.error('节点状态切换失败', error, 'NodeManagement');
    }
  };

  // 单个节点延迟测试
  const handleTestLatency = async (node: NodeWithSubscription) => {
    try {
      // 使用真实的延迟测试功能
      const result = await latencyTester.testNodeLatencyViaMainProcess(node);
      
      const updatedNodes = allNodes.map(n => 
        n.id === node.id ? { 
          ...n, 
          latency: result.success ? result.latency : undefined,
          lastTest: result.timestamp
        } : n
      );
      setAllNodes(updatedNodes);
      
      // 保存到存储
      const updatedSubscriptions = subscriptions.map(sub => {
        const subscriptionNodes = updatedNodes.filter(node => node.subscriptionId === sub.id);
        return {
          ...sub,
          servers: subscriptionNodes
        };
      });
      Storage.set(STORAGE_KEYS.SUBSCRIPTION_CONFIG, updatedSubscriptions);
      
      if (result.success) {
        message.success(`延迟测试完成：${result.latency}ms`);
      } else {
        message.error(`延迟测试失败：${result.error}`);
      }
    } catch (error) {
      message.error('延迟测试失败');
      log.error('延迟测试失败', error, 'NodeManagement');
    }
  };

  // 生成tab配置
  const generateTabs = () => {
    const tabs = [];
    
    // 添加"全部节点"tab
    tabs.push({
      key: 'all',
      label: (
        <span>
          全部节点
          <Badge count={allNodes.length} style={{ marginLeft: 8 }} />
        </span>
      ),
      children: (
        <Table
          columns={nodeColumns}
          dataSource={getSortedNodes(allNodes)}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          onChange={handleTableChange}
        />
      ),
    });

    // 为每个有节点的订阅添加tab
    subscriptions.forEach(subscription => {
      const subscriptionNodes = allNodes.filter(node => node.subscriptionId === subscription.id);
      if (subscriptionNodes.length > 0) {
        tabs.push({
          key: subscription.id,
          label: (
            <span>
              {subscription.name}
              <Badge count={subscriptionNodes.length} style={{ marginLeft: 8 }} />
            </span>
          ),
          children: (
            <Table
              columns={nodeColumns}
              dataSource={getSortedNodes(subscriptionNodes)}
              rowKey="id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              }}
              onChange={handleTableChange}
            />
          ),
        });
      }
    });

    return tabs;
  };

  const enabledNodes = allNodes.filter(node => node.enabled);
  const totalNodes = allNodes.length;
  const testedNodes = allNodes.filter(node => node.latency !== undefined).length;

  return (
    <div className="node-management-page">
      <div className="page-header">
        <Title level={2}>节点管理</Title>
        <Space>
          <Button 
            icon={<ThunderboltOutlined />} 
            onClick={handleBatchTestLatency}
            loading={loading}
          >
            批量延迟测试
          </Button>
          <Button 
            type="primary" 
            icon={<SyncOutlined />} 
            onClick={handleRefreshNodes}
            loading={loading}
          >
            刷新节点
          </Button>
        </Space>
      </div>

      {/* 统计信息 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总节点数"
              value={totalNodes}
              prefix={<ClusterOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="启用节点"
              value={enabledNodes.length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="已测试节点"
              value={testedNodes}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="订阅数量"
              value={subscriptions.filter(s => s.servers.length > 0).length}
              prefix={<CloudOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 节点列表 */}
      <Card>
        {allNodes.length === 0 ? (
          <Empty
            description="暂无节点数据"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={handleRefreshNodes}>
              刷新节点
            </Button>
          </Empty>
        ) : (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            items={generateTabs()}
          />
        )}
      </Card>
    </div>
  );
};

export default NodeManagement;
