import { ProxyNode, ProxyProtocol } from '../shared/types';

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
  public generateChainConfig(nodes: ProxyNode[], listenPort: number): ProxyChainConfig {
    if (nodes.length === 0) {
      throw new Error('No nodes provided for chain configuration');
    }

    // 增加验证步骤：过滤掉无效节点，防止因上游数据问题导致崩溃
    const validNodes = nodes.filter(node => {
      const isValid = node && node.server && node.port;
      if (!isValid) {
        console.warn(`[ProxyChainConfigGenerator] Filtering out invalid node: ${node.name} (ID: ${node.id}) due to missing server or port.`);
      }
      return isValid;
    });

    if (validNodes.length === 0) {
      throw new Error('No valid nodes found for chain configuration after filtering. All provided nodes were incomplete.');
    }
    
    console.log(`[ProxyChainConfigGenerator] Generating chain config for ${validNodes.length} valid nodes on port ${listenPort}`);

    // 使用传入的端口号生成入站配置
    const inbounds = this.generateInbounds(listenPort);

    // 生成出站配置
    const outbounds = this.generateOutbounds(validNodes);

    // 生成路由配置
    const route = this.generateRoute(validNodes);

    // 生成日志配置
    const logConfig = this.generateLogConfig();

    const config: ProxyChainConfig = {
      inbounds,
      outbounds,
      route,
      log: logConfig
    };

    console.log(`[ProxyChainConfigGenerator] Generated chain config:`, JSON.stringify(config, null, 2));

    return config;
  }

  /**
   * 生成入站配置
   */
  private generateInbounds(port: number): any[] {
    return [
      {
        type: 'mixed',
        tag: 'mixed-in',
        listen: '127.0.0.1',
        listen_port: port,
        users: []
      }
    ];
  }

  /**
   * 生成出站配置
   */
  private generateOutbounds(nodes: ProxyNode[]): any[] {
    const outbounds: any[] = [];
    let nextOutboundTag: string | null = null;

    // 为了构建链条，我们从后向前遍历节点
    // 最后一个节点的出口是互联网 (nextOutboundTag is null)
    // 倒数第二个节点的出口是最后一个节点... 以此类推
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (!node) continue; // 增加安全检查，防止节点为undefined
      
      const nodeOutbound = this.generateNodeOutbound(node);

      // 关键修复：使用 'detour' 字段来指定下一个出站，这是旧版本sing-box的链接方式
      if (nextOutboundTag) {
        nodeOutbound.detour = nextOutboundTag;
      } else {
        // 最后一个节点连接到互联网
        nodeOutbound.detour = 'direct';
      }

      outbounds.unshift(nodeOutbound); // 在数组开头添加，以保持原始节点顺序
      nextOutboundTag = nodeOutbound.tag; // 更新“下一个”节点的标签
    }

    // 添加默认的 direct 和 block 出站
    outbounds.push({
      type: 'direct',
      tag: 'direct'
    });
    outbounds.push({
      type: 'block',
      tag: 'block'
    });

    return outbounds;
  }

  /**
   * 为单个节点生成出站配置
   */
  private generateNodeOutbound(node: ProxyNode): any {
    const baseConfig = {
      tag: `proxy-${node.id}`,
      server: node.server,
      server_port: node.port
    };

    switch (node.type) {
      case ProxyProtocol.VMESS:
        const vmessConfig: any = {
          type: 'vmess',
          ...baseConfig,
          uuid: node.uuid,
          security: node.encryption || 'auto',
          alter_id: node.alterId ?? 0,
          tls: {
            enabled: false  // VMess通常不需要TLS
          }
        };
        
        if (node.network === 'ws') {
          vmessConfig.transport = {
            type: 'ws',
            path: node.wsPath || '/',
            headers: {
              Host: node.wsHost || node.server,
            },
          };
        }
        
        return vmessConfig;
        
      case ProxyProtocol.VLESS:
        // vless 的实现需要更多字段，这里暂时保持简单
        return {
          type: 'vless',
          ...baseConfig,
          uuid: node.uuid,
          tls: {
            enabled: false  // VLESS可以不使用TLS
          }
        };
      case ProxyProtocol.SHADOWSOCKS:
        return {
          type: 'shadowsocks',
          ...baseConfig,
          method: node.encryption,
          password: node.password,
          tls: {
            enabled: false  // Shadowsocks通常不需要TLS
          }
        };
      case ProxyProtocol.TROJAN:
        return {
          type: 'trojan',
          ...baseConfig,
          password: node.password,
          tls: {
            enabled: true,
            insecure: true  // 允许不安全的证书
          }
        };
      case ProxyProtocol.HTTP:
      case ProxyProtocol.SOCKS5:
        return {
          type: node.type,
          ...baseConfig,
          username: node.username,
          password: node.password,
          tls: {
            enabled: false  // HTTP/SOCKS5通常不需要TLS
          }
        }
      default:
        console.warn(`Unsupported proxy type for outbound generation: ${node.type}`);
        // 返回一个默认的 block 出站以避免崩溃
        return { type: 'block', tag: `proxy-${node.id}` };
    }
  }

  /**
   * 生成路由配置
   */
  private generateRoute(nodes: ProxyNode[]): any {
    // 如果没有有效节点，则只返回默认规则
    if (nodes.length === 0 || !nodes[0]) {
      return {
        rules: [],
        final: 'direct'
      };
    }
    
    // 路由规则非常简单：将所有入站流量指向链条的第一个节点
    const firstNodeTag = `proxy-${nodes[0].id}`;
    
    return {
      rules: [
        {
          inbound: ['mixed-in'],
          outbound: firstNodeTag,
        },
      ],
      final: 'direct',
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
