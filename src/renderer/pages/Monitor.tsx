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
  DashboardOutlined,
} from '@ant-design/icons';
import { TrafficStats, ConnectionStatus } from '../../shared/types/index';
import { log } from '../utils/logger';
import { useTheme } from '../contexts/ThemeContext';
import { monitorManager } from '../utils/monitorManager';
import './Monitor.css';

const { Title, Text } = Typography;

const Monitor: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [trafficStats, setTrafficStats] = useState<TrafficStats>(monitorManager.getTrafficStats());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(monitorManager.getConnectionStatus());
  const [systemMetrics, setSystemMetrics] = useState(monitorManager.getSystemMetrics());
  const [performanceMetrics, setPerformanceMetrics] = useState(monitorManager.getPerformanceMetrics(1)[0]);

  // 启动监控
  useEffect(() => {
    monitorManager.startMonitoring();
    
    // 定期更新数据
    const interval = setInterval(() => {
      setTrafficStats(monitorManager.getTrafficStats());
      setConnectionStatus(monitorManager.getConnectionStatus());
      setSystemMetrics(monitorManager.getSystemMetrics());
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

  const columns = [
    {
      title: '指标',
      dataIndex: 'metric',
      key: 'metric',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '当前值',
      dataIndex: 'value',
      key: 'value',
      render: (value: any, record: any) => (
        <div>
          <Text>{record.formattedValue}</Text>
          {record.unit && <Text type="secondary"> {record.unit}</Text>}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === '正常' ? 'success' : status === '警告' ? 'warning' : 'error';
        return <Tag color={color}>{status}</Tag>;
      },
    },
  ];

  const systemMetricsData = [
    {
      key: '1',
      metric: 'CPU使用率',
      value: systemMetrics.cpuUsage,
      formattedValue: `${systemMetrics.cpuUsage.toFixed(1)}%`,
      unit: '',
      status: systemMetrics.cpuUsage < 80 ? '正常' : systemMetrics.cpuUsage < 95 ? '警告' : '异常',
    },
    {
      key: '2',
      metric: '内存使用率',
      value: systemMetrics.memoryUsage,
      formattedValue: `${systemMetrics.memoryUsage.toFixed(1)}%`,
      unit: '',
      status: systemMetrics.memoryUsage < 80 ? '正常' : systemMetrics.memoryUsage < 95 ? '警告' : '异常',
    },
    {
      key: '3',
      metric: '磁盘使用率',
      value: systemMetrics.diskUsage,
      formattedValue: `${systemMetrics.diskUsage.toFixed(1)}%`,
      unit: '',
      status: systemMetrics.diskUsage < 80 ? '正常' : systemMetrics.diskUsage < 95 ? '警告' : '异常',
    },
    {
      key: '4',
      metric: '网络使用率',
      value: systemMetrics.networkUsage,
      formattedValue: `${systemMetrics.networkUsage.toFixed(1)}%`,
      unit: '',
      status: systemMetrics.networkUsage < 80 ? '正常' : systemMetrics.networkUsage < 95 ? '警告' : '异常',
    },
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
              value={trafficStats.upload}
              prefix={<CloudOutlined />}
              suffix="MB"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="下载流量"
              value={trafficStats.download}
              prefix={<CloudOutlined />}
              suffix="MB"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="上传速度"
              value={trafficStats.uploadSpeed}
              prefix={<ThunderboltOutlined />}
              suffix="KB/s"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="下载速度"
              value={trafficStats.downloadSpeed}
              prefix={<ThunderboltOutlined />}
              suffix="KB/s"
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 系统指标和网络性能 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="系统指标" extra={<DashboardOutlined />}>
            <Table
              columns={columns}
              dataSource={systemMetricsData}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
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
        <div className="connection-history">
          <Text type="secondary">暂无连接历史数据</Text>
        </div>
      </Card>
    </div>
  );
};

export default Monitor;
