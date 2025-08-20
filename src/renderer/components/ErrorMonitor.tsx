import React, { useState, useEffect } from 'react';
import {
  Alert,
  Button,
  Modal,
  Table,
  Tag,
  Space,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Badge,
  Tooltip,
  Popconfirm,
  message
} from 'antd';
import {
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  BugOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  StopOutlined
} from '@ant-design/icons';
import { errorHandler, ErrorType, ErrorSeverity, ErrorInfo } from '../utils/errorHandler';
import { log } from '../utils/logger';
import './ErrorMonitor.css';

const { Title, Text, Paragraph } = Typography;

interface ErrorMonitorProps {
  showNotification?: boolean;
  autoResolve?: boolean;
  maxDisplayErrors?: number;
}

const ErrorMonitor: React.FC<ErrorMonitorProps> = ({
  showNotification = true,
  autoResolve = false,
  maxDisplayErrors = 5
}) => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [visible, setVisible] = useState(false);
  const [selectedError, setSelectedError] = useState<ErrorInfo | null>(null);
  const [stats, setStats] = useState(errorHandler.getErrorStats());

  useEffect(() => {
    // 初始化错误列表
    updateErrorList();

    // 注册错误回调
    const handleError = (error: ErrorInfo) => {
      updateErrorList();
      
      // 显示错误通知
      if (showNotification) {
        showErrorNotification(error);
      }

      // 自动解决低严重程度的错误
      if (autoResolve && error.severity === ErrorSeverity.LOW) {
        setTimeout(() => {
          errorHandler.resolveError(error.id, 'auto');
          updateErrorList();
        }, 5000);
      }
    };

    errorHandler.onError(handleError);

    // 定期更新统计信息
    const statsInterval = setInterval(() => {
      setStats(errorHandler.getErrorStats());
    }, 5000);

    return () => {
      errorHandler.offError(handleError);
      clearInterval(statsInterval);
    };
  }, [showNotification, autoResolve]);

  const updateErrorList = () => {
    const unresolvedErrors = errorHandler.getUnresolvedErrors();
    setErrors(unresolvedErrors);
    setStats(errorHandler.getErrorStats());
  };

  const showErrorNotification = (error: ErrorInfo) => {
    const severityColor = getSeverityColor(error.severity);
    const severityIcon = getSeverityIcon(error.severity);

    message.error({
      content: (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
            {severityIcon} {error.message}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {error.details}
          </div>
        </div>
      ),
      duration: 8,
      icon: <BugOutlined style={{ color: severityColor }} />
    });
  };

  const getSeverityColor = (severity: ErrorSeverity): string => {
    switch (severity) {
      case ErrorSeverity.LOW: return '#52c41a';
      case ErrorSeverity.MEDIUM: return '#faad14';
      case ErrorSeverity.HIGH: return '#fa8c16';
      case ErrorSeverity.CRITICAL: return '#f5222d';
      default: return '#666';
    }
  };

  const getSeverityIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.LOW: return <InfoCircleOutlined />;
      case ErrorSeverity.MEDIUM: return <WarningOutlined />;
      case ErrorSeverity.HIGH: return <ExclamationCircleOutlined />;
      case ErrorSeverity.CRITICAL: return <StopOutlined />;
      default: return <BugOutlined />;
    }
  };

  const getErrorTypeText = (type: ErrorType): string => {
    switch (type) {
      case ErrorType.RENDERER_CRASH: return '渲染进程崩溃';
      case ErrorType.GPU_CRASH: return 'GPU进程崩溃';
      case ErrorType.NETWORK_CRASH: return '网络服务崩溃';
      case ErrorType.PROXY_CRASH: return '代理服务错误';
      case ErrorType.DNS_ERROR: return 'DNS解析错误';
      case ErrorType.CONFIG_ERROR: return '配置错误';
      case ErrorType.STORAGE_ERROR: return '存储错误';
      case ErrorType.IPC_ERROR: return '进程通信错误';
      case ErrorType.UNKNOWN_ERROR: return '未知错误';
      default: return '未知错误';
    }
  };

  const handleResolveError = (errorId: string) => {
    errorHandler.resolveError(errorId, 'user');
    updateErrorList();
    message.success('错误已标记为已解决');
  };

  const handleResolveAllErrors = () => {
    errors.forEach(error => {
      errorHandler.resolveError(error.id, 'user');
    });
    updateErrorList();
    message.success('所有错误已标记为已解决');
  };

  const handleClearResolvedErrors = () => {
    errorHandler.clearResolvedErrors();
    message.success('已清除所有已解决的错误');
  };

  const handleShowErrorDetails = (error: ErrorInfo) => {
    setSelectedError(error);
    setVisible(true);
  };

  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: ErrorType) => (
        <Tag color="blue">{getErrorTypeText(type)}</Tag>
      )
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: ErrorSeverity) => (
        <Tag color={getSeverityColor(severity)}>
          {getSeverityIcon(severity)} {severity.toUpperCase()}
        </Tag>
      )
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (message: string, record: ErrorInfo) => (
        <Tooltip title={message}>
          <Text style={{ cursor: 'pointer' }} onClick={() => handleShowErrorDetails(record)}>
            {message}
          </Text>
        </Tooltip>
      )
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      render: (timestamp: number) => (
        <Text type="secondary">
          {new Date(timestamp).toLocaleString()}
        </Text>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record: ErrorInfo) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => handleShowErrorDetails(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleResolveError(record.id)}
          >
            解决
          </Button>
        </Space>
      )
    }
  ];

  const displayErrors = errors.slice(0, maxDisplayErrors);
  const hasMoreErrors = errors.length > maxDisplayErrors;

  if (errors.length === 0) {
    return null;
  }

  return (
    <>
      {/* 错误统计卡片 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="总错误数"
              value={stats.total}
              prefix={<BugOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="未解决"
              value={stats.unresolved}
              valueStyle={{ color: stats.unresolved > 0 ? '#cf1322' : '#3f8600' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已解决"
              value={stats.resolved}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="严重错误"
              value={stats.bySeverity[ErrorSeverity.CRITICAL] || 0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<StopOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* 错误列表 */}
      <Card
        title={
          <Space>
            <Badge count={errors.length} overflowCount={99}>
              <BugOutlined />
            </Badge>
            <span>错误监控</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              size="small"
              onClick={updateErrorList}
              icon={<ReloadOutlined />}
            >
              刷新
            </Button>
            <Popconfirm
              title="确定要标记所有错误为已解决吗？"
              onConfirm={handleResolveAllErrors}
            >
              <Button size="small" type="primary">
                全部解决
              </Button>
            </Popconfirm>
            <Popconfirm
              title="确定要清除所有已解决的错误吗？"
              onConfirm={handleClearResolvedErrors}
            >
              <Button size="small">
                清除已解决
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <Table
          dataSource={displayErrors}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 600 }}
        />
        
        {hasMoreErrors && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text type="secondary">
              还有 {errors.length - maxDisplayErrors} 个错误未显示
            </Text>
          </div>
        )}
      </Card>

      {/* 错误详情模态框 */}
      <Modal
        title="错误详情"
        open={visible}
        onCancel={() => setVisible(false)}
        footer={[
          <Button key="close" onClick={() => setVisible(false)}>
            关闭
          </Button>,
          selectedError && (
            <Button
              key="resolve"
              type="primary"
              onClick={() => {
                handleResolveError(selectedError.id);
                setVisible(false);
              }}
            >
              标记为已解决
            </Button>
          )
        ]}
        width={800}
      >
        {selectedError && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Text strong>错误ID:</Text>
                <br />
                <Text code>{selectedError.id}</Text>
              </Col>
              <Col span={12}>
                <Text strong>时间:</Text>
                <br />
                <Text>{new Date(selectedError.timestamp).toLocaleString()}</Text>
              </Col>
            </Row>
            
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Text strong>类型:</Text>
                <br />
                <Tag color="blue">{getErrorTypeText(selectedError.type)}</Tag>
              </Col>
              <Col span={12}>
                <Text strong>严重程度:</Text>
                <br />
                <Tag color={getSeverityColor(selectedError.severity)}>
                  {getSeverityIcon(selectedError.severity)} {selectedError.severity.toUpperCase()}
                </Tag>
              </Col>
            </Row>

            <div style={{ marginBottom: 16 }}>
              <Text strong>错误消息:</Text>
              <br />
              <Text>{selectedError.message}</Text>
            </div>

            {selectedError.details && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>详细信息:</Text>
                <br />
                <Text type="secondary">{selectedError.details}</Text>
              </div>
            )}

            {selectedError.stack && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>堆栈跟踪:</Text>
                <br />
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: 8, 
                  borderRadius: 4,
                  fontSize: '12px',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  {selectedError.stack}
                </pre>
              </div>
            )}

            {selectedError.context && Object.keys(selectedError.context).length > 0 && (
              <div>
                <Text strong>上下文信息:</Text>
                <br />
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: 8, 
                  borderRadius: 4,
                  fontSize: '12px',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(selectedError.context, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default ErrorMonitor;
