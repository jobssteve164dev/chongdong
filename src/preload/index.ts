import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, data: any) => {
      ipcRenderer.send(channel, data);
    },
    on: (channel: string, func: (...args: any[]) => void) => {
      const validChannels = ['menu-new-config', 'menu-import-config', 'menu-about', 'proxy:portInUse'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (_event, ...args) => func(...args));
      }
    },
    invoke: (channel: string, ...args: any[]) => {
      return ipcRenderer.invoke(channel, ...args);
    },
  },
  require: (module: string) => {
    if (module === 'electron') {
      return { ipcRenderer };
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(module);
  },
});

console.log('Preload script loaded.');
