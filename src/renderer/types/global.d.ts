// 全局类型声明
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        on: (channel: string, listener: (...args: any[]) => void) => () => void;
        send: (channel: string, ...args: any[]) => void;
        removeAllListeners: (channel: string) => void;
      };
    };
    api: {
      hotkeys: {
        register: (hotkeys: any) => Promise<{ success: boolean; conflicts?: string[]; error?: string }>;
        unregister: (shortcut: string) => Promise<{ success: boolean; error?: string }>;
        unregisterAll: () => Promise<{ success: boolean; error?: string }>;
        validate: (shortcut: string) => Promise<{ valid: boolean; error?: string }>;
        checkAvailability: (shortcut: string) => Promise<{ available: boolean; error?: string }>;
      };
      notification: {
        send: (options: { title: string; body: string; icon?: string; silent?: boolean; timeoutType?: 'default' | 'never' }) => Promise<{ success: boolean; error?: string }>;
        test: () => Promise<{ success: boolean; error?: string }>;
        checkPermission: () => Promise<{ hasPermission: boolean; error?: string }>;
        updateConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
        isSupported: () => Promise<{ supported: boolean; error?: string }>;
      };
    };
  }
}

export {};
