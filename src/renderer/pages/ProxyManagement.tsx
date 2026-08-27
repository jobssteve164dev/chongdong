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
import { proxyEngine } from '../utils/proxyEngine';
import { systemProxy, ProxySettings } from '../utils/systemProxy';
import { assertSuccessfulIpcResult } from '../../shared/proxyRuntime';
import { ChainConfig, ProxyNode, AppSettings, Subscription } from '../../shared/types';
import { Storage, STORAGE_KEYS } from '../utils/storage';
import ProxyChainBuilder from '../components/ProxyChainBuilder';
import NodeSelector from '../components/NodeSelector';
import { useNodeStore, NodeStore } from '../utils/stores';
import { DefaultSettings } from '../utils/defaultSettings';
import ChainStatusDisplay from '../components/ChainStatusDisplay';
import { customServerManager } from '../utils/customServerManager';
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
  
  // 从 Zustand store 获取节点
  const nodes = useNodeStore((state: NodeStore) => state.nodes);
  
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
    // 添加自定义服务器分组
    subMap['custom'] = '自定义服务器';
    // 添加一个用于"未分组"节点的特殊条目
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
              wsHost: server.wsHeaders?.['Host'],
            };
            nodesFromSubscriptions.push(node);
          }
        });
      }
    });

    // 添加自定义服务器
    const customServers = customServerManager.getCustomServers();
    const customNodes: ProxyNode[] = customServers.map(server => ({
      id: server.id,
      name: server.name,
      type: server.protocol as any,
      server: server.host,
      port: server.port,
      subscriptionId: 'custom', // 设置为自定义分组
      uuid: server.uuid,
      password: server.password,
      encryption: server.encryption,
      network: server.network,
      wsPath: server.wsPath,
      wsHost: server.wsHeaders?.['Host'],
    }));

    // 合并从订阅生成的节点、自定义服务器和现有的手动添加的节点
    const manualNodes = nodes.filter(node => !node.subscriptionId && node.subscriptionId !== 'custom');
    const allNodes = [...nodesFromSubscriptions, ...customNodes, ...manualNodes];

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
      // 清理现有代理状态
      try {
        const cleanupResult = await window.electron.ipcRenderer.invoke('proxy:cleanup');
        assertSuccessfulIpcResult(cleanupResult, '无法清理上一条代理链路');
        console.log('代理状态清理完成');
      } catch (cleanupError) {
        throw new Error(`启动前清理失败: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
      }
      
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

      const started = await proxyEngine.startWithNode(selectedNode, settings || defaultSettings);
      if (!started) {
        throw new Error(proxyEngine.getStatus().error || '代理引擎未能进入运行状态');
      }
      
      // 启动代理后，设置系统代理
      const finalSettings = settings || defaultSettings;
      const socksPort = finalSettings.socksPort || 7896;
      const httpPort = finalSettings.proxyPort || 7897;
      await systemProxy.setSystemProxy('127.0.0.1', socksPort, httpPort);
      
      // 更新全局状态
      setProxyConnected(true);
      setCurrentProxyNode(selectedNode);
      setCurrentProxyChain(null);
      
      // 广播状态变化到主进程，通知Dashboard刷新
      try {
        const broadcastResult = await window.electron.ipcRenderer.invoke('proxy:broadcastStatus', {
          running: true,
          source: 'proxy-management-node',
          nodeId: selectedNode.id,
          nodeName: selectedNode.name
        });
        assertSuccessfulIpcResult(broadcastResult, '无法同步代理运行状态');
      } catch (error) {
        throw new Error(`代理状态同步失败: ${error instanceof Error ? error.message : String(error)}`);
      }

      message.success('代理连接已启动');
      loadSystemProxy();
    } catch (error) {
      try {
        await window.electron.ipcRenderer.invoke('proxy:cleanup');
      } catch (cleanupError) {
        console.error('代理启动失败后的回滚也失败:', cleanupError);
      }
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
      // 清理现有代理状态
      try {
        const cleanupResult = await window.electron.ipcRenderer.invoke('proxy:cleanup');
        assertSuccessfulIpcResult(cleanupResult, '无法清理上一条代理链路');
        console.log('代理状态清理完成');
      } catch (cleanupError) {
        throw new Error(`启动前清理失败: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
      }
      
      // 最终修复：从存储中获取用户设置，找到指定的端口号
      const userSettings = Storage.get<AppSettings>(
        STORAGE_KEYS.SETTINGS,
        DefaultSettings.getDefaultAppSettings()
      ) || DefaultSettings.getDefaultAppSettings();
      const listenPort = userSettings.mixedPort || 7897; // 使用用户设置的混合端口，如果没有则使用默认值
      
      console.log(`[ProxyManagement] Attempting to start chain with user-defined port: ${listenPort}`);

      const result = chain.type === 'dynamic'
        ? await window.electron.ipcRenderer.invoke('proxy:start-dynamic-chain', { chain, listenPort })
        : await window.electron.ipcRenderer.invoke('proxy:start-static-chain', {
            chain,
            listenPort,
            nodes: chain.proxies.map(nodeId => nodes.find(node => node.id === nodeId)).filter(Boolean)
          });

      assertSuccessfulIpcResult(result, `启动${chain.type === 'dynamic' ? '动态' : '静态'}代理链失败`);
      const startedPort = Number((result as { port?: number }).port);
      if (!Number.isInteger(startedPort) || startedPort < 1 || startedPort > 65535) {
        throw new Error('代理链启动后未返回有效监听端口');
      }

      await systemProxy.setSystemProxy('127.0.0.1', startedPort, startedPort);
      
      // 更新全局状态
      setProxyConnected(true);
      setCurrentProxyNode(null);
      setCurrentProxyChain(chain);
      
      // 广播状态变化到主进程，通知Dashboard刷新
      try {
        const broadcastResult = await window.electron.ipcRenderer.invoke('proxy:broadcastStatus', {
          running: true,
          source: 'proxy-management-chain',
          chainId: chain.id,
          chainName: chain.name,
          chainType: chain.type
        });
        assertSuccessfulIpcResult(broadcastResult, '无法同步代理链运行状态');
      } catch (error) {
        throw new Error(`代理链状态同步失败: ${error instanceof Error ? error.message : String(error)}`);
      }

      message.success(`${chain.type === 'dynamic' ? '动态' : '静态'}代理链 \"${chain.name}\" 已启动`);
      loadSystemProxy();
    } catch (error) {
      try {
        await window.electron.ipcRenderer.invoke('proxy:cleanup');
      } catch (cleanupError) {
        console.error('代理链启动失败后的回滚也失败:', cleanupError);
      }
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

      {/* 代理链状态显示 */}
      {proxyConnected && currentProxyChain && (
        <div style={{ marginTop: 24 }}>
          <ChainStatusDisplay
            chainId={currentProxyChain.id}
            chainName={currentProxyChain.name}
            showIPDetection={true}
            onRefresh={() => {
              // 刷新代理链状态
              console.log('刷新代理链状态');
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ProxyManagement;
