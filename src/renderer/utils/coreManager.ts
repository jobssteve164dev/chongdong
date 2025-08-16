// 通过预加载脚本访问 ipcRenderer
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        send: (channel: string, data: any) => void;
        on: (channel: string, func: (...args: any[]) => void) => void;
      };
    };
  }
}

const { ipcRenderer } = window.electron;

export interface CoreStatus {
  singbox: boolean;
  xray: boolean;
  clash: boolean;
}

export interface DownloadProgress {
  coreName: string;
  progress: number;
  status: 'downloading' | 'extracting' | 'completed' | 'error';
  message?: string;
}

export class CoreManager {
  /**
   * 获取所有核心的安装状态
   */
  static async getCoresStatus(): Promise<CoreStatus> {
    try {
      return await ipcRenderer.invoke('core:getStatus');
    } catch (error) {
      console.error('获取核心状态失败:', error);
      return { singbox: false, xray: false, clash: false };
    }
  }

  /**
   * 检查特定核心是否已安装
   */
  static async isCoreInstalled(coreName: string): Promise<boolean> {
    try {
      return await ipcRenderer.invoke('core:isInstalled', coreName);
    } catch (error) {
      console.error(`检查核心 ${coreName} 安装状态失败:`, error);
      return false;
    }
  }

  /**
   * 下载核心
   */
  static async downloadCore(coreName: string): Promise<boolean> {
    try {
      const result = await ipcRenderer.invoke('core:download', { coreName });
      
      if (result.success) {
        return true;
      } else {
        console.error(`下载失败: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error(`下载核心 ${coreName} 失败:`, error);
      return false;
    }
  }

  /**
   * 获取核心显示名称
   */
  static getCoreDisplayName(coreName: string): string {
    const names: { [key: string]: string } = {
      singbox: 'Sing-box',
      xray: 'Xray',
      clash: 'Clash'
    };
    return names[coreName] || coreName;
  }

  /**
   * 获取核心描述
   */
  static getCoreDescription(coreName: string): string {
    const descriptions: { [key: string]: string } = {
      singbox: '现代化的通用代理平台，支持多种协议',
      xray: '高性能的网络代理工具，基于 XTLS 协议',
      clash: '基于规则的跨平台代理工具'
    };
    return descriptions[coreName] || '';
  }
}
