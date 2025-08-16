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
      
      case 'geoip':
        return {
          name: 'GeoIP Database',
          version: 'latest',
          platform: 'all',
          arch: 'all',
          fileName: 'geoip.db',
          downloadUrl: 'https://github.com/SagerNet/sing-geoip/releases/latest/download/geoip.db'
        };
      
      case 'geosite':
        return {
          name: 'GeoSite Database',
          version: 'latest',
          platform: 'all',
          arch: 'all',
          fileName: 'geosite.db',
          downloadUrl: 'https://github.com/SagerNet/sing-geosite/releases/latest/download/geosite.db'
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
  private async extractFile(filePath: string, extractDir: string, targetFileName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const isGzip = filePath.endsWith('.gz');
      const isZip = filePath.endsWith('.zip');
      const isTarGz = filePath.endsWith('.tar.gz');
      
      console.log(`解压文件: ${filePath}`);
      console.log(`目标目录: ${extractDir}`);
      console.log(`目标文件名: ${targetFileName}`);
      console.log(`文件类型: gzip=${isGzip}, zip=${isZip}, tarGz=${isTarGz}`);
      
      let command: string;
      let args: string[];
      
      let tempDir: string;
      
      if (isTarGz) {
        // 对于 tar.gz 文件，先解压到临时目录
        tempDir = join(this.coresDir, 'temp');
        console.log(`创建临时目录: ${tempDir}`);
        if (!existsSync(tempDir)) {
          mkdirSync(tempDir, { recursive: true });
        }
        
        command = 'tar';
        args = ['-xzf', filePath, '-C', tempDir];
        console.log(`执行解压命令: ${command} ${args.join(' ')}`);
      } else if (isGzip) {
        command = 'gunzip';
        args = ['-f', filePath];
      } else if (isZip) {
        command = 'unzip';
        args = ['-o', filePath, '-d', extractDir];
      } else {
        console.log('不支持的文件格式，跳过解压');
        resolve();
        return;
      }
      
      const child = spawn(command, args);
      
      child.on('close', (code) => {
        console.log(`解压命令退出码: ${code}`);
        if (code === 0) {
          if (isTarGz) {
            console.log(`解压成功，开始查找可执行文件...`);
            // 查找并移动可执行文件
            this.findAndMoveExecutable(tempDir, extractDir, targetFileName)
              .then(() => {
                console.log('可执行文件移动完成');
                resolve();
              })
              .catch((error) => {
                console.error('可执行文件移动失败:', error);
                reject(error);
              });
          } else {
            console.log('解压完成');
            resolve();
          }
        } else {
          console.error(`解压失败: ${command} exited with code ${code}`);
          reject(new Error(`解压失败: ${command} exited with code ${code}`));
        }
      });
      
      child.on('error', (error) => {
        console.error(`解压命令执行失败:`, error);
        reject(new Error(`解压失败: ${error.message}`));
      });
    });
  }

  /**
   * 查找并移动可执行文件
   */
  private async findAndMoveExecutable(sourceDir: string, targetDir: string, targetFileName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const { readdirSync, renameSync, existsSync, mkdirSync } = require('fs');
      
      try {
        // 确保目标目录存在
        if (!existsSync(targetDir)) {
          mkdirSync(targetDir, { recursive: true });
        }
        
        console.log(`查找可执行文件: ${targetFileName}`);
        console.log(`源目录: ${sourceDir}`);
        console.log(`目标目录: ${targetDir}`);
        
        const files = readdirSync(sourceDir);
        console.log(`源目录内容:`, files);
        
        let executableFound = false;
        
        // 递归查找函数
        const findExecutable = (dir: string, depth: number = 0): boolean => {
          const indent = '  '.repeat(depth);
          console.log(`${indent}搜索目录: ${dir}`);
          
          try {
            const items = readdirSync(dir);
            console.log(`${indent}目录内容:`, items);
            
            for (const item of items) {
              const itemPath = join(dir, item);
              const stats = require('fs').statSync(itemPath);
              
              if (stats.isDirectory()) {
                // 递归查找子目录
                console.log(`${indent}进入子目录: ${item}`);
                if (findExecutable(itemPath, depth + 1)) {
                  return true;
                }
              } else {
                // 检查文件是否匹配
                console.log(`${indent}检查文件: ${item}`);
                if (item === targetFileName || 
                    (process.platform === 'win32' && item.endsWith('.exe')) ||
                    (process.platform !== 'win32' && !item.includes('.') && item !== 'LICENSE' && item !== 'README')) {
                  console.log(`${indent}找到可执行文件: ${itemPath}`);
                  const targetPath = join(targetDir, targetFileName);
                  console.log(`${indent}移动到: ${targetPath}`);
                  renameSync(itemPath, targetPath);
                  return true;
                }
              }
            }
          } catch (error) {
            console.error(`${indent}读取目录失败: ${dir}`, error);
          }
          return false;
        };
        
        executableFound = findExecutable(sourceDir);
        
        if (!executableFound) {
          console.error(`未找到可执行文件: ${targetFileName}`);
          console.error(`源目录内容:`, files);
          reject(new Error(`未找到可执行文件: ${targetFileName}`));
        } else {
          console.log(`可执行文件移动成功: ${targetFileName}`);
          resolve();
        }
      } catch (error) {
        console.error('查找可执行文件时出错:', error);
        reject(error);
      }
    });
  }

  /**
   * 下载并安装核心
   */
  public async downloadCore(coreName: string): Promise<void> {
    try {
      const coreInfo = this.getCoreInfo(coreName);
      
      // 从下载 URL 中提取正确的文件名
      const urlParts = coreInfo.downloadUrl.split('/');
      const originalFileName = urlParts[urlParts.length - 1];
      if (!originalFileName) {
        throw new Error(`无法从下载 URL 中提取文件名: ${coreInfo.downloadUrl}`);
      }
      const downloadPath = join(this.coresDir, originalFileName);
      const corePath = join(this.binDir, coreInfo.fileName);
      
      console.log(`开始下载 ${coreInfo.name} v${coreInfo.version}...`);
      console.log(`下载文件: ${originalFileName}`);
      console.log(`下载路径: ${downloadPath}`);
      
      // 下载文件
      await this.downloadFile(coreInfo.downloadUrl, downloadPath);
      
      console.log(`下载完成，开始解压...`);
      
      // 解压文件
      await this.extractFile(downloadPath, this.binDir, coreInfo.fileName);
      
      // 验证文件是否存在
      if (!existsSync(corePath)) {
        throw new Error(`核心文件未找到: ${corePath}`);
      }
      
      // 设置执行权限（Unix 系统）
      if (process.platform !== 'win32') {
        try {
          chmodSync(corePath, 0o755);
          console.log(`执行权限设置成功: ${corePath}`);
        } catch (error) {
          console.warn('设置执行权限失败:', error);
          // 不抛出错误，因为文件已经存在，只是权限设置失败
        }
      }
      
      console.log(`${coreInfo.name} 安装完成: ${corePath}`);
      
    } catch (error) {
      console.error(`下载 ${coreName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 下载数据库文件
   */
  public async downloadDatabase(dbName: string): Promise<void> {
    try {
      const dbInfo = this.getCoreInfo(dbName);
      
      // 数据库文件直接下载到 bin 目录
      const downloadPath = join(this.binDir, dbInfo.fileName);
      
      console.log(`开始下载 ${dbInfo.name}...`);
      console.log(`下载文件: ${dbInfo.fileName}`);
      console.log(`下载路径: ${downloadPath}`);
      
      // 下载文件
      await this.downloadFile(dbInfo.downloadUrl, downloadPath);
      
      console.log(`${dbInfo.name} 下载完成: ${downloadPath}`);
      
    } catch (error) {
      console.error(`下载 ${dbName} 失败:`, error);
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
      clash: this.isCoreInstalled('clash'),
      geoip: this.isDatabaseInstalled('geoip'),
      geosite: this.isDatabaseInstalled('geosite')
    };
  }

  /**
   * 检查数据库文件是否已安装
   */
  public isDatabaseInstalled(dbName: string): boolean {
    const dbInfo = this.getCoreInfo(dbName);
    const dbPath = join(this.binDir, dbInfo.fileName);
    return existsSync(dbPath);
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
