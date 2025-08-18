import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface UserPreferences {
  windowSize: { width: number; height: number };
  windowPosition: { x: number; y: number };
  sidebarCollapsed: boolean;
  autoHideMenuBar: boolean;
  alwaysOnTop: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
  enableNotifications: boolean;
  notificationSound: boolean;
  enableHotkeys: boolean;
  hotkeys: Record<string, string>;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  autoStart: boolean;
  systemProxy: boolean;
  proxyPort: number;
  socksPort: number;
  mixedPort: number;
  allowLan: boolean;
  mode: 'rule' | 'global' | 'direct';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableLog: boolean;
  logFile: string;
  enableUdp: boolean;
  enableIpv6: boolean;
  enableTun: boolean;
  tunDevice: string;
  enableFakeIp: boolean;
  fakeIpRange: string;
  enableDns: boolean;
  dnsServer: string;
  enableDoh: boolean;
  dohServer: string;
}

export class SettingsManager {
  private static instance: SettingsManager;
  private settingsPath: string;
  private preferencesPath: string;

  private constructor() {
    const userDataPath = app.getPath('userData');
    this.settingsPath = path.join(userDataPath, 'settings.json');
    this.preferencesPath = path.join(userDataPath, 'preferences.json');
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * 读取应用设置
   */
  public getSettings(): AppSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to read settings:', error);
    }
    
    // 返回默认设置
    return {
      theme: 'auto',
      language: 'zh-CN',
      autoStart: false,
      systemProxy: true,
      proxyPort: 7890,
      socksPort: 7891,
      mixedPort: 7890,
      allowLan: false,
      mode: 'rule',
      logLevel: 'info',
      enableLog: true,
      logFile: 'chongdong.log',
      enableUdp: true,
      enableIpv6: false,
      enableTun: false,
      tunDevice: 'utun0',
      enableFakeIp: true,
      fakeIpRange: '198.18.0.1/16',
      enableDns: true,
      dnsServer: '8.8.8.8',
      enableDoh: false,
      dohServer: 'https://dns.google/dns-query'
    };
  }

  /**
   * 读取用户偏好设置
   */
  public getPreferences(): UserPreferences {
    try {
      if (fs.existsSync(this.preferencesPath)) {
        const data = fs.readFileSync(this.preferencesPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to read preferences:', error);
    }
    
    // 返回默认偏好设置
    return {
      windowSize: { width: 1200, height: 800 },
      windowPosition: { x: 100, y: 100 },
      sidebarCollapsed: false,
      autoHideMenuBar: true,
      alwaysOnTop: false,
      minimizeToTray: true,
      startMinimized: false,
      enableNotifications: true,
      notificationSound: true,
      enableHotkeys: true,
      hotkeys: {
        toggleProxy: 'Ctrl+Shift+P',
        showMainWindow: 'Ctrl+Shift+M',
        quickSwitch: 'Ctrl+Shift+S'
      }
    };
  }

  /**
   * 保存应用设置
   */
  public saveSettings(settings: AppSettings): void {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  /**
   * 保存用户偏好设置
   */
  public savePreferences(preferences: UserPreferences): void {
    try {
      fs.writeFileSync(this.preferencesPath, JSON.stringify(preferences, null, 2));
      console.log('Preferences saved successfully');
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }
}

export const settingsManager = SettingsManager.getInstance();
