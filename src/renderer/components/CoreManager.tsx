import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Tag, Modal, message, Alert, Row, Col, Typography, Divider } from 'antd';
import { DownloadOutlined, CheckCircleOutlined, ReloadOutlined, DatabaseOutlined } from '@ant-design/icons';
import { CoreManager as CoreManagerUtil, CoreStatus } from '../utils/coreManager';
import './CoreManager.css';

const { Title, Text } = Typography;

interface CoreManagerProps {
  onCoreStatusChange?: (status: CoreStatus) => void;
}

const CoreManager: React.FC<CoreManagerProps> = ({ onCoreStatusChange }) => {
  const [coresStatus, setCoresStatus] = useState<CoreStatus>({ 
    singbox: false, 
    xray: false, 
    clash: false,
    geoip: false,
    geosite: false
  });
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  // 加载核心状态
  const loadCoresStatus = async () => {
    try {
      const status = await CoreManagerUtil.getCoresStatus();
      setCoresStatus(status);
      onCoreStatusChange?.(status);
    } catch (error) {
      console.error('加载核心状态失败:', error);
      message.error('加载核心状态失败');
    }
  };

  useEffect(() => {
    loadCoresStatus();
  }, []);

  // 下载核心
  const handleDownloadCore = async (coreName: string) => {
    if (downloading) {
      message.warning('正在下载其他核心，请稍候');
      return;
    }

    setDownloading(coreName);

    try {
      const success = await CoreManagerUtil.downloadCore(coreName);
      
      if (success) {
        message.success(`${CoreManagerUtil.getCoreDisplayName(coreName)} 下载完成`);
        await loadCoresStatus();
      } else {
        message.error(`${CoreManagerUtil.getCoreDisplayName(coreName)} 下载失败`);
      }
    } catch (error) {
      message.error(`下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setDownloading(null);
    }
  };

  // 下载数据库文件
  const handleDownloadDatabase = async (dbName: string) => {
    if (downloading) {
      message.warning('正在下载其他文件，请稍候');
      return;
    }

    setDownloading(dbName);

    try {
      const success = await CoreManagerUtil.downloadDatabase(dbName);
      
      if (success) {
        message.success(`${CoreManagerUtil.getDatabaseDisplayName(dbName)} 下载完成`);
        await loadCoresStatus();
      } else {
        message.error(`${CoreManagerUtil.getDatabaseDisplayName(dbName)} 下载失败`);
      }
    } catch (error) {
      message.error(`下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setDownloading(null);
    }
  };

  // 显示核心信息
  const showCoreInfo = (coreName: string) => {
    Modal.info({
      title: `${CoreManagerUtil.getCoreDisplayName(coreName)} 信息`,
      content: (
        <div>
          <p><strong>描述:</strong> {CoreManagerUtil.getCoreDescription(coreName)}</p>
          <p><strong>状态:</strong> {coresStatus[coreName as keyof CoreStatus] ? '已安装' : '未安装'}</p>
          <p><strong>支持平台:</strong> Windows, macOS, Linux</p>
          <p><strong>支持架构:</strong> x64, ARM64</p>
        </div>
      ),
      width: 500,
    });
  };

  // 显示数据库信息
  const showDatabaseInfo = (dbName: string) => {
    Modal.info({
      title: `${CoreManagerUtil.getDatabaseDisplayName(dbName)} 信息`,
      content: (
        <div>
          <p><strong>描述:</strong> {CoreManagerUtil.getDatabaseDescription(dbName)}</p>
          <p><strong>状态:</strong> {coresStatus[dbName as keyof CoreStatus] ? '已安装' : '未安装'}</p>
          <p><strong>用途:</strong> 用于 Sing-box 的地理位置路由功能</p>
          <p><strong>大小:</strong> 约 2-5 MB</p>
        </div>
      ),
      width: 500,
    });
  };

  const cores = [
    { key: 'singbox', name: 'Sing-box', color: 'blue' },
    { key: 'xray', name: 'Xray', color: 'green' },
    { key: 'clash', name: 'Clash', color: 'orange' }
  ];

  const databases = [
    { key: 'geoip', name: 'GeoIP 数据库', color: 'purple' },
    { key: 'geosite', name: 'GeoSite 数据库', color: 'cyan' }
  ];

  return (
    <div className="core-manager">
      <Card 
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>代理核心管理</Title>
            <Button 
              type="text" 
              icon={<ReloadOutlined />} 
              onClick={loadCoresStatus}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
        className="core-manager-card"
      >
        <Alert
          message="代理核心说明"
          description="代理核心是代理客户端的基础组件，不同的核心支持不同的协议和功能。建议优先安装 Sing-box 核心。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 代理核心 */}
        <div style={{ marginBottom: 16 }}>
          <Title level={5}>代理核心</Title>
          <Row gutter={[16, 16]}>
            {cores.map(({ key, name, color }) => (
              <Col key={key} xs={24} sm={8}>
                <Card size="small" className="core-item">
                  <div className="core-item-content">
                    <div className="core-info">
                      <Text strong>{name}</Text>
                      <Tag color={coresStatus[key as keyof CoreStatus] ? 'green' : 'red'}>
                        {coresStatus[key as keyof CoreStatus] ? '已安装' : '未安装'}
                      </Tag>
                    </div>
                    <Space>
                      <Button
                        type="text"
                        size="small"
                        onClick={() => showCoreInfo(key)}
                      >
                        详情
                      </Button>
                      {!coresStatus[key as keyof CoreStatus] && (
                        <Button
                          type="primary"
                          size="small"
                          icon={<DownloadOutlined />}
                          loading={downloading === key}
                          onClick={() => handleDownloadCore(key)}
                        >
                          下载
                        </Button>
                      )}
                      {coresStatus[key as keyof CoreStatus] && (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      )}
                    </Space>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        <Divider />

        {/* 数据库文件 */}
        <div>
          <Title level={5}>
            <DatabaseOutlined /> 数据库文件
          </Title>
          <Alert
            message="数据库文件说明"
            description="GeoIP 和 GeoSite 数据库是 Sing-box 进行地理位置路由所必需的文件。如果使用 Sing-box 核心，建议下载这些数据库文件。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Row gutter={[16, 16]}>
            {databases.map(({ key, name, color }) => (
              <Col key={key} xs={24} sm={12}>
                <Card size="small" className="core-item">
                  <div className="core-item-content">
                    <div className="core-info">
                      <Text strong>{name}</Text>
                      <Tag color={coresStatus[key as keyof CoreStatus] ? 'green' : 'red'}>
                        {coresStatus[key as keyof CoreStatus] ? '已安装' : '未安装'}
                      </Tag>
                    </div>
                    <Space>
                      <Button
                        type="text"
                        size="small"
                        onClick={() => showDatabaseInfo(key)}
                      >
                        详情
                      </Button>
                      {!coresStatus[key as keyof CoreStatus] && (
                        <Button
                          type="primary"
                          size="small"
                          icon={<DownloadOutlined />}
                          loading={downloading === key}
                          onClick={() => handleDownloadDatabase(key)}
                        >
                          下载
                        </Button>
                      )}
                      {coresStatus[key as keyof CoreStatus] && (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      )}
                    </Space>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Card>
    </div>
  );
};

export default CoreManager;
