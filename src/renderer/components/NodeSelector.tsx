import React, { useState } from 'react';
import { List, Button, Tag, Space, Tooltip, message } from 'antd';
import { PlayCircleOutlined, ThunderboltOutlined, ReloadOutlined } from '@ant-design/icons';
import { ProxyNode } from '../../shared/types';
import { useNodeStore, NodeStore } from '../utils/stores';
import { latencyTester } from '../utils/latencyTester';
import { Storage, STORAGE_KEYS } from '../utils/storage';
import { DefaultSettings } from '../utils/defaultSettings';
import './NodeSelector.css';

interface NodeSelectorProps {
  nodes: ProxyNode[];
  onSelect: (nodeId: string) => void;
}

const NodeSelector: React.FC<NodeSelectorProps> = ({ nodes, onSelect }) => {
  const [testingLatency, setTestingLatency] = useState<string | null>(null);
  
  // 从store获取延迟信息
  const nodeLatencies = useNodeStore((state: NodeStore) => state.nodeLatencies);
  const setNodeLatency = useNodeStore((state: NodeStore) => state.setNodeLatency);
  const getValidLatency = useNodeStore((state: NodeStore) => state.getValidLatency);
  const isLatencyValid = useNodeStore((state: NodeStore) => state.isLatencyValid);

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

  return (
    <List
      itemLayout="horizontal"
      dataSource={nodes}
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
  );
};

export default NodeSelector;
