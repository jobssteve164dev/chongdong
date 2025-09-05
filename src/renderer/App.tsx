import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Space, Typography } from 'antd';
import {
  DashboardOutlined,
  SettingOutlined,
  CloudOutlined,
  BarChartOutlined,
  BulbOutlined,
  BulbFilled,
  ClusterOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { chainIPDetector } from './utils/chainIPDetector';
import Dashboard from '@/pages/Dashboard';
import ProxyManagement from '@/pages/ProxyManagement';
import SubscriptionManagement from '@/pages/SubscriptionManagement';
import NodeManagement from './pages/NodeManagement';
import RuleManagement from './pages/RuleManagement';
import Monitor from '@/pages/Monitor';
import Settings from '@/pages/Settings';
import { proxyEngine } from './utils/proxyEngine';
import { useNodeStore } from './utils/stores';
import { useNavigationStore, type PageKey } from './utils/navigationManager';
import './App.css';

const { Sider, Content } = Layout;
const { Title } = Typography;

const AppContent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  // 使用导航管理器
  const currentPage = useNavigationStore((state) => state.currentPage);
  const setCurrentPage = useNavigationStore((state) => state.setCurrentPage);
  
  // 获取全局状态更新函数
  const setProxyConnected = useNodeStore((state) => state.setProxyConnected);
  const setCurrentProxyNode = useNodeStore((state) => state.setCurrentProxyNode);
  const setCurrentProxyChain = useNodeStore((state) => state.setCurrentProxyChain);
  const setTrafficStats = useNodeStore((state) => state.setTrafficStats);

  // 注册proxyEngine状态变化回调
  useEffect(() => {
    const handleStatusChange = (status: any) => {
      setProxyConnected(status.running);
      setTrafficStats({
        connections: status.connections || 0,
        upload: status.upload || 0,
        download: status.download || 0,
        uploadSpeed: 0, // 这些需要计算
        downloadSpeed: 0,
      });
      
      // 如果代理停止，清空当前节点/代理链信息
      if (!status.running) {
        setCurrentProxyNode(null);
        setCurrentProxyChain(null);
      }
    };

    proxyEngine.onStatusChange(handleStatusChange);

    // 监听主进程广播的状态变化（托盘启动/停止等）
    const offStatusChanged = window.electron.ipcRenderer.on('proxy:statusChanged', async (payload: any) => {
      try {
        setProxyConnected(!!payload?.running);
        
        // 如果包含代理链信息，更新代理链状态
        if (payload?.chainId && payload?.running) {
          // 从主进程获取完整的代理链配置信息
          try {
            const chainConfig = await chainIPDetector.getChainConfig(payload.chainId);
            setCurrentProxyChain(chainConfig);
          } catch (error) {
            console.warn('获取代理链配置失败:', error);
            // 设置基本信息作为备选
            const chainInfo = {
              id: payload.chainId,
              name: `Chain-${payload.chainId}`,
              type: payload.source === 'tray-dynamic' ? 'dynamic' : 'static',
              proxies: []
            };
            setCurrentProxyChain(chainInfo);
          }
        } else if (!payload?.running) {
          // 如果代理停止，清空代理链信息
          setCurrentProxyChain(null);
        }
      } catch {}
    });

    return () => {
      proxyEngine.offStatusChange(handleStatusChange);
      try { (offStatusChanged as any)?.(); } catch {}
    };
  }, [setProxyConnected, setCurrentProxyNode, setCurrentProxyChain, setTrafficStats]);

  // 兜底：应用加载时主动同步一次运行状态（托盘可能已先启动）
  useEffect(() => {
    (async () => {
      try {
        const isRunning = await proxyEngine.checkRunningStatus();
        setProxyConnected(!!isRunning);
      } catch {}
    })();
  }, [setProxyConnected]);

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: 'proxy',
      icon: <CloudOutlined />,
      label: '代理管理',
    },
    {
      key: 'subscription',
      icon: <CloudOutlined />,
      label: '订阅管理',
    },
    {
      key: 'rules',
      icon: <CodeOutlined />,
      label: '规则管理',
    },
    {
      key: 'nodes',
      icon: <ClusterOutlined />,
      label: '节点管理',
    },
    {
      key: 'monitor',
      icon: <BarChartOutlined />,
      label: '监控统计',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    setCurrentPage(key as PageKey);
  };

  return (
    <Layout className="app-layout">
      <Sider width={200} className="app-sider">
        <div className="logo">
          <Space direction="vertical" style={{ width: '100%', alignItems: 'center' }}>
            <Title level={4} style={{ color: '#1890ff', margin: '16px 0', textAlign: 'center' }}>
              虫洞
            </Title>
            <Button
              type="text"
              size="small"
              icon={theme === 'light' ? <BulbFilled /> : <BulbOutlined />}
              onClick={toggleTheme}
              title={theme === 'light' ? '切换到深色主题' : '切换到浅色主题'}
            />
          </Space>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[currentPage]}
          style={{ height: '100%', borderRight: 0 }}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Content className="app-content">
          <div className="content-wrapper">
            {currentPage === 'dashboard' && <Dashboard />}
            {currentPage === 'proxy' && <ProxyManagement />}
            {currentPage === 'subscription' && <SubscriptionManagement />}
            {currentPage === 'rules' && <RuleManagement />}
            {currentPage === 'nodes' && <NodeManagement />}
            {currentPage === 'monitor' && <Monitor />}
            {currentPage === 'settings' && <Settings />}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
