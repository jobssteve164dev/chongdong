// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// Custom APIs for renderer
const api = {
  // ... any other APIs you want to expose
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
