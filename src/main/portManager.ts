/**
 * 端口管理器 - 负责分配和管理本地端口
 */
export class PortManager {
  private static instance: PortManager;
  private portPool: Set<number> = new Set();
  private readonly PORT_RANGE_START = 10800; // 使用一个较高的、不易冲突的端口范围
  private readonly PORT_RANGE_END = 11800;

  private constructor() {
    this.cleanup(); // 初始化时填充端口池
  }

  public static getInstance(): PortManager {
    if (!PortManager.instance) {
      PortManager.instance = new PortManager();
    }
    return PortManager.instance;
  }

  public async getAvailablePort(): Promise<number | null> {
    if (this.portPool.size === 0) {
      console.error('[PortManager] No available ports in the pool.');
      return null;
    }
    // 使用Set迭代器安全地获取第一个值，避免了创建完整数组和随机索引的开销和类型风险
    const port = this.portPool.values().next().value as number;
    this.portPool.delete(port);
    console.log(`[PortManager] 分配端口: ${port}. 剩余可用端口: ${this.portPool.size}`);
    return port;
  }

  public releasePort(port: number): void {
    if (port >= this.PORT_RANGE_START && port <= this.PORT_RANGE_END) {
      this.portPool.add(port);
      console.log(`[PortManager] 释放端口: ${port}. 剩余可用端口: ${this.portPool.size}`);
    }
  }

  public cleanup(): void {
    this.portPool.clear();
    for (let port = this.PORT_RANGE_START; port <= this.PORT_RANGE_END; port++) {
      this.portPool.add(port);
    }
    console.log(`[PortManager] 端口池已重置. 可用端口数: ${this.portPool.size}`);
  }
}
