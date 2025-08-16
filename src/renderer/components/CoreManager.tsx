import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Tag, Modal, message, Alert, Row, Col, Typography } from 'antd';
import { DownloadOutlined, CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { CoreManager as CoreManagerUtil, CoreStatus } from '../utils/coreManager';
import './CoreManager.css';

const { Title, Text } = Typography;

interface CoreManagerProps {
  onCoreStatusChange?: (status: CoreStatus) => void;
}

const CoreManager: React.FC<CoreManagerProps> = ({ onCoreStatusChange }) => {
  const [coresStatus, setCoresStatus] = useState<CoreStatus>({ singbox: false, xray: false, clash: false });
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

  const cores = [
    { key: 'singbox', name: 'Sing-box', color: 'blue' },
    { key: 'xray', name: 'Xray', color: 'green' },
    { key: 'clash', name: 'Clash', color: 'orange' }
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
          description="代理核心是运行代理服务的必要组件。首次使用需要下载对应的核心文件。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Row gutter={[16, 16]}>
          {cores.map(core => (
            <Col xs={24} sm={12} lg={8} key={core.key}>
              <Card 
                size="small" 
                className="core-card"
                actions={[
                  coresStatus[core.key as keyof CoreStatus] ? (
                    <Button 
                      type="text" 
                      icon={<CheckCircleOutlined />} 
                      disabled
                    >
                      已安装
                    </Button>
                  ) : (
                    <Button 
                      type="primary" 
                      icon={<DownloadOutlined />}
                      loading={downloading === core.key}
                      onClick={() => handleDownloadCore(core.key)}
                      disabled={!!downloading}
                    >
                      下载安装
                    </Button>
                  ),
                  <Button 
                    type="text" 
                    onClick={() => showCoreInfo(core.key)}
                  >
                    详情
                  </Button>
                ]}
              >
                <div className="core-card-content">
                  <div className="core-header">
                    <Title level={5} style={{ margin: 0 }}>{core.name}</Title>
                    <Tag color={coresStatus[core.key as keyof CoreStatus] ? 'green' : 'red'}>
                      {coresStatus[core.key as keyof CoreStatus] ? '已安装' : '未安装'}
                    </Tag>
                  </div>
                  
                  <Text type="secondary" className="core-description">
                    {CoreManagerUtil.getCoreDescription(core.key)}
                  </Text>

                  {downloading === core.key && (
                    <div className="core-progress">
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        下载中...
                      </Text>
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <div className="core-manager-footer">
          <Text type="secondary">
            提示: 下载的核心文件将保存在应用数据目录中，无需手动管理。
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default CoreManager;
