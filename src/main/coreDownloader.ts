import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, chmodSync, createReadStream, mkdtempSync, copyFileSync } from 'fs';
import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { get } from 'https';
import { createHash } from 'crypto';

interface CoreInfo {
  name: string;
  version: string;
  platform: string;
  arch: string;
  downloadUrl: string;
  checksum: string;
  fileName: string;
  archiveFileName?: string;
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
        throw new Error(`不支持的平台: ${platform}`);
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
        throw new Error(`不支持的处理器架构: ${arch}`);
    }
    
    return { platform: platformStr, arch: archStr };
  }

  /**
   * 获取核心信息
   */
  private getCoreInfo(coreName: string): CoreInfo {
    const { platform, arch } = this.getPlatformInfo();
    const platformArch = `${platform}-${arch}`;
    const select = (assets: Record<string, [string, string]>): [string, string] => {
      const selected = assets[platformArch];
      if (!selected) throw new Error(`当前平台没有受信任的 ${coreName} 构建: ${platformArch}`);
      return selected;
    };
    
    switch (coreName) {
      case 'tun2socks': {
        const ver = 'v2.7.0';
        const [asset, checksum] = select({
          'darwin-amd64': ['tun2socks-darwin-amd64.zip', '6e654da8bab9ca1645862f0e251a69980e0966680713011feea7b1e5901b2a95'],
          'darwin-arm64': ['tun2socks-darwin-arm64.zip', '7c5ebfe2ffb60ecf6e958cc5bbf3e06e74b8b33575ffbb4ba4f6f785a647f1ad'],
          'linux-386': ['tun2socks-linux-386.zip', 'd5ebf3c1840c0ec121bfd577bd5edf751b8714eb16a19e9667ea5e2267108606'],
          'linux-amd64': ['tun2socks-linux-amd64.zip', 'a612baa287a3b6de6221f74fd02b442a50888508227ecf51e1288a5ccbb77381'],
          'linux-arm64': ['tun2socks-linux-arm64.zip', '3931476c9cfa8fa236d23aeaf36767df0eb27cc11ecaab699faba57744450f49'],
          'windows-386': ['tun2socks-windows-386.zip', 'ad870a2ca99d617e004ec09f8f5cca2c134b4d16ae12b4eac0ff6d9fe05d9044'],
          'windows-amd64': ['tun2socks-windows-amd64.zip', 'c5d46e9452f6c9cc7c15ab9158d6d6a0169ceecd6bca019ce476b49337d2be43'],
          'windows-arm64': ['tun2socks-windows-arm64.zip', '74497771068da13f42921adfc540f2abb9ac822404582c8cbe34d30e8c0ea1f5']
        });
        return {
          name: 'tun2socks',
          version: ver,
          platform,
          arch,
          fileName: platform === 'windows' ? 'tun2socks.exe' : 'tun2socks',
          checksum,
          downloadUrl: `https://github.com/xjasonlyu/tun2socks/releases/download/${ver}/${asset}`
        };
      }
      case 'singbox': {
        const version = '1.13.19';
        const [asset, checksum] = select({
          'darwin-amd64': [`sing-box-${version}-darwin-amd64.tar.gz`, '31ee722237d95774e101fbffeae6be6776249c5f7db229ad8ff00b45b22e6a00'],
          'darwin-arm64': [`sing-box-${version}-darwin-arm64.tar.gz`, '23bf191906f2dfc9f00e9f0092f274f3426ba9377327e903ff94e636b64d0997'],
          'linux-386': [`sing-box-${version}-linux-386.tar.gz`, '0a41973546eb3b1de6e2a83fb2963c42e9a2d3e3d1dff1fa0a49c3552d82ed11'],
          'linux-amd64': [`sing-box-${version}-linux-amd64.tar.gz`, 'ef88a9e577d474210867bd708933d042e9b70106529df2656182c9db90106aa1'],
          'linux-arm64': [`sing-box-${version}-linux-arm64.tar.gz`, '7fe3597a95a3c5ad67477b1d7653b9ce097e0be7c676758eba1fcf558f353d57'],
          'windows-386': [`sing-box-${version}-windows-386.zip`, '96ce47e98a553b0bfe7965492c5f38c62a04e84352a25ede09f7720aa4baa5a8'],
          'windows-amd64': [`sing-box-${version}-windows-amd64.zip`, 'e011a4def2f5e2b143ed54adb2b1a20a6be407806ab4442f3667f1dd817a2c8d'],
          'windows-arm64': [`sing-box-${version}-windows-arm64.zip`, 'dbb6c4803f94a997fcc4a1cce313eff65a901abc197731b55109ea4fbd412c88']
        });
        return {
          name: 'sing-box',
          version,
          platform,
          arch,
          fileName: platform === 'windows' ? 'sing-box.exe' : 'sing-box',
          checksum,
          downloadUrl: `https://github.com/SagerNet/sing-box/releases/download/v${version}/${asset}`
        };
      }
      
      case 'xray': {
        const version = '26.3.27';
        const [asset, checksum] = select({
          'darwin-amd64': ['Xray-macos-64.zip', 'f5b0471d3459eff1b82e48af0aeac186abcc3298210070afbbbd8437a4e8b203'],
          'darwin-arm64': ['Xray-macos-arm64-v8a.zip', '2e93a67e8aa1936ecefb307e120830fcbd4c643ab9b1c46a2d0838d5f8409eaf'],
          'linux-386': ['Xray-linux-32.zip', 'd1eeb0d9a9106eefd286fbb73595c2dfe1c48c56aa91ba1c9aefe04f188d0927'],
          'linux-amd64': ['Xray-linux-64.zip', '23cd9af937744d97776ee35ecad4972cf4b2109d1e0fe6be9930467608f7c8ae'],
          'linux-arm64': ['Xray-linux-arm64-v8a.zip', '4d30283ae614e3057f730f67cd088a42be6fdf91f8639d82cb69e48cde80413c'],
          'windows-386': ['Xray-windows-32.zip', '956a5ec00bce747c7936dc4ff7ac570df1c8030b0a4a8640f843488365084db3'],
          'windows-amd64': ['Xray-windows-64.zip', 'd004c39288ce9ada487c6f398c7c545f7d749e44bdfdd59dbc9f865afba4e1ad'],
          'windows-arm64': ['Xray-windows-arm64-v8a.zip', '35d4ed6ec21224fb22b07c2c3f672e2350cd536f2c74d309150175a76365ea88']
        });
        return {
          name: 'Xray',
          version,
          platform,
          arch,
          fileName: platform === 'windows' ? 'xray.exe' : 'xray',
          checksum,
          downloadUrl: `https://github.com/XTLS/Xray-core/releases/download/v${version}/${asset}`
        };
      }
      
      case 'clash': {
        const version = '1.19.30';
        const [asset, checksum] = select({
          'darwin-amd64': [`mihomo-darwin-amd64-v${version}.gz`, '99dfcfe454ed58fb95ee4ba222c39defd051b687ad3e5deabb1b9d6be3103e2f'],
          'darwin-arm64': [`mihomo-darwin-arm64-v${version}.gz`, '2c7f3a7904fa1cee291e124123e630e7b1ebd13765dd9bf26c0a28432004d9f4'],
          'linux-amd64': [`mihomo-linux-amd64-v${version}.gz`, 'cf06ce2c7d1421bdbda14ee4a5b6046672dc35ebf8eecd8e77504ec3c0ed9a84'],
          'linux-arm64': [`mihomo-linux-arm64-v${version}.gz`, '58896873736d28628f66de3677c8654fa0f180662523148e136cff4f6e890069'],
          'windows-386': [`mihomo-windows-386-v${version}.zip`, 'd2517ef827365248cda370b08a43d088d306bce8de763036ded15bb13c0f54d7'],
          'windows-amd64': [`mihomo-windows-amd64-v${version}.zip`, '22c09fd67673895ef7cd6b1820563918275c3d316f2462b306208675118db3c0'],
          'windows-arm64': [`mihomo-windows-arm64-v${version}.zip`, 'b37c4b0259e85b020edc4215aa4c86052e21071cf520d4800364b21b4e2fc162']
        });
        return {
          name: 'mihomo',
          version,
          platform,
          arch,
          fileName: platform === 'windows' ? 'clash.exe' : 'clash',
          ...(platform === 'windows' ? { archiveFileName: asset.replace(/\.zip$/, '.exe') } : {}),
          checksum,
          downloadUrl: `https://github.com/MetaCubeX/mihomo/releases/download/v${version}/${asset}`
        };
      }
      
      case 'geoip':
        return {
          name: 'GeoIP Database',
          version: '20260812',
          platform: 'all',
          arch: 'all',
          fileName: 'geoip.db',
          checksum: 'd8f4d22abee199b73c019df267e8dc649e868da3b130753640aa9b05d11040c0',
          downloadUrl: 'https://github.com/SagerNet/sing-geoip/releases/download/20260812/geoip.db'
        };
      
      case 'geosite':
        return {
          name: 'GeoSite Database',
          version: '20260826065759',
          platform: 'all',
          arch: 'all',
          fileName: 'geosite.db',
          checksum: '8b64822688e897a3a35d04f1e5d717b767939ae2a35bd4ea7741239aa3a8b333',
          downloadUrl: 'https://github.com/SagerNet/sing-geosite/releases/download/20260826065759/geosite.db'
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
        
        const parsedUrl = new URL(requestUrl);
        const trustedHost = parsedUrl.hostname === 'github.com' ||
          parsedUrl.hostname.endsWith('.github.com') || parsedUrl.hostname.endsWith('.githubusercontent.com');
        if (parsedUrl.protocol !== 'https:' || !trustedHost) {
          reject(new Error('下载地址不在受信任的 GitHub 发布域中'));
          return;
        }

        get(parsedUrl, (response) => {
          // 处理重定向
          if (response.statusCode === 301 || response.statusCode === 302) {
            const location = response.headers.location;
            if (location) {
              response.resume();
              redirectCount++;
              makeRequest(new URL(location, requestUrl).toString());
              return;
            }
          }
          
          if (response.statusCode !== 200) {
            reject(new Error(`下载失败: HTTP ${response.statusCode}`));
            return;
          }

          const fileStream = createWriteStream(filePath);
          
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
  private async validateArchiveEntries(filePath: string, isTarGz: boolean): Promise<void> {
    const command = isTarGz ? 'tar' : 'unzip';
    const args = isTarGz ? ['-tzf', filePath] : ['-Z1', filePath];
    const entries = await new Promise<string>((resolve, reject) => {
      const child = spawn(command, args);
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', chunk => {
        stdout += chunk.toString();
        if (stdout.length > 10 * 1024 * 1024) child.kill();
      });
      child.stderr.on('data', chunk => { stderr += chunk.toString(); });
      child.once('error', reject);
      child.once('close', code => {
        if (code === 0) resolve(stdout);
        else reject(new Error(`无法读取压缩包目录: ${stderr.trim() || `${command} exited with code ${code}`}`));
      });
    });

    const unsafeEntry = entries.split(/\r?\n/).find(entry => {
      const normalized = entry.replace(/\\/g, '/');
      return normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized) ||
        normalized.split('/').some(segment => segment === '..');
    });
    if (unsafeEntry) {
      throw new Error(`压缩包包含不安全路径，拒绝解压: ${unsafeEntry}`);
    }
  }

  private async extractFile(filePath: string, extractDir: string, targetFileName: string, archiveFileName = targetFileName): Promise<void> {
    const isGzip = filePath.endsWith('.gz');
    const isZip = filePath.endsWith('.zip');
    const isTarGz = filePath.endsWith('.tar.gz');
    if (isTarGz || isZip) {
      await this.validateArchiveEntries(filePath, isTarGz);
    }

    return new Promise((resolve, reject) => {
      console.log(`解压文件: ${filePath}`);
      console.log(`目标目录: ${extractDir}`);
      console.log(`目标文件名: ${targetFileName}`);
      console.log(`文件类型: gzip=${isGzip}, zip=${isZip}, tarGz=${isTarGz}`);
      
      let command: string;
      let args: string[];
      
      let tempDir: string;

      if (isGzip && !isTarGz) {
        const targetStream = createWriteStream(join(extractDir, targetFileName));
        const gzip = spawn('gzip', ['-dc', filePath]);
        gzip.stdout.pipe(targetStream);
        gzip.once('error', reject);
        targetStream.once('error', reject);
        gzip.once('close', code => {
          if (code === 0) resolve();
          else reject(new Error(`解压失败: gzip exited with code ${code}`));
        });
        return;
      }
      
      if (isTarGz) {
        // 对于 tar.gz 文件，先解压到临时目录
        tempDir = mkdtempSync(join(this.coresDir, 'extract-'));
        console.log(`创建临时目录: ${tempDir}`);
        if (!existsSync(tempDir)) {
          mkdirSync(tempDir, { recursive: true });
        }
        
        command = 'tar';
        args = ['-xzf', filePath, '-C', tempDir];
        console.log(`执行解压命令: ${command} ${args.join(' ')}`);
      } else if (isGzip) {
        command = 'gzip';
        args = ['-dc', filePath];
      } else if (isZip) {
        // 为ZIP也使用临时目录再探测移动，避免压缩包内部文件名与目标名不一致
        tempDir = mkdtempSync(join(this.coresDir, 'extract-'));
        console.log(`创建临时目录: ${tempDir}`);
        if (!existsSync(tempDir)) {
          mkdirSync(tempDir, { recursive: true });
        }
        command = 'unzip';
        args = ['-o', filePath, '-d', tempDir];
        console.log(`执行解压命令: ${command} ${args.join(' ')}`);
      } else {
        console.log('不支持的文件格式，跳过解压');
        resolve();
        return;
      }
      
      const child = spawn(command, args);
      
      child.on('close', (code) => {
        console.log(`解压命令退出码: ${code}`);
        if (code === 0) {
          if (isTarGz || isZip) {
            console.log(`解压成功，开始查找可执行文件...`);
            // 查找并移动可执行文件（从临时目录移动到目标目录）
            const searchDir = tempDir || extractDir;
            this.findAndMoveExecutable(searchDir, extractDir, targetFileName, archiveFileName)
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
  private async findAndMoveExecutable(sourceDir: string, targetDir: string, targetFileName: string, archiveFileName: string): Promise<void> {
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
                if (item.toLowerCase() === archiveFileName.toLowerCase()) {
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

  private async calculateSha256(filePath: string): Promise<string> {
    return await new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(filePath);
      stream.on('data', chunk => hash.update(chunk));
      stream.once('error', reject);
      stream.once('end', () => resolve(hash.digest('hex')));
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

      const checksum = await this.calculateSha256(downloadPath);
      if (checksum !== coreInfo.checksum) {
        throw new Error(`${coreInfo.name} 完整性校验失败`);
      }
      
      console.log(`下载完成，开始解压...`);
      
      // 解压文件
      await this.extractFile(downloadPath, this.binDir, coreInfo.fileName, coreInfo.archiveFileName);
      
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
      
      const downloadPath = join(this.coresDir, `${dbInfo.fileName}.${dbInfo.version}.download`);
      const databasePath = join(this.binDir, dbInfo.fileName);
      
      console.log(`开始下载 ${dbInfo.name}...`);
      console.log(`下载文件: ${dbInfo.fileName}`);
      console.log(`下载路径: ${downloadPath}`);
      
      // 下载文件
      await this.downloadFile(dbInfo.downloadUrl, downloadPath);
      const checksum = await this.calculateSha256(downloadPath);
      if (checksum !== dbInfo.checksum) {
        throw new Error(`${dbInfo.name} 完整性校验失败`);
      }
      copyFileSync(downloadPath, databasePath);
      
      console.log(`${dbInfo.name} 下载并校验完成: ${databasePath}`);
      
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
      tun2socks: this.isCoreInstalled('tun2socks'),
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
