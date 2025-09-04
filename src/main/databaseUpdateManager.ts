import { app } from 'electron';
import { join } from 'path';
import { existsSync, statSync } from 'fs';
import { get } from 'https';
import { coreDownloader } from './coreDownloader';
import { getNotificationManager } from './notificationManager';

interface DatabaseInfo {
  name: string;
  fileName: string;
  downloadUrl: string;
  etagUrl: string;
}

interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion?: string;
  latestVersion?: string;
  lastModified?: string;
  error?: string;
}

export class DatabaseUpdateManager {
  private static instance: DatabaseUpdateManager;
  private updateTimer: NodeJS.Timeout | null = null;
  private isChecking = false;
  private databases: DatabaseInfo[] = [
    {
      name: 'GeoIP',
      fileName: 'geoip.db',
      downloadUrl: 'https://github.com/SagerNet/sing-geoip/releases/latest/download/geoip.db',
      etagUrl: 'https://github.com/SagerNet/sing-geoip/releases/latest/download/geoip.db'
    },
    {
      name: 'GeoSite',
      fileName: 'geosite.db',
      downloadUrl: 'https://github.com/SagerNet/sing-geosite/releases/latest/download/geosite.db',
      etagUrl: 'https://github.com/SagerNet/sing-geosite/releases/latest/download/geosite.db'
    }
  ];

  private constructor() {}

  public static getInstance(): DatabaseUpdateManager {
    if (!DatabaseUpdateManager.instance) {
      DatabaseUpdateManager.instance = new DatabaseUpdateManager();
    }
    return DatabaseUpdateManager.instance;
  }

  /**
   * 启动自动更新检查
   */
  public startAutoUpdate(settings: any): void {
    this.stopAutoUpdate();

    if (!settings.enableDatabaseAutoUpdate) {
      console.log('[DatabaseUpdateManager] 数据库自动更新已禁用');
      return;
    }

    const interval = settings.databaseUpdateInterval || 24; // 默认24小时
    const intervalMs = interval * 60 * 60 * 1000; // 转换为毫秒

    console.log(`[DatabaseUpdateManager] 启动自动更新检查，间隔: ${interval}小时`);

    // 立即执行一次检查
    this.checkForUpdates(settings);

    // 设置定时器
    this.updateTimer = setInterval(() => {
      this.checkForUpdates(settings);
    }, intervalMs);
  }

  /**
   * 停止自动更新检查
   */
  public stopAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
      console.log('[DatabaseUpdateManager] 已停止自动更新检查');
    }
  }

  /**
   * 检查数据库更新
   */
  public async checkForUpdates(settings: any): Promise<void> {
    if (this.isChecking) {
      console.log('[DatabaseUpdateManager] 正在检查中，跳过重复请求');
      return;
    }

    this.isChecking = true;
    console.log('[DatabaseUpdateManager] 开始检查数据库更新...');

    try {
      const results: UpdateCheckResult[] = [];

      for (const db of this.databases) {
        const result = await this.checkDatabaseUpdate(db);
        results.push(result);

        if (result.hasUpdate) {
          console.log(`[DatabaseUpdateManager] ${db.name} 有可用更新`);
          await this.downloadDatabase(db);
        } else if (result.error) {
          console.error(`[DatabaseUpdateManager] 检查 ${db.name} 失败:`, result.error);
        } else {
          console.log(`[DatabaseUpdateManager] ${db.name} 已是最新版本`);
        }
      }

      // 更新最后检查时间
      settings.databaseLastUpdateCheck = Date.now();

      // 发送通知
      this.sendUpdateNotification(results);

    } catch (error) {
      console.error('[DatabaseUpdateManager] 检查更新失败:', error);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * 检查单个数据库更新
   */
  private async checkDatabaseUpdate(db: DatabaseInfo): Promise<UpdateCheckResult> {
    try {
      const binDir = join(app.getPath('userData'), 'bin');
      const localPath = join(binDir, db.fileName);

      // 检查本地文件是否存在
      if (!existsSync(localPath)) {
        return { hasUpdate: true, error: '本地文件不存在' };
      }

      // 获取本地文件信息
      const localStats = statSync(localPath);
      const localModified = localStats.mtime.toISOString();

      // 获取远程文件信息
      const remoteInfo = await this.getRemoteFileInfo(db.downloadUrl);

      if (!remoteInfo.lastModified) {
        return { hasUpdate: false, error: '无法获取远程文件信息' };
      }

      const hasUpdate = new Date(remoteInfo.lastModified) > new Date(localModified);

      return {
        hasUpdate,
        currentVersion: localModified,
        latestVersion: remoteInfo.lastModified,
        lastModified: remoteInfo.lastModified
      };

    } catch (error) {
      return { hasUpdate: false, error: error instanceof Error ? error.message : '未知错误' };
    }
  }

  /**
   * 获取远程文件信息
   */
  private async getRemoteFileInfo(url: string): Promise<{ lastModified?: string; etag?: string }> {
    return new Promise((resolve) => {
      const req = get(url, { method: 'HEAD' }, (res) => {
        const lastModified = res.headers['last-modified'] as string;
        const etag = res.headers.etag as string;
        resolve({ lastModified, etag });
      });

      req.on('error', () => {
        resolve({});
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve({});
      });
    });
  }

  /**
   * 下载数据库文件
   */
  private async downloadDatabase(db: DatabaseInfo): Promise<void> {
    try {
      console.log(`[DatabaseUpdateManager] 开始下载 ${db.name}...`);
      
      await coreDownloader.downloadDatabase(db.name.toLowerCase() as 'geoip' | 'geosite');
      
      console.log(`[DatabaseUpdateManager] ${db.name} 下载完成`);
      
      // 发送成功通知
      this.sendDownloadSuccessNotification(db.name);

    } catch (error) {
      console.error(`[DatabaseUpdateManager] 下载 ${db.name} 失败:`, error);
      
      // 发送失败通知
      this.sendDownloadErrorNotification(db.name, error instanceof Error ? error.message : '未知错误');
    }
  }

  /**
   * 手动触发更新检查
   */
  public async manualUpdateCheck(settings: any): Promise<{ success: boolean; message: string }> {
    try {
      await this.checkForUpdates(settings);
      return { success: true, message: '数据库更新检查完成' };
    } catch (error) {
      return { 
        success: false, 
        message: `更新检查失败: ${error instanceof Error ? error.message : '未知错误'}` 
      };
    }
  }

  /**
   * 发送更新通知
   */
  private sendUpdateNotification(results: UpdateCheckResult[]): void {
    const updatedDbs = results.filter(r => r.hasUpdate).length;
    const errorDbs = results.filter(r => r.error).length;

    if (updatedDbs > 0) {
      getNotificationManager()?.sendNotification({
        title: '数据库更新',
        body: `发现 ${updatedDbs} 个数据库有可用更新`,
        timeoutType: 'default'
      });
    }

    if (errorDbs > 0) {
      getNotificationManager()?.sendNotification({
        title: '数据库更新检查失败',
        body: `${errorDbs} 个数据库检查失败，请检查网络连接`,
        timeoutType: 'default'
      });
    }
  }

  /**
   * 发送下载成功通知
   */
  private sendDownloadSuccessNotification(dbName: string): void {
    getNotificationManager()?.sendNotification({
      title: '数据库更新成功',
      body: `${dbName} 数据库已更新到最新版本`,
      timeoutType: 'default'
    });
  }

  /**
   * 发送下载失败通知
   */
  private sendDownloadErrorNotification(dbName: string, error: string): void {
    getNotificationManager()?.sendNotification({
      title: '数据库更新失败',
      body: `${dbName} 数据库更新失败: ${error}`,
      timeoutType: 'default'
    });
  }

  /**
   * 获取数据库状态
   */
  public getDatabaseStatus(): { [key: string]: { installed: boolean; lastModified?: string } } {
    const binDir = join(app.getPath('userData'), 'bin');
    const status: { [key: string]: { installed: boolean; lastModified?: string } } = {};

    for (const db of this.databases) {
      const localPath = join(binDir, db.fileName);
      const installed = existsSync(localPath);
      
      if (installed) {
        try {
          const stats = statSync(localPath);
          status[db.name.toLowerCase()] = {
            installed: true,
            lastModified: stats.mtime.toISOString()
          };
        } catch {
          status[db.name.toLowerCase()] = { installed: true };
        }
      } else {
        status[db.name.toLowerCase()] = { installed: false };
      }
    }

    return status;
  }
}

export const databaseUpdateManager = DatabaseUpdateManager.getInstance();
