import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tag,
  Popconfirm,
  message,
  Typography,
  Row,
  Col,
  Statistic,
  Alert,
  Tooltip,
  Badge,
  Divider,
  Upload,
  InputNumber,
  DatePicker,
  Tabs,
  Collapse,
  Descriptions,
  Result,
  Empty,
  Skeleton,
  Spin,
  notification,
  Drawer,
  List,
  Checkbox,
  Radio,
  Progress,
  Steps,
  Transfer,
  TreeSelect,
  Cascader,
  AutoComplete,
  Mentions,
  Rate,
  Slider,
  ColorPicker,
  UploadFile,
  UploadProps,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  SyncOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SettingOutlined,
  ReloadOutlined,
  FilterOutlined,
  ExportOutlined,
  ImportOutlined,
  CopyOutlined,
  ShareAltOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  StopOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CloudOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  WifiOutlined,
  LinkOutlined,
  BranchesOutlined,
  PartitionOutlined,
  ApiOutlined,
  CodeOutlined,
  BugOutlined,
  SafetyOutlined,
  ShieldOutlined,
  LockOutlined,
  UnlockOutlined,
  KeyOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  FileAddOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileImageOutlined,
  FileZipOutlined,
  FileUnknownOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  FolderAddOutlined,
  FolderViewOutlined,
  SearchOutlined,
  ClearOutlined,
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  ColumnHeightOutlined,
  ColumnWidthOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  BarsOutlined,
  AppstoreOutlined,
  TableOutlined,
  BorderOutlined,
  BorderInnerOutlined,
  BorderTopOutlined,
  BorderBottomOutlined,
  BorderLeftOutlined,
  BorderRightOutlined,
  BorderVerticleOutlined,
  BorderHorizontalOutlined,
  RadiusUpleftOutlined,
  RadiusUprightOutlined,
  RadiusBottomleftOutlined,
  RadiusBottomrightOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import {
  RoutingRule,
  RuleType,
  RuleAction,
  RuleSource,
  RuleStats,
  RuleConflictResult
} from '../../shared/types';
import { ruleManager } from '../utils/ruleManager';
import { ruleExporter } from '../utils/ruleExporter';
import { log } from '../utils/logger';
import './RuleManagement.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;
const { Panel } = Collapse;
const { TabPane } = Tabs;

const RuleManagement: React.FC = () => {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState<RuleStats | null>(null);
  const [conflicts, setConflicts] = useState<RuleConflictResult | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState('rules');

  // 加载规则数据
  useEffect(() => {
    loadRules();
    loadStats();
    detectConflicts();
  }, []);

  const loadRules = () => {
    try {
      const allRules = ruleManager.getAllRules();
      setRules(allRules);
    } catch (error: unknown) {
      message.error('加载规则失败');
      log.error('加载规则失败', error, 'RuleManagement');
    }
  };

  const loadStats = () => {
    try {
      const ruleStats = ruleManager.getStats();
      setStats(ruleStats);
    } catch (error: unknown) {
      log.error('加载规则统计失败', error, 'RuleManagement');
    }
  };

  const detectConflicts = () => {
    try {
      const conflictResult = ruleManager.detectConflicts();
      setConflicts(conflictResult);
    } catch (error: unknown) {
      log.error('检测规则冲突失败', error, 'RuleManagement');
    }
  };

  const handleAddRule = () => {
    setEditingRule(null);
    form.resetFields();
    form.setFieldsValue({
      enabled: true,
      priority: 100,
      source: RuleSource.USER,
      type: RuleType.DOMAIN,
      action: RuleAction.PROXY
    });
    setModalVisible(true);
  };

  const handleEditRule = (rule: RoutingRule) => {
    setEditingRule(rule);
    form.setFieldsValue(rule);
    setModalVisible(true);
  };

  const handleDeleteRule = (id: string) => {
    try {
      const success = ruleManager.deleteRule(id);
      if (success) {
        message.success('规则已删除');
        loadRules();
        loadStats();
        detectConflicts();
        log.info('删除规则', { id }, 'RuleManagement');
      } else {
        message.error('删除规则失败');
      }
    } catch (error: unknown) {
      message.error('删除规则失败');
      log.error('删除规则失败', error, 'RuleManagement');
    }
  };

  const handleToggleRule = (id: string) => {
    try {
      const rule = ruleManager.getRule(id);
      if (rule) {
        const success = rule.enabled 
          ? ruleManager.disableRule(id)
          : ruleManager.enableRule(id);
        
        if (success) {
          message.success(`规则已${rule.enabled ? '禁用' : '启用'}`);
          loadRules();
          loadStats();
          log.info(`${rule.enabled ? '禁用' : '启用'}规则`, { id }, 'RuleManagement');
        } else {
          message.error(`${rule.enabled ? '禁用' : '启用'}规则失败`);
        }
      }
    } catch (error: unknown) {
      message.error('操作失败');
      log.error('切换规则状态失败', error, 'RuleManagement');
    }
  };

  const handleSaveRule = async (values: any) => {
    try {
      if (editingRule) {
        // 编辑现有规则
        const updatedRule = ruleManager.updateRule(editingRule.id, values);
        if (updatedRule) {
          message.success('规则已更新');
          log.info('更新规则', { id: editingRule.id, name: updatedRule.name }, 'RuleManagement');
        } else {
          message.error('更新规则失败');
        }
      } else {
        // 添加新规则
        const newRule = ruleManager.addRule(values);
        message.success('规则已添加');
        log.info('添加规则', { id: newRule.id, name: newRule.name }, 'RuleManagement');
      }
      
      setModalVisible(false);
      loadRules();
      loadStats();
      detectConflicts();
    } catch (error: unknown) {
      message.error('保存失败');
      log.error('保存规则失败', error, 'RuleManagement');
    }
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的规则');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条规则吗？`,
      onOk: () => {
        try {
          const count = ruleManager.batchDeleteRules(selectedRowKeys as string[]);
          message.success(`成功删除 ${count} 条规则`);
          setSelectedRowKeys([]);
          loadRules();
          loadStats();
          detectConflicts();
          log.info('批量删除规则', { count }, 'RuleManagement');
        } catch (error: unknown) {
          message.error('批量删除失败');
          log.error('批量删除规则失败', error, 'RuleManagement');
        }
      }
    });
  };

  const handleBatchEnable = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要启用的规则');
      return;
    }

    try {
      const count = ruleManager.batchUpdateRules(selectedRowKeys as string[], { enabled: true });
      message.success(`成功启用 ${count} 条规则`);
      setSelectedRowKeys([]);
      loadRules();
      loadStats();
      log.info('批量启用规则', { count }, 'RuleManagement');
    } catch (error: unknown) {
      message.error('批量启用失败');
      log.error('批量启用规则失败', error, 'RuleManagement');
    }
  };

  const handleBatchDisable = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要禁用的规则');
      return;
    }

    try {
      const count = ruleManager.batchUpdateRules(selectedRowKeys as string[], { enabled: false });
      message.success(`成功禁用 ${count} 条规则`);
      setSelectedRowKeys([]);
      loadRules();
      loadStats();
      log.info('批量禁用规则', { count }, 'RuleManagement');
    } catch (error: unknown) {
      message.error('批量禁用失败');
      log.error('批量禁用规则失败', error, 'RuleManagement');
    }
  };

  const handleImport = async (file: File) => {
    try {
      const content = await file.text();
      const importedRules = ruleExporter.importAuto(content, {
        format: 'auto',
        mergeStrategy: 'append',
        conflictResolution: 'rename',
        validateRules: true
      });

      const count = ruleManager.importRules(importedRules);
      message.success(`成功导入 ${count} 条规则`);
      setImportModalVisible(false);
      loadRules();
      loadStats();
      detectConflicts();
      log.info('导入规则', { count }, 'RuleManagement');
    } catch (error: unknown) {
      message.error('导入失败');
      log.error('导入规则失败', error, 'RuleManagement');
    }
  };

  const handleExport = (format: 'json' | 'clash' | 'singbox' | 'v2ray') => {
    try {
      const selectedRules = selectedRowKeys.length > 0 
        ? ruleManager.exportRules(selectedRowKeys as string[])
        : ruleManager.getAllRules();

      let content = '';
      switch (format) {
        case 'json':
          content = ruleExporter.exportToJson(selectedRules, { format: 'json', includeMetadata: true });
          break;
        case 'clash':
          content = ruleExporter.exportToClash(selectedRules, { format: 'clash' });
          break;
        case 'singbox':
          content = ruleExporter.exportToSingbox(selectedRules, { format: 'singbox' });
          break;
        case 'v2ray':
          content = ruleExporter.exportToV2Ray(selectedRules, { format: 'v2ray' });
          break;
      }

      // 创建下载链接
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rules_${format}_${new Date().toISOString().slice(0, 10)}.${format === 'json' ? 'json' : format === 'clash' ? 'yaml' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      message.success('导出成功');
      setExportModalVisible(false);
      log.info('导出规则', { format, count: selectedRules.length }, 'RuleManagement');
    } catch (error: unknown) {
      message.error('导出失败');
      log.error('导出规则失败', error, 'RuleManagement');
    }
  };

  const handlePreview = (format: 'json' | 'clash' | 'singbox' | 'v2ray') => {
    try {
      const selectedRules = selectedRowKeys.length > 0 
        ? ruleManager.exportRules(selectedRowKeys as string[])
        : ruleManager.getAllRules();

      let content = '';
      switch (format) {
        case 'json':
          content = ruleExporter.exportToJson(selectedRules, { format: 'json', includeMetadata: true });
          break;
        case 'clash':
          content = ruleExporter.exportToClash(selectedRules, { format: 'clash' });
          break;
        case 'singbox':
          content = ruleExporter.exportToSingbox(selectedRules, { format: 'singbox' });
          break;
        case 'v2ray':
          content = ruleExporter.exportToV2Ray(selectedRules, { format: 'v2ray' });
          break;
      }

      setPreviewContent(content);
      setPreviewModalVisible(true);
    } catch (error: unknown) {
      message.error('预览失败');
      log.error('预览规则失败', error, 'RuleManagement');
    }
  };

  const getRuleTypeLabel = (type: RuleType): string => {
    const labels: Record<RuleType, string> = {
      [RuleType.DOMAIN]: '域名',
      [RuleType.DOMAIN_SUFFIX]: '域名后缀',
      [RuleType.DOMAIN_KEYWORD]: '域名关键词',
      [RuleType.DOMAIN_REGEX]: '域名正则',
      [RuleType.IP_CIDR]: 'IP段',
      [RuleType.IP_CIDR6]: 'IPv6段',
      [RuleType.GEOIP]: '地理位置',
      [RuleType.PROCESS]: '进程',
      [RuleType.PROCESS_PATH]: '进程路径',
      [RuleType.PROTOCOL]: '协议',
      [RuleType.SCRIPT]: '脚本',
      [RuleType.MATCH]: '匹配所有'
    };
    return labels[type] || type;
  };

  const getRuleActionLabel = (action: RuleAction): string => {
    const labels: Record<RuleAction, string> = {
      [RuleAction.PROXY]: '代理',
      [RuleAction.DIRECT]: '直连',
      [RuleAction.BLOCK]: '阻止',
      [RuleAction.CHAIN]: '代理链',
      [RuleAction.REJECT]: '拒绝'
    };
    return labels[action] || action;
  };

  const getRuleSourceLabel = (source: RuleSource): string => {
    const labels: Record<RuleSource, string> = {
      [RuleSource.USER]: '用户',
      [RuleSource.SUBSCRIPTION]: '订阅',
      [RuleSource.SYSTEM]: '系统',
      [RuleSource.TEMPLATE]: '模板'
    };
    return labels[source] || source;
  };

  const getRuleActionColor = (action: RuleAction): string => {
    const colors: Record<RuleAction, string> = {
      [RuleAction.PROXY]: 'blue',
      [RuleAction.DIRECT]: 'green',
      [RuleAction.BLOCK]: 'red',
      [RuleAction.CHAIN]: 'purple',
      [RuleAction.REJECT]: 'orange'
    };
    return colors[action] || 'default';
  };

  const getRuleSourceColor = (source: RuleSource): string => {
    const colors: Record<RuleSource, string> = {
      [RuleSource.USER]: 'blue',
      [RuleSource.SUBSCRIPTION]: 'green',
      [RuleSource.SYSTEM]: 'orange',
      [RuleSource.TEMPLATE]: 'purple'
    };
    return colors[source] || 'default';
  };

  const columns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: RoutingRule) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.description || '无描述'}
          </Text>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: RuleType) => (
        <Tag color="blue">{getRuleTypeLabel(type)}</Tag>
      ),
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      render: (value: string | string[]) => (
        <Text code>
          {Array.isArray(value) ? value.join(', ') : value}
        </Text>
      ),
    },
    {
      title: '动作',
      dataIndex: 'action',
      key: 'action',
      render: (action: RuleAction, record: RoutingRule) => (
        <div>
          <Tag color={getRuleActionColor(action)}>
            {getRuleActionLabel(action)}
          </Tag>
          {record.target && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              目标: {record.target}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: number) => (
        <Badge count={priority} style={{ backgroundColor: '#52c41a' }} />
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (source: RuleSource) => (
        <Tag color={getRuleSourceColor(source)}>
          {getRuleSourceLabel(source)}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'success' : 'default'}>
          {enabled ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: RoutingRule) => (
        <Space>
          <Button
            size="small"
            icon={record.enabled ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => handleToggleRule(record.id)}
          >
            {record.enabled ? '禁用' : '启用'}
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditRule(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个规则吗？"
            onConfirm={() => handleDeleteRule(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button size="small" icon={<DeleteOutlined />} danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div className="rule-management-page">
      <div className="page-header">
        <Title level={2}>规则管理</Title>
        <Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAddRule}
          >
            添加规则
          </Button>
          <Button 
            icon={<ImportOutlined />} 
            onClick={() => setImportModalVisible(true)}
          >
            导入
          </Button>
          <Button 
            icon={<ExportOutlined />} 
            onClick={() => setExportModalVisible(true)}
            disabled={rules.length === 0}
          >
            导出
          </Button>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => {
              loadRules();
              loadStats();
              detectConflicts();
            }}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* 统计信息 */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="总规则数"
                value={stats.totalRules}
                prefix={<CodeOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="启用规则"
                value={stats.enabledRules}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="禁用规则"
                value={stats.disabledRules}
                prefix={<PauseCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="冲突规则"
                value={conflicts?.conflicts.length || 0}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: conflicts?.conflicts.length ? '#ff4d4f' : '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 冲突警告 */}
      {conflicts && conflicts.conflicts.length > 0 && (
        <Alert
          message="发现规则冲突"
          description={`检测到 ${conflicts.conflicts.length} 个规则冲突，建议及时处理。`}
          type="warning"
          showIcon
          action={
            <Button size="small" type="link" onClick={() => setActiveTab('conflicts')}>
              查看详情
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 主要内容 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="规则列表" key="rules">
          <Card>
            {/* 批量操作 */}
            {selectedRowKeys.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Space>
                  <Text>已选择 {selectedRowKeys.length} 条规则：</Text>
                  <Button size="small" onClick={handleBatchEnable}>
                    批量启用
                  </Button>
                  <Button size="small" onClick={handleBatchDisable}>
                    批量禁用
                  </Button>
                  <Button size="small" danger onClick={handleBatchDelete}>
                    批量删除
                  </Button>
                </Space>
              </div>
            )}

            <Table
              columns={columns}
              dataSource={rules}
              rowKey="id"
              rowSelection={rowSelection}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              }}
            />
          </Card>
        </TabPane>

        <TabPane tab="冲突检测" key="conflicts">
          <Card>
            {conflicts && conflicts.conflicts.length > 0 ? (
              <List
                dataSource={conflicts.conflicts}
                renderItem={(conflict, index) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Tag color={
                            conflict.severity === 'high' ? 'red' :
                            conflict.severity === 'medium' ? 'orange' : 'blue'
                          }>
                            {conflict.type === 'duplicate' ? '重复' :
                             conflict.type === 'overlap' ? '重叠' : '矛盾'}
                          </Tag>
                          <Text>{conflict.description}</Text>
                        </Space>
                      }
                      description={
                        <div>
                          <Text>规则1: {conflict.rule1.name}</Text>
                          <br />
                          <Text>规则2: {conflict.rule2.name}</Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="没有发现规则冲突" />
            )}
          </Card>
        </TabPane>

        <TabPane tab="统计信息" key="stats">
          <Card>
            {stats && (
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Title level={4}>按类型统计</Title>
                  {Object.entries(stats.rulesByType).map(([type, count]) => (
                    <div key={type} style={{ marginBottom: 8 }}>
                      <Text>{getRuleTypeLabel(type as RuleType)}: </Text>
                      <Text strong>{count}</Text>
                    </div>
                  ))}
                </Col>
                <Col span={12}>
                  <Title level={4}>按动作统计</Title>
                  {Object.entries(stats.rulesByAction).map(([action, count]) => (
                    <div key={action} style={{ marginBottom: 8 }}>
                      <Text>{getRuleActionLabel(action as RuleAction)}: </Text>
                      <Text strong>{count}</Text>
                    </div>
                  ))}
                </Col>
              </Row>
            )}
          </Card>
        </TabPane>
      </Tabs>

      {/* 添加/编辑规则模态框 */}
      <Modal
        title={editingRule ? '编辑规则' : '添加规则'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveRule}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="规则名称"
                rules={[{ required: true, message: '请输入规则名称' }]}
              >
                <Input placeholder="例如：Google直连" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="规则类型"
                rules={[{ required: true, message: '请选择规则类型' }]}
              >
                <Select placeholder="选择规则类型">
                  <Option value={RuleType.DOMAIN}>域名</Option>
                  <Option value={RuleType.DOMAIN_SUFFIX}>域名后缀</Option>
                  <Option value={RuleType.DOMAIN_KEYWORD}>域名关键词</Option>
                  <Option value={RuleType.DOMAIN_REGEX}>域名正则</Option>
                  <Option value={RuleType.IP_CIDR}>IP段</Option>
                  <Option value={RuleType.IP_CIDR6}>IPv6段</Option>
                  <Option value={RuleType.GEOIP}>地理位置</Option>
                  <Option value={RuleType.PROCESS}>进程</Option>
                  <Option value={RuleType.PROCESS_PATH}>进程路径</Option>
                  <Option value={RuleType.PROTOCOL}>协议</Option>
                  <Option value={RuleType.SCRIPT}>脚本</Option>
                  <Option value={RuleType.MATCH}>匹配所有</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="value"
            label="规则值"
            rules={[{ required: true, message: '请输入规则值' }]}
          >
            <TextArea
              rows={3}
              placeholder="输入规则值，多个值用逗号分隔"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="action"
                label="动作"
                rules={[{ required: true, message: '请选择动作' }]}
              >
                <Select placeholder="选择动作">
                  <Option value={RuleAction.PROXY}>代理</Option>
                  <Option value={RuleAction.DIRECT}>直连</Option>
                  <Option value={RuleAction.BLOCK}>阻止</Option>
                  <Option value={RuleAction.CHAIN}>代理链</Option>
                  <Option value={RuleAction.REJECT}>拒绝</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="target"
                label="目标"
              >
                <Input placeholder="代理名称或代理链ID" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="priority"
                label="优先级"
                rules={[{ required: true, message: '请输入优先级' }]}
              >
                <InputNumber
                  min={1}
                  max={1000}
                  style={{ width: '100%' }}
                  placeholder="100"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="source"
                label="来源"
                rules={[{ required: true, message: '请选择来源' }]}
              >
                <Select placeholder="选择来源">
                  <Option value={RuleSource.USER}>用户</Option>
                  <Option value={RuleSource.SUBSCRIPTION}>订阅</Option>
                  <Option value={RuleSource.SYSTEM}>系统</Option>
                  <Option value={RuleSource.TEMPLATE}>模板</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="enabled" label="启用状态" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea
              rows={2}
              placeholder="规则描述（可选）"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingRule ? '更新' : '添加'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入模态框 */}
      <Modal
        title="导入规则"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        footer={null}
      >
        <Upload.Dragger
          accept=".json,.yaml,.yml,.txt"
          beforeUpload={(file) => {
            handleImport(file);
            return false;
          }}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 JSON、YAML、TXT 格式的规则文件
          </p>
        </Upload.Dragger>
      </Modal>

      {/* 导出模态框 */}
      <Modal
        title="导出规则"
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>选择导出格式：</Text>
          <Row gutter={16}>
            <Col span={6}>
              <Button 
                block 
                onClick={() => handleExport('json')}
                icon={<FileTextOutlined />}
              >
                JSON
              </Button>
            </Col>
            <Col span={6}>
              <Button 
                block 
                onClick={() => handleExport('clash')}
                icon={<CodeOutlined />}
              >
                Clash
              </Button>
            </Col>
            <Col span={6}>
              <Button 
                block 
                onClick={() => handleExport('singbox')}
                icon={<ApiOutlined />}
              >
                Sing-box
              </Button>
            </Col>
            <Col span={6}>
              <Button 
                block 
                onClick={() => handleExport('v2ray')}
                icon={<ThunderboltOutlined />}
              >
                V2Ray
              </Button>
            </Col>
          </Row>
          <Divider />
          <Text>预览格式：</Text>
          <Row gutter={16}>
            <Col span={6}>
              <Button 
                size="small" 
                onClick={() => handlePreview('json')}
                icon={<EyeOutlined />}
              >
                预览JSON
              </Button>
            </Col>
            <Col span={6}>
              <Button 
                size="small" 
                onClick={() => handlePreview('clash')}
                icon={<EyeOutlined />}
              >
                预览Clash
              </Button>
            </Col>
            <Col span={6}>
              <Button 
                size="small" 
                onClick={() => handlePreview('singbox')}
                icon={<EyeOutlined />}
              >
                预览Sing-box
              </Button>
            </Col>
            <Col span={6}>
              <Button 
                size="small" 
                onClick={() => handlePreview('v2ray')}
                icon={<EyeOutlined />}
              >
                预览V2Ray
              </Button>
            </Col>
          </Row>
        </Space>
      </Modal>

      {/* 预览模态框 */}
      <Drawer
        title="规则预览"
        placement="right"
        width={600}
        open={previewModalVisible}
        onClose={() => setPreviewModalVisible(false)}
      >
        <TextArea
          value={previewContent}
          rows={20}
          readOnly
        />
      </Drawer>
    </div>
  );
};

export default RuleManagement;
