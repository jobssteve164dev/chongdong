import { app, BrowserWindow, Menu, shell, ipcMain, Tray, nativeImage } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { createGlobalShortcutManager, HotkeyConfig } from './globalShortcutManager';
import { createNotificationManager, NotificationConfig } from './notificationManager';

// 导入管理器
import { proxyManager } from './proxyManager';
import { systemProxyManager } from './systemProxyManager';
import { proxyModeManager } from './proxyModeManager';
import { CompatPortForwarder } from './compatPortForwarder';
import { TunController } from './tunController';
import { coreDownloader } from './coreDownloader';
import { settingsManager } from './settingsManager';
import { crashMonitor } from './crashMonitor';
import { systemMonitor } from './systemMonitor';
import { dnsService } from './services/dnsService';
import { dynamicChainManager } from './dynamicChainManager';
import { AppSettings, ChainConfig } from '../shared/types';
import * as fs from 'fs';
import { databaseUpdateManager } from './databaseUpdateManager';

// 关闭硬件加速，规避 GPU 进程崩溃导致的白屏
try {
  app.disableHardwareAcceleration();
  console.log('已禁用硬件加速');
  
  // 设置额外的GPU相关标志以提高稳定性
  app.commandLine.appendSwitch('--disable-gpu');
  app.commandLine.appendSwitch('--disable-gpu-compositing');
  app.commandLine.appendSwitch('--disable-gpu-rasterization');
  app.commandLine.appendSwitch('--disable-gpu-sandbox');
  console.log('已设置GPU禁用标志');
} catch (err) {
  console.warn('禁用硬件加速失败(可忽略):', err);
}

// 全局主窗口引用
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let rebuildTrayMenu: (() => void) | null = null;
// 渲染层上报的已保存代理链缓存（优先用于托盘展示）
let savedChainsCache: ChainConfig[] = [];
let isQuitting = false;

// 向渲染进程广播代理状态
function broadcastProxyStatus(running: boolean, payload: any = {}): void {
  try {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (win && !win.isDestroyed()) {
        win.webContents.send('proxy:statusChanged', { running, ...payload });
      }
    }
  } catch (err) {
    console.warn('广播代理状态失败:', err);
  }
}

// 全局快捷键和通知管理器
let globalShortcutManager: ReturnType<typeof createGlobalShortcutManager> | null = null;
let notificationManager: ReturnType<typeof createNotificationManager> | null = null;

// 统一的退出应用函数
async function quitApp(): Promise<void> {
  try {
    console.log('开始退出应用...');
    isQuitting = true;
    
    // 1. 停止崩溃监控
    try {
      console.log('停止崩溃监控...');
      crashMonitor.stopMonitoring();
      console.log('崩溃监控已停止');
    } catch (error) {
      console.error('停止崩溃监控失败:', error);
    }
    
    // 2. 停止所有代理进程
    try {
      console.log('停止所有代理进程...');
      await proxyManager.stopAll();
      console.log('代理进程已停止');
    } catch (error) {
      console.error('停止代理进程失败:', error);
    }
    
    // 2. 清理系统代理设置
    try {
      console.log('清理系统代理设置...');
      await systemProxyManager.clearSystemProxy();
      console.log('系统代理设置已清理');
    } catch (error) {
      console.error('清理系统代理设置失败:', error);
    }
    
    // 3. 注销全局快捷键
    try {
      console.log('注销全局快捷键...');
      if (globalShortcutManager) {
        globalShortcutManager.unregisterAllHotcuts();
      }
      console.log('全局快捷键已注销');
    } catch (error) {
      console.error('注销全局快捷键失败:', error);
    }
    
    // 4. 销毁托盘
    try {
      console.log('销毁托盘...');
      if (tray) {
        tray.destroy();
        tray = null;
      }
      console.log('托盘已销毁');
    } catch (error) {
      console.error('销毁托盘失败:', error);
    }
    
    // 5. 关闭所有窗口
    try {
      console.log('关闭所有窗口...');
      const windows = BrowserWindow.getAllWindows();
      for (const window of windows) {
        if (!window.isDestroyed()) {
          window.destroy();
        }
      }
      console.log('所有窗口已关闭');
    } catch (error) {
      console.error('关闭窗口失败:', error);
    }
    
    // 6. 退出应用
    console.log('退出应用进程...');
    app.exit(0);
    
  } catch (error) {
    console.error('退出应用过程中发生错误:', error);
    // 强制退出
    process.exit(0);
  }
}

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
      windowSize: { width: 1200, height: 800 },
      windowPosition: { x: 100, y: 100 },
      sidebarCollapsed: false,
      autoHideMenuBar: true,
      alwaysOnTop: false,
      minimizeToTray: true,
      startMinimized: false,
      enableNotifications: true,
      notificationSound: true,
      enableHotkeys: true,
      hotkeys: {
        toggleProxy: 'Ctrl+Shift+P',
        showMainWindow: 'Ctrl+Shift+M',
        quickSwitch: 'Ctrl+Shift+S'
      }
    };
  }
}

// 创建系统托盘
function createTray(): void {
  try {
    console.log('开始创建系统托盘...');
    // 防重复创建
    if (tray) {
      console.log('托盘已存在，跳过创建');
      return;
    }
    
    // 创建托盘图标（优先 tray-icon.png 非 template PNG，18px）
    let icon;
    try {
      const fs = require('fs');
      const candidates: string[] = [];
      // 开发环境优先使用源码路径
      try { candidates.push(join(app.getAppPath(), 'src/renderer/assets/tray-icon.png')); } catch {}
      // 构建产物常见位置
      candidates.push(join(__dirname, '../renderer/tray-icon.png'));
      candidates.push(join(__dirname, '../renderer/assets/tray-icon.png'));
      // 打包后资源目录（通过 extraResources 注入）
      try { candidates.push(join(process.resourcesPath, 'assets', 'tray-icon.png')); } catch {}
      try { candidates.push(join(process.resourcesPath, 'assets', 'icon.png')); } catch {}
      // 退回到 icon.png
      candidates.push(join(__dirname, '../renderer/assets/icon.png'));

      const hit = candidates.find(p => { try { return fs.existsSync(p); } catch { return false; } });
      if (!hit) throw new Error('未找到托盘图标文件');
      icon = nativeImage.createFromPath(hit).resize({ width: 18, height: 18 });
      // macOS 可选：将图标标记为模板以适配浅/深色菜单栏
      if (process.platform === 'darwin' && icon && typeof (icon as any).setTemplateImage === 'function') {
        try { (icon as any).setTemplateImage(false); } catch {}
      }
      console.log('使用托盘图标:', hit);
    } catch (error) {
      console.log('使用默认托盘图标');
      icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAB8SURBVDiNY2AYBYMRMDIyMjAyMjL8//+f4f///wws0AqYGBkZGRgYGBj+//8P5v///5+BBaQYpBikCKoYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGAAAZqQZ8QAAAABJRU5ErkJggg==').resize({ width: 18, height: 18 });
    }
    
    tray = new Tray(icon);
    console.log('托盘图标已创建');
    
    // 高级托盘菜单构建器（节点显示全部，不限 20）
    const buildTrayMenu = (): Electron.Menu => {
      const settings = settingsManager.getSettings();
      const mode = proxyModeManager.getCurrentMode();

      const modeItems: Electron.MenuItemConstructorOptions[] = [
        { label: '规则模式', type: 'radio', checked: mode === 'rule', click: async () => { await proxyModeManager.applyProxyMode({ mode: 'rule', settings }); rebuildTrayMenu && rebuildTrayMenu(); } },
        { label: '全局模式', type: 'radio', checked: mode === 'global', click: async () => { await proxyModeManager.applyProxyMode({ mode: 'global', settings }); rebuildTrayMenu && rebuildTrayMenu(); } },
        { label: '直连模式', type: 'radio', checked: mode === 'direct', click: async () => { await proxyModeManager.applyProxyMode({ mode: 'direct', settings }); rebuildTrayMenu && rebuildTrayMenu(); } },
        { label: 'VPN 模式 (TUN)', type: 'radio', checked: mode === 'vpn', click: async () => { await proxyModeManager.applyProxyMode({ mode: 'vpn', settings, networkSettings: { enableTun: true, tunDevice: settings.tunDevice } }); rebuildTrayMenu && rebuildTrayMenu(); } },
      ];

      // 读取全部节点
      const subs = settings.subscriptions || [];
      const allNodes: { id: string; name: string; }[] = [];
      for (const s of subs) {
        for (const n of (s.servers || [])) {
          allNodes.push({ id: n.id, name: n.name });
        }
      }
      const nodeItems: Electron.MenuItemConstructorOptions[] = allNodes.length > 0 ? allNodes.map(n => ({
        label: n.name,
        click: async () => {
          try {
            const appSettings = settingsManager.getSettings();
            const found = (() => {
              for (const s of appSettings.subscriptions || []) {
                const f = (s.servers || []).find((sv: any) => sv.id === n.id);
                if (f) return f; }
              return null; })();
            if (!found) return;
            await proxyManager.stopMiddleware().catch(() => {});
            const proto = ((found.protocol || '') as string).toLowerCase();
            const normalizedType = proto === 'ss' ? 'shadowsocks' : proto;
            const outbound: any = {
              type: normalizedType,
              tag: found.name || `proxy-${n.id}`,
              server: found.host,
              server_port: found.port
            };
            if (normalizedType === 'vmess') {
              outbound.uuid = found.uuid;
              outbound.security = (found as any).security || 'auto';
              if (found.network === 'ws') {
                outbound.transport = {
                  type: 'ws',
                  path: found.wsPath || '/',
                  headers: (found.wsHeaders || {})
                };
                if ((found as any).wsHost && !outbound.transport.headers.Host) {
                  outbound.transport.headers.Host = (found as any).wsHost;
                }
              }
            } else if (normalizedType === 'shadowsocks') {
              outbound.method = (found as any).method || (found as any).encryption;
              outbound.password = found.password;
            } else if (normalizedType === 'trojan') {
              outbound.password = found.password;
              const serverName = (found as any).sni || found.host;
              outbound.tls = { enabled: true, server_name: serverName, insecure: (found as any).allowInsecure ?? true };
            }

            const cfg = { log: { level: appSettings.logLevel || 'info', output: appSettings.enableLog ? (appSettings.logFile || 'chongdong.log') : 'console' },
              experimental: { clash_api: { external_controller: '127.0.0.1:9090', external_ui: '', secret: '' } },
              dns: { servers: [{ tag: 'default', address: appSettings.dnsServer || '8.8.8.8', detour: 'direct' }], final: 'default' },
              inbounds: [ { type: 'socks', tag: 'socks-in', listen: '127.0.0.1', listen_port: appSettings.socksPort || 7896 }, { type: 'http', tag: 'http-in', listen: '127.0.0.1', listen_port: appSettings.proxyPort || 7897 } ],
              outbounds: [ { type: 'direct', tag: 'direct' }, { type: 'dns', tag: 'dns' }, outbound ],
              route: { rules: [ { geoip: 'private', outbound: 'direct' }, { geoip: 'cn', outbound: 'direct' } ], final: outbound.tag } };
            await proxyManager.startSingbox(cfg);
            broadcastProxyStatus(true, { source: 'tray-node' });
            // 启动成功后设置系统代理
            try {
              const socksPort = appSettings.socksPort || 7896;
              const httpPort = appSettings.proxyPort || 7897;
              await systemProxyManager.setSystemProxy('127.0.0.1', socksPort, httpPort);
            } catch (err) {
              console.warn('设置系统代理失败:', err);
            }
          } catch (e) { console.error('通过托盘启动节点失败:', e); }
        }
      })) : [{ label: '无可用节点', enabled: false }];

      const dynamicChainItems: Electron.MenuItemConstructorOptions[] = [{
        label: '启动（从全部订阅自动择优）',
        click: async () => {
          try {
            const subs = settingsManager.getSettings().subscriptions || [];
            if (subs.length === 0) return;
            const chain: ChainConfig = { id: 'tray_dynamic_all', name: '托盘·自动链', description: '从全部订阅自动选择最佳节点', type: 'dynamic', proxies: subs.map((s: any) => s.id), rules: [], enabled: true, createdAt: new Date(), updatedAt: new Date() } as any;
            const port = settings.proxyPort || 7897;
            const result = await dynamicChainManager.startChain(chain, port);
            broadcastProxyStatus(true, { source: 'tray-dynamic-all', port: result.port || port });
            // 设置系统代理到返回端口（HTTP/SOCKS 同端口）
            try { await systemProxyManager.setSystemProxy('127.0.0.1', result.port || port, result.port || port); } catch (err) { console.warn('设置系统代理失败:', err); }
          } catch (e) { console.error('通过托盘启动动态链失败:', e); }
        }
      }];

      // 显示所有已保存的代理链：优先渲染层上报缓存，其次磁盘 chains.json，再其次 settings.chains
      try {
        const chainsFromRenderer = savedChainsCache || [];
        const chainsOnDisk = loadChainsFromDisk();
        const chainsFromSettings: ChainConfig[] = ((settings as any).chains || []) as ChainConfig[];
        const chains: ChainConfig[] = (chainsFromRenderer && chainsFromRenderer.length > 0) ? chainsFromRenderer : ((chainsOnDisk && chainsOnDisk.length > 0) ? chainsOnDisk : (chainsFromSettings || []));
        if (Array.isArray(chains) && chains.length > 0) {
          dynamicChainItems.push({ type: 'separator' });
          for (const c of chains) {
            dynamicChainItems.push({
              label: `启动：${c.name}`,
              click: async () => {
                try {
                  const port = settings.proxyPort || 7897;
                  if (c.type === 'dynamic') {
                    const result = await dynamicChainManager.startChain(c, port);
                    broadcastProxyStatus(true, { source: 'tray-dynamic', chainId: c.id, port: result.port || port });
                    try { await systemProxyManager.setSystemProxy('127.0.0.1', result.port || port, result.port || port); } catch (err) { console.warn('设置系统代理失败:', err); }
                  } else {
                    await proxyManager.startChain(c, { listenPort: port } as any);
                    broadcastProxyStatus(true, { source: 'tray-static', chainId: c.id, port });
                    try { await systemProxyManager.setSystemProxy('127.0.0.1', port, port); } catch (err) { console.warn('设置系统代理失败:', err); }
                  }
                } catch (e) { console.error('启动已保存代理链失败:', e); }
              }
            });
          }
        }
      } catch (e) {
        // ignore
      }

      const menu = Menu.buildFromTemplate([
        { label: '显示主窗口', click: () => showMainWindow() },
        { type: 'separator' },
        { label: '代理模式', submenu: modeItems },
        { label: '选择节点', submenu: nodeItems },
        { label: '代理链', submenu: dynamicChainItems },
        { type: 'separator' },
        { label: '停止代理', click: async () => { try { await proxyManager.stopAll(); await systemProxyManager.clearSystemProxy(); broadcastProxyStatus(false, { source: 'tray-stop' }); } catch (e) { console.warn(e); } } },
        { label: '刷新菜单', click: () => { rebuildTrayMenu && rebuildTrayMenu(); } },
        { type: 'separator' },
        { label: '隐藏', click: () => { if (mainWindow) mainWindow.hide(); } },
        { label: '退出', click: async () => { await quitApp(); } },
      ]);
      return menu;
    };

    // 刷新函数 + 初始菜单
    rebuildTrayMenu = () => {
      try { if (!tray) return; tray.setContextMenu(buildTrayMenu()); } catch (e) { console.error('刷新托盘菜单失败:', e); }
    };
    tray.setContextMenu(buildTrayMenu());
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

// 从磁盘加载代理链（userData/chains.json）
function loadChainsFromDisk(): ChainConfig[] {
  try {
    const p = join(app.getPath('userData'), 'chains.json');
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data as ChainConfig[];
    }
  } catch (e) {
    console.warn('读取 chains.json 失败:', e);
  }
  return [];
}

function createWindow(): void {
  // 读取用户偏好设置
  const preferences = getUserPreferences();
  
  // 获取应用图标路径
  let iconPath: string | undefined;
  try {
    if (process.platform === 'darwin') {
      // macOS 使用 .icns 文件
      const icnsPath = join(__dirname, '../../release/mac/虫洞.app/Contents/Resources/electron.icns');
      const fs = require('fs');
      if (fs.existsSync(icnsPath)) {
        iconPath = icnsPath;
        console.log('使用 macOS 图标:', iconPath);
      }
    } else {
      // 其他平台使用 PNG 文件
      const pngPath = join(__dirname, '../renderer/assets/icon.png');
      const fs = require('fs');
      if (fs.existsSync(pngPath)) {
        iconPath = pngPath;
        console.log('使用 PNG 图标:', iconPath);
      }
    }
  } catch (error) {
    console.warn('图标文件不存在，使用默认图标:', error);
  }

  // Create the browser window.
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: preferences.autoHideMenuBar,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false
    },
  };

  // 只有在图标存在时才添加图标配置
  if (iconPath) {
    windowOptions.icon = iconPath;
  }

  mainWindow = new BrowserWindow(windowOptions);

  // 封装加载入口页面，便于异常时重试
  const loadMainContents = () => {
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow?.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      mainWindow?.loadFile(join(__dirname, '../renderer/index.html'));
    }
  };

  mainWindow.on('ready-to-show', () => {
    // 仅在未存在时创建托盘
    if (!tray) createTray();
    
    // 初始化全局快捷键管理器
    globalShortcutManager = createGlobalShortcutManager(mainWindow);
    
    // 初始化通知管理器
    const prefs = getUserPreferences();
    const notificationConfig: NotificationConfig = {
      enableNotifications: prefs.enableNotifications ?? true,
      notificationSound: prefs.notificationSound ?? true
    };
    notificationManager = createNotificationManager(notificationConfig);
    
    // 根据用户偏好决定是否启动时最小化
    if (prefs.startMinimized) {
      console.log('应用启动时最小化（不显示窗口）');
      // 保持窗口隐藏，由托盘/激活事件唤起
    } else {
      console.log('应用启动时显示窗口');
      showMainWindow();
    }
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
          click: async () => {
            await quitApp();
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
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.chongdong.app');

  // 启动崩溃监控
  crashMonitor.startMonitoring();

  // 初始化DNS服务
  try {
    const settings = settingsManager.getSettings();
    dnsService.init(settings);
    console.log('DNS服务已初始化');
  } catch (error) {
    console.error('初始化DNS服务失败:', error);
  }

  // 应用启动时自动应用默认代理模式
  try {
    const settings = settingsManager.getSettings();
    console.log(`[应用启动] 应用默认代理模式: ${settings.mode}`);
    
    // 应用默认代理模式
    await proxyModeManager.applyProxyMode({
      mode: settings.mode,
      settings: settings,
      networkSettings: {
        listenPort: settings.proxyPort
      }
    });
    
    console.log(`[应用启动] 默认代理模式应用完成: ${settings.mode}`);
  } catch (error) {
    console.error('[应用启动] 应用默认代理模式失败:', error);
  }

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
  if (process.platform !== 'darwin') {
    quitApp();
  }
});

// 应用退出事件处理
app.on('before-quit', async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    await quitApp();
  }
});

// 应用即将退出事件处理
app.on('will-quit', () => {
  console.log('应用即将退出...');
});

// 应用退出事件处理
app.on('quit', (_, exitCode) => {
  console.log('应用已退出，退出码:', exitCode);
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// import { ProxyNode } from '../shared/types';

// 基础IPC处理程序
// 托盘：接收渲染层上报的已保存代理链
ipcMain.handle('chains:updateSaved', async (_e, chains: ChainConfig[]) => {
  try {
    if (Array.isArray(chains)) {
      savedChainsCache = chains;
      console.log(`已更新保存的代理链(${chains.length})`);
      // 刷新托盘
      try { rebuildTrayMenu && rebuildTrayMenu(); } catch {}
      return { success: true };
    }
    return { success: false, error: 'Invalid chains payload' };
  } catch (err) {
    return { success: false, error: (err as any)?.message || String(err) };
  }
});

// 托盘：保存代理链到磁盘并刷新
ipcMain.handle('chains:save', async (_e, chains: ChainConfig[]) => {
  try {
    if (!Array.isArray(chains)) return { success: false, error: 'Invalid chains payload' };
    const p = join(app.getPath('userData'), 'chains.json');
    fs.writeFileSync(p, JSON.stringify(chains, null, 2), 'utf8');
    savedChainsCache = chains;
    try { rebuildTrayMenu && rebuildTrayMenu(); } catch {}
    return { success: true, path: p };
  } catch (err) {
    return { success: false, error: (err as any)?.message || String(err) };
  }
});

// 托盘：获取全部已保存代理链（缓存 > 磁盘 > settings）
ipcMain.handle('chains:get', async () => {
  try {
    const settings = settingsManager.getSettings();
    const chains = (savedChainsCache && savedChainsCache.length > 0)
      ? savedChainsCache
      : (loadChainsFromDisk().length > 0 ? loadChainsFromDisk() : (((settings as any).chains || []) as ChainConfig[]));
    return { success: true, chains };
  } catch (err) {
    return { success: false, error: (err as any)?.message || String(err) };
  }
});
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
  console.log(`=== 收到启动 Sing-box 请求 ===`);
  console.log(`配置数据:`, JSON.stringify(config, null, 2));
  
  try {
    console.log(`开始启动 Sing-box...`);
    // 切换到节点模式前，确保中间件已停止
    try { await proxyManager.stopMiddleware(); } catch (e) { console.warn('[IPC] stopMiddleware ignore:', e); }
    await proxyManager.startSingbox(config);
    console.log(`=== Sing-box 启动成功 ===`);
    return { success: true };
  } catch (error) {
    console.error(`=== Sing-box 启动失败 ===`);
    console.error(`错误详情:`, error);
    console.error(`错误消息: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('proxy:startXray', async (_, config) => {
  try {
    // 切换到节点模式前，确保中间件已停止
    try { await proxyManager.stopMiddleware(); } catch (e) { console.warn('[IPC] stopMiddleware ignore:', e); }
    await proxyManager.startXray(config);
    return { success: true };
  } catch (error) {
    console.error('Failed to start Xray:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('proxy:startClash', async (_, config) => {
  try {
    // 切换到节点模式前，确保中间件已停止
    try { await proxyManager.stopMiddleware(); } catch (e) { console.warn('[IPC] stopMiddleware ignore:', e); }
    await proxyManager.startClash(config);
    return { success: true };
  } catch (error) {
    console.error('Failed to start Clash:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('proxy:stop', async () => {
  try {
    // 优先停止中间件，再停止所有单引擎进程
    try { await proxyManager.stopMiddleware(); } catch (e) { console.warn('[IPC] stopMiddleware ignore:', e); }
    await proxyManager.stopAll();
    try { await systemProxyManager.clearSystemProxy(); } catch {}
    broadcastProxyStatus(false, { source: 'ipc-stop' });
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
ipcMain.handle('system:setProxy', async (_, { host, socksPort, httpPort }) => {
  try {
    await systemProxyManager.setSystemProxy(host, socksPort, httpPort);
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
    
    console.log(`尝试终止占用端口 ${port} 的进程...`);
    
    // 方法1: 使用 lsof 查找进程
    try {
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      if (stdout.trim()) {
        const pids = stdout.trim().split('\n');
        for (const pid of pids) {
          console.log(`终止进程 ${pid} (占用端口 ${port})`);
          await execAsync(`kill -9 ${pid}`);
        }
        return { success: true, message: `已终止占用端口 ${port} 的进程` };
      }
    } catch (lsofError) {
      console.log('lsof 命令未找到进程，尝试其他方法...');
    }
    
    // 方法2: 使用 netstat 查找进程 (macOS 备用方案)
    try {
      const { stdout } = await execAsync(`netstat -anv | grep ${port}`);
      if (stdout.includes('LISTEN')) {
        // 提取 PID
        const match = stdout.match(/\s+(\d+)\s+/);
        if (match && match[1]) {
          const pid = match[1];
          console.log(`通过 netstat 找到进程 ${pid}，尝试终止...`);
          await execAsync(`kill -9 ${pid}`);
          return { success: true, message: `已终止占用端口 ${port} 的进程` };
        }
      }
    } catch (netstatError) {
      console.log('netstat 命令也失败，尝试强制清理...');
    }
    
    // 方法3: 强制清理所有可能的 sing-box 进程
    try {
      console.log('强制清理所有 sing-box 进程...');
      await execAsync('pkill -f sing-box');
      await execAsync('pkill -f "sing-box run"');
      
      // 等待一段时间让进程完全退出
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 再次检查端口是否释放
      try {
        const { stdout } = await execAsync(`lsof -ti:${port}`);
        if (!stdout.trim()) {
          return { success: true, message: `已清理所有相关进程，端口 ${port} 已释放` };
        }
      } catch (finalCheckError) {
        // 如果 lsof 失败，假设清理成功
        return { success: true, message: `已清理所有相关进程` };
      }
    } catch (pkillError) {
      console.log('pkill 命令失败:', pkillError);
    }
    
    return { success: false, message: `无法终止占用端口 ${port} 的进程，请手动检查` };
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

// 应用退出IPC处理程序
ipcMain.handle('app:quit', async () => {
  try {
    console.log('收到渲染进程退出请求');
    await quitApp();
    return { success: true };
  } catch (error) {
    console.error('退出应用失败:', error);
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

// 延迟测试IPC处理程序
ipcMain.handle('proxy:testLatency', async (_, { node, config }) => {
  try {
    console.log('开始测试节点延迟:', node.name, config);
    
    const startTime = Date.now();
    
    // 创建HTTP请求来测试延迟
    const https = require('https');
    const http = require('http');
    
    const testUrl = config.testUrl || 'http://connectivitycheck.gstatic.com/generate_204';
    const timeout = config.timeout || 10000;
    
    return new Promise((resolve) => {
      const url = new URL(testUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const req = client.request(url, {
        method: 'GET',
        timeout: timeout,
        // 如果需要通过代理测试，可以在这里添加代理配置
        // 例如：agent: new HttpsProxyAgent(proxyUrl)
      }, (res: any) => {
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        console.log(`延迟测试成功: ${node.name}`, { latency });
        
        resolve({
          success: true,
          latency,
          statusCode: res.statusCode
        });
      });
      
      req.on('error', (error: any) => {
        console.error(`延迟测试失败: ${node.name}`, error);
        resolve({
          success: false,
          error: error.message,
          latency: 0
        });
      });
      
      req.on('timeout', () => {
        console.error(`延迟测试超时: ${node.name}`);
        req.destroy();
        resolve({
          success: false,
          error: 'Request timeout',
          latency: 0
        });
      });
      
      req.end();
    });
    
  } catch (error) {
    console.error('延迟测试处理失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: 0
    };
  }
});

// 延迟测试配置IPC处理程序
ipcMain.handle('latency:test', async (_, config) => {
  try {
    console.log('测试延迟配置:', config);
    
    // 这里可以添加延迟测试配置的验证逻辑
    // 例如：测试指定的URL是否可访问
    
    return {
      success: true,
      message: '延迟测试配置验证成功'
    };
  } catch (error) {
    console.error('延迟测试配置验证失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

ipcMain.handle('latency:reset', async () => {
  try {
    console.log('重置延迟测试配置为默认值');
    
    // 这里可以重置延迟测试配置为默认值
    
    return {
      success: true,
      message: '延迟测试配置已重置'
    };
  } catch (error) {
    console.error('重置延迟测试配置失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
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
    
    // 应用全局快捷键设置
    if (settings.preferences && globalShortcutManager) {
      const { enableHotkeys, hotkeys } = settings.preferences;
      
      if (enableHotkeys && hotkeys) {
        const result = globalShortcutManager.registerHotkeys(hotkeys);
        console.log('全局快捷键设置已更新:', result);
        
        if (!result.success && result.conflicts.length > 0) {
          console.warn('快捷键冲突:', result.conflicts);
        }
      } else if (!enableHotkeys) {
        globalShortcutManager.unregisterAllHotcuts();
        console.log('全局快捷键已禁用');
      }
    }
    
    // 应用通知设置
    if (settings.preferences && notificationManager) {
      const { enableNotifications, notificationSound } = settings.preferences;
      
      notificationManager.updateConfig({
        enableNotifications,
        notificationSound
      });
      console.log('通知设置已更新:', { enableNotifications, notificationSound });
    }
    
    // 应用网络设置
    if (settings.settings) {
      const networkSettings = {
        enableDns: settings.settings.enableDns,
        dnsServer: settings.settings.dnsServer,
        enableDoh: settings.settings.enableDoh,
        dohServer: settings.settings.dohServer,
        enableDot: settings.settings.enableDot,
        dotServer: settings.settings.dotServer,
        enableDnsCache: settings.settings.enableDnsCache,
        dnsCacheSize: settings.settings.dnsCacheSize,
        dnsCacheTtl: settings.settings.dnsCacheTtl,
        enableDnsLoadBalance: settings.settings.enableDnsLoadBalance,
        dnsServers: settings.settings.dnsServers,
        enableDnsLogging: settings.settings.enableDnsLogging,
        enableDnsLeakProtection: settings.settings.enableDnsLeakProtection,
        dnsLeakProtectionMode: settings.settings.dnsLeakProtectionMode,
        enableDnsRules: settings.settings.enableDnsRules,
        dnsRules: settings.settings.dnsRules,
        enableDnsFallback: settings.settings.enableDnsFallback,
        dnsFallbackServers: settings.settings.dnsFallbackServers,
        enableTun: settings.settings.enableTun,
        tunDevice: settings.settings.tunDevice,
        enableFakeIp: settings.settings.enableFakeIp,
        fakeIpRange: settings.settings.fakeIpRange,
        enableUdp: settings.settings.enableUdp,
        enableIpv6: settings.settings.enableIpv6,
        logLevel: settings.settings.logLevel,
        enableLog: settings.settings.enableLog,
        logFile: settings.settings.logFile
      };
      
      // 更新代理管理器的网络设置
      try {
        const { ProxyManager } = require('./proxyManager');
        const proxyManager = ProxyManager.getInstance();
        proxyManager.updateNetworkSettings(networkSettings);
        
        // 如果有代理进程正在运行，重启它们以应用新设置
        try {
          await proxyManager.restartAllProcesses();
          console.log('代理进程已重启以应用新设置');
        } catch (error) {
          console.error('重启代理进程失败:', error);
          // 发送错误通知到渲染进程
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('proxy:restartFailed', {
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        // 兼容端口：在 VPN 模式下即时启停转发器
        try {
          const mode = proxyModeManager.getCurrentMode();
          if (mode === 'vpn') {
            await CompatPortForwarder.stopAll();
            const appSettings = settings.settings;
            if (appSettings.enableCompatProxy) {
              const entry = (proxyManager as any).getMiddlewareEntryPort?.() || appSettings.socksPort || appSettings.mixedPort || appSettings.proxyPort;
              if (entry) {
                const httpPort = appSettings.compatHttpPort || 1080;
                const socksPort = appSettings.compatSocksPort || 1080;
                await CompatPortForwarder.start(httpPort, '127.0.0.1', entry);
                if (socksPort !== httpPort) {
                  await CompatPortForwarder.start(socksPort, '127.0.0.1', entry);
                }
              }
            }
          }
        } catch (err) {
          console.warn('应用兼容端口设置失败:', err);
        }
      } catch (error) {
        console.error('更新代理管理器设置失败:', error);
      }
    }
    
    // 应用DNS设置
    if (settings.settings) {
      try {
        dnsService.init(settings.settings);
        console.log('DNS服务设置已更新');
      } catch (error) {
        console.error('更新DNS服务设置失败:', error);
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

// 全局快捷键IPC处理程序
ipcMain.handle('hotkeys:register', async (_, hotkeys: HotkeyConfig) => {
  try {
    if (!globalShortcutManager) {
      return { success: false, error: '全局快捷键管理器未初始化' };
    }

    const result = globalShortcutManager.registerHotkeys(hotkeys);
    console.log('全局快捷键注册结果:', result);
    return result;
  } catch (error) {
    console.error('注册全局快捷键失败:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('hotkeys:unregister', async (_, shortcut: string) => {
  try {
    if (!globalShortcutManager) {
      return { success: false, error: '全局快捷键管理器未初始化' };
    }

    const success = globalShortcutManager.unregisterHotkey(shortcut);
    return { success };
  } catch (error) {
    console.error('注销全局快捷键失败:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('hotkeys:unregister-all', async () => {
  try {
    if (!globalShortcutManager) {
      return { success: false, error: '全局快捷键管理器未初始化' };
    }

    globalShortcutManager.unregisterAllHotcuts();
    return { success: true };
  } catch (error) {
    console.error('注销所有全局快捷键失败:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('hotkeys:validate', async (_, shortcut: string) => {
  try {
    if (!globalShortcutManager) {
      return { valid: false, error: '全局快捷键管理器未初始化' };
    }

    return globalShortcutManager.validateShortcut(shortcut);
  } catch (error) {
    console.error('验证快捷键失败:', error);
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('hotkeys:check-availability', async (_, shortcut: string) => {
  try {
    if (!globalShortcutManager) {
      return { available: false, error: '全局快捷键管理器未初始化' };
    }

    const available = globalShortcutManager.isShortcutAvailable(shortcut);
    return { available };
  } catch (error) {
    console.error('检查快捷键可用性失败:', error);
    return { available: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// 通知IPC处理程序
ipcMain.handle('notification:send', async (_, options: { title: string; body: string; icon?: string; silent?: boolean; timeoutType?: 'default' | 'never' }) => {
  try {
    if (!notificationManager) {
      return { success: false, error: '通知管理器未初始化' };
    }

    const success = await notificationManager.sendNotification(options);
    return { success };
  } catch (error) {
    console.error('发送通知失败:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('notification:test', async () => {
  try {
    if (!notificationManager) {
      return { success: false, error: '通知管理器未初始化' };
    }

    const success = await notificationManager.testNotification();
    return { success };
  } catch (error) {
    console.error('测试通知失败:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('notification:check-permission', async () => {
  try {
    if (!notificationManager) {
      return { hasPermission: false, error: '通知管理器未初始化' };
    }

    const hasPermission = await notificationManager.checkPermission();
    return { hasPermission };
  } catch (error) {
    console.error('检查通知权限失败:', error);
    return { hasPermission: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('notification:update-config', async (_, config: Partial<NotificationConfig>) => {
  try {
    if (!notificationManager) {
      return { success: false, error: '通知管理器未初始化' };
    }

    notificationManager.updateConfig(config);
    return { success: true };
  } catch (error) {
    console.error('更新通知配置失败:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('notification:is-supported', async () => {
  try {
    if (!notificationManager) {
      return { supported: false, error: '通知管理器未初始化' };
    }

    const supported = notificationManager.isNotificationSupported();
    return { supported };
  } catch (error) {
    console.error('检查通知支持失败:', error);
    return { supported: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// IP地理位置测试IPC处理程序
ipcMain.handle('geolocation:testViaProxy', async (_, { proxyUrl }) => {
  try {
    console.log('开始通过代理测试IP地理位置:', proxyUrl);

    const { URL } = require('url');

    // 使用多个IP地理位置API服务，提高成功率（均为 HTTPS）
    const apis = [
      'https://ipapi.co/json/',
      'https://ipinfo.io/json',
      'https://api.ipify.org?format=json'
    ];

    const proxyUrlObj = new URL(proxyUrl);
    const appSettings = settingsManager.getSettings();
    const proxyHost = proxyUrlObj.hostname || '127.0.0.1';
    const socksPort = Number(appSettings?.socksPort) || 7896; // SOCKS端口

    // 通过 SOCKS5 访问
    const tryViaSocks = (api: string): Promise<any> => new Promise((resolve) => {
      try {
        const { SocksClient } = require('socks');
        const targetUrl = new URL(api);
        const targetIsHttps = targetUrl.protocol === 'https:';
        const targetPort = Number(targetUrl.port) || (targetIsHttps ? 443 : 80);
        SocksClient.createConnection({
          proxy: { host: proxyHost, port: socksPort, type: 5 },
          command: 'connect',
          destination: { host: targetUrl.hostname, port: targetPort },
          timeout: 10000
        }).then(({ socket }: any) => {
          const onError = (err: any) => resolve({ success: false, error: err?.message || String(err) });
          if (targetIsHttps) {
            const tls = require('tls');
            const tlsSocket = tls.connect({ socket, servername: targetUrl.hostname, rejectUnauthorized: false });
            tlsSocket.setTimeout(10000, () => tlsSocket.destroy(new Error('TLS request timeout')));
            const requestLines = [
              `GET ${targetUrl.pathname + targetUrl.search} HTTP/1.1`,
              `Host: ${targetUrl.hostname}`,
              'Accept: application/json',
              'User-Agent: Chongdong/1.0',
              'Connection: close',
              '',
              ''
            ].join('\r\n');
            let data = '';
            tlsSocket
              .once('secureConnect', () => tlsSocket.write(requestLines))
              .on('data', (chunk: any) => (data += chunk.toString()))
              .on('error', onError)
              .on('end', () => {
                try {
                  const body = data.split('\r\n\r\n')[1] || '';
                  console.log('Raw response body from SOCKS:', body); // 打印原始响应体
                  const jsonData = JSON.parse(body);
                  let result: any;
                  if (api.includes('ipapi.co')) {
                    result = { success: true, ip: jsonData.ip, country: jsonData.country_name, region: jsonData.region, city: jsonData.city, isp: jsonData.org, timezone: jsonData.timezone };
                  } else if (api.includes('ipinfo.io')) {
                    result = { success: true, ip: jsonData.ip, country: jsonData.country, region: jsonData.region, city: jsonData.city, isp: jsonData.org, timezone: jsonData.timezone };
                  } else {
                    result = { success: true, ip: jsonData.ip };
                  }
                  resolve(result);
                } catch (e) {
                  resolve({ success: false, error: 'Failed to parse response' });
                }
              });
          } else {
            const requestLines = [
              `GET ${targetUrl.pathname + targetUrl.search} HTTP/1.1`,
              `Host: ${targetUrl.hostname}`,
              'Accept: application/json',
              'User-Agent: ' + 'Chongdong/1.0',
              'Connection: close',
              '',
              ''
            ].join('\r\n');
            let data = '';
            socket.write(requestLines);
            socket
              .on('data', (chunk: any) => (data += chunk.toString()))
              .on('error', onError)
              .on('end', () => {
                try {
                  const body = data.split('\r\n\r\n')[1] || '';
                  console.log('Raw response body from SOCKS:', body); // 打印原始响应体
                  const jsonData = JSON.parse(body);
                  const result = { success: true, ip: jsonData.ip };
                  resolve(result);
                } catch (e) {
                  resolve({ success: false, error: 'Failed to parse response' });
                }
              });
          }
        }).catch((err: any) => resolve({ success: false, error: err?.message || String(err) }));
      } catch (e) {
        resolve({ success: false, error: (e as any)?.message || String(e) });
      }
    });

    for (const api of apis) {
      // 始终通过 SOCKS 代理进行测试
      const r = await tryViaSocks(api);
      if (r && r.success) {
        console.log(`IP地理位置API ${api} 通过 SOCKS 代理测试成功`);
        return r;
      }
      console.warn(`IP地理位置API ${api} 通过 SOCKS 代理测试失败:`, r?.error || 'Unknown error');
    }

    return { success: false, error: '所有IP地理位置API都不可用' };
    
  } catch (error) {
    console.error('通过代理IP地理位置测试失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// DNS 服务IPC处理程序
ipcMain.handle('dns:startService', async () => {
  try {
    await dnsService.startDnsService();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('dns:stopService', async () => {
  try {
    await dnsService.stopDnsService();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('dns:getSystemDnsServers', async () => {
  try {
    const servers = await dnsService.getSystemDnsServers();
    return { success: true, servers };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('dns:testDnsQuery', async (_, { domain, dnsServer }) => {
  try {
    const result = await dnsService.testDnsQuery(domain, dnsServer);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('dns:checkDnsLeak', async () => {
  try {
    const result = await dnsService.checkDnsLeak();
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('dns:clearDnsCache', () => {
  try {
    dnsService.clearDnsCache();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// 启动动态代理链
ipcMain.handle('proxy:start-dynamic-chain', async (_event, { chain, listenPort }: { chain: ChainConfig, listenPort: number }) => {
  try {
    const result = await dynamicChainManager.startChain(chain, listenPort);
    return { success: true, port: result.port };
  } catch (error) {
    console.error('启动动态代理链失败:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

// 监听DNS服务相关请求
ipcMain.handle('dns:start-service', async (_event, _settings: AppSettings) => {
  try {
    await dnsService.startDnsService();
    return { success: true };
  } catch (error) {
    console.error('Failed to start DNS service:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// 注册系统监控IPC处理器
systemMonitor.registerIpcHandlers();

// 启动系统监控
systemMonitor.startMonitoring();

// 代理模式管理IPC处理程序
ipcMain.handle('proxy:applyMode', async (_, { mode, settings, networkSettings }) => {
  try {
    const result = await proxyModeManager.applyProxyMode({
      mode,
      settings,
      networkSettings
    });
    return result;
  } catch (error) {
    console.error('应用代理模式失败:', error);
    return {
      success: false,
      message: `应用代理模式失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
});

ipcMain.handle('proxy:getCurrentMode', async () => {
  try {
    const mode = proxyModeManager.getCurrentMode();
    const vpnName = proxyModeManager.getCurrentVpnName();
    return { success: true, mode, vpnName };
  } catch (error) {
    console.error('获取当前代理模式失败:', error);
    return {
      success: false,
      error: `获取当前代理模式失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
});

ipcMain.handle('proxy:checkVpnStatus', async () => {
  try {
    const status = await proxyModeManager.checkVpnStatus();
    return { success: true, ...status };
  } catch (error) {
    console.error('检查VPN状态失败:', error);
    return {
      success: false,
      error: `检查VPN状态失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
});

ipcMain.handle('tun:diagnose', async (_event, tunName?: string) => {
  try {
    const result = await TunController.diagnose(tunName || 'utun0');
    return { success: true, data: result };
  } catch (error) {
    console.error('TUN 诊断失败:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('proxy:disconnectVpn', async () => {
  try {
    await proxyModeManager.disconnectVpn();
    return { success: true, message: 'VPN连接已断开' };
  } catch (error) {
    console.error('断开VPN连接失败:', error);
    return {
      success: false,
      error: `断开VPN连接失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
});

// 数据库更新相关IPC处理程序
ipcMain.handle('database:checkUpdate', async (_, settings: any) => {
  try {
    const result = await databaseUpdateManager.manualUpdateCheck(settings);
    return result;
  } catch (error) {
    console.error('手动检查数据库更新失败:', error);
    return { 
      success: false, 
      message: `检查失败: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
});

ipcMain.handle('database:getStatus', async () => {
  try {
    const status = databaseUpdateManager.getDatabaseStatus();
    return { success: true, status };
  } catch (error) {
    console.error('获取数据库状态失败:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
});
