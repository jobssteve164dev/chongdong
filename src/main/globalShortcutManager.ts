import { globalShortcut, BrowserWindow } from 'electron';

export interface HotkeyConfig {
  toggleProxy: string;
  showMainWindow: string;
  quickSwitch: string;
}

export class GlobalShortcutManager {
  private registeredShortcuts: Map<string, () => void> = new Map();
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow;
  }

  /**
   * 设置主窗口引用
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * 注册全局快捷键
   */
  registerHotkeys(hotkeys: HotkeyConfig): { success: boolean; conflicts: string[] } {
    const conflicts: string[] = [];
    const results: { [key: string]: boolean } = {};

    // 先注销所有已注册的快捷键
    this.unregisterAllHotcuts();

    // 注册新的快捷键
    Object.entries(hotkeys).forEach(([action, shortcut]) => {
      if (shortcut && shortcut.trim()) {
        const success = this.registerSingleHotkey(shortcut, () => {
          this.handleHotkeyAction(action);
        });
        
        results[action] = success;
        if (!success) {
          conflicts.push(shortcut);
        }
      }
    });

    console.log('全局快捷键注册结果:', results);
    return { success: Object.values(results).every(Boolean), conflicts };
  }

  /**
   * 注册单个快捷键
   */
  private registerSingleHotkey(shortcut: string, callback: () => void): boolean {
    try {
      // 检查快捷键是否已被注册
      if (globalShortcut.isRegistered(shortcut)) {
        console.warn(`快捷键 ${shortcut} 已被注册`);
        return false;
      }

      // 注册快捷键
      const success = globalShortcut.register(shortcut, callback);
      if (success) {
        this.registeredShortcuts.set(shortcut, callback);
        console.log(`快捷键 ${shortcut} 注册成功`);
      } else {
        console.error(`快捷键 ${shortcut} 注册失败`);
      }
      return success;
    } catch (error) {
      console.error(`注册快捷键 ${shortcut} 时出错:`, error);
      return false;
    }
  }

  /**
   * 处理快捷键动作
   */
  private handleHotkeyAction(action: string): void {
    console.log(`触发快捷键动作: ${action}`);
    
    switch (action) {
      case 'toggleProxy':
        this.toggleProxy();
        break;
      case 'showMainWindow':
        this.showMainWindow();
        break;
      case 'quickSwitch':
        this.quickSwitch();
        break;
      default:
        console.warn(`未知的快捷键动作: ${action}`);
    }
  }

  /**
   * 切换代理状态
   */
  private toggleProxy(): void {
    try {
      // 通知渲染进程切换代理状态
      this.mainWindow?.webContents.send('hotkey-toggle-proxy');
      console.log('发送代理切换快捷键事件');
    } catch (error) {
      console.error('发送代理切换事件失败:', error);
    }
  }

  /**
   * 显示主窗口
   */
  private showMainWindow(): void {
    try {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) {
          this.mainWindow.restore();
        }
        if (!this.mainWindow.isVisible()) {
          this.mainWindow.show();
        }
        this.mainWindow.focus();
        console.log('主窗口已显示并聚焦');
      }
    } catch (error) {
      console.error('显示主窗口失败:', error);
    }
  }

  /**
   * 快速切换功能
   */
  private quickSwitch(): void {
    try {
      // 通知渲染进程执行快速切换
      this.mainWindow?.webContents.send('hotkey-quick-switch');
      console.log('发送快速切换快捷键事件');
    } catch (error) {
      console.error('发送快速切换事件失败:', error);
    }
  }

  /**
   * 注销所有快捷键
   */
  unregisterAllHotcuts(): void {
    try {
      globalShortcut.unregisterAll();
      this.registeredShortcuts.clear();
      console.log('所有全局快捷键已注销');
    } catch (error) {
      console.error('注销全局快捷键失败:', error);
    }
  }

  /**
   * 注销单个快捷键
   */
  unregisterHotkey(shortcut: string): boolean {
    try {
      globalShortcut.unregister(shortcut);
      this.registeredShortcuts.delete(shortcut);
      console.log(`快捷键 ${shortcut} 已注销`);
      return true;
    } catch (error) {
      console.error(`注销快捷键 ${shortcut} 失败:`, error);
      return false;
    }
  }

  /**
   * 检查快捷键是否可用
   */
  isShortcutAvailable(shortcut: string): boolean {
    try {
      return !globalShortcut.isRegistered(shortcut);
    } catch (error) {
      console.error(`检查快捷键 ${shortcut} 可用性失败:`, error);
      return false;
    }
  }

  /**
   * 获取已注册的快捷键列表
   */
  getRegisteredShortcuts(): string[] {
    return Array.from(this.registeredShortcuts.keys());
  }

  /**
   * 验证快捷键格式
   */
  validateShortcut(shortcut: string): { valid: boolean; error?: string } {
    if (!shortcut || !shortcut.trim()) {
      return { valid: false, error: '快捷键不能为空' };
    }

    // 检查快捷键格式
    const shortcutPattern = /^(Ctrl\+|Cmd\+|Alt\+|Shift\+|Meta\+)*([A-Za-z0-9]|F[1-9][0-2]?)$/;
    if (!shortcutPattern.test(shortcut)) {
      return { valid: false, error: '快捷键格式不正确' };
    }

    return { valid: true };
  }
}

// 创建全局实例
let globalShortcutManager: GlobalShortcutManager | null = null;

export function createGlobalShortcutManager(mainWindow: BrowserWindow | null): GlobalShortcutManager {
  globalShortcutManager = new GlobalShortcutManager(mainWindow);
  return globalShortcutManager;
}

export function getGlobalShortcutManager(): GlobalShortcutManager | null {
  return globalShortcutManager;
}
