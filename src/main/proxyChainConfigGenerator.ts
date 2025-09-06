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
      // 无节点时的安全回退：仍然生成一个可启动的基础配置（mixed 入站 + direct 出站）
      const inbounds = this.generateInbounds(listenPort);
      const logConfig = this.generateLogConfig();
      return {
        inbounds,
        outbounds: [this.createDirectOutbound(), this.createBlockOutbound()],
        route: {
          rules: [
            {
              inbound: [inbounds[0].tag, 'tun-in'],
              outbound: 'direct'
            }
          ],
          final: 'direct'
        },
        log: logConfig
      };
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
      const inbounds = this.generateInbounds(listenPort);
      const logConfig = this.generateLogConfig();
      return {
        inbounds,
        outbounds: [this.createDirectOutbound(), this.createBlockOutbound()],
        route: {
          rules: [
            {
              inbound: [inbounds[0].tag, 'tun-in'],
              outbound: 'direct'
            }
          ],
          final: 'direct'
        },
        log: logConfig
      };
    }
    
    console.log(`[ProxyChainConfigGenerator] Generating chain config for ${validNodes.length} valid nodes on port ${listenPort}`);

    // 使用传入的端口号生成入站配置
    const inbounds = this.generateInbounds(listenPort);

    // 生成出站配置
    const outbounds = this.generateOutboundsForChain(validNodes);

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
   * [新增] 为中间件链中的单个节点生成配置
   * @param node 当前节点
   * @param listenPort 此sing-box实例的监听端口
   * @param nextHopHost 下一跳的主机地址 (通常是 '127.0.0.1')
   * @param nextHopPort 下一跳的端口 (如果是最后一个节点，则为 undefined)
   * @param inboundOverride [新增] 用于覆盖默认 "mixed" 入站的配置，以实现链式连接
   */
  public generateSingleNodeConfig(
    node: ProxyNode, 
    listenPort: number, 
    nextHopHost?: string, 
    nextHopPort?: number,
    inboundOverride?: any 
  ): ProxyChainConfig {
    const inbounds = inboundOverride ? [inboundOverride] : this.generateInbounds(listenPort);
    const outbounds = this.generateOutbounds(node, nextHopHost, nextHopPort);
    const route = this.generateSingleNodeRoute(node, !nextHopHost || !nextHopPort, inbounds[0].tag);
    const logConfig = this.generateLogConfig();

    const config: ProxyChainConfig = {
      inbounds,
      outbounds,
      route,
      log: logConfig
    };

    const nodeType = (!nextHopHost || !nextHopPort) ? 'FINAL' : 'INTERMEDIATE';
    console.log(`[ProxyChainConfigGenerator] Generated ${nodeType} node config for ${node.name} on port ${listenPort}:`, JSON.stringify(config, null, 2));
    
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
   * 生成出站配置 (旧，保留给传统模式)
   */
  private generateOutboundsForChain(nodes: ProxyNode[]): any[] {
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
        // 如果是最后一个节点，则直接连接互联网
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
   * [新] 为中间件模式生成出站配置
   */
  private generateOutbounds(node: ProxyNode, nextHopHost?: string, nextHopPort?: number): any[] {
    const isFinalNode = !nextHopHost || !nextHopPort;
    const nodeOutbound = this.generateNodeOutbound(node);

    if (isFinalNode) {
      // 最后一个节点：其协议出站是主要出站，并直接连接到互联网。
      nodeOutbound.tag = `proxy-${node.id}`;
      nodeOutbound.detour = 'direct';
      return [nodeOutbound, this.createDirectOutbound(), this.createBlockOutbound()];
    } else {
      // 中间节点: 其出站配置应使用其自身的协议，但服务器地址指向链中的下一个本地节点。
      nodeOutbound.tag = 'main-out'; // 这是路由规则将使用的主要出站tag
      nodeOutbound.server = nextHopHost;
      nodeOutbound.server_port = nextHopPort;

      // 连接到本地的下一个适配器时，强制禁用TLS
      if (nodeOutbound.tls) {
        nodeOutbound.tls.enabled = false;
      }
      
      // 中间节点的detour应该总是direct，因为它不负责选择下一跳的协议
      nodeOutbound.detour = 'direct';

      return [nodeOutbound, this.createDirectOutbound(), this.createBlockOutbound()];
    }
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
          tls: { enabled: !!(node as any).tls }
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
        // 如果启用TLS则注入uTLS
        if (vmessConfig.tls.enabled) {
          try {
            const { settingsManager } = require('../main/settingsManager');
            const settings = settingsManager.getSettings?.() || {};
            if (settings.enableTlsFingerprintProtection) {
              const template = settings.tlsFingerprintTemplate || 'chrome';
              vmessConfig.tls = vmessConfig.tls || { enabled: true };
              (vmessConfig.tls as any).utls = { enabled: true, fingerprint: template };
            }
          } catch {}
        }
        return vmessConfig;
        
      case ProxyProtocol.VLESS:
        const vless: any = {
          type: 'vless',
          ...baseConfig,
          uuid: node.uuid,
          tls: { enabled: !!(node as any).tls }
        };
        if (vless.tls.enabled) {
          try {
            const { settingsManager } = require('../main/settingsManager');
            const settings = settingsManager.getSettings?.() || {};
            if (settings.enableTlsFingerprintProtection) {
              const template = settings.tlsFingerprintTemplate || 'chrome';
              vless.tls = vless.tls || { enabled: true };
              (vless.tls as any).utls = { enabled: true, fingerprint: template };
            }
          } catch {}
        }
        return vless;
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
        // 为启用TLS的出站注入 uTLS 指纹模板（与应用设置联动）
        const trojan: any = {
          type: 'trojan',
          ...baseConfig,
          password: node.password,
          tls: {
            enabled: true,
            insecure: true
          }
        };
        try {
          const { settingsManager } = require('../main/settingsManager');
          const settings = settingsManager.getSettings?.() || {};
          if (settings.enableTlsFingerprintProtection) {
            const template = settings.tlsFingerprintTemplate || 'chrome';
            trojan.tls = trojan.tls || { enabled: true };
            (trojan.tls as any).utls = { enabled: true, fingerprint: template };
          }
        } catch {}
        return trojan;
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
   * 生成路由配置 (用于传统模式)
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
          inbound: ['mixed-in', 'tun-in'],
          outbound: firstNodeTag,
        },
      ],
      final: 'direct',
    };
  }

  /**
   * [新增] 为中间件模式下的单个节点生成路由配置
   */
  private generateSingleNodeRoute(node: ProxyNode, isFinalNode: boolean, inboundTag: string): any {
    const outboundTag = isFinalNode ? `proxy-${node.id}` : 'main-out';
    return {
      rules: [
        {
          inbound: [inboundTag, 'tun-in'],
          outbound: outboundTag,
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
  
  private createDirectOutbound(): any {
    return { type: 'direct', tag: 'direct' };
  }

  private createBlockOutbound(): any {
    return { type: 'block', tag: 'block' };
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
