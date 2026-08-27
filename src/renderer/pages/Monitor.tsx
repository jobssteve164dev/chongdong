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
  Alert,
} from 'antd';
import {
  LineChartOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  CloudOutlined,
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
  const [performanceSummary, setPerformanceSummary] = useState(monitorManager.getPerformanceSummary());
  const [connectionHistory, setConnectionHistory] = useState<ConnectionHistory[]>([]);
  const [testingPerformance, setTestingPerformance] = useState(false);

  // 启动监控
  useEffect(() => {
    const initMonitoring = async () => {
      await monitorManager.startMonitoring();
    };
    
    initMonitoring();
    
    // 定期更新数据
    const interval = setInterval(() => {
      setTrafficStats(monitorManager.getTrafficStats());
      setConnectionStatus(monitorManager.getConnectionStatus());
      setConnectionHistory(monitorManager.getConnectionHistory()); // 更新连接历史
      const latestMetrics = monitorManager.getPerformanceMetrics(1)[0];
      if (latestMetrics) {
        setPerformanceMetrics(latestMetrics);
      }
      setPerformanceSummary(monitorManager.getPerformanceSummary()); // 更新性能摘要
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

  const handleTestPerformance = async () => {
    setTestingPerformance(true);
    try {
      await monitorManager.triggerPerformanceTest();
      // 更新性能数据
      const latestMetrics = monitorManager.getPerformanceMetrics(1)[0];
      if (latestMetrics) {
        setPerformanceMetrics(latestMetrics);
      }
      setPerformanceSummary(monitorManager.getPerformanceSummary());
      log.info('手动性能测试完成', null, 'Monitor');
    } catch (error) {
      log.error('手动性能测试失败', error, 'Monitor');
    } finally {
      setTestingPerformance(false);
    }
  };





  const connectionColumns = [
    { title: '域名/IP', dataIndex: 'server', key: 'server' },
    { title: '类型', dataIndex: 'protocol', key: 'protocol' },
    { title: '规则', dataIndex: 'rule', key: 'rule' },
    { title: '链路', dataIndex: 'chains', key: 'chains' },
    { title: '上传', dataIndex: 'upload', key: 'upload', render: (val: number) => `${(val / 1024).toFixed(2)} KB` },
    { title: '下载', dataIndex: 'download', key: 'download', render: (val: number) => `${(val / 1024).toFixed(2)} KB` },
    { title: '时间', dataIndex: 'startTime', key: 'startTime', render: (val: number) => new Date(val).toLocaleTimeString() },
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
          <Card 
            title="网络性能" 
            extra={
              <Space>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<ReloadOutlined />} 
                  loading={testingPerformance}
                  onClick={handleTestPerformance}
                  disabled={!connectionStatus.connected}
                >
                  测试性能
                </Button>
                <LineChartOutlined />
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* 当前延迟 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text strong>网络延迟</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    测试次数: {performanceSummary.testCount} | 
                    最后测试: {performanceSummary.lastTestTime ? new Date(performanceSummary.lastTestTime).toLocaleTimeString() : '未测试'}
                  </Text>
                </div>
                <Progress 
                  percent={performanceSummary.currentLatency > 0 ? Math.min(performanceSummary.currentLatency / 2, 100) : 0} 
                  size="small" 
                  strokeColor={performanceSummary.currentLatency > 100 ? '#ff4d4f' : performanceSummary.currentLatency > 50 ? '#faad14' : '#52c41a'}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: 4 }}>
                  <Text type="secondary">当前: {performanceSummary.currentLatency.toFixed(1)} ms</Text>
                  <Text type="secondary">平均: {performanceSummary.averageLatency.toFixed(1)} ms</Text>
                  <Text type="secondary">范围: {performanceSummary.minLatency.toFixed(1)} - {performanceSummary.maxLatency.toFixed(1)} ms</Text>
                </div>
              </div>

              {/* 网络吞吐量 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text strong>网络吞吐量</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    基于实时流量统计
                  </Text>
                </div>
                <Progress 
                  percent={performanceSummary.currentThroughput > 0 ? Math.min(performanceSummary.currentThroughput / 10, 100) : 0} 
                  size="small" 
                  strokeColor={performanceSummary.currentThroughput > 100 ? '#52c41a' : performanceSummary.currentThroughput > 50 ? '#faad14' : '#ff4d4f'}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: 4 }}>
                  <Text type="secondary">当前: {performanceSummary.currentThroughput.toFixed(1)} Mbps</Text>
                  <Text type="secondary">平均: {performanceSummary.averageThroughput.toFixed(1)} Mbps</Text>
                </div>
              </div>

              {/* 丢包率 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text strong>丢包率</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    基于HTTP测试包
                  </Text>
                </div>
                <Progress 
                  percent={performanceSummary.currentPacketLoss * 20} 
                  size="small" 
                  strokeColor={performanceSummary.currentPacketLoss > 2 ? '#ff4d4f' : performanceSummary.currentPacketLoss > 1 ? '#faad14' : '#52c41a'}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: 4 }}>
                  <Text type="secondary">当前: {performanceSummary.currentPacketLoss.toFixed(2)}%</Text>
                  <Text type="secondary">平均: {performanceSummary.averagePacketLoss.toFixed(2)}%</Text>
                </div>
              </div>

              {/* 抖动 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text strong>抖动</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    基于延迟变化
                  </Text>
                </div>
                <Progress 
                  percent={performanceSummary.currentJitter > 0 ? Math.min(performanceSummary.currentJitter * 5, 100) : 0} 
                  size="small" 
                  strokeColor={performanceSummary.currentJitter > 10 ? '#ff4d4f' : performanceSummary.currentJitter > 5 ? '#faad14' : '#52c41a'}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: 4 }}>
                  <Text type="secondary">当前: {performanceSummary.currentJitter.toFixed(1)} ms</Text>
                </div>
              </div>

              {/* 连接状态提示 */}
              {!connectionStatus.connected && (
                <Alert
                  message="代理未连接"
                  description="请先启动代理服务以进行网络性能测试"
                  type="warning"
                  showIcon
                  style={{ marginTop: 8 }}
                />
              )}
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
