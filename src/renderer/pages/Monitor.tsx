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
  Table,
  Tag,
  DatePicker,
  Select,
  Divider,
  Alert,
  List,
  Avatar,
  Tooltip,
  Badge,
  Switch,
  Modal,
  Form,
  Input,
  InputNumber,
  TimePicker,
} from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  DownloadOutlined,
  UploadOutlined,
  EyeOutlined,
  SettingOutlined,
  ReloadOutlined,
  FilterOutlined,
  ExportOutlined,
  ImportOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  CloudOutlined,
  GlobalOutlined,
  WifiOutlined,
  SignalFilled,
} from '@ant-design/icons';
import { TrafficStats, ConnectionStatus } from '../../shared/types/index';
import { log } from '../utils/logger';
import { useTheme } from '../contexts/ThemeContext';
import { monitorManager, ConnectionHistory } from '../utils/monitorManager';
import { formatBytes, formatSpeed } from '../utils/format';
import './Monitor.css';

const { Title, Text } = Typography;

const Monitor: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [trafficStats, setTrafficStats] = useState<TrafficStats>(monitorManager.getTrafficStats());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(monitorManager.getConnectionStatus());
  const [performanceMetrics, setPerformanceMetrics] = useState(monitorManager.getPerformanceMetrics(1)[0]);
  const [connectionHistory, setConnectionHistory] = useState<ConnectionHistory[]>([]);

  // 启动监控
  useEffect(() => {
    monitorManager.startMonitoring();
    
    // 定期更新数据
    const interval = setInterval(() => {
      setTrafficStats(monitorManager.getTrafficStats());
      setConnectionStatus(monitorManager.getConnectionStatus());
      setConnectionHistory(monitorManager.getConnectionHistory()); // 更新连接历史
      const latestMetrics = monitorManager.getPerformanceMetrics(1)[0];
      if (latestMetrics) {
        setPerformanceMetrics(latestMetrics);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      monitorManager.stopMonitoring();
    };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // 获取最新的监控数据
      const newTrafficStats = monitorManager.getTrafficStats();
      const newConnectionStatus = monitorManager.getConnectionStatus();
      
      setTrafficStats(newTrafficStats);
      setConnectionStatus(newConnectionStatus);
      
      log.info('刷新监控数据', null, 'Monitor');
    } catch (error) {
      log.error('刷新监控数据失败', error, 'Monitor');
    } finally {
      setLoading(false);
    }
  };





  const connectionColumns = [
    { title: '域名/IP', dataIndex: 'server', key: 'server' },
    { title: '类型', dataIndex: 'protocol', key: 'protocol' },
    { title: '规则', dataIndex: 'rule', key: 'rule' },
    { title: '链路', dataIndex: 'chains', key: 'chains' },
    { title: '上传', dataIndex: 'upload', key: 'upload', render: (val) => `${(val / 1024).toFixed(2)} KB` },
    { title: '下载', dataIndex: 'download', key: 'download', render: (val) => `${(val / 1024).toFixed(2)} KB` },
    { title: '时间', dataIndex: 'startTime', key: 'startTime', render: (val) => new Date(val).toLocaleTimeString() },
  ];

  return (
    <div className="monitor-page">
      <div className="page-header">
        <Title level={2}>监控统计</Title>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={loading}
        >
          刷新数据
        </Button>
      </div>

      {/* 连接状态提示 */}
      {!connectionStatus.connected && (
        <Alert
          message="代理服务未启动"
          description="请先启动代理服务以查看实时监控数据"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 实时统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="上传流量"
              value={formatBytes(trafficStats.upload)}
              prefix={<CloudOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="下载流量"
              value={formatBytes(trafficStats.download)}
              prefix={<CloudOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="上传速度"
              value={formatSpeed(trafficStats.uploadSpeed)}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
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

      {/* 网络性能 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card title="网络性能" extra={<LineChartOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text>网络延迟</Text>
                <Progress 
                  percent={performanceMetrics ? Math.min(performanceMetrics.latency / 2, 100) : 0} 
                  size="small" 
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {performanceMetrics ? `${performanceMetrics.latency.toFixed(1)} ms` : '0 ms'}
                </Text>
              </div>
              <div>
                <Text>网络吞吐量</Text>
                <Progress 
                  percent={performanceMetrics ? Math.min(performanceMetrics.throughput / 10, 100) : 0} 
                  size="small" 
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {performanceMetrics ? `${performanceMetrics.throughput.toFixed(1)} Mbps` : '0 Mbps'}
                </Text>
              </div>
              <div>
                <Text>丢包率</Text>
                <Progress 
                  percent={performanceMetrics ? performanceMetrics.packetLoss * 20 : 0} 
                  size="small" 
                  strokeColor={performanceMetrics && performanceMetrics.packetLoss > 2 ? '#ff4d4f' : undefined}
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {performanceMetrics ? `${performanceMetrics.packetLoss.toFixed(2)}%` : '0%'}
                </Text>
              </div>
              <div>
                <Text>抖动</Text>
                <Progress 
                  percent={performanceMetrics ? Math.min(performanceMetrics.jitter * 5, 100) : 0} 
                  size="small" 
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {performanceMetrics ? `${performanceMetrics.jitter.toFixed(1)} ms` : '0 ms'}
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 连接历史 */}
      <Card title="连接历史" extra={<ClockCircleOutlined />}>
        <Table
          dataSource={connectionHistory}
          columns={connectionColumns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default Monitor;
