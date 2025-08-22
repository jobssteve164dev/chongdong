import { ProxyNode } from '../shared/types';
import { 
  ProtocolAdapterInfo, 
  AdapterStatus, 
  TrafficStats, 
  MonitoringEvent, 
  MonitoringEventType,
  IAdapter
} from '../shared/types/middleware';
import { proxyChainConfigGenerator } from './proxyChainConfigGenerator';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { createConnection } from 'net'; // Added for checkPortReady

/**
 * 协议适配器 - 为单个节点创建独立的sing-box实例
 */
export class ProtocolAdapter implements IAdapter {
  private id: string;
  private node: ProxyNode;
  private port: number;
  private status: AdapterStatus = AdapterStatus.IDLE;
  private process?: ChildProcess | undefined;
  private processId?: number | undefined;
  private error?: string | undefined;
  private startTime?: Date | undefined;
  private trafficStats: TrafficStats;
  private configPath?: string;
  private monitoringListeners: ((event: MonitoringEvent) => void)[] = [];
  private nextHopHost: string | undefined; // [修改] 明确类型为 string | undefined
  private nextHopPort: number | undefined; // [修改] 明确类型为 number | undefined
  private inboundOverride: any | undefined; // [新增] 用于覆盖默认入站配置


  constructor(
    id: string, 
    node: ProxyNode, 
    port: number, 
    nextHopHost?: string, 
    nextHopPort?: number,
    inboundOverride?: any
  ) {
    this.id = id;
    this.node = node;
    this.port = port;
    this.nextHopHost = nextHopHost;
    this.nextHopPort = nextHopPort;
    this.inboundOverride = inboundOverride;
    this.trafficStats = {
      bytesReceived: 0,
      bytesSent: 0,
      connections: 0,
      lastActivity: new Date()
    };
  }

  /**
   * 启动协议适配器
   */
  public async start(): Promise<void> {
    console.log(`[ProtocolAdapter] 启动协议适配器: ${this.id} (${this.node.name})`);
    console.log(`[ProtocolAdapter] 节点详情:`);
    console.log(`  - 节点ID: ${this.node.id}`);
    console.log(`  - 节点名称: ${this.node.name}`);
    console.log(`  - 节点类型: ${this.node.type}`);
    console.log(`  - 服务器: ${this.node.server}:${this.node.port}`);
    console.log(`  - 本地端口: ${this.port}`);
    
    try {
      this.status = AdapterStatus.STARTING;
      this.startTime = new Date();
      console.log(`[ProtocolAdapter] 状态已设置为: starting`);
      
      console.log(`[ProtocolAdapter] 步骤1: 生成sing-box配置...`);
      await this.generateConfig();
      console.log(`[ProtocolAdapter] sing-box配置生成完成`);
      
      console.log(`[ProtocolAdapter] 步骤2: 启动sing-box进程...`);
      await this.startSingBoxProcess();
      console.log(`[ProtocolAdapter] sing-box进程启动完成，PID: ${this.processId}`);
      
      console.log(`[ProtocolAdapter] 步骤3: 验证端口可用性...`);
      await this.verifyPort();
      console.log(`[ProtocolAdapter] 端口验证完成，端口 ${this.port} 可用`);
      
      this.status = AdapterStatus.RUNNING;
      console.log(`[ProtocolAdapter] 状态已设置为: running`);
      
      this.emitMonitoringEvent(MonitoringEventType.CONNECTION_START, {
        adapterId: this.id,
        nodeId: this.node.id,
        port: this.port
      });
      
      console.log(`✅ [ProtocolAdapter] 协议适配器启动成功: ${this.id} (端口: ${this.port})`);
    } catch (error) {
      this.status = AdapterStatus.ERROR;
      this.error = error instanceof Error ? error.message : String(error);
      console.error(`❌ [ProtocolAdapter] 协议适配器启动失败: ${this.id}`, error);
      console.error(`❌ [ProtocolAdapter] 错误详情:`, error instanceof Error ? error.stack : error);
      
      this.emitMonitoringEvent(MonitoringEventType.ERROR_OCCURRED, {
        adapterId: this.id,
        nodeId: this.node.id,
        error: this.error
      });
      
      throw error;
    }
  }

  /**
   * 停止协议适配器
   */
  public async stop(): Promise<void> {
    console.log(`[ProtocolAdapter] 停止协议适配器: ${this.id}`);
    
    try {
      this.status = AdapterStatus.STOPPING;
      
      if (this.process) {
        this.process.kill('SIGTERM');
        
        // 等待进程结束
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            if (this.process) {
              this.process.kill('SIGKILL');
            }
            resolve();
          }, 5000);
          
          this.process!.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }
      
      // 清理配置文件
      if (this.configPath && fs.existsSync(this.configPath)) {
        fs.unlinkSync(this.configPath);
      }
      
      this.status = AdapterStatus.STOPPED;
      this.process = undefined;
      this.processId = undefined;
      
      console.log(`✅ [ProtocolAdapter] 协议适配器停止成功: ${this.id}`);
      
    } catch (error) {
      console.error(`❌ [ProtocolAdapter] 协议适配器停止失败: ${this.id}`, error);
      throw error;
    }
  }

  /**
   * 获取适配器信息
   */
  public getInfo(): ProtocolAdapterInfo {
    return {
      id: this.id,
      node: this.node,
      status: this.status,
      port: this.port,
      processId: this.processId,
      error: this.error,
      startTime: this.startTime,
      trafficStats: { ...this.trafficStats }
    };
  }

  /**
   * 添加监控监听器
   */
  public addMonitoringListener(callback: (event: MonitoringEvent) => void): void {
    this.monitoringListeners.push(callback);
  }

  /**
   * 移除监控监听器
   */
  public removeMonitoringListener(callback: (event: MonitoringEvent) => void): void {
    const index = this.monitoringListeners.indexOf(callback);
    if (index > -1) {
      this.monitoringListeners.splice(index, 1);
    }
  }

  /**
   * 生成sing-box配置
   */
  private async generateConfig(): Promise<any> {
    // [修改] 使用新的 generateSingleNodeConfig 方法生成配置
    const config = proxyChainConfigGenerator.generateSingleNodeConfig(
      this.node,
      this.port,
      this.nextHopHost,
      this.nextHopPort,
      this.inboundOverride // [新增] 传递 inboudOverride
    );
    
    // 保存配置文件
    const configDir = path.join(process.env['HOME'] || '', 'Library/Application Support/chongdong/proxy-configs');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    this.configPath = path.join(configDir, `adapter_${this.id}.json`);
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    
    console.log(`[ProtocolAdapter] 配置文件已生成: ${this.configPath}`);
    return config;
  }

  /**
   * 启动sing-box进程
   */
  private async startSingBoxProcess(): Promise<void> {
    const singBoxPath = path.join(process.env['HOME'] || '', 'Library/Application Support/chongdong/bin/sing-box');
    
    if (!fs.existsSync(singBoxPath)) {
      throw new Error(`Sing-box 可执行文件不存在: ${singBoxPath}`);
    }
    
    const args = ['run', '-c', this.configPath!];
    const options = {
      cwd: path.dirname(singBoxPath),
      stdio: ['pipe', 'pipe', 'pipe'] as ('pipe' | 'ignore' | 'inherit')[]
    };
    
    console.log(`[ProtocolAdapter] 启动sing-box进程: ${singBoxPath} ${args.join(' ')}`);
    
    this.process = spawn(singBoxPath, args, options);
    if (this.process && this.process.pid) {
      this.processId = this.process.pid;
    }
    
    if (!this.process) {
      throw new Error('Failed to spawn sing-box process');
    }
    
    // 监听标准输出
    this.process.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`[ProtocolAdapter ${this.id}] stdout: ${output.trim()}`);
      
      // 解析流量信息
      this.parseTrafficInfo(output);
    });
    
    // 监听标准错误
    this.process.stderr?.on('data', (data) => {
      const errorMessage = data.toString();
      console.error(`[ProtocolAdapter ${this.id}] stderr: ${errorMessage.trim()}`);
      
      if (errorMessage.includes('error') || errorMessage.includes('failed')) {
        this.emitMonitoringEvent(MonitoringEventType.ERROR_OCCURRED, {
          adapterId: this.id,
          nodeId: this.node.id,
          error: errorMessage.trim()
        });
      }
    });
    
    // 监听进程退出
    this.process.on('exit', (code, signal) => {
      console.log(`[ProtocolAdapter ${this.id}] 进程退出: code=${code}, signal=${signal}`);
      
      if (code !== 0) {
        this.status = AdapterStatus.ERROR;
        this.error = `进程异常退出: code=${code}, signal=${signal}`;
        
        this.emitMonitoringEvent(MonitoringEventType.NODE_FAILURE, {
          adapterId: this.id,
          nodeId: this.node.id,
          error: this.error
        });
      }
    });
    
    // 等待进程启动
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sing-box进程启动超时'));
      }, 10000);
      
      this.process!.on('spawn', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      this.process!.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * 检查端口是否可用
   */
  private async checkPortReady(host: string, port: number, timeout: number = 5000): Promise<boolean> {
    
    return new Promise((resolve) => {
      const client = createConnection({ host, port });
      
      const timer = setTimeout(() => {
        client.destroy();
        resolve(false);
      }, timeout);
      
      client.on('connect', () => {
        clearTimeout(timer);
        client.destroy();
        resolve(true);
      });
      
      client.on('error', () => {
        clearTimeout(timer);
        client.destroy();
        resolve(false);
      });
    });
  }

  /**
   * 验证端口是否可用
   */
  private async verifyPort(): Promise<void> {
    console.log(`[ProtocolAdapter] 验证端口: ${this.port}`);
    
    // 增加等待时间，确保sing-box进程完全启动
    const waitTime = 3000; // 增加到3秒
    console.log(`[ProtocolAdapter] 等待 ${waitTime}ms 让sing-box进程完全启动...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    const maxRetries = 5;
    const retryInterval = 1000;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`[ProtocolAdapter] 第 ${i + 1} 次尝试验证端口 ${this.port}...`);
        const isReady = await this.checkPortReady('127.0.0.1', this.port, 5000);
        
        if (isReady) {
          console.log(`[ProtocolAdapter] 端口 ${this.port} 验证成功`);
          return;
        }
      } catch (error) {
        console.log(`[ProtocolAdapter] 第 ${i + 1} 次端口验证失败:`, error);
      }
      
      if (i < maxRetries - 1) {
        console.log(`[ProtocolAdapter] 等待 ${retryInterval}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryInterval));
      }
    }
    
    throw new Error(`端口验证失败: ${this.port} - 经过 ${maxRetries} 次重试后仍然无法连接`);
  }

  /**
   * 解析流量信息
   */
  private parseTrafficInfo(output: string): void {
    // 这里可以解析sing-box的输出，提取流量统计信息
    // 例如：连接数、流量大小等
    if (output.includes('connection')) {
      this.trafficStats.connections++;
      this.trafficStats.lastActivity = new Date();
    }
  }

  /**
   * 发送监控事件
   */
  private emitMonitoringEvent(type: MonitoringEventType, data?: any): void {
    const event: MonitoringEvent = {
      type,
      timestamp: new Date(),
      adapterId: this.id,
      nodeId: this.node.id,
      data
    };
    
    this.monitoringListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error(`[ProtocolAdapter] 监控监听器错误:`, error);
      }
    });
  }
}