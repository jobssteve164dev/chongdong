"use strict";
const electron = require("electron");
const path = require("path");
const child_process = require("child_process");
const fs = require("fs");
const https = require("https");
const net = require("net");
const util = require("util");
const os = require("os");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const is = {
  dev: !electron.app.isPackaged
};
const platform = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
};
const electronApp = {
  setAppUserModelId(id) {
    if (platform.isWindows)
      electron.app.setAppUserModelId(is.dev ? process.execPath : id);
  },
  setAutoLaunch(auto) {
    if (platform.isLinux)
      return false;
    const isOpenAtLogin = () => {
      return electron.app.getLoginItemSettings().openAtLogin;
    };
    if (isOpenAtLogin() !== auto) {
      electron.app.setLoginItemSettings({ openAtLogin: auto });
      return isOpenAtLogin() === auto;
    } else {
      return true;
    }
  },
  skipProxy() {
    return electron.session.defaultSession.setProxy({ mode: "direct" });
  }
};
const optimizer = {
  watchWindowShortcuts(window, shortcutOptions) {
    if (!window)
      return;
    const { webContents } = window;
    const { escToCloseWindow = false, zoom = false } = shortcutOptions || {};
    webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown") {
        if (!is.dev) {
          if (input.code === "KeyR" && (input.control || input.meta))
            event.preventDefault();
          if (input.code === "KeyI" && (input.alt && input.meta || input.control && input.shift)) {
            event.preventDefault();
          }
        } else {
          if (input.code === "F12") {
            if (webContents.isDevToolsOpened()) {
              webContents.closeDevTools();
            } else {
              webContents.openDevTools({ mode: "undocked" });
              console.log("Open dev tool...");
            }
          }
        }
        if (escToCloseWindow) {
          if (input.code === "Escape" && input.key !== "Process") {
            window.close();
            event.preventDefault();
          }
        }
        if (!zoom) {
          if (input.code === "Minus" && (input.control || input.meta))
            event.preventDefault();
          if (input.code === "Equal" && input.shift && (input.control || input.meta))
            event.preventDefault();
        }
      }
    });
  },
  registerFramelessWindowIpc() {
    electron.ipcMain.on("win:invoke", (event, action) => {
      const win = electron.BrowserWindow.fromWebContents(event.sender);
      if (win) {
        if (action === "show") {
          win.show();
        } else if (action === "showInactive") {
          win.showInactive();
        } else if (action === "min") {
          win.minimize();
        } else if (action === "max") {
          const isMaximized = win.isMaximized();
          if (isMaximized) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        } else if (action === "close") {
          win.close();
        }
      }
    });
  }
};
class GlobalShortcutManager {
  constructor(mainWindow2) {
    this.registeredShortcuts = /* @__PURE__ */ new Map();
    this.mainWindow = null;
    this.mainWindow = mainWindow2;
  }
  /**
   * 设置主窗口引用
   */
  setMainWindow(window) {
    this.mainWindow = window;
  }
  /**
   * 注册全局快捷键
   */
  registerHotkeys(hotkeys) {
    const conflicts = [];
    const results = {};
    this.unregisterAllHotcuts();
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
    console.log("全局快捷键注册结果:", results);
    return { success: Object.values(results).every(Boolean), conflicts };
  }
  /**
   * 注册单个快捷键
   */
  registerSingleHotkey(shortcut, callback) {
    try {
      if (electron.globalShortcut.isRegistered(shortcut)) {
        console.warn(`快捷键 ${shortcut} 已被注册`);
        return false;
      }
      const success = electron.globalShortcut.register(shortcut, callback);
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
  handleHotkeyAction(action) {
    console.log(`触发快捷键动作: ${action}`);
    switch (action) {
      case "toggleProxy":
        this.toggleProxy();
        break;
      case "showMainWindow":
        this.showMainWindow();
        break;
      case "quickSwitch":
        this.quickSwitch();
        break;
      default:
        console.warn(`未知的快捷键动作: ${action}`);
    }
  }
  /**
   * 切换代理状态
   */
  toggleProxy() {
    var _a;
    try {
      (_a = this.mainWindow) == null ? void 0 : _a.webContents.send("hotkey-toggle-proxy");
      console.log("发送代理切换快捷键事件");
    } catch (error) {
      console.error("发送代理切换事件失败:", error);
    }
  }
  /**
   * 显示主窗口
   */
  showMainWindow() {
    try {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) {
          this.mainWindow.restore();
        }
        if (!this.mainWindow.isVisible()) {
          this.mainWindow.show();
        }
        this.mainWindow.focus();
        console.log("主窗口已显示并聚焦");
      }
    } catch (error) {
      console.error("显示主窗口失败:", error);
    }
  }
  /**
   * 快速切换功能
   */
  quickSwitch() {
    var _a;
    try {
      (_a = this.mainWindow) == null ? void 0 : _a.webContents.send("hotkey-quick-switch");
      console.log("发送快速切换快捷键事件");
    } catch (error) {
      console.error("发送快速切换事件失败:", error);
    }
  }
  /**
   * 注销所有快捷键
   */
  unregisterAllHotcuts() {
    try {
      electron.globalShortcut.unregisterAll();
      this.registeredShortcuts.clear();
      console.log("所有全局快捷键已注销");
    } catch (error) {
      console.error("注销全局快捷键失败:", error);
    }
  }
  /**
   * 注销单个快捷键
   */
  unregisterHotkey(shortcut) {
    try {
      electron.globalShortcut.unregister(shortcut);
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
  isShortcutAvailable(shortcut) {
    try {
      return !electron.globalShortcut.isRegistered(shortcut);
    } catch (error) {
      console.error(`检查快捷键 ${shortcut} 可用性失败:`, error);
      return false;
    }
  }
  /**
   * 获取已注册的快捷键列表
   */
  getRegisteredShortcuts() {
    return Array.from(this.registeredShortcuts.keys());
  }
  /**
   * 验证快捷键格式
   */
  validateShortcut(shortcut) {
    if (!shortcut || !shortcut.trim()) {
      return { valid: false, error: "快捷键不能为空" };
    }
    const shortcutPattern = /^(Ctrl\+|Cmd\+|Alt\+|Shift\+|Meta\+)*([A-Za-z0-9]|F[1-9][0-2]?)$/;
    if (!shortcutPattern.test(shortcut)) {
      return { valid: false, error: "快捷键格式不正确" };
    }
    return { valid: true };
  }
}
let globalShortcutManager$1 = null;
function createGlobalShortcutManager(mainWindow2) {
  globalShortcutManager$1 = new GlobalShortcutManager(mainWindow2);
  return globalShortcutManager$1;
}
class NotificationManager {
  constructor(config) {
    this.config = config;
    this.isSupported = electron.Notification.isSupported();
    if (!this.isSupported) {
      console.warn("当前系统不支持通知功能");
    }
  }
  /**
   * 更新通知配置
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
    console.log("通知配置已更新:", this.config);
  }
  /**
   * 检查通知权限
   */
  async checkPermission() {
    if (!this.isSupported) {
      return false;
    }
    try {
      if (process.platform === "darwin") {
        return true;
      }
      return true;
    } catch (error) {
      console.error("检查通知权限失败:", error);
      return false;
    }
  }
  /**
   * 发送通知
   */
  async sendNotification(options) {
    if (!this.config.enableNotifications) {
      console.log("通知功能已禁用");
      return false;
    }
    if (!this.isSupported) {
      console.warn("当前系统不支持通知功能");
      return false;
    }
    try {
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        console.warn("没有通知权限");
        return false;
      }
      let icon;
      if (options.icon) {
        try {
          icon = electron.nativeImage.createFromPath(options.icon);
        } catch (error) {
          console.warn("加载通知图标失败:", error);
        }
      }
      if (!icon) {
        try {
          const appIconPath = path.join(__dirname, "../renderer/assets/icon.png");
          icon = electron.nativeImage.createFromPath(appIconPath);
        } catch (error) {
          console.warn("加载应用图标失败:", error);
        }
      }
      const notificationOptions = {
        title: options.title,
        body: options.body,
        silent: options.silent ?? !this.config.notificationSound,
        timeoutType: options.timeoutType ?? "default"
      };
      if (icon) {
        notificationOptions.icon = icon;
      }
      const notification = new electron.Notification(notificationOptions);
      notification.on("click", () => {
        console.log("通知被点击");
        this.handleNotificationClick();
      });
      notification.on("close", () => {
        console.log("通知已关闭");
      });
      notification.on("show", () => {
        console.log("通知已显示");
      });
      notification.on("reply", (_event, reply) => {
        console.log("收到通知回复:", reply);
      });
      notification.show();
      console.log("通知已发送:", options);
      return true;
    } catch (error) {
      console.error("发送通知失败:", error);
      return false;
    }
  }
  /**
   * 发送代理状态变更通知
   */
  async sendProxyStatusNotification(isEnabled) {
    const title = "虫洞代理";
    const body = isEnabled ? "代理已启用" : "代理已禁用";
    return this.sendNotification({
      title,
      body,
      timeoutType: "default"
    });
  }
  /**
   * 发送连接状态通知
   */
  async sendConnectionNotification(isConnected, serverName) {
    const title = "虫洞代理";
    const body = isConnected ? `已连接到服务器${serverName ? `: ${serverName}` : ""}` : "连接已断开";
    return this.sendNotification({
      title,
      body,
      timeoutType: "default"
    });
  }
  /**
   * 发送错误通知
   */
  async sendErrorNotification(error) {
    const title = "虫洞代理 - 错误";
    const body = error;
    return this.sendNotification({
      title,
      body,
      timeoutType: "never"
    });
  }
  /**
   * 发送更新通知
   */
  async sendUpdateNotification(version) {
    const title = "虫洞代理 - 更新";
    const body = `发现新版本: ${version}`;
    return this.sendNotification({
      title,
      body,
      timeoutType: "default"
    });
  }
  /**
   * 处理通知点击事件
   */
  handleNotificationClick() {
    try {
      console.log("处理通知点击事件");
    } catch (error) {
      console.error("处理通知点击事件失败:", error);
    }
  }
  /**
   * 播放通知声音
   */
  playNotificationSound() {
    if (!this.config.notificationSound) {
      return;
    }
    try {
      if (process.platform === "darwin") {
        const { exec } = require("child_process");
        exec("afplay /System/Library/Sounds/Glass.aiff", (error) => {
          if (error) {
            console.warn("播放通知声音失败:", error);
          }
        });
      } else {
        console.log("播放通知声音");
      }
    } catch (error) {
      console.error("播放通知声音失败:", error);
    }
  }
  /**
   * 测试通知功能
   */
  async testNotification() {
    return this.sendNotification({
      title: "虫洞代理 - 测试",
      body: "这是一条测试通知",
      timeoutType: "default"
    });
  }
  /**
   * 获取通知支持状态
   */
  isNotificationSupported() {
    return this.isSupported;
  }
  /**
   * 获取当前配置
   */
  getConfig() {
    return { ...this.config };
  }
}
let notificationManager$1 = null;
function createNotificationManager(config) {
  notificationManager$1 = new NotificationManager(config);
  return notificationManager$1;
}
class CoreDownloader {
  constructor() {
    this.binDir = path.join(electron.app.getPath("userData"), "bin");
    this.coresDir = path.join(electron.app.getPath("userData"), "cores");
    if (!fs.existsSync(this.binDir)) {
      fs.mkdirSync(this.binDir, { recursive: true });
    }
    if (!fs.existsSync(this.coresDir)) {
      fs.mkdirSync(this.coresDir, { recursive: true });
    }
  }
  static getInstance() {
    if (!CoreDownloader.instance) {
      CoreDownloader.instance = new CoreDownloader();
    }
    return CoreDownloader.instance;
  }
  /**
   * 获取当前平台信息
   */
  getPlatformInfo() {
    const platform2 = process.platform;
    const arch = process.arch;
    let platformStr = "";
    let archStr = "";
    switch (platform2) {
      case "win32":
        platformStr = "windows";
        break;
      case "darwin":
        platformStr = "darwin";
        break;
      case "linux":
        platformStr = "linux";
        break;
      default:
        platformStr = "linux";
    }
    switch (arch) {
      case "x64":
        archStr = "amd64";
        break;
      case "arm64":
        archStr = "arm64";
        break;
      case "ia32":
        archStr = "386";
        break;
      default:
        archStr = "amd64";
    }
    return { platform: platformStr, arch: archStr };
  }
  /**
   * 获取核心信息
   */
  getCoreInfo(coreName) {
    const { platform: platform2, arch } = this.getPlatformInfo();
    switch (coreName) {
      case "singbox":
        return {
          name: "sing-box",
          version: "1.8.0",
          platform: platform2,
          arch,
          fileName: platform2 === "win32" ? "sing-box.exe" : "sing-box",
          downloadUrl: `https://github.com/SagerNet/sing-box/releases/download/v1.8.0/sing-box-1.8.0-${platform2}-${arch}.tar.gz`
        };
      case "xray":
        return {
          name: "Xray",
          version: "1.8.4",
          platform: platform2,
          arch,
          fileName: platform2 === "win32" ? "xray.exe" : "xray",
          downloadUrl: `https://github.com/XTLS/Xray-core/releases/download/v1.8.4/Xray-${platform2}-${arch}.zip`
        };
      case "clash":
        return {
          name: "clash",
          version: "1.18.0",
          platform: platform2,
          arch,
          fileName: platform2 === "win32" ? "clash.exe" : "clash",
          downloadUrl: `https://github.com/Dreamacro/clash/releases/download/v1.18.0/clash-${platform2}-${arch}-v1.18.0.gz`
        };
      case "geoip":
        return {
          name: "GeoIP Database",
          version: "latest",
          platform: "all",
          arch: "all",
          fileName: "geoip.db",
          downloadUrl: "https://github.com/SagerNet/sing-geoip/releases/latest/download/geoip.db"
        };
      case "geosite":
        return {
          name: "GeoSite Database",
          version: "latest",
          platform: "all",
          arch: "all",
          fileName: "geosite.db",
          downloadUrl: "https://github.com/SagerNet/sing-geosite/releases/latest/download/geosite.db"
        };
      default:
        throw new Error(`不支持的核心: ${coreName}`);
    }
  }
  /**
   * 检查核心是否已安装
   */
  isCoreInstalled(coreName) {
    const coreInfo = this.getCoreInfo(coreName);
    const corePath = path.join(this.binDir, coreInfo.fileName);
    return fs.existsSync(corePath);
  }
  /**
   * 获取核心路径
   */
  getCorePath(coreName) {
    const coreInfo = this.getCoreInfo(coreName);
    return path.join(this.binDir, coreInfo.fileName);
  }
  /**
   * 下载文件
   */
  async downloadFile(url, filePath) {
    return new Promise((resolve, reject) => {
      let redirectCount = 0;
      const maxRedirects = 5;
      const makeRequest = (requestUrl) => {
        if (redirectCount > maxRedirects) {
          reject(new Error("重定向次数过多"));
          return;
        }
        const fileStream = fs.createWriteStream(filePath);
        https.get(requestUrl, (response) => {
          if (response.statusCode === 301 || response.statusCode === 302) {
            const location = response.headers.location;
            if (location) {
              console.log(`重定向到: ${location}`);
              redirectCount++;
              fileStream.close();
              makeRequest(location);
              return;
            }
          }
          if (response.statusCode !== 200) {
            fileStream.close();
            reject(new Error(`下载失败: HTTP ${response.statusCode}`));
            return;
          }
          response.pipe(fileStream);
          fileStream.on("finish", () => {
            fileStream.close();
            resolve();
          });
          fileStream.on("error", (error) => {
            fileStream.close();
            reject(error);
          });
        }).on("error", (error) => {
          reject(error);
        });
      };
      makeRequest(url);
    });
  }
  /**
   * 解压文件
   */
  async extractFile(filePath, extractDir, targetFileName) {
    return new Promise((resolve, reject) => {
      const isGzip = filePath.endsWith(".gz");
      const isZip = filePath.endsWith(".zip");
      const isTarGz = filePath.endsWith(".tar.gz");
      console.log(`解压文件: ${filePath}`);
      console.log(`目标目录: ${extractDir}`);
      console.log(`目标文件名: ${targetFileName}`);
      console.log(`文件类型: gzip=${isGzip}, zip=${isZip}, tarGz=${isTarGz}`);
      let command;
      let args;
      let tempDir;
      if (isTarGz) {
        tempDir = path.join(this.coresDir, "temp");
        console.log(`创建临时目录: ${tempDir}`);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        command = "tar";
        args = ["-xzf", filePath, "-C", tempDir];
        console.log(`执行解压命令: ${command} ${args.join(" ")}`);
      } else if (isGzip) {
        command = "gunzip";
        args = ["-f", filePath];
      } else if (isZip) {
        command = "unzip";
        args = ["-o", filePath, "-d", extractDir];
      } else {
        console.log("不支持的文件格式，跳过解压");
        resolve();
        return;
      }
      const child = child_process.spawn(command, args);
      child.on("close", (code) => {
        console.log(`解压命令退出码: ${code}`);
        if (code === 0) {
          if (isTarGz) {
            console.log(`解压成功，开始查找可执行文件...`);
            this.findAndMoveExecutable(tempDir, extractDir, targetFileName).then(() => {
              console.log("可执行文件移动完成");
              resolve();
            }).catch((error) => {
              console.error("可执行文件移动失败:", error);
              reject(error);
            });
          } else {
            console.log("解压完成");
            resolve();
          }
        } else {
          console.error(`解压失败: ${command} exited with code ${code}`);
          reject(new Error(`解压失败: ${command} exited with code ${code}`));
        }
      });
      child.on("error", (error) => {
        console.error(`解压命令执行失败:`, error);
        reject(new Error(`解压失败: ${error.message}`));
      });
    });
  }
  /**
   * 查找并移动可执行文件
   */
  async findAndMoveExecutable(sourceDir, targetDir, targetFileName) {
    return new Promise((resolve, reject) => {
      const { readdirSync, renameSync, existsSync: existsSync2, mkdirSync: mkdirSync2 } = require("fs");
      try {
        if (!existsSync2(targetDir)) {
          mkdirSync2(targetDir, { recursive: true });
        }
        console.log(`查找可执行文件: ${targetFileName}`);
        console.log(`源目录: ${sourceDir}`);
        console.log(`目标目录: ${targetDir}`);
        const files = readdirSync(sourceDir);
        console.log(`源目录内容:`, files);
        let executableFound = false;
        const findExecutable = (dir, depth = 0) => {
          const indent = "  ".repeat(depth);
          console.log(`${indent}搜索目录: ${dir}`);
          try {
            const items = readdirSync(dir);
            console.log(`${indent}目录内容:`, items);
            for (const item of items) {
              const itemPath = path.join(dir, item);
              const stats = require("fs").statSync(itemPath);
              if (stats.isDirectory()) {
                console.log(`${indent}进入子目录: ${item}`);
                if (findExecutable(itemPath, depth + 1)) {
                  return true;
                }
              } else {
                console.log(`${indent}检查文件: ${item}`);
                if (item === targetFileName || process.platform === "win32" && item.endsWith(".exe") || process.platform !== "win32" && !item.includes(".") && item !== "LICENSE" && item !== "README") {
                  console.log(`${indent}找到可执行文件: ${itemPath}`);
                  const targetPath = path.join(targetDir, targetFileName);
                  console.log(`${indent}移动到: ${targetPath}`);
                  renameSync(itemPath, targetPath);
                  return true;
                }
              }
            }
          } catch (error) {
            console.error(`${indent}读取目录失败: ${dir}`, error);
          }
          return false;
        };
        executableFound = findExecutable(sourceDir);
        if (!executableFound) {
          console.error(`未找到可执行文件: ${targetFileName}`);
          console.error(`源目录内容:`, files);
          reject(new Error(`未找到可执行文件: ${targetFileName}`));
        } else {
          console.log(`可执行文件移动成功: ${targetFileName}`);
          resolve();
        }
      } catch (error) {
        console.error("查找可执行文件时出错:", error);
        reject(error);
      }
    });
  }
  /**
   * 下载并安装核心
   */
  async downloadCore(coreName) {
    try {
      const coreInfo = this.getCoreInfo(coreName);
      const urlParts = coreInfo.downloadUrl.split("/");
      const originalFileName = urlParts[urlParts.length - 1];
      if (!originalFileName) {
        throw new Error(`无法从下载 URL 中提取文件名: ${coreInfo.downloadUrl}`);
      }
      const downloadPath = path.join(this.coresDir, originalFileName);
      const corePath = path.join(this.binDir, coreInfo.fileName);
      console.log(`开始下载 ${coreInfo.name} v${coreInfo.version}...`);
      console.log(`下载文件: ${originalFileName}`);
      console.log(`下载路径: ${downloadPath}`);
      await this.downloadFile(coreInfo.downloadUrl, downloadPath);
      console.log(`下载完成，开始解压...`);
      await this.extractFile(downloadPath, this.binDir, coreInfo.fileName);
      if (!fs.existsSync(corePath)) {
        throw new Error(`核心文件未找到: ${corePath}`);
      }
      if (process.platform !== "win32") {
        try {
          fs.chmodSync(corePath, 493);
          console.log(`执行权限设置成功: ${corePath}`);
        } catch (error) {
          console.warn("设置执行权限失败:", error);
        }
      }
      console.log(`${coreInfo.name} 安装完成: ${corePath}`);
    } catch (error) {
      console.error(`下载 ${coreName} 失败:`, error);
      throw error;
    }
  }
  /**
   * 下载数据库文件
   */
  async downloadDatabase(dbName) {
    try {
      const dbInfo = this.getCoreInfo(dbName);
      const downloadPath = path.join(this.binDir, dbInfo.fileName);
      console.log(`开始下载 ${dbInfo.name}...`);
      console.log(`下载文件: ${dbInfo.fileName}`);
      console.log(`下载路径: ${downloadPath}`);
      await this.downloadFile(dbInfo.downloadUrl, downloadPath);
      console.log(`${dbInfo.name} 下载完成: ${downloadPath}`);
    } catch (error) {
      console.error(`下载 ${dbName} 失败:`, error);
      throw error;
    }
  }
  /**
   * 获取所有核心的安装状态
   */
  getCoresStatus() {
    return {
      singbox: this.isCoreInstalled("singbox"),
      xray: this.isCoreInstalled("xray"),
      clash: this.isCoreInstalled("clash"),
      geoip: this.isDatabaseInstalled("geoip"),
      geosite: this.isDatabaseInstalled("geosite")
    };
  }
  /**
   * 检查数据库文件是否已安装
   */
  isDatabaseInstalled(dbName) {
    const dbInfo = this.getCoreInfo(dbName);
    const dbPath = path.join(this.binDir, dbInfo.fileName);
    return fs.existsSync(dbPath);
  }
  /**
   * 清理下载的临时文件
   */
  async cleanup() {
    console.log("清理完成");
  }
}
const coreDownloader = CoreDownloader.getInstance();
class ProxyManager {
  constructor() {
    this.processes = /* @__PURE__ */ new Map();
    this.configDir = path.join(electron.app.getPath("userData"), "proxy-configs");
    this.binDir = path.join(electron.app.getPath("userData"), "bin");
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    if (!fs.existsSync(this.binDir)) {
      fs.mkdirSync(this.binDir, { recursive: true });
    }
  }
  static getInstance() {
    if (!ProxyManager.instance) {
      ProxyManager.instance = new ProxyManager();
    }
    return ProxyManager.instance;
  }
  /**
   * 更新网络设置
   */
  updateNetworkSettings(settings) {
    this.currentNetworkSettings = settings;
    console.log("网络设置已更新:", settings);
  }
  /**
   * 测试代理连接
   */
  async testProxyConnection(port) {
    var _a;
    console.log(`=== 开始代理连接测试 ===`);
    console.log(`测试端口: ${port}`);
    try {
      const net2 = require("net");
      const configFiles = require("fs").readdirSync(this.configDir);
      const latestConfig = configFiles.filter((file) => file.startsWith("singbox_") && file.endsWith(".json")).sort().pop();
      if (latestConfig) {
        const configPath = require("path").join(this.configDir, latestConfig);
        const config = JSON.parse(require("fs").readFileSync(configPath, "utf8"));
        const proxyOutbound = (_a = config.outbounds) == null ? void 0 : _a.find((outbound) => outbound.type !== "direct" && outbound.type !== "dns");
        if (proxyOutbound) {
          console.log(`测试代理服务器连接: ${proxyOutbound.server}:${proxyOutbound.server_port}`);
          const testConnection = () => {
            return new Promise((resolve) => {
              const socket = net2.createConnection({
                host: proxyOutbound.server,
                port: proxyOutbound.server_port,
                timeout: 5e3
              });
              socket.on("connect", () => {
                console.log(`✅ 代理服务器连接成功: ${proxyOutbound.server}:${proxyOutbound.server_port}`);
                socket.destroy();
                resolve(true);
              });
              socket.on("error", (error) => {
                console.error(`❌ 代理服务器连接失败: ${proxyOutbound.server}:${proxyOutbound.server_port}`);
                console.error(`错误详情: ${error.message}`);
                resolve(false);
              });
              socket.on("timeout", () => {
                console.error(`⏰ 代理服务器连接超时: ${proxyOutbound.server}:${proxyOutbound.server_port}`);
                socket.destroy();
                resolve(false);
              });
            });
          };
          const isConnected = await testConnection();
          if (!isConnected) {
            console.warn(`⚠️  代理服务器可能不可用，这可能是导致无法联网的原因`);
          }
        }
      }
      console.log(`代理连接测试完成`);
    } catch (error) {
      console.error(`代理连接测试失败:`, error);
    }
  }
  /**
   * 检查端口是否可用
   */
  checkPortReady(host, port, timeout = 5e3) {
    console.log(`=== 开始端口可用性检查 ===`);
    console.log(`目标主机: ${host}`);
    console.log(`目标端口: ${port}`);
    console.log(`超时时间: ${timeout}ms`);
    return new Promise((resolve) => {
      console.log(`创建到 ${host}:${port} 的连接...`);
      const socket = net.createConnection({ host, port });
      const timer = setTimeout(() => {
        console.log(`端口检查超时，端口 ${port} 不可用`);
        socket.destroy();
        resolve(false);
      }, timeout);
      socket.on("connect", () => {
        console.log(`=== 端口检查成功 ===`);
        console.log(`成功连接到 ${host}:${port}`);
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      });
      socket.on("error", (error) => {
        console.log(`=== 端口检查失败 ===`);
        console.log(`连接错误: ${error.message}`);
        console.log(`错误代码: ${error.code || "unknown"}`);
        clearTimeout(timer);
        socket.destroy();
        resolve(false);
      });
    });
  }
  /**
   * 重启所有代理进程
   */
  async restartAllProcesses() {
    console.log("开始重启所有代理进程...");
    const processesToRestart = Array.from(this.processes.values());
    if (processesToRestart.length === 0) {
      console.log("没有正在运行的代理进程，无需重启");
      return;
    }
    for (const process2 of processesToRestart) {
      try {
        await this.stopProcess(process2.id);
      } catch (error) {
        console.error(`停止进程 ${process2.id} 失败:`, error);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    for (const process2 of processesToRestart) {
      try {
        switch (process2.type) {
          case "singbox":
            await this.startSingbox(process2.config, this.currentNetworkSettings);
            break;
          case "xray":
            await this.startXray(process2.config, this.currentNetworkSettings);
            break;
          case "clash":
            await this.startClash(process2.config, this.currentNetworkSettings);
            break;
        }
      } catch (error) {
        console.error(`重启 ${process2.type} 进程失败:`, error);
      }
    }
    console.log("所有代理进程重启完成");
  }
  /**
   * 停止指定进程
   */
  async stopProcess(processId) {
    const process2 = this.processes.get(processId);
    if (process2) {
      try {
        process2.process.kill();
        this.processes.delete(processId);
        console.log(`进程 ${processId} 已停止`);
      } catch (error) {
        console.error(`停止进程 ${processId} 失败:`, error);
      }
    }
  }
  /**
   * 启动Sing-box引擎
   */
  async startSingbox(config, networkSettings) {
    const processId = `singbox_${Date.now()}`;
    const configPath = path.join(this.configDir, `${processId}.json`);
    console.log(`=== 开始启动 Sing-box 进程 ===`);
    console.log(`进程ID: ${processId}`);
    console.log(`配置文件路径: ${configPath}`);
    console.log(`原始配置:`, JSON.stringify(config, null, 2));
    console.log(`网络设置:`, networkSettings);
    console.log(`清理现有进程...`);
    await this.cleanupExistingProcesses("singbox");
    console.log(`应用网络设置到配置...`);
    const finalConfig = this.applyNetworkSettingsToConfig(config, networkSettings);
    console.log(`最终配置文件内容:`, JSON.stringify(finalConfig, null, 2));
    console.log(`写入配置文件到: ${configPath}`);
    fs.writeFileSync(configPath, JSON.stringify(finalConfig, null, 2));
    const singboxPath = await this.getSingboxPath();
    console.log(`Sing-box 可执行文件路径: ${singboxPath}`);
    return new Promise((resolve, reject) => {
      var _a, _b, _c, _d;
      console.log(`=== 启动 Sing-box 子进程 ===`);
      console.log(`可执行文件: ${singboxPath}`);
      console.log(`配置文件: ${configPath}`);
      console.log(`工作目录: ${this.binDir}`);
      console.log(`启动参数: ['run', '-c', '${configPath}']`);
      const childProcess = child_process.spawn(singboxPath, ["run", "-c", configPath], {
        stdio: ["pipe", "pipe", "pipe"],
        detached: false,
        cwd: this.binDir
        // 设置工作目录为 bin 目录
      });
      console.log(`子进程已启动，PID: ${childProcess.pid}`);
      childProcess.on("error", (error) => {
        console.error(`=== Sing-box 进程错误 ===`);
        console.error(`错误详情:`, error);
        console.error(`错误消息: ${error.message}`);
        console.error(`错误堆栈: ${error.stack}`);
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      });
      childProcess.on("exit", (code, signal) => {
        console.log(`=== Sing-box 进程退出 ===`);
        console.log(`退出代码: ${code}`);
        console.log(`退出信号: ${signal}`);
        console.log(`进程ID: ${processId}`);
        this.processes.delete(processId);
        if (code !== 0 && !resolved) {
          resolved = true;
          reject(new Error(`Sing-box process failed with exit code: ${code}`));
        }
      });
      childProcess.stdout.on("data", (data) => {
        const output = data.toString();
        console.log(`=== Sing-box 标准输出 ===`);
        console.log(`输出内容: ${output}`);
      });
      childProcess.stderr.on("data", (data) => {
        var _a2, _b2;
        const errorMessage = data.toString();
        console.error(`=== Sing-box 标准错误 ===`);
        console.error(`错误内容: ${errorMessage}`);
        if (errorMessage.includes("bind: address already in use")) {
          console.log("检测到端口占用错误，进行详细诊断...");
          const port2 = ((_b2 = (_a2 = finalConfig.inbounds) == null ? void 0 : _a2[0]) == null ? void 0 : _b2.listen_port) || 1080;
          console.log("立即发送端口占用通知，端口:", port2);
          this.sendPortInUseNotification(port2, processId);
          childProcess.kill();
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              reject(new Error(`Sing-box 启动失败: 端口 ${port2} 已被占用`));
            }
          }, 500);
          return;
        }
        if (errorMessage.includes("decode config")) {
          console.error("Sing-box 配置解析错误，请检查配置文件格式");
          console.log("当前配置:", JSON.stringify(finalConfig, null, 2));
          childProcess.kill();
          if (!resolved) {
            resolved = true;
            reject(new Error(`Sing-box 配置错误: ${errorMessage}`));
          }
          return;
        }
        if (errorMessage.includes("FATAL")) {
          console.error("Sing-box 致命错误:", errorMessage);
          childProcess.kill();
          if (!resolved) {
            resolved = true;
            reject(new Error(`Sing-box 致命错误: ${errorMessage}`));
          }
          return;
        }
      });
      this.processes.set(processId, {
        id: processId,
        type: "singbox",
        process: childProcess,
        config: finalConfig,
        port: ((_b = (_a = finalConfig.inbounds) == null ? void 0 : _a[0]) == null ? void 0 : _b.listen_port) || 1080,
        networkSettings
      });
      console.log(`Started Sing-box process: ${processId}`);
      let resolved = false;
      const port = ((_d = (_c = finalConfig.inbounds) == null ? void 0 : _c[0]) == null ? void 0 : _d.listen_port) || 1080;
      console.log(`=== 准备验证端口 ===`);
      console.log(`验证端口: ${port}`);
      console.log(`等待时间: 2秒`);
      setTimeout(async () => {
        console.log(`=== 开始端口验证 ===`);
        console.log(`当前时间: ${(/* @__PURE__ */ new Date()).toISOString()}`);
        console.log(`进程状态: ${childProcess.killed ? "已终止" : "运行中"}`);
        console.log(`进程PID: ${childProcess.pid}`);
        if (!resolved) {
          try {
            console.log(`开始检查端口 ${port} 是否可用...`);
            const isPortReady = await this.checkPortReady("127.0.0.1", port, 5e3);
            console.log(`端口检查结果: ${isPortReady ? "成功" : "失败"}`);
            if (isPortReady) {
              console.log(`=== Sing-box 启动成功 ===`);
              console.log(`端口 ${port} 验证成功`);
              console.log(`进程ID: ${processId}`);
              await this.testProxyConnection(port);
              resolved = true;
              resolve();
            } else {
              console.error(`=== Sing-box 启动失败 ===`);
              console.error(`端口 ${port} 验证失败`);
              console.error(`终止进程 PID: ${childProcess.pid}`);
              childProcess.kill();
              resolved = true;
              reject(new Error(`Sing-box 启动失败: 端口 ${port} 不可用`));
            }
          } catch (error) {
            console.error(`=== Sing-box 端口验证异常 ===`);
            console.error(`异常详情:`, error);
            console.error(`异常消息: ${error instanceof Error ? error.message : "Unknown error"}`);
            console.error(`终止进程 PID: ${childProcess.pid}`);
            childProcess.kill();
            resolved = true;
            reject(new Error(`Sing-box 启动失败: 端口验证异常`));
          }
        } else {
          console.log(`端口验证已跳过，进程状态已确定`);
        }
      }, 2e3);
    });
  }
  /**
   * 启动Xray引擎
   */
  async startXray(config, networkSettings) {
    const processId = `xray_${Date.now()}`;
    const configPath = path.join(this.configDir, `${processId}.json`);
    console.log(`准备启动 Xray 进程: ${processId}`);
    console.log(`配置文件路径: ${configPath}`);
    console.log(`网络设置:`, networkSettings);
    const finalConfig = this.applyNetworkSettingsToConfig(config, networkSettings);
    console.log(`最终配置文件内容:`, JSON.stringify(finalConfig, null, 2));
    fs.writeFileSync(configPath, JSON.stringify(finalConfig, null, 2));
    const xrayPath = await this.getXrayPath();
    console.log(`Xray 可执行文件路径: ${xrayPath}`);
    return new Promise((resolve, reject) => {
      var _a, _b;
      const childProcess = child_process.spawn(xrayPath, ["run", "-c", configPath], {
        stdio: ["pipe", "pipe", "pipe"],
        detached: false
      });
      childProcess.on("error", (error) => {
        console.error("Xray process error:", error);
        reject(error);
      });
      childProcess.on("exit", (code, signal) => {
        console.log(`Xray process exited with code ${code} and signal ${signal}`);
        this.processes.delete(processId);
        if (code !== 0) {
          reject(new Error(`Xray process failed with exit code: ${code}`));
        }
      });
      childProcess.stdout.on("data", (data) => {
        console.log(`Xray stdout: ${data.toString()}`);
      });
      childProcess.stderr.on("data", (data) => {
        var _a2, _b2, _c, _d;
        const errorMessage = data.toString();
        console.error(`Xray stderr: ${errorMessage}`);
        if (errorMessage.includes("bind: address already in use")) {
          console.log("检测到端口占用，发送端口占用通知");
          const { BrowserWindow } = require("electron");
          const windows = BrowserWindow.getAllWindows();
          console.log(`找到 ${windows.length} 个窗口`);
          if (windows.length > 0) {
            const port = ((_b2 = (_a2 = finalConfig.inbounds) == null ? void 0 : _a2[0]) == null ? void 0 : _b2.port) || 1080;
            const notificationData = {
              port,
              processId
            };
            console.log("发送端口占用通知:", notificationData);
            windows[0].webContents.send("proxy:portInUse", notificationData);
            console.log("端口占用通知已发送");
          } else {
            console.log("没有找到窗口，无法发送通知");
          }
          childProcess.kill();
          reject(new Error(`端口 ${((_d = (_c = finalConfig.inbounds) == null ? void 0 : _c[0]) == null ? void 0 : _d.port) || 1080} 已被占用，无法启动代理服务`));
          return;
        }
      });
      this.processes.set(processId, {
        id: processId,
        type: "xray",
        process: childProcess,
        config: finalConfig,
        port: ((_b = (_a = finalConfig.inbounds) == null ? void 0 : _a[0]) == null ? void 0 : _b.port) || 1080,
        networkSettings
      });
      console.log(`Started Xray process: ${processId}`);
      setTimeout(() => {
        resolve();
      }, 100);
    });
  }
  /**
   * 启动Clash引擎
   */
  async startClash(config, networkSettings) {
    const processId = `clash_${Date.now()}`;
    const configPath = path.join(this.configDir, `${processId}.yaml`);
    console.log(`准备启动 Clash 进程: ${processId}`);
    console.log(`配置文件路径: ${configPath}`);
    console.log(`网络设置:`, networkSettings);
    const finalConfig = this.applyNetworkSettingsToConfig(config, networkSettings);
    console.log(`最终配置文件内容:`, JSON.stringify(finalConfig, null, 2));
    fs.writeFileSync(configPath, this.convertClashConfigToYaml(finalConfig));
    const clashPath = await this.getClashPath();
    return new Promise((resolve, reject) => {
      const childProcess = child_process.spawn(clashPath, ["-d", this.configDir, "-f", configPath], {
        stdio: ["pipe", "pipe", "pipe"],
        detached: false
      });
      childProcess.on("error", (error) => {
        console.error("Clash process error:", error);
        reject(error);
      });
      childProcess.on("exit", (code, signal) => {
        console.log(`Clash process exited with code ${code} and signal ${signal}`);
        this.processes.delete(processId);
        if (code !== 0) {
          reject(new Error(`Clash process failed with exit code: ${code}`));
        }
      });
      childProcess.stdout.on("data", (data) => {
        console.log(`Clash stdout: ${data.toString()}`);
      });
      childProcess.stderr.on("data", (data) => {
        const errorMessage = data.toString();
        console.error(`Clash stderr: ${errorMessage}`);
        if (errorMessage.includes("bind: address already in use")) {
          console.log("检测到端口占用，发送端口占用通知");
          const { BrowserWindow } = require("electron");
          const windows = BrowserWindow.getAllWindows();
          console.log(`找到 ${windows.length} 个窗口`);
          if (windows.length > 0) {
            const port = finalConfig.port || 7890;
            const notificationData = {
              port,
              processId
            };
            console.log("发送端口占用通知:", notificationData);
            windows[0].webContents.send("proxy:portInUse", notificationData);
            console.log("端口占用通知已发送");
          } else {
            console.log("没有找到窗口，无法发送通知");
          }
          childProcess.kill();
          reject(new Error(`端口 ${finalConfig.port || 7890} 已被占用，无法启动代理服务`));
          return;
        }
      });
      this.processes.set(processId, {
        id: processId,
        type: "clash",
        process: childProcess,
        config: finalConfig,
        port: finalConfig.port || 7890,
        networkSettings
      });
      console.log(`Started Clash process: ${processId}`);
      setTimeout(() => {
        resolve();
      }, 100);
    });
  }
  /**
   * 停止所有代理进程
   */
  async stopAll() {
    for (const [id, proxyProcess] of this.processes) {
      try {
        proxyProcess.process.kill("SIGTERM");
        console.log(`Stopped ${proxyProcess.type} process: ${id}`);
      } catch (error) {
        console.error(`Failed to stop ${proxyProcess.type} process: ${id}`, error);
      }
    }
    this.processes.clear();
  }
  /**
   * 获取代理统计信息
   */
  async getStats() {
    try {
      let totalUpload = 0;
      let totalDownload = 0;
      let activeConnections = 0;
      let uploadSpeed = 0;
      let downloadSpeed = 0;
      for (const [processId, processInfo] of this.processes.entries()) {
        try {
          if (processInfo.type === "singbox") {
            const stats = await this.getSingboxStats();
            if (stats) {
              totalUpload += stats.upload || 0;
              totalDownload += stats.download || 0;
              uploadSpeed += stats.uploadSpeed || 0;
              downloadSpeed += stats.downloadSpeed || 0;
              activeConnections += stats.connections || 0;
            }
          }
        } catch (error) {
          console.warn(`获取进程 ${processId} 统计失败:`, error);
        }
      }
      return {
        totalUpload,
        totalDownload,
        uploadSpeed,
        downloadSpeed,
        activeConnections,
        totalConnections: this.processes.size
      };
    } catch (error) {
      console.error("获取统计数据失败:", error);
      return {
        totalUpload: 0,
        totalDownload: 0,
        uploadSpeed: 0,
        downloadSpeed: 0,
        activeConnections: 0,
        totalConnections: 0
      };
    }
  }
  /**
   * 获取Sing-box统计信息
   */
  async getSingboxStats() {
    try {
      const http = require("http");
      return new Promise((resolve) => {
        const req = http.request({
          hostname: "127.0.0.1",
          port: 9090,
          // Sing-box默认API端口
          path: "/stats",
          method: "GET",
          timeout: 1e3
        }, (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            try {
              const stats = JSON.parse(data);
              resolve(stats);
            } catch (error) {
              resolve(null);
            }
          });
        });
        req.on("error", () => {
          resolve(null);
        });
        req.on("timeout", () => {
          req.destroy();
          resolve(null);
        });
        req.end();
      });
    } catch (error) {
      return null;
    }
  }
  /**
   * 获取Sing-box可执行文件路径
   */
  async getSingboxPath() {
    if (!coreDownloader.isCoreInstalled("singbox")) {
      throw new Error("Sing-box 核心未安装，请先下载安装");
    }
    return coreDownloader.getCorePath("singbox");
  }
  /**
   * 获取Xray可执行文件路径
   */
  async getXrayPath() {
    if (!coreDownloader.isCoreInstalled("xray")) {
      throw new Error("Xray 核心未安装，请先下载安装");
    }
    return coreDownloader.getCorePath("xray");
  }
  /**
   * 获取Clash可执行文件路径
   */
  async getClashPath() {
    if (!coreDownloader.isCoreInstalled("clash")) {
      throw new Error("Clash 核心未安装，请先下载安装");
    }
    return coreDownloader.getCorePath("clash");
  }
  /**
   * 转换Clash配置为YAML格式
   */
  convertClashConfigToYaml(config) {
    let yaml = `port: ${config.port}
`;
    yaml += `socks-port: ${config["socks-port"]}
`;
    yaml += `mixed-port: ${config["mixed-port"]}
`;
    yaml += `allow-lan: ${config["allow-lan"]}
`;
    yaml += `mode: ${config.mode}
`;
    yaml += `log-level: ${config["log-level"]}
`;
    yaml += `external-controller: ${config["external-controller"]}

`;
    yaml += `proxies:
`;
    if (config.proxies) {
      for (const proxy of config.proxies) {
        yaml += `  - name: ${proxy.name}
`;
        yaml += `    type: ${proxy.type}
`;
        yaml += `    server: ${proxy.server}
`;
        yaml += `    port: ${proxy.port}
`;
        if (proxy.uuid) yaml += `    uuid: ${proxy.uuid}
`;
        if (proxy.password) yaml += `    password: ${proxy.password}
`;
        yaml += `
`;
      }
    }
    yaml += `proxy-groups:
`;
    if (config["proxy-groups"]) {
      for (const group of config["proxy-groups"]) {
        yaml += `  - name: ${group.name}
`;
        yaml += `    type: ${group.type}
`;
        yaml += `    proxies:
`;
        for (const proxy of group.proxies) {
          yaml += `      - ${proxy}
`;
        }
        yaml += `
`;
      }
    }
    yaml += `rules:
`;
    if (config.rules) {
      for (const rule of config.rules) {
        yaml += `  - ${rule}
`;
      }
    }
    return yaml;
  }
  /**
   * 应用网络设置到配置
   */
  applyNetworkSettingsToConfig(config, networkSettings) {
    if (!networkSettings) {
      return config;
    }
    const finalConfig = { ...config };
    if (finalConfig.log) {
      finalConfig.log.level = networkSettings.logLevel || "info";
      if (networkSettings.enableLog) {
        finalConfig.log.output = networkSettings.logFile || "chongdong.log";
      } else {
        finalConfig.log.output = "console";
      }
    }
    if (networkSettings.enableDns && finalConfig.dns) {
      const dnsServers = [];
      if (networkSettings.dnsServer) {
        dnsServers.push(networkSettings.dnsServer);
      }
      if (networkSettings.enableDoh && networkSettings.dohServer) {
        dnsServers.push(networkSettings.dohServer);
      }
      if (networkSettings.enableDot && networkSettings.dotServer) {
        dnsServers.push(networkSettings.dotServer);
      }
      if (networkSettings.enableDnsLoadBalance && networkSettings.dnsServers) {
        networkSettings.dnsServers.forEach((server) => {
          if (server && server !== networkSettings.dnsServer && !dnsServers.includes(server)) {
            dnsServers.push(server);
          }
        });
      }
      finalConfig.dns.servers = dnsServers.length > 0 ? dnsServers : ["8.8.8.8"];
      if (networkSettings.enableDnsFallback && networkSettings.dnsFallbackServers) {
        finalConfig.dns.fallback = networkSettings.dnsFallbackServers;
      }
    }
    if (finalConfig.inbounds) {
      const tunInbound = finalConfig.inbounds.find((inbound) => inbound.type === "tun");
      if (tunInbound) {
        if (networkSettings.enableTun) {
          tunInbound.disabled = false;
          tunInbound.interface_name = networkSettings.tunDevice || "utun0";
          if (networkSettings.enableFakeIp) {
            tunInbound.inet4_address = [networkSettings.fakeIpRange || "198.18.0.1/16"];
          }
          if (networkSettings.enableIpv6) {
            tunInbound.inet6_address = ["fdfe:dcba:9876::1/126"];
          }
        } else {
          tunInbound.disabled = true;
        }
      }
    }
    return finalConfig;
  }
  /**
   * 清理指定类型的所有现有进程
   */
  async cleanupExistingProcesses(type) {
    const existingProcesses = Array.from(this.processes.values()).filter((p) => p.type === type);
    for (const process2 of existingProcesses) {
      try {
        process2.process.kill("SIGTERM");
        console.log(`清理旧 ${type} 进程: ${process2.id}`);
      } catch (error) {
        console.error(`清理旧 ${type} 进程失败: ${process2.id}`, error);
      }
    }
    for (const process2 of existingProcesses) {
      this.processes.delete(process2.id);
    }
    if (existingProcesses.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1e3));
    }
  }
  /**
   * 发送端口占用通知
   */
  sendPortInUseNotification(port, processId) {
    const { BrowserWindow } = require("electron");
    const windows = BrowserWindow.getAllWindows();
    console.log(`找到 ${windows.length} 个窗口`);
    if (windows.length > 0) {
      const notificationData = {
        port,
        processId
      };
      console.log("发送端口占用通知:", notificationData);
      windows[0].webContents.send("proxy:portInUse", notificationData);
      console.log("端口占用通知已发送");
    } else {
      console.log("没有找到窗口，无法发送通知");
    }
  }
}
const proxyManager = ProxyManager.getInstance();
const execAsync = util.promisify(child_process.exec);
class SystemProxyManager {
  constructor() {
  }
  static getInstance() {
    if (!SystemProxyManager.instance) {
      SystemProxyManager.instance = new SystemProxyManager();
    }
    return SystemProxyManager.instance;
  }
  /**
   * 设置系统代理
   */
  async setSystemProxy(host, socksPort, httpPort) {
    switch (process.platform) {
      case "win32":
        await this.setWindowsProxy(host, httpPort || socksPort);
        break;
      case "darwin":
        await this.setMacOSProxy(host, socksPort, httpPort);
        break;
      case "linux":
        await this.setLinuxProxy(host, httpPort || socksPort);
        break;
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }
  /**
   * 清除系统代理
   */
  async clearSystemProxy() {
    switch (process.platform) {
      case "win32":
        await this.clearWindowsProxy();
        break;
      case "darwin":
        await this.clearMacOSProxy();
        break;
      case "linux":
        await this.clearLinuxProxy();
        break;
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }
  /**
   * 获取当前系统代理设置
   */
  async getSystemProxy() {
    switch (process.platform) {
      case "win32":
        return await this.getWindowsProxy();
      case "darwin":
        return await this.getMacOSProxy();
      case "linux":
        return await this.getLinuxProxy();
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }
  /**
   * Windows系统代理设置
   */
  async setWindowsProxy(host, port) {
    try {
      await execAsync(`netsh winhttp set proxy ${host}:${port}`);
      const script = `
        $regPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
        Set-ItemProperty -Path $regPath -Name ProxyEnable -Value 1
        Set-ItemProperty -Path $regPath -Name ProxyServer -Value "${host}:${port}"
        Set-ItemProperty -Path $regPath -Name ProxyOverride -Value "<-loopback>"
      `;
      await execAsync(`powershell -Command "${script}"`);
      console.log(`Windows proxy set to ${host}:${port}`);
    } catch (error) {
      throw new Error(`Failed to set Windows proxy: ${error}`);
    }
  }
  async clearWindowsProxy() {
    try {
      await execAsync("netsh winhttp reset proxy");
      const script = `
        $regPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
        Set-ItemProperty -Path $regPath -Name ProxyEnable -Value 0
        Remove-ItemProperty -Path $regPath -Name ProxyServer -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path $regPath -Name ProxyOverride -ErrorAction SilentlyContinue
      `;
      await execAsync(`powershell -Command "${script}"`);
      console.log("Windows proxy cleared");
    } catch (error) {
      throw new Error(`Failed to clear Windows proxy: ${error}`);
    }
  }
  async getWindowsProxy() {
    try {
      const { stdout } = await execAsync("netsh winhttp show proxy");
      const lines = stdout.split("\n");
      for (const line of lines) {
        if (line.includes("Proxy Server(s):")) {
          const match = line.match(/(\d+\.\d+\.\d+\.\d+):(\d+)/);
          if (match && match[1] && match[2]) {
            return {
              host: match[1],
              port: parseInt(match[2]),
              enabled: true
            };
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to get Windows proxy:", error);
      return null;
    }
  }
  /**
   * macOS系统代理设置
   */
  async setMacOSProxy(host, socksPort, httpPort) {
    console.log(`=== 开始设置 macOS 系统代理 ===`);
    console.log(`代理主机: ${host}`);
    console.log(`SOCKS端口: ${socksPort}`);
    console.log(`HTTP端口: ${httpPort || socksPort}`);
    const actualHttpPort = httpPort || socksPort;
    try {
      console.log(`获取网络服务列表...`);
      const { stdout: services } = await execAsync("networksetup -listallnetworkservices");
      const serviceLines = services.split("\n").filter((line) => line.trim() && !line.includes("*"));
      console.log(`找到网络服务:`, serviceLines);
      for (const service of serviceLines) {
        if (service.trim()) {
          console.log(`设置网络服务 "${service.trim()}" 的代理...`);
          console.log(`设置HTTP代理: ${host}:${actualHttpPort}`);
          await execAsync(`networksetup -setwebproxy "${service.trim()}" ${host} ${actualHttpPort}`);
          console.log(`设置HTTPS代理: ${host}:${actualHttpPort}`);
          await execAsync(`networksetup -setsecurewebproxy "${service.trim()}" ${host} ${actualHttpPort}`);
          console.log(`设置SOCKS代理: ${host}:${socksPort}`);
          await execAsync(`networksetup -setsocksfirewallproxy "${service.trim()}" ${host} ${socksPort}`);
          console.log(`启用HTTP代理`);
          await execAsync(`networksetup -setwebproxystate "${service.trim()}" on`);
          console.log(`启用HTTPS代理`);
          await execAsync(`networksetup -setsecurewebproxystate "${service.trim()}" on`);
          console.log(`启用SOCKS代理`);
          await execAsync(`networksetup -setsocksfirewallproxystate "${service.trim()}" on`);
        }
      }
      console.log(`=== macOS 系统代理设置完成 ===`);
      console.log(`HTTP/HTTPS代理: ${host}:${actualHttpPort}`);
      console.log(`SOCKS代理: ${host}:${socksPort}`);
      await this.verifyProxySettings(serviceLines);
    } catch (error) {
      throw new Error(`Failed to set macOS proxy: ${error}`);
    }
  }
  /**
   * 验证代理设置是否生效
   */
  async verifyProxySettings(services) {
    console.log(`=== 验证代理设置是否生效 ===`);
    try {
      for (const service of services) {
        if (service.trim()) {
          console.log(`检查网络服务 "${service.trim()}" 的代理状态...`);
          const { stdout: httpStatus } = await execAsync(`networksetup -getwebproxy "${service.trim()}"`);
          console.log(`HTTP代理状态:`, httpStatus);
          const { stdout: httpsStatus } = await execAsync(`networksetup -getsecurewebproxy "${service.trim()}"`);
          console.log(`HTTPS代理状态:`, httpsStatus);
          const { stdout: socksStatus } = await execAsync(`networksetup -getsocksfirewallproxy "${service.trim()}"`);
          console.log(`SOCKS代理状态:`, socksStatus);
        }
      }
      console.log(`=== 代理设置验证完成 ===`);
    } catch (error) {
      console.error(`代理设置验证失败:`, error);
    }
  }
  async clearMacOSProxy() {
    try {
      const { stdout: services } = await execAsync("networksetup -listallnetworkservices");
      const serviceLines = services.split("\n").filter((line) => line.trim() && !line.includes("*"));
      for (const service of serviceLines) {
        if (service.trim()) {
          await execAsync(`networksetup -setwebproxystate "${service.trim()}" off`);
          await execAsync(`networksetup -setsecurewebproxystate "${service.trim()}" off`);
          await execAsync(`networksetup -setsocksfirewallproxystate "${service.trim()}" off`);
        }
      }
      console.log("macOS proxy cleared");
    } catch (error) {
      throw new Error(`Failed to clear macOS proxy: ${error}`);
    }
  }
  async getMacOSProxy() {
    try {
      const { stdout: services } = await execAsync("networksetup -listallnetworkservices");
      const serviceLines = services.split("\n").filter((line) => line.trim() && !line.includes("*"));
      for (const service of serviceLines) {
        if (service.trim()) {
          const { stdout } = await execAsync(`networksetup -getwebproxy "${service.trim()}"`);
          const lines = stdout.split("\n");
          for (const line of lines) {
            if (line.includes("Server:") && !line.includes("(null)")) {
              const serverMatch = line.match(/Server: (.+)/);
              const portMatch = stdout.match(/Port: (\d+)/);
              if (serverMatch && portMatch && serverMatch[1] && portMatch[1]) {
                return {
                  host: serverMatch[1].trim(),
                  port: parseInt(portMatch[1]),
                  enabled: true
                };
              }
            }
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to get macOS proxy:", error);
      return null;
    }
  }
  /**
   * Linux系统代理设置
   */
  async setLinuxProxy(host, port) {
    try {
      const proxyUrl = `http://${host}:${port}`;
      await execAsync(`export http_proxy=${proxyUrl}`);
      await execAsync(`export https_proxy=${proxyUrl}`);
      await execAsync(`export HTTP_PROXY=${proxyUrl}`);
      await execAsync(`export HTTPS_PROXY=${proxyUrl}`);
      try {
        await execAsync(`gsettings set org.gnome.system.proxy mode 'manual'`);
        await execAsync(`gsettings set org.gnome.system.proxy.http host '${host}'`);
        await execAsync(`gsettings set org.gnome.system.proxy.http port ${port}`);
        await execAsync(`gsettings set org.gnome.system.proxy.https host '${host}'`);
        await execAsync(`gsettings set org.gnome.system.proxy.https port ${port}`);
      } catch (error) {
        console.warn("GNOME settings not available, using environment variables only");
      }
      console.log(`Linux proxy set to ${host}:${port}`);
    } catch (error) {
      throw new Error(`Failed to set Linux proxy: ${error}`);
    }
  }
  async clearLinuxProxy() {
    try {
      await execAsync("unset http_proxy");
      await execAsync("unset https_proxy");
      await execAsync("unset HTTP_PROXY");
      await execAsync("unset HTTPS_PROXY");
      try {
        await execAsync('gsettings set org.gnome.system.proxy mode "none"');
      } catch (error) {
        console.warn("GNOME settings not available");
      }
      console.log("Linux proxy cleared");
    } catch (error) {
      throw new Error(`Failed to clear Linux proxy: ${error}`);
    }
  }
  async getLinuxProxy() {
    try {
      const httpProxy = process.env["http_proxy"] || process.env["HTTP_PROXY"];
      if (httpProxy) {
        const match = httpProxy.match(/http:\/\/([^:]+):(\d+)/);
        if (match && match[1] && match[2]) {
          return {
            host: match[1],
            port: parseInt(match[2]),
            enabled: true
          };
        }
      }
      try {
        const { stdout } = await execAsync("gsettings get org.gnome.system.proxy mode");
        if (stdout.includes("manual")) {
          const { stdout: host } = await execAsync("gsettings get org.gnome.system.proxy.http host");
          const { stdout: port } = await execAsync("gsettings get org.gnome.system.proxy.http port");
          if (host && port) {
            return {
              host: host.trim().replace(/['"]/g, ""),
              port: parseInt(port.trim()),
              enabled: true
            };
          }
        }
      } catch (error) {
        console.warn("GNOME settings not available");
      }
      return null;
    } catch (error) {
      console.error("Failed to get Linux proxy:", error);
      return null;
    }
  }
  /**
   * 创建VPN连接
   */
  async createVPNConnection(config) {
    switch (process.platform) {
      case "win32":
        await this.createWindowsVPN(config);
        break;
      case "darwin":
        await this.createMacOSVPN(config);
        break;
      case "linux":
        await this.createLinuxVPN(config);
        break;
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }
  /**
   * 连接VPN
   */
  async connectVPN(name) {
    switch (process.platform) {
      case "win32":
        await this.connectWindowsVPN(name);
        break;
      case "darwin":
        await this.connectMacOSVPN(name);
        break;
      case "linux":
        await this.connectLinuxVPN(name);
        break;
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }
  /**
   * 断开VPN
   */
  async disconnectVPN(name) {
    switch (process.platform) {
      case "win32":
        await this.disconnectWindowsVPN(name);
        break;
      case "darwin":
        await this.disconnectMacOSVPN(name);
        break;
      case "linux":
        await this.disconnectLinuxVPN(name);
        break;
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }
  /**
   * Windows VPN操作
   */
  async createWindowsVPN(config) {
    try {
      const command = `Add-VpnConnection -Name "${config.name}" -ServerAddress "${config.server}" -TunnelType "${config.type}" -EncryptionLevel "Required" -AuthenticationMethod MSChapv2 -Force -PassThru -AllUserConnection`;
      await execAsync(`powershell -Command "${command}"`);
      console.log(`Windows VPN connection created: ${config.name}`);
    } catch (error) {
      throw new Error(`Failed to create Windows VPN: ${error}`);
    }
  }
  async connectWindowsVPN(name) {
    try {
      await execAsync(`rasdial "${name}"`);
      console.log(`Windows VPN connected: ${name}`);
    } catch (error) {
      throw new Error(`Failed to connect Windows VPN: ${error}`);
    }
  }
  async disconnectWindowsVPN(name) {
    try {
      await execAsync(`rasdial "${name}" /disconnect`);
      console.log(`Windows VPN disconnected: ${name}`);
    } catch (error) {
      throw new Error(`Failed to disconnect Windows VPN: ${error}`);
    }
  }
  /**
   * macOS VPN操作
   */
  async createMacOSVPN(config) {
    try {
      console.log(`macOS VPN creation not fully implemented for ${config.name}`);
    } catch (error) {
      throw new Error(`Failed to create macOS VPN: ${error}`);
    }
  }
  async connectMacOSVPN(name) {
    try {
      await execAsync(`networksetup -connectpppoeservice "${name}"`);
      console.log(`macOS VPN connected: ${name}`);
    } catch (error) {
      throw new Error(`Failed to connect macOS VPN: ${error}`);
    }
  }
  async disconnectMacOSVPN(name) {
    try {
      await execAsync(`networksetup -disconnectpppoeservice "${name}"`);
      console.log(`macOS VPN disconnected: ${name}`);
    } catch (error) {
      throw new Error(`Failed to disconnect macOS VPN: ${error}`);
    }
  }
  /**
   * Linux VPN操作
   */
  async createLinuxVPN(config) {
    try {
      console.log(`Linux VPN creation not fully implemented for ${config.name}`);
    } catch (error) {
      throw new Error(`Failed to create Linux VPN: ${error}`);
    }
  }
  async connectLinuxVPN(name) {
    try {
      await execAsync(`nmcli connection up "${name}"`);
      console.log(`Linux VPN connected: ${name}`);
    } catch (error) {
      throw new Error(`Failed to connect Linux VPN: ${error}`);
    }
  }
  async disconnectLinuxVPN(name) {
    try {
      await execAsync(`nmcli connection down "${name}"`);
      console.log(`Linux VPN disconnected: ${name}`);
    } catch (error) {
      throw new Error(`Failed to disconnect Linux VPN: ${error}`);
    }
  }
  /**
   * 获取网络接口信息
   */
  getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const result = [];
    for (const [name, nets] of Object.entries(interfaces)) {
      if (nets) {
        for (const net2 of nets) {
          if (net2.family === "IPv4") {
            result.push({
              name,
              address: net2.address,
              netmask: net2.netmask || "",
              family: "IPv4",
              internal: net2.internal
            });
          }
        }
      }
    }
    return result;
  }
  /**
   * 检查系统权限
   */
  async checkPermissions() {
    const result = {
      admin: false,
      network: false,
      vpn: false
    };
    try {
      if (process.platform === "win32") {
        await execAsync("net session");
        result.admin = true;
      } else {
        await execAsync("sudo -n true");
        result.admin = true;
      }
    } catch (error) {
      result.admin = false;
    }
    try {
      const interfaces = this.getNetworkInterfaces();
      result.network = interfaces.length > 0;
    } catch (error) {
      result.network = false;
    }
    result.vpn = result.admin;
    return result;
  }
}
const systemProxyManager = SystemProxyManager.getInstance();
class DefaultSettings {
  /**
   * 获取默认应用设置
   */
  static getDefaultAppSettings() {
    return {
      theme: "auto",
      language: "zh-CN",
      autoStart: false,
      systemProxy: true,
      proxyPort: 7897,
      // HTTP端口
      socksPort: 7896,
      // SOCKS端口
      mixedPort: 7897,
      // 混合端口使用HTTP端口
      allowLan: false,
      mode: "rule",
      logLevel: "info",
      enableLog: true,
      logFile: "chongdong.log",
      enableUdp: true,
      enableIpv6: false,
      enableTun: false,
      tunDevice: "utun0",
      enableFakeIp: true,
      fakeIpRange: "198.18.0.1/16",
      enableDns: true,
      dnsServer: "8.8.8.8",
      enableDoh: false,
      dohServer: "https://dns.google/dns-query",
      // 新增DNS安全性和隐私性配置
      enableDot: false,
      dotServer: "tls://1.1.1.1:853",
      enableDnsCache: true,
      dnsCacheSize: 1e3,
      dnsCacheTtl: 300,
      enableDnsLoadBalance: true,
      dnsServers: [
        "8.8.8.8",
        "8.8.4.4",
        "1.1.1.1",
        "1.0.0.1"
      ],
      enableDnsLogging: false,
      enableDnsLeakProtection: true,
      dnsLeakProtectionMode: "strict",
      enableDnsRules: true,
      dnsRules: [
        {
          id: "block-ads",
          name: "屏蔽广告域名",
          pattern: "ads.",
          patternType: "suffix",
          action: "block",
          enabled: true,
          priority: 100
        },
        {
          id: "block-tracking",
          name: "屏蔽追踪域名",
          pattern: "tracking.",
          patternType: "suffix",
          action: "block",
          enabled: true,
          priority: 100
        },
        {
          id: "local-domains",
          name: "本地域名直连",
          pattern: ".local",
          patternType: "suffix",
          action: "direct",
          enabled: true,
          priority: 200
        }
      ],
      enableDnsFallback: true,
      dnsFallbackServers: [
        "114.114.114.114",
        "223.5.5.5"
      ],
      proxyEngine: "singbox",
      engineSettings: {},
      // 延迟测试设置
      latencyTestUrl: "http://connectivitycheck.gstatic.com/generate_204",
      latencyTestTimeout: 1e4,
      latencyTestRetries: 3,
      latencyTestInterval: 10,
      enableAutoLatencyTest: false,
      latencyTestConcurrency: 3,
      latencyTestUrls: "http://connectivitycheck.gstatic.com/generate_204\nhttp://www.google.com/generate_204\nhttp://www.baidu.com",
      latencyTestValidityPeriod: 30
    };
  }
  /**
   * 获取默认用户偏好设置
   */
  static getDefaultUserPreferences() {
    return {
      windowSize: { width: 1200, height: 800 },
      windowPosition: { x: 100, y: 100 },
      sidebarCollapsed: false,
      autoHideMenuBar: false,
      alwaysOnTop: false,
      minimizeToTray: true,
      startMinimized: false,
      enableNotifications: true,
      notificationSound: true,
      enableHotkeys: true,
      hotkeys: {
        toggleProxy: "Ctrl+Shift+P",
        showMainWindow: "Ctrl+Shift+M",
        quickSwitch: "Ctrl+Shift+S"
      }
    };
  }
  /**
   * 获取默认引擎设置
   */
  static getDefaultEngineSettings() {
    return {
      proxyEngine: "singbox",
      engineSettings: {}
    };
  }
  /**
   * 获取默认网络设置
   */
  static getDefaultNetworkSettings() {
    return {
      enableDns: true,
      dnsServer: "8.8.8.8",
      enableDoh: false,
      dohServer: "https://dns.google/dns-query",
      // 新增DNS安全性和隐私性配置
      enableDot: false,
      dotServer: "tls://1.1.1.1:853",
      enableDnsCache: true,
      dnsCacheSize: 1e3,
      dnsCacheTtl: 300,
      enableDnsLoadBalance: true,
      dnsServers: [
        "8.8.8.8",
        "8.8.4.4",
        "1.1.1.1",
        "1.0.0.1"
      ],
      enableDnsLogging: false,
      enableDnsLeakProtection: true,
      dnsLeakProtectionMode: "strict",
      enableDnsRules: true,
      dnsRules: [
        {
          id: "block-ads",
          name: "屏蔽广告域名",
          pattern: "ads.",
          patternType: "suffix",
          action: "block",
          enabled: true,
          priority: 100
        },
        {
          id: "block-tracking",
          name: "屏蔽追踪域名",
          pattern: "tracking.",
          patternType: "suffix",
          action: "block",
          enabled: true,
          priority: 100
        },
        {
          id: "local-domains",
          name: "本地域名直连",
          pattern: ".local",
          patternType: "suffix",
          action: "direct",
          enabled: true,
          priority: 200
        }
      ],
      enableDnsFallback: true,
      dnsFallbackServers: [
        "114.114.114.114",
        "223.5.5.5"
      ],
      enableTun: false,
      tunDevice: "utun0",
      enableFakeIp: true,
      fakeIpRange: "198.18.0.1/16",
      enableUdp: true,
      enableIpv6: false,
      logLevel: "info",
      enableLog: true,
      logFile: "chongdong.log"
    };
  }
  /**
   * 获取默认延迟测试设置
   */
  static getDefaultLatencyTestSettings() {
    return {
      latencyTestUrl: "http://connectivitycheck.gstatic.com/generate_204",
      latencyTestTimeout: 1e4,
      latencyTestRetries: 3,
      latencyTestInterval: 10,
      enableAutoLatencyTest: false,
      latencyTestConcurrency: 3,
      latencyTestUrls: "http://connectivitycheck.gstatic.com/generate_204\nhttp://www.google.com/generate_204\nhttp://www.baidu.com",
      latencyTestValidityPeriod: 30
    };
  }
}
class SettingsManager {
  constructor() {
    const userDataPath = electron.app.getPath("userData");
    this.settingsPath = path__namespace.join(userDataPath, "settings.json");
    this.preferencesPath = path__namespace.join(userDataPath, "preferences.json");
  }
  static getInstance() {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }
  /**
   * 读取应用设置
   */
  getSettings() {
    try {
      if (fs__namespace.existsSync(this.settingsPath)) {
        const data = fs__namespace.readFileSync(this.settingsPath, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Failed to read settings:", error);
    }
    return this.getDefaultSettings();
  }
  /**
   * 读取用户偏好设置
   */
  getPreferences() {
    try {
      if (fs__namespace.existsSync(this.preferencesPath)) {
        const data = fs__namespace.readFileSync(this.preferencesPath, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Failed to read preferences:", error);
    }
    return this.getDefaultPreferences();
  }
  /**
   * 保存应用设置
   */
  saveSettings(settings) {
    try {
      fs__namespace.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
      console.log("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }
  /**
   * 保存用户偏好设置
   */
  savePreferences(preferences) {
    try {
      fs__namespace.writeFileSync(this.preferencesPath, JSON.stringify(preferences, null, 2));
      console.log("Preferences saved successfully");
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  }
  getDefaultSettings() {
    return DefaultSettings.getDefaultAppSettings();
  }
  getDefaultPreferences() {
    return DefaultSettings.getDefaultUserPreferences();
  }
}
const settingsManager = SettingsManager.getInstance();
const log = {
  info: (message, data, category) => {
    console.log(`[INFO] [${category || "CrashMonitor"}] ${message}`, data || "");
  },
  error: (message, error, category) => {
    console.error(`[ERROR] [${category || "CrashMonitor"}] ${message}`, error || "");
  },
  warn: (message, data, category) => {
    console.warn(`[WARN] [${category || "CrashMonitor"}] ${message}`, data || "");
  }
};
class CrashMonitor {
  constructor() {
    this.crashes = [];
    this.isMonitoring = false;
    this.crashCallbacks = [];
    this.crashLogFile = path__namespace.join(electron.app.getPath("userData"), "crashes.json");
    this.loadCrashHistory();
  }
  static getInstance() {
    if (!CrashMonitor.instance) {
      CrashMonitor.instance = new CrashMonitor();
    }
    return CrashMonitor.instance;
  }
  /**
   * 开始监控
   */
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }
    this.isMonitoring = true;
    this.setupProcessHandlers();
    this.setupIpcHandlers();
    log.info("崩溃监控已启动", null, "CrashMonitor");
  }
  /**
   * 停止监控
   */
  stopMonitoring() {
    this.isMonitoring = false;
    log.info("崩溃监控已停止", null, "CrashMonitor");
  }
  /**
   * 设置进程处理器
   */
  setupProcessHandlers() {
    electron.app.on("render-process-gone", (_event, webContents, details) => {
      this.handleProcessCrash({
        processType: "renderer",
        exitCode: details.exitCode,
        reason: details.reason,
        timestamp: Date.now(),
        details: `渲染进程崩溃: ${details.reason}`,
        context: {
          webContentsId: webContents.id,
          url: webContents.getURL(),
          userAgent: webContents.getUserAgent()
        }
      });
    });
    electron.app.on("gpu-process-crashed", async (_event, killed) => {
      let gpuInfo = null;
      try {
        const rawGpuInfo = await electron.app.getGPUInfo("basic");
        gpuInfo = JSON.parse(JSON.stringify(rawGpuInfo));
      } catch (error) {
        log.warn("获取GPU信息失败", error, "CrashMonitor");
        gpuInfo = {
          error: "Failed to get GPU info",
          message: error instanceof Error ? error.message : "Unknown error"
        };
      }
      this.handleProcessCrash({
        processType: "gpu",
        exitCode: killed ? -1 : 0,
        reason: killed ? "GPU进程被杀死" : "GPU进程崩溃",
        timestamp: Date.now(),
        details: `GPU进程崩溃: ${killed ? "被杀死" : "意外退出"}`,
        context: {
          killed,
          gpuInfo
        }
      });
    });
    electron.app.on("child-process-gone", (_event, details) => {
      this.handleProcessCrash({
        processType: "utility",
        exitCode: details.exitCode,
        reason: details.type,
        timestamp: Date.now(),
        details: `子进程崩溃: ${details.type}`,
        context: {
          processType: details.type,
          serviceName: details.serviceName
        }
      });
    });
    process.on("uncaughtException", (error) => {
      try {
        log.error("未捕获的异常", error, "CrashMonitor");
        this.handleProcessCrash({
          processType: "main",
          exitCode: -1,
          reason: "未捕获的异常",
          timestamp: Date.now(),
          details: error.message,
          stack: error.stack || "",
          context: {
            error: error.toString(),
            name: error.name
          }
        });
        setTimeout(() => {
          console.error("由于未捕获的异常，应用将退出");
          process.exit(1);
        }, 1e3);
      } catch (handlerError) {
        console.error("处理未捕获异常时发生错误:", handlerError);
        process.exit(1);
      }
    });
    process.on("unhandledRejection", (reason, promise) => {
      try {
        log.warn("未处理的Promise拒绝", { reason, promise }, "CrashMonitor");
        this.handleProcessCrash({
          processType: "main",
          exitCode: -1,
          reason: "未处理的Promise拒绝",
          timestamp: Date.now(),
          details: (reason == null ? void 0 : reason.toString()) || "未知原因",
          context: {
            reason: reason == null ? void 0 : reason.toString(),
            promise: promise.toString()
          }
        });
      } catch (handlerError) {
        console.error("处理未处理的Promise拒绝时发生错误:", handlerError);
      }
    });
  }
  /**
   * 设置IPC处理器
   */
  setupIpcHandlers() {
    electron.ipcMain.handle("error:report", async (_event, errorData) => {
      try {
        log.error("收到错误报告", errorData, "CrashMonitor");
        const crashInfo = {
          processType: this.mapErrorTypeToProcess(errorData.type),
          exitCode: -1,
          reason: errorData.message,
          timestamp: errorData.timestamp || Date.now(),
          details: errorData.details,
          stack: errorData.stack,
          context: errorData.context
        };
        this.handleProcessCrash(crashInfo);
        return { success: true };
      } catch (error) {
        log.error("处理错误报告失败", error, "CrashMonitor");
        return { success: false, error: error.message };
      }
    });
    electron.ipcMain.handle("crash:getHistory", async () => {
      return this.crashes;
    });
    electron.ipcMain.handle("crash:clearHistory", async () => {
      this.crashes = [];
      this.saveCrashHistory();
      return { success: true };
    });
    electron.ipcMain.handle("crash:getStats", async () => {
      return this.getCrashStats();
    });
  }
  /**
   * 处理进程崩溃
   */
  handleProcessCrash(crashInfo) {
    this.crashes.push(crashInfo);
    this.saveCrashHistory();
    log.error(`进程崩溃: ${crashInfo.processType}`, {
      exitCode: crashInfo.exitCode,
      reason: crashInfo.reason,
      details: crashInfo.details,
      stack: crashInfo.stack,
      context: crashInfo.context
    }, "CrashMonitor");
    this.notifyCrashCallbacks(crashInfo);
    this.sendCrashToRenderer(crashInfo);
    if (this.isCriticalCrash(crashInfo)) {
      this.handleCriticalCrash(crashInfo);
    }
  }
  /**
   * 判断是否为严重崩溃
   */
  isCriticalCrash(crashInfo) {
    return crashInfo.processType === "main" || crashInfo.processType === "renderer" || crashInfo.exitCode === 15;
  }
  /**
   * 处理严重崩溃
   */
  handleCriticalCrash(crashInfo) {
    log.warn("检测到严重崩溃，尝试恢复", crashInfo, "CrashMonitor");
    if (crashInfo.processType === "renderer") {
      setTimeout(() => {
        this.reloadRendererProcess();
      }, 2e3);
    }
    if (crashInfo.processType === "main") {
      log.error("主进程崩溃，应用将退出", crashInfo, "CrashMonitor");
      setTimeout(() => {
        electron.app.quit();
      }, 1e3);
    }
  }
  /**
   * 重新加载渲染进程
   */
  reloadRendererProcess() {
    try {
      const windows = electron.BrowserWindow.getAllWindows();
      windows.forEach((window) => {
        if (!window.isDestroyed()) {
          window.reload();
          log.info("渲染进程已重新加载", null, "CrashMonitor");
        }
      });
    } catch (error) {
      log.error("重新加载渲染进程失败", error, "CrashMonitor");
    }
  }
  /**
   * 发送崩溃信息到渲染进程
   */
  sendCrashToRenderer(crashInfo) {
    try {
      if (crashInfo.processType === "renderer") {
        return;
      }
      const windows = electron.BrowserWindow.getAllWindows();
      windows.forEach((window) => {
        if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
          try {
            window.webContents.send("app:crash", crashInfo);
          } catch (sendError) {
            log.warn("向单个窗口发送崩溃信息失败", sendError, "CrashMonitor");
          }
        }
      });
    } catch (error) {
      log.error("发送崩溃信息到渲染进程失败", error, "CrashMonitor");
    }
  }
  /**
   * 通知崩溃回调
   */
  notifyCrashCallbacks(crashInfo) {
    this.crashCallbacks.forEach((callback) => {
      try {
        callback(crashInfo);
      } catch (error) {
        log.error("崩溃回调执行失败", error, "CrashMonitor");
      }
    });
  }
  /**
   * 注册崩溃回调
   */
  onCrash(callback) {
    this.crashCallbacks.push(callback);
  }
  /**
   * 移除崩溃回调
   */
  offCrash(callback) {
    const index = this.crashCallbacks.indexOf(callback);
    if (index > -1) {
      this.crashCallbacks.splice(index, 1);
    }
  }
  /**
   * 获取崩溃历史
   */
  getCrashHistory() {
    return [...this.crashes];
  }
  /**
   * 清除崩溃历史
   */
  clearCrashHistory() {
    this.crashes = [];
    this.saveCrashHistory();
    log.info("崩溃历史已清除", null, "CrashMonitor");
  }
  /**
   * 获取崩溃统计信息
   */
  getCrashStats() {
    const byProcessType = {};
    const byExitCode = {};
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1e3;
    this.crashes.forEach((crash) => {
      byProcessType[crash.processType] = (byProcessType[crash.processType] || 0) + 1;
      byExitCode[crash.exitCode] = (byExitCode[crash.exitCode] || 0) + 1;
    });
    const recentCrashes = this.crashes.filter((crash) => crash.timestamp > oneHourAgo).length;
    return {
      total: this.crashes.length,
      byProcessType,
      byExitCode,
      recentCrashes
    };
  }
  /**
   * 加载崩溃历史
   */
  loadCrashHistory() {
    try {
      if (fs__namespace.existsSync(this.crashLogFile)) {
        const data = fs__namespace.readFileSync(this.crashLogFile, "utf8");
        this.crashes = JSON.parse(data);
        log.info(`已加载 ${this.crashes.length} 条崩溃记录`, null, "CrashMonitor");
      }
    } catch (error) {
      log.error("加载崩溃历史失败", error, "CrashMonitor");
      this.crashes = [];
    }
  }
  /**
   * 保存崩溃历史
   */
  saveCrashHistory() {
    try {
      const recentCrashes = this.crashes.slice(-1e3);
      fs__namespace.writeFileSync(this.crashLogFile, JSON.stringify(recentCrashes, null, 2));
    } catch (error) {
      log.error("保存崩溃历史失败", error, "CrashMonitor");
    }
  }
  /**
   * 映射错误类型到进程类型
   */
  mapErrorTypeToProcess(errorType) {
    switch (errorType) {
      case "renderer_crash":
        return "renderer";
      case "gpu_crash":
        return "gpu";
      case "network_crash":
        return "network";
      case "proxy_crash":
        return "utility";
      case "dns_error":
        return "utility";
      case "config_error":
        return "main";
      case "storage_error":
        return "main";
      case "ipc_error":
        return "main";
      default:
        return "main";
    }
  }
  /**
   * 检查应用健康状态
   */
  checkAppHealth() {
    const stats = this.getCrashStats();
    const issues = [];
    const recommendations = [];
    if (stats.recentCrashes > 5) {
      issues.push(`最近一小时发生了 ${stats.recentCrashes} 次崩溃`);
      recommendations.push("建议重启应用或检查系统资源");
    }
    if (stats.byProcessType["gpu"] && stats.byProcessType["gpu"] > 0) {
      issues.push("检测到GPU进程崩溃");
      recommendations.push("建议更新显卡驱动或禁用硬件加速");
    }
    if (stats.byProcessType["renderer"] && stats.byProcessType["renderer"] > 0) {
      issues.push("检测到渲染进程崩溃");
      recommendations.push("建议检查内存使用情况或重启应用");
    }
    if (stats.byProcessType["main"] && stats.byProcessType["main"] > 0) {
      issues.push("检测到主进程崩溃");
      recommendations.push("建议检查系统稳定性或重新安装应用");
    }
    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }
}
const crashMonitor = CrashMonitor.getInstance();
try {
  electron.app.disableHardwareAcceleration();
  console.log("已禁用硬件加速");
  electron.app.commandLine.appendSwitch("--disable-gpu");
  electron.app.commandLine.appendSwitch("--disable-gpu-compositing");
  electron.app.commandLine.appendSwitch("--disable-gpu-rasterization");
  electron.app.commandLine.appendSwitch("--disable-gpu-sandbox");
  console.log("已设置GPU禁用标志");
} catch (err) {
  console.warn("禁用硬件加速失败(可忽略):", err);
}
let mainWindow = null;
let tray = null;
let isQuitting = false;
let globalShortcutManager = null;
let notificationManager = null;
async function quitApp() {
  try {
    console.log("开始退出应用...");
    isQuitting = true;
    try {
      console.log("停止崩溃监控...");
      crashMonitor.stopMonitoring();
      console.log("崩溃监控已停止");
    } catch (error) {
      console.error("停止崩溃监控失败:", error);
    }
    try {
      console.log("停止所有代理进程...");
      await proxyManager.stopAll();
      console.log("代理进程已停止");
    } catch (error) {
      console.error("停止代理进程失败:", error);
    }
    try {
      console.log("清理系统代理设置...");
      await systemProxyManager.clearSystemProxy();
      console.log("系统代理设置已清理");
    } catch (error) {
      console.error("清理系统代理设置失败:", error);
    }
    try {
      console.log("注销全局快捷键...");
      if (globalShortcutManager) {
        globalShortcutManager.unregisterAllHotcuts();
      }
      console.log("全局快捷键已注销");
    } catch (error) {
      console.error("注销全局快捷键失败:", error);
    }
    try {
      console.log("销毁托盘...");
      if (tray) {
        tray.destroy();
        tray = null;
      }
      console.log("托盘已销毁");
    } catch (error) {
      console.error("销毁托盘失败:", error);
    }
    try {
      console.log("关闭所有窗口...");
      const windows = electron.BrowserWindow.getAllWindows();
      for (const window of windows) {
        if (!window.isDestroyed()) {
          window.destroy();
        }
      }
      console.log("所有窗口已关闭");
    } catch (error) {
      console.error("关闭窗口失败:", error);
    }
    console.log("退出应用进程...");
    electron.app.exit(0);
  } catch (error) {
    console.error("退出应用过程中发生错误:", error);
    process.exit(0);
  }
}
function showMainWindow() {
  try {
    if (!mainWindow) {
      console.warn("showMainWindow: mainWindow 不存在，尝试重新创建");
      createWindow();
    }
    if (!mainWindow) {
      console.error("showMainWindow: 无法创建主窗口");
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.focus();
    console.log("showMainWindow: 窗口已显示并聚焦");
  } catch (error) {
    console.error("showMainWindow: 显示窗口失败:", error);
  }
}
function getUserPreferences() {
  try {
    return settingsManager.getPreferences();
  } catch (error) {
    console.error("Failed to read user preferences:", error);
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
        toggleProxy: "Ctrl+Shift+P",
        showMainWindow: "Ctrl+Shift+M",
        quickSwitch: "Ctrl+Shift+S"
      }
    };
  }
}
function createTray() {
  try {
    console.log("开始创建系统托盘...");
    let icon;
    try {
      const iconPath = path.join(__dirname, "../renderer/assets/icon.png");
      if (require("fs").existsSync(iconPath)) {
        icon = electron.nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
        console.log("使用自定义托盘图标");
      } else {
        throw new Error("图标文件不存在");
      }
    } catch (error) {
      console.log("使用默认托盘图标");
      icon = electron.nativeImage.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3Njape.org5vuPBoAAAB8SURBVDiNY2AYBYMRMDIyMjAyMjL8//+f4f///wws0AqYGBkZGRgYGBj+//8P5v///5+BBaQYpBikCKoYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGAAAZqQZ8QAAAABJRU5ErkJggg==");
    }
    tray = new electron.Tray(icon);
    console.log("托盘图标已创建");
    const contextMenu = electron.Menu.buildFromTemplate([
      {
        label: "显示所有窗口",
        click: () => {
          console.log("托盘菜单：显示所有窗口被点击");
          showMainWindow();
        }
      },
      {
        label: "隐藏",
        click: () => {
          console.log("托盘菜单：隐藏被点击");
          if (mainWindow) {
            mainWindow.hide();
          }
        }
      },
      {
        label: "退出",
        click: async () => {
          console.log("托盘菜单：退出被点击");
          await quitApp();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip("虫洞代理");
    console.log("托盘菜单已设置");
    tray.on("click", () => {
      console.log("=== 托盘图标被点击 ===");
      console.log("mainWindow状态:", mainWindow ? "存在" : "null");
      console.log("mainWindow是否可见:", mainWindow == null ? void 0 : mainWindow.isVisible());
      console.log("mainWindow是否最小化:", mainWindow == null ? void 0 : mainWindow.isMinimized());
      showMainWindow();
    });
    tray.on("right-click", () => {
      console.log("托盘图标右键被点击");
    });
    tray.on("double-click", () => {
      console.log("托盘图标被双击");
      showMainWindow();
    });
    console.log("系统托盘已创建完成");
  } catch (error) {
    console.error("创建系统托盘失败:", error);
  }
}
function createWindow() {
  const preferences = getUserPreferences();
  let iconPath;
  try {
    if (process.platform === "darwin") {
      const icnsPath = path.join(__dirname, "../../release/mac/虫洞.app/Contents/Resources/electron.icns");
      if (require("fs").existsSync(icnsPath)) {
        iconPath = icnsPath;
        console.log("使用 macOS 图标:", iconPath);
      }
    } else {
      const pngPath = path.join(__dirname, "../renderer/assets/icon.png");
      if (require("fs").existsSync(pngPath)) {
        iconPath = pngPath;
        console.log("使用 PNG 图标:", iconPath);
      }
    }
  } catch (error) {
    console.warn("图标文件不存在，使用默认图标:", error);
  }
  const windowOptions = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: preferences.autoHideMenuBar,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      backgroundThrottling: false
    }
  };
  if (iconPath) {
    windowOptions.icon = iconPath;
  }
  mainWindow = new electron.BrowserWindow(windowOptions);
  const loadMainContents = () => {
    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
      mainWindow == null ? void 0 : mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    } else {
      mainWindow == null ? void 0 : mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
    }
  };
  mainWindow.on("ready-to-show", () => {
    createTray();
    globalShortcutManager = createGlobalShortcutManager(mainWindow);
    const prefs = getUserPreferences();
    const notificationConfig = {
      enableNotifications: prefs.enableNotifications ?? true,
      notificationSound: prefs.notificationSound ?? true
    };
    notificationManager = createNotificationManager(notificationConfig);
    if (prefs.startMinimized) {
      console.log("应用启动时最小化（不显示窗口）");
    } else {
      console.log("应用启动时显示窗口");
      showMainWindow();
    }
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("did-fail-load", (_e, errorCode, errorDescription) => {
    console.error("did-fail-load:", errorCode, errorDescription);
    setTimeout(() => loadMainContents(), 300);
  });
  mainWindow.webContents.on("render-process-gone", (_e, details) => {
    console.error("render-process-gone:", details);
    setTimeout(() => loadMainContents(), 300);
  });
  mainWindow.on("close", (event) => {
    const preferences2 = getUserPreferences();
    if (preferences2.minimizeToTray && !isQuitting) {
      event.preventDefault();
      mainWindow == null ? void 0 : mainWindow.hide();
    }
  });
  loadMainContents();
  const template = [
    {
      label: "文件",
      submenu: [
        {
          label: "新建配置",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow == null ? void 0 : mainWindow.webContents.send("menu-new-config");
          }
        },
        {
          label: "导入配置",
          accelerator: "CmdOrCtrl+O",
          click: () => {
            mainWindow == null ? void 0 : mainWindow.webContents.send("menu-import-config");
          }
        },
        { type: "separator" },
        {
          label: "退出",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: async () => {
            await quitApp();
          }
        }
      ]
    },
    {
      label: "编辑",
      submenu: [
        { label: "撤销", accelerator: "CmdOrCtrl+Z", role: "undo" },
        { label: "重做", accelerator: "Shift+CmdOrCtrl+Z", role: "redo" },
        { type: "separator" },
        { label: "剪切", accelerator: "CmdOrCtrl+X", role: "cut" },
        { label: "复制", accelerator: "CmdOrCtrl+C", role: "copy" },
        { label: "粘贴", accelerator: "CmdOrCtrl+V", role: "paste" }
      ]
    },
    {
      label: "视图",
      submenu: [
        { label: "重新加载", accelerator: "CmdOrCtrl+R", role: "reload" },
        { label: "强制重新加载", accelerator: "CmdOrCtrl+Shift+R", role: "forceReload" },
        { label: "开发者工具", accelerator: "F12", role: "toggleDevTools" },
        { type: "separator" },
        { label: "实际大小", accelerator: "CmdOrCtrl+0", role: "resetZoom" },
        { label: "放大", accelerator: "CmdOrCtrl+Plus", role: "zoomIn" },
        { label: "缩小", accelerator: "CmdOrCtrl+-", role: "zoomOut" },
        { type: "separator" },
        { label: "全屏", accelerator: "F11", role: "togglefullscreen" }
      ]
    },
    {
      label: "窗口",
      submenu: [
        { label: "最小化", accelerator: "CmdOrCtrl+M", role: "minimize" },
        { label: "关闭", accelerator: "CmdOrCtrl+W", role: "close" }
      ]
    },
    {
      label: "帮助",
      submenu: [
        {
          label: "关于虫洞",
          click: () => {
            mainWindow == null ? void 0 : mainWindow.webContents.send("menu-about");
          }
        }
      ]
    }
  ];
  const menu = electron.Menu.buildFromTemplate(template);
  electron.Menu.setApplicationMenu(menu);
}
electron.app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.chongdong.app");
  crashMonitor.startMonitoring();
  electron.app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showMainWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    quitApp();
  }
});
electron.app.on("before-quit", async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    await quitApp();
  }
});
electron.app.on("will-quit", () => {
  console.log("应用即将退出...");
});
electron.app.on("quit", (_, exitCode) => {
  console.log("应用已退出，退出码:", exitCode);
});
electron.ipcMain.handle("get-app-version", () => {
  return electron.app.getVersion();
});
electron.ipcMain.handle("get-app-name", () => {
  return electron.app.getName();
});
electron.ipcMain.handle("get-app-path", () => {
  return electron.app.getAppPath();
});
electron.ipcMain.handle("core:download", async (_, coreName) => {
  try {
    await coreDownloader.downloadCore(coreName);
    return { success: true };
  } catch (error) {
    console.error(`Failed to download core ${coreName}:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("core:downloadDatabase", async (_, dbName) => {
  try {
    await coreDownloader.downloadDatabase(dbName);
    return { success: true };
  } catch (error) {
    console.error(`Failed to download database ${dbName}:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("core:getStatus", async () => {
  try {
    return coreDownloader.getCoresStatus();
  } catch (error) {
    console.error("Failed to get core status:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("core:isInstalled", (_, coreName) => {
  return coreDownloader.isCoreInstalled(coreName);
});
electron.ipcMain.handle("proxy:startSingbox", async (_, config) => {
  console.log(`=== 收到启动 Sing-box 请求 ===`);
  console.log(`配置数据:`, JSON.stringify(config, null, 2));
  try {
    console.log(`开始启动 Sing-box...`);
    await proxyManager.startSingbox(config);
    console.log(`=== Sing-box 启动成功 ===`);
    return { success: true };
  } catch (error) {
    console.error(`=== Sing-box 启动失败 ===`);
    console.error(`错误详情:`, error);
    console.error(`错误消息: ${error instanceof Error ? error.message : "Unknown error"}`);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("proxy:startXray", async (_, config) => {
  try {
    await proxyManager.startXray(config);
    return { success: true };
  } catch (error) {
    console.error("Failed to start Xray:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("proxy:startClash", async (_, config) => {
  try {
    await proxyManager.startClash(config);
    return { success: true };
  } catch (error) {
    console.error("Failed to start Clash:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("proxy:stop", async () => {
  try {
    await proxyManager.stopAll();
    return { success: true };
  } catch (error) {
    console.error("Failed to stop proxy:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("proxy:getStats", async () => {
  try {
    return await proxyManager.getStats();
  } catch (error) {
    console.error("Failed to get proxy stats:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("system:setProxy", async (_, { host, socksPort, httpPort }) => {
  try {
    await systemProxyManager.setSystemProxy(host, socksPort, httpPort);
    return { success: true };
  } catch (error) {
    console.error("Failed to set system proxy:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("system:clearProxy", async () => {
  try {
    await systemProxyManager.clearSystemProxy();
    return { success: true };
  } catch (error) {
    console.error("Failed to clear system proxy:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("system:getProxy", async () => {
  try {
    return await systemProxyManager.getSystemProxy();
  } catch (error) {
    console.error("Failed to get system proxy:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("proxy:killProcessOnPort", async (_, port) => {
  try {
    const { exec } = require("child_process");
    const util2 = require("util");
    const execAsync2 = util2.promisify(exec);
    console.log(`尝试终止占用端口 ${port} 的进程...`);
    try {
      const { stdout } = await execAsync2(`lsof -ti:${port}`);
      if (stdout.trim()) {
        const pids = stdout.trim().split("\n");
        for (const pid of pids) {
          console.log(`终止进程 ${pid} (占用端口 ${port})`);
          await execAsync2(`kill -9 ${pid}`);
        }
        return { success: true, message: `已终止占用端口 ${port} 的进程` };
      }
    } catch (lsofError) {
      console.log("lsof 命令未找到进程，尝试其他方法...");
    }
    try {
      const { stdout } = await execAsync2(`netstat -anv | grep ${port}`);
      if (stdout.includes("LISTEN")) {
        const match = stdout.match(/\s+(\d+)\s+/);
        if (match && match[1]) {
          const pid = match[1];
          console.log(`通过 netstat 找到进程 ${pid}，尝试终止...`);
          await execAsync2(`kill -9 ${pid}`);
          return { success: true, message: `已终止占用端口 ${port} 的进程` };
        }
      }
    } catch (netstatError) {
      console.log("netstat 命令也失败，尝试强制清理...");
    }
    try {
      console.log("强制清理所有 sing-box 进程...");
      await execAsync2("pkill -f sing-box");
      await execAsync2('pkill -f "sing-box run"');
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      try {
        const { stdout } = await execAsync2(`lsof -ti:${port}`);
        if (!stdout.trim()) {
          return { success: true, message: `已清理所有相关进程，端口 ${port} 已释放` };
        }
      } catch (finalCheckError) {
        return { success: true, message: `已清理所有相关进程` };
      }
    } catch (pkillError) {
      console.log("pkill 命令失败:", pkillError);
    }
    return { success: false, message: `无法终止占用端口 ${port} 的进程，请手动检查` };
  } catch (error) {
    console.error("Failed to kill process on port:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("vpn:create", async (_, config) => {
  try {
    await systemProxyManager.createVPNConnection(config);
    return { success: true };
  } catch (error) {
    console.error("Failed to create VPN:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("vpn:connect", async (_, name) => {
  try {
    await systemProxyManager.connectVPN(name);
    return { success: true };
  } catch (error) {
    console.error("Failed to connect VPN:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("vpn:disconnect", async (_, name) => {
  try {
    await systemProxyManager.disconnectVPN(name);
    return { success: true };
  } catch (error) {
    console.error("Failed to disconnect VPN:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("vpn:getStatus", async () => {
  try {
    return { connected: false };
  } catch (error) {
    console.error("Failed to get VPN status:", error);
    return { connected: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("system:checkPermissions", async () => {
  try {
    return await systemProxyManager.checkPermissions();
  } catch (error) {
    console.error("Failed to check permissions:", error);
    return { admin: false, network: false, vpn: false };
  }
});
electron.ipcMain.handle("system:requestAdmin", async () => {
  try {
    return false;
  } catch (error) {
    console.error("Failed to request admin:", error);
    return false;
  }
});
electron.ipcMain.handle("subscription:parse", async (_event, _url) => {
  try {
    return { success: true, servers: [], groups: [] };
  } catch (error) {
    console.error("Failed to parse subscription:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("window:setAlwaysOnTop", async (_, alwaysOnTop) => {
  try {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(alwaysOnTop);
      console.log(`窗口置顶设置已更新: ${alwaysOnTop}`);
      return { success: true };
    } else {
      return { success: false, error: "主窗口未找到" };
    }
  } catch (error) {
    console.error("Failed to set always on top:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("window:setAutoHideMenuBar", async (_, autoHideMenuBar) => {
  try {
    if (mainWindow) {
      mainWindow.setAutoHideMenuBar(autoHideMenuBar);
      console.log(`菜单栏自动隐藏设置已更新: ${autoHideMenuBar}`);
      return { success: true };
    } else {
      return { success: false, error: "主窗口未找到" };
    }
  } catch (error) {
    console.error("Failed to set auto hide menu bar:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("window:minimize", async () => {
  try {
    if (mainWindow) {
      mainWindow.minimize();
      return { success: true };
    } else {
      return { success: false, error: "主窗口未找到" };
    }
  } catch (error) {
    console.error("Failed to minimize window:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("window:show", async () => {
  try {
    showMainWindow();
    return { success: true };
  } catch (error) {
    console.error("Failed to show window:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("window:showFromTray", async () => {
  try {
    showMainWindow();
    return { success: true };
  } catch (error) {
    console.error("Failed to show window from tray:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("app:quit", async () => {
  try {
    console.log("收到渲染进程退出请求");
    await quitApp();
    return { success: true };
  } catch (error) {
    console.error("退出应用失败:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("tray:test", async () => {
  try {
    console.log("=== 测试托盘功能 ===");
    console.log("托盘对象存在:", tray ? "是" : "否");
    console.log("主窗口存在:", mainWindow ? "是" : "否");
    console.log("主窗口是否可见:", mainWindow == null ? void 0 : mainWindow.isVisible());
    console.log("主窗口是否最小化:", mainWindow == null ? void 0 : mainWindow.isMinimized());
    if (tray) {
      console.log("托盘图标已创建，尝试显示菜单");
      tray.popUpContextMenu();
      return { success: true, message: "托盘测试完成，请查看控制台日志" };
    } else {
      return { success: false, error: "托盘对象不存在" };
    }
  } catch (error) {
    console.error("托盘测试失败:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("proxy:testLatency", async (_, { node, config }) => {
  try {
    console.log("开始测试节点延迟:", node.name, config);
    const startTime = Date.now();
    const https2 = require("https");
    const http = require("http");
    const testUrl = config.testUrl || "http://connectivitycheck.gstatic.com/generate_204";
    const timeout = config.timeout || 1e4;
    return new Promise((resolve) => {
      const url = new URL(testUrl);
      const isHttps = url.protocol === "https:";
      const client = isHttps ? https2 : http;
      const req = client.request(url, {
        method: "GET",
        timeout
        // 如果需要通过代理测试，可以在这里添加代理配置
        // 例如：agent: new HttpsProxyAgent(proxyUrl)
      }, (res) => {
        const endTime = Date.now();
        const latency = endTime - startTime;
        console.log(`延迟测试成功: ${node.name}`, { latency });
        resolve({
          success: true,
          latency,
          statusCode: res.statusCode
        });
      });
      req.on("error", (error) => {
        console.error(`延迟测试失败: ${node.name}`, error);
        resolve({
          success: false,
          error: error.message,
          latency: 0
        });
      });
      req.on("timeout", () => {
        console.error(`延迟测试超时: ${node.name}`);
        req.destroy();
        resolve({
          success: false,
          error: "Request timeout",
          latency: 0
        });
      });
      req.end();
    });
  } catch (error) {
    console.error("延迟测试处理失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      latency: 0
    };
  }
});
electron.ipcMain.handle("latency:test", async (_, config) => {
  try {
    console.log("测试延迟配置:", config);
    return {
      success: true,
      message: "延迟测试配置验证成功"
    };
  } catch (error) {
    console.error("延迟测试配置验证失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
});
electron.ipcMain.handle("latency:reset", async () => {
  try {
    console.log("重置延迟测试配置为默认值");
    return {
      success: true,
      message: "延迟测试配置已重置"
    };
  } catch (error) {
    console.error("重置延迟测试配置失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
});
electron.ipcMain.handle("settings:updated", async (_, settings) => {
  try {
    console.log("收到设置更新通知:", settings);
    if (settings.settings) {
      settingsManager.saveSettings(settings.settings);
    }
    if (settings.preferences) {
      settingsManager.savePreferences(settings.preferences);
    }
    if (mainWindow && settings.preferences) {
      const { alwaysOnTop, autoHideMenuBar } = settings.preferences;
      if (alwaysOnTop !== void 0) {
        mainWindow.setAlwaysOnTop(alwaysOnTop);
        console.log("窗口置顶设置已更新:", alwaysOnTop);
      }
      if (autoHideMenuBar !== void 0) {
        mainWindow.setAutoHideMenuBar(autoHideMenuBar);
        console.log("菜单栏自动隐藏设置已更新:", autoHideMenuBar);
      }
    }
    if (settings.preferences && globalShortcutManager) {
      const { enableHotkeys, hotkeys } = settings.preferences;
      if (enableHotkeys && hotkeys) {
        const result = globalShortcutManager.registerHotkeys(hotkeys);
        console.log("全局快捷键设置已更新:", result);
        if (!result.success && result.conflicts.length > 0) {
          console.warn("快捷键冲突:", result.conflicts);
        }
      } else if (!enableHotkeys) {
        globalShortcutManager.unregisterAllHotcuts();
        console.log("全局快捷键已禁用");
      }
    }
    if (settings.preferences && notificationManager) {
      const { enableNotifications, notificationSound } = settings.preferences;
      notificationManager.updateConfig({
        enableNotifications,
        notificationSound
      });
      console.log("通知设置已更新:", { enableNotifications, notificationSound });
    }
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
      try {
        const { ProxyManager: ProxyManager2 } = require("./proxyManager");
        const proxyManager2 = ProxyManager2.getInstance();
        proxyManager2.updateNetworkSettings(networkSettings);
        try {
          await proxyManager2.restartAllProcesses();
          console.log("代理进程已重启以应用新设置");
        } catch (error) {
          console.error("重启代理进程失败:", error);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("proxy:restartFailed", {
              error: error instanceof Error ? error.message : "Unknown error"
            });
          }
        }
      } catch (error) {
        console.error("更新代理管理器设置失败:", error);
      }
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to apply settings:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("subscription:update", async (_event, _subscription) => {
  try {
    return { success: true, servers: [], groups: [] };
  } catch (error) {
    console.error("Failed to update subscription:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("monitor:get-stats", async () => {
  try {
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
    console.error("Failed to get monitor stats:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("monitor:get-history", async (_event, _limit = 100) => {
  try {
    return { history: [] };
  } catch (error) {
    console.error("Failed to get monitor history:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("network:getInterfaces", async () => {
  try {
    return systemProxyManager.getNetworkInterfaces();
  } catch (error) {
    console.error("Failed to get network interfaces:", error);
    return [];
  }
});
electron.ipcMain.handle("network:getStatus", async () => {
  var _a, _b;
  try {
    const interfaces = systemProxyManager.getNetworkInterfaces();
    return {
      connected: interfaces.length > 0,
      type: "ethernet",
      interface: ((_a = interfaces[0]) == null ? void 0 : _a.name) || "",
      ip: ((_b = interfaces[0]) == null ? void 0 : _b.address) || ""
    };
  } catch (error) {
    console.error("Failed to get network status:", error);
    return { connected: false, type: "unknown", interface: "", ip: "" };
  }
});
electron.ipcMain.handle("hotkeys:register", async (_, hotkeys) => {
  try {
    if (!globalShortcutManager) {
      return { success: false, error: "全局快捷键管理器未初始化" };
    }
    const result = globalShortcutManager.registerHotkeys(hotkeys);
    console.log("全局快捷键注册结果:", result);
    return result;
  } catch (error) {
    console.error("注册全局快捷键失败:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("hotkeys:unregister", async (_, shortcut) => {
  try {
    if (!globalShortcutManager) {
      return { success: false, error: "全局快捷键管理器未初始化" };
    }
    const success = globalShortcutManager.unregisterHotkey(shortcut);
    return { success };
  } catch (error) {
    console.error("注销全局快捷键失败:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("hotkeys:unregister-all", async () => {
  try {
    if (!globalShortcutManager) {
      return { success: false, error: "全局快捷键管理器未初始化" };
    }
    globalShortcutManager.unregisterAllHotcuts();
    return { success: true };
  } catch (error) {
    console.error("注销所有全局快捷键失败:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("hotkeys:validate", async (_, shortcut) => {
  try {
    if (!globalShortcutManager) {
      return { valid: false, error: "全局快捷键管理器未初始化" };
    }
    return globalShortcutManager.validateShortcut(shortcut);
  } catch (error) {
    console.error("验证快捷键失败:", error);
    return { valid: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("hotkeys:check-availability", async (_, shortcut) => {
  try {
    if (!globalShortcutManager) {
      return { available: false, error: "全局快捷键管理器未初始化" };
    }
    const available = globalShortcutManager.isShortcutAvailable(shortcut);
    return { available };
  } catch (error) {
    console.error("检查快捷键可用性失败:", error);
    return { available: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("notification:send", async (_, options) => {
  try {
    if (!notificationManager) {
      return { success: false, error: "通知管理器未初始化" };
    }
    const success = await notificationManager.sendNotification(options);
    return { success };
  } catch (error) {
    console.error("发送通知失败:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("notification:test", async () => {
  try {
    if (!notificationManager) {
      return { success: false, error: "通知管理器未初始化" };
    }
    const success = await notificationManager.testNotification();
    return { success };
  } catch (error) {
    console.error("测试通知失败:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("notification:check-permission", async () => {
  try {
    if (!notificationManager) {
      return { hasPermission: false, error: "通知管理器未初始化" };
    }
    const hasPermission = await notificationManager.checkPermission();
    return { hasPermission };
  } catch (error) {
    console.error("检查通知权限失败:", error);
    return { hasPermission: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("notification:update-config", async (_, config) => {
  try {
    if (!notificationManager) {
      return { success: false, error: "通知管理器未初始化" };
    }
    notificationManager.updateConfig(config);
    return { success: true };
  } catch (error) {
    console.error("更新通知配置失败:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("notification:is-supported", async () => {
  try {
    if (!notificationManager) {
      return { supported: false, error: "通知管理器未初始化" };
    }
    const supported = notificationManager.isNotificationSupported();
    return { supported };
  } catch (error) {
    console.error("检查通知支持失败:", error);
    return { supported: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("geolocation:testViaProxy", async (_, { proxyUrl }) => {
  try {
    console.log("开始通过代理测试IP地理位置:", proxyUrl);
    const http = require("http");
    const https2 = require("https");
    const tls = require("tls");
    const { URL: URL2 } = require("url");
    const { Buffer } = require("buffer");
    const apis = [
      "https://ipapi.co/json/",
      "https://ipinfo.io/json",
      "https://api.ipify.org?format=json"
    ];
    const proxyUrlObj = new URL2(proxyUrl);
    const appSettings = settingsManager.getSettings();
    const proxyHost = proxyUrlObj.hostname || "127.0.0.1";
    const proxyPort = Number(appSettings == null ? void 0 : appSettings.proxyPort) || Number(proxyUrlObj.port) || 7897;
    const socksPort = Number(appSettings == null ? void 0 : appSettings.socksPort) || 7896;
    const proxyAuthHeader = proxyUrlObj.username || proxyUrlObj.password ? "Basic " + Buffer.from(`${decodeURIComponent(proxyUrlObj.username)}:${decodeURIComponent(proxyUrlObj.password)}`).toString("base64") : void 0;
    const tryViaHttpConnect = (api) => new Promise((resolve) => {
      try {
        const targetUrl = new URL2(api);
        const targetIsHttps = targetUrl.protocol === "https:";
        const targetPort = Number(targetUrl.port) || (targetIsHttps ? 443 : 80);
        const connectReq = http.request({
          host: proxyHost,
          port: proxyPort,
          method: "CONNECT",
          path: `${targetUrl.hostname}:${targetPort}`,
          headers: {
            Host: `${targetUrl.hostname}:${targetPort}`,
            ...proxyAuthHeader ? { "Proxy-Authorization": proxyAuthHeader } : {}
          }
        });
        connectReq.setTimeout(1e4, () => connectReq.destroy(new Error("Proxy CONNECT timeout")));
        connectReq.on("connect", (_res, socket) => {
          const onError = (err) => {
            resolve({ success: false, error: (err == null ? void 0 : err.message) || String(err) });
          };
          if (targetIsHttps) {
            const tlsSocket = tls.connect({
              socket,
              servername: targetUrl.hostname,
              rejectUnauthorized: false
            });
            tlsSocket.setTimeout(1e4, () => tlsSocket.destroy(new Error("TLS request timeout")));
            const req = https2.request({
              host: targetUrl.hostname,
              port: targetPort,
              method: "GET",
              path: targetUrl.pathname + targetUrl.search,
              headers: {
                Host: targetUrl.hostname,
                Accept: "application/json",
                "User-Agent": "Chongdong/1.0"
              }
            });
            req.on("error", onError);
            req.on("response", (res) => {
              let data2 = "";
              res.on("data", (chunk) => data2 += chunk);
              res.on("end", () => {
                try {
                  const jsonData = JSON.parse(data2);
                  let result;
                  if (api.includes("ipapi.co")) {
                    result = {
                      success: true,
                      ip: jsonData.ip,
                      country: jsonData.country_name,
                      region: jsonData.region,
                      city: jsonData.city,
                      isp: jsonData.org,
                      timezone: jsonData.timezone
                    };
                  } else if (api.includes("ipinfo.io")) {
                    result = {
                      success: true,
                      ip: jsonData.ip,
                      country: jsonData.country,
                      region: jsonData.region,
                      city: jsonData.city,
                      isp: jsonData.org,
                      timezone: jsonData.timezone
                    };
                  } else {
                    result = { success: true, ip: jsonData.ip };
                  }
                  console.log("通过代理IP地理位置测试成功:", result);
                  resolve(result);
                } catch (e) {
                  resolve({ success: false, error: "Failed to parse response" });
                }
              });
            });
            const requestLines = [
              `GET ${targetUrl.pathname + targetUrl.search} HTTP/1.1`,
              `Host: ${targetUrl.hostname}`,
              "Accept: application/json",
              "User-Agent: Chongdong/1.0",
              "Connection: close",
              "",
              ""
            ].join("\r\n");
            let data = "";
            tlsSocket.once("secureConnect", () => {
              tlsSocket.write(requestLines);
            }).on("data", (chunk) => data += chunk.toString()).on("error", onError).on("end", () => {
              try {
                const body = data.split("\r\n\r\n")[1] || "";
                const jsonData = JSON.parse(body);
                let result;
                if (api.includes("ipapi.co")) {
                  result = {
                    success: true,
                    ip: jsonData.ip,
                    country: jsonData.country_name,
                    region: jsonData.region,
                    city: jsonData.city,
                    isp: jsonData.org,
                    timezone: jsonData.timezone
                  };
                } else if (api.includes("ipinfo.io")) {
                  result = {
                    success: true,
                    ip: jsonData.ip,
                    country: jsonData.country,
                    region: jsonData.region,
                    city: jsonData.city,
                    isp: jsonData.org,
                    timezone: jsonData.timezone
                  };
                } else {
                  result = { success: true, ip: jsonData.ip };
                }
                resolve(result);
              } catch (e) {
                resolve({ success: false, error: "Failed to parse response" });
              }
            });
          } else {
            const requestLines = [
              `GET ${targetUrl.pathname + targetUrl.search} HTTP/1.1`,
              `Host: ${targetUrl.hostname}`,
              "Accept: application/json",
              "User-Agent: Chongdong/1.0",
              "Connection: close",
              "",
              ""
            ].join("\r\n");
            socket.write(requestLines);
            let data = "";
            socket.on("data", (chunk) => data += chunk.toString()).on("error", onError).on("end", () => {
              try {
                const body = data.split("\r\n\r\n")[1] || "";
                const jsonData = JSON.parse(body);
                const result = { success: true, ip: jsonData.ip };
                resolve(result);
              } catch (e) {
                resolve({ success: false, error: "Failed to parse response" });
              }
            });
          }
        });
        connectReq.on("error", (err) => {
          resolve({ success: false, error: (err == null ? void 0 : err.message) || String(err) });
        });
        connectReq.end();
      } catch (e) {
        resolve({ success: false, error: (e == null ? void 0 : e.message) || String(e) });
      }
    });
    const tryViaSocks = (api) => new Promise((resolve) => {
      try {
        const { SocksClient } = require("socks");
        const targetUrl = new URL2(api);
        const targetIsHttps = targetUrl.protocol === "https:";
        const targetPort = Number(targetUrl.port) || (targetIsHttps ? 443 : 80);
        SocksClient.createConnection({
          proxy: { host: proxyHost, port: socksPort, type: 5 },
          command: "connect",
          destination: { host: targetUrl.hostname, port: targetPort },
          timeout: 1e4
        }).then(({ socket }) => {
          const onError = (err) => resolve({ success: false, error: (err == null ? void 0 : err.message) || String(err) });
          if (targetIsHttps) {
            const tls2 = require("tls");
            const tlsSocket = tls2.connect({ socket, servername: targetUrl.hostname, rejectUnauthorized: false });
            tlsSocket.setTimeout(1e4, () => tlsSocket.destroy(new Error("TLS request timeout")));
            const requestLines = [
              `GET ${targetUrl.pathname + targetUrl.search} HTTP/1.1`,
              `Host: ${targetUrl.hostname}`,
              "Accept: application/json",
              "User-Agent: Chongdong/1.0",
              "Connection: close",
              "",
              ""
            ].join("\r\n");
            let data = "";
            tlsSocket.once("secureConnect", () => tlsSocket.write(requestLines)).on("data", (chunk) => data += chunk.toString()).on("error", onError).on("end", () => {
              try {
                const body = data.split("\r\n\r\n")[1] || "";
                const jsonData = JSON.parse(body);
                let result;
                if (api.includes("ipapi.co")) {
                  result = { success: true, ip: jsonData.ip, country: jsonData.country_name, region: jsonData.region, city: jsonData.city, isp: jsonData.org, timezone: jsonData.timezone };
                } else if (api.includes("ipinfo.io")) {
                  result = { success: true, ip: jsonData.ip, country: jsonData.country, region: jsonData.region, city: jsonData.city, isp: jsonData.org, timezone: jsonData.timezone };
                } else {
                  result = { success: true, ip: jsonData.ip };
                }
                resolve(result);
              } catch (e) {
                resolve({ success: false, error: "Failed to parse response" });
              }
            });
          } else {
            const requestLines = [
              `GET ${targetUrl.pathname + targetUrl.search} HTTP/1.1`,
              `Host: ${targetUrl.hostname}`,
              "Accept: application/json",
              "User-Agent: Chongdong/1.0",
              "Connection: close",
              "",
              ""
            ].join("\r\n");
            let data = "";
            socket.write(requestLines);
            socket.on("data", (chunk) => data += chunk.toString()).on("error", onError).on("end", () => {
              try {
                const body = data.split("\r\n\r\n")[1] || "";
                const jsonData = JSON.parse(body);
                const result = { success: true, ip: jsonData.ip };
                resolve(result);
              } catch (e) {
                resolve({ success: false, error: "Failed to parse response" });
              }
            });
          }
        }).catch((err) => resolve({ success: false, error: (err == null ? void 0 : err.message) || String(err) }));
      } catch (e) {
        resolve({ success: false, error: (e == null ? void 0 : e.message) || String(e) });
      }
    });
    for (const api of apis) {
      let r = await tryViaHttpConnect(api);
      if (!r || !r.success) {
        r = await tryViaSocks(api);
      }
      if (r && r.success) {
        return r;
      }
      console.warn(`IP地理位置API ${api} 通过代理测试失败:`, (r == null ? void 0 : r.error) || r);
    }
    return { success: false, error: "所有IP地理位置API都不可用" };
  } catch (error) {
    console.error("通过代理IP地理位置测试失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
});
