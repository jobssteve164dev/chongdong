import { Notification, nativeImage } from 'electron';
import { join } from 'path';

export interface NotificationConfig {
  enableNotifications: boolean;
  notificationSound: boolean;
  title?: string;
  body?: string;
  icon?: string;
  silent?: boolean;
  timeoutType?: 'default' | 'never';
}

export class NotificationManager {
  private config: NotificationConfig;
  private isSupported: boolean;

  constructor(config: NotificationConfig) {
    this.config = config;
    this.isSupported = Notification.isSupported();
    
    if (!this.isSupported) {
      console.warn('当前系统不支持通知功能');
    }
  }

  /**
   * 更新通知配置
   */
  updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('通知配置已更新:', this.config);
  }

  /**
   * 检查通知权限
   */
  async checkPermission(): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    try {
      // 在 macOS 上，需要请求通知权限
      if (process.platform === 'darwin') {
        // Electron的Notification没有requestPermission方法，直接返回true
        return true;
      }
      
      // 在其他平台上，通常默认允许
      return true;
    } catch (error) {
      console.error('检查通知权限失败:', error);
      return false;
    }
  }

  /**
   * 发送通知
   */
  async sendNotification(options: {
    title: string;
    body: string;
    icon?: string;
    silent?: boolean;
    timeoutType?: 'default' | 'never';
  }): Promise<boolean> {
    if (!this.config.enableNotifications) {
      console.log('通知功能已禁用');
      return false;
    }

    if (!this.isSupported) {
      console.warn('当前系统不支持通知功能');
      return false;
    }

    try {
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        console.warn('没有通知权限');
        return false;
      }

      // 创建通知图标
      let icon: Electron.NativeImage | undefined;
      if (options.icon) {
        try {
          icon = nativeImage.createFromPath(options.icon);
        } catch (error) {
          console.warn('加载通知图标失败:', error);
        }
      }

      // 如果没有指定图标，使用应用图标
      if (!icon) {
        try {
          const appIconPath = join(__dirname, '../renderer/assets/icon.png');
          icon = nativeImage.createFromPath(appIconPath);
        } catch (error) {
          console.warn('加载应用图标失败:', error);
        }
      }

      // 创建通知
      const notificationOptions: Electron.NotificationConstructorOptions = {
        title: options.title,
        body: options.body,
        silent: options.silent ?? !this.config.notificationSound,
        timeoutType: options.timeoutType ?? 'default'
      };
      
      if (icon) {
        notificationOptions.icon = icon;
      }
      
      const notification = new Notification(notificationOptions);

      // 设置通知事件处理
      notification.on('click', () => {
        console.log('通知被点击');
        this.handleNotificationClick();
      });

      notification.on('close', () => {
        console.log('通知已关闭');
      });

      notification.on('show', () => {
        console.log('通知已显示');
      });

      notification.on('reply', (_event, reply) => {
        console.log('收到通知回复:', reply);
      });

      // 显示通知
      notification.show();
      console.log('通知已发送:', options);
      return true;
    } catch (error) {
      console.error('发送通知失败:', error);
      return false;
    }
  }

  /**
   * 发送代理状态变更通知
   */
  async sendProxyStatusNotification(isEnabled: boolean): Promise<boolean> {
    const title = '虫洞代理';
    const body = isEnabled ? '代理已启用' : '代理已禁用';
    
    return this.sendNotification({
      title,
      body,
      timeoutType: 'default'
    });
  }

  /**
   * 发送连接状态通知
   */
  async sendConnectionNotification(isConnected: boolean, serverName?: string): Promise<boolean> {
    const title = '虫洞代理';
    const body = isConnected 
      ? `已连接到服务器${serverName ? `: ${serverName}` : ''}`
      : '连接已断开';
    
    return this.sendNotification({
      title,
      body,
      timeoutType: 'default'
    });
  }

  /**
   * 发送错误通知
   */
  async sendErrorNotification(error: string): Promise<boolean> {
    const title = '虫洞代理 - 错误';
    const body = error;
    
    return this.sendNotification({
      title,
      body,
      timeoutType: 'never'
    });
  }

  /**
   * 发送更新通知
   */
  async sendUpdateNotification(version: string): Promise<boolean> {
    const title = '虫洞代理 - 更新';
    const body = `发现新版本: ${version}`;
    
    return this.sendNotification({
      title,
      body,
      timeoutType: 'default'
    });
  }

  /**
   * 处理通知点击事件
   */
  private handleNotificationClick(): void {
    try {
      // 通知渲染进程处理通知点击
      // 这里可以通过 IPC 通知渲染进程
      console.log('处理通知点击事件');
    } catch (error) {
      console.error('处理通知点击事件失败:', error);
    }
  }

  /**
   * 播放通知声音
   */
  playNotificationSound(): void {
    if (!this.config.notificationSound) {
      return;
    }

    try {
      // 使用系统默认通知声音
      // 在 macOS 上，可以通过 shell 命令播放系统声音
      if (process.platform === 'darwin') {
        const { exec } = require('child_process');
        exec('afplay /System/Library/Sounds/Glass.aiff', (error: any) => {
          if (error) {
            console.warn('播放通知声音失败:', error);
          }
        });
      }
      // 在其他平台上，可以播放自定义音频文件
      else {
        // 这里可以添加其他平台的音频播放逻辑
        console.log('播放通知声音');
      }
    } catch (error) {
      console.error('播放通知声音失败:', error);
    }
  }

  /**
   * 测试通知功能
   */
  async testNotification(): Promise<boolean> {
    return this.sendNotification({
      title: '虫洞代理 - 测试',
      body: '这是一条测试通知',
      timeoutType: 'default'
    });
  }

  /**
   * 获取通知支持状态
   */
  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  /**
   * 获取当前配置
   */
  getConfig(): NotificationConfig {
    return { ...this.config };
  }
}

// 创建全局实例
let notificationManager: NotificationManager | null = null;

export function createNotificationManager(config: NotificationConfig): NotificationManager {
  notificationManager = new NotificationManager(config);
  return notificationManager;
}

export function getNotificationManager(): NotificationManager | null {
  return notificationManager;
}
