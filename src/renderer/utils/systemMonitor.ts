// 使用预加载脚本暴露的API，而不是直接导入ipcRenderer

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  systemProxyEnabled: boolean;
  systemProxyHost?: string;
  systemProxyPort?: number;
  timestamp: number;
}

export class RendererSystemMonitor {
  private static instance: RendererSystemMonitor;
  private listeners: Array<(metrics: SystemMetrics) => void> = [];
  private currentMetrics: SystemMetrics = {
    cpuUsage: 0,
    memoryUsage: 0,
    systemProxyEnabled: false,
    timestamp: Date.now()
  };

  private constructor() {
    this.setupIpcListener();
  }

  public static getInstance(): RendererSystemMonitor {
    if (!RendererSystemMonitor.instance) {
      RendererSystemMonitor.instance = new RendererSystemMonitor();
    }
    return RendererSystemMonitor.instance;
  }

  /**
   * 设置IPC监听器
   */
  private setupIpcListener(): void {
    window.electron.ipcRenderer.on('system:metrics-updated', (metrics: SystemMetrics) => {
      this.currentMetrics = metrics;
      this.notifyListeners(metrics);
    });
  }

  /**
   * 获取当前系统指标
   */
  public async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const metrics = await window.electron.ipcRenderer.invoke('system:get-metrics');
      this.currentMetrics = metrics;
      return metrics;
    } catch (error) {
      console.error('获取系统指标失败:', error);
      return this.currentMetrics;
    }
  }

  /**
   * 启动系统监控
   */
  public async startMonitoring(): Promise<void> {
    try {
      await window.electron.ipcRenderer.invoke('system:start-monitoring');
      console.log('渲染进程系统监控已启动');
    } catch (error) {
      console.error('启动系统监控失败:', error);
    }
  }

  /**
   * 停止系统监控
   */
  public async stopMonitoring(): Promise<void> {
    try {
      await window.electron.ipcRenderer.invoke('system:stop-monitoring');
      console.log('渲染进程系统监控已停止');
    } catch (error) {
      console.error('停止系统监控失败:', error);
    }
  }

  /**
   * 添加指标更新监听器
   */
  public addListener(listener: (metrics: SystemMetrics) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除指标更新监听器
   */
  public removeListener(listener: (metrics: SystemMetrics) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(metrics: SystemMetrics): void {
    this.listeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (error) {
        console.error('系统指标监听器执行失败:', error);
      }
    });
  }

  /**
   * 获取代理服务健康度
   */
  public getProxyServiceHealth(proxyConnected: boolean): number {
    if (!proxyConnected) {
      return 0;
    }
    
    // 这里可以根据更多指标计算健康度
    // 比如连接稳定性、延迟等
    return 100;
  }
}

export const rendererSystemMonitor = RendererSystemMonitor.getInstance();
