import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Tabs,
  message,
  Modal,
  Tag,
} from 'antd';
import {
  PlayCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { proxyEngine, ProxyStatus } from '../utils/proxyEngine';
import { systemProxy, ProxySettings } from '../utils/systemProxy';
import { ChainConfig, ProxyNode, AppSettings, Subscription } from '../../shared/types';
import { Storage, STORAGE_KEYS } from '../utils/storage';
import ProxyChainBuilder from '../components/ProxyChainBuilder';
import NodeSelector from '../components/NodeSelector';
import { useNodeStore, NodeStore } from '../utils/stores';
import { DefaultSettings } from '../utils/defaultSettings';
import './ProxyManagement.css';
import * as _ from 'lodash';

const { TabPane } = Tabs;

interface GroupedNodes {
  [subscriptionId: string]: ProxyNode[];
}

const ProxyManagement: React.FC = () => {
  const [chainConfigs, setChainConfigs] = useState<ChainConfig[]>([]);
  const [systemProxySettings, setSystemProxySettings] = useState<ProxySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [groupedNodes, setGroupedNodes] = useState<GroupedNodes>({});
  const [subscriptionMap, setSubscriptionMap] = useState<Record<string, string>>({});
  
  // 从 Zustand store 获取节点和延迟信息
  const nodes = useNodeStore((state: NodeStore) => state.nodes);
  const nodeLatencies = useNodeStore((state: NodeStore) => state.nodeLatencies);
  const defaultChainId = useNodeStore((state: NodeStore) => state.defaultChainId);
  const setNodeLatencies = useNodeStore((state: NodeStore) => state.setNodeLatencies);
  
  // 从store获取全局代理连接状态
  const proxyConnected = useNodeStore((state: NodeStore) => state.proxyConnected);
  const setProxyConnected = useNodeStore((state: NodeStore) => state.setProxyConnected);
  const currentProxyNode = useNodeStore((state: NodeStore) => state.currentProxyNode);
  const setCurrentProxyNode = useNodeStore((state: NodeStore) => state.setCurrentProxyNode);
  const currentProxyChain = useNodeStore((state: NodeStore) => state.currentProxyChain);
  const setCurrentProxyChain = useNodeStore((state: NodeStore) => state.setCurrentProxyChain);
  const trafficStats = useNodeStore((state: NodeStore) => state.trafficStats);

  useEffect(() => {
    loadChainConfigs();
    loadSystemProxy();
    loadAndGroupNodes();

    const handlePortInUse = (data: { port: number; processId: string }) => {
      Modal.confirm({
        title: '端口被占用',
        content: `端口 ${data.port} 已被占用。是否终止占用该端口的进程？`,
        onOk: async () => {
          await window.electron.ipcRenderer.invoke('proxy:killProcessOnPort', data.port);
          message.info('进程已终止，请重试启动代理。');
        },
      });
    };

    window.electron.ipcRenderer.on('proxy:portInUse', handlePortInUse);

    return () => {
      // 清理IPC监听器
    };
  }, []);

  useEffect(() => {
    // 当节点列表变化时，重新进行分组
    loadAndGroupNodes();
  }, [nodes]);

  const loadAndGroupNodes = () => {
    const subscriptions = Storage.get<Subscription[]>(STORAGE_KEYS.SUBSCRIPTION_CONFIG, []) || [];
    const subMap: Record<string, string> = {};
    subscriptions.forEach(sub => {
      subMap[sub.id] = sub.name;
    });
    // 添加一个用于“未分组”节点的特殊条目
    subMap['ungrouped'] = '手动添加/未分组';
    setSubscriptionMap(subMap);

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

    // 按订阅ID分组
    const grouped = _.groupBy(allNodes, (node: ProxyNode) => node.subscriptionId || 'ungrouped');
    setGroupedNodes(grouped);
  };

  const loadChainConfigs = () => {
    const savedChainConfigs = Storage.get<ChainConfig[]>('chain_configs', []) || [];
    setChainConfigs(savedChainConfigs);
  };

  const saveChainConfigs = (configs: ChainConfig[]) => {
    Storage.set('chain_configs', configs);
    setChainConfigs(configs);
    // 同步到主进程：保存到磁盘并刷新托盘菜单；失败则回退为仅刷新缓存
    try {
      // 落盘 + 刷新托盘
      (window as any).electron?.ipcRenderer?.invoke('chains:save', configs).catch(() => {
        // 仅更新缓存 + 刷新托盘
        (window as any).electron?.ipcRenderer?.invoke('chains:updateSaved', configs).catch(() => {});
      });
    } catch (_) {
      try { (window as any).electron?.ipcRenderer?.invoke('chains:updateSaved', configs); } catch {}
    }
  };

  const loadSystemProxy = async () => {
    const settings = await systemProxy.getSystemProxy();
    setSystemProxySettings(settings);
  };



  const handleStartProxy = async (selectedNodeId: string) => {
    setLoading(true);
    try {
      const selectedNode = nodes.find((n: ProxyNode) => n.id === selectedNodeId);
      if (!selectedNode) {
        throw new Error('未找到所选节点');
      }

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
      message.success('代理引擎启动成功');
      
      // 启动代理后，设置系统代理
      try {
        // 使用设置中的实际端口配置
        const finalSettings = settings || defaultSettings;
        const socksPort = finalSettings.socksPort || 7896; // SOCKS端口
        const httpPort = finalSettings.proxyPort || 7897; // HTTP端口
        console.log('当前设置中的端口配置:', {
          proxyPort: finalSettings.proxyPort,
          socksPort: finalSettings.socksPort,
          mixedPort: finalSettings.mixedPort
        });
        console.log(`设置系统代理 - SOCKS: ${socksPort}, HTTP: ${httpPort}`);
        await systemProxy.setSystemProxy('127.0.0.1', socksPort, httpPort);
        console.log(`系统代理已设置 - HTTP/HTTPS: 127.0.0.1:${httpPort}, SOCKS: 127.0.0.1:${socksPort}`);
      } catch (proxyError) {
        console.error('设置系统代理失败:', proxyError);
        message.warning('代理引擎启动成功，但系统代理设置失败，可能需要管理员权限');
      }
      
      // 更新全局状态
      setProxyConnected(true);
      setCurrentProxyNode(selectedNode);
      setCurrentProxyChain(null);
      
      loadSystemProxy();
    } catch (error) {
      message.error(`代理启动失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // 更新全局状态
      setProxyConnected(false);
      setCurrentProxyNode(null);
      setCurrentProxyChain(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChainProxy = async (chain: ChainConfig) => {
    setLoading(true);
    try {
      // 最终修复：从存储中获取用户设置，找到指定的端口号
      const userSettings = Storage.get<AppSettings>(STORAGE_KEYS.SETTINGS, DefaultSettings.getDefaultAppSettings());
      const listenPort = userSettings.mixedPort || 7897; // 使用用户设置的混合端口，如果没有则使用默认值
      
      console.log(`[ProxyManagement] Attempting to start chain with user-defined port: ${listenPort}`);

      if (chain.type === 'dynamic') {
        const result = await window.electron.ipcRenderer.invoke('proxy:start-dynamic-chain', { chain, listenPort });
        if (result.success && result.port) {
          message.success(`动态代理链 \"${chain.name}\" 已在端口 ${result.port} 启动`);
          // 使用返回的、确认已成功监听的端口号设置系统代理
          try {
            await systemProxy.setSystemProxy('127.0.0.1', result.port, result.port);
            console.log(`系统代理已设置为: 127.0.0.1:${result.port} (HTTP/SOCKS)`);
          } catch (proxyError) {
            console.error('设置系统代理失败:', proxyError);
            message.warning('代理链启动成功，但系统代理设置失败');
          }
        } else {
          throw new Error(result.error || '启动动态代理链失败，未返回端口号');
        }
      } else {
        // TODO: 实现静态代理链启动逻辑
        console.log('启动静态代理链:', chain.name);
        // 对于静态链，也需要类似地获取端口并传递
        message.info('静态代理链启动功能尚未实现');
      }
      
      // 更新全局状态
      setProxyConnected(true);
      setCurrentProxyNode(null);
      setCurrentProxyChain(chain);
      
      loadSystemProxy();
    } catch (error) {
      message.error(`启动失败: ${error instanceof Error ? error.message : '未知错误'}`);
      // 更新全局状态
      setProxyConnected(false);
      setCurrentProxyNode(null);
      setCurrentProxyChain(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStopProxy = async () => {
    setLoading(true);
    try {
      await proxyEngine.stop();
      message.success('代理引擎已停止');
      
      // 停止代理后，清理系统代理
      try {
        await systemProxy.clearSystemProxy();
        console.log('系统代理已清理');
      } catch (proxyError) {
        console.error('清理系统代理失败:', proxyError);
        message.warning('代理引擎已停止，但系统代理清理失败');
      }
      
      // 更新全局状态
      setProxyConnected(false);
      setCurrentProxyNode(null);
      setCurrentProxyChain(null);
      
      loadSystemProxy();
    } catch (error) {
      message.error(`停止失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChainBuilderSave = (chainData: { name: string; description: string; nodes: any[], type: 'static' | 'dynamic', proxies: string[] }) => {
    const newChain: ChainConfig = {
      id: `chain_${Date.now()}`,
      name: chainData.name,
      description: chainData.description,
      type: chainData.type,
      proxies: chainData.proxies,
      rules: [],
      enabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    saveChainConfigs([...chainConfigs, newChain]);
    message.success('代理链保存成功');
  };

  const handleDeleteChain = (chainId: string) => {
    const updatedChains = chainConfigs.filter(chain => chain.id !== chainId);
    saveChainConfigs(updatedChains);
    message.success('代理链已删除');
  };

  return (
    <div className="proxy-management">
      <div className="proxy-header">
        <h2>代理管理</h2>
        <Button
            type={proxyConnected ? "default" : "primary"}
            danger={proxyConnected}
            icon={proxyConnected ? <StopOutlined /> : <PlayCircleOutlined />}
            onClick={proxyConnected ? handleStopProxy : () => message.info('请在下方选择一个节点或代理链以启动')}
            loading={loading}
          >
            {proxyConnected ? '停止代理' : '启动代理'}
        </Button>
      </div>

      <div className="status-cards">
        <Card title="代理状态" className="status-card">
            <div className="status-item">
              <span>运行状态:</span>
              <Tag color={proxyConnected ? 'green' : 'red'}>
                {proxyConnected ? '运行中' : '已停止'}
              </Tag>
            </div>
            {proxyConnected && (
              <>
                <div className="status-item">
                  <span>当前节点:</span>
                  <span>{currentProxyNode?.name || currentProxyChain?.name || '未知'}</span>
                </div>
                <div className="status-item">
                  <span>连接数:</span>
                  <span>{trafficStats.connections}</span>
                </div>
              </>
            )}
        </Card>
        <Card title="系统代理" className="status-card">
            <div className="status-item">
              <span>状态:</span>
              <Tag color={systemProxySettings?.enabled ? 'green' : 'red'}>
                {systemProxySettings?.enabled ? '已启用' : '未启用'}
              </Tag>
            </div>
        </Card>
      </div>

      <Tabs defaultActiveKey="nodes">
        <TabPane tab="选择节点" key="nodes">
          <Card title="可用节点列表">
            <NodeSelector 
              nodes={nodes} 
              onSelect={handleStartProxy} 
            />
          </Card>
        </TabPane>
        <TabPane tab="代理链" key="chains">
          <Card title="配置代理链">
            <ProxyChainBuilder 
              nodes={nodes}
              groupedNodes={groupedNodes}
              subscriptionMap={subscriptionMap}
              onSave={handleChainBuilderSave} 
              existingChains={chainConfigs}
              onDeleteChain={handleDeleteChain}
              onStartChain={handleStartChainProxy}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ProxyManagement;
