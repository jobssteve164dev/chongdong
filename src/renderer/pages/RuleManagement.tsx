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
  Avatar,
  Timeline,
  Calendar,
  Carousel,
  Image,

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
  TrafficRuleGroup,
  TrafficRuleTemplate,
  TrafficRuleStats,
  TrafficRuleParseResult,
  RoutingRule,
  RuleType,
  RuleAction,
  RuleSource,
  ProxyServer,
  Subscription
} from '../../shared/types';
import { trafficRuleManager } from '../utils/trafficRuleManager';
import { ruleManager } from '../utils/ruleManager';
import { subscriptionManager } from '../utils/subscriptionManager';
import { log } from '../utils/logger';
import { useNodeStore } from '../utils/stores';
import { Storage, STORAGE_KEYS } from '../utils/storage';
import './RuleManagement.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;
const { Panel } = Collapse;
const { TabPane } = Tabs;

const RuleManagement: React.FC = () => {
  const [groups, setGroups] = useState<TrafficRuleGroup[]>([]);
  const [templates, setTemplates] = useState<TrafficRuleTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TrafficRuleGroup | null>(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState<TrafficRuleStats | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('groups');
  const [importForm] = Form.useForm();
  const [subscriptionForm] = Form.useForm();
  const [importLoading, setImportLoading] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [parseResult, setParseResult] = useState<TrafficRuleParseResult | null>(null);
  const [availableProxies, setAvailableProxies] = useState<ProxyServer[]>([]);
  
  // 从 Zustand store 获取节点数据
  const { nodes } = useNodeStore();

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    loadGroups();
    loadTemplates();
    loadStats();
    loadProxies();
  };

  const loadGroups = () => {
    try {
      const allGroups = trafficRuleManager.getAllGroups();
      setGroups(allGroups);
    } catch (error: unknown) {
      message.error('加载分流规则组失败');
      log.error('加载分流规则组失败', error, 'RuleManagement');
    }
  };

  const loadTemplates = () => {
    try {
      const allTemplates = trafficRuleManager.getTemplates();
      setTemplates(allTemplates);
    } catch (error: unknown) {
      log.error('加载模板失败', error, 'RuleManagement');
    }
  };

  const loadStats = () => {
    try {
      const ruleStats = trafficRuleManager.getStats();
      setStats(ruleStats);
    } catch (error: unknown) {
      log.error('加载统计信息失败', error, 'RuleManagement');
    }
  };

  const loadProxies = () => {
    try {
      // 从存储中加载订阅配置，获取所有代理节点
      const savedSubscriptions = Storage.get<Subscription[]>(STORAGE_KEYS.SUBSCRIPTION_CONFIG, []) || [];
      const allProxies: ProxyServer[] = [];
      
      savedSubscriptions.forEach(subscription => {
        subscription.servers.forEach((server: ProxyServer) => {
          allProxies.push(server);
        });
      });

      setAvailableProxies(allProxies);
      log.info('加载代理节点成功', { 
        count: allProxies.length,
        proxies: allProxies.map(p => ({ id: p.id, name: p.name, protocol: p.protocol }))
      }, 'RuleManagement');
    } catch (error: unknown) {
      log.error('加载代理节点失败', error, 'RuleManagement');
      setAvailableProxies([]);
    }
  };

  const handleAddGroup = () => {
    setEditingGroup(null);
    form.resetFields();
    form.setFieldsValue({
      enabled: true,
      priority: 100,
      source: RuleSource.USER,
      autoUpdate: false
    });
    setModalVisible(true);
  };

  const handleEditGroup = (group: TrafficRuleGroup) => {
    setEditingGroup(group);
    form.setFieldsValue(group);
    setModalVisible(true);
  };

  const handleDeleteGroup = (id: string) => {
    try {
      const success = trafficRuleManager.deleteGroup(id);
      if (success) {
        message.success('分流规则组已删除');
        loadData();
        log.info('删除分流规则组', { id }, 'RuleManagement');
      } else {
        message.error('删除分流规则组失败');
      }
    } catch (error: unknown) {
      message.error('删除分流规则组失败');
      log.error('删除分流规则组失败', error, 'RuleManagement');
    }
  };

  const handleToggleGroup = (id: string) => {
    try {
      const success = trafficRuleManager.toggleGroup(id);
      if (success) {
        message.success('分流规则组状态已切换');
        loadData();
        log.info('切换分流规则组状态', { id }, 'RuleManagement');
      } else {
        message.error('切换分流规则组状态失败');
      }
    } catch (error: unknown) {
      message.error('操作失败');
      log.error('切换分流规则组状态失败', error, 'RuleManagement');
    }
  };

  const handleSaveGroup = async (values: any) => {
    try {
      if (editingGroup) {
        // 编辑现有分流规则组
        const updatedGroup = trafficRuleManager.updateGroup(editingGroup.id, values);
        if (updatedGroup) {
          message.success('分流规则组已更新');
          log.info('更新分流规则组', { id: editingGroup.id, name: updatedGroup.name }, 'RuleManagement');
        } else {
          message.error('更新分流规则组失败');
        }
      } else {
        // 添加新分流规则组
        const newGroup = trafficRuleManager.addGroup(values);
        message.success('分流规则组已添加');
        log.info('添加分流规则组', { id: newGroup.id, name: newGroup.name }, 'RuleManagement');
      }
      
      setModalVisible(false);
      loadData();
    } catch (error: unknown) {
      message.error('保存失败');
      log.error('保存分流规则组失败', error, 'RuleManagement');
    }
  };

  const handleCreateFromTemplate = (templateId: string) => {
    let formRef: any = null;
    
    Modal.confirm({
      title: '从模板创建分流规则组',
      content: (
        <Form 
          ref={(ref) => { formRef = ref; }}
          layout="vertical"
        >
          <Form.Item
            name="groupName"
            label="分流规则组名称"
            rules={[{ required: true, message: '请输入分流规则组名称' }]}
          >
            <Input placeholder="例如：我的社交媒体分流" />
          </Form.Item>
          <Form.Item
            name="defaultProxy"
            label="默认代理节点"
          >
            <Select placeholder="选择默认代理节点" allowClear>
              {availableProxies.length > 0 ? (
                availableProxies.map(proxy => (
                  <Option key={proxy.id} value={proxy.id}>
                    {proxy.name} ({proxy.protocol})
                  </Option>
                ))
              ) : (
                <Option value="" disabled>
                  暂无可用节点，请先在节点管理中添加节点
                </Option>
              )}
            </Select>
          </Form.Item>
        </Form>
      ),
      onOk: async () => {
        try {
          if (!formRef) {
            message.error('表单引用错误');
            return;
          }
          
          const formData = await formRef.validateFields();
          const template = trafficRuleManager.getTemplate(templateId);
          if (!template) {
            message.error('模板不存在');
            return;
          }

          const groupName = formData.groupName || template.name;
          const defaultProxy = formData.defaultProxy || template.defaultProxy;

          const newGroup = trafficRuleManager.createFromTemplate(templateId, groupName, defaultProxy);
          if (newGroup) {
            message.success('分流规则组创建成功');
            loadData();
            log.info('从模板创建分流规则组', { templateId, groupName, defaultProxy }, 'RuleManagement');
          } else {
            message.error('创建分流规则组失败');
          }
        } catch (error: unknown) {
          if (error instanceof Error && error.message.includes('validation')) {
            // 表单验证错误，不显示错误消息
            return;
          }
          message.error('创建失败');
          log.error('从模板创建分流规则组失败', error, 'RuleManagement');
        }
      }
    });
  };

  const handleParseSubscription = async (values: any) => {
    setSubscriptionLoading(true);
    try {
      const result = await trafficRuleManager.parseFromSubscription(values.url);
      setParseResult(result);
      
      if (result.success) {
        message.success(`成功解析 ${result.totalGroups} 个分流规则组，共 ${result.totalRules} 条规则`);
      } else {
        message.warning('解析完成，但存在一些问题');
      }
      
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => {
          message.error(error);
        });
      }
      
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          message.warning(warning);
        });
      }
      
      log.info('解析订阅链接', { url: values.url, success: result.success }, 'RuleManagement');
    } catch (error: unknown) {
      message.error('解析失败');
      log.error('解析订阅链接失败', error, 'RuleManagement');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleImportParsedGroups = () => {
    if (!parseResult || !parseResult.success) {
      message.warning('没有可导入的分流规则组');
      return;
    }

    try {
      let importedCount = 0;
      parseResult.groups.forEach(group => {
        const success = trafficRuleManager.addGroup(group);
        if (success) {
          importedCount++;
        }
      });

      if (importedCount > 0) {
        message.success(`成功导入 ${importedCount} 个分流规则组`);
        setSubscriptionModalVisible(false);
        setParseResult(null);
        loadData();
        log.info('导入解析的分流规则组', { count: importedCount }, 'RuleManagement');
      } else {
        message.error('导入失败');
      }
    } catch (error: unknown) {
      message.error('导入失败');
      log.error('导入解析的分流规则组失败', error, 'RuleManagement');
    }
  };

  const getCategoryIcon = (category: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      social: '🌐',
      streaming: '📺',
      gaming: '🎮',
      work: '💼',
      education: '📚',
      shopping: '🛒',
      custom: '⚙️'
    };
    return iconMap[category] || '📋';
  };

  const getCategoryColor = (category: string): string => {
    const colorMap: Record<string, string> = {
      social: '#1890ff',
      streaming: '#52c41a',
      gaming: '#722ed1',
      work: '#fa8c16',
      education: '#13c2c2',
      shopping: '#eb2f96',
      custom: '#666666'
    };
    return colorMap[category] || '#666666';
  };

  const getSourceLabel = (source: RuleSource): string => {
    const labels: Record<RuleSource, string> = {
      [RuleSource.USER]: '用户',
      [RuleSource.SUBSCRIPTION]: '订阅',
      [RuleSource.SYSTEM]: '系统',
      [RuleSource.TEMPLATE]: '模板'
    };
    return labels[source] || source;
  };

  const getSourceColor = (source: RuleSource): string => {
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
      title: '分流规则组',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: TrafficRuleGroup) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.description || '无描述'}
            {record.rules.length > 0 && (
              <span style={{ color: '#1890ff' }}>
                {' '}({record.rules.length} 条规则)
              </span>
            )}
          </Text>
        </div>
      ),
    },
    {
      title: '默认代理',
      dataIndex: 'defaultProxy',
      key: 'defaultProxy',
      render: (proxyId: string) => {
        if (!proxyId) {
          return <Text type="secondary">未设置</Text>;
        }
        
        // 从存储中实时获取代理节点数据，确保数据是最新的
        const savedSubscriptions = Storage.get<Subscription[]>(STORAGE_KEYS.SUBSCRIPTION_CONFIG, []) || [];
        const allProxies: ProxyServer[] = [];
        savedSubscriptions.forEach(subscription => {
          subscription.servers.forEach((server: ProxyServer) => {
            allProxies.push(server);
          });
        });
        
        const proxy = allProxies.find(p => p.id === proxyId);
        return proxy ? (
          <Tag color="blue">{proxy.name} ({proxy.protocol})</Tag>
        ) : (
          <Tag color="red">代理不存在 (ID: {proxyId})</Tag>
        );
      },
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
        <Tag color={getSourceColor(source)}>
          {getSourceLabel(source)}
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
      render: (_: any, record: TrafficRuleGroup) => (
        <Space>
          <Button
            size="small"
            icon={record.enabled ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => handleToggleGroup(record.id)}
          >
            {record.enabled ? '禁用' : '启用'}
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditGroup(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个分流规则组吗？"
            onConfirm={() => handleDeleteGroup(record.id)}
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
      {/* 页面头部 */}
      <div style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0 }}>分流规则管理</Title>
            <Text type="secondary">管理网络流量的分流规则，实现智能代理路由</Text>
          </Col>
          <Col>
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAddGroup}
              >
                创建分流规则组
              </Button>
              <Button 
                icon={<AppstoreOutlined />} 
                onClick={() => setTemplateModalVisible(true)}
              >
                从模板创建
              </Button>
              <Button 
                icon={<LinkOutlined />} 
                onClick={() => setSubscriptionModalVisible(true)}
              >
                从订阅解析
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => {
                  loadData();
                  message.success('数据已刷新');
                }}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 统计信息 */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                                 title="分流规则组"
                 value={stats.totalGroups}
                 prefix={<AppstoreOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="启用组"
                value={stats.enabledGroups}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="总规则数"
                value={stats.totalRules}
                prefix={<CodeOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                                 title="平均规则数"
                 value={stats.averageRulesPerGroup.toFixed(1)}
                 prefix={<BranchesOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 主要内容 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="分流规则组" key="groups">
          <Card>
            <Table
              columns={columns}
              dataSource={groups}
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

        <TabPane tab="规则模板" key="templates">
          <Card>
            <Row gutter={[16, 16]}>
              {templates.map(template => (
                <Col xs={24} sm={12} md={8} lg={6} key={template.id}>
                  <Card
                    hoverable
                    style={{ height: '100%' }}
                    actions={[
                      <Button 
                        type="link" 
                        icon={<PlusOutlined />}
                        onClick={() => handleCreateFromTemplate(template.id)}
                      >
                        使用模板
                      </Button>
                    ]}
                  >
                    <Card.Meta
                      avatar={
                        <Avatar 
                          size={48} 
                          style={{ 
                            backgroundColor: template.color || getCategoryColor(template.category),
                            fontSize: 24
                          }}
                        >
                          {template.icon || getCategoryIcon(template.category)}
                        </Avatar>
                      }
                      title={template.name}
                      description={
                        <div>
                          <Text type="secondary">{template.description}</Text>
                          <br />
                          <Tag color={getCategoryColor(template.category)}>
                            {template.category}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {template.rules.length} 条规则
                          </Text>
                        </div>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </TabPane>

        <TabPane tab="统计信息" key="stats">
          <Card>
            {stats && (
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Title level={4}>按规则类型统计</Title>
                  {Object.entries(stats.rulesByType).map(([type, count]) => (
                    <div key={type} style={{ marginBottom: 8 }}>
                      <Text>{type}: </Text>
                      <Text strong>{count}</Text>
                    </div>
                  ))}
                </Col>
                <Col span={12}>
                  <Title level={4}>按规则动作统计</Title>
                  {Object.entries(stats.rulesByAction).map(([action, count]) => (
                    <div key={action} style={{ marginBottom: 8 }}>
                      <Text>{action}: </Text>
                      <Text strong>{count}</Text>
                    </div>
                  ))}
                </Col>
              </Row>
            )}
          </Card>
        </TabPane>
      </Tabs>

      {/* 添加/编辑分流规则组模态框 */}
      <Modal
        title={editingGroup ? '编辑分流规则组' : '创建分流规则组'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveGroup}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="分流规则组名称"
                rules={[{ required: true, message: '请输入分流规则组名称' }]}
              >
                <Input placeholder="例如：社交媒体分流" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="defaultProxy"
                label="默认代理节点"
              >
                <Select placeholder="选择默认代理节点" allowClear>
                  {availableProxies.length > 0 ? (
                    availableProxies.map(proxy => (
                      <Option key={proxy.id} value={proxy.id}>
                        {proxy.name} ({proxy.protocol})
                      </Option>
                    ))
                  ) : (
                    <Option value="" disabled>
                      暂无可用节点，请先在节点管理中添加节点
                    </Option>
                  )}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea
              rows={2}
              placeholder="分流规则组的描述（可选）"
            />
          </Form.Item>

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

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingGroup ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 模板选择模态框 */}
      <Modal
        title="从模板创建分流规则组"
        open={templateModalVisible}
        onCancel={() => setTemplateModalVisible(false)}
        footer={null}
        width={800}
      >
        <Row gutter={[16, 16]}>
          {templates.map(template => (
            <Col xs={24} sm={12} key={template.id}>
              <Card
                hoverable
                style={{ height: '100%' }}
                onClick={() => handleCreateFromTemplate(template.id)}
              >
                <Card.Meta
                  avatar={
                    <Avatar 
                      size={48} 
                      style={{ 
                        backgroundColor: template.color || getCategoryColor(template.category),
                        fontSize: 24
                      }}
                    >
                      {template.icon || getCategoryIcon(template.category)}
                    </Avatar>
                  }
                  title={template.name}
                  description={
                    <div>
                      <Text type="secondary">{template.description}</Text>
                      <br />
                      <Tag color={getCategoryColor(template.category)}>
                        {template.category}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {template.rules.length} 条规则
                      </Text>
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Modal>

      {/* 订阅解析模态框 */}
      <Modal
        title="从订阅链接解析分流规则"
        open={subscriptionModalVisible}
        onCancel={() => {
          setSubscriptionModalVisible(false);
          setParseResult(null);
        }}
        footer={null}
        width={800}
      >
        <Form
          form={subscriptionForm}
          layout="vertical"
          onFinish={handleParseSubscription}
        >
          <Form.Item
            name="url"
            label="订阅链接"
            rules={[
              { required: true, message: '请输入订阅链接' },
              { 
                pattern: /^https?:\/\/.+/, 
                message: '请输入有效的订阅链接，以http或https开头' 
              }
            ]}
          >
            <Input placeholder="例如：https://example.com/subscription.txt" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={subscriptionLoading}>
                解析订阅
              </Button>
              <Button onClick={() => {
                setSubscriptionModalVisible(false);
                setParseResult(null);
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {/* 解析结果 */}
        {parseResult && (
          <div style={{ marginTop: 16 }}>
            <Divider>解析结果</Divider>
            
            {parseResult.success ? (
              <div>
                <Alert
                  message="解析成功"
                  description={`成功解析 ${parseResult.totalGroups} 个分流规则组，共 ${parseResult.totalRules} 条规则`}
                  type="success"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                
                {parseResult.groups.map((group, index) => (
                  <Card key={index} size="small" style={{ marginBottom: 8 }}>
                    <Card.Meta
                      title={group.name}
                      description={
                        <div>
                          <Text type="secondary">{group.description}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {group.rules.length} 条规则
                          </Text>
                        </div>
                      }
                    />
                  </Card>
                ))}
                
                <Button 
                  type="primary" 
                  onClick={handleImportParsedGroups}
                  style={{ marginTop: 16 }}
                >
                  导入分流规则组
                </Button>
              </div>
            ) : (
              <Alert
                message="解析失败"
                description="无法解析订阅链接中的分流规则"
                type="error"
                showIcon
              />
            )}

            {parseResult.errors && parseResult.errors.length > 0 && (
              <Alert
                message="错误信息"
                description={
                  <ul>
                    {parseResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                }
                type="error"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}

            {parseResult.warnings && parseResult.warnings.length > 0 && (
              <Alert
                message="警告信息"
                description={
                  <ul>
                    {parseResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                }
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RuleManagement;
