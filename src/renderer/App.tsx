import React, { useState } from 'react';
import { Layout, Menu, Button, Space, Typography, Card, Row, Col } from 'antd';
import {
  DashboardOutlined,
  SettingOutlined,
  CloudOutlined,
  BarChartOutlined,
  BulbOutlined,
  BulbFilled,
} from '@ant-design/icons';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSpinner from '@/components/LoadingSpinner';
import Dashboard from '@/pages/Dashboard';
import ProxyManagement from '@/pages/ProxyManagement';
import SubscriptionManagement from '@/pages/SubscriptionManagement';
import Monitor from '@/pages/Monitor';
import Settings from '@/pages/Settings';
import './App.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const AppContent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [selectedKey, setSelectedKey] = useState('dashboard');

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
          selectedKeys={[selectedKey]}
          style={{ height: '100%', borderRight: 0 }}
          items={menuItems}
          onClick={({ key }) => setSelectedKey(key)}
        />
      </Sider>
      <Layout>
        <Content className="app-content">
          <div className="content-wrapper">
            {selectedKey === 'dashboard' && <Dashboard />}
            {selectedKey === 'proxy' && <ProxyManagement />}
            {selectedKey === 'subscription' && <SubscriptionManagement />}
            {selectedKey === 'monitor' && <Monitor />}
            {selectedKey === 'settings' && <Settings />}
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
