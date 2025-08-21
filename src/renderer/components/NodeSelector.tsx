import React, { useState, useEffect, useMemo } from 'react';
import { 
  List, 
  Button, 
  Tag, 
  Space, 
  Tooltip, 
  message, 
  Collapse, 
  Select, 
  Row, 
  Col,
  Typography,
  Progress,
  Empty
} from 'antd';
import { 
  PlayCircleOutlined, 
  ThunderboltOutlined, 
  SortAscendingOutlined,
  SortDescendingOutlined,
  CloudOutlined
} from '@ant-design/icons';
import { ProxyNode } from '../../shared/types';
import { useNodeStore, NodeStore } from '../utils/stores';
import { latencyTester } from '../utils/latencyTester';
import { Storage, STORAGE_KEYS } from '../utils/storage';
import { DefaultSettings } from '../utils/defaultSettings';
import { Subscription } from '../../shared/types';
import './NodeSelector.css';

const { Panel } = Collapse;
const { Option } = Select;
const { Text } = Typography;

interface NodeSelectorProps {
  nodes: ProxyNode[];
  onSelect: (nodeId: string) => void;
}

interface GroupedNodes {
  subscriptionId: string;
  subscriptionName: string;
  nodes: ProxyNode[];
}

const NodeSelector: React.FC<NodeSelectorProps> = ({ nodes, onSelect }) => {
  const [testingLatency, setTestingLatency] = useState<string | null>(null);
  const [batchTesting, setBatchTesting] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  
  // 从store获取延迟信息
  const nodeLatencies = useNodeStore((state: NodeStore) => state.nodeLatencies);
  const setNodeLatency = useNodeStore((state: NodeStore) => state.setNodeLatency);
  const getValidLatency = useNodeStore((state: NodeStore) => state.getValidLatency);
  const isLatencyValid = useNodeStore((state: NodeStore) => state.isLatencyValid);

  // 加载订阅信息
  useEffect(() => {
    const loadSubscriptions = () => {
      try {
        const savedSubscriptions = Storage.get<Subscription[]>(STORAGE_KEYS.SUBSCRIPTION_CONFIG, []) || [];
        setSubscriptions(savedSubscriptions);
      } catch (error) {
        console.error('加载订阅信息失败:', error);
      }
    };
    loadSubscriptions();
  }, []);

  // 按订阅分组节点
  const groupedNodes = useMemo(() => {
    const groups: Map<string, GroupedNodes> = new Map();
    
    // 初始化分组
    subscriptions.forEach(sub => {
      groups.set(sub.id, {
        subscriptionId: sub.id,
        subscriptionName: sub.name,
        nodes: []
      });
    });
    
    // 添加默认分组
    groups.set('ungrouped', {
      subscriptionId: 'ungrouped',
      subscriptionName: '手动添加/未分组',
      nodes: []
    });
    
    // 从订阅数据中生成节点数据，并设置正确的 subscriptionId
    const nodesFromSubscriptions: ProxyNode[] = [];
    subscriptions.forEach(subscription => {
      if (subscription.enabled && subscription.servers) {
        subscription.servers.forEach(server => {
          if (server.enabled) {
            const node: ProxyNode = {
              id: server.id,
              name: server.name,
              type: server.protocol as any,
              server: server.host,
              port: server.port,
              subscriptionId: subscription.id, // 设置订阅ID
              uuid: server.uuid,
              password: server.password,
              encryption: server.encryption,
              network: server.network,
              wsPath: server.wsPath,
              wsHost: server.wsHost,
            };
            nodesFromSubscriptions.push(node);
          }
        });
      }
    });

    // 合并从订阅生成的节点和现有的手动添加的节点
    const manualNodes = nodes.filter(node => !node.subscriptionId);
    const allNodes = [...nodesFromSubscriptions, ...manualNodes];
    
    // 将节点分配到对应分组
    allNodes.forEach(node => {
      const subscriptionId = node.subscriptionId || 'ungrouped';
      const group = groups.get(subscriptionId);
      if (group) {
        group.nodes.push(node);
      }
    });
    
    return Array.from(groups.values()).filter(group => group.nodes.length > 0);
  }, [nodes, subscriptions]);

  // 排序节点
  const sortNodes = (nodesToSort: ProxyNode[]) => {
    if (!sortOrder) return nodesToSort;
    
    return [...nodesToSort].sort((a, b) => {
      const latencyA = getValidLatency(a.id) || 0;
      const latencyB = getValidLatency(b.id) || 0;
      
      if (sortOrder === 'ascend') {
        return latencyA - latencyB;
      } else {
        return latencyB - latencyA;
      }
    });
  };

  // 测试单个节点延迟
  const handleTestLatency = async (node: ProxyNode) => {
    setTestingLatency(node.id);
    try {
      // 将ProxyNode转换为ProxyServer格式
      const proxyServer = {
        id: node.id,
        name: node.name,
        protocol: node.type as any,
        host: node.server,
        port: node.port,
        enabled: true,
        // 添加其他必要字段
        uuid: node.uuid,
        password: node.password,
        security: node.security,
        network: node.network,
        wsPath: node.wsPath,
        wsHost: node.wsHost,
      };

      const result = await latencyTester.testNodeLatencyViaMainProcess(proxyServer);
      
      if (result.success) {
        setNodeLatency(node.id, result.latency, result.timestamp);
        message.success(`${node.name} 延迟测试完成: ${result.latency}ms`);
      } else {
        setNodeLatency(node.id, 0, result.timestamp);
        message.error(`${node.name} 延迟测试失败: ${result.error}`);
      }
    } catch (error) {
      setNodeLatency(node.id, 0, Date.now());
      message.error(`${node.name} 延迟测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setTestingLatency(null);
    }
  };

  // 批量测试分组内所有节点延迟
  const handleBatchTestLatency = async (group: GroupedNodes) => {
    const groupNodeIds = new Set([group.subscriptionId]);
    setBatchTesting(groupNodeIds);
    
    try {
      const promises = group.nodes.map(async (node) => {
        try {
          const proxyServer = {
            id: node.id,
            name: node.name,
            protocol: node.type as any,
            host: node.server,
            port: node.port,
            enabled: true,
            uuid: node.uuid,
            password: node.password,
            security: node.security,
            network: node.network,
            wsPath: node.wsPath,
            wsHost: node.wsHost,
          };

          const result = await latencyTester.testNodeLatencyViaMainProcess(proxyServer);
          
          if (result.success) {
            setNodeLatency(node.id, result.latency, result.timestamp);
            return { success: true, node: node.name, latency: result.latency };
          } else {
            setNodeLatency(node.id, 0, result.timestamp);
            return { success: false, node: node.name, error: result.error };
          }
        } catch (error) {
          setNodeLatency(node.id, 0, Date.now());
          return { success: false, node: node.name, error: error instanceof Error ? error.message : '未知错误' };
        }
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      message.success(`批量测试完成: ${successCount}/${totalCount} 个节点测试成功`);
      
      // 显示详细结果
      const successNodes = results.filter(r => r.success);
      const failedNodes = results.filter(r => !r.success);
      
      if (successNodes.length > 0) {
        console.log('测试成功的节点:', successNodes);
      }
      if (failedNodes.length > 0) {
        console.log('测试失败的节点:', failedNodes);
      }
      
    } catch (error) {
      message.error('批量测试过程中发生错误');
    } finally {
      setBatchTesting(new Set());
    }
  };

  // 获取延迟显示
  const getLatencyDisplay = (nodeId: string) => {
    const latencyInfo = nodeLatencies instanceof Map ? nodeLatencies.get(nodeId) : undefined;
    
    if (latencyInfo === undefined) {
      return <Tag color="default">未测试</Tag>;
    }
    
    const { latency, timestamp } = latencyInfo;
    const now = Date.now();
    const age = now - timestamp;
    const ageMinutes = Math.floor(age / (60 * 1000));
    
    // 检查是否过期（默认30分钟）
    const settings = Storage.get(STORAGE_KEYS.SETTINGS, DefaultSettings.getDefaultAppSettings()) || DefaultSettings.getDefaultAppSettings();
    const validityPeriod = (settings.latencyTestValidityPeriod || 30) * 60 * 1000;
    const isValid = age < validityPeriod;
    
    let tagColor = 'default';
    let latencyText = '';
    
    if (latency === 0) {
      tagColor = 'red';
      latencyText = '超时';
    } else if (latency < 100) {
      tagColor = 'green';
      latencyText = `${latency}ms`;
    } else if (latency < 300) {
      tagColor = 'orange';
      latencyText = `${latency}ms`;
    } else {
      tagColor = 'red';
      latencyText = `${latency}ms`;
    }
    
    // 如果过期，添加过期标识
    if (!isValid) {
      tagColor = 'default';
      latencyText = `${latencyText} (${ageMinutes}分钟前)`;
    }
    
    return <Tag color={tagColor}>{latencyText}</Tag>;
  };

  // 获取分组统计信息
  const getGroupStats = (group: GroupedNodes) => {
    const totalNodes = group.nodes.length;
    const testedNodes = group.nodes.filter(node => {
      const latencyInfo = nodeLatencies instanceof Map ? nodeLatencies.get(node.id) : undefined;
      return latencyInfo !== undefined;
    }).length;
    
    const validNodes = group.nodes.filter(node => {
      const latency = getValidLatency(node.id);
      return latency > 0;
    }).length;
    
    return { totalNodes, testedNodes, validNodes };
  };

  if (groupedNodes.length === 0) {
    return <Empty description="暂无可用节点" />;
  }

  return (
    <div className="node-selector">
      {/* 排序控制 */}
      <Row style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Space>
            <Text>排序方式:</Text>
            <Select
              value={sortOrder}
              onChange={setSortOrder}
              style={{ width: 120 }}
              placeholder="选择排序"
              allowClear
            >
              <Option value="ascend">
                <SortAscendingOutlined /> 延迟升序
              </Option>
              <Option value="descend">
                <SortDescendingOutlined /> 延迟降序
              </Option>
            </Select>
          </Space>
        </Col>
      </Row>

      {/* 分组节点列表 */}
      <Collapse defaultActiveKey={groupedNodes.map(g => g.subscriptionId)}>
        {groupedNodes.map(group => {
          const stats = getGroupStats(group);
          const sortedNodes = sortNodes(group.nodes);
          const isBatchTesting = batchTesting.has(group.subscriptionId);
          
          return (
            <Panel
              key={group.subscriptionId}
              header={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Space>
                    <CloudOutlined />
                    <Text strong>{group.subscriptionName}</Text>
                    <Tag color="blue">{stats.totalNodes} 个节点</Tag>
                    <Tag color="green">{stats.validNodes} 个可用</Tag>
                  </Space>
                  <Space>
                    <Tooltip title={`批量测试 ${group.subscriptionName} 的所有节点延迟`}>
                      <Button
                        type="primary"
                        icon={<ThunderboltOutlined />}
                        loading={isBatchTesting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBatchTestLatency(group);
                        }}
                        size="small"
                      >
                        批量测试
                      </Button>
                    </Tooltip>
                  </Space>
                </div>
              }
            >
              {/* 分组统计进度条 */}
              <div style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Text>已测试: {stats.testedNodes}/{stats.totalNodes}</Text>
                  </Col>
                  <Col span={8}>
                    <Text>可用节点: {stats.validNodes}/{stats.totalNodes}</Text>
                  </Col>
                  <Col span={8}>
                    <Text>测试进度:</Text>
                  </Col>
                </Row>
                <Progress 
                  percent={Math.round((stats.testedNodes / stats.totalNodes) * 100)} 
                  size="small" 
                  status={isBatchTesting ? 'active' : 'normal'}
                />
              </div>

              {/* 节点列表 */}
              <List
                itemLayout="horizontal"
                dataSource={sortedNodes}
                renderItem={node => (
                  <List.Item
                    actions={[
                      <Space key="actions">
                        <Tooltip title="测试延迟">
                          <Button 
                            size="small"
                            icon={<ThunderboltOutlined />}
                            loading={testingLatency === node.id}
                            onClick={() => handleTestLatency(node)}
                          >
                            延迟
                          </Button>
                        </Tooltip>
                        {getLatencyDisplay(node.id)}
                        <Button 
                          type="primary" 
                          icon={<PlayCircleOutlined />} 
                          onClick={() => onSelect(node.id)}
                          disabled={getValidLatency(node.id) === 0}
                        >
                          启动
                        </Button>
                      </Space>
                    ]}
                  >
                    <List.Item.Meta
                      title={node.name}
                      description={`类型: ${node.type} | 地址: ${node.server}:${node.port}`}
                    />
                  </List.Item>
                )}
              />
            </Panel>
          );
        })}
      </Collapse>
    </div>
  );
};

export default NodeSelector;
