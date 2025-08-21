// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// Custom APIs for renderer
const api = {
  // 全局快捷键API
  hotkeys: {
    register: (hotkeys: any) => ipcRenderer.invoke('hotkeys:register', hotkeys),
    unregister: (shortcut: string) => ipcRenderer.invoke('hotkeys:unregister', shortcut),
    unregisterAll: () => ipcRenderer.invoke('hotkeys:unregister-all'),
    validate: (shortcut: string) => ipcRenderer.invoke('hotkeys:validate', shortcut),
    checkAvailability: (shortcut: string) => ipcRenderer.invoke('hotkeys:check-availability', shortcut)
  },
  
  // 通知API
  notification: {
    send: (options: any) => ipcRenderer.invoke('notification:send', options),
    test: () => ipcRenderer.invoke('notification:test'),
    checkPermission: () => ipcRenderer.invoke('notification:check-permission'),
    updateConfig: (config: any) => ipcRenderer.invoke('notification:update-config', config),
    isSupported: () => ipcRenderer.invoke('notification:is-supported')
  },

  // DNS 服务 API
  dns: {
    startService: () => ipcRenderer.invoke('dns:startService'),
    stopService: () => ipcRenderer.invoke('dns:stopService'),
    getSystemDnsServers: () => ipcRenderer.invoke('dns:getSystemDnsServers'),
    testDnsQuery: (domain: string, dnsServer: string) => ipcRenderer.invoke('dns:testDnsQuery', { domain, dnsServer }),
    checkDnsLeak: () => ipcRenderer.invoke('dns:checkDnsLeak'),
    clearDnsCache: () => ipcRenderer.invoke('dns:clearDnsCache'),
  }
}

// Use `contextBridge` to securely expose Node.js APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, listener: (...args: any[]) => void) => {
      // Create a new listener that wraps the original one
      const wrappedListener = (_event: IpcRendererEvent, ...args: any[]) => {
        listener(...args);
      };
      // Add the wrapped listener
      ipcRenderer.on(channel, wrappedListener);

      // Return a function to remove the listener
      return () => {
        ipcRenderer.removeListener(channel, wrappedListener);
      };
    },
    send: (channel: string, ...args: any[]) => {
      ipcRenderer.send(channel, ...args);
    },
    removeAllListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(channel);
    }
  }
})

contextBridge.exposeInMainWorld('api', api)
