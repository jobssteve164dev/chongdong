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

export class UnifiedChainAdapter implements IAdapter {
  private id: string;
  private nodes: ProxyNode[];
  private port: number;
  private status: AdapterStatus = AdapterStatus.IDLE;
  private process?: ChildProcess | undefined;
  private processId?: number | undefined;
  private error?: string | undefined;
  private startTime?: Date | undefined;
  private trafficStats: TrafficStats;
  private configPath?: string;
  private monitoringListeners: ((event: MonitoringEvent) => void)[] = [];

  constructor(id: string, nodes: ProxyNode[], port: number) {
    this.id = id;
    this.nodes = nodes;
    this.port = port;
    this.trafficStats = {
      bytesReceived: 0,
      bytesSent: 0,
      connections: 0,
      lastActivity: new Date()
    };
  }

  public async start(): Promise<void> {
    console.log(`[UnifiedChainAdapter] 启动统一代理链适配器: ${this.id}`);
    console.log(`[UnifiedChainAdapter] 节点详情:`);
    console.log(`  - 节点数量: ${this.nodes.length}`);
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (node) {
        console.log(`  - 节点${i + 1}: ${node.name} (${node.type}) - ${node.server}:${node.port}`);
      }
    }
    console.log(`  - 本地端口: ${this.port}`);
    
    try {
      this.status = AdapterStatus.STARTING;
      this.startTime = new Date();
      console.log(`[UnifiedChainAdapter] 状态已设置为: starting`);
      
      console.log(`[UnifiedChainAdapter] 步骤1: 生成统一代理链配置...`);
      await this.generateConfig();
      console.log(`[UnifiedChainAdapter] 统一代理链配置生成完成`);
      
      console.log(`[UnifiedChainAdapter] 步骤2: 启动sing-box进程...`);
      await this.startSingBoxProcess();
      console.log(`[UnifiedChainAdapter] sing-box进程启动完成，PID: ${this.processId}`);
      
      console.log(`[UnifiedChainAdapter] 步骤3: 验证端口可用性...`);
      await this.verifyPort();
      console.log(`[UnifiedChainAdapter] 端口验证完成，端口 ${this.port} 可用`);
      
      this.status = AdapterStatus.RUNNING;
      console.log(`[UnifiedChainAdapter] 状态已设置为: running`);
      
      this.emitMonitoringEvent(MonitoringEventType.CONNECTION_START, {
        adapterId: this.id,
        nodeCount: this.nodes.length,
        port: this.port
      });
      
      console.log(`✅ [UnifiedChainAdapter] 统一代理链适配器启动成功: ${this.id} (端口: ${this.port})`);
    } catch (error) {
      this.status = AdapterStatus.ERROR;
      this.error = error instanceof Error ? error.message : String(error);
      console.error(`❌ [UnifiedChainAdapter] 统一代理链适配器启动失败: ${this.id}`, error);
      console.error(`❌ [UnifiedChainAdapter] 错误详情:`, error instanceof Error ? error.stack : error);
      
      this.emitMonitoringEvent(MonitoringEventType.ERROR_OCCURRED, {
        adapterId: this.id,
        error: this.error
      });
      
      throw error;
    }
  }

  public async stop(): Promise<void> {
    console.log(`[UnifiedChainAdapter] 停止统一代理链适配器: ${this.id}`);
    
    try {
      this.status = AdapterStatus.STOPPING;
      
      if (this.process) {
        this.process.kill('SIGTERM');
        
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
      
      if (this.configPath && fs.existsSync(this.configPath)) {
        fs.unlinkSync(this.configPath);
      }
      
      this.status = AdapterStatus.STOPPED;
      this.process = undefined;
      this.processId = undefined;
      
      console.log(`✅ [UnifiedChainAdapter] 统一代理链适配器停止成功: ${this.id}`);
      
    } catch (error) {
      console.error(`❌ [UnifiedChainAdapter] 统一代理链适配器停止失败: ${this.id}`, error);
      throw error;
    }
  }

  public getInfo(): ProtocolAdapterInfo {
    return {
      id: this.id,
      node: this.nodes[0] || {} as ProxyNode, // 使用第一个节点作为代表
      status: this.status,
      port: this.port,
      processId: this.processId,
      error: this.error,
      startTime: this.startTime,
      trafficStats: { ...this.trafficStats }
    };
  }

  public addMonitoringListener(callback: (event: MonitoringEvent) => void): void {
    this.monitoringListeners.push(callback);
  }

  public removeMonitoringListener(callback: (event: MonitoringEvent) => void): void {
    const index = this.monitoringListeners.indexOf(callback);
    if (index > -1) {
      this.monitoringListeners.splice(index, 1);
    }
  }

  private async generateConfig(): Promise<any> {
    // 生成统一的代理链配置，确保IP隐藏
    const config = proxyChainConfigGenerator.generateChainConfig(this.nodes, this.port);
    
    const configDir = path.join(process.env['HOME'] || '', 'Library/Application Support/chongdong/proxy-configs');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    this.configPath = path.join(configDir, `unified_chain_${this.id}.json`);
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    
    console.log(`[UnifiedChainAdapter] 统一代理链配置文件已生成: ${this.configPath}`);
    return config;
  }

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
    
    console.log(`[UnifiedChainAdapter] 启动sing-box进程: ${singBoxPath} ${args.join(' ')}`);
    
    this.process = spawn(singBoxPath, args, options);
    if (this.process && this.process.pid) {
      this.processId = this.process.pid;
    }
    
    if (!this.process) {
      throw new Error('Failed to spawn sing-box process');
    }
    
    this.process.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`[UnifiedChainAdapter ${this.id}] stdout: ${output.trim()}`);
      this.parseTrafficInfo(output);
    });
    
    this.process.stderr?.on('data', (data) => {
      const errorMessage = data.toString();
      console.error(`[UnifiedChainAdapter ${this.id}] stderr: ${errorMessage.trim()}`);
      
      if (errorMessage.includes('error') || errorMessage.includes('failed')) {
        this.emitMonitoringEvent(MonitoringEventType.ERROR_OCCURRED, {
          adapterId: this.id,
          error: errorMessage.trim()
        });
      }
    });
    
    this.process.on('exit', (code, signal) => {
      console.log(`[UnifiedChainAdapter ${this.id}] 进程退出: code=${code}, signal=${signal}`);
      
      if (code !== 0) {
        this.status = AdapterStatus.ERROR;
        this.error = `进程异常退出: code=${code}, signal=${signal}`;
        
        this.emitMonitoringEvent(MonitoringEventType.NODE_FAILURE, {
          adapterId: this.id,
          error: this.error
        });
      }
    });
    
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

  private async verifyPort(): Promise<void> {
    console.log(`[UnifiedChainAdapter] 验证端口: ${this.port}`);
    
    const waitTime = 3000;
    console.log(`[UnifiedChainAdapter] 等待 ${waitTime}ms 让sing-box进程完全启动...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    const maxRetries = 5;
    const retryInterval = 1000;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`[UnifiedChainAdapter] 第 ${i + 1} 次尝试验证端口 ${this.port}...`);
        const isReady = await this.checkPortReady('127.0.0.1', this.port, 5000);
        
        if (isReady) {
          console.log(`[UnifiedChainAdapter] 端口 ${this.port} 验证成功`);
          return;
        }
      } catch (error) {
        console.log(`[UnifiedChainAdapter] 第 ${i + 1} 次端口验证失败:`, error);
      }
      
      if (i < maxRetries - 1) {
        console.log(`[UnifiedChainAdapter] 等待 ${retryInterval}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryInterval));
      }
    }
    
    throw new Error(`端口验证失败: ${this.port} - 经过 ${maxRetries} 次重试后仍然无法连接`);
  }

  private checkPortReady(host: string, port: number, timeout: number = 5000): Promise<boolean> {
    const { createConnection } = require('net');
    
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

  private parseTrafficInfo(output: string): void {
    // 解析流量信息的逻辑
    if (output.includes('inbound') || output.includes('outbound')) {
      this.trafficStats.lastActivity = new Date();
    }
  }

  private emitMonitoringEvent(type: MonitoringEventType, data?: any): void {
    const event: MonitoringEvent = {
      type,
      timestamp: new Date(),
      adapterId: this.id,
      data
    };
    
    for (const listener of this.monitoringListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`[UnifiedChainAdapter] 监控监听器错误:`, error);
      }
    }
  }
}
