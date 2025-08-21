import { ProxyNode } from '../shared/types';

export interface ChainNodeConfig {
  node: ProxyNode;
  localPort: number;
  upstreamPort: number | undefined; // 上游节点的端口，第一个节点为undefined
}

export interface ProxyChainConfig {
  inbounds: any[];
  outbounds: any[];
  route: any;
  log: any;
}

export class ProxyChainConfigGenerator {
  private static instance: ProxyChainConfigGenerator;
  private portPool: Set<number> = new Set();
  private readonly PORT_RANGE_START = 1080;
  private readonly PORT_RANGE_END = 1200;

  private constructor() {
    // 初始化端口池
    for (let port = this.PORT_RANGE_START; port <= this.PORT_RANGE_END; port++) {
      this.portPool.add(port);
    }
  }

  public static getInstance(): ProxyChainConfigGenerator {
    if (!ProxyChainConfigGenerator.instance) {
      ProxyChainConfigGenerator.instance = new ProxyChainConfigGenerator();
    }
    return ProxyChainConfigGenerator.instance;
  }

  /**
   * 分配一个可用端口
   */
  private allocatePort(): number {
    for (const port of this.portPool) {
      this.portPool.delete(port);
      return port;
    }
    throw new Error('No available ports in the pool');
  }

  /**
   * 释放端口回池中
   */
  private releasePort(port: number): void {
    if (port >= this.PORT_RANGE_START && port <= this.PORT_RANGE_END) {
      this.portPool.add(port);
    }
  }

  /**
   * 生成代理链配置
   */
  public generateChainConfig(nodes: ProxyNode[]): ProxyChainConfig {
    if (nodes.length === 0) {
      throw new Error('No nodes provided for chain configuration');
    }

    console.log(`[ProxyChainConfigGenerator] Generating chain config for ${nodes.length} nodes`);

    // 为每个节点分配端口
    const chainNodes: ChainNodeConfig[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node) continue;
      
      const localPort = this.allocatePort();
      const upstreamPort = i > 0 && chainNodes[i - 1] ? chainNodes[i - 1]!.localPort : undefined;
      
      chainNodes.push({
        node,
        localPort,
        upstreamPort
      });
    }

    // 生成入站配置（只有第一个节点有入站）
    const inbounds = chainNodes.length > 0 && chainNodes[0] ? this.generateInbounds(chainNodes[0]) : [];

    // 生成出站配置（所有节点都有出站）
    const outbounds = this.generateOutbounds(chainNodes);

    // 生成路由配置
    const route = this.generateRoute(chainNodes);

    // 生成日志配置
    const log = this.generateLogConfig();

    const config: ProxyChainConfig = {
      inbounds,
      outbounds,
      route,
      log
    };

    console.log(`[ProxyChainConfigGenerator] Generated chain config:`, JSON.stringify(config, null, 2));
    return config;
  }

  /**
   * 生成入站配置
   */
  private generateInbounds(firstNode: ChainNodeConfig): any[] {
    return [
      {
        type: 'mixed',
        tag: 'mixed-in',
        listen: '127.0.0.1',
        listen_port: firstNode.localPort,
        users: []
      }
    ];
  }

  /**
   * 生成出站配置
   */
  private generateOutbounds(chainNodes: ChainNodeConfig[]): any[] {
    const outbounds: any[] = [];

    // 为每个节点生成出站配置
    chainNodes.forEach((chainNode, index) => {
      const isLastNode = index === chainNodes.length - 1;
      
      if (isLastNode) {
        // 最后一个节点连接到目标
        outbounds.push(this.generateDirectOutbound(chainNode));
      } else {
        // 中间节点连接到下一个节点
        const nextNode = chainNodes[index + 1];
        if (nextNode) {
          outbounds.push(this.generateProxyOutbound(chainNode, nextNode));
        }
      }
    });

    // 添加默认出站
    outbounds.push({
      type: 'direct',
      tag: 'direct'
    });

    return outbounds;
  }

  /**
   * 生成代理出站配置（连接到下一个节点）
   */
  private generateProxyOutbound(currentNode: ChainNodeConfig, nextNode: ChainNodeConfig): any {
    // 根据节点类型生成具体的代理配置
    const proxyConfig = this.generateProxyConfig(currentNode.node, nextNode.localPort);
    
    return {
      ...proxyConfig,
      tag: `proxy-${currentNode.node.id}`
    };
  }

  /**
   * 生成直连出站配置（最后一个节点）
   */
  private generateDirectOutbound(lastNode: ChainNodeConfig): any {
    return {
      type: 'direct',
      tag: `proxy-${lastNode.node.id}`
    };
  }

  /**
   * 根据节点类型生成具体的代理配置
   */
  private generateProxyConfig(node: ProxyNode, _targetPort: number): any {
    const baseConfig = {
      server: node.server,
      server_port: node.port,
      tag: `proxy-${node.id}`
    };

    switch (node.type) {
      case 'vmess':
        return {
          type: 'vmess',
          ...baseConfig,
          uuid: node.uuid,
          security: node.encryption || 'auto',
          network: node.network || 'tcp',
          ...(node.network === 'ws' && {
            transport: {
              type: 'ws',
              path: node.wsPath || '/',
              host: node.wsHost || node.server
            }
          })
        };

      case 'vless':
        return {
          type: 'vless',
          ...baseConfig,
          uuid: node.uuid,
          flow: '',
          encryption: 'none',
          network: node.network || 'tcp',
          ...(node.network === 'ws' && {
            transport: {
              type: 'ws',
              path: node.wsPath || '/',
              host: node.wsHost || node.server
            }
          })
        };

      case 'shadowsocks':
        return {
          type: 'shadowsocks',
          ...baseConfig,
          method: node.encryption || 'aes-256-gcm',
          password: node.password || ''
        };

      case 'trojan':
        return {
          type: 'trojan',
          ...baseConfig,
          password: node.password || ''
        };

      default:
        throw new Error(`Unsupported proxy type: ${node.type}`);
    }
  }

  /**
   * 生成路由配置
   */
  private generateRoute(chainNodes: ChainNodeConfig[]): any {
    const rules = [];
    
    // 第一个节点处理所有流量
    if (chainNodes.length > 0 && chainNodes[0]) {
      rules.push({
        inbound_tag: ['mixed-in'],
        outbound_tag: `proxy-${chainNodes[0].node.id}`
      });
    }

    return {
      rules,
      final: 'direct'
    };
  }

  /**
   * 生成日志配置
   */
  private generateLogConfig(): any {
    return {
      level: 'info',
      timestamp: true
    };
  }

  /**
   * 清理端口分配
   */
  public cleanup(): void {
    this.portPool.clear();
    for (let port = this.PORT_RANGE_START; port <= this.PORT_RANGE_END; port++) {
      this.releasePort(port);
    }
  }
}

export const proxyChainConfigGenerator = ProxyChainConfigGenerator.getInstance();
