import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Tag, Space, Button, Typography, List, Divider } from 'antd';

const { Text } = Typography;

type LogEntry = {
  timestamp: number;
  component: 'DNS' | 'TUN' | 'VPN' | 'SystemProxy' | 'KillSwitch' | 'IPv6' | 'WebRTC' | 'App';
  level: 'info' | 'warn' | 'error';
  event: string;
  data?: any;
};

const PrivacyDashboard: React.FC = () => {
  const [webrtc, setWebrtc] = useState<{ enabled: boolean; mode: string; allowedDomains: string[] }>({ enabled: false, mode: 'relaxed', allowedDomains: [] });
  const [killswitch, setKillswitch] = useState<{ supported: boolean; enabled: boolean; usingChongdongRules: boolean }>({ supported: false, enabled: false, usingChongdongRules: false });
  const [tunDiag, setTunDiag] = useState<{ running: boolean; pid: number | null; ifconfig: string; routesIpv4: string; routesIpv6: string; dns: string } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const fetchAll = async () => {
    try {
      const pol = await window.electron.ipcRenderer.invoke('settings:getWebRTCPolicy');
      if (pol && pol.success) setWebrtc({ enabled: !!pol.enabled, mode: pol.mode, allowedDomains: pol.allowedDomains || [] });
    } catch {}
    try {
      const ks = await window.electron.ipcRenderer.invoke('killswitch:status');
      if (ks) setKillswitch({ supported: !!ks.supported, enabled: !!ks.enabled, usingChongdongRules: !!ks.usingChongdongRules });
    } catch {}
    try {
      const t = await window.electron.ipcRenderer.invoke('tun:diagnose');
      if (t && t.success) setTunDiag(t.data);
    } catch {}
    try {
      const r = await window.electron.ipcRenderer.invoke('obs:get-logs');
      if (r && r.success) setLogs(r.logs || []);
    } catch {}
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const renderStatusTag = (ok: boolean) => ok ? <Tag color="green">OK</Tag> : <Tag color="red">异常</Tag>;
  const renderLevel = (lv: string) => lv === 'error' ? <Tag color="red">error</Tag> : lv === 'warn' ? <Tag color="orange">warn</Tag> : <Tag>info</Tag>;

  return (
    <Card title="隐私状态仪表盘" style={{ marginTop: 16 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card size="small" title="WebRTC 策略">
            <Space direction="vertical">
              <div><Text>启用: </Text>{renderStatusTag(webrtc.enabled)}</div>
              <div><Text>模式: </Text><Tag>{webrtc.mode}</Tag></div>
              {webrtc.allowedDomains?.length > 0 && <div><Text>白名单: </Text>{webrtc.allowedDomains.map((d, i) => <Tag key={i}>{d}</Tag>)}</div>}
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size="small" title="Kill Switch">
            <Space direction="vertical">
              <div><Text>平台支持: </Text>{renderStatusTag(killswitch.supported)}</div>
              <div><Text>已启用: </Text>{renderStatusTag(killswitch.enabled)}</div>
              <div><Text>使用应用规则: </Text>{renderStatusTag(killswitch.usingChongdongRules)}</div>
              <Space>
                <Button size="small" onClick={async() => { await window.api.killSwitch.enable({ allowedLocalPorts: [7896,7897,53,853] }); fetchAll(); }}>启用</Button>
                <Button size="small" onClick={async() => { await window.api.killSwitch.disable(); fetchAll(); }}>禁用</Button>
              </Space>
            </Space>
          </Card>
        </Col>
        <Col xs={24}>
          <Card size="small" title="TUN 路由状态">
            {tunDiag ? (
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                <div><Text>运行: </Text>{renderStatusTag(!!tunDiag.running)} <Text>PID:</Text> <Tag>{tunDiag.pid ?? 'N/A'}</Tag></div>
                <Divider style={{ margin: '8px 0' }} />
                <Text strong>ifconfig</Text>
                <pre>{tunDiag.ifconfig || ''}</pre>
                <Text strong>routes IPv4</Text>
                <pre>{tunDiag.routesIpv4 || ''}</pre>
                <Text strong>routes IPv6</Text>
                <pre>{tunDiag.routesIpv6 || ''}</pre>
                <Text strong>DNS</Text>
                <pre>{tunDiag.dns || ''}</pre>
              </div>
            ) : <Text type="secondary">未获取到 TUN 诊断信息</Text>}
          </Card>
        </Col>
        <Col xs={24}>
          <Card size="small" title="观测日志">
            <Space style={{ marginBottom: 8 }}>
              <Button size="small" onClick={fetchAll}>刷新</Button>
              <Button size="small" danger onClick={async() => { await window.electron.ipcRenderer.invoke('obs:clear-logs'); fetchAll(); }}>清空</Button>
            </Space>
            <List
              size="small"
              dataSource={logs.slice().reverse()}
              renderItem={(item: LogEntry) => (
                <List.Item>
                  <Space>
                    <Tag>{new Date(item.timestamp).toLocaleTimeString()}</Tag>
                    <Tag>{item.component}</Tag>
                    {renderLevel(item.level)}
                    <Text>{item.event}</Text>
                    {item.data && <Tag color="#999">{JSON.stringify(item.data)}</Tag>}
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default PrivacyDashboard;


