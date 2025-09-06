import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Typography,
  Space,
  Button,
  Alert,
  Spin,
  Empty,
  Tag,
  Tooltip
} from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  ReloadOutlined,
  DownloadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface BehaviorSnapshot {
  timestamp: number;
  activeConnections: number;
  bytesPerSecond: number;
}

interface AnalyticsData {
  totalConnections: number;
  averageConnections: number;
  peakConnections: number;
  totalBytes: number;
  averageBytesPerSecond: number;
  peakBytesPerSecond: number;
  activeHours: number[];
  connectionPatterns: { hour: number; connections: number }[];
  trafficPatterns: { hour: number; bytes: number }[];
}

const BehaviorAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [dataStats, setDataStats] = useState<{
    totalSnapshots: number;
    oldestSnapshot: Date | null;
    newestSnapshot: Date | null;
    dataSizeKB: number;
  } | null>(null);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // 从主进程获取真实的行为分析数据
      const result = await window.electron.ipcRenderer.invoke('behavior-analytics:get-data');
      
      if (result.success && result.data) {
        setAnalyticsData(result.data);
        setLastUpdate(new Date());
      } else {
        // 如果获取失败，使用模拟数据作为后备
        console.warn('获取真实数据失败，使用模拟数据:', result.error);
        const mockData: AnalyticsData = {
          totalConnections: 0,
          averageConnections: 0,
          peakConnections: 0,
          totalBytes: 0,
          averageBytesPerSecond: 0,
          peakBytesPerSecond: 0,
          activeHours: [],
          connectionPatterns: Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            connections: 0
          })),
          trafficPatterns: Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            bytes: 0
          }))
        };
        setAnalyticsData(mockData);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('加载行为分析数据失败:', error);
      // 使用空数据作为后备
      const emptyData: AnalyticsData = {
        totalConnections: 0,
        averageConnections: 0,
        peakConnections: 0,
        totalBytes: 0,
        averageBytesPerSecond: 0,
        peakBytesPerSecond: 0,
        activeHours: [],
        connectionPatterns: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          connections: 0
        })),
        trafficPatterns: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          bytes: 0
        }))
      };
      setAnalyticsData(emptyData);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  };

  const loadDataStats = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('behavior-analytics:get-stats');
      if (result.success) {
        setDataStats(result.data);
      }
    } catch (error) {
      console.error('加载数据统计失败:', error);
    }
  };

  const clearAllData = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('behavior-analytics:clear-data');
      if (result.success) {
        // 重新加载数据
        await loadAnalyticsData();
        await loadDataStats();
        console.log('行为分析数据已清理');
      } else {
        console.error('清理数据失败:', result.error);
      }
    } catch (error) {
      console.error('清理数据失败:', error);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
    loadDataStats();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatBytesPerSecond = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  const getActivityLevel = (connections: number): { level: string; color: string } => {
    if (connections <= 2) return { level: '低', color: 'green' };
    if (connections <= 5) return { level: '中', color: 'orange' };
    return { level: '高', color: 'red' };
  };

  if (loading && !analyticsData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>正在加载行为分析数据...</Text>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <Empty
        description="暂无行为分析数据"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      >
        <Button type="primary" onClick={loadAnalyticsData}>
          开始分析
        </Button>
      </Empty>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          <BarChartOutlined style={{ marginRight: 8 }} />
          行为分析
        </Title>
        <Space>
          <Text type="secondary">
            最后更新: {lastUpdate?.toLocaleString()}
          </Text>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={async () => {
              await loadAnalyticsData();
              await loadDataStats();
            }}
            loading={loading}
          >
            刷新数据
          </Button>
          <Button 
            icon={<DownloadOutlined />}
            disabled
          >
            导出报告
          </Button>
        </Space>
      </div>

      <Alert
        message="行为分析说明"
        description="此功能分析您的网络使用模式，帮助您了解自己的上网习惯，同时为隐私防护提供数据支持。所有数据仅在本地处理，不会上传到任何服务器。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* 核心统计指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总连接数"
              value={analyticsData.totalConnections}
              prefix={<LineChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均连接数"
              value={analyticsData.averageConnections}
              precision={1}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="峰值连接数"
              value={analyticsData.peakConnections}
              prefix={<PieChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总流量"
              value={formatBytes(analyticsData.totalBytes)}
              prefix={<DownloadOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 流量统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card title="平均流量速度">
            <Statistic
              value={formatBytesPerSecond(analyticsData.averageBytesPerSecond)}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">当前活动水平: </Text>
              <Tag color={getActivityLevel(analyticsData.averageConnections).color}>
                {getActivityLevel(analyticsData.averageConnections).level}
              </Tag>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card title="峰值流量速度">
            <Statistic
              value={formatBytesPerSecond(analyticsData.peakBytesPerSecond)}
              valueStyle={{ color: '#f5222d' }}
            />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">网络使用强度: </Text>
              <Progress 
                percent={Math.min(100, (analyticsData.peakBytesPerSecond / (1024 * 1024 * 10)) * 100)} 
                size="small"
                status="active"
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 活跃时段分析 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="活跃时段分布">
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">您最活跃的时间段:</Text>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {analyticsData.activeHours.map(hour => (
                <Tag key={hour} color="blue">
                  {hour}:00-{hour + 1}:00
                </Tag>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">
                <InfoCircleOutlined style={{ marginRight: 4 }} />
                建议在这些时段启用更强的隐私防护
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="连接模式分析">
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">连接数分布:</Text>
            </div>
            {analyticsData.connectionPatterns.slice(0, 8).map((pattern, index) => (
              <div key={index} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                <Text style={{ width: 60, fontSize: '12px' }}>
                  {pattern.hour.toString().padStart(2, '0')}:00
                </Text>
                <Progress 
                  percent={(pattern.connections / analyticsData.peakConnections) * 100}
                  size="small"
                  showInfo={false}
                  style={{ flex: 1, margin: '0 8px' }}
                />
                <Text style={{ width: 30, fontSize: '12px', textAlign: 'right' }}>
                  {pattern.connections}
                </Text>
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      {/* 隐私建议 */}
      <Card title="隐私保护建议">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Alert
              message="时间模式混淆"
              description="您的网络使用存在明显的时间模式，建议启用时间泄露防护功能。"
              type="warning"
              showIcon
            />
          </Col>
          <Col xs={24} md={8}>
            <Alert
              message="流量混淆"
              description="在低活跃时段启用混淆流量，可以更好地保护您的隐私。"
              type="info"
              showIcon
            />
          </Col>
          <Col xs={24} md={8}>
            <Alert
              message="行为分析"
              description="定期查看此分析报告，了解并调整您的网络使用习惯。"
              type="success"
              showIcon
            />
          </Col>
        </Row>
      </Card>

      {/* 数据管理 */}
      <Card title="数据管理" style={{ marginTop: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>数据统计信息</Text>
            </div>
            {dataStats ? (
              <div>
                <div style={{ marginBottom: 8 }}>
                  <Text>数据快照数量: </Text>
                  <Text strong>{dataStats.totalSnapshots}</Text>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text>数据文件大小: </Text>
                  <Text strong>{dataStats.dataSizeKB} KB</Text>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text>最早记录: </Text>
                  <Text strong>
                    {dataStats.oldestSnapshot ? dataStats.oldestSnapshot.toLocaleDateString() : '无'}
                  </Text>
                </div>
                <div>
                  <Text>最新记录: </Text>
                  <Text strong>
                    {dataStats.newestSnapshot ? dataStats.newestSnapshot.toLocaleDateString() : '无'}
                  </Text>
                </div>
              </div>
            ) : (
              <Text type="secondary">正在加载数据统计...</Text>
            )}
          </Col>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>数据操作</Text>
            </div>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                danger
                onClick={clearAllData}
                style={{ width: '100%' }}
              >
                清理所有历史数据
              </Button>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                清理后将从本地存储中删除所有历史行为分析数据，但不会影响当前会话的统计。
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default BehaviorAnalytics;
