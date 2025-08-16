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
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import { ConnectionStatus, TrafficStats } from '../../shared/types/index';
import { log } from '../utils/logger';
import './Dashboard.css';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    upload: 0,
    download: 0,
    uploadSpeed: 0,
    downloadSpeed: 0,
  });
  const [trafficStats, setTrafficStats] = useState<TrafficStats>({
    upload: 0,
    download: 0,
    uploadSpeed: 0,
    downloadSpeed: 0,
    timestamp: Date.now(),
  });
  const [loading, setLoading] = useState(false);

  // 模拟数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionStatus.connected) {
        setTrafficStats((prev: TrafficStats) => ({
          ...prev,
          upload: prev.upload + Math.random() * 1024,
          download: prev.download + Math.random() * 1024,
          uploadSpeed: Math.random() * 1000,
          downloadSpeed: Math.random() * 2000,
          timestamp: Date.now(),
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [connectionStatus.connected]);

  const handleToggleConnection = async () => {
    setLoading(true);
    try {
      const newStatus = !connectionStatus.connected;
      setConnectionStatus((prev: ConnectionStatus) => ({ ...prev, connected: newStatus }));
      
      if (newStatus) {
        log.info('代理服务已启动', null, 'Dashboard');
      } else {
        log.info('代理服务已停止', null, 'Dashboard');
      }
    } catch (error) {
      log.error('切换代理状态失败', error, 'Dashboard');
    } finally {
      setLoading(false);
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

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <Title level={2}>仪表盘</Title>
        <Space>
          <Button
            type="primary"
            icon={connectionStatus.connected ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            loading={loading}
            onClick={handleToggleConnection}
          >
            {connectionStatus.connected ? '停止代理' : '启动代理'}
          </Button>
          <Button icon={<ReloadOutlined />}>刷新</Button>
        </Space>
      </div>

      {/* 连接状态卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card>
            <div className="connection-status">
              <div className="dashboard-status-indicator">
                <div className={`status-dot ${connectionStatus.connected ? 'connected' : 'disconnected'}`} />
                <Text strong>
                  {connectionStatus.connected ? '已连接' : '未连接'}
                </Text>
              </div>
              {connectionStatus.connected && (
                <div className="connection-info">
                  <Text type="secondary">
                    当前服务器: {connectionStatus.currentServer || '自动选择'}
                  </Text>
                  <Text type="secondary">
                    运行时间: {connectionStatus.duration ? Math.floor(connectionStatus.duration / 1000) : 0}秒
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
                percent={connectionStatus.connected ? 100 : 0}
                status={connectionStatus.connected ? 'success' : 'exception'}
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
      {!connectionStatus.connected && (
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
