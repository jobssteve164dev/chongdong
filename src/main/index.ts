import { app, BrowserWindow, Menu, shell, ipcMain, Tray, nativeImage } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';

// 关闭硬件加速，规避 GPU 进程崩溃导致的白屏
try {
  app.disableHardwareAcceleration();
  console.log('已禁用硬件加速');
} catch (err) {
  console.warn('禁用硬件加速失败(可忽略):', err);
}

// 全局主窗口引用
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// 统一的显示主窗口函数
function showMainWindow(): void {
  try {
    if (!mainWindow) {
      console.warn('showMainWindow: mainWindow 不存在，尝试重新创建');
      createWindow();
    }

    if (!mainWindow) {
      console.error('showMainWindow: 无法创建主窗口');
      return;
    }

    // 如果窗口最小化则恢复
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    // 如果窗口不可见/被隐藏，则显示
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }

    // 将窗口置于前台并聚焦
    mainWindow.focus();
    console.log('showMainWindow: 窗口已显示并聚焦');
  } catch (error) {
    console.error('showMainWindow: 显示窗口失败:', error);
  }
}

// 读取用户偏好设置
function getUserPreferences() {
  try {
    return settingsManager.getPreferences();
  } catch (error) {
    console.error('Failed to read user preferences:', error);
    return {
      startMinimized: false,
      alwaysOnTop: false,
      autoHideMenuBar: true,
      minimizeToTray: true
    };
  }
}

// 创建系统托盘
function createTray(): void {
  try {
    console.log('开始创建系统托盘...');
    
    // 创建托盘图标（使用默认图标或创建一个简单的图标）
    let icon;
    try {
      icon = nativeImage.createFromPath(join(__dirname, '../renderer/assets/icon.png')).resize({ width: 16, height: 16 });
      console.log('使用自定义图标');
    } catch (error) {
      // 如果找不到图标文件，创建一个简单的图标
      console.log('使用默认托盘图标');
      icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAB8SURBVDiNY2AYBYMRMDIyMjAyMjL8//+f4f///wws0AqYGBkZGRgYGBj+//8P5v///5+BBaQYpBikCKoYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGAAAZqQZ8QAAAABJRU5ErkJggg==');
    }
    
    tray = new Tray(icon);
    console.log('托盘图标已创建');
    
    // 设置托盘菜单
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示所有窗口',
        click: () => {
          console.log('托盘菜单：显示所有窗口被点击');
          showMainWindow();
        }
      },
      {
        label: '隐藏',
        click: () => {
          console.log('托盘菜单：隐藏被点击');
          if (mainWindow) {
            mainWindow.hide();
          }
        }
      },
      {
        label: '退出',
        click: () => {
          console.log('托盘菜单：退出被点击');
          isQuitting = true;
          app.quit();
        }
      }
    ]);
    
    tray.setContextMenu(contextMenu);
    tray.setToolTip('虫洞代理');
    console.log('托盘菜单已设置');
    
    // 点击托盘图标显示窗口
    tray.on('click', () => {
      console.log('=== 托盘图标被点击 ===');
      console.log('mainWindow状态:', mainWindow ? '存在' : 'null');
      console.log('mainWindow是否可见:', mainWindow?.isVisible());
      console.log('mainWindow是否最小化:', mainWindow?.isMinimized());
      showMainWindow();
    });
    
    // 添加托盘右键菜单点击事件
    tray.on('right-click', () => {
      console.log('托盘图标右键被点击');
    });
    
    // 添加托盘双击事件
    tray.on('double-click', () => {
      console.log('托盘图标被双击');
      showMainWindow();
    });
    
    console.log('系统托盘已创建完成');
  } catch (error) {
    console.error('创建系统托盘失败:', error);
  }
}

function createWindow(): void {
  // 读取用户偏好设置
  const preferences = getUserPreferences();
  
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: preferences.autoHideMenuBar,
    // 暂时移除图标设置，避免找不到图标文件
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  // 封装加载入口页面，便于异常时重试
  const loadMainContents = () => {
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow?.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      mainWindow?.loadFile(join(__dirname, '../renderer/index.html'));
    }
  };

  mainWindow.on('ready-to-show', () => {
    // 始终创建托盘
    createTray();
    // 根据用户偏好决定是否启动时最小化
    const prefs = getUserPreferences();
    if (prefs.startMinimized) {
      console.log('应用启动时最小化（不显示窗口）');
      // 保持窗口隐藏，由托盘/激活事件唤起
    } else {
      console.log('应用启动时显示窗口');
      showMainWindow();
    }
    
    // 注释掉启动时最小化逻辑，等托盘功能修复后再启用
    // if (preferences.startMinimized) {
    //   console.log('应用启动时最小化');
    //   // 不显示窗口，但保持应用运行
    // } else {
    //   console.log('应用启动时显示窗口');
    //   mainWindow?.show();
    // }
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // 关键稳定性观测与自恢复
  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription) => {
    console.error('did-fail-load:', errorCode, errorDescription);
    setTimeout(() => loadMainContents(), 300);
  });

  // 渲染进程异常退出时，尝试自动恢复
  // @ts-ignore: Electron 提供的 details 类型随版本变化
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('render-process-gone:', details);
    setTimeout(() => loadMainContents(), 300);
  });

  // 窗口关闭事件处理
  mainWindow.on('close', (event) => {
    const preferences = getUserPreferences();
    if (preferences.minimizeToTray && !isQuitting) {
      // 如果设置了最小化到托盘，则隐藏窗口而不是关闭
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // 初次加载
  loadMainContents();

  // 设置应用菜单
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建配置',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu-new-config');
          },
        },
        {
          label: '导入配置',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu-import-config');
          },
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于虫洞',
          click: () => {
            mainWindow?.webContents.send('menu-about');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template as any);
  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.chongdong.app');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/quick-start/tree/master/packages/main-process
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      // 无论是否存在窗口，激活时都尝试显示主窗口
      showMainWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// 导入管理器
import { proxyManager } from './proxyManager';
import { systemProxyManager } from './systemProxyManager';
import { coreDownloader } from './coreDownloader';
import { settingsManager } from './settingsManager';

// 基础IPC处理程序
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-name', () => {
  return app.getName();
});

ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});

// 核心下载IPC处理程序
ipcMain.handle('core:download', async (_, coreName) => {
  try {
    await coreDownloader.downloadCore(coreName);
    return { success: true };
  } catch (error) {
    console.error(`Failed to download core ${coreName}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('core:downloadDatabase', async (_, dbName) => {
  try {
    await coreDownloader.downloadDatabase(dbName);
    return { success: true };
  } catch (error) {
    console.error(`Failed to download database ${dbName}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('core:getStatus', async () => {
  try {
    return coreDownloader.getCoresStatus();
  } catch (error) {
    console.error('Failed to get core status:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('core:isInstalled', (_, coreName) => {
  return coreDownloader.isCoreInstalled(coreName);
});

// 代理引擎IPC处理程序
ipcMain.handle('proxy:startSingbox', async (_, config) => {
  try {
    await proxyManager.startSingbox(config);
    return { success: true };
  } catch (error) {
    console.error('Failed to start Sing-box:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('proxy:startXray', async (_, config) => {
  try {
    await proxyManager.startXray(config);
    return { success: true };
  } catch (error) {
    console.error('Failed to start Xray:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('proxy:startClash', async (_, config) => {
  try {
    await proxyManager.startClash(config);
    return { success: true };
  } catch (error) {
    console.error('Failed to start Clash:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('proxy:stop', async () => {
  try {
    await proxyManager.stopAll();
    return { success: true };
  } catch (error) {
    console.error('Failed to stop proxy:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('proxy:getStats', async () => {
  try {
    return await proxyManager.getStats();
  } catch (error) {
    console.error('Failed to get proxy stats:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// 系统代理IPC处理程序
ipcMain.handle('system:setProxy', async (_, { host, port }) => {
  try {
    await systemProxyManager.setSystemProxy(host, port);
    return { success: true };
  } catch (error) {
    console.error('Failed to set system proxy:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('system:clearProxy', async () => {
  try {
    await systemProxyManager.clearSystemProxy();
    return { success: true };
  } catch (error) {
    console.error('Failed to clear system proxy:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('system:getProxy', async () => {
  try {
    return await systemProxyManager.getSystemProxy();
  } catch (error) {
    console.error('Failed to get system proxy:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// 端口占用处理
ipcMain.handle('proxy:killProcessOnPort', async (_, port) => {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    // 查找占用端口的进程
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    if (stdout.trim()) {
      const pids = stdout.trim().split('\n');
      for (const pid of pids) {
        console.log(`终止进程 ${pid} (占用端口 ${port})`);
        await execAsync(`kill -9 ${pid}`);
      }
      return { success: true, message: `已终止占用端口 ${port} 的进程` };
    } else {
      return { success: false, message: `未找到占用端口 ${port} 的进程` };
    }
  } catch (error) {
    console.error('Failed to kill process on port:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('vpn:create', async (_, config) => {
  try {
    await systemProxyManager.createVPNConnection(config);
    return { success: true };
  } catch (error) {
    console.error('Failed to create VPN:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('vpn:connect', async (_, name) => {
  try {
    await systemProxyManager.connectVPN(name);
    return { success: true };
  } catch (error) {
    console.error('Failed to connect VPN:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('vpn:disconnect', async (_, name) => {
  try {
    await systemProxyManager.disconnectVPN(name);
    return { success: true };
  } catch (error) {
    console.error('Failed to disconnect VPN:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('vpn:getStatus', async () => {
  try {
    // 简化版本，实际应该检查VPN连接状态
    return { connected: false };
  } catch (error) {
    console.error('Failed to get VPN status:', error);
    return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('system:checkPermissions', async () => {
  try {
    return await systemProxyManager.checkPermissions();
  } catch (error) {
    console.error('Failed to check permissions:', error);
    return { admin: false, network: false, vpn: false };
  }
});

ipcMain.handle('system:requestAdmin', async () => {
  try {
    // 简化版本，实际应该请求管理员权限
    return false;
  } catch (error) {
    console.error('Failed to request admin:', error);
    return false;
  }
});

// 订阅管理IPC处理程序
ipcMain.handle('subscription:parse', async (_event, _url: string) => {
  try {
    // 这里应该调用订阅管理器的解析功能
    // 由于订阅管理器在渲染进程中，这里只是占位
    return { success: true, servers: [], groups: [] };
  } catch (error) {
    console.error('Failed to parse subscription:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// 窗口控制IPC处理程序
ipcMain.handle('window:setAlwaysOnTop', async (_, alwaysOnTop: boolean) => {
  try {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(alwaysOnTop);
      console.log(`窗口置顶设置已更新: ${alwaysOnTop}`);
      return { success: true };
    } else {
      return { success: false, error: '主窗口未找到' };
    }
  } catch (error) {
    console.error('Failed to set always on top:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('window:setAutoHideMenuBar', async (_, autoHideMenuBar: boolean) => {
  try {
    if (mainWindow) {
      mainWindow.setAutoHideMenuBar(autoHideMenuBar);
      console.log(`菜单栏自动隐藏设置已更新: ${autoHideMenuBar}`);
      return { success: true };
    } else {
      return { success: false, error: '主窗口未找到' };
    }
  } catch (error) {
    console.error('Failed to set auto hide menu bar:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('window:minimize', async () => {
  try {
    if (mainWindow) {
      mainWindow.minimize();
      return { success: true };
    } else {
      return { success: false, error: '主窗口未找到' };
    }
  } catch (error) {
    console.error('Failed to minimize window:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('window:show', async () => {
  try {
    showMainWindow();
    return { success: true };
  } catch (error) {
    console.error('Failed to show window:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// 显示主窗口（用于托盘菜单）
ipcMain.handle('window:showFromTray', async () => {
  try {
    showMainWindow();
    return { success: true };
  } catch (error) {
    console.error('Failed to show window from tray:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// 测试托盘功能
ipcMain.handle('tray:test', async () => {
  try {
    console.log('=== 测试托盘功能 ===');
    console.log('托盘对象存在:', tray ? '是' : '否');
    console.log('主窗口存在:', mainWindow ? '是' : '否');
    console.log('主窗口是否可见:', mainWindow?.isVisible());
    console.log('主窗口是否最小化:', mainWindow?.isMinimized());
    
    if (tray) {
      console.log('托盘图标已创建，尝试显示菜单');
      // 强制显示托盘菜单
      tray.popUpContextMenu();
      return { success: true, message: '托盘测试完成，请查看控制台日志' };
    } else {
      return { success: false, error: '托盘对象不存在' };
    }
  } catch (error) {
    console.error('托盘测试失败:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// 设置更新通知
ipcMain.handle('settings:updated', async (_, settings: any) => {
  try {
    console.log('收到设置更新通知:', settings);
    
    // 保存设置到文件
    if (settings.settings) {
      settingsManager.saveSettings(settings.settings);
    }
    if (settings.preferences) {
      settingsManager.savePreferences(settings.preferences);
    }
    
    // 应用窗口设置
    if (mainWindow && settings.preferences) {
      const { alwaysOnTop, autoHideMenuBar } = settings.preferences;
      
      if (alwaysOnTop !== undefined) {
        mainWindow.setAlwaysOnTop(alwaysOnTop);
        console.log('窗口置顶设置已更新:', alwaysOnTop);
      }
      
      if (autoHideMenuBar !== undefined) {
        mainWindow.setAutoHideMenuBar(autoHideMenuBar);
        console.log('菜单栏自动隐藏设置已更新:', autoHideMenuBar);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to apply settings:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('subscription:update', async (_event, _subscription: any) => {
  try {
    // 这里应该调用订阅管理器的更新功能
    return { success: true, servers: [], groups: [] };
  } catch (error) {
    console.error('Failed to update subscription:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// 监控统计IPC处理程序
ipcMain.handle('monitor:get-stats', async () => {
  try {
    // 这里应该调用监控管理器的统计功能
    return {
      trafficStats: {
        upload: 0,
        download: 0,
        uploadSpeed: 0,
        downloadSpeed: 0,
        timestamp: Date.now()
      },
      connectionStatus: {
        connected: false,
        upload: 0,
        download: 0,
        uploadSpeed: 0,
        downloadSpeed: 0
      }
    };
  } catch (error) {
    console.error('Failed to get monitor stats:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('monitor:get-history', async (_event, _limit: number = 100) => {
  try {
    // 这里应该调用监控管理器的历史记录功能
    return { history: [] };
  } catch (error) {
    console.error('Failed to get monitor history:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('network:getInterfaces', async () => {
  try {
    return systemProxyManager.getNetworkInterfaces();
  } catch (error) {
    console.error('Failed to get network interfaces:', error);
    return [];
  }
});

ipcMain.handle('network:getStatus', async () => {
  try {
    // 简化版本，实际应该获取网络状态
    const interfaces = systemProxyManager.getNetworkInterfaces();
    return {
      connected: interfaces.length > 0,
      type: 'ethernet',
      interface: interfaces[0]?.name || '',
      ip: interfaces[0]?.address || ''
    };
  } catch (error) {
    console.error('Failed to get network status:', error);
    return { connected: false, type: 'unknown', interface: '', ip: '' };
  }
});
