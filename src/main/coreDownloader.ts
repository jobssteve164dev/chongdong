import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, chmodSync } from 'fs';
import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { get } from 'https';

interface CoreInfo {
  name: string;
  version: string;
  platform: string;
  arch: string;
  downloadUrl: string;
  checksum?: string;
  fileName: string;
}

export class CoreDownloader {
  private static instance: CoreDownloader;
  private binDir: string;
  private coresDir: string;

  private constructor() {
    this.binDir = join(app.getPath('userData'), 'bin');
    this.coresDir = join(app.getPath('userData'), 'cores');
    
    // 确保目录存在
    if (!existsSync(this.binDir)) {
      mkdirSync(this.binDir, { recursive: true });
    }
    if (!existsSync(this.coresDir)) {
      mkdirSync(this.coresDir, { recursive: true });
    }
  }

  public static getInstance(): CoreDownloader {
    if (!CoreDownloader.instance) {
      CoreDownloader.instance = new CoreDownloader();
    }
    return CoreDownloader.instance;
  }

  /**
   * 获取当前平台信息
   */
  private getPlatformInfo(): { platform: string; arch: string } {
    const platform = process.platform;
    const arch = process.arch;
    
    let platformStr = '';
    let archStr = '';
    
    switch (platform) {
      case 'win32':
        platformStr = 'windows';
        break;
      case 'darwin':
        platformStr = 'darwin';
        break;
      case 'linux':
        platformStr = 'linux';
        break;
      default:
        platformStr = 'linux';
    }
    
    switch (arch) {
      case 'x64':
        archStr = 'amd64';
        break;
      case 'arm64':
        archStr = 'arm64';
        break;
      case 'ia32':
        archStr = '386';
        break;
      default:
        archStr = 'amd64';
    }
    
    return { platform: platformStr, arch: archStr };
  }

  /**
   * 获取核心信息
   */
  private getCoreInfo(coreName: string): CoreInfo {
    const { platform, arch } = this.getPlatformInfo();
    
    switch (coreName) {
      case 'singbox':
        return {
          name: 'sing-box',
          version: '1.8.0',
          platform,
          arch,
          fileName: platform === 'win32' ? 'sing-box.exe' : 'sing-box',
          downloadUrl: `https://github.com/SagerNet/sing-box/releases/download/v1.8.0/sing-box-1.8.0-${platform}-${arch}.tar.gz`
        };
      
      case 'xray':
        return {
          name: 'Xray',
          version: '1.8.4',
          platform,
          arch,
          fileName: platform === 'win32' ? 'xray.exe' : 'xray',
          downloadUrl: `https://github.com/XTLS/Xray-core/releases/download/v1.8.4/Xray-${platform}-${arch}.zip`
        };
      
      case 'clash':
        return {
          name: 'clash',
          version: '1.18.0',
          platform,
          arch,
          fileName: platform === 'win32' ? 'clash.exe' : 'clash',
          downloadUrl: `https://github.com/Dreamacro/clash/releases/download/v1.18.0/clash-${platform}-${arch}-v1.18.0.gz`
        };
      
      default:
        throw new Error(`不支持的核心: ${coreName}`);
    }
  }

  /**
   * 检查核心是否已安装
   */
  public isCoreInstalled(coreName: string): boolean {
    const coreInfo = this.getCoreInfo(coreName);
    const corePath = join(this.binDir, coreInfo.fileName);
    return existsSync(corePath);
  }

  /**
   * 获取核心路径
   */
  public getCorePath(coreName: string): string {
    const coreInfo = this.getCoreInfo(coreName);
    return join(this.binDir, coreInfo.fileName);
  }

  /**
   * 下载文件
   */
  private async downloadFile(url: string, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let redirectCount = 0;
      const maxRedirects = 5;
      
      const makeRequest = (requestUrl: string) => {
        if (redirectCount > maxRedirects) {
          reject(new Error('重定向次数过多'));
          return;
        }
        
        const fileStream = createWriteStream(filePath);
        
        get(requestUrl, (response) => {
          // 处理重定向
          if (response.statusCode === 301 || response.statusCode === 302) {
            const location = response.headers.location;
            if (location) {
              console.log(`重定向到: ${location}`);
              redirectCount++;
              fileStream.close();
              makeRequest(location);
              return;
            }
          }
          
          if (response.statusCode !== 200) {
            fileStream.close();
            reject(new Error(`下载失败: HTTP ${response.statusCode}`));
            return;
          }
          
          response.pipe(fileStream);
          
          fileStream.on('finish', () => {
            fileStream.close();
            resolve();
          });
          
          fileStream.on('error', (error) => {
            fileStream.close();
            reject(error);
          });
        }).on('error', (error) => {
          reject(error);
        });
      };
      
      makeRequest(url);
    });
  }

  /**
   * 解压文件
   */
  private async extractFile(filePath: string, extractDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const isGzip = filePath.endsWith('.gz');
      const isZip = filePath.endsWith('.zip');
      const isTarGz = filePath.endsWith('.tar.gz');
      
      let command: string;
      let args: string[];
      
      if (isTarGz) {
        command = 'tar';
        args = ['-xzf', filePath, '-C', extractDir, '--strip-components=1'];
      } else if (isGzip) {
        command = 'gunzip';
        args = ['-f', filePath];
      } else if (isZip) {
        command = 'unzip';
        args = ['-o', filePath, '-d', extractDir];
      } else {
        resolve();
        return;
      }
      
      const child = spawn(command, args);
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`解压失败: ${command} exited with code ${code}`));
        }
      });
      
      child.on('error', (error) => {
        reject(new Error(`解压失败: ${error.message}`));
      });
    });
  }

  /**
   * 下载并安装核心
   */
  public async downloadCore(coreName: string): Promise<void> {
    try {
      const coreInfo = this.getCoreInfo(coreName);
      const downloadPath = join(this.coresDir, `${coreName}-${coreInfo.version}.${coreInfo.downloadUrl.split('.').pop()}`);
      const corePath = join(this.binDir, coreInfo.fileName);
      
      console.log(`开始下载 ${coreInfo.name} v${coreInfo.version}...`);
      
      // 下载文件
      await this.downloadFile(coreInfo.downloadUrl, downloadPath);
      
      console.log(`下载完成，开始解压...`);
      
      // 解压文件
      await this.extractFile(downloadPath, this.binDir);
      
      // 设置执行权限（Unix 系统）
      if (process.platform !== 'win32') {
        try {
          chmodSync(corePath, 0o755);
        } catch (error) {
          console.warn('设置执行权限失败:', error);
        }
      }
      
      console.log(`${coreInfo.name} 安装完成: ${corePath}`);
      
    } catch (error) {
      console.error(`下载 ${coreName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 获取所有核心的安装状态
   */
  public getCoresStatus(): { [key: string]: boolean } {
    return {
      singbox: this.isCoreInstalled('singbox'),
      xray: this.isCoreInstalled('xray'),
      clash: this.isCoreInstalled('clash')
    };
  }

  /**
   * 清理下载的临时文件
   */
  public async cleanup(): Promise<void> {
    // 可以在这里添加清理逻辑
    console.log('清理完成');
  }
}

export const coreDownloader = CoreDownloader.getInstance();
