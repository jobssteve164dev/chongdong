import { app } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { coreDownloader } from './coreDownloader';

interface ProxyProcess {
  id: string;
  type: 'singbox' | 'xray' | 'clash';
  process: ChildProcess;
  config: any;
  port: number;
}

export class ProxyManager {
  private static instance: ProxyManager;
  private processes: Map<string, ProxyProcess> = new Map();
  private configDir: string;
  private binDir: string;

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

  /**
   * 启动Sing-box引擎
   */
  public async startSingbox(config: any): Promise<void> {
    const processId = `singbox_${Date.now()}`;
    const configPath = join(this.configDir, `${processId}.json`);
    
    console.log(`准备启动 Sing-box 进程: ${processId}`);
    console.log(`配置文件路径: ${configPath}`);
    console.log(`配置文件内容:`, JSON.stringify(config, null, 2));
    
    // 写入配置文件
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    // 获取Sing-box可执行文件路径
    const singboxPath = await this.getSingboxPath();
    console.log(`Sing-box 可执行文件路径: ${singboxPath}`);
    
    // 启动进程，设置工作目录为 bin 目录，这样 Sing-box 能找到数据库文件
    const childProcess = spawn(singboxPath, ['run', '-c', configPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
      cwd: this.binDir  // 设置工作目录为 bin 目录
    });

    // 监听进程事件
    childProcess.on('error', (error) => {
      console.error('Sing-box process error:', error);
    });

    childProcess.on('exit', (code, signal) => {
      console.log(`Sing-box process exited with code ${code} and signal ${signal}`);
      this.processes.delete(processId);
    });

    // 监听标准输出和错误输出
    childProcess.stdout.on('data', (data) => {
      console.log(`Sing-box stdout: ${data.toString()}`);
    });

    childProcess.stderr.on('data', (data) => {
      const errorMessage = data.toString();
      console.error(`Sing-box stderr: ${errorMessage}`);
      
      // 检测端口占用错误
      if (errorMessage.includes('bind: address already in use')) {
        console.log('检测到端口占用，发送端口占用通知');
        // 通过 IPC 发送端口占用通知到渲染进程
        const { BrowserWindow } = require('electron');
        const windows = BrowserWindow.getAllWindows();
        console.log(`找到 ${windows.length} 个窗口`);
        if (windows.length > 0) {
          const port = config.inbounds?.[0]?.listen_port || 7890;
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
    });

    // 存储进程信息
    this.processes.set(processId, {
      id: processId,
      type: 'singbox',
      process: childProcess,
      config,
      port: config.inbounds?.[0]?.listen_port || 7890
    });

    console.log(`Started Sing-box process: ${processId}`);
  }

  /**
   * 启动Xray引擎
   */
  public async startXray(config: any): Promise<void> {
    const processId = `xray_${Date.now()}`;
    const configPath = join(this.configDir, `${processId}.json`);
    
    // 写入配置文件
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    // 获取Xray可执行文件路径
    const xrayPath = await this.getXrayPath();
    
    // 启动进程
    const childProcess = spawn(xrayPath, ['run', '-c', configPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    // 监听进程事件
    childProcess.on('error', (error) => {
      console.error('Xray process error:', error);
    });

    childProcess.on('exit', (code, signal) => {
      console.log(`Xray process exited with code ${code} and signal ${signal}`);
      this.processes.delete(processId);
    });

    // 存储进程信息
    this.processes.set(processId, {
      id: processId,
      type: 'xray',
      process: childProcess,
      config,
      port: config.inbounds?.[0]?.port || 1080
    });

    console.log(`Started Xray process: ${processId}`);
  }

  /**
   * 启动Clash引擎
   */
  public async startClash(config: any): Promise<void> {
    const processId = `clash_${Date.now()}`;
    const configPath = join(this.configDir, `${processId}.yaml`);
    
    // 写入配置文件
    writeFileSync(configPath, this.convertClashConfigToYaml(config));
    
    // 获取Clash可执行文件路径
    const clashPath = await this.getClashPath();
    
    // 启动进程
    const childProcess = spawn(clashPath, ['-d', this.configDir, '-f', configPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    // 监听进程事件
    childProcess.on('error', (error) => {
      console.error('Clash process error:', error);
    });

    childProcess.on('exit', (code, signal) => {
      console.log(`Clash process exited with code ${code} and signal ${signal}`);
      this.processes.delete(processId);
    });

    // 存储进程信息
    this.processes.set(processId, {
      id: processId,
      type: 'clash',
      process: childProcess,
      config,
      port: config.port || 7890
    });

    console.log(`Started Clash process: ${processId}`);
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
    // 这里应该实现实际的统计逻辑
    // 简化示例
    return {
      totalUpload: 0,
      totalDownload: 0,
      activeConnections: this.processes.size,
      totalConnections: this.processes.size
    };
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
}

export const proxyManager = ProxyManager.getInstance();
