import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Tooltip, 
  Typography,
  Row,
  Col,
  Badge,
  Empty,
  Spin
} from 'antd';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from 'react-beautiful-dnd';
import {
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  LinkOutlined,
  CloudOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  WifiOutlined,
  ArrowDownOutlined,
  SaveOutlined,
  ClearOutlined,
  PoweroffOutlined,
  PlayCircleOutlined,
  StarOutlined,
  StarFilled
} from '@ant-design/icons';
import { ProxyNode, ChainConfig } from '../../shared/types';
import { useNodeStore, NodeStore } from '../utils/stores';
import './ProxyChainBuilder.css';

const { Title, Text } = Typography;
const { Option } = Select;

interface ChainNode {
  id: string;
  server: ProxyNode;
  config?: any; // 进阶配置
}

interface ProxyChainBuilderProps {
  nodes: ProxyNode[];
  onSave?: (chain: { name: string; description: string; nodes: ChainNode[] }) => void;
  initialChain?: { name: string; description: string; nodes: ChainNode[] };
  existingChains?: ChainConfig[];
  onDeleteChain?: (chainId: string) => void;
  onStartChain?: (chain: ChainConfig) => void;
}

const ProxyChainBuilder: React.FC<ProxyChainBuilderProps> = ({ 
  nodes,
  onSave, 
  initialChain,
  existingChains = [],
  onDeleteChain,
  onStartChain
}) => {
  const [chainNodes, setChainNodes] = useState<ChainNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingNode, setEditingNode] = useState<ChainNode | null>(null);
  const [chainName, setChainName] = useState(initialChain?.name || '');
  const [chainDescription, setChainDescription] = useState(initialChain?.description || '');
  const [savedChains, setSavedChains] = useState<ChainConfig[]>(existingChains);
  const [form] = Form.useForm();

  // 从store获取默认代理链ID
  const defaultChainId = useNodeStore((state: NodeStore) => state.defaultChainId);
  const setDefaultChainId = useNodeStore((state: NodeStore) => state.setDefaultChainId);

  // 加载可用节点和已保存的代理链
  useEffect(() => {
    if (initialChain) {
      setChainNodes(initialChain.nodes);
    }
  }, [initialChain]);

  // 当existingChains更新时，同步到本地状态
  useEffect(() => {
    setSavedChains(existingChains);
  }, [existingChains]);

  // 处理拖拽结束
  const handleDragEnd = (result: DropResult) => {
    console.log('拖拽结束:', result);
    
    if (!result.destination) {
      console.log('没有目标位置，拖拽取消');
      return;
    }

    const { source, destination } = result;
    console.log('源位置:', source, '目标位置:', destination);

    // 从可用节点拖拽到链中
    if (source.droppableId === 'available-nodes' && destination.droppableId === 'chain-nodes') {
      console.log('从可用节点拖拽到链中');
      const draggedNode = nodes[source.index];
      console.log('拖拽的节点:', draggedNode);
      
      if (draggedNode) {
        const newNode: ChainNode = {
          id: `chain-${Date.now()}-${Math.random()}`,
          server: draggedNode
        };

        const newChainNodes = Array.from(chainNodes);
        newChainNodes.splice(destination.index, 0, newNode);
        console.log('新的链节点:', newChainNodes);
        setChainNodes(newChainNodes);
      }
    }
    // 在链中重新排序
    else if (source.droppableId === 'chain-nodes' && destination.droppableId === 'chain-nodes') {
      console.log('在链中重新排序');
      const newChainNodes = Array.from(chainNodes);
      const [removed] = newChainNodes.splice(source.index, 1);
      newChainNodes.splice(destination.index, 0, removed);
      setChainNodes(newChainNodes);
    }
  };

  // 从链中移除节点
  const removeNodeFromChain = (nodeId: string) => {
    setChainNodes(chainNodes.filter(node => node.id !== nodeId));
  };

  // 编辑节点配置
  const editNodeConfig = (node: ChainNode) => {
    setEditingNode(node);
    form.setFieldsValue({
      name: node.server.name,
      protocol: node.server.type,
      host: node.server.server,
      port: node.server.port,
      ...node.config
    });
    setEditModalVisible(true);
  };

  // 保存节点配置
  const handleSaveNodeConfig = (values: any) => {
    if (editingNode) {
      const updatedNodes = chainNodes.map(node => 
        node.id === editingNode.id 
          ? { ...node, config: values }
          : node
      );
      setChainNodes(updatedNodes);
    }
    setEditModalVisible(false);
    setEditingNode(null);
    form.resetFields();
    message.success('节点配置已保存');
  };

  // 保存代理链
  const handleSaveChain = () => {
    if (!chainName.trim()) {
      message.error('请输入代理链名称');
      return;
    }
    if (chainNodes.length === 0) {
      message.error('请至少添加一个节点到代理链');
      return;
    }

    const chain = {
      name: chainName,
      description: chainDescription,
      nodes: chainNodes
    };

    onSave?.(chain);
    message.success('代理链保存成功');
  };

  // 清空代理链
  const handleClearChain = () => {
    setChainNodes([]);
    setChainName('');
    setChainDescription('');
  };

  // 设置默认代理链
  const handleSetDefaultChain = (chainId: string) => {
    setDefaultChainId(chainId);
    const chain = savedChains.find(c => c.id === chainId);
    message.success(`已将"${chain?.name}"设置为默认代理链`);
  };

  // 取消默认代理链
  const handleUnsetDefaultChain = () => {
    setDefaultChainId(null);
    message.success('已取消默认代理链设置');
  };

  // 获取协议图标
  const getProtocolIcon = (protocol: string) => {
    switch (protocol) {
      case 'vmess': return <ThunderboltOutlined />;
      case 'vless': return <GlobalOutlined />;
      case 'shadowsocks': return <WifiOutlined />;
      case 'trojan': return <CloudOutlined />;
      default: return <LinkOutlined />;
    }
  };

  // 获取协议颜色
  const getProtocolColor = (protocol: string) => {
    switch (protocol) {
      case 'vmess': return 'blue';
      case 'vless': return 'green';
      case 'shadowsocks': return 'orange';
      case 'trojan': return 'purple';
      default: return 'default';
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="proxy-chain-builder">
        {/* 已保存的代理链列表 */}
        {savedChains.length > 0 && (
          <div className="saved-chains-section" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
              已保存的代理链 ({savedChains.length})
            </h3>
            <div className="saved-chains-list">
              {savedChains.map((chain, index) => (
                <Card 
                  key={chain.id} 
                  size="small" 
                  style={{ 
                    marginBottom: '8px',
                    border: chain.id === defaultChainId ? '2px solid #1890ff' : '1px solid #e8e8e8',
                    borderRadius: '8px',
                    background: chain.id === defaultChainId ? 'rgba(24, 144, 255, 0.05)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        {chain.id === defaultChainId && (
                          <StarFilled style={{ color: '#1890ff', marginRight: '8px' }} />
                        )}
                        <div style={{ fontWeight: '600' }}>{chain.name}</div>
                        {chain.id === defaultChainId && (
                          <Tag color="blue" style={{ marginLeft: '8px' }}>默认</Tag>
                        )}
                      </div>
                      {chain.description && (
                        <div style={{ fontSize: '12px', color: '#666' }}>{chain.description}</div>
                      )}
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        包含 {chain.proxies.length} 个节点
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {/* 设置默认代理链按钮 */}
                      {chain.id === defaultChainId ? (
                        <Tooltip title="取消默认设置">
                          <Button 
                            size="small" 
                            type="text" 
                            icon={<StarOutlined />}
                            onClick={() => handleUnsetDefaultChain()}
                            style={{ color: '#1890ff' }}
                          />
                        </Tooltip>
                      ) : (
                        <Tooltip title="设为默认代理链">
                          <Button 
                            size="small" 
                            type="text" 
                            icon={<StarOutlined />}
                            onClick={() => handleSetDefaultChain(chain.id)}
                          />
                        </Tooltip>
                      )}
                      
                      {/* 启动代理链按钮 */}
                      <Button 
                        size="small" 
                        type={chain.enabled ? 'primary' : 'default'}
                        icon={chain.enabled ? <PoweroffOutlined /> : <PlayCircleOutlined />}
                        onClick={() => onStartChain?.(chain)}
                        style={{ 
                          minWidth: '60px',
                          fontSize: '12px'
                        }}
                      >
                        {chain.enabled ? '运行中' : '启动'}
                      </Button>
                      
                      {/* 删除按钮 */}
                      <Button 
                        size="small" 
                        type="text" 
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => onDeleteChain?.(chain.id)}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 新建代理链区域 */}
        <div className="new-chain-section">
          <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
            新建代理链
          </h3>
          <div className="chain-header">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder="输入代理链名称"
                value={chainName}
                onChange={(e) => setChainName(e.target.value)}
                style={{ fontSize: '16px', fontWeight: 'bold' }}
              />
              <Input.TextArea
                placeholder="输入代理链描述（可选）"
                value={chainDescription}
                onChange={(e) => setChainDescription(e.target.value)}
                rows={2}
              />
            </Space>
          </div>

          <Row gutter={16} style={{ marginTop: '16px' }}>
        {/* 可用节点区域 */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <CloudOutlined />
                可用节点 ({nodes.length})
              </Space>
            }
            size="small"
            className="nodes-panel"
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin />
              </div>
            ) : nodes.length === 0 ? (
              <Empty description="暂无可用节点" />
            ) : (
              <Droppable droppableId="available-nodes">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`nodes-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                    style={{
                      minHeight: '200px',
                      border: snapshot.isDraggingOver ? '2px dashed #52c41a' : '2px dashed #d9d9d9',
                      borderRadius: '8px',
                      padding: '16px',
                      background: snapshot.isDraggingOver ? 'rgba(82, 196, 26, 0.05)' : 'transparent'
                    }}
                  >
                    {nodes.map((node, index) => (
                      <Draggable key={node.id} draggableId={node.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`node-card ${snapshot.isDragging ? 'dragging' : ''}`}
                            style={{
                              ...provided.draggableProps.style,
                              transform: snapshot.isDragging ? provided.draggableProps.style?.transform : 'none',
                              opacity: snapshot.isDragging ? 0.8 : 1,
                            }}
                          >
                            <Card size="small" className="node-item">
                              <div className="node-info">
                                <div className="node-header">
                                  <Space>
                                    {getProtocolIcon(node.type as string)}
                                    <Text strong>{node.name}</Text>
                                    <Tag color={getProtocolColor(node.type as string)}>
                                      {(node.type as string).toUpperCase()}
                                    </Tag>
                                  </Space>
                                </div>
                                <div className="node-details">
                                  <Text type="secondary">
                                    {node.server}:{node.port}
                                  </Text>
                                  {/* Latency badge can be added here if Node type supports it */}
                                </div>
                              </div>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}
          </Card>
        </Col>

        {/* 代理链区域 */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <LinkOutlined />
                代理链 ({chainNodes.length})
              </Space>
            }
            size="small"
            className="chain-panel"
            extra={
              <Space>
                <Button 
                  size="small" 
                  icon={<ClearOutlined />} 
                  onClick={handleClearChain}
                  disabled={chainNodes.length === 0}
                >
                  清空
                </Button>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<SaveOutlined />} 
                  onClick={handleSaveChain}
                  disabled={chainNodes.length === 0}
                >
                  保存
                </Button>
              </Space>
            }
          >
            <Droppable droppableId="chain-nodes">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`chain-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  style={{
                    minHeight: '200px',
                    border: snapshot.isDraggingOver ? '2px dashed #1890ff' : '2px dashed #d9d9d9',
                    borderRadius: '8px',
                    padding: '16px',
                    background: snapshot.isDraggingOver ? 'rgba(24, 144, 255, 0.05)' : 'transparent'
                  }}
                >
                  {chainNodes.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px 20px',
                      color: '#8c8c8c',
                      fontSize: '14px'
                    }}>
                      <LinkOutlined style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }} />
                      拖拽节点到此处构建代理链
                    </div>
                  ) : (
                    chainNodes.map((node, index) => (
                      <Draggable key={node.id} draggableId={node.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`chain-node ${snapshot.isDragging ? 'dragging' : ''}`}
                            style={{
                              ...provided.draggableProps.style,
                              transform: snapshot.isDragging ? provided.draggableProps.style?.transform : 'none',
                              opacity: snapshot.isDragging ? 0.8 : 1,
                            }}
                          >
                            <Card size="small" className="chain-node-item">
                              <div className="chain-node-content">
                                <div className="node-index">
                                  <Badge count={index + 1} style={{ backgroundColor: '#1890ff' }} />
                                </div>
                                <div className="node-info">
                                  <div className="node-header">
                                    <Space>
                                      {getProtocolIcon(node.server.type as string)}
                                      <Text strong>{node.server.name}</Text>
                                      <Tag color={getProtocolColor(node.server.type as string)}>
                                        {(node.server.type as string).toUpperCase()}
                                      </Tag>
                                      {node.config && (
                                        <Tag color="orange" icon={<SettingOutlined />}>
                                          已配置
                                        </Tag>
                                      )}
                                    </Space>
                                  </div>
                                  <div className="node-details">
                                    <Text type="secondary">
                                      {node.server.server}:{node.server.port}
                                    </Text>
                                  </div>
                                </div>
                                <div className="node-actions">
                                  <Space>
                                    <Tooltip title="编辑配置">
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={<EditOutlined />}
                                        onClick={() => editNodeConfig(node)}
                                      />
                                    </Tooltip>
                                    <Tooltip title="移除">
                                      <Button
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => removeNodeFromChain(node.id)}
                                      />
                                    </Tooltip>
                                  </Space>
                                </div>
                              </div>
                              {index < chainNodes.length - 1 && (
                                <div className="chain-arrow">
                                  <ArrowDownOutlined />
                                </div>
                              )}
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </Card>
        </Col>
      </Row>
        </div>

      {/* 节点配置编辑模态框 */}
      <Modal
        title="编辑节点配置"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingNode(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveNodeConfig}
        >
          <Form.Item
            name="name"
            label="节点名称"
            rules={[{ required: true, message: '请输入节点名称' }]}
          >
            <Input placeholder="请输入节点名称" />
          </Form.Item>

          <Form.Item
            name="protocol"
            label="协议类型"
            rules={[{ required: true, message: '请选择协议类型' }]}
          >
            <Select placeholder="请选择协议类型">
              <Option value="vmess">VMess</Option>
              <Option value="vless">VLESS</Option>
              <Option value="shadowsocks">Shadowsocks</Option>
              <Option value="trojan">Trojan</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="host"
            label="服务器地址"
            rules={[{ required: true, message: '请输入服务器地址' }]}
          >
            <Input placeholder="请输入服务器地址" />
          </Form.Item>

          <Form.Item
            name="port"
            label="端口"
            rules={[{ required: true, message: '请输入端口' }]}
          >
            <Input placeholder="请输入端口" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => {
                setEditModalVisible(false);
                setEditingNode(null);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      </div>
    </DragDropContext>
  );
};

export default ProxyChainBuilder;
