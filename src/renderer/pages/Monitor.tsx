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

  // 启动监控
  useEffect(() => {
    monitorManager.startMonitoring();
    
    // 定期更新数据
    const interval = setInterval(() => {
      setTrafficStats(monitorManager.getTrafficStats());
      setConnectionStatus(monitorManager.getConnectionStatus());
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

  const systemMetrics = [
    {
      key: '1',
      metric: 'CPU使用率',
      value: 0,
      formattedValue: '0%',
      unit: '',
      status: '正常',
    },
    {
      key: '2',
      metric: '内存使用率',
      value: 0,
      formattedValue: '0%',
      unit: '',
      status: '正常',
    },
    {
      key: '3',
      metric: '网络延迟',
      value: 0,
      formattedValue: '0',
      unit: 'ms',
      status: '正常',
    },
    {
      key: '4',
      metric: '丢包率',
      value: 0,
      formattedValue: '0%',
      unit: '',
      status: '正常',
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

      {/* 系统指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="系统指标" extra={<DashboardOutlined />}>
            <Table
              columns={columns}
              dataSource={systemMetrics}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="性能监控" extra={<LineChartOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text>CPU使用率</Text>
                <Progress percent={0} size="small" />
              </div>
              <div>
                <Text>内存使用率</Text>
                <Progress percent={0} size="small" />
              </div>
              <div>
                <Text>网络使用率</Text>
                <Progress percent={0} size="small" />
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
