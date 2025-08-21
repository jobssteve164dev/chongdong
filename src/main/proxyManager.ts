import { app } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { coreDownloader } from './coreDownloader';
import { createConnection } from 'net';
import { ProxyNode, ChainConfig, NetworkSettings } from '../shared/types';
import { proxyChainConfigGenerator } from './proxyChainConfigGenerator';
import { settingsManager } from './settingsManager';

interface ProxyProcess {
  id: string;
  type: 'singbox' | 'xray' | 'clash';
  process: ChildProcess;
  config: any;
  port: number;
  networkSettings?: any;
}

export class ProxyManager {
  private static instance: ProxyManager;
  private processes: Map<string, ProxyProcess> = new Map();
  private configDir: string;
  private binDir: string;
  private currentNetworkSettings?: NetworkSettings;

  private constructor() {
    this.configDir = join(app.getPath('userData'), 'proxy-configs');
    this.binDir = join(app.getPath('userData'), 'bin');
    
    // 确保目录存在
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
    if (!existsSync(this.binDir)) {
      mkdirSync(this.binDir, { recursive: true });
    }
  }

  public static getInstance(): ProxyManager {
    if (!ProxyManager.instance) {
      ProxyManager.instance = new ProxyManager();
    }
    return ProxyManager.instance;
  }

  public async testNodesLatency(nodes: ProxyNode[]): Promise<any[]> {
    const promises = nodes.map(node => this.testNodeLatency(node));
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => {
      const node = nodes[index];
      if (!node) {
        return { nodeId: 'unknown', success: false, error: 'Node not found at index', latency: 0, timestamp: Date.now() };
      }
      if (result.status === 'fulfilled') {
        return {
          nodeId: node.id,
          ...result.value
        };
      } else {
        return {
          nodeId: node.id,
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown test error',
          latency: 0,
          timestamp: Date.now()
        };
      }
    });
  }

  public async testNodeLatency(node: ProxyNode): Promise<{ success: boolean; latency: number, timestamp: number, error?: string }> {
    console.log(`[ProxyManager] Testing latency for node: ${node.name} (${node.id})`);
    
    try {
      const startTime = Date.now();
      
      // 创建HTTP请求来测试延迟（直接连接测试，不使用代理）
      const https = require('https');
      const http = require('http');
      
      const testUrl = 'http://connectivitycheck.gstatic.com/generate_204';
      const timeout = 10000;
      
      return new Promise((resolve) => {
        const url = new URL(testUrl);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const req = client.request(url, {
          method: 'GET',
          timeout: timeout,
        }, () => {
          const endTime = Date.now();
          const latency = endTime - startTime;
          
          console.log(`延迟测试成功: ${node.name}`, { latency });
          
          resolve({
            success: true,
            latency,
            timestamp: Date.now()
          });
        });
        
        req.on('error', (error: any) => {
          console.error(`延迟测试失败: ${node.name}`, error);
          resolve({
            success: false,
            error: error.message,
            latency: 0,
            timestamp: Date.now()
          });
        });
        
        req.on('timeout', () => {
          console.error(`延迟测试超时: ${node.name}`);
          req.destroy();
          resolve({
            success: false,
            error: 'Request timeout',
            latency: 0,
            timestamp: Date.now()
          });
        });
        
        req.end();
      });
      
    } catch (error) {
      console.error(`延迟测试失败: ${node.name}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: 0,
        timestamp: Date.now()
      };
    }
  }



  /**
   * 更新网络设置
   */
  public updateNetworkSettings(settings: NetworkSettings): void {
    this.currentNetworkSettings = settings;
    console.log('网络设置已更新:', settings);
  }

  /**
   * 测试代理连接
   */
  private async testProxyConnection(port: number): Promise<void> {
    console.log(`=== 开始代理连接测试 ===`);
    console.log(`测试端口: ${port}`);
    
    try {
      // 测试代理服务器连接
      const net = require('net');
      
      // 从配置中获取代理服务器信息
      const configFiles = require('fs').readdirSync(this.configDir);
      const latestConfig = configFiles
        .filter((file: string) => file.startsWith('singbox_') && file.endsWith('.json'))
        .sort()
        .pop();
      
      if (latestConfig) {
        const configPath = require('path').join(this.configDir, latestConfig);
        const config = JSON.parse(require('fs').readFileSync(configPath, 'utf8'));
        const proxyOutbound = config.outbounds?.find((outbound: any) => outbound.type !== 'direct' && outbound.type !== 'dns');
        
        if (proxyOutbound) {
          console.log(`测试代理服务器连接: ${proxyOutbound.server}:${proxyOutbound.server_port}`);
          
          // 测试TCP连接到代理服务器
          const testConnection = () => {
            return new Promise<boolean>((resolve) => {
              const socket = net.createConnection({
                host: proxyOutbound.server,
                port: proxyOutbound.server_port,
                timeout: 5000
              });
              
              socket.on('connect', () => {
                console.log(`✅ 代理服务器连接成功: ${proxyOutbound.server}:${proxyOutbound.server_port}`);
                socket.destroy();
                resolve(true);
              });
              
              socket.on('error', (error: any) => {
                console.error(`❌ 代理服务器连接失败: ${proxyOutbound.server}:${proxyOutbound.server_port}`);
                console.error(`错误详情: ${error.message}`);
                resolve(false);
              });
              
              socket.on('timeout', () => {
                console.error(`⏰ 代理服务器连接超时: ${proxyOutbound.server}:${proxyOutbound.server_port}`);
                socket.destroy();
                resolve(false);
              });
            });
          };
          
          const isConnected = await testConnection();
          if (!isConnected) {
            console.warn(`⚠️  代理服务器可能不可用，这可能是导致无法联网的原因`);
          }
        }
      }
      
      console.log(`代理连接测试完成`);
      
    } catch (error) {
      console.error(`代理连接测试失败:`, error);
      // 不抛出错误，因为端口验证已经成功
    }
  }

  /**
   * 检查端口是否可用
   */
  private checkPortReady(host: string, port: number, timeout: number = 5000): Promise<boolean> {
    console.log(`=== 开始端口可用性检查 ===`);
    console.log(`目标主机: ${host}`);
    console.log(`目标端口: ${port}`);
    console.log(`超时时间: ${timeout}ms`);
    
    return new Promise((resolve) => {
      console.log(`创建到 ${host}:${port} 的连接...`);
      const socket = createConnection({ host, port });
      
      const timer = setTimeout(() => {
        console.log(`端口检查超时，端口 ${port} 不可用`);
        socket.destroy();
        resolve(false);
      }, timeout);
      
      socket.on('connect', () => {
        console.log(`=== 端口检查成功 ===`);
        console.log(`成功连接到 ${host}:${port}`);
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      });
      
      socket.on('error', (error) => {
        console.log(`=== 端口检查失败 ===`);
        console.log(`连接错误: ${error.message}`);
        console.log(`错误代码: ${(error as any).code || 'unknown'}`);
        clearTimeout(timer);
        socket.destroy();
        resolve(false);
      });
    });
  }

  /**
   * 重启所有代理进程
   */
  public async restartAllProcesses(): Promise<void> {
    console.log('开始重启所有代理进程...');
    
    const processesToRestart = Array.from(this.processes.values());
    
    if (processesToRestart.length === 0) {
      console.log('没有正在运行的代理进程，无需重启');
      return;
    }
    
    // 停止所有进程
    for (const process of processesToRestart) {
      try {
        await this.stopProcess(process.id);
      } catch (error) {
        console.error(`停止进程 ${process.id} 失败:`, error);
      }
    }
    
    // 等待一段时间确保进程完全停止
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 重新启动所有进程
    for (const process of processesToRestart) {
      try {
        switch (process.type) {
          case 'singbox':
            await this.startSingbox(process.config, this.currentNetworkSettings);
            break;
          case 'xray':
            await this.startXray(process.config, this.currentNetworkSettings);
            break;
          case 'clash':
            await this.startClash(process.config, this.currentNetworkSettings);
            break;
        }
      } catch (error) {
        console.error(`重启 ${process.type} 进程失败:`, error);
      }
    }
    
    console.log('所有代理进程重启完成');
  }

  /**
   * 停止指定进程
   */
  private async stopProcess(processId: string): Promise<void> {
    const process = this.processes.get(processId);
    if (process) {
      try {
        process.process.kill();
        this.processes.delete(processId);
        console.log(`进程 ${processId} 已停止`);
      } catch (error) {
        console.error(`停止进程 ${processId} 失败:`, error);
      }
    }
  }

  /**
   * 启动Sing-box引擎
   */
  public async startSingbox(config: any, networkSettings?: NetworkSettings): Promise<void> {
    const processId = `singbox_${Date.now()}`;
    const configPath = join(this.configDir, `${processId}.json`);
    
    console.log(`=== 开始启动 Sing-box 进程 ===`);
    console.log(`进程ID: ${processId}`);
    console.log(`配置文件路径: ${configPath}`);
    console.log(`原始配置:`, JSON.stringify(config, null, 2));
    console.log(`网络设置:`, networkSettings);
    
    // 在启动新进程前，先清理所有现有的 sing-box 进程
    console.log(`清理现有进程...`);
    await this.cleanupExistingProcesses('singbox');
    
    // 应用网络设置到配置
    console.log(`应用网络设置到配置...`);
    const finalConfig = this.applyNetworkSettingsToConfig(config, networkSettings);
    console.log(`最终配置文件内容:`, JSON.stringify(finalConfig, null, 2));
    
    // 写入配置文件
    console.log(`写入配置文件到: ${configPath}`);
    writeFileSync(configPath, JSON.stringify(finalConfig, null, 2));
    
    // 获取Sing-box可执行文件路径
    const singboxPath = await this.getSingboxPath();
    console.log(`Sing-box 可执行文件路径: ${singboxPath}`);
    
    return new Promise<void>((resolve, reject) => {
      console.log(`=== 启动 Sing-box 子进程 ===`);
      console.log(`可执行文件: ${singboxPath}`);
      console.log(`配置文件: ${configPath}`);
      console.log(`工作目录: ${this.binDir}`);
      console.log(`启动参数: ['run', '-c', '${configPath}']`);
      
      // 启动进程，设置工作目录为 bin 目录，这样 Sing-box 能找到数据库文件
      const childProcess = spawn(singboxPath, ['run', '-c', configPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
        cwd: this.binDir  // 设置工作目录为 bin 目录
      });
      
      console.log(`子进程已启动，PID: ${childProcess.pid}`);

      // 监听进程事件
      childProcess.on('error', (error) => {
        console.error(`=== Sing-box 进程错误 ===`);
        console.error(`错误详情:`, error);
        console.error(`错误消息: ${error.message}`);
        console.error(`错误堆栈: ${error.stack}`);
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      });

      childProcess.on('exit', (code, signal) => {
        console.log(`=== Sing-box 进程退出 ===`);
        console.log(`退出代码: ${code}`);
        console.log(`退出信号: ${signal}`);
        console.log(`进程ID: ${processId}`);
        this.processes.delete(processId);
        if (code !== 0 && !resolved) {
          resolved = true;
          reject(new Error(`Sing-box process failed with exit code: ${code}`));
        }
      });

      // 监听标准输出
      childProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`=== Sing-box 标准输出 ===`);
        console.log(`输出内容: ${output}`);
      });

      // 监听标准错误
      childProcess.stderr.on('data', (data) => {
        const errorMessage = data.toString();
        console.error(`=== Sing-box 标准错误 ===`);
        console.error(`错误内容: ${errorMessage}`);
        
        // 检测端口占用错误
        if (errorMessage.includes('bind: address already in use')) {
          console.log('检测到端口占用错误，进行详细诊断...');
          
          // 立即发送端口占用通知，不等待异步检查
          const port = finalConfig.inbounds?.[0]?.listen_port || 1080;
          console.log('立即发送端口占用通知，端口:', port);
          this.sendPortInUseNotification(port, processId);
          
          // 终止子进程
          childProcess.kill();
          
          // 延迟一点时间再 reject，确保通知能够发送
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              reject(new Error(`Sing-box 启动失败: 端口 ${port} 已被占用`));
            }
          }, 500);
          return;
        }
        
        // 检测其他常见错误
        if (errorMessage.includes('decode config')) {
          console.error('Sing-box 配置解析错误，请检查配置文件格式');
          console.log('当前配置:', JSON.stringify(finalConfig, null, 2));
          childProcess.kill();
          if (!resolved) {
            resolved = true;
            reject(new Error(`Sing-box 配置错误: ${errorMessage}`));
          }
          return;
        }
        
        if (errorMessage.includes('FATAL')) {
          console.error('Sing-box 致命错误:', errorMessage);
          childProcess.kill();
          if (!resolved) {
            resolved = true;
            reject(new Error(`Sing-box 致命错误: ${errorMessage}`));
          }
          return;
        }
      });

      // 存储进程信息
      this.processes.set(processId, {
        id: processId,
        type: 'singbox',
        process: childProcess,
        config: finalConfig,
        port: finalConfig.inbounds?.[0]?.listen_port || 1080,
        networkSettings
      });

      console.log(`Started Sing-box process: ${processId}`);
      
      // 验证端口是否可用
      let resolved = false;
      const port = finalConfig.inbounds?.[0]?.listen_port || 1080;
      console.log(`=== 准备验证端口 ===`);
      console.log(`验证端口: ${port}`);
      console.log(`等待时间: 2秒`);
      
      // 等待更长时间让进程完全启动，然后验证端口
      setTimeout(async () => {
        console.log(`=== 开始端口验证 ===`);
        console.log(`当前时间: ${new Date().toISOString()}`);
        console.log(`进程状态: ${childProcess.killed ? '已终止' : '运行中'}`);
        console.log(`进程PID: ${childProcess.pid}`);
        
        if (!resolved) {
          try {
            console.log(`开始检查端口 ${port} 是否可用...`);
            // 验证SOCKS端口是否可用
            const isPortReady = await this.checkPortReady('127.0.0.1', port, 5000);
            console.log(`端口检查结果: ${isPortReady ? '成功' : '失败'}`);
            
            if (isPortReady) {
              console.log(`=== Sing-box 启动成功 ===`);
              console.log(`端口 ${port} 验证成功`);
              console.log(`进程ID: ${processId}`);
              
              // 测试代理连接
              await this.testProxyConnection(port);
              
              resolved = true;
              resolve();
            } else {
              console.error(`=== Sing-box 启动失败 ===`);
              console.error(`端口 ${port} 验证失败`);
              console.error(`终止进程 PID: ${childProcess.pid}`);
              childProcess.kill();
              resolved = true;
              reject(new Error(`Sing-box 启动失败: 端口 ${port} 不可用`));
            }
          } catch (error) {
            console.error(`=== Sing-box 端口验证异常 ===`);
            console.error(`异常详情:`, error);
            console.error(`异常消息: ${error instanceof Error ? error.message : 'Unknown error'}`);
            console.error(`终止进程 PID: ${childProcess.pid}`);
            childProcess.kill();
            resolved = true;
            reject(new Error(`Sing-box 启动失败: 端口验证异常`));
          }
        } else {
          console.log(`端口验证已跳过，进程状态已确定`);
        }
      }, 2000); // 等待2秒让进程完全启动
    });
  }

  /**
   * 启动Xray引擎
   */
  public async startXray(config: any, networkSettings?: NetworkSettings): Promise<void> {
    const processId = `xray_${Date.now()}`;
    const configPath = join(this.configDir, `${processId}.json`);
    
    console.log(`准备启动 Xray 进程: ${processId}`);
    console.log(`配置文件路径: ${configPath}`);
    console.log(`网络设置:`, networkSettings);
    
    // 应用网络设置到配置
    const finalConfig = this.applyNetworkSettingsToConfig(config, networkSettings);
    console.log(`最终配置文件内容:`, JSON.stringify(finalConfig, null, 2));
    
    // 写入配置文件
    writeFileSync(configPath, JSON.stringify(finalConfig, null, 2));
    
    // 获取Xray可执行文件路径
    const xrayPath = await this.getXrayPath();
    console.log(`Xray 可执行文件路径: ${xrayPath}`);
    
    return new Promise<void>((resolve, reject) => {
      // 启动进程
      const childProcess = spawn(xrayPath, ['run', '-c', configPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      // 监听进程事件
      childProcess.on('error', (error) => {
        console.error('Xray process error:', error);
        reject(error);
      });

      childProcess.on('exit', (code, signal) => {
        console.log(`Xray process exited with code ${code} and signal ${signal}`);
        this.processes.delete(processId);
        if (code !== 0) {
          reject(new Error(`Xray process failed with exit code: ${code}`));
        }
      });

      // 监听标准输出
      childProcess.stdout.on('data', (data) => {
        console.log(`Xray stdout: ${data.toString()}`);
      });

      // 监听标准错误
      childProcess.stderr.on('data', (data) => {
        const errorMessage = data.toString();
        console.error(`Xray stderr: ${errorMessage}`);
        
        // 检测端口占用错误
        if (errorMessage.includes('bind: address already in use')) {
          console.log('检测到端口占用，发送端口占用通知');
          // 通过 IPC 发送端口占用通知到渲染进程
          const { BrowserWindow } = require('electron');
          const windows = BrowserWindow.getAllWindows();
          console.log(`找到 ${windows.length} 个窗口`);
          if (windows.length > 0) {
            const port = finalConfig.inbounds?.[0]?.port || 1080;
            const notificationData = {
              port: port,
              processId: processId
            };
            console.log('发送端口占用通知:', notificationData);
            windows[0].webContents.send('proxy:portInUse', notificationData);
            console.log('端口占用通知已发送');
          } else {
            console.log('没有找到窗口，无法发送通知');
          }
          
          // 终止子进程
          childProcess.kill();
          
          // 使用 reject 而不是 throw，避免未捕获的异常
          reject(new Error(`端口 ${finalConfig.inbounds?.[0]?.port || 1080} 已被占用，无法启动代理服务`));
          return;
        }
      });

      // 存储进程信息
      this.processes.set(processId, {
        id: processId,
        type: 'xray',
        process: childProcess,
        config: finalConfig,
        port: finalConfig.inbounds?.[0]?.port || 1080,
        networkSettings
      });

      console.log(`Started Xray process: ${processId}`);
      
      // 如果进程启动成功，延迟一点时间再 resolve，确保没有立即错误
      setTimeout(() => {
        resolve();
      }, 100);
    });
  }

  /**
   * 启动Clash引擎
   */
  public async startClash(config: any, networkSettings?: NetworkSettings): Promise<void> {
    const processId = `clash_${Date.now()}`;
    const configPath = join(this.configDir, `${processId}.yaml`);
    
    console.log(`准备启动 Clash 进程: ${processId}`);
    console.log(`配置文件路径: ${configPath}`);
    console.log(`网络设置:`, networkSettings);
    
    // 应用网络设置到配置
    const finalConfig = this.applyNetworkSettingsToConfig(config, networkSettings);
    console.log(`最终配置文件内容:`, JSON.stringify(finalConfig, null, 2));
    
    // 写入配置文件
    writeFileSync(configPath, this.convertClashConfigToYaml(finalConfig));
    
    // 获取Clash可执行文件路径
    const clashPath = await this.getClashPath();
    
    return new Promise<void>((resolve, reject) => {
      // 启动进程
      const childProcess = spawn(clashPath, ['-d', this.configDir, '-f', configPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      // 监听进程事件
      childProcess.on('error', (error) => {
        console.error('Clash process error:', error);
        reject(error);
      });

      childProcess.on('exit', (code, signal) => {
        console.log(`Clash process exited with code ${code} and signal ${signal}`);
        this.processes.delete(processId);
        if (code !== 0) {
          reject(new Error(`Clash process failed with exit code: ${code}`));
        }
      });

      // 监听标准输出
      childProcess.stdout.on('data', (data) => {
        console.log(`Clash stdout: ${data.toString()}`);
      });

      // 监听标准错误
      childProcess.stderr.on('data', (data) => {
        const errorMessage = data.toString();
        console.error(`Clash stderr: ${errorMessage}`);
        
        // 检测端口占用错误
        if (errorMessage.includes('bind: address already in use')) {
          console.log('检测到端口占用，发送端口占用通知');
          // 通过 IPC 发送端口占用通知到渲染进程
          const { BrowserWindow } = require('electron');
          const windows = BrowserWindow.getAllWindows();
          console.log(`找到 ${windows.length} 个窗口`);
          if (windows.length > 0) {
            const port = finalConfig.port || 7890;
            const notificationData = {
              port: port,
              processId: processId
            };
            console.log('发送端口占用通知:', notificationData);
            windows[0].webContents.send('proxy:portInUse', notificationData);
            console.log('端口占用通知已发送');
          } else {
            console.log('没有找到窗口，无法发送通知');
          }
          
          // 终止子进程
          childProcess.kill();
          
          // 使用 reject 而不是 throw，避免未捕获的异常
          reject(new Error(`端口 ${finalConfig.port || 7890} 已被占用，无法启动代理服务`));
          return;
        }
      });

      // 存储进程信息
      this.processes.set(processId, {
        id: processId,
        type: 'clash',
        process: childProcess,
        config: finalConfig,
        port: finalConfig.port || 7890,
        networkSettings
      });

      console.log(`Started Clash process: ${processId}`);
      
      // 如果进程启动成功，延迟一点时间再 resolve，确保没有立即错误
      setTimeout(() => {
        resolve();
      }, 100);
    });
  }

  /**
   * 停止所有代理进程
   */
  public async stopAll(): Promise<void> {
    for (const [id, proxyProcess] of this.processes) {
      try {
        proxyProcess.process.kill('SIGTERM');
        console.log(`Stopped ${proxyProcess.type} process: ${id}`);
      } catch (error) {
        console.error(`Failed to stop ${proxyProcess.type} process: ${id}`, error);
      }
    }
    this.processes.clear();
  }

  /**
   * 获取代理统计信息
   */
  public async getStats(): Promise<any> {
    try {
      // 获取所有运行中的进程统计
      let totalUpload = 0;
      let totalDownload = 0;
      let activeConnections = 0;
      let uploadSpeed = 0;
      let downloadSpeed = 0;
      let connections = []; // 用于存储连接历史

      // 遍历所有活跃进程
      for (const [processId, processInfo] of this.processes.entries()) {
        try {
          // 对于Sing-box，尝试通过API获取统计信息
          if (processInfo.type === 'singbox') {
            // Sing-box通常在9090端口提供API
            const stats = await this.getSingboxStats();
            if (stats && stats.connections) {
              // 累加流量和速度
              totalUpload += stats.uploadTotal || 0;
              totalDownload += stats.downloadTotal || 0;
              uploadSpeed += stats.uploadSpeed || 0;
              downloadSpeed += stats.downloadSpeed || 0;
              activeConnections = stats.connections.length; // 连接数是数组长度
              connections = stats.connections; // 获取详细连接历史
            }
          }
        } catch (error) {
          console.warn(`获取进程 ${processId} 统计失败:`, error);
        }
      }

      return {
        totalUpload,
        totalDownload,
        uploadSpeed,
        downloadSpeed,
        activeConnections,
        connections, // 返回连接历史
        totalConnections: this.processes.size
      };
    } catch (error) {
      console.error('获取统计数据失败:', error);
      return {
        totalUpload: 0,
        totalDownload: 0,
        uploadSpeed: 0,
        downloadSpeed: 0,
        activeConnections: 0,
        connections: [], // 确保错误时也返回空数组
        totalConnections: 0
      };
    }
  }

  /**
   * 获取Sing-box统计信息
   */
  private async getSingboxStats(): Promise<any> {
    try {
      // 尝试通过HTTP API获取Sing-box统计信息
      const http = require('http');
      
      const fetchApi = (path: string): Promise<any> => new Promise((resolve) => {
        // 确保不受代理环境变量影响
        const originalProxy = process.env['http_proxy'];
        const originalHttpsProxy = process.env['https_proxy'];
        const originalAllProxy = process.env['all_proxy'];
        
        // 临时清除代理环境变量
        delete process.env['http_proxy'];
        delete process.env['https_proxy'];
        delete process.env['all_proxy'];
        
        const req = http.request({
          hostname: '127.0.0.1',
          port: 9090, // Sing-box Clash API 端口
          path: path,
          method: 'GET',
          timeout: 1000,
          // 确保直接连接，不使用代理
          agent: false
        }, (res: any) => {
          let data = '';
          res.on('data', (chunk: any) => (data += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              resolve(null);
            }
            // 恢复代理环境变量
            if (originalProxy) process.env['http_proxy'] = originalProxy;
            if (originalHttpsProxy) process.env['https_proxy'] = originalHttpsProxy;
            if (originalAllProxy) process.env['all_proxy'] = originalAllProxy;
          });
        });
        
        req.on('error', (error: any) => {
          console.log('Sing-box API请求失败:', error.message);
          resolve(null);
          // 恢复代理环境变量
          if (originalProxy) process.env['http_proxy'] = originalProxy;
          if (originalHttpsProxy) process.env['https_proxy'] = originalHttpsProxy;
          if (originalAllProxy) process.env['all_proxy'] = originalAllProxy;
        });
        
        req.on('timeout', () => {
          console.log('Sing-box API请求超时');
          req.destroy();
          resolve(null);
          // 恢复代理环境变量
          if (originalProxy) process.env['http_proxy'] = originalProxy;
          if (originalHttpsProxy) process.env['https_proxy'] = originalHttpsProxy;
          if (originalAllProxy) process.env['all_proxy'] = originalAllProxy;
        });
        
        req.end();
      });
      
      // 获取连接信息
      const connectionsData = await fetchApi('/connections');
      console.log('Sing-box API响应:', { connectionsData });

      if (!connectionsData) {
        console.log('Sing-box连接数据为空');
        return null;
      }
      
      // 从连接数据中计算总流量
      let totalUpload = 0;
      let totalDownload = 0;
      
      if (connectionsData.connections && Array.isArray(connectionsData.connections)) {
        connectionsData.connections.forEach((conn: any) => {
          totalUpload += conn.upload || 0;
          totalDownload += conn.download || 0;
        });
      }
      
      console.log('计算的流量统计:', { totalUpload, totalDownload });
      
      return {
        uploadTotal: totalUpload,
        downloadTotal: totalDownload,
        connections: connectionsData.connections || []
      };
    } catch (error) {
      console.error('获取Sing-box统计信息失败:', error);
      return null;
    }
  }

  /**
   * 获取Sing-box可执行文件路径
   */
  private async getSingboxPath(): Promise<string> {
    if (!coreDownloader.isCoreInstalled('singbox')) {
      throw new Error('Sing-box 核心未安装，请先下载安装');
    }
    return coreDownloader.getCorePath('singbox');
  }

  /**
   * 获取Xray可执行文件路径
   */
  private async getXrayPath(): Promise<string> {
    if (!coreDownloader.isCoreInstalled('xray')) {
      throw new Error('Xray 核心未安装，请先下载安装');
    }
    return coreDownloader.getCorePath('xray');
  }

  /**
   * 获取Clash可执行文件路径
   */
  private async getClashPath(): Promise<string> {
    if (!coreDownloader.isCoreInstalled('clash')) {
      throw new Error('Clash 核心未安装，请先下载安装');
    }
    return coreDownloader.getCorePath('clash');
  }

  /**
   * 转换Clash配置为YAML格式
   */
  private convertClashConfigToYaml(config: any): string {
    // 简化的YAML转换
    let yaml = `port: ${config.port}\n`;
    yaml += `socks-port: ${config['socks-port']}\n`;
    yaml += `mixed-port: ${config['mixed-port']}\n`;
    yaml += `allow-lan: ${config['allow-lan']}\n`;
    yaml += `mode: ${config.mode}\n`;
    yaml += `log-level: ${config['log-level']}\n`;
    yaml += `external-controller: ${config['external-controller']}\n\n`;
    
    yaml += `proxies:\n`;
    if (config.proxies) {
      for (const proxy of config.proxies) {
        yaml += `  - name: ${proxy.name}\n`;
        yaml += `    type: ${proxy.type}\n`;
        yaml += `    server: ${proxy.server}\n`;
        yaml += `    port: ${proxy.port}\n`;
        if (proxy.uuid) yaml += `    uuid: ${proxy.uuid}\n`;
        if (proxy.password) yaml += `    password: ${proxy.password}\n`;
        yaml += `\n`;
      }
    }
    
    yaml += `proxy-groups:\n`;
    if (config['proxy-groups']) {
      for (const group of config['proxy-groups']) {
        yaml += `  - name: ${group.name}\n`;
        yaml += `    type: ${group.type}\n`;
        yaml += `    proxies:\n`;
        for (const proxy of group.proxies) {
          yaml += `      - ${proxy}\n`;
        }
        yaml += `\n`;
      }
    }
    
    yaml += `rules:\n`;
    if (config.rules) {
      for (const rule of config.rules) {
        yaml += `  - ${rule}\n`;
      }
    }
    
    return yaml;
  }

  /**
   * 应用网络设置到配置
   */
  private applyNetworkSettingsToConfig(config: any, networkSettings?: Partial<NetworkSettings>): any {
    if (!networkSettings) {
      return config;
    }

    const finalConfig = { ...config };

    // 应用日志设置
    if (finalConfig.log) {
      finalConfig.log.level = networkSettings.logLevel || 'info';
      if (networkSettings.enableLog) {
        finalConfig.log.output = networkSettings.logFile || 'chongdong.log';
      } else {
        finalConfig.log.output = 'console';
      }
    }

    // 应用DNS设置
    if (networkSettings.enableDns && finalConfig.dns) {
      const dnsServers: string[] = [];
      
      // 添加主DNS服务器
      if (networkSettings.dnsServer) {
        dnsServers.push(networkSettings.dnsServer);
      }
      
      // 添加DoH服务器
      if (networkSettings.enableDoh && networkSettings.dohServer) {
        dnsServers.push(networkSettings.dohServer);
      }
      
      // 添加DoT服务器
      if (networkSettings.enableDot && networkSettings.dotServer) {
        dnsServers.push(networkSettings.dotServer);
      }
      
      // 添加多DNS服务器负载均衡
      if (networkSettings.enableDnsLoadBalance && networkSettings.dnsServers) {
        networkSettings.dnsServers.forEach((server: string) => {
          if (server && server !== networkSettings.dnsServer && !dnsServers.includes(server)) {
            dnsServers.push(server);
          }
        });
      }
      
      finalConfig.dns.servers = dnsServers.length > 0 ? dnsServers : ['8.8.8.8'];
      
      // DNS缓存配置已分离到独立的DNS管理器中
      // 不再在代理引擎中处理DNS缓存
      
      // 添加DNS故障转移服务器
      if (networkSettings.enableDnsFallback && networkSettings.dnsFallbackServers) {
        finalConfig.dns.fallback = networkSettings.dnsFallbackServers;
      }
    }

    // 应用TUN设置
    if (finalConfig.inbounds) {
      const tunInbound = finalConfig.inbounds.find((inbound: any) => inbound.type === 'tun');
      if (tunInbound) {
        if (networkSettings.enableTun) {
          tunInbound.disabled = false;
          tunInbound.interface_name = networkSettings.tunDevice || 'utun0';
          if (networkSettings.enableFakeIp) {
            tunInbound.inet4_address = [networkSettings.fakeIpRange || '198.18.0.1/16'];
          }
          if (networkSettings.enableIpv6) {
            tunInbound.inet6_address = ['fdfe:dcba:9876::1/126'];
          }
        } else {
          tunInbound.disabled = true;
        }
      }
    }

    return finalConfig;
  }

  /**
   * 清理指定类型的所有现有进程
   */
  private async cleanupExistingProcesses(type: 'singbox' | 'xray' | 'clash'): Promise<void> {
    const existingProcesses = Array.from(this.processes.values()).filter(p => p.type === type);
    for (const process of existingProcesses) {
      try {
        process.process.kill('SIGTERM');
        console.log(`清理旧 ${type} 进程: ${process.id}`);
      } catch (error) {
        console.error(`清理旧 ${type} 进程失败: ${process.id}`, error);
      }
    }
    
    // 逐个删除进程，而不是传递数组
    for (const process of existingProcesses) {
      this.processes.delete(process.id);
    }
    
    // 等待一段时间确保进程完全退出
    if (existingProcesses.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * 发送端口占用通知
   */
  private sendPortInUseNotification(port: number, processId: string): void {
    const { BrowserWindow } = require('electron');
    const windows = BrowserWindow.getAllWindows();
    console.log(`找到 ${windows.length} 个窗口`);
    if (windows.length > 0) {
      const notificationData = {
        port: port,
        processId: processId
      };
      console.log('发送端口占用通知:', notificationData);
      windows[0].webContents.send('proxy:portInUse', notificationData);
      console.log('端口占用通知已发送');
    } else {
      console.log('没有找到窗口，无法发送通知');
    }
  }

  /**
   * 启动代理链
   */
  public async startChain(chainConfig: ChainConfig, networkSettings?: Partial<NetworkSettings>, nodes?: ProxyNode[]): Promise<{ port: number }> {
    console.log(`[ProxyManager] Starting proxy chain: ${chainConfig.name}`);
    
    try {
      let finalNodes: ProxyNode[] = [];
      
      // 如果直接传入了节点数组，使用它；否则从订阅中获取节点
      if (nodes && nodes.length > 0) {
        finalNodes = nodes;
        console.log(`[ProxyManager] Using ${finalNodes.length} provided nodes for chain`);
      } else {
        // 从订阅中获取节点
        console.log(`[ProxyManager] Getting nodes from subscriptions: ${chainConfig.proxies.join(', ')}`);
        finalNodes = await this.getNodesFromSubscriptions(chainConfig.proxies);
        console.log(`[ProxyManager] Found ${finalNodes.length} nodes from ${chainConfig.proxies.length} subscriptions`);
      }
      
      if (finalNodes.length === 0) {
        throw new Error('No valid nodes found for proxy chain');
      }
      
      console.log(`[ProxyManager] Found ${finalNodes.length} nodes for chain:`, finalNodes.map(n => n.name));
      
      // 生成代理链配置，并传入用户指定的端口
      const listenPort = networkSettings?.listenPort;
      if (!listenPort) {
        throw new Error('Listen port must be provided to start a chain.');
      }
      const chainProxyConfig = proxyChainConfigGenerator.generateChainConfig(finalNodes, listenPort);
      
      // 应用网络设置
      const finalConfig = this.applyNetworkSettingsToConfig(chainProxyConfig, networkSettings);
      
      // 启动代理链
      await this.startSingbox(finalConfig, networkSettings);
      
      console.log(`[ProxyManager] Proxy chain started successfully: ${chainConfig.name}`);
      
      return { port: listenPort };
      
    } catch (error) {
      console.error(`[ProxyManager] Failed to start chain ${chainConfig.name}:`, error);
      throw error;
    }
  }

  /**
   * 从订阅中获取节点
   */
  private async getNodesFromSubscriptions(subscriptionIds: string[]): Promise<ProxyNode[]> {
    const allNodes: ProxyNode[] = [];
    
    for (const subId of subscriptionIds) {
      const subscription = settingsManager.getSettings().subscriptions?.find(s => s.id === subId);
      if (subscription && subscription.servers) {
        const subscriptionNodes: ProxyNode[] = subscription.servers.map(server => {
          const node: ProxyNode = {
            id: server.id,
            name: server.name,
            type: server.protocol,
            server: server.host,
            port: server.port,
            subscriptionId: subId,
          };
          
          // 只添加存在的可选属性
          if (server.uuid) node.uuid = server.uuid;
          if (server.alterId) node.alterId = server.alterId;
          if (server.username) node.username = server.username;
          if (server.password) node.password = server.password;
          if (server.encryption) node.encryption = server.encryption;
          if (server.network) node.network = server.network;
          if (server.wsPath) node.wsPath = server.wsPath;
          if (server.host) node.wsHost = server.host;
          
          return node;
        });
        allNodes.push(...subscriptionNodes);
      }
    }
    
    return allNodes;
  }
}

export const proxyManager = ProxyManager.getInstance();
