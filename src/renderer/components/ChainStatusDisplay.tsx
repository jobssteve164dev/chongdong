import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Tag, Button, Space, Alert, Spin } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ExclamationCircleOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { ProxyChainStatus, ChainNodeIPInfo } from '../../shared/types/chainStatus';
import { chainIPDetector } from '../utils/chainIPDetector';

interface ChainStatusDisplayProps {
  chainId?: string;
  chainName?: string;
  showIPDetection?: boolean;
  onRefresh?: () => void;
}

const ChainStatusDisplay: React.FC<ChainStatusDisplayProps> = ({
  chainId,
  chainName,
  showIPDetection = false,
  onRefresh
}) => {
  const [chainStatus, setChainStatus] = useState<ProxyChainStatus | null>(null);
  const [nodeIPs, setNodeIPs] = useState<ChainNodeIPInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [ipDetectionLoading, setIpDetectionLoading] = useState(false);
  const [showIPs, setShowIPs] = useState(false);

  // 获取代理链状态
  const fetchChainStatus = async () => {
    if (!chainId) return;
    
    console.log(`[ChainStatusDisplay] 获取代理链状态: ${chainId}`);
    setLoading(true);
    try {
      const status = await chainIPDetector.getChainStatus(chainId);
      console.log(`[ChainStatusDisplay] 代理链状态:`, status);
      setChainStatus(status);
    } catch (error) {
      console.error('获取代理链状态异常:', error);
    } finally {
      setLoading(false);
    }
  };

  // 检测节点IP地址
  const detectNodeIPs = async () => {
    if (!chainId) return;
    
    console.log(`[ChainStatusDisplay] 开始检测代理链节点IP: ${chainId}`);
    setIpDetectionLoading(true);
    try {
      const nodeIPs = await chainIPDetector.detectChainNodeIPs(chainId);
      setNodeIPs(nodeIPs);
    } catch (error) {
      console.error('检测节点IP异常:', error);
    } finally {
      setIpDetectionLoading(false);
    }
  };

  // 初始化仅加载链状态；IP检测改为手动
  useEffect(() => {
    fetchChainStatus();
  }, [chainId]);

  // 取消自动定时刷新IP，仅手动刷新
  useEffect(() => {
    const interval = setInterval(() => {
      fetchChainStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [chainId]);

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'connected':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'stopped':
      case 'disconnected':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'connected':
        return 'success';
      case 'stopped':
      case 'disconnected':
        return 'error';
      case 'error':
        return 'warning';
      default:
        return 'default';
    }
  };

  // 格式化流量
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化运行时间
  const formatUptime = (startTime?: Date) => {
    if (!startTime) return '未知';
    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  };

  if (loading && !chainStatus) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '10px' }}>加载代理链状态中...</div>
        </div>
      </Card>
    );
  }

  if (!chainStatus) {
    return (
      <Card>
        <Alert
          message="代理链状态不可用"
          description="无法获取代理链状态信息，请检查代理链是否正在运行。"
          type="warning"
          showIcon
        />
      </Card>
    );
  }

  return (
    <div className="chain-status-display">
      {/* 代理链概览 */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>
              {getStatusIcon(chainStatus.status)} 
              {chainStatus.chainName || chainName || '代理链'}
            </span>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                size="small" 
                onClick={fetchChainStatus}
                loading={loading}
              >
                刷新
              </Button>
              {onRefresh && (
                <Button 
                  icon={<ReloadOutlined />} 
                  size="small" 
                  onClick={onRefresh}
                >
                  重新加载
                </Button>
              )}
            </Space>
          </div>
        }
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <div className="status-item">
              <div className="status-label">整体状态</div>
              <Tag color={getStatusColor(chainStatus.status)}>
                {chainStatus.status === 'running' ? '运行中' : 
                 chainStatus.status === 'stopped' ? '已停止' : '错误'}
              </Tag>
            </div>
          </Col>
          <Col span={8}>
            <div className="status-item">
              <div className="status-label">入口端口</div>
              <div className="status-value">{chainStatus.entryPort}</div>
            </div>
          </Col>
          <Col span={8}>
            <div className="status-item">
              <div className="status-label">运行时间</div>
              <div className="status-value">{formatUptime(chainStatus.startTime)}</div>
            </div>
          </Col>
        </Row>

        {/* 总流量统计 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={8}>
            <div className="status-item">
              <div className="status-label">总上传</div>
              <div className="status-value">{formatBytes(chainStatus.totalTraffic.upload)}</div>
            </div>
          </Col>
          <Col span={8}>
            <div className="status-item">
              <div className="status-label">总下载</div>
              <div className="status-value">{formatBytes(chainStatus.totalTraffic.download)}</div>
            </div>
          </Col>
          <Col span={8}>
            <div className="status-item">
              <div className="status-label">总连接数</div>
              <div className="status-value">{chainStatus.totalTraffic.connections}</div>
            </div>
          </Col>
        </Row>

        {chainStatus.error && (
          <Alert
            message="错误信息"
            description={chainStatus.error}
            type="error"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {/* 节点状态列表 */}
      <Card title="节点状态" style={{ marginBottom: 16 }}>
        {chainStatus.nodes.map((node, index) => (
          <Card
            key={node.nodeId}
            size="small"
            style={{ marginBottom: 8 }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>
                  {getStatusIcon(node.status)} 
                  节点 {index + 1}: {node.nodeName}
                </span>
                <Tag color={getStatusColor(node.status)}>
                  {node.status === 'connected' ? '已连接' : 
                   node.status === 'disconnected' ? '未连接' : '错误'}
                </Tag>
              </div>
            }
          >
            <Row gutter={[16, 8]}>
              <Col span={6}>
                <div className="node-info">
                  <div className="node-label">类型</div>
                  <div className="node-value">{node.nodeType}</div>
                </div>
              </Col>
              <Col span={6}>
                <div className="node-info">
                  <div className="node-label">服务器</div>
                  <div className="node-value">{node.server}:{node.port}</div>
                </div>
              </Col>
              <Col span={6}>
                <div className="node-info">
                  <div className="node-label">本地端口</div>
                  <div className="node-value">{node.localPort}</div>
                </div>
              </Col>
              <Col span={6}>
                <div className="node-info">
                  <div className="node-label">延迟</div>
                  <div className="node-value">
                    {node.latency ? `${node.latency}ms` : '未知'}
                  </div>
                </div>
              </Col>
            </Row>

            {/* 节点流量统计 */}
            <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
              <Col span={8}>
                <div className="node-info">
                  <div className="node-label">上传</div>
                  <div className="node-value">{formatBytes(node.traffic.upload)}</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="node-info">
                  <div className="node-label">下载</div>
                  <div className="node-value">{formatBytes(node.traffic.download)}</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="node-info">
                  <div className="node-label">连接数</div>
                  <div className="node-value">{node.traffic.connections}</div>
                </div>
              </Col>
            </Row>

            {node.error && (
              <Alert
                message="节点错误"
                description={node.error}
                type="error"
                showIcon
                style={{ marginTop: 8 }}
              />
            )}
          </Card>
        ))}
      </Card>

      {/* IP地址检测功能 */}
      {showIPDetection && (
        <Card 
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>节点IP地址检测</span>
              <Space>
                <Button
                  icon={showIPs ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  size="small"
                  onClick={() => setShowIPs(!showIPs)}
                >
                  {showIPs ? '隐藏IP' : '显示IP'}
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  size="small"
                  onClick={detectNodeIPs}
                  loading={ipDetectionLoading}
                >
                  检测IP
                </Button>
              </Space>
            </div>
          }
        >
          <Alert
            message="隐私提醒"
            description="IP地址检测功能可能会暴露您的网络信息。请谨慎使用，确保在安全的环境下进行检测。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          {nodeIPs.length > 0 ? (
            <div>
              {nodeIPs.map((nodeIP) => (
                <Card
                  key={nodeIP.nodeId}
                  size="small"
                  style={{ marginBottom: 8 }}
                  title={`节点 ${nodeIP.position + 1}: ${nodeIP.nodeName}`}
                >
                  {nodeIP.detected ? (
                    <div>
                      <Row gutter={[16, 8]}>
                        <Col span={12}>
                          <div className="node-info">
                            <div className="node-label">检测到的IP</div>
                            <div className="node-value">
                              {showIPs ? nodeIP.detection.ip : '***.***.***.***'}
                            </div>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div className="node-info">
                            <div className="node-label">检测方法</div>
                            <div className="node-value">{nodeIP.detection.method}</div>
                          </div>
                        </Col>
                      </Row>
                      {nodeIP.detection.geolocation && (
                        <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
                          <Col span={6}>
                            <div className="node-info">
                              <div className="node-label">国家</div>
                              <div className="node-value">{nodeIP.detection.geolocation.country || '未知'}</div>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="node-info">
                              <div className="node-label">地区</div>
                              <div className="node-value">{nodeIP.detection.geolocation.region || '未知'}</div>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="node-info">
                              <div className="node-label">城市</div>
                              <div className="node-value">{nodeIP.detection.geolocation.city || '未知'}</div>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="node-info">
                              <div className="node-label">ISP</div>
                              <div className="node-value">{nodeIP.detection.geolocation.isp || '未知'}</div>
                            </div>
                          </Col>
                        </Row>
                      )}
                    </div>
                  ) : (
                    <Alert
                      message="检测失败"
                      description={nodeIP.detection.error || '无法检测到IP地址'}
                      type="error"
                      showIcon
                    />
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              点击"检测IP"按钮开始检测节点IP地址
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default ChainStatusDisplay;
