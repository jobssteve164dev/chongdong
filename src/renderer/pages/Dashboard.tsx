import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Button,
  Space,
  Typography,
  Alert,
  List,
  Avatar,
  Tag,
  Switch,
  Divider,
  Dropdown,
  Menu,
  message,
} from 'antd';
import {
  ThunderboltOutlined,
  CloudOutlined,
  GlobalOutlined,
  WifiOutlined,
  SettingOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  BarChartOutlined,
  DownOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import { ConnectionStatus, TrafficStats, ChainConfig } from '../../shared/types/index';
import { log } from '../utils/logger';
import { useNodeStore, NodeStore } from '../utils/stores';
import { Storage, STORAGE_KEYS } from '../utils/storage';
import { proxyEngine } from '../utils/proxyEngine';
import { subscriptionManager } from '../utils/subscriptionManager';
import { latencyTester } from '../utils/latencyTester';
import { geolocationTester } from '../utils/geolocationTester';
import { DefaultSettings } from '../utils/defaultSettings';
import './Dashboard.css';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  console.log('Dashboard 组件开始渲染');
  
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [chainConfigs, setChainConfigs] = useState<ChainConfig[]>([]);

  // 从store获取节点和延迟信息
  const nodes = useNodeStore((state: NodeStore) => state.nodes);
  const nodeLatencies = useNodeStore((state: NodeStore) => state.nodeLatencies);
  const defaultChainId = useNodeStore((state: NodeStore) => state.defaultChainId);
  const getBestNode = useNodeStore((state: NodeStore) => state.getBestNode);
  
  // 从store获取全局代理连接状态
  const proxyConnected = useNodeStore((state: NodeStore) => state.proxyConnected);
  const setProxyConnected = useNodeStore((state: NodeStore) => state.setProxyConnected);
  const proxyStartTime = useNodeStore((state: NodeStore) => state.proxyStartTime);
  const setProxyStartTime = useNodeStore((state: NodeStore) => state.setProxyStartTime);
  const currentProxyNode = useNodeStore((state: NodeStore) => state.currentProxyNode);
  const setCurrentProxyNode = useNodeStore((state: NodeStore) => state.setCurrentProxyNode);
  const currentProxyChain = useNodeStore((state: NodeStore) => state.currentProxyChain);
  const setCurrentProxyChain = useNodeStore((state: NodeStore) => state.setCurrentProxyChain);
  const trafficStats = useNodeStore((state: NodeStore) => state.trafficStats);
  const setTrafficStats = useNodeStore((state: NodeStore) => state.setTrafficStats);
  
  // 从store获取IP地理位置信息
  const currentGeolocation = useNodeStore((state: NodeStore) => state.currentGeolocation);
  const setCurrentGeolocation = useNodeStore((state: NodeStore) => state.setCurrentGeolocation);
  const isGeolocationValid = useNodeStore((state: NodeStore) => state.isGeolocationValid);

  // 加载代理链配置
  useEffect(() => {
    const savedChainConfigs = Storage.get<ChainConfig[]>('chain_configs', []) || [];
    setChainConfigs(savedChainConfigs);
  }, []);

  // 真实数据更新
  useEffect(() => {
    const interval = setInterval(async () => {
      if (proxyConnected) {
        try {
          // 通过IPC获取真实的统计数据
          const stats = await window.electron.ipcRenderer.invoke('proxy:getStats');
          if (stats && !stats.error) {
            setTrafficStats({
              upload: stats.totalUpload || trafficStats.upload,
              download: stats.totalDownload || trafficStats.download,
              uploadSpeed: stats.uploadSpeed || 0,
              downloadSpeed: stats.downloadSpeed || 0,
              connections: stats.activeConnections || 0,
            });
          }
        } catch (error) {
          console.error('获取统计数据失败:', error);
          // 如果获取失败，保持当前数据不变
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [proxyConnected, setTrafficStats]);

  // 启动单个节点代理
  const handleStartNodeProxy = async (nodeId?: string) => {
    console.log('=== handleStartNodeProxy 开始执行 ===');
    console.log('参数 nodeId:', nodeId);
    setLoading(true);
    try {
      let selectedNode;
      
      if (nodeId) {
        // 如果指定了节点ID，直接使用该节点
        selectedNode = nodes.find(n => n.id === nodeId);
        if (!selectedNode) {
          message.error('指定的节点不存在');
          return;
        }
      } else {
        // 自动流程：刷新订阅 → 更新节点 → 测试延迟 → 选择最佳节点
        message.info('正在自动刷新订阅和测试节点延迟...');
        
        // 1. 刷新所有启用的订阅
        try {
          const subscriptions = Storage.get('subscriptions', []);
          const enabledSubscriptions = subscriptions.filter((sub: any) => sub.enabled);
          
          if (enabledSubscriptions.length > 0) {
            message.info(`正在刷新 ${enabledSubscriptions.length} 个订阅...`);
            
            for (const subscription of enabledSubscriptions) {
              try {
                const result = await subscriptionManager.updateSubscription(subscription);
                if (result.success) {
                  console.log(`订阅 ${subscription.name} 刷新成功`);
                } else {
                  console.warn(`订阅 ${subscription.name} 刷新失败:`, result.error);
                }
              } catch (error) {
                console.error(`订阅 ${subscription.name} 刷新出错:`, error);
              }
            }
            
            // 重新加载节点列表
            const updatedNodes = Storage.get('nodes', []);
            if (updatedNodes.length > 0) {
              // 更新store中的节点
              const setNodes = useNodeStore.getState().setNodes;
              setNodes(updatedNodes);
              message.success(`节点列表已更新，共 ${updatedNodes.length} 个节点`);
            }
          }
        } catch (error) {
          console.error('刷新订阅失败:', error);
          message.warning('刷新订阅失败，将使用现有节点');
        }
        
        // 2. 获取当前节点列表
        const currentNodes = useNodeStore.getState().nodes;
        if (currentNodes.length === 0) {
          message.error('没有可用的节点，请先添加订阅或节点');
          return;
        }
        
        // 3. 智能测试节点延迟（只测试过期的节点）
        try {
          const { isLatencyValid, setNodeLatency } = useNodeStore.getState();
          
                      // 获取延迟测试有效期配置（默认30分钟）
            const settings = Storage.get(STORAGE_KEYS.SETTINGS, DefaultSettings.getDefaultAppSettings()) || DefaultSettings.getDefaultAppSettings();
            const latencyValidityPeriod = (settings.latencyTestValidityPeriod || 30) * 60 * 1000; // 转换为毫秒
          
          // 筛选需要测试的节点（没有延迟信息或延迟已过期）
          const nodesToTest = currentNodes.filter(node => !isLatencyValid(node.id, latencyValidityPeriod));
          
          if (nodesToTest.length > 0) {
            message.info(`正在测试 ${nodesToTest.length} 个节点的延迟...`);
            
            // 将ProxyNode转换为ProxyServer格式
            const proxyServers = nodesToTest.map(node => ({
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
            }));
            
            const latencyResults = await latencyTester.testNodesLatencyViaMainProcess(proxyServers);
            
            console.log('延迟测试结果:', Array.from(latencyResults.entries()));
            
            // 更新store中的延迟信息
            latencyResults.forEach((result, nodeId) => {
              const latency = result.success ? result.latency : 0;
              console.log(`设置节点 ${nodeId} 延迟:`, latency);
              setNodeLatency(nodeId, latency, result.timestamp);
            });
            
            const successCount = Array.from(latencyResults.values()).filter(r => r.success).length;
            message.success(`延迟测试完成，${successCount}/${nodesToTest.length} 个节点可用`);
          } else {
            message.info('所有节点的延迟信息都在有效期内，跳过延迟测试');
          }
          
        } catch (error) {
          console.error('延迟测试失败:', error);
          message.warning('延迟测试失败，将使用现有延迟信息');
        }
        
        // 4. 选择最佳节点
        selectedNode = getBestNode();
        
        // 调试信息
        console.log('=== 自动启动代理调试信息 ===');
        console.log('当前节点数量:', currentNodes.length);
        console.log('节点列表:', currentNodes.map(n => ({ id: n.id, name: n.name, server: n.server })));
        
        const currentLatencies = useNodeStore.getState().nodeLatencies;
        console.log('延迟信息类型:', typeof currentLatencies, currentLatencies instanceof Map);
        console.log('延迟信息内容:', currentLatencies instanceof Map ? Array.from(currentLatencies.entries()) : currentLatencies);
        
        console.log('选中的节点:', selectedNode);
        console.log('getBestNode 函数结果:', getBestNode());
        console.log('=== 调试信息结束 ===');
        
        // 如果没有延迟信息，选择第一个节点
        if (!selectedNode && currentNodes.length > 0) {
          selectedNode = currentNodes[0];
          message.warning('无法获取节点延迟信息，将使用第一个可用节点');
        }
      }

      if (!selectedNode) {
        message.error('没有可用的节点，请检查订阅配置或网络连接');
        return;
      }

      // 5. 启动代理
      let settings = Storage.get<AppSettings>(STORAGE_KEYS.SETTINGS, undefined);
      
      // 如果没有找到，尝试从旧的存储键加载（迁移兼容）
      if (!settings) {
        const oldSettings = Storage.get<AppSettings>('settings');
        if (oldSettings) {
          settings = oldSettings;
          Storage.set(STORAGE_KEYS.SETTINGS, oldSettings);
          Storage.remove('settings');
          console.log('已迁移旧设置到新的存储键');
        }
      }
      
      // 处理引擎设置的迁移（修复 sing-box 到 singbox）
      if (settings && (settings.proxyEngine as any) === 'sing-box') {
        settings.proxyEngine = 'singbox';
        Storage.set(STORAGE_KEYS.SETTINGS, settings);
        console.log('已修复引擎设置：sing-box -> singbox');
      }
      
      const defaultSettings = DefaultSettings.getDefaultAppSettings();

      await proxyEngine.startWithNode(selectedNode, settings || defaultSettings);
      
      const nodeLatencies = useNodeStore.getState().nodeLatencies;
      const latency = nodeLatencies instanceof Map ? nodeLatencies.get(selectedNode.id) : undefined;
      const latencyText = latency && latency > 0 ? ` (${latency}ms)` : '';
      message.success(`代理启动成功 - ${selectedNode.name}${latencyText}`);
      
      // 更新全局状态
      setProxyConnected(true);
      setProxyStartTime(Date.now());
      setCurrentProxyNode(selectedNode);
      setCurrentProxyChain(null);
      
      log.info('代理服务已启动', null, 'Dashboard');
    } catch (error) {
      message.error(`代理启动失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
      log.error('切换代理状态失败', error, 'Dashboard');
    } finally {
      setLoading(false);
    }
  };

  // 刷新节点列表和延迟测试
  const handleRefreshNodes = async () => {
    setRefreshing(true);
    try {
      message.info('正在刷新订阅和测试节点延迟...');
      
      // 1. 刷新所有启用的订阅
      const subscriptions = Storage.get('subscriptions', []);
      const enabledSubscriptions = subscriptions.filter((sub: any) => sub.enabled);
      
      if (enabledSubscriptions.length > 0) {
        message.info(`正在刷新 ${enabledSubscriptions.length} 个订阅...`);
        
        for (const subscription of enabledSubscriptions) {
          try {
            const result = await subscriptionManager.updateSubscription(subscription);
            if (result.success) {
              console.log(`订阅 ${subscription.name} 刷新成功`);
            } else {
              console.warn(`订阅 ${subscription.name} 刷新失败:`, result.error);
            }
          } catch (error) {
            console.error(`订阅 ${subscription.name} 刷新出错:`, error);
          }
        }
        
        // 重新加载节点列表
        const updatedNodes = Storage.get('nodes', []);
        if (updatedNodes.length > 0) {
          // 更新store中的节点
          const setNodes = useNodeStore.getState().setNodes;
          setNodes(updatedNodes);
          message.success(`节点列表已更新，共 ${updatedNodes.length} 个节点`);
        }
      }
      
      // 2. 获取当前节点列表
      const currentNodes = useNodeStore.getState().nodes;
      if (currentNodes.length === 0) {
        message.warning('没有可用的节点');
        return;
      }
      
      // 3. 测试所有节点的延迟
      message.info('正在测试节点延迟...');
      
      // 将ProxyNode转换为ProxyServer格式
      const proxyServers = currentNodes.map(node => ({
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
      }));
      
      const latencyResults = await latencyTester.testNodesLatencyViaMainProcess(proxyServers);
      
      // 更新store中的延迟信息
      const setNodeLatency = useNodeStore.getState().setNodeLatency;
      latencyResults.forEach((result, nodeId) => {
        setNodeLatency(nodeId, result.success ? result.latency : 0);
      });
      
      const successCount = Array.from(latencyResults.values()).filter(r => r.success).length;
      message.success(`刷新完成，${successCount}/${currentNodes.length} 个节点可用`);
      
    } catch (error) {
      console.error('刷新失败:', error);
      message.error(`刷新失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRefreshing(false);
    }
  };

  // 启动代理链
  const handleStartChainProxy = async (chainId?: string) => {
    setLoading(true);
    try {
      let selectedChain;
      
      if (chainId) {
        selectedChain = chainConfigs.find(c => c.id === chainId);
      } else {
        // 使用默认代理链
        selectedChain = chainConfigs.find(c => c.id === defaultChainId);
      }

      if (!selectedChain) {
        message.error('没有可用的代理链，请先配置代理链');
        return;
      }

      // TODO: 实现代理链启动逻辑
      console.log('启动代理链:', selectedChain.name);
      message.success(`代理链启动成功 - ${selectedChain.name}`);
      
      // 更新全局状态
      setProxyConnected(true);
      setProxyStartTime(Date.now());
      setCurrentProxyNode(null);
      setCurrentProxyChain(selectedChain);
      
      log.info('代理链服务已启动', null, 'Dashboard');
    } catch (error) {
      message.error(`代理链启动失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
      log.error('启动代理链失败', error, 'Dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConnection = async () => {
    if (proxyConnected) {
      setLoading(true);
      try {
        await proxyEngine.stop();
        message.success('代理服务已停止');
        
        // 更新全局状态
        setProxyConnected(false);
        setProxyStartTime(null);
        setCurrentProxyNode(null);
        setCurrentProxyChain(null);
        
        log.info('代理服务已停止', null, 'Dashboard');
      } catch (error) {
        message.error(`停止失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
        log.error('停止代理失败', error, 'Dashboard');
      } finally {
        setLoading(false);
      }
    } else {
      // 如果未连接，启动最佳节点
      await handleStartNodeProxy();
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  // 构建下拉菜单
  const buildDropdownMenu = () => {
    const menuItems = [];

    // 所有可用节点
    const availableNodes = nodes.filter(node => {
      const latency = nodeLatencies instanceof Map ? nodeLatencies.get(node.id) : undefined;
      return latency && latency > 0;
    });

    if (availableNodes.length > 0) {
      availableNodes.forEach(node => {
        const latency = nodeLatencies instanceof Map ? nodeLatencies.get(node.id) : undefined;
        menuItems.push({
          key: `node-${node.id}`,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{node.name}</span>
              <Tag color="blue" size="small">{latency}ms</Tag>
            </div>
          ),
          icon: <WifiOutlined />,
          onClick: () => handleStartNodeProxy(node.id)
        });
      });
    }

    // 代理链选项
    if (chainConfigs.length > 0) {
      menuItems.push({
        type: 'divider' as const,
        key: 'divider-chains'
      });

      // 默认代理链
      const defaultChain = chainConfigs.find(c => c.id === defaultChainId);
      if (defaultChain) {
        menuItems.push({
          key: 'start-default-chain',
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>启动代理链 (默认)</span>
              <Tag color="purple" size="small">默认</Tag>
            </div>
          ),
          icon: <LinkOutlined />,
          onClick: () => handleStartChainProxy(defaultChain.id)
        });
      }

      // 所有代理链
      chainConfigs.forEach(chain => {
        menuItems.push({
          key: `chain-${chain.id}`,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{chain.name}</span>
              {chain.id === defaultChainId && <Tag color="purple" size="small">默认</Tag>}
            </div>
          ),
          icon: <LinkOutlined />,
          onClick: () => handleStartChainProxy(chain.id)
        });
      });
    }

    return menuItems;
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <Title level={2}>仪表盘</Title>
        <Space>
          {proxyConnected ? (
            <Button
              danger
              icon={<PauseCircleOutlined />}
              loading={loading}
              onClick={handleToggleConnection}
            >
              停止代理
            </Button>
          ) : (
            <Button.Group>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={loading}
                onClick={() => {
                  console.log('按钮被点击了！');
                  handleStartNodeProxy();
                }}
                style={{ minWidth: '100px' }}
              >
                启动代理
              </Button>
              <Dropdown
                menu={{
                  items: buildDropdownMenu(),
                  style: { minWidth: '200px' }
                }}
                trigger={['click']}
                disabled={loading}
              >
                <Button
                  type="primary"
                  icon={<DownOutlined />}
                  loading={loading}
                  style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.2)' }}
                />
              </Dropdown>
            </Button.Group>
          )}
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleRefreshNodes}
            loading={refreshing}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* 连接状态卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card>
            <div className="connection-status">
              <div className="dashboard-status-indicator">
                <div className={`status-dot ${proxyConnected ? 'connected' : 'disconnected'}`} />
                <Text strong>
                  {proxyConnected ? '已连接' : '未连接'}
                </Text>
              </div>
              {proxyConnected && (
                <div className="connection-info">
                  <Text type="secondary">
                    当前服务器: {currentProxyNode?.name || currentProxyChain?.name || '自动选择'}
                  </Text>
                  <Text type="secondary">
                    运行时间: {proxyStartTime ? Math.floor((Date.now() - proxyStartTime) / 1000) : 0}秒
                  </Text>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="上传流量"
              value={formatBytes(trafficStats.upload)}
              prefix={<CloudOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="下载流量"
              value={formatBytes(trafficStats.download)}
              prefix={<CloudOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="上传速度"
              value={formatSpeed(trafficStats.uploadSpeed)}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="下载速度"
              value={formatSpeed(trafficStats.downloadSpeed)}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 功能卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="快速操作" className="quick-actions-card">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block icon={<BarChartOutlined />} size="large">
                查看详细统计
              </Button>
              <Button block icon={<SettingOutlined />} size="large">
                代理设置
              </Button>
              <Button block icon={<CloudOutlined />} size="large">
                订阅管理
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="系统状态" className="system-status-card">
            <div className="status-item">
              <Text>代理服务</Text>
              <Progress
                percent={proxyConnected ? 100 : 0}
                status={proxyConnected ? 'success' : 'exception'}
                size="small"
              />
            </div>
            <div className="status-item">
              <Text>系统代理</Text>
              <Progress percent={75} size="small" />
            </div>
            <div className="status-item">
              <Text>内存使用</Text>
              <Progress percent={45} size="small" />
            </div>
            <div className="status-item">
              <Text>CPU使用</Text>
              <Progress percent={30} size="small" />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 提示信息 */}
      {!proxyConnected && (
        <Alert
          message="代理服务未启动"
          description="点击'启动代理'按钮开始使用代理服务。首次使用需要先配置代理服务器。"
          type="info"
          showIcon
          style={{ marginTop: 24 }}
        />
      )}
    </div>
  );
};

export default Dashboard;
