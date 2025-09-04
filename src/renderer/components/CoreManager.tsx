import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Tag, Modal, message, Alert, Row, Col, Typography, Divider, Switch, InputNumber } from 'antd';
import { DownloadOutlined, CheckCircleOutlined, ReloadOutlined, DatabaseOutlined, SyncOutlined } from '@ant-design/icons';
import { CoreManager as CoreManagerUtil, CoreStatus } from '../utils/coreManager';
import { Storage } from '../utils/storage';
import { DefaultSettings } from '../utils/defaultSettings';
import './CoreManager.css';

const { Title, Text } = Typography;

interface CoreManagerProps {
  onCoreStatusChange?: (status: CoreStatus) => void;
}

interface DatabaseUpdateSettings {
  enableDatabaseAutoUpdate: boolean;
  databaseUpdateInterval: number;
  databaseUpdateCheckOnStartup: boolean;
  databaseLastUpdateCheck?: number;
}

const CoreManager: React.FC<CoreManagerProps> = ({ onCoreStatusChange }) => {
  const [coresStatus, setCoresStatus] = useState<CoreStatus>({ 
    singbox: false, 
    xray: false, 
    clash: false,
    geoip: false,
    geosite: false,
    tun2socks: false
  });
  const [loading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [databaseStatus, setDatabaseStatus] = useState<{ [key: string]: { installed: boolean; lastModified?: string } }>({});
  const [updateSettings, setUpdateSettings] = useState<DatabaseUpdateSettings>({
    enableDatabaseAutoUpdate: false,
    databaseUpdateInterval: 24,
    databaseUpdateCheckOnStartup: true
  });
  const [checkingUpdate, setCheckingUpdate] = useState(false);

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

  // 加载数据库状态
  const loadDatabaseStatus = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('database:getStatus');
      if (result.success) {
        setDatabaseStatus(result.status);
      }
    } catch (error) {
      console.error('加载数据库状态失败:', error);
    }
  };

  // 加载更新设置
  const loadUpdateSettings = () => {
    try {
      const settings = Storage.get<DatabaseUpdateSettings>('databaseUpdateSettings');
      if (settings) {
        setUpdateSettings(settings);
      }
    } catch (error) {
      console.error('加载更新设置失败:', error);
    }
  };

  // 保存更新设置
  const saveUpdateSettings = (settings: DatabaseUpdateSettings) => {
    try {
      Storage.set('databaseUpdateSettings', settings);
      setUpdateSettings(settings);
      
      // 通知主进程更新设置
      window.electron.ipcRenderer.invoke('settings:updated', {
        settings: { ...DefaultSettings.getDefaultAppSettings(), ...settings }
      });
      
      message.success('数据库更新设置已保存');
    } catch (error) {
      console.error('保存更新设置失败:', error);
      message.error('保存设置失败');
    }
  };

  // 手动检查更新
  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const settings = Storage.get('databaseUpdateSettings') || updateSettings;
      const result = await window.electron.ipcRenderer.invoke('database:checkUpdate', settings);
      
      if (result.success) {
        message.success(result.message);
        await loadDatabaseStatus();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('检查更新失败');
    } finally {
      setCheckingUpdate(false);
    }
  };

  useEffect(() => {
    loadCoresStatus();
    loadDatabaseStatus();
    loadUpdateSettings();
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
        await loadDatabaseStatus();
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
    const status = databaseStatus[dbName.toLowerCase()];
    const lastModified = status?.lastModified ? new Date(status.lastModified).toLocaleString() : '未知';
    
    Modal.info({
      title: `${CoreManagerUtil.getDatabaseDisplayName(dbName)} 信息`,
      content: (
        <div>
          <p><strong>描述:</strong> {CoreManagerUtil.getDatabaseDescription(dbName)}</p>
          <p><strong>状态:</strong> {status?.installed ? '已安装' : '未安装'}</p>
          <p><strong>最后修改:</strong> {lastModified}</p>
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
    { key: 'clash', name: 'Clash', color: 'orange' },
    { key: 'tun2socks', name: 'Tun2socks', color: 'geekblue' }
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
              onClick={() => {
                loadCoresStatus();
                loadDatabaseStatus();
              }}
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
            {cores.map(({ key, name }) => (
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
          
          {/* 数据库自动更新设置 */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <Text strong>数据库自动更新</Text>
                <br />
                <Text type="secondary">自动检查并下载最新的数据库文件</Text>
              </div>
              <Switch
                checked={updateSettings.enableDatabaseAutoUpdate}
                onChange={(checked) => {
                  const newSettings = { ...updateSettings, enableDatabaseAutoUpdate: checked };
                  saveUpdateSettings(newSettings);
                }}
              />
            </div>
            
            {updateSettings.enableDatabaseAutoUpdate && (
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <div>
                    <Text>更新间隔（小时）</Text>
                    <InputNumber
                      min={1}
                      max={168}
                      value={updateSettings.databaseUpdateInterval}
                      onChange={(value) => {
                        const newSettings = { ...updateSettings, databaseUpdateInterval: value || 24 };
                        saveUpdateSettings(newSettings);
                      }}
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 24 }}>
                    <Switch
                      checked={updateSettings.databaseUpdateCheckOnStartup}
                      onChange={(checked) => {
                        const newSettings = { ...updateSettings, databaseUpdateCheckOnStartup: checked };
                        saveUpdateSettings(newSettings);
                      }}
                      style={{ marginRight: 8 }}
                    />
                    <Text>启动时检查更新</Text>
                  </div>
                </Col>
              </Row>
            )}
            
            <div style={{ marginTop: 16 }}>
              <Space>
                <Button
                  type="primary"
                  icon={<SyncOutlined />}
                  loading={checkingUpdate}
                  onClick={handleCheckUpdate}
                >
                  立即检查更新
                </Button>
                {updateSettings.databaseLastUpdateCheck && (
                  <Text type="secondary">
                    最后检查: {new Date(updateSettings.databaseLastUpdateCheck).toLocaleString()}
                  </Text>
                )}
              </Space>
            </div>
          </Card>
          
          <Row gutter={[16, 16]}>
            {databases.map(({ key, name }) => {
              const status = databaseStatus[key.toLowerCase()];
              const lastModified = status?.lastModified ? new Date(status.lastModified).toLocaleString() : '';
              
              return (
                <Col key={key} xs={24} sm={12}>
                  <Card size="small" className="core-item">
                    <div className="core-item-content">
                      <div className="core-info">
                        <Text strong>{name}</Text>
                        <Tag color={status?.installed ? 'green' : 'red'}>
                          {status?.installed ? '已安装' : '未安装'}
                        </Tag>
                        {lastModified && (
                          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                            更新: {lastModified}
                          </div>
                        )}
                      </div>
                      <Space>
                        <Button
                          type="text"
                          size="small"
                          onClick={() => showDatabaseInfo(key)}
                        >
                          详情
                        </Button>
                        {!status?.installed && (
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
                        {status?.installed && (
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        )}
                      </Space>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      </Card>
    </div>
  );
};

export default CoreManager;
