/**
 * 窗口管理工具类
 * 提供窗口控制相关的API
 */
export class WindowManager {
  private static instance: WindowManager;

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  /**
   * 设置窗口置顶
   */
  public async setAlwaysOnTop(alwaysOnTop: boolean): Promise<boolean> {
    try {
      console.log('调用窗口置顶API:', alwaysOnTop);
      const result = await window.electron.ipcRenderer.invoke('window:setAlwaysOnTop', alwaysOnTop);
      console.log('窗口置顶API结果:', result);
      return result.success;
    } catch (error) {
      console.error('Failed to set always on top:', error);
      return false;
    }
  }

  /**
   * 设置自动隐藏菜单栏
   */
  public async setAutoHideMenuBar(autoHideMenuBar: boolean): Promise<boolean> {
    try {
      console.log('调用菜单栏隐藏API:', autoHideMenuBar);
      const result = await window.electron.ipcRenderer.invoke('window:setAutoHideMenuBar', autoHideMenuBar);
      console.log('菜单栏隐藏API结果:', result);
      return result.success;
    } catch (error) {
      console.error('Failed to set auto hide menu bar:', error);
      return false;
    }
  }

  /**
   * 最小化窗口
   */
  public async minimize(): Promise<boolean> {
    try {
      const result = await window.electron.ipcRenderer.invoke('window:minimize');
      return result.success;
    } catch (error) {
      console.error('Failed to minimize window:', error);
      return false;
    }
  }

  /**
   * 显示窗口
   */
  public async show(): Promise<boolean> {
    try {
      const result = await window.electron.ipcRenderer.invoke('window:show');
      return result.success;
    } catch (error) {
      console.error('Failed to show window:', error);
      return false;
    }
  }
}

// 导出单例实例
export const windowManager = WindowManager.getInstance();
