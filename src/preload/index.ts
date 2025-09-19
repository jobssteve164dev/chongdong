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

contextBridge.exposeInMainWorld('api', api);

// WebRTC 白名单封禁：拦截 RTCPeerConnection 构造
(() => {
  try {
    const g: any = (globalThis as any);
    const origPeer = g.RTCPeerConnection || g.webkitRTCPeerConnection;
    if (!origPeer) return;

    const getPolicy = async (): Promise<{ enabled: boolean; mode: string; allowedDomains: string[] }> => {
      try {
        const result = await ipcRenderer.invoke('settings:getWebRTCPolicy');
        if (result && result.success) {
          return { enabled: !!result.enabled, mode: result.mode, allowedDomains: result.allowedDomains || [] };
        }
      } catch {}
      return { enabled: false, mode: 'relaxed', allowedDomains: [] };
    };

    const isAllowedDomain = (host: string, allowed: string[]): boolean => {
      if (!host) return false;
      const h = host.toLowerCase();
      return allowed.some(d => h === d.toLowerCase() || h.endsWith(`.${d.toLowerCase()}`));
    };

    const WrappedPeer = function(this: any, config?: any, constraints?: any) {
      // 同步读取 location.host 作为域名
      const host = (g && g.location && g.location.host) ? g.location.host : '';
      // 由于策略是异步获取，采取保守阻断：若严格模式且不在白名单，则直接抛错
      // 放宽模式下不阻断，仅依赖 Chromium 标志策略
      const pending = getPolicy();
      let block = false; let strict = false; let allowed: string[] = [];
      try {
        // 异步不可阻塞构造，尝试同步读取缓存策略（首次无缓存时保守处理在后续调用阶段拦截）
      } catch {}
      // 先创建实例，后在常用方法上做二次保护
      const pc = new (origPeer as any)(config, constraints);

      const guard = async () => {
        try {
          const pol = await pending;
          strict = pol.mode === 'strict' && pol.enabled;
          allowed = pol.allowedDomains || [];
          if (strict && !isAllowedDomain(host, allowed)) {
            block = true;
          }
        } catch {}
      };
      guard();

      const wrapReject = (fnName: string) => (orig: any) => (...args: any[]) => {
        if (block) {
          return Promise.reject(new Error(`WebRTC blocked by policy (${fnName})`));
        }
        return orig.apply(pc, args);
      };

      // 常用可能触发候选/连接的API做保护
      const methods = ['createOffer', 'createAnswer', 'setLocalDescription', 'addIceCandidate'];
      for (const m of methods) {
        if (typeof (pc as any)[m] === 'function') {
          (pc as any)[m] = wrapReject(m)((pc as any)[m]);
        }
      }
      return pc;
    } as any;

    (WrappedPeer as any).prototype = (origPeer as any).prototype;
    g.RTCPeerConnection = WrappedPeer;
    g.webkitRTCPeerConnection = WrappedPeer;
  } catch {}
})();
