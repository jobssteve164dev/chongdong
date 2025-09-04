import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Card,
  Space,
  Button,
  Input,
  Select,
  DatePicker,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Tooltip,
  message,
  Modal,
  Divider,
  Badge,
  Empty
} from 'antd';
import {
  ReloadOutlined,
  DownloadOutlined,
  ClearOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { log, LogEntry, LogLevel } from '../utils/logger';
import './LogViewer.css';

const { Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Search } = Input;

interface LogViewerProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxDisplayLogs?: number;
  showFilters?: boolean;
  showStats?: boolean;
}

interface LogViewerState {
  logs: LogEntry[];
  filteredLogs: LogEntry[];
  loading: boolean;
  stats: {
    total: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<string, number>;
    recentLogs: number;
  };
  filters: {
    level: LogLevel | 'all';
    category: string | 'all';
    searchText: string;
    timeRange: [Date, Date] | null;
  };
  selectedLog: LogEntry | null;
  logDetailVisible: boolean;
}

const LogViewer: React.FC<LogViewerProps> = ({
  autoRefresh = true,
  refreshInterval = 5000,
  maxDisplayLogs = 1000,
  showFilters = true,
  showStats = true
}) => {
  const [state, setState] = useState<LogViewerState>({
    logs: [],
    filteredLogs: [],
    loading: false,
    stats: {
      total: 0,
      byLevel: {} as Record<LogLevel, number>,
      byCategory: {},
      recentLogs: 0
    },
    filters: {
      level: 'all',
      category: 'all',
      searchText: '',
      timeRange: null
    },
    selectedLog: null,
    logDetailVisible: false
  });

  // 加载日志数据
  const loadLogs = () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const logs = log.getLogs();
      const stats = log.getLogStats();
      
      setState(prev => ({
        ...prev,
        logs: logs.slice(-maxDisplayLogs),
        stats,
        loading: false
      }));
    } catch (error) {
      console.error('加载日志失败:', error);
      message.error('加载日志失败');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // 应用筛选
  const applyFilters = useMemo(() => {
    return (logs: LogEntry[], filters: LogViewerState['filters']) => {
      let filtered = [...logs];

      // 按级别筛选
      if (filters.level !== 'all') {
        filtered = filtered.filter(log => log.level === filters.level);
      }

      // 按类别筛选
      if (filters.category !== 'all') {
        filtered = filtered.filter(log => log.category === filters.category);
      }

      // 按时间范围筛选
      if (filters.timeRange) {
        const [start, end] = filters.timeRange;
        filtered = filtered.filter(log => 
          log.timestamp >= start.getTime() && log.timestamp <= end.getTime()
        );
      }

      // 按搜索文本筛选
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        filtered = filtered.filter(log =>
          log.message.toLowerCase().includes(searchLower) ||
          log.category.toLowerCase().includes(searchLower) ||
          (log.data && JSON.stringify(log.data).toLowerCase().includes(searchLower))
        );
      }

      return filtered;
    };
  }, []);

  // 更新筛选后的日志
  useEffect(() => {
    const filteredLogs = applyFilters(state.logs, state.filters);
    setState(prev => ({ ...prev, filteredLogs }));
  }, [state.logs, state.filters, applyFilters]);

  // 初始加载和自动刷新
  useEffect(() => {
    loadLogs();

    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(loadLogs, refreshInterval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, refreshInterval, maxDisplayLogs]);

  // 获取日志级别图标
  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      case LogLevel.INFO:
        return <InfoCircleOutlined style={{ color: '#52c41a' }} />;
      case LogLevel.WARN:
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case LogLevel.ERROR:
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <InfoCircleOutlined />;
    }
  };

  // 获取日志级别颜色
  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG: return 'blue';
      case LogLevel.INFO: return 'green';
      case LogLevel.WARN: return 'orange';
      case LogLevel.ERROR: return 'red';
      default: return 'default';
    }
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 显示日志详情
  const showLogDetail = (logEntry: LogEntry) => {
    setState(prev => ({
      ...prev,
      selectedLog: logEntry,
      logDetailVisible: true
    }));
  };

  // 清除日志
  const clearLogs = () => {
    Modal.confirm({
      title: '确认清除日志',
      content: '这将清除所有日志记录，此操作不可撤销。确定要继续吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        try {
          log.clearLogs();
          loadLogs();
          message.success('日志已清除');
        } catch (error) {
          console.error('清除日志失败:', error);
          message.error('清除日志失败');
        }
      }
    });
  };

  // 导出日志
  const exportLogs = () => {
    try {
      const exportData = state.filteredLogs.length > 0 ? state.filteredLogs : state.logs;
      const jsonData = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chongdong_logs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('日志导出成功');
    } catch (error) {
      console.error('导出日志失败:', error);
      message.error('导出日志失败');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp: number) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {formatTimestamp(timestamp)}
        </Text>
      )
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: LogLevel) => (
        <Tag color={getLevelColor(level)} icon={getLevelIcon(level)}>
          {level.toUpperCase()}
        </Tag>
      )
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => (
        <Tag color="blue">{category}</Tag>
      )
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (message: string, record: LogEntry) => (
        <div>
          <Text>{message}</Text>
          {record.data && (
            <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
              (包含数据)
            </Text>
          )}
        </div>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: LogEntry) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => showLogDetail(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // 获取所有类别
  const categories = useMemo(() => {
    const cats = new Set(state.logs.map(log => log.category));
    return Array.from(cats).sort();
  }, [state.logs]);

  return (
    <div className="log-viewer">
      {/* 统计信息 */}
      {showStats && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="总日志数"
                value={state.stats.total}
                prefix={<InfoCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="最近1小时"
                value={state.stats.recentLogs}
                prefix={<Badge count={state.stats.recentLogs} style={{ backgroundColor: '#52c41a' }} />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="错误日志"
                value={state.stats.byLevel[LogLevel.ERROR] || 0}
                valueStyle={{ color: '#cf1322' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="警告日志"
                value={state.stats.byLevel[LogLevel.WARN] || 0}
                valueStyle={{ color: '#faad14' }}
                prefix={<WarningOutlined />}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* 筛选器 */}
      {showFilters && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={6}>
              <Select
                placeholder="选择日志级别"
                value={state.filters.level}
                onChange={(value) => setState(prev => ({
                  ...prev,
                  filters: { ...prev.filters, level: value }
                }))}
                style={{ width: '100%' }}
              >
                <Option value="all">所有级别</Option>
                <Option value={LogLevel.DEBUG}>DEBUG</Option>
                <Option value={LogLevel.INFO}>INFO</Option>
                <Option value={LogLevel.WARN}>WARN</Option>
                <Option value={LogLevel.ERROR}>ERROR</Option>
              </Select>
            </Col>
            <Col span={6}>
              <Select
                placeholder="选择类别"
                value={state.filters.category}
                onChange={(value) => setState(prev => ({
                  ...prev,
                  filters: { ...prev.filters, category: value }
                }))}
                style={{ width: '100%' }}
              >
                <Option value="all">所有类别</Option>
                {categories.map(cat => (
                  <Option key={cat} value={cat}>{cat}</Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <RangePicker
                placeholder={['开始时间', '结束时间']}
                showTime
                onChange={(dates) => setState(prev => ({
                  ...prev,
                  filters: {
                    ...prev.filters,
                    timeRange: dates && dates[0] && dates[1]
                      ? [dates[0].toDate(), dates[1].toDate()]
                      : null
                  }
                }))}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={6}>
              <Search
                placeholder="搜索日志内容"
                value={state.filters.searchText}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  filters: { ...prev.filters, searchText: e.target.value }
                }))}
                onSearch={(value) => setState(prev => ({
                  ...prev,
                  filters: { ...prev.filters, searchText: value }
                }))}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>
          <Row style={{ marginTop: 16 }}>
            <Col>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadLogs}
                  loading={state.loading}
                >
                  刷新
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={exportLogs}
                >
                  导出
                </Button>
                <Button
                  icon={<ClearOutlined />}
                  onClick={clearLogs}
                  danger
                >
                  清除
                </Button>
                <Text type="secondary">
                  显示 {state.filteredLogs.length} / {state.logs.length} 条日志
                </Text>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* 日志表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={state.filteredLogs}
          rowKey={(record) => `${record.timestamp}-${record.level}-${record.category}`}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
          loading={state.loading}
          locale={{
            emptyText: (
              <Empty
                description="暂无日志数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* 日志详情模态框 */}
      <Modal
        title="日志详情"
        open={state.logDetailVisible}
        onCancel={() => setState(prev => ({ ...prev, logDetailVisible: false }))}
        footer={[
          <Button key="close" onClick={() => setState(prev => ({ ...prev, logDetailVisible: false }))}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {state.selectedLog && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Text strong>时间：</Text>
                <Text>{formatTimestamp(state.selectedLog.timestamp)}</Text>
              </Col>
              <Col span={8}>
                <Text strong>级别：</Text>
                <Tag color={getLevelColor(state.selectedLog.level)} icon={getLevelIcon(state.selectedLog.level)}>
                  {state.selectedLog.level.toUpperCase()}
                </Tag>
              </Col>
              <Col span={8}>
                <Text strong>类别：</Text>
                <Tag color="blue">{state.selectedLog.category}</Tag>
              </Col>
            </Row>
            <Divider />
            <div style={{ marginBottom: 16 }}>
              <Text strong>消息：</Text>
              <Paragraph style={{ marginTop: 8, backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4 }}>
                {state.selectedLog.message}
              </Paragraph>
            </div>
            {state.selectedLog.data && (
              <div>
                <Text strong>数据：</Text>
                <Paragraph style={{ marginTop: 8, backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4 }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify(state.selectedLog.data, null, 2)}
                  </pre>
                </Paragraph>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LogViewer;
