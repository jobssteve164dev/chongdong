import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { AppSettings, UserPreferences } from '../shared/types';
import { DefaultSettings } from '../shared/defaultSettings';

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
    return this.getDefaultSettings();
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
    return this.getDefaultPreferences();
  }

  /**
   * 保存应用设置
   */
  public saveSettings(settings: AppSettings): void {
    try {
      const temporaryPath = `${this.settingsPath}.${process.pid}.tmp`;
      fs.writeFileSync(temporaryPath, JSON.stringify(settings, null, 2), { mode: 0o600 });
      fs.renameSync(temporaryPath, this.settingsPath);
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  /**
   * 保存用户偏好设置
   */
  public savePreferences(preferences: UserPreferences): void {
    try {
      const temporaryPath = `${this.preferencesPath}.${process.pid}.tmp`;
      fs.writeFileSync(temporaryPath, JSON.stringify(preferences, null, 2), { mode: 0o600 });
      fs.renameSync(temporaryPath, this.preferencesPath);
      console.log('Preferences saved successfully');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      throw error;
    }
  }

  private getDefaultSettings(): AppSettings {
    return DefaultSettings.getDefaultAppSettings();
  }

  private getDefaultPreferences(): UserPreferences {
    return DefaultSettings.getDefaultUserPreferences();
  }
}

export const settingsManager = SettingsManager.getInstance();
