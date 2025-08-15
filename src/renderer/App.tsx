import React from 'react';
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
import './App.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const AppContent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

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
          <Title level={4} style={{ color: '#1890ff', margin: '16px 0', textAlign: 'center' }}>
            虫洞
          </Title>
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          style={{ height: '100%', borderRight: 0 }}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Title level={4} style={{ margin: 0, color: 'inherit' }}>
              虫洞 - 新一代跨平台代理客户端
            </Title>
            <Space>
              <Button
                type="text"
                icon={theme === 'light' ? <BulbFilled /> : <BulbOutlined />}
                onClick={toggleTheme}
                title={theme === 'light' ? '切换到深色主题' : '切换到浅色主题'}
              />
            </Space>
          </Space>
        </Header>
        <Content className="app-content">
          <div className="content-wrapper">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card title="欢迎使用虫洞" className="welcome-card">
                  <div className="welcome-content">
                    <Title level={3}>🚀 欢迎使用虫洞</Title>
                    <Text type="secondary">
                      虫洞是一款现代化的跨平台代理客户端应用，专为用户提供高效、安全、易用的网络代理服务。
                    </Text>
                    <div className="feature-list">
                      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                        <Col xs={24} sm={12} md={8} lg={6}>
                          <Card size="small" className="feature-card">
                            <div className="feature-item">
                              <CloudOutlined className="feature-icon" />
                              <Text strong>多协议支持</Text>
                              <Text type="secondary">支持Clash、Xray、Sing-box等主流协议</Text>
                            </div>
                          </Card>
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={6}>
                          <Card size="small" className="feature-card">
                            <div className="feature-item">
                              <BarChartOutlined className="feature-icon" />
                              <Text strong>实时监控</Text>
                              <Text type="secondary">流量统计和连接状态监控</Text>
                            </div>
                          </Card>
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={6}>
                          <Card size="small" className="feature-card">
                            <div className="feature-item">
                              <SettingOutlined className="feature-icon" />
                              <Text strong>链式代理</Text>
                              <Text type="secondary">可视化配置链式代理规则</Text>
                            </div>
                          </Card>
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={6}>
                          <Card size="small" className="feature-card">
                            <div className="feature-item">
                              <DashboardOutlined className="feature-icon" />
                              <Text strong>订阅管理</Text>
                              <Text type="secondary">支持订阅链接解析和自动更新</Text>
                            </div>
                          </Card>
                        </Col>
                      </Row>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
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
