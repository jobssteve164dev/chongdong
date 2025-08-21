import { ProxyNode } from '../shared/types';
import { 
  ProtocolAdapterInfo, 
  AdapterStatus, 
  TrafficStats, 
  MonitoringEvent, 
  MonitoringEventType 
} from '../shared/types/middleware';
import { proxyChainConfigGenerator } from './proxyChainConfigGenerator';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

/**
 * 协议适配器 - 为单个节点创建独立的sing-box实例
 */
export class ProtocolAdapter {
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

  constructor(id: string, node: ProxyNode, port: number) {
    this.id = id;
    this.node = node;
    this.port = port;
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
    
    try {
      this.status = AdapterStatus.STARTING;
      this.startTime = new Date();
      
      // 生成sing-box配置
      await this.generateConfig();
      
      // 启动sing-box进程
      await this.startSingBoxProcess();
      
      // 验证端口
      await this.verifyPort();
      
      this.status = AdapterStatus.RUNNING;
      this.emitMonitoringEvent(MonitoringEventType.CONNECTION_START, {
        adapterId: this.id,
        nodeId: this.node.id,
        port: this.port
      });
      
      console.log(`✅ [ProtocolAdapter] 协议适配器启动成功: ${this.id} (端口: ${this.port})`);
      
    } catch (error) {
      this.status = AdapterStatus.ERROR;
      this.error = error instanceof Error ? error.message : String(error);
      
      this.emitMonitoringEvent(MonitoringEventType.ERROR_OCCURRED, {
        adapterId: this.id,
        nodeId: this.node.id,
        error: this.error
      });
      
      console.error(`❌ [ProtocolAdapter] 协议适配器启动失败: ${this.id}`, error);
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
    // 为单个节点生成配置
    const config = proxyChainConfigGenerator.generateChainConfig([this.node], this.port);
    
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
   * 验证端口
   */
  private async verifyPort(): Promise<void> {
    const { createConnection } = require('net');
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`端口验证超时: ${this.port}`));
      }, 5000);
      
      const client = createConnection(this.port, '127.0.0.1', () => {
        clearTimeout(timeout);
        client.end();
        resolve();
      });
      
      client.on('error', (error: Error) => {
        clearTimeout(timeout);
        reject(new Error(`端口验证失败: ${this.port} - ${error.message}`));
      });
    });
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