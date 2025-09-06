"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet(obj, member, value, setter);
  },
  get _() {
    return __privateGet(obj, member, getter);
  }
});
var _a, _constructing, _b, _c, _max, _maxSize, _dispose, _onInsert, _disposeAfter, _fetchMethod, _memoMethod, _size, _calculatedSize, _keyMap, _keyList, _valList, _next, _prev, _head, _tail, _free, _disposed, _sizes, _starts, _ttls, _hasDispose, _hasFetchMethod, _hasDisposeAfter, _hasOnInsert, _LRUCache_instances, initializeTTLTracking_fn, _updateItemAge, _statusTTL, _setItemTTL, _isStale, initializeSizeTracking_fn, _removeItemSize, _addItemSize, _requireSize, indexes_fn, rindexes_fn, isValidIndex_fn, evict_fn, backgroundFetch_fn, isBackgroundFetch_fn, connect_fn, moveToTail_fn, delete_fn, clear_fn;
const electron = require("electron");
const path$1 = require("path");
const child_process = require("child_process");
const fs$1 = require("fs");
const require$$1 = require("https");
const require$$0$1 = require("net");
const require$$8 = require("crypto");
const require$$1$1 = require("util");
const os = require("os");
const require$$0$2 = require("dgram");
const require$$0$4 = require("http");
const require$$0$3 = require("url");
const require$$4 = require("events");
const require$$2 = require("assert");
const stream = require("stream");
const require$$1$2 = require("tty");
const zlib = require("zlib");
const tls = require("tls");
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
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path$1);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs$1);
const os__namespace = /* @__PURE__ */ _interopNamespaceDefault(os);
const is = {
  dev: !electron.app.isPackaged
};
const platform$2 = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
};
const electronApp = {
  setAppUserModelId(id) {
    if (platform$2.isWindows)
      electron.app.setAppUserModelId(is.dev ? process.execPath : id);
  },
  setAutoLaunch(auto) {
    if (platform$2.isLinux)
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
  watchWindowShortcuts(window2, shortcutOptions) {
    if (!window2)
      return;
    const { webContents } = window2;
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
            window2.close();
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
  setMainWindow(window2) {
    this.mainWindow = window2;
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
    var _a2;
    try {
      (_a2 = this.mainWindow) == null ? void 0 : _a2.webContents.send("hotkey-toggle-proxy");
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
    var _a2;
    try {
      (_a2 = this.mainWindow) == null ? void 0 : _a2.webContents.send("hotkey-quick-switch");
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
          const appIconPath = path$1.join(__dirname, "../renderer/assets/icon.png");
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
function getNotificationManager() {
  return notificationManager$1;
}
class CoreDownloader {
  constructor() {
    this.binDir = path$1.join(electron.app.getPath("userData"), "bin");
    this.coresDir = path$1.join(electron.app.getPath("userData"), "cores");
    if (!fs$1.existsSync(this.binDir)) {
      fs$1.mkdirSync(this.binDir, { recursive: true });
    }
    if (!fs$1.existsSync(this.coresDir)) {
      fs$1.mkdirSync(this.coresDir, { recursive: true });
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
      case "tun2socks": {
        const ver = "v2.5.0";
        const name = "tun2socks";
        const fileName = platform2 === "win32" ? "tun2socks.exe" : "tun2socks";
        const os2 = platform2;
        const ar = arch;
        const asset = `${name}-${os2}-${ar}.zip`;
        return {
          name: "tun2socks",
          version: ver,
          platform: platform2,
          arch,
          fileName,
          downloadUrl: `https://github.com/xjasonlyu/tun2socks/releases/download/${ver}/${asset}`
        };
      }
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
    const corePath = path$1.join(this.binDir, coreInfo.fileName);
    return fs$1.existsSync(corePath);
  }
  /**
   * 获取核心路径
   */
  getCorePath(coreName) {
    const coreInfo = this.getCoreInfo(coreName);
    return path$1.join(this.binDir, coreInfo.fileName);
  }
  /**
   * 下载文件
   */
  async downloadFile(url2, filePath) {
    return new Promise((resolve, reject) => {
      let redirectCount = 0;
      const maxRedirects = 5;
      const makeRequest = (requestUrl) => {
        if (redirectCount > maxRedirects) {
          reject(new Error("重定向次数过多"));
          return;
        }
        const fileStream = fs$1.createWriteStream(filePath);
        require$$1.get(requestUrl, (response) => {
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
      makeRequest(url2);
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
        tempDir = path$1.join(this.coresDir, "temp");
        console.log(`创建临时目录: ${tempDir}`);
        if (!fs$1.existsSync(tempDir)) {
          fs$1.mkdirSync(tempDir, { recursive: true });
        }
        command = "tar";
        args = ["-xzf", filePath, "-C", tempDir];
        console.log(`执行解压命令: ${command} ${args.join(" ")}`);
      } else if (isGzip) {
        command = "gunzip";
        args = ["-f", filePath];
      } else if (isZip) {
        tempDir = path$1.join(this.coresDir, "temp");
        console.log(`创建临时目录: ${tempDir}`);
        if (!fs$1.existsSync(tempDir)) {
          fs$1.mkdirSync(tempDir, { recursive: true });
        }
        command = "unzip";
        args = ["-o", filePath, "-d", tempDir];
        console.log(`执行解压命令: ${command} ${args.join(" ")}`);
      } else {
        console.log("不支持的文件格式，跳过解压");
        resolve();
        return;
      }
      const child = child_process.spawn(command, args);
      child.on("close", (code) => {
        console.log(`解压命令退出码: ${code}`);
        if (code === 0) {
          if (isTarGz || isZip) {
            console.log(`解压成功，开始查找可执行文件...`);
            const searchDir = tempDir || extractDir;
            this.findAndMoveExecutable(searchDir, extractDir, targetFileName).then(() => {
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
              const itemPath = path$1.join(dir, item);
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
                  const targetPath = path$1.join(targetDir, targetFileName);
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
      const downloadPath = path$1.join(this.coresDir, originalFileName);
      const corePath = path$1.join(this.binDir, coreInfo.fileName);
      console.log(`开始下载 ${coreInfo.name} v${coreInfo.version}...`);
      console.log(`下载文件: ${originalFileName}`);
      console.log(`下载路径: ${downloadPath}`);
      await this.downloadFile(coreInfo.downloadUrl, downloadPath);
      console.log(`下载完成，开始解压...`);
      await this.extractFile(downloadPath, this.binDir, coreInfo.fileName);
      if (!fs$1.existsSync(corePath)) {
        throw new Error(`核心文件未找到: ${corePath}`);
      }
      if (process.platform !== "win32") {
        try {
          fs$1.chmodSync(corePath, 493);
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
      const downloadPath = path$1.join(this.binDir, dbInfo.fileName);
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
      tun2socks: this.isCoreInstalled("tun2socks"),
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
    const dbPath = path$1.join(this.binDir, dbInfo.fileName);
    return fs$1.existsSync(dbPath);
  }
  /**
   * 清理下载的临时文件
   */
  async cleanup() {
    console.log("清理完成");
  }
}
const coreDownloader = CoreDownloader.getInstance();
var ProxyProtocol = /* @__PURE__ */ ((ProxyProtocol2) => {
  ProxyProtocol2["HTTP"] = "http";
  ProxyProtocol2["HTTPS"] = "https";
  ProxyProtocol2["SOCKS5"] = "socks5";
  ProxyProtocol2["SHADOWSOCKS"] = "shadowsocks";
  ProxyProtocol2["VMESS"] = "vmess";
  ProxyProtocol2["VLESS"] = "vless";
  ProxyProtocol2["TROJAN"] = "trojan";
  ProxyProtocol2["HYSTERIA"] = "hysteria";
  ProxyProtocol2["TUIC"] = "tuic";
  ProxyProtocol2["WIREGUARD"] = "wireguard";
  return ProxyProtocol2;
})(ProxyProtocol || {});
class ProxyChainConfigGenerator {
  constructor() {
    this.portPool = /* @__PURE__ */ new Set();
    this.PORT_RANGE_START = 1080;
    this.PORT_RANGE_END = 1200;
    for (let port = this.PORT_RANGE_START; port <= this.PORT_RANGE_END; port++) {
      this.portPool.add(port);
    }
  }
  static getInstance() {
    if (!ProxyChainConfigGenerator.instance) {
      ProxyChainConfigGenerator.instance = new ProxyChainConfigGenerator();
    }
    return ProxyChainConfigGenerator.instance;
  }
  /**
   * 释放端口回池中
   */
  releasePort(port) {
    if (port >= this.PORT_RANGE_START && port <= this.PORT_RANGE_END) {
      this.portPool.add(port);
    }
  }
  /**
   * 生成代理链配置
   */
  generateChainConfig(nodes, listenPort) {
    if (nodes.length === 0) {
      const inbounds2 = this.generateInbounds(listenPort);
      const logConfig2 = this.generateLogConfig();
      return {
        inbounds: inbounds2,
        outbounds: [this.createDirectOutbound(), this.createBlockOutbound()],
        route: {
          rules: [
            {
              inbound: [inbounds2[0].tag, "tun-in"],
              outbound: "direct"
            }
          ],
          final: "direct"
        },
        log: logConfig2
      };
    }
    const validNodes = nodes.filter((node2) => {
      const isValid = node2 && node2.server && node2.port;
      if (!isValid) {
        console.warn(`[ProxyChainConfigGenerator] Filtering out invalid node: ${node2.name} (ID: ${node2.id}) due to missing server or port.`);
      }
      return isValid;
    });
    if (validNodes.length === 0) {
      const inbounds2 = this.generateInbounds(listenPort);
      const logConfig2 = this.generateLogConfig();
      return {
        inbounds: inbounds2,
        outbounds: [this.createDirectOutbound(), this.createBlockOutbound()],
        route: {
          rules: [
            {
              inbound: [inbounds2[0].tag, "tun-in"],
              outbound: "direct"
            }
          ],
          final: "direct"
        },
        log: logConfig2
      };
    }
    console.log(`[ProxyChainConfigGenerator] Generating chain config for ${validNodes.length} valid nodes on port ${listenPort}`);
    const inbounds = this.generateInbounds(listenPort);
    const outbounds = this.generateOutboundsForChain(validNodes);
    const route = this.generateRoute(validNodes);
    const logConfig = this.generateLogConfig();
    const config = {
      inbounds,
      outbounds,
      route,
      log: logConfig
    };
    console.log(`[ProxyChainConfigGenerator] Generated chain config:`, JSON.stringify(config, null, 2));
    return config;
  }
  /**
   * [新增] 为中间件链中的单个节点生成配置
   * @param node 当前节点
   * @param listenPort 此sing-box实例的监听端口
   * @param nextHopHost 下一跳的主机地址 (通常是 '127.0.0.1')
   * @param nextHopPort 下一跳的端口 (如果是最后一个节点，则为 undefined)
   * @param inboundOverride [新增] 用于覆盖默认 "mixed" 入站的配置，以实现链式连接
   */
  generateSingleNodeConfig(node2, listenPort, nextHopHost, nextHopPort, inboundOverride) {
    const inbounds = inboundOverride ? [inboundOverride] : this.generateInbounds(listenPort);
    const outbounds = this.generateOutbounds(node2, nextHopHost, nextHopPort);
    const route = this.generateSingleNodeRoute(node2, !nextHopHost || !nextHopPort, inbounds[0].tag);
    const logConfig = this.generateLogConfig();
    const config = {
      inbounds,
      outbounds,
      route,
      log: logConfig
    };
    const nodeType = !nextHopHost || !nextHopPort ? "FINAL" : "INTERMEDIATE";
    console.log(`[ProxyChainConfigGenerator] Generated ${nodeType} node config for ${node2.name} on port ${listenPort}:`, JSON.stringify(config, null, 2));
    return config;
  }
  /**
   * 生成入站配置
   */
  generateInbounds(port) {
    return [
      {
        type: "mixed",
        tag: "mixed-in",
        listen: "127.0.0.1",
        listen_port: port,
        users: []
      }
    ];
  }
  /**
   * 生成出站配置 (旧，保留给传统模式)
   */
  generateOutboundsForChain(nodes) {
    const outbounds = [];
    let nextOutboundTag = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node2 = nodes[i];
      if (!node2) continue;
      const nodeOutbound = this.generateNodeOutbound(node2);
      if (nextOutboundTag) {
        nodeOutbound.detour = nextOutboundTag;
      } else {
        nodeOutbound.detour = "direct";
      }
      outbounds.unshift(nodeOutbound);
      nextOutboundTag = nodeOutbound.tag;
    }
    outbounds.push({
      type: "direct",
      tag: "direct"
    });
    outbounds.push({
      type: "block",
      tag: "block"
    });
    return outbounds;
  }
  /**
   * [新] 为中间件模式生成出站配置
   */
  generateOutbounds(node2, nextHopHost, nextHopPort) {
    const isFinalNode = !nextHopHost || !nextHopPort;
    const nodeOutbound = this.generateNodeOutbound(node2);
    if (isFinalNode) {
      nodeOutbound.tag = `proxy-${node2.id}`;
      nodeOutbound.detour = "direct";
      return [nodeOutbound, this.createDirectOutbound(), this.createBlockOutbound()];
    } else {
      nodeOutbound.tag = "main-out";
      nodeOutbound.server = nextHopHost;
      nodeOutbound.server_port = nextHopPort;
      if (nodeOutbound.tls) {
        nodeOutbound.tls.enabled = false;
      }
      nodeOutbound.detour = "direct";
      return [nodeOutbound, this.createDirectOutbound(), this.createBlockOutbound()];
    }
  }
  /**
   * 为单个节点生成出站配置
   */
  generateNodeOutbound(node2) {
    const baseConfig = {
      tag: `proxy-${node2.id}`,
      server: node2.server,
      server_port: node2.port
    };
    switch (node2.type) {
      case ProxyProtocol.VMESS:
        const vmessConfig = {
          type: "vmess",
          ...baseConfig,
          uuid: node2.uuid,
          security: node2.encryption || "auto",
          alter_id: node2.alterId ?? 0,
          tls: {
            enabled: false
            // VMess通常不需要TLS
          }
        };
        if (node2.network === "ws") {
          vmessConfig.transport = {
            type: "ws",
            path: node2.wsPath || "/",
            headers: {
              Host: node2.wsHost || node2.server
            }
          };
        }
        return vmessConfig;
      case ProxyProtocol.VLESS:
        return {
          type: "vless",
          ...baseConfig,
          uuid: node2.uuid,
          tls: {
            enabled: false
            // VLESS可以不使用TLS
          }
        };
      case ProxyProtocol.SHADOWSOCKS:
        return {
          type: "shadowsocks",
          ...baseConfig,
          method: node2.encryption,
          password: node2.password,
          tls: {
            enabled: false
            // Shadowsocks通常不需要TLS
          }
        };
      case ProxyProtocol.TROJAN:
        return {
          type: "trojan",
          ...baseConfig,
          password: node2.password,
          tls: {
            enabled: true,
            insecure: true
            // 允许不安全的证书
          }
        };
      case ProxyProtocol.HTTP:
      case ProxyProtocol.SOCKS5:
        return {
          type: node2.type,
          ...baseConfig,
          username: node2.username,
          password: node2.password,
          tls: {
            enabled: false
            // HTTP/SOCKS5通常不需要TLS
          }
        };
      default:
        console.warn(`Unsupported proxy type for outbound generation: ${node2.type}`);
        return { type: "block", tag: `proxy-${node2.id}` };
    }
  }
  /**
   * 生成路由配置 (用于传统模式)
   */
  generateRoute(nodes) {
    if (nodes.length === 0 || !nodes[0]) {
      return {
        rules: [],
        final: "direct"
      };
    }
    const firstNodeTag = `proxy-${nodes[0].id}`;
    return {
      rules: [
        {
          inbound: ["mixed-in", "tun-in"],
          outbound: firstNodeTag
        }
      ],
      final: "direct"
    };
  }
  /**
   * [新增] 为中间件模式下的单个节点生成路由配置
   */
  generateSingleNodeRoute(node2, isFinalNode, inboundTag) {
    const outboundTag = isFinalNode ? `proxy-${node2.id}` : "main-out";
    return {
      rules: [
        {
          inbound: [inboundTag, "tun-in"],
          outbound: outboundTag
        }
      ],
      final: "direct"
    };
  }
  /**
   * 生成日志配置
   */
  generateLogConfig() {
    return {
      level: "info",
      timestamp: true
    };
  }
  createDirectOutbound() {
    return { type: "direct", tag: "direct" };
  }
  createBlockOutbound() {
    return { type: "block", tag: "block" };
  }
  /**
   * 清理端口分配
   */
  cleanup() {
    this.portPool.clear();
    for (let port = this.PORT_RANGE_START; port <= this.PORT_RANGE_END; port++) {
      this.releasePort(port);
    }
  }
}
const proxyChainConfigGenerator = ProxyChainConfigGenerator.getInstance();
class DefaultSettings {
  /**
   * 获取默认应用设置
   */
  static getDefaultAppSettings() {
    return {
      v2rayPath: "",
      clashPath: "",
      singBoxPath: "",
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
      dnsLeakStrict: false,
      // 严格模式默认关闭
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
      latencyTestValidityPeriod: 30,
      // 数据库自动更新设置
      enableDatabaseAutoUpdate: false,
      databaseUpdateInterval: 24,
      // 默认24小时
      databaseUpdateCheckOnStartup: true
      // databaseLastUpdateCheck 是可选的，不需要在默认设置中定义
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
var AdapterStatus = /* @__PURE__ */ ((AdapterStatus2) => {
  AdapterStatus2["IDLE"] = "idle";
  AdapterStatus2["STARTING"] = "starting";
  AdapterStatus2["RUNNING"] = "running";
  AdapterStatus2["ERROR"] = "error";
  AdapterStatus2["STOPPING"] = "stopping";
  AdapterStatus2["STOPPED"] = "stopped";
  return AdapterStatus2;
})(AdapterStatus || {});
var MonitoringEventType = /* @__PURE__ */ ((MonitoringEventType2) => {
  MonitoringEventType2["CONNECTION_START"] = "connection_start";
  MonitoringEventType2["CONNECTION_END"] = "connection_end";
  MonitoringEventType2["TRAFFIC_FLOW"] = "traffic_flow";
  MonitoringEventType2["ERROR_OCCURRED"] = "error_occurred";
  MonitoringEventType2["NODE_FAILURE"] = "node_failure";
  MonitoringEventType2["NODE_RECOVERY"] = "node_recovery";
  return MonitoringEventType2;
})(MonitoringEventType || {});
class TrafficRouter {
  constructor(entryPort, adapters2) {
    this.status = "idle";
    this.monitoringListeners = [];
    this.protectionRules = [];
    this.activeConnections = /* @__PURE__ */ new Map();
    this.connectionStats = /* @__PURE__ */ new Map();
    this.entryPort = entryPort;
    this.adapters = adapters2;
    this.trafficStats = {
      bytesReceived: 0,
      bytesSent: 0,
      connections: 0,
      lastActivity: /* @__PURE__ */ new Date()
    };
  }
  /**
   * 启动流量路由器
   */
  async start() {
    console.log(`[TrafficRouter] 启动流量路由器，入口端口: ${this.entryPort}`);
    console.log(`[TrafficRouter] 适配器详情:`);
    console.log(`  - 适配器数量: ${this.adapters.length}`);
    for (let i = 0; i < this.adapters.length; i++) {
      const adapter = this.adapters[i];
      if (adapter) {
        const info = adapter.getInfo();
        console.log(`  - 适配器${i + 1}: ${info.id} (端口: ${info.port})`);
      }
    }
    try {
      this.status = "starting";
      console.log(`[TrafficRouter] 状态已设置为: starting`);
      console.log(`[TrafficRouter] 创建TCP服务器...`);
      this.server = require$$0$1.createServer((clientSocket) => {
        console.log(`[TrafficRouter] 收到新的客户端连接: ${clientSocket.remoteAddress}:${clientSocket.remotePort}`);
        this.handleClientConnection(clientSocket);
      });
      console.log(`[TrafficRouter] TCP服务器创建完成`);
      console.log(`[TrafficRouter] 开始监听端口 ${this.entryPort}...`);
      await new Promise((resolve, reject) => {
        this.server.listen(this.entryPort, "127.0.0.1", () => {
          console.log(`✅ [TrafficRouter] 流量路由器启动成功，监听端口: ${this.entryPort}`);
          resolve();
        });
        this.server.on("error", (error) => {
          console.error(`❌ [TrafficRouter] 流量路由器启动失败:`, error);
          reject(error);
        });
      });
      this.status = "running";
      console.log(`[TrafficRouter] 状态已设置为: running`);
      this.emitMonitoringEvent(MonitoringEventType.CONNECTION_START, {
        routerPort: this.entryPort,
        adapterCount: this.adapters.length
      });
      console.log(`✅ [TrafficRouter] 流量路由器启动完成`);
    } catch (error) {
      this.status = "stopped";
      console.error(`❌ [TrafficRouter] 流量路由器启动失败:`, error);
      console.error(`❌ [TrafficRouter] 错误详情:`, error instanceof Error ? error.stack : error);
      throw error;
    }
  }
  /**
   * 停止流量路由器
   */
  async stop() {
    console.log(`[TrafficRouter] 停止流量路由器`);
    try {
      this.status = "stopping";
      for (const [, socket] of this.activeConnections) {
        socket.destroy();
      }
      this.activeConnections.clear();
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(() => {
            resolve();
          });
        });
      }
      this.status = "stopped";
      console.log(`✅ [TrafficRouter] 流量路由器停止成功`);
    } catch (error) {
      console.error(`❌ [TrafficRouter] 流量路由器停止失败:`, error);
      throw error;
    }
  }
  /**
   * 处理客户端连接
   */
  async handleClientConnection(clientSocket) {
    const connectionId = this.generateConnectionId();
    const clientAddress = `${clientSocket.remoteAddress}:${clientSocket.remotePort}`;
    console.log(`[TrafficRouter] 新客户端连接: ${connectionId} (${clientAddress})`);
    if (!this.checkProtectionRules(clientAddress)) {
      console.log(`[TrafficRouter] 连接被防护规则阻止: ${clientAddress}`);
      clientSocket.destroy();
      return;
    }
    this.activeConnections.set(connectionId, clientSocket);
    this.trafficStats.connections++;
    this.trafficStats.lastActivity = /* @__PURE__ */ new Date();
    this.connectionStats.set(connectionId, {
      upload: 0,
      download: 0,
      start: Date.now(),
      chains: this.adapters.map((a) => a.getInfo().id),
      clientAddress,
      parsed: false
    });
    try {
      const firstAdapter = this.adapters[0];
      if (!firstAdapter) {
        throw new Error("没有可用的协议适配器。请检查代理链配置。");
      }
      const adapterInfo = firstAdapter.getInfo();
      if (adapterInfo.status !== AdapterStatus.RUNNING) {
        throw new Error(`代理链的第一个适配器 (${adapterInfo.id}) 未在运行状态。当前状态: ${adapterInfo.status}`);
      }
      console.log(`[TrafficRouter] 连接到代理链的第一个适配器: ${adapterInfo.id} (端口: ${adapterInfo.port})`);
      const { createConnection } = require("net");
      const adapterSocket = createConnection(adapterInfo.port, "127.0.0.1");
      this.emitMonitoringEvent(MonitoringEventType.CONNECTION_START, {
        connectionId,
        clientAddress,
        chains: this.adapters.map((a) => a.getInfo().id)
      });
      this.setupDataForwarding(clientSocket, adapterSocket, connectionId);
      clientSocket.on("close", () => {
        console.log(`[TrafficRouter] 客户端连接关闭: ${connectionId}`);
        this.activeConnections.delete(connectionId);
        this.trafficStats.connections--;
        adapterSocket.destroy();
        const st = this.connectionStats.get(connectionId);
        if (st) {
          this.emitMonitoringEvent(MonitoringEventType.CONNECTION_END, {
            connectionId,
            upload: st.upload,
            download: st.download,
            start: new Date(st.start).toISOString(),
            metadata: { host: st.host || st.clientAddress, destinationPort: st.port || 0, network: "tcp" },
            rule: "chain",
            chains: st.chains
          });
          this.connectionStats.delete(connectionId);
        }
      });
      adapterSocket.on("close", () => {
        console.log(`[TrafficRouter] 适配器连接关闭: ${connectionId}`);
        this.activeConnections.delete(connectionId);
        this.trafficStats.connections--;
        clientSocket.destroy();
        const st = this.connectionStats.get(connectionId);
        if (st) {
          this.emitMonitoringEvent(MonitoringEventType.CONNECTION_END, {
            connectionId,
            upload: st.upload,
            download: st.download,
            start: new Date(st.start).toISOString(),
            metadata: { host: st.host || st.clientAddress, destinationPort: st.port || 0, network: "tcp" },
            rule: "chain",
            chains: st.chains
          });
          this.connectionStats.delete(connectionId);
        }
      });
      clientSocket.on("error", (error) => {
        console.error(`[TrafficRouter] 客户端连接错误: ${connectionId}`, error);
        this.emitMonitoringEvent(MonitoringEventType.ERROR_OCCURRED, {
          connectionId,
          error: error.message
        });
      });
      adapterSocket.on("error", (error) => {
        console.error(`[TrafficRouter] 适配器连接错误: ${connectionId}`, error);
        if (error.code === "ECONNREFUSED") {
          console.error(`[TrafficRouter] [调试信息] 连接到适配器 ${adapterInfo.id} (端口: ${adapterInfo.port}) 被拒绝。请确认该适配器实例已成功启动并正在监听该端口。`);
        }
        this.emitMonitoringEvent(MonitoringEventType.ERROR_OCCURRED, {
          connectionId,
          error: error.message
        });
      });
    } catch (error) {
      console.error(`[TrafficRouter] 处理客户端连接失败: ${connectionId}`, error);
      clientSocket.destroy();
      this.activeConnections.delete(connectionId);
      this.emitMonitoringEvent(MonitoringEventType.ERROR_OCCURRED, {
        connectionId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  /**
   * 设置双向数据转发
   */
  setupDataForwarding(clientSocket, adapterSocket, connectionId) {
    clientSocket.on("data", (data) => {
      this.trafficStats.bytesReceived += data.length;
      this.trafficStats.lastActivity = /* @__PURE__ */ new Date();
      const st = this.connectionStats.get(connectionId);
      if (st) {
        st.upload += data.length;
        if (!st.parsed) {
          const parsed = this.parseHostnameFromFirstPacket(data);
          if (parsed) {
            if (parsed.host) st.host = parsed.host;
            if (parsed.port !== void 0) st.port = parsed.port;
          }
          st.parsed = true;
        }
      }
      if (!adapterSocket.destroyed) {
        adapterSocket.write(data);
      }
      this.emitMonitoringEvent(MonitoringEventType.TRAFFIC_FLOW, {
        connectionId,
        direction: "client_to_adapter",
        bytes: data.length
      });
    });
    adapterSocket.on("data", (data) => {
      this.trafficStats.bytesSent += data.length;
      this.trafficStats.lastActivity = /* @__PURE__ */ new Date();
      const st = this.connectionStats.get(connectionId);
      if (st) st.download += data.length;
      if (!clientSocket.destroyed) {
        clientSocket.write(data);
      }
      this.emitMonitoringEvent(MonitoringEventType.TRAFFIC_FLOW, {
        connectionId,
        direction: "adapter_to_client",
        bytes: data.length
      });
    });
  }
  // 解析 HTTP 请求首包中的 Host 头，或解析 TLS SNI（简单推断）
  parseHostnameFromFirstPacket(buf) {
    try {
      const str = buf.toString("utf8");
      const hostHeader = str.match(/\r\nHost:\s*([^\r\n]+)/i);
      if (hostHeader && hostHeader[1]) {
        const hostPort = hostHeader[1].trim();
        const [h, p] = hostPort.split(":");
        const result = {};
        if (h) result.host = h;
        if (p) result.port = parseInt(p, 10);
        return result;
      }
      return null;
    } catch {
      return null;
    }
  }
  /**
   * 检查防护规则
   */
  checkProtectionRules(clientAddress) {
    for (const rule of this.protectionRules) {
      if (!rule.enabled) continue;
      switch (rule.type) {
        case "blacklist":
          if (rule.config.addresses && rule.config.addresses.includes(clientAddress)) {
            console.log(`[TrafficRouter] 客户端地址在黑名单中: ${clientAddress}`);
            return false;
          }
          break;
        case "whitelist":
          if (rule.config.addresses && !rule.config.addresses.includes(clientAddress)) {
            console.log(`[TrafficRouter] 客户端地址不在白名单中: ${clientAddress}`);
            return false;
          }
          break;
      }
    }
    return true;
  }
  /**
   * 生成连接ID
   */
  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * 获取流量统计
   */
  getTrafficStats() {
    return { ...this.trafficStats };
  }
  /**
   * 获取状态
   */
  getStatus() {
    return this.status;
  }
  /**
   * 添加监控监听器
   */
  addMonitoringListener(callback) {
    this.monitoringListeners.push(callback);
  }
  /**
   * 移除监控监听器
   */
  removeMonitoringListener(callback) {
    const index = this.monitoringListeners.indexOf(callback);
    if (index > -1) {
      this.monitoringListeners.splice(index, 1);
    }
  }
  /**
   * 添加防护规则
   */
  addProtectionRule(rule) {
    this.protectionRules.push(rule);
    console.log(`[TrafficRouter] 添加防护规则: ${rule.name}`);
  }
  /**
   * 移除防护规则
   */
  removeProtectionRule(ruleId) {
    const index = this.protectionRules.findIndex((rule) => rule.id === ruleId);
    if (index > -1) {
      const rule = this.protectionRules.splice(index, 1)[0];
      if (rule) {
        console.log(`[TrafficRouter] 移除防护规则: ${rule.name}`);
      }
    }
  }
  /**
   * 发送监控事件
   */
  emitMonitoringEvent(type2, data) {
    const event = {
      type: type2,
      timestamp: /* @__PURE__ */ new Date(),
      data
    };
    this.monitoringListeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error(`[TrafficRouter] 监控监听器错误:`, error);
      }
    });
  }
}
class ProtocolAdapter {
  // [新增] 启用 sing-box clash_api 的端口
  constructor(id, node2, port, nextHopHost, nextHopPort, inboundOverride, apiPort) {
    this.status = AdapterStatus.IDLE;
    this.monitoringListeners = [];
    this.id = id;
    this.node = node2;
    this.port = port;
    this.nextHopHost = nextHopHost;
    this.nextHopPort = nextHopPort;
    this.inboundOverride = inboundOverride;
    this.apiPort = apiPort;
    this.trafficStats = {
      bytesReceived: 0,
      bytesSent: 0,
      connections: 0,
      lastActivity: /* @__PURE__ */ new Date()
    };
  }
  /**
   * 启动协议适配器
   */
  async start() {
    console.log(`[ProtocolAdapter] 启动协议适配器: ${this.id} (${this.node.name})`);
    console.log(`[ProtocolAdapter] 节点详情:`);
    console.log(`  - 节点ID: ${this.node.id}`);
    console.log(`  - 节点名称: ${this.node.name}`);
    console.log(`  - 节点类型: ${this.node.type}`);
    console.log(`  - 服务器: ${this.node.server}:${this.node.port}`);
    console.log(`  - 本地端口: ${this.port}`);
    try {
      this.status = AdapterStatus.STARTING;
      this.startTime = /* @__PURE__ */ new Date();
      console.log(`[ProtocolAdapter] 状态已设置为: starting`);
      console.log(`[ProtocolAdapter] 步骤1: 生成sing-box配置...`);
      await this.generateConfig();
      console.log(`[ProtocolAdapter] sing-box配置生成完成`);
      console.log(`[ProtocolAdapter] 步骤2: 启动sing-box进程...`);
      await this.startSingBoxProcess();
      console.log(`[ProtocolAdapter] sing-box进程启动完成，PID: ${this.processId}`);
      console.log(`[ProtocolAdapter] 步骤3: 验证端口可用性...`);
      await this.verifyPort();
      console.log(`[ProtocolAdapter] 端口验证完成，端口 ${this.port} 可用`);
      this.status = AdapterStatus.RUNNING;
      console.log(`[ProtocolAdapter] 状态已设置为: running`);
      this.emitMonitoringEvent(MonitoringEventType.CONNECTION_START, {
        adapterId: this.id,
        nodeId: this.node.id,
        port: this.port
      });
      console.log(`✅ [ProtocolAdapter] 协议适配器启动成功: ${this.id} (端口: ${this.port})`);
    } catch (error) {
      this.status = AdapterStatus.ERROR;
      this.error = error instanceof Error ? error.message : String(error);
      console.error(`❌ [ProtocolAdapter] 协议适配器启动失败: ${this.id}`, error);
      console.error(`❌ [ProtocolAdapter] 错误详情:`, error instanceof Error ? error.stack : error);
      this.emitMonitoringEvent(MonitoringEventType.ERROR_OCCURRED, {
        adapterId: this.id,
        nodeId: this.node.id,
        error: this.error
      });
      throw error;
    }
  }
  /**
   * 停止协议适配器
   */
  async stop() {
    console.log(`[ProtocolAdapter] 停止协议适配器: ${this.id}`);
    try {
      this.status = AdapterStatus.STOPPING;
      if (this.process) {
        this.process.kill("SIGTERM");
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (this.process) {
              this.process.kill("SIGKILL");
            }
            resolve();
          }, 5e3);
          this.process.on("exit", () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }
      if (this.configPath && fs__namespace.existsSync(this.configPath)) {
        fs__namespace.unlinkSync(this.configPath);
      }
      this.status = AdapterStatus.STOPPED;
      this.process = void 0;
      this.processId = void 0;
      console.log(`✅ [ProtocolAdapter] 协议适配器停止成功: ${this.id}`);
    } catch (error) {
      console.error(`❌ [ProtocolAdapter] 协议适配器停止失败: ${this.id}`, error);
      throw error;
    }
  }
  /**
   * 获取适配器信息
   */
  getInfo() {
    return {
      id: this.id,
      node: this.node,
      status: this.status,
      port: this.port,
      processId: this.processId,
      error: this.error,
      startTime: this.startTime,
      trafficStats: { ...this.trafficStats }
    };
  }
  /**
   * 添加监控监听器
   */
  addMonitoringListener(callback) {
    this.monitoringListeners.push(callback);
  }
  /**
   * 移除监控监听器
   */
  removeMonitoringListener(callback) {
    const index = this.monitoringListeners.indexOf(callback);
    if (index > -1) {
      this.monitoringListeners.splice(index, 1);
    }
  }
  /**
   * 生成sing-box配置
   */
  async generateConfig() {
    const config = proxyChainConfigGenerator.generateSingleNodeConfig(
      this.node,
      this.port,
      this.nextHopHost,
      this.nextHopPort,
      this.inboundOverride
      // [新增] 传递 inboudOverride
    );
    if (this.apiPort) {
      config.experimental = config.experimental || {};
      config.experimental.clash_api = {
        external_controller: `127.0.0.1:${this.apiPort}`,
        external_ui: "",
        secret: ""
      };
    }
    const configDir = path__namespace.join(process.env["HOME"] || "", "Library/Application Support/chongdong/proxy-configs");
    if (!fs__namespace.existsSync(configDir)) {
      fs__namespace.mkdirSync(configDir, { recursive: true });
    }
    this.configPath = path__namespace.join(configDir, `adapter_${this.id}.json`);
    fs__namespace.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    console.log(`[ProtocolAdapter] 配置文件已生成: ${this.configPath}`);
    return config;
  }
  /**
   * 启动sing-box进程
   */
  async startSingBoxProcess() {
    var _a2, _b2;
    const singBoxPath = path__namespace.join(process.env["HOME"] || "", "Library/Application Support/chongdong/bin/sing-box");
    if (!fs__namespace.existsSync(singBoxPath)) {
      throw new Error(`Sing-box 可执行文件不存在: ${singBoxPath}`);
    }
    const args = ["run", "-c", this.configPath];
    const options = {
      cwd: path__namespace.dirname(singBoxPath),
      stdio: ["pipe", "pipe", "pipe"]
    };
    console.log(`[ProtocolAdapter] 启动sing-box进程: ${singBoxPath} ${args.join(" ")}`);
    this.process = child_process.spawn(singBoxPath, args, options);
    if (this.process && this.process.pid) {
      this.processId = this.process.pid;
    }
    if (!this.process) {
      throw new Error("Failed to spawn sing-box process");
    }
    (_a2 = this.process.stdout) == null ? void 0 : _a2.on("data", (data) => {
      const output = data.toString();
      console.log(`[ProtocolAdapter ${this.id}] stdout: ${output.trim()}`);
      this.parseTrafficInfo(output);
    });
    (_b2 = this.process.stderr) == null ? void 0 : _b2.on("data", (data) => {
      const errorMessage = data.toString();
      console.error(`[ProtocolAdapter ${this.id}] stderr: ${errorMessage.trim()}`);
      if (errorMessage.includes("error") || errorMessage.includes("failed")) {
        this.emitMonitoringEvent(MonitoringEventType.ERROR_OCCURRED, {
          adapterId: this.id,
          nodeId: this.node.id,
          error: errorMessage.trim()
        });
      }
    });
    this.process.on("exit", (code, signal) => {
      console.log(`[ProtocolAdapter ${this.id}] 进程退出: code=${code}, signal=${signal}`);
      if (code !== 0) {
        this.status = AdapterStatus.ERROR;
        this.error = `进程异常退出: code=${code}, signal=${signal}`;
        this.emitMonitoringEvent(MonitoringEventType.NODE_FAILURE, {
          adapterId: this.id,
          nodeId: this.node.id,
          error: this.error
        });
      }
    });
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Sing-box进程启动超时"));
      }, 1e4);
      this.process.on("spawn", () => {
        clearTimeout(timeout);
        resolve();
      });
      this.process.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }
  /**
   * [新增] 查询 sing-box connections（用于丰富连接历史中的远端域名/端口）
   */
  async getRecentConnections() {
    if (!this.apiPort) return null;
    try {
      const http2 = require("http");
      return await new Promise((resolve) => {
        const req = http2.request({ hostname: "127.0.0.1", port: this.apiPort, path: "/connections", method: "GET", timeout: 800 }, (res) => {
          let data = "";
          res.on("data", (c) => data += c);
          res.on("end", () => {
            try {
              const json = JSON.parse(data);
              resolve((json == null ? void 0 : json.connections) || []);
            } catch {
              resolve([]);
            }
          });
        });
        req.on("error", () => resolve([]));
        req.on("timeout", () => {
          try {
            req.destroy();
          } catch {
          }
          ;
          resolve([]);
        });
        req.end();
      });
    } catch {
      return null;
    }
  }
  /**
   * 检查端口是否可用
   */
  async checkPortReady(host, port, timeout = 5e3) {
    return new Promise((resolve) => {
      const client = require$$0$1.createConnection({ host, port });
      const timer = setTimeout(() => {
        client.destroy();
        resolve(false);
      }, timeout);
      client.on("connect", () => {
        clearTimeout(timer);
        client.destroy();
        resolve(true);
      });
      client.on("error", () => {
        clearTimeout(timer);
        client.destroy();
        resolve(false);
      });
    });
  }
  /**
   * 验证端口是否可用
   */
  async verifyPort() {
    console.log(`[ProtocolAdapter] 验证端口: ${this.port}`);
    const waitTime = 3e3;
    console.log(`[ProtocolAdapter] 等待 ${waitTime}ms 让sing-box进程完全启动...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    const maxRetries = 5;
    const retryInterval = 1e3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`[ProtocolAdapter] 第 ${i + 1} 次尝试验证端口 ${this.port}...`);
        const isReady = await this.checkPortReady("127.0.0.1", this.port, 5e3);
        if (isReady) {
          console.log(`[ProtocolAdapter] 端口 ${this.port} 验证成功`);
          return;
        }
      } catch (error) {
        console.log(`[ProtocolAdapter] 第 ${i + 1} 次端口验证失败:`, error);
      }
      if (i < maxRetries - 1) {
        console.log(`[ProtocolAdapter] 等待 ${retryInterval}ms 后重试...`);
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
      }
    }
    throw new Error(`端口验证失败: ${this.port} - 经过 ${maxRetries} 次重试后仍然无法连接`);
  }
  /**
   * 解析流量信息
   */
  parseTrafficInfo(output) {
    if (output.includes("connection")) {
      this.trafficStats.connections++;
      this.trafficStats.lastActivity = /* @__PURE__ */ new Date();
    }
  }
  /**
   * 发送监控事件
   */
  emitMonitoringEvent(type2, data) {
    const event = {
      type: type2,
      timestamp: /* @__PURE__ */ new Date(),
      adapterId: this.id,
      nodeId: this.node.id,
      data
    };
    this.monitoringListeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error(`[ProtocolAdapter] 监控监听器错误:`, error);
      }
    });
  }
}
const byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
const rnds8Pool = new Uint8Array(256);
let poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    require$$8.randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}
const native = { randomUUID: require$$8.randomUUID };
function v4(options, buf, offset) {
  var _a2;
  if (native.randomUUID && true && !options) {
    return native.randomUUID();
  }
  options = options || {};
  const rnds = options.random ?? ((_a2 = options.rng) == null ? void 0 : _a2.call(options)) ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  return unsafeStringify(rnds);
}
class PortManager {
  constructor() {
    this.portPool = /* @__PURE__ */ new Set();
    this.PORT_RANGE_START = 10800;
    this.PORT_RANGE_END = 11800;
    this.cleanup();
  }
  static getInstance() {
    if (!PortManager.instance) {
      PortManager.instance = new PortManager();
    }
    return PortManager.instance;
  }
  async getAvailablePort() {
    if (this.portPool.size === 0) {
      console.error("[PortManager] No available ports in the pool.");
      return null;
    }
    const port = this.portPool.values().next().value;
    this.portPool.delete(port);
    console.log(`[PortManager] 分配端口: ${port}. 剩余可用端口: ${this.portPool.size}`);
    return port;
  }
  releasePort(port) {
    if (port >= this.PORT_RANGE_START && port <= this.PORT_RANGE_END) {
      this.portPool.add(port);
      console.log(`[PortManager] 释放端口: ${port}. 剩余可用端口: ${this.portPool.size}`);
    }
  }
  cleanup() {
    this.portPool.clear();
    for (let port = this.PORT_RANGE_START; port <= this.PORT_RANGE_END; port++) {
      this.portPool.add(port);
    }
    console.log(`[PortManager] 端口池已重置. 可用端口数: ${this.portPool.size}`);
  }
}
class ChainStatusManager {
  constructor() {
    this.chainStatuses = /* @__PURE__ */ new Map();
    this.ipDetectionCache = /* @__PURE__ */ new Map();
  }
  static getInstance() {
    if (!ChainStatusManager.instance) {
      ChainStatusManager.instance = new ChainStatusManager();
    }
    return ChainStatusManager.instance;
  }
  /**
   * 更新代理链状态
   */
  updateChainStatus(chainId, chainName, chainType, middlewareManager, nodes) {
    try {
      const middlewareStatus = middlewareManager.getStatus();
      const adapters2 = middlewareStatus.adapters;
      const nodeStatuses = nodes.map((node2) => {
        var _a2, _b2, _c2;
        const adapter = adapters2.find((adapter2) => adapter2.node.id === node2.id);
        const nodeStatus = {
          nodeId: node2.id,
          nodeName: node2.name,
          nodeType: node2.type,
          server: node2.server,
          port: node2.port,
          localPort: (adapter == null ? void 0 : adapter.port) || 0,
          status: (adapter == null ? void 0 : adapter.status) === "running" ? "connected" : "disconnected",
          traffic: {
            upload: ((_a2 = adapter == null ? void 0 : adapter.trafficStats) == null ? void 0 : _a2.bytesSent) || 0,
            download: ((_b2 = adapter == null ? void 0 : adapter.trafficStats) == null ? void 0 : _b2.bytesReceived) || 0,
            connections: ((_c2 = adapter == null ? void 0 : adapter.trafficStats) == null ? void 0 : _c2.connections) || 0
          }
        };
        if (adapter == null ? void 0 : adapter.error) {
          nodeStatus.error = adapter.error;
        }
        if (adapter == null ? void 0 : adapter.startTime) {
          nodeStatus.connectTime = adapter.startTime;
        }
        return nodeStatus;
      });
      const totalTraffic = nodeStatuses.reduce((total, node2) => ({
        upload: total.upload + node2.traffic.upload,
        download: total.download + node2.traffic.download,
        connections: total.connections + node2.traffic.connections
      }), { upload: 0, download: 0, connections: 0 });
      const chainStatus = {
        chainId,
        chainName,
        chainType,
        status: middlewareStatus.status === "running" ? "running" : "stopped",
        nodes: nodeStatuses,
        entryPort: middlewareStatus.entryPort,
        totalTraffic
      };
      if (middlewareStatus.startTime) {
        chainStatus.startTime = middlewareStatus.startTime;
      }
      if (middlewareStatus.error) {
        chainStatus.error = middlewareStatus.error;
      }
      this.chainStatuses.set(chainId, chainStatus);
      console.log(`[ChainStatusManager] 代理链状态已更新: ${chainName}`, { chainId, nodeCount: nodes.length });
    } catch (error) {
      console.error(`[ChainStatusManager] 更新代理链状态失败: ${chainId}`, error);
    }
  }
  /**
   * 获取代理链状态
   */
  getChainStatus(chainId) {
    return this.chainStatuses.get(chainId) || null;
  }
  /**
   * 获取所有代理链状态
   */
  getAllChainStatuses() {
    return Array.from(this.chainStatuses.values());
  }
  /**
   * 移除代理链状态
   */
  removeChainStatus(chainId) {
    this.chainStatuses.delete(chainId);
    this.ipDetectionCache.delete(chainId);
  }
  /**
   * 检测代理链中每个节点的IP地址
   * 注意：这是一个敏感操作，需要谨慎处理
   */
  async detectChainNodeIPs(chainId) {
    const chainStatus = this.chainStatuses.get(chainId);
    if (!chainStatus) {
      throw new Error(`代理链不存在: ${chainId}`);
    }
    const results = [];
    for (let i = 0; i < chainStatus.nodes.length; i++) {
      const node2 = chainStatus.nodes[i];
      if (!node2) continue;
      try {
        const detection = await this.detectNodeIP(node2, i, chainStatus.entryPort, i === chainStatus.nodes.length - 1);
        results.push({
          nodeId: node2.nodeId,
          nodeName: node2.nodeName,
          position: i,
          detection,
          detected: detection.success
        });
        const cacheKey = `${chainId}_${node2.nodeId}`;
        this.ipDetectionCache.set(cacheKey, detection);
      } catch (error) {
        console.error(`[ChainStatusManager] 检测节点IP失败: ${node2.nodeName}`, error);
        results.push({
          nodeId: node2.nodeId,
          nodeName: node2.nodeName,
          position: i,
          detection: {
            success: false,
            method: "chain",
            timestamp: Date.now(),
            error: error instanceof Error ? error.message : String(error)
          },
          detected: false
        });
      }
    }
    return results;
  }
  /**
   * 检测单个节点的IP地址
   */
  async detectNodeIP(node2, _position, fallbackPort, isLastNode = false) {
    try {
      if (node2.localPort && node2.status === "connected") {
        const result = await this.detectIPViaPort(node2.localPort);
        if (result.success) {
          return { ...result, method: "proxy" };
        }
      }
      if (isLastNode && typeof fallbackPort === "number" && fallbackPort > 0) {
        const fallback = await this.detectIPViaPort(fallbackPort);
        if (fallback.success) {
          return { ...fallback, method: "chain" };
        }
      }
      return {
        success: false,
        method: "chain",
        timestamp: Date.now(),
        error: "无法检测到节点IP地址"
      };
    } catch (error) {
      return {
        success: false,
        method: "chain",
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * 通过端口检测IP地址
   */
  async detectIPViaPort(port) {
    try {
      const apis = [
        "https://ipapi.co/json/",
        "https://ipinfo.io/json",
        "https://api.ipify.org?format=json"
      ];
      for (const api of apis) {
        try {
          const result = await this.fetchIPViaProxy(api, port);
          if (result.success) {
            return result;
          }
        } catch (error) {
          console.warn(`[ChainStatusManager] IP检测API失败: ${api}`, error);
        }
      }
      return {
        success: false,
        method: "proxy",
        timestamp: Date.now(),
        error: "所有IP检测API都不可用"
      };
    } catch (error) {
      return {
        success: false,
        method: "proxy",
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * 通过代理端口获取IP信息
   */
  async fetchIPViaProxy(apiUrl, port) {
    return new Promise((resolve) => {
      try {
        const { SocksClient } = require("socks");
        const { URL: URL2 } = require("url");
        const targetUrl = new URL2(apiUrl);
        SocksClient.createConnection({
          proxy: {
            host: "127.0.0.1",
            port,
            type: 5
            // SOCKS5
          },
          command: "connect",
          destination: {
            host: targetUrl.hostname,
            port: parseInt(targetUrl.port) || (targetUrl.protocol === "https:" ? 443 : 80)
          },
          timeout: 1e4
        }).then(({ socket }) => {
          const onError = (err) => {
            resolve({
              success: false,
              method: "proxy",
              timestamp: Date.now(),
              error: (err == null ? void 0 : err.message) || String(err)
            });
          };
          socket.on("error", onError);
          if (targetUrl.protocol === "https:") {
            const tls2 = require("tls");
            const secureSocket = tls2.connect({
              socket,
              servername: targetUrl.hostname,
              rejectUnauthorized: false,
              timeout: 8e3
            }, () => {
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
              secureSocket.write(requestLines);
              secureSocket.on("data", (chunk) => data += chunk.toString()).on("error", onError).on("end", () => {
                try {
                  const body = data.split("\r\n\r\n")[1] || "";
                  const jsonData = JSON.parse(body);
                  resolve({
                    success: true,
                    ip: jsonData.ip,
                    geolocation: {
                      country: jsonData.country || jsonData.country_name,
                      region: jsonData.region,
                      city: jsonData.city,
                      isp: jsonData.org || jsonData.isp
                    },
                    method: "proxy",
                    timestamp: Date.now()
                  });
                } catch (e) {
                  resolve({
                    success: false,
                    method: "proxy",
                    timestamp: Date.now(),
                    error: "Failed to parse response"
                  });
                }
              });
            });
            secureSocket.on("error", (err) => {
              console.warn(`[ChainStatusManager] TLS连接错误: ${apiUrl}`, err.message);
              onError(err);
            });
            secureSocket.on("timeout", () => {
              console.warn(`[ChainStatusManager] TLS连接超时: ${apiUrl}`);
              secureSocket.destroy();
              onError(new Error("TLS连接超时"));
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
                resolve({
                  success: true,
                  ip: jsonData.ip,
                  geolocation: {
                    country: jsonData.country || jsonData.country_name,
                    region: jsonData.region,
                    city: jsonData.city,
                    isp: jsonData.org || jsonData.isp
                  },
                  method: "proxy",
                  timestamp: Date.now()
                });
              } catch (e) {
                resolve({
                  success: false,
                  method: "proxy",
                  timestamp: Date.now(),
                  error: "Failed to parse response"
                });
              }
            });
          }
        }).catch((err) => {
          console.warn(`[ChainStatusManager] SOCKS5连接失败，尝试HTTP代理: ${err == null ? void 0 : err.message}`);
          this.tryHttpProxy(apiUrl, port).then(resolve).catch(() => {
            resolve({
              success: false,
              method: "proxy",
              timestamp: Date.now(),
              error: (err == null ? void 0 : err.message) || String(err)
            });
          });
        });
      } catch (e) {
        resolve({
          success: false,
          method: "proxy",
          timestamp: Date.now(),
          error: (e == null ? void 0 : e.message) || String(e)
        });
      }
    });
  }
  /**
   * 尝试通过HTTP代理获取IP信息
   */
  async tryHttpProxy(apiUrl, port) {
    return new Promise((resolve) => {
      try {
        const { URL: URL2 } = require("url");
        const http2 = require("http");
        const https2 = require("https");
        const targetUrl = new URL2(apiUrl);
        const isHttps2 = targetUrl.protocol === "https:";
        const httpModule = isHttps2 ? https2 : http2;
        const options = {
          hostname: "127.0.0.1",
          port,
          path: apiUrl,
          method: "GET",
          headers: {
            "Accept": "application/json",
            "User-Agent": "Chongdong/1.0",
            "Connection": "close"
          },
          timeout: 1e4
        };
        const req = httpModule.request(options, (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk.toString();
          });
          res.on("end", () => {
            try {
              const jsonData = JSON.parse(data);
              resolve({
                success: true,
                ip: jsonData.ip,
                geolocation: {
                  country: jsonData.country || jsonData.country_name,
                  region: jsonData.region,
                  city: jsonData.city,
                  isp: jsonData.org || jsonData.isp
                },
                method: "proxy",
                timestamp: Date.now()
              });
            } catch (e) {
              resolve({
                success: false,
                method: "proxy",
                timestamp: Date.now(),
                error: "Failed to parse HTTP response"
              });
            }
          });
        });
        req.on("error", (err) => {
          console.warn(`[ChainStatusManager] HTTP代理请求错误: ${apiUrl}`, err.message);
          resolve({
            success: false,
            method: "proxy",
            timestamp: Date.now(),
            error: (err == null ? void 0 : err.message) || String(err)
          });
        });
        req.on("timeout", () => {
          console.warn(`[ChainStatusManager] HTTP代理请求超时: ${apiUrl}`);
          req.destroy();
          resolve({
            success: false,
            method: "proxy",
            timestamp: Date.now(),
            error: "HTTP代理请求超时"
          });
        });
        req.end();
      } catch (e) {
        resolve({
          success: false,
          method: "proxy",
          timestamp: Date.now(),
          error: (e == null ? void 0 : e.message) || String(e)
        });
      }
    });
  }
  /**
   * 清理资源
   */
  cleanup() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = void 0;
    }
    this.chainStatuses.clear();
    this.ipDetectionCache.clear();
  }
}
const chainStatusManager = ChainStatusManager.getInstance();
class ProxyChainMiddlewareManager {
  constructor(config, chainId, chainName, chainType, nodes) {
    this.status = "idle";
    this.adapters = [];
    this.monitoringListeners = [];
    this.protectionRules = [];
    this.connectionHistory = [];
    this.connectionIndex = /* @__PURE__ */ new Map();
    this.id = v4();
    this.config = config;
    this.chainId = chainId;
    this.chainName = chainName;
    this.chainType = chainType;
    this.chainNodes = nodes;
    this.trafficStats = {
      bytesReceived: 0,
      bytesSent: 0,
      connections: 0,
      lastActivity: /* @__PURE__ */ new Date()
    };
  }
  /**
   * 启动代理链中间件
   */
  async start() {
    console.log(`[ProxyChainMiddlewareManager] 启动代理链中间件: ${this.id}`);
    console.log(`[ProxyChainMiddlewareManager] 配置详情:`);
    console.log(`  - 入口端口: ${this.config.entryPort}`);
    console.log(`  - 节点数量: ${this.config.nodes.length}`);
    console.log(`  - 启用监控: ${this.config.enableMonitoring}`);
    console.log(`  - 启用防护: ${this.config.enableProtection}`);
    console.log(`  - 最大重试: ${this.config.maxRetries}`);
    console.log(`  - 超时时间: ${this.config.timeout}ms`);
    try {
      this.status = "starting";
      this.startTime = /* @__PURE__ */ new Date();
      console.log(`[ProxyChainMiddlewareManager] 状态已设置为: starting`);
      PortManager.getInstance().cleanup();
      console.log(`[ProxyChainMiddlewareManager] 步骤1: 创建协议适配器...`);
      await this.createProtocolAdapters();
      console.log(`[ProxyChainMiddlewareManager] 协议适配器创建完成，数量: ${this.adapters.length}`);
      console.log(`[ProxyChainMiddlewareManager] 步骤2: 启动协议适配器...`);
      await this.startProtocolAdapters();
      console.log(`[ProxyChainMiddlewareManager] 协议适配器启动完成`);
      console.log(`[ProxyChainMiddlewareManager] 步骤3: 创建并启动流量路由器...`);
      await this.createAndStartTrafficRouter();
      console.log(`[ProxyChainMiddlewareManager] 流量路由器启动完成`);
      this.status = "running";
      this.startTime = /* @__PURE__ */ new Date();
      console.log(`[ProxyChainMiddlewareManager] 状态已设置为: running`);
      if (this.chainId && this.chainName && this.chainType && this.chainNodes) {
        chainStatusManager.updateChainStatus(
          this.chainId,
          this.chainName,
          this.chainType,
          this,
          this.chainNodes
        );
      }
      console.log(`✅ [ProxyChainMiddlewareManager] 代理链中间件启动成功: ${this.id}`);
    } catch (error) {
      this.status = "error";
      this.error = error instanceof Error ? error.message : String(error);
      console.error(`❌ [ProxyChainMiddlewareManager] 代理链中间件启动失败: ${this.id}`, error);
      console.error(`❌ [ProxyChainMiddlewareManager] 错误详情:`, error instanceof Error ? error.stack : error);
      await this.cleanup();
      throw error;
    }
  }
  /**
   * 停止代理链中间件
   */
  async stop() {
    console.log(`[ProxyChainMiddlewareManager] 停止代理链中间件: ${this.id}`);
    try {
      this.status = "stopping";
      if (this.router) {
        await this.router.stop();
      }
      await this.stopProtocolAdapters();
      await this.cleanup();
      this.status = "stopped";
      console.log(`✅ [ProxyChainMiddlewareManager] 代理链中间件停止成功: ${this.id}`);
    } catch (error) {
      console.error(`❌ [ProxyChainMiddlewareManager] 代理链中间件停止失败: ${this.id}`, error);
      throw error;
    }
  }
  /**
   * 获取中间件状态
   */
  getStatus() {
    return {
      id: this.id,
      status: this.status,
      adapters: this.adapters.map((adapter) => adapter.getInfo()),
      entryPort: this.config.entryPort,
      error: this.error,
      startTime: this.startTime,
      trafficStats: { ...this.trafficStats }
    };
  }
  /**
   * 获取代理链状态
   */
  getChainStatus() {
    if (this.chainId) {
      return chainStatusManager.getChainStatus(this.chainId);
    }
    return null;
  }
  /**
   * 更新代理链状态
   */
  updateChainStatus() {
    if (this.chainId && this.chainName && this.chainType && this.chainNodes) {
      chainStatusManager.updateChainStatus(
        this.chainId,
        this.chainName,
        this.chainType,
        this,
        this.chainNodes
      );
    }
  }
  /**
   * 获取流量统计
   */
  getTrafficStats() {
    const totalStats = {
      bytesReceived: 0,
      bytesSent: 0,
      connections: 0,
      lastActivity: /* @__PURE__ */ new Date()
    };
    for (const adapter of this.adapters) {
      const adapterStats = adapter.getInfo().trafficStats;
      totalStats.bytesReceived += adapterStats.bytesReceived;
      totalStats.bytesSent += adapterStats.bytesSent;
      totalStats.connections += adapterStats.connections;
    }
    if (this.router) {
      const routerStats = this.router.getTrafficStats();
      totalStats.bytesReceived += routerStats.bytesReceived;
      totalStats.bytesSent += routerStats.bytesSent;
      totalStats.connections += routerStats.connections;
    }
    return totalStats;
  }
  // [新增] 从各适配器的 clash_api 拉取最新连接并融合主机信息
  async refreshConnectionMetadata() {
    var _a2;
    try {
      for (const adapter of this.adapters) {
        const conns = await ((_a2 = adapter.getRecentConnections) == null ? void 0 : _a2.call(adapter));
        if (Array.isArray(conns)) {
          conns.forEach((c) => {
            var _a3;
            const id = c.id || ((_a3 = c.metadata) == null ? void 0 : _a3.sniffHost) || "";
            if (!id) return;
            const found = this.connectionHistory.find((r) => r.id === id);
            if (found) {
              found.metadata = c.metadata || found.metadata;
              if (!found.chains || found.chains.length === 0) found.chains = c.chains || found.chains;
            }
          });
        }
      }
    } catch (e) {
    }
  }
  /**
   * 添加监控监听器
   */
  addMonitoringListener(callback) {
    this.monitoringListeners.push(callback);
    for (const adapter of this.adapters) {
      adapter.addMonitoringListener((event) => {
        this.handleMonitoringEvent(event);
        callback(event);
      });
    }
    if (this.router) {
      this.router.addMonitoringListener((event) => {
        this.handleMonitoringEvent(event);
        callback(event);
      });
    }
  }
  /**
   * 移除监控监听器
   */
  removeMonitoringListener(callback) {
    const index = this.monitoringListeners.indexOf(callback);
    if (index > -1) {
      this.monitoringListeners.splice(index, 1);
    }
    for (const adapter of this.adapters) {
      adapter.removeMonitoringListener(callback);
    }
    if (this.router) {
      this.router.removeMonitoringListener(callback);
    }
  }
  /**
   * 添加防护规则
   */
  addProtectionRule(rule) {
    this.protectionRules.push(rule);
    if (this.router) {
      this.router.addProtectionRule(rule);
    }
    console.log(`[ProxyChainMiddlewareManager] 添加防护规则: ${rule.name}`);
  }
  /**
   * 移除防护规则
   */
  removeProtectionRule(ruleId) {
    const index = this.protectionRules.findIndex((rule) => rule.id === ruleId);
    if (index > -1) {
      this.protectionRules.splice(index, 1);
    }
    if (this.router) {
      this.router.removeProtectionRule(ruleId);
    }
  }
  /**
   * 创建协议适配器
   */
  async createProtocolAdapters() {
    console.log(`[ProxyChainMiddlewareManager] [重构] 采用多实例模式创建协议适配器...`);
    this.adapters = [];
    const nodes = this.config.nodes;
    if (nodes.length === 0) {
      console.warn("[ProxyChainMiddlewareManager] 警告: 代理链中没有节点。");
      return;
    }
    const portManager = PortManager.getInstance();
    const localPorts = [];
    for (let i = 0; i < nodes.length; i++) {
      const port = await portManager.getAvailablePort();
      if (port === null) {
        const nodeForError = nodes[i];
        if (nodeForError) {
          throw new Error(`无法为节点 ${nodeForError.name} 分配可用端口`);
        } else {
          throw new Error(`无法分配可用端口，并且在索引 ${i} 处找不到节点定义。`);
        }
      }
      localPorts.push(port);
    }
    for (let i = 0; i < nodes.length; i++) {
      const node2 = nodes[i];
      const listenPort = localPorts[i];
      if (!node2 || listenPort == null) {
        console.warn(`[ProxyChainMiddlewareManager] 发现一个空的节点或无法分配端口在索引 ${i}，已跳过。`);
        continue;
      }
      let inboundOverride;
      if (i > 0) {
        const previousNode = nodes[i - 1];
        if (previousNode) {
          inboundOverride = this.createInboundOverride(listenPort, previousNode);
        }
      }
      const nextHopHost = "127.0.0.1";
      const nextHopPort = i < nodes.length - 1 ? localPorts[i + 1] ?? void 0 : void 0;
      const adapterId = `adapter_${node2.id}_${i}`;
      console.log(`[ProxyChainMiddlewareManager] 创建适配器: ${adapterId} for node ${node2.name} (监听端口: ${listenPort}, 下一跳端口: ${nextHopPort || "N/A (直连)"})`);
      const adapter = new ProtocolAdapter(adapterId, node2, listenPort, nextHopHost, nextHopPort, inboundOverride);
      this.adapters.push(adapter);
    }
    console.log(`[ProxyChainMiddlewareManager] 创建了 ${this.adapters.length} 个独立的协议适配器`);
  }
  /**
   * [新增] 根据前一个节点的出站协议，为当前节点创建对应的入站配置
   */
  createInboundOverride(listenPort, previousNode) {
    const baseInbound = {
      listen: "127.0.0.1",
      listen_port: listenPort,
      tag: `${previousNode.type}-in`
    };
    switch (previousNode.type) {
      case "vmess":
        return {
          ...baseInbound,
          type: "vmess",
          users: [{ uuid: previousNode.uuid }]
          // [修复] vmess入站配置不包含 alter_id
        };
      case "trojan":
        return {
          ...baseInbound,
          type: "trojan",
          users: [{ password: previousNode.password }]
        };
      case "shadowsocks":
        return {
          ...baseInbound,
          type: "shadowsocks",
          method: previousNode.encryption,
          password: previousNode.password
        };
      default:
        return {
          ...baseInbound,
          type: "mixed",
          tag: "mixed-in",
          users: []
        };
    }
  }
  /**
   * 启动协议适配器
   */
  async startProtocolAdapters() {
    console.log(`[ProxyChainMiddlewareManager] 启动协议适配器...`);
    for (let i = 0; i < this.adapters.length; i++) {
      const adapter = this.adapters[i];
      if (!adapter) {
        console.warn(`[ProxyChainMiddlewareManager] 跳过索引 ${i} 的空适配器`);
        continue;
      }
      try {
        try {
          adapter.apiPort = 9001 + i;
        } catch {
        }
        await adapter.start();
        console.log(`✅ [ProxyChainMiddlewareManager] 适配器启动成功: ${adapter.getInfo().id}`);
      } catch (error) {
        console.error(`❌ [ProxyChainMiddlewareManager] 适配器启动失败: ${adapter.getInfo().id}`, error);
        throw error;
      }
    }
    console.log(`[ProxyChainMiddlewareManager] 所有协议适配器启动完成`);
  }
  /**
   * 停止协议适配器
   */
  async stopProtocolAdapters() {
    console.log(`[ProxyChainMiddlewareManager] 停止协议适配器...`);
    const stopPromises = this.adapters.map(async (adapter) => {
      try {
        await adapter.stop();
        console.log(`✅ [ProxyChainMiddlewareManager] 适配器停止成功: ${adapter.getInfo().id}`);
      } catch (error) {
        console.error(`❌ [ProxyChainMiddlewareManager] 适配器停止失败: ${adapter.getInfo().id}`, error);
      }
    });
    await Promise.all(stopPromises);
    console.log(`[ProxyChainMiddlewareManager] 所有协议适配器停止完成`);
  }
  /**
   * 创建并启动流量路由器
   */
  async createAndStartTrafficRouter() {
    console.log(`[ProxyChainMiddlewareManager] 创建并启动流量路由器...`);
    if (this.adapters.length === 0) {
      console.warn("[ProxyChainMiddlewareManager] 没有可用的适配器，流量路由器将不会启动。");
      return;
    }
    this.router = new TrafficRouter(this.config.entryPort, this.adapters);
    this.router.addMonitoringListener((event) => this.handleMonitoringEvent(event));
    for (const rule of this.protectionRules) {
      this.router.addProtectionRule(rule);
    }
    await this.router.start();
    console.log(`✅ [ProxyChainMiddlewareManager] 流量路由器启动成功`);
  }
  // 新增：聚合并维护连接历史
  handleMonitoringEvent(event) {
    var _a2, _b2, _c2;
    try {
      if (event.type === MonitoringEventType.CONNECTION_START && event.data) {
        const id = event.data.connectionId || `conn_${Date.now()}`;
        const rec = {
          id,
          metadata: {
            host: event.data.clientAddress || "unknown",
            destinationPort: 0,
            network: "tcp"
          },
          start: (/* @__PURE__ */ new Date()).toISOString(),
          upload: 0,
          download: 0,
          rule: "chain",
          chains: Array.isArray(event.data.chains) ? event.data.chains : []
        };
        this.connectionHistory.unshift(rec);
        this.connectionIndex.set(id, 0);
        if (this.connectionHistory.length > 200) this.connectionHistory = this.connectionHistory.slice(0, 200);
      }
      if (event.type === MonitoringEventType.TRAFFIC_FLOW && event.data) {
        const id = event.data.connectionId;
        if (id) {
          let idx = this.connectionIndex.get(id);
          if (idx === void 0) {
            const rec2 = {
              id,
              metadata: { host: "unknown", destinationPort: 0, network: "tcp" },
              start: (/* @__PURE__ */ new Date()).toISOString(),
              upload: 0,
              download: 0,
              rule: "chain",
              chains: []
            };
            this.connectionHistory.unshift(rec2);
            idx = 0;
            this.connectionIndex.set(id, 0);
          }
          const rec = this.connectionHistory[idx];
          if (rec) {
            if (event.data.direction === "client_to_adapter") rec.upload += event.data.bytes || 0;
            else rec.download += event.data.bytes || 0;
          }
        }
      }
      if (event.type === MonitoringEventType.CONNECTION_END && event.data) {
        const rec = {
          id: event.data.connectionId || `conn_${Date.now()}`,
          metadata: {
            host: ((_a2 = event.data.metadata) == null ? void 0 : _a2.host) || event.data.clientAddress || "unknown",
            destinationPort: ((_b2 = event.data.metadata) == null ? void 0 : _b2.destinationPort) || 0,
            network: ((_c2 = event.data.metadata) == null ? void 0 : _c2.network) || "tcp"
          },
          start: event.data.start || (/* @__PURE__ */ new Date()).toISOString(),
          upload: event.data.upload || 0,
          download: event.data.download || 0,
          rule: event.data.rule || "chain",
          chains: Array.isArray(event.data.chains) ? event.data.chains : []
        };
        const knownIdx = this.connectionIndex.get(rec.id);
        if (knownIdx !== void 0) {
          const existing = this.connectionHistory[knownIdx];
          if (existing) {
            existing.upload = rec.upload || existing.upload;
            existing.download = rec.download || existing.download;
            existing.metadata = rec.metadata || existing.metadata;
            existing.chains = rec.chains || existing.chains;
            existing.rule = rec.rule || existing.rule;
          }
          this.connectionIndex.delete(rec.id);
        } else {
          this.connectionHistory.unshift(rec);
        }
        if (this.connectionHistory.length > 200) this.connectionHistory = this.connectionHistory.slice(0, 200);
      }
    } catch (e) {
      console.warn("[ProxyChainMiddlewareManager] handleMonitoringEvent error:", e);
    }
  }
  // 暴露连接历史，供 ProxyManager/IPC 返回
  getConnectionHistory() {
    return [...this.connectionHistory];
  }
  /**
   * 清理资源
   */
  async cleanup() {
    this.adapters = [];
    this.router = void 0;
    this.error = void 0;
    this.startTime = void 0;
    PortManager.getInstance().cleanup();
  }
}
const execAsync = require$$1$1.promisify(child_process.exec);
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
      await this.verifyProxySettings();
    } catch (error) {
      throw new Error(`Failed to set macOS proxy: ${error}`);
    }
  }
  /**
   * 验证代理设置是否生效
   */
  async verifyProxySettings() {
    console.log(`=== 验证代理设置是否生效 ===`);
    try {
      const { exec: exec2 } = require("child_process");
      const { promisify: promisify2 } = require("util");
      const execAsync2 = promisify2(exec2);
      const networkServices = ["Ethernet", "Wi-Fi"];
      for (const service of networkServices) {
        console.log(`检查网络服务 "${service}" 的代理状态...`);
        try {
          const httpResult = await execAsync2(`networksetup -getwebproxy "${service}"`);
          console.log(`HTTP代理状态: ${httpResult.stdout}`);
          const httpsResult = await execAsync2(`networksetup -getsecurewebproxy "${service}"`);
          console.log(`HTTPS代理状态: ${httpsResult.stdout}`);
          const socksResult = await execAsync2(`networksetup -getsocksfirewallproxy "${service}"`);
          console.log(`SOCKS代理状态: ${socksResult.stdout}`);
          const enabledResult = await execAsync2(`networksetup -getwebproxy "${service}" | grep "Enabled:"`);
          const isEnabled = enabledResult.stdout.includes("Yes");
          console.log(`🔍 [代理验证] ${service} 代理启用状态: ${isEnabled ? "已启用" : "未启用"}`);
          if (!isEnabled) {
            console.warn(`⚠️  [代理验证] ${service} 代理未启用，这可能是导致无法联网的原因`);
          }
        } catch (error) {
          console.error(`❌ [代理验证] 检查 ${service} 代理状态失败:`, error);
        }
      }
      console.log(`🔍 [代理验证] 开始测试系统代理是否真正生效...`);
      await this.testSystemProxyEffectiveness();
      console.log(`=== 代理设置验证完成 ===`);
    } catch (error) {
      console.error(`代理设置验证失败:`, error);
    }
  }
  /**
   * 测试系统代理是否真正生效
   */
  async testSystemProxyEffectiveness() {
    console.log(`🔍 [系统代理测试] 开始测试系统代理是否真正生效...`);
    try {
      const https2 = require("https");
      const http2 = require("http");
      const testUrl = "http://connectivitycheck.gstatic.com/generate_204";
      console.log(`🔍 [系统代理测试] 测试URL: ${testUrl}`);
      const testRequest = () => {
        return new Promise((resolve) => {
          const url2 = new URL(testUrl);
          const isHttps2 = url2.protocol === "https:";
          const client = isHttps2 ? https2 : http2;
          const req = client.request(url2, {
            method: "GET",
            timeout: 1e4
          }, (res) => {
            console.log(`✅ [系统代理测试] 请求成功，状态码: ${res.statusCode}`);
            console.log(`🔍 [系统代理测试] 响应头:`, res.headers);
            resolve({ success: true, statusCode: res.statusCode });
          });
          req.on("error", (error) => {
            console.error(`❌ [系统代理测试] 请求失败:`, error.message);
            console.error(`🔍 [系统代理测试] 错误详情:`, error);
            resolve({ success: false, error: error.message });
          });
          req.on("timeout", () => {
            console.error(`⏰ [系统代理测试] 请求超时`);
            req.destroy();
            resolve({ success: false, error: "Request timeout" });
          });
          req.end();
        });
      };
      const result = await testRequest();
      if (result.success) {
        console.log(`✅ [系统代理测试] 系统代理工作正常，能够通过代理访问外部网站`);
      } else {
        console.warn(`⚠️  [系统代理测试] 系统代理可能未生效，错误: ${result.error}`);
        console.warn(`⚠️  [系统代理测试] 这可能是导致浏览器无法访问网站的原因`);
      }
    } catch (error) {
      console.error(`❌ [系统代理测试] 测试过程中发生错误:`, error);
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
      console.log(`[SystemProxyManager] 尝试创建macOS VPN服务: ${config.name}`);
      try {
        const { stdout } = await execAsync(`scutil --nc list`);
        if (stdout.includes(config.name)) {
          console.log(`macOS VPN service ${config.name} already exists`);
          return;
        }
      } catch (error) {
        console.log(`[SystemProxyManager] 检查VPN服务列表失败: ${error}`);
      }
      const vpnConfigPath = `/Library/Preferences/SystemConfiguration/${config.name}.plist`;
      const vpnConfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>UserDefinedName</key>
  <string>${config.name}</string>
  <key>VPN</key>
  <dict>
    <key>RemoteAddress</key>
    <string>${config.server}</string>
    <key>AuthName</key>
    <string>${config.username || "chongdong"}</string>
    <key>AuthPassword</key>
    <string>${config.password || "defaultsecret"}</string>
    <key>VPNType</key>
    <string>L2TP</string>
  </dict>
</dict>
</plist>`;
      try {
        require("fs").writeFileSync(vpnConfigPath, vpnConfig);
        console.log(`[SystemProxyManager] VPN配置文件已创建: ${vpnConfigPath}`);
        await execAsync(`sudo scutil --nc select "${config.name}"`);
        console.log(`[SystemProxyManager] VPN服务已启用: ${config.name}`);
      } catch (error) {
        console.warn(`[SystemProxyManager] VPN配置创建失败: ${error}`);
        console.log(`[SystemProxyManager] 使用备用方案创建VPN服务`);
        try {
          await execAsync(`sudo networksetup -createpppoeservice "${config.name}" "en0" "${config.username || "chongdong"}" "${config.password || "defaultsecret"}"`);
          console.log(`[SystemProxyManager] PPPoE VPN服务已创建: ${config.name}`);
        } catch (pppoeError) {
          console.warn(`[SystemProxyManager] PPPoE服务创建也失败: ${pppoeError}`);
        }
      }
    } catch (error) {
      console.warn(`[SystemProxyManager] VPN创建失败，但继续执行: ${error}`);
    }
  }
  async connectMacOSVPN(name) {
    try {
      console.log(`[SystemProxyManager] 尝试连接macOS VPN: ${name}`);
      try {
        await execAsync(`sudo scutil --nc start "${name}"`);
        console.log(`macOS VPN connected via scutil: ${name}`);
      } catch (scutilError) {
        console.warn(`[SystemProxyManager] scutil连接失败: ${scutilError}`);
        try {
          await execAsync(`sudo networksetup -connectpppoeservice "${name}"`);
          console.log(`macOS VPN connected via PPPoE: ${name}`);
        } catch (pppoeError) {
          console.warn(`[SystemProxyManager] PPPoE连接也失败: ${pppoeError}`);
          throw new Error(`Failed to connect macOS VPN: ${scutilError}`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to connect macOS VPN: ${error}`);
    }
  }
  async disconnectMacOSVPN(name) {
    try {
      console.log(`[SystemProxyManager] 尝试断开macOS VPN: ${name}`);
      try {
        await execAsync(`sudo scutil --nc stop "${name}"`);
        console.log(`macOS VPN disconnected via scutil: ${name}`);
      } catch (scutilError) {
        console.warn(`[SystemProxyManager] scutil断开失败: ${scutilError}`);
        try {
          await execAsync(`sudo networksetup -disconnectpppoeservice "${name}"`);
          console.log(`macOS VPN disconnected via PPPoE: ${name}`);
        } catch (pppoeError) {
          console.warn(`[SystemProxyManager] PPPoE断开也失败: ${pppoeError}`);
          throw new Error(`Failed to disconnect macOS VPN: ${scutilError}`);
        }
      }
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
        for (const net of nets) {
          if (net.family === "IPv4") {
            result.push({
              name,
              address: net.address,
              netmask: net.netmask || "",
              family: "IPv4",
              internal: net.internal
            });
          }
        }
      }
    }
    return result;
  }
  /**
   * 获取VPN状态
   */
  async getVPNStatus(name) {
    try {
      switch (process.platform) {
        case "win32":
          return await this.getWindowsVPNStatus(name);
        case "darwin":
          return await this.getMacOSVPNStatus(name);
        case "linux":
          return await this.getLinuxVPNStatus(name);
        default:
          return { connected: false, error: `Unsupported platform: ${process.platform}` };
      }
    } catch (error) {
      console.error("Failed to get VPN status:", error);
      return { connected: false, error: `Failed to get VPN status: ${error}` };
    }
  }
  /**
   * Windows VPN状态检查
   */
  async getWindowsVPNStatus(name) {
    try {
      const command = `Get-VpnConnection -Name "${name}" | Select-Object -ExpandProperty ConnectionStatus`;
      const result = await execAsync(`powershell -Command "${command}"`);
      const status = result.stdout.trim().toLowerCase();
      return { connected: status === "connected" };
    } catch (error) {
      return { connected: false, error: `Windows VPN status check failed: ${error}` };
    }
  }
  /**
   * macOS VPN状态检查
   */
  async getMacOSVPNStatus(name) {
    try {
      console.log(`[SystemProxyManager] 检查macOS VPN状态: ${name}`);
      try {
        const { stdout } = await execAsync(`scutil --nc list`);
        if (!stdout.includes(name)) {
          return { connected: false, error: `VPN service "${name}" does not exist` };
        }
      } catch (error) {
        console.warn(`[SystemProxyManager] 检查VPN服务列表失败: ${error}`);
      }
      try {
        const result = await execAsync(`sudo scutil --nc status "${name}"`);
        const isConnected = result.stdout.includes("Connected") || result.stdout.includes("connected");
        console.log(`[SystemProxyManager] VPN状态检查结果: ${result.stdout}`);
        return { connected: isConnected };
      } catch (scutilError) {
        console.warn(`[SystemProxyManager] scutil状态检查失败: ${scutilError}`);
        try {
          const result = await execAsync(`sudo networksetup -showpppoestatus "${name}"`);
          const isConnected = result.stdout.includes("connected") || result.stdout.includes("Connected");
          return { connected: isConnected };
        } catch (networksetupError) {
          console.warn(`[SystemProxyManager] networksetup状态检查也失败: ${networksetupError}`);
          return { connected: false, error: `Unable to check VPN status: ${scutilError}` };
        }
      }
    } catch (error) {
      return { connected: false, error: `macOS VPN status check failed: ${error}` };
    }
  }
  /**
   * Linux VPN状态检查
   */
  async getLinuxVPNStatus(name) {
    try {
      const command = `nmcli -t -f NAME,TYPE,DEVICE,STATE connection show --active | grep "${name}"`;
      const result = await execAsync(command);
      return { connected: result.stdout.includes("activated") };
    } catch (error) {
      return { connected: false, error: `Linux VPN status check failed: ${error}` };
    }
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
class ProxyManager {
  constructor() {
    this.processes = /* @__PURE__ */ new Map();
    this.useMiddleware = true;
    this.suppressSystemProxyForTun = false;
    this.configDir = path$1.join(electron.app.getPath("userData"), "proxy-configs");
    this.binDir = path$1.join(electron.app.getPath("userData"), "bin");
    if (!fs$1.existsSync(this.configDir)) {
      fs$1.mkdirSync(this.configDir, { recursive: true });
    }
    if (!fs$1.existsSync(this.binDir)) {
      fs$1.mkdirSync(this.binDir, { recursive: true });
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
   * 获取最近一次应用到 sing-box 的最终配置（只读快照）
   */
  getCurrentSingboxConfig() {
    return this._lastFinalConfig;
  }
  /**
   * 是否存在任意全局 sing-box 进程（非中间件适配器）
   */
  hasGlobalProcess() {
    return Array.from(this.processes.values()).some((p) => p.type === "singbox");
  }
  /**
   * 在 TUN 模式下屏蔽系统代理设置
   */
  setSuppressSystemProxyForTun(suppress) {
    this.suppressSystemProxyForTun = suppress;
    console.log(`[ProxyManager] suppressSystemProxyForTun = ${suppress}`);
  }
  /**
   * 停止并清理中间件（如果存在）
   */
  async stopMiddleware() {
    if (this.middlewareManager) {
      try {
        console.log("[ProxyManager] 停止中间件...");
        await this.middlewareManager.stop();
        this.middlewareManager = void 0;
        console.log("[ProxyManager] 中间件已停止");
      } catch (e) {
        console.warn("[ProxyManager] 停止中间件出现非致命错误:", e);
      }
    }
  }
  /**
   * 测试代理连接
   */
  async testProxyConnection(port) {
    console.log(`=== 开始代理连接测试 ===`);
    console.log(`测试端口: ${port}`);
    try {
      const currentProcess = Array.from(this.processes.values()).find((p) => p.port === port);
      if (!currentProcess) {
        console.warn(`⚠️  未找到端口 ${port} 对应的进程配置`);
        return;
      }
      console.log(`🔍 [连接测试] 当前进程配置:`, JSON.stringify(currentProcess.config, null, 2));
      const outbounds = currentProcess.config.outbounds || [];
      console.log(`🔍 [连接测试] 出站配置数量: ${outbounds.length}`);
      for (const outbound of outbounds) {
        if (outbound.type === "vmess" || outbound.type === "trojan" || outbound.type === "vless") {
          console.log(`🔍 [连接测试] 测试代理服务器连接: ${outbound.server}:${outbound.server_port}`);
          const testConnection = async () => {
            return new Promise((resolve) => {
              const socket = require$$0$1.createConnection({
                host: outbound.server,
                port: outbound.server_port,
                timeout: 1e4
              });
              socket.on("connect", () => {
                console.log(`✅ [连接测试] 代理服务器连接成功: ${outbound.server}:${outbound.server_port}`);
                socket.destroy();
                resolve(true);
              });
              socket.on("error", (error) => {
                console.error(`❌ [连接测试] 代理服务器连接失败: ${outbound.server}:${outbound.server_port}`, error.message);
                socket.destroy();
                resolve(false);
              });
              socket.on("timeout", () => {
                console.error(`⏰ [连接测试] 代理服务器连接超时: ${outbound.server}:${outbound.server_port}`);
                socket.destroy();
                resolve(false);
              });
            });
          };
          const isConnected = await testConnection();
          if (!isConnected) {
            console.warn(`⚠️  [连接测试] 代理服务器可能不可用，这可能是导致无法联网的原因`);
          }
        }
      }
      console.log(`🔍 [连接测试] 开始测试通过代理访问外部网站...`);
      await this.testProxyAccess(port);
      console.log(`代理连接测试完成`);
    } catch (error) {
      console.error(`代理连接测试失败:`, error);
    }
  }
  /**
   * 测试通过代理访问外部网站
   */
  async testProxyAccess(port) {
    console.log(`🔍 [代理访问测试] 开始测试通过代理访问外部网站...`);
    try {
      const https2 = require("https");
      const http2 = require("http");
      const proxyUrl = `http://127.0.0.1:${port}`;
      const testUrl = "http://connectivitycheck.gstatic.com/generate_204";
      console.log(`🔍 [代理访问测试] 测试URL: ${testUrl}`);
      console.log(`🔍 [代理访问测试] 代理地址: ${proxyUrl}`);
      const testRequest = () => {
        return new Promise((resolve) => {
          const url2 = new URL(testUrl);
          const isHttps2 = url2.protocol === "https:";
          const client = isHttps2 ? https2 : http2;
          const options = {
            hostname: "127.0.0.1",
            port,
            path: testUrl,
            method: "GET",
            timeout: 1e4,
            headers: {
              "Host": url2.hostname
            }
          };
          console.log(`🔍 [代理访问测试] 发送请求选项:`, options);
          const req = client.request(options, (res) => {
            console.log(`✅ [代理访问测试] 请求成功，状态码: ${res.statusCode}`);
            console.log(`🔍 [代理访问测试] 响应头:`, res.headers);
            resolve(true);
          });
          req.on("error", (error) => {
            console.error(`❌ [代理访问测试] 请求失败:`, error.message);
            console.error(`🔍 [代理访问测试] 错误详情:`, error);
            resolve(false);
          });
          req.on("timeout", () => {
            console.error(`⏰ [代理访问测试] 请求超时`);
            req.destroy();
            resolve(false);
          });
          req.end();
        });
      };
      const success = await testRequest();
      if (success) {
        console.log(`✅ [代理访问测试] 通过代理访问外部网站成功`);
      } else {
        console.warn(`⚠️  [代理访问测试] 通过代理访问外部网站失败，这可能是导致无法联网的原因`);
      }
    } catch (error) {
      console.error(`❌ [代理访问测试] 测试过程中发生错误:`, error);
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
      const socket = require$$0$1.createConnection({ host, port });
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
        if (process2.process) {
          process2.process.kill();
        } else if (process2.pid) {
          try {
            global.process.kill(process2.pid, "SIGTERM");
          } catch (e) {
          }
        }
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
    const configPath = path$1.join(this.configDir, `${processId}.json`);
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
    fs$1.writeFileSync(configPath, JSON.stringify(finalConfig, null, 2));
    const singboxPath = await this.getSingboxPath();
    console.log(`Sing-box 可执行文件路径: ${singboxPath}`);
    const isDarwin = process.platform === "darwin";
    const needElevate = !!(isDarwin && (networkSettings == null ? void 0 : networkSettings.enableTun));
    return new Promise((resolve, reject) => {
      var _a2, _b2, _c2, _d, _e;
      console.log(`=== 启动 Sing-box 子进程 ===`);
      console.log(`可执行文件: ${singboxPath}`);
      console.log(`配置文件: ${configPath}`);
      console.log(`工作目录: ${this.binDir}`);
      console.log(`启动参数: ['run', '-c', '${configPath}']`);
      let childProcess = null;
      let elevatedPid = void 0;
      const pidFile = path$1.join(this.binDir, `${processId}.pid`);
      const logFile = path$1.join(this.binDir, `${processId}.log`);
      if (needElevate) {
        const shell = `sh -c 'cd "${this.binDir}"; nohup "${singboxPath}" run -c "${configPath}" > "${logFile}" 2>&1 & echo $! > "${pidFile}"'`;
        const appleScript = `do shell script "${shell.replace(/"/g, '\\"')}" with administrator privileges`;
        console.log(`以管理员权限启动 sing-box (macOS TUN)...`);
        const osa = child_process.spawn("/usr/bin/osascript", ["-e", appleScript], { stdio: ["ignore", "pipe", "pipe"] });
        let osaError = "";
        osa.stderr.on("data", (d) => osaError += d.toString());
        osa.on("exit", (code) => {
          var _a3;
          if (code !== 0) {
            console.error(`osascript 启动失败: ${osaError}`);
            try {
              const { BrowserWindow } = require("electron");
              const win = (_a3 = BrowserWindow.getAllWindows()) == null ? void 0 : _a3[0];
              win == null ? void 0 : win.webContents.send("tun:elevate-error", osaError || "osascript exit with non-zero code");
            } catch {
            }
            reject(new Error(`Failed to elevate sing-box: ${osaError}`));
            return;
          }
          try {
            if (fs$1.existsSync(pidFile)) {
              const pidStr = fs$1.readFileSync(pidFile, "utf8").trim();
              elevatedPid = parseInt(pidStr, 10);
              console.log(`Elevated sing-box PID: ${elevatedPid}`);
            } else {
              console.warn(`未找到PID文件: ${pidFile}`);
            }
          } catch (e) {
            console.warn(`读取PID文件失败:`, e);
          }
        });
      } else {
        childProcess = child_process.spawn(singboxPath, ["run", "-c", configPath], {
          stdio: ["pipe", "pipe", "pipe"],
          detached: false,
          cwd: this.binDir
        });
        console.log(`子进程已启动，PID: ${childProcess.pid}`);
      }
      if (childProcess) {
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
      }
      if (childProcess && childProcess.stdout) childProcess.stdout.on("data", (data) => {
        const output = data.toString();
        console.log(`=== Sing-box 标准输出 ===`);
        console.log(`输出内容: ${output}`);
        if (output.includes("inbound")) {
          console.log(`🔍 [流量监控] 检测到入站连接: ${output}`);
        }
        if (output.includes("outbound")) {
          console.log(`🔍 [流量监控] 检测到出站连接: ${output}`);
        }
        if (output.includes("route")) {
          console.log(`🔍 [流量监控] 检测到路由规则匹配: ${output}`);
        }
        if (output.includes("error") || output.includes("failed")) {
          console.error(`❌ [流量监控] 检测到错误: ${output}`);
        }
      });
      if (childProcess && childProcess.stderr) childProcess.stderr.on("data", (data) => {
        var _a3, _b3;
        const errorMessage = data.toString();
        console.error(`=== Sing-box 标准错误 ===`);
        console.error(`错误内容: ${errorMessage}`);
        if (errorMessage.includes("bind: address already in use")) {
          console.log("🔍 [错误诊断] 检测到端口占用错误，进行详细诊断...");
          const port2 = ((_b3 = (_a3 = finalConfig.inbounds) == null ? void 0 : _a3[0]) == null ? void 0 : _b3.listen_port) || 1080;
          console.log("🔍 [错误诊断] 立即发送端口占用通知，端口:", port2);
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
          console.error("🔍 [错误诊断] Sing-box 配置解析错误，请检查配置文件格式");
          console.log("🔍 [错误诊断] 当前配置:", JSON.stringify(finalConfig, null, 2));
          childProcess.kill();
          if (!resolved) {
            resolved = true;
            reject(new Error(`Sing-box 配置错误: ${errorMessage}`));
          }
          return;
        }
        if (errorMessage.includes("FATAL")) {
          console.error("🔍 [错误诊断] Sing-box 致命错误:", errorMessage);
          childProcess.kill();
          if (!resolved) {
            resolved = true;
            reject(new Error(`Sing-box 致命错误: ${errorMessage}`));
          }
          return;
        }
        if (errorMessage.includes("connection") || errorMessage.includes("connect")) {
          console.error("🔍 [连接诊断] 检测到连接相关错误:", errorMessage);
        }
        if (errorMessage.includes("auth") || errorMessage.includes("authentication")) {
          console.error("🔍 [认证诊断] 检测到认证相关错误:", errorMessage);
        }
      });
      this.processes.set(processId, {
        id: processId,
        type: "singbox",
        process: childProcess,
        pid: elevatedPid,
        elevated: needElevate,
        config: finalConfig,
        port: ((_b2 = (_a2 = finalConfig.inbounds) == null ? void 0 : _a2[0]) == null ? void 0 : _b2.listen_port) || 1080,
        networkSettings
      });
      if (needElevate) {
        const hasTunInbound = Array.isArray(finalConfig.inbounds) && finalConfig.inbounds.some((i) => (i == null ? void 0 : i.type) === "tun");
        if (!hasTunInbound) {
          console.error("[TUN 校验] 未检测到 type=tun 的入站配置，终止启动");
          try {
            childProcess == null ? void 0 : childProcess.kill();
          } catch {
          }
          try {
            if (elevatedPid) process.kill(elevatedPid, "SIGTERM");
          } catch {
          }
          try {
            if (fs$1.existsSync(pidFile)) fs$1.unlinkSync(pidFile);
          } catch {
          }
          try {
            const { BrowserWindow } = require("electron");
            const win = (_c2 = BrowserWindow.getAllWindows()) == null ? void 0 : _c2[0];
            win == null ? void 0 : win.webContents.send("tun:missing-inbound");
          } catch {
          }
          return reject(new Error("TUN 模式缺少 tun 入站配置"));
        }
      }
      console.log(`Started Sing-box process: ${processId}`);
      let resolved = false;
      const port = ((_e = (_d = finalConfig.inbounds) == null ? void 0 : _d[0]) == null ? void 0 : _e.listen_port) || 1080;
      console.log(`=== 准备验证端口 ===`);
      console.log(`验证端口: ${port}`);
      console.log(`等待时间: 2秒`);
      setTimeout(async () => {
        console.log(`=== 开始端口验证 ===`);
        console.log(`当前时间: ${(/* @__PURE__ */ new Date()).toISOString()}`);
        if (childProcess) {
          console.log(`进程状态: ${childProcess.killed ? "已终止" : "运行中"}`);
          console.log(`进程PID: ${childProcess.pid}`);
        } else {
          console.log(`提权模式：PID=${elevatedPid}`);
        }
        if (!resolved) {
          try {
            console.log(`开始检查端口 ${port} 是否可用...`);
            const isPortReady = await this.checkPortReady("127.0.0.1", port, 5e3);
            console.log(`端口检查结果: ${isPortReady ? "成功" : "失败"}`);
            if (isPortReady) {
              if (needElevate) {
                try {
                  await this.waitForTunReady((networkSettings == null ? void 0 : networkSettings.tunDevice) || "utun0", 6e3);
                } catch (e) {
                  console.warn("[TUN] 等待 utun 路由就绪超时（继续启动）:", (e == null ? void 0 : e.message) || e);
                }
              }
              console.log(`=== Sing-box 启动成功 ===`);
              console.log(`端口 ${port} 验证成功`);
              console.log(`进程ID: ${processId}`);
              await this.testProxyConnection(port);
              console.log(`🔍 [代理验证] 开始验证系统代理设置...`);
              const { systemProxyManager: systemProxyManager2 } = require("./systemProxyManager");
              await systemProxyManager2.verifyProxySettings();
              resolved = true;
              resolve();
            } else {
              console.error(`=== Sing-box 启动失败 ===`);
              console.error(`端口 ${port} 验证失败`);
              if (childProcess) {
                console.error(`终止进程 PID: ${childProcess.pid}`);
                childProcess.kill();
              } else if (elevatedPid) {
                try {
                  process.kill(elevatedPid, "SIGTERM");
                } catch (e) {
                }
                try {
                  if (fs$1.existsSync(pidFile)) fs$1.unlinkSync(pidFile);
                } catch (e) {
                }
              }
              resolved = true;
              reject(new Error(`Sing-box 启动失败: 端口 ${port} 不可用`));
            }
          } catch (error) {
            console.error(`=== Sing-box 端口验证异常 ===`);
            console.error(`异常详情:`, error);
            console.error(`异常消息: ${error instanceof Error ? error.message : "Unknown error"}`);
            if (childProcess) {
              console.error(`终止进程 PID: ${childProcess.pid}`);
              childProcess.kill();
            } else if (elevatedPid) {
              try {
                process.kill(elevatedPid, "SIGTERM");
              } catch (e) {
              }
              try {
                if (fs$1.existsSync(pidFile)) fs$1.unlinkSync(pidFile);
              } catch (e) {
              }
            }
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
    const configPath = path$1.join(this.configDir, `${processId}.json`);
    console.log(`准备启动 Xray 进程: ${processId}`);
    console.log(`配置文件路径: ${configPath}`);
    console.log(`网络设置:`, networkSettings);
    const finalConfig = this.applyNetworkSettingsToConfig(config, networkSettings);
    console.log(`最终配置文件内容:`, JSON.stringify(finalConfig, null, 2));
    fs$1.writeFileSync(configPath, JSON.stringify(finalConfig, null, 2));
    const xrayPath = await this.getXrayPath();
    console.log(`Xray 可执行文件路径: ${xrayPath}`);
    return new Promise((resolve, reject) => {
      var _a2, _b2;
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
        var _a3, _b3, _c2, _d;
        const errorMessage = data.toString();
        console.error(`Xray stderr: ${errorMessage}`);
        if (errorMessage.includes("bind: address already in use")) {
          console.log("检测到端口占用，发送端口占用通知");
          const { BrowserWindow } = require("electron");
          const windows = BrowserWindow.getAllWindows();
          console.log(`找到 ${windows.length} 个窗口`);
          if (windows.length > 0) {
            const port = ((_b3 = (_a3 = finalConfig.inbounds) == null ? void 0 : _a3[0]) == null ? void 0 : _b3.port) || 1080;
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
          reject(new Error(`端口 ${((_d = (_c2 = finalConfig.inbounds) == null ? void 0 : _c2[0]) == null ? void 0 : _d.port) || 1080} 已被占用，无法启动代理服务`));
          return;
        }
      });
      this.processes.set(processId, {
        id: processId,
        type: "xray",
        process: childProcess,
        config: finalConfig,
        port: ((_b2 = (_a2 = finalConfig.inbounds) == null ? void 0 : _a2[0]) == null ? void 0 : _b2.port) || 1080,
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
    const configPath = path$1.join(this.configDir, `${processId}.yaml`);
    console.log(`准备启动 Clash 进程: ${processId}`);
    console.log(`配置文件路径: ${configPath}`);
    console.log(`网络设置:`, networkSettings);
    const finalConfig = this.applyNetworkSettingsToConfig(config, networkSettings);
    console.log(`最终配置文件内容:`, JSON.stringify(finalConfig, null, 2));
    fs$1.writeFileSync(configPath, this.convertClashConfigToYaml(finalConfig));
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
        if (proxyProcess.process) {
          proxyProcess.process.kill("SIGTERM");
        } else if (proxyProcess.pid) {
          try {
            global.process.kill(proxyProcess.pid, "SIGTERM");
          } catch (_) {
          }
        }
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
    var _a2, _b2;
    try {
      const mm = this.middlewareManager;
      if (mm && mm.getStatus().status === "running") {
        try {
          const chainStats = mm.getTrafficStats();
          const history = ((_a2 = mm.getConnectionHistory) == null ? void 0 : _a2.call(mm)) || [];
          try {
            await ((_b2 = mm.refreshConnectionMetadata) == null ? void 0 : _b2.call(mm));
          } catch {
          }
          return {
            totalUpload: chainStats.bytesReceived || 0,
            totalDownload: chainStats.bytesSent || 0,
            // 速度由前端根据时间差计算；此处保留为0以避免误导
            uploadSpeed: 0,
            downloadSpeed: 0,
            activeConnections: chainStats.connections || 0,
            connections: history,
            totalConnections: 1
          };
        } catch (e) {
          console.warn("[ProxyManager] 获取中间件统计失败，回退到进程统计:", e);
        }
      }
      let totalUpload = 0;
      let totalDownload = 0;
      let activeConnections = 0;
      let uploadSpeed = 0;
      let downloadSpeed = 0;
      let connections = [];
      for (const [processId, processInfo] of this.processes.entries()) {
        try {
          if (processInfo.type === "singbox") {
            const stats = await this.getSingboxStats();
            if (stats && stats.connections) {
              totalUpload += stats.uploadTotal || 0;
              totalDownload += stats.downloadTotal || 0;
              uploadSpeed += stats.uploadSpeed || 0;
              downloadSpeed += stats.downloadSpeed || 0;
              activeConnections = stats.connections.length;
              connections = stats.connections;
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
        connections,
        // 返回连接历史
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
        connections: [],
        // 确保错误时也返回空数组
        totalConnections: 0
      };
    }
  }
  /**
   * 获取Sing-box统计信息
   */
  async getSingboxStats() {
    try {
      const http2 = require("http");
      const fetchApi = (path2) => new Promise((resolve) => {
        const originalProxy = process.env["http_proxy"];
        const originalHttpsProxy = process.env["https_proxy"];
        const originalAllProxy = process.env["all_proxy"];
        delete process.env["http_proxy"];
        delete process.env["https_proxy"];
        delete process.env["all_proxy"];
        const req = http2.request({
          hostname: "127.0.0.1",
          port: 9090,
          // Sing-box Clash API 端口
          path: path2,
          method: "GET",
          timeout: 1e3,
          // 确保直接连接，不使用代理
          agent: false
        }, (res) => {
          let data = "";
          res.on("data", (chunk) => data += chunk);
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              resolve(null);
            }
            if (originalProxy) process.env["http_proxy"] = originalProxy;
            if (originalHttpsProxy) process.env["https_proxy"] = originalHttpsProxy;
            if (originalAllProxy) process.env["all_proxy"] = originalAllProxy;
          });
        });
        req.on("error", (error) => {
          console.log("Sing-box API请求失败:", error.message);
          resolve(null);
          if (originalProxy) process.env["http_proxy"] = originalProxy;
          if (originalHttpsProxy) process.env["https_proxy"] = originalHttpsProxy;
          if (originalAllProxy) process.env["all_proxy"] = originalAllProxy;
        });
        req.on("timeout", () => {
          console.log("Sing-box API请求超时");
          req.destroy();
          resolve(null);
          if (originalProxy) process.env["http_proxy"] = originalProxy;
          if (originalHttpsProxy) process.env["https_proxy"] = originalHttpsProxy;
          if (originalAllProxy) process.env["all_proxy"] = originalAllProxy;
        });
        req.end();
      });
      const connectionsData = await fetchApi("/connections");
      console.log("Sing-box API响应:", { connectionsData });
      if (!connectionsData) {
        console.log("Sing-box连接数据为空");
        return null;
      }
      let totalUpload = 0;
      let totalDownload = 0;
      if (connectionsData.connections && Array.isArray(connectionsData.connections)) {
        connectionsData.connections.forEach((conn) => {
          totalUpload += conn.upload || 0;
          totalDownload += conn.download || 0;
        });
      }
      console.log("计算的流量统计:", { totalUpload, totalDownload });
      return {
        uploadTotal: totalUpload,
        downloadTotal: totalDownload,
        connections: connectionsData.connections || []
      };
    } catch (error) {
      console.error("获取Sing-box统计信息失败:", error);
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
   * 等待 utun 设备与路由就绪
   */
  async waitForTunReady(interfaceName, timeoutMs = 6e3) {
    const start = Date.now();
    const { exec } = require("child_process");
    const execAsync2 = (cmd) => new Promise((resolve, reject) => {
      exec(cmd, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve(stdout);
      });
    });
    while (Date.now() - start < timeoutMs) {
      try {
        const ifconfig = await execAsync2(`/sbin/ifconfig ${interfaceName}`);
        const hasAddr = /inet\s+\d+\.\d+\.\d+\.\d+/.test(ifconfig);
        if (hasAddr) return;
      } catch {
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error("TUN interface not ready in time");
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
        networkSettings.dnsServers.forEach((server2) => {
          if (server2 && server2 !== networkSettings.dnsServer && !dnsServers.includes(server2)) {
            dnsServers.push(server2);
          }
        });
      }
      finalConfig.dns.servers = dnsServers.length > 0 ? dnsServers : ["8.8.8.8"];
      if (networkSettings.enableDnsFallback && networkSettings.dnsFallbackServers) {
        finalConfig.dns.fallback = networkSettings.dnsFallbackServers;
      }
    }
    if (!finalConfig.inbounds) {
      finalConfig.inbounds = [];
    }
    const existingTun = finalConfig.inbounds.find((inbound) => inbound.type === "tun");
    if (networkSettings.enableTun) {
      const tunConfig = existingTun || {
        type: "tun",
        tag: "tun-in",
        interface_name: networkSettings.tunDevice || "utun0",
        mtu: 9e3,
        stack: "system",
        auto_route: true
      };
      tunConfig.disabled = false;
      tunConfig.interface_name = networkSettings.tunDevice || "utun0";
      tunConfig.mtu = 9e3;
      tunConfig.stack = "system";
      tunConfig.auto_route = true;
      tunConfig.inet4_address = networkSettings.enableFakeIp ? [networkSettings.fakeIpRange || "198.18.0.1/16"] : ["172.19.0.1/28"];
      if (networkSettings.enableIpv6) {
        tunConfig.inet6_address = ["fdfe:dcba:9876::1/126"];
      }
      if (!existingTun) {
        finalConfig.inbounds.unshift(tunConfig);
      }
    } else if (existingTun) {
      existingTun.disabled = true;
    }
    try {
      this._lastFinalConfig = finalConfig;
    } catch {
    }
    return finalConfig;
  }
  /**
   * 清理指定类型的所有现有进程
   */
  async cleanupExistingProcesses(type2) {
    const existingProcesses = Array.from(this.processes.values()).filter((p) => p.type === type2);
    for (const process2 of existingProcesses) {
      try {
        if (process2.process) {
          process2.process.kill("SIGTERM");
        } else if (process2.pid) {
          try {
            global.process.kill(process2.pid, "SIGTERM");
          } catch (_) {
          }
        }
        console.log(`清理旧 ${type2} 进程: ${process2.id}`);
      } catch (error) {
        console.error(`清理旧 ${type2} 进程失败: ${process2.id}`, error);
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
  /**
   * 启动代理链
   */
  async startChain(chainConfig, networkSettings, nodes) {
    console.log(`[ProxyManager] Starting proxy chain: ${chainConfig.name}`);
    try {
      let finalNodes = [];
      if (nodes && nodes.length > 0) {
        finalNodes = nodes;
        console.log(`[ProxyManager] Using ${finalNodes.length} provided nodes for chain`);
      } else {
        console.log(`[ProxyManager] Getting nodes from subscriptions: ${chainConfig.proxies.join(", ")}`);
        finalNodes = await this.getNodesFromSubscriptions(chainConfig.proxies);
        console.log(`[ProxyManager] Found ${finalNodes.length} nodes from ${chainConfig.proxies.length} subscriptions`);
      }
      if (finalNodes.length === 0) {
        throw new Error("No valid nodes found for proxy chain");
      }
      console.log(`[ProxyManager] Found ${finalNodes.length} nodes for chain:`, finalNodes.map((n) => n.name));
      const listenPort = networkSettings == null ? void 0 : networkSettings.listenPort;
      if (!listenPort) {
        throw new Error("Listen port must be provided to start a chain.");
      }
      const chainProxyConfig = proxyChainConfigGenerator.generateChainConfig(finalNodes, listenPort);
      const finalConfig = this.applyNetworkSettingsToConfig(chainProxyConfig, networkSettings);
      await this.startSingbox(finalConfig, networkSettings);
      console.log(`[ProxyManager] Proxy chain started successfully: ${chainConfig.name}`);
      return { port: listenPort };
    } catch (error) {
      console.error(`[ProxyManager] Failed to start chain ${chainConfig.name}:`, error);
      throw error;
    }
  }
  /**
   * 从订阅中获取节点
   */
  async getNodesFromSubscriptions(subscriptionIds) {
    var _a2;
    const allNodes = [];
    for (const subId of subscriptionIds) {
      const subscription = (_a2 = settingsManager.getSettings().subscriptions) == null ? void 0 : _a2.find((s) => s.id === subId);
      if (subscription && subscription.servers) {
        const subscriptionNodes = subscription.servers.map((server2) => {
          const node2 = {
            id: server2.id,
            name: server2.name,
            type: server2.protocol,
            server: server2.host,
            port: server2.port,
            subscriptionId: subId
          };
          if (server2.uuid) node2.uuid = server2.uuid;
          if (server2.alterId) node2.alterId = server2.alterId;
          if (server2.username) node2.username = server2.username;
          if (server2.password) node2.password = server2.password;
          if (server2.encryption) node2.encryption = server2.encryption;
          if (server2.network) node2.network = server2.network;
          if (server2.wsPath) node2.wsPath = server2.wsPath;
          if (server2.host) node2.wsHost = server2.host;
          return node2;
        });
        allNodes.push(...subscriptionNodes);
      }
    }
    return allNodes;
  }
  /**
   * 启动代理链
   */
  async startProxyChain(chainId, nodes, port) {
    console.log(`[ProxyManager] 启动代理链: ${chainId}`);
    console.log(`[ProxyManager] 使用 ${this.useMiddleware ? "中间件" : "传统sing-box"} 模式`);
    console.log(`[ProxyManager] 节点数量: ${nodes.length}`);
    if (this.useMiddleware) {
      await this.startProxyChainWithMiddleware(chainId, nodes, port);
    } else {
      await this.startProxyChainWithSingBox(chainId, nodes, port);
    }
  }
  /**
   * 使用中间件启动代理链
   */
  async startProxyChainWithMiddleware(chainId, nodes, port, chainConfig) {
    console.log(`[ProxyManager] 使用中间件启动代理链: ${chainId}`);
    console.log(`[ProxyManager] 中间件配置详情:`);
    console.log(`  - 入口端口: ${port}`);
    console.log(`  - 节点数量: ${nodes.length}`);
    console.log(`  - 节点列表:`, nodes.map((n) => `${n.name} (${n.type})`));
    try {
      if (this.middlewareManager) {
        console.log(`[ProxyManager] 停止现有中间件...`);
        await this.middlewareManager.stop();
        console.log(`[ProxyManager] 现有中间件已停止`);
      }
      console.log(`[ProxyManager] 创建中间件配置...`);
      const config = {
        entryPort: port,
        nodes,
        enableMonitoring: true,
        enableProtection: true,
        maxRetries: 3,
        timeout: 1e4
      };
      console.log(`[ProxyManager] 中间件配置创建完成:`, JSON.stringify(config, null, 2));
      console.log(`[ProxyManager] 创建中间件管理器...`);
      this.middlewareManager = new ProxyChainMiddlewareManager(
        config,
        (chainConfig == null ? void 0 : chainConfig.id) || chainId,
        (chainConfig == null ? void 0 : chainConfig.name) || `Chain-${chainId}`,
        (chainConfig == null ? void 0 : chainConfig.type) || "static",
        nodes
      );
      console.log(`[ProxyManager] 中间件管理器创建成功`);
      console.log(`[ProxyManager] 添加监控监听器...`);
      this.middlewareManager.addMonitoringListener((event) => {
        console.log(`[ProxyManager] 中间件监控事件: ${event.type}`, event.data);
      });
      console.log(`[ProxyManager] 监控监听器添加成功`);
      console.log(`[ProxyManager] 开始启动中间件...`);
      await this.middlewareManager.start();
      console.log(`[ProxyManager] 中间件启动成功`);
      if (!this.suppressSystemProxyForTun) {
        console.log(`[ProxyManager] 设置系统代理...`);
        await systemProxyManager.setSystemProxy("127.0.0.1", port, port);
        console.log(`[ProxyManager] 系统代理设置成功`);
      } else {
        console.log(`[ProxyManager] 已屏蔽系统代理设置（TUN 模式）`);
      }
      console.log(`✅ [ProxyManager] 中间件代理链启动成功: ${chainId}`);
    } catch (error) {
      console.error(`❌ [ProxyManager] 中间件代理链启动失败: ${chainId}`, error);
      console.error(`❌ [ProxyManager] 错误详情:`, error instanceof Error ? error.stack : error);
      console.log(`[ProxyManager] 回退到传统sing-box模式`);
      this.useMiddleware = false;
      await this.startProxyChainWithSingBox(chainId, nodes, port);
    }
  }
  /**
   * 使用传统sing-box启动代理链
   */
  async startProxyChainWithSingBox(chainId, nodes, port) {
    console.log(`[ProxyManager] 使用传统sing-box启动代理链: ${chainId}`);
    proxyChainConfigGenerator.generateChainConfig(nodes, port);
  }
  /**
   * 停止代理链
   */
  async stopProxyChain(chainId) {
    console.log(`[ProxyManager] 停止代理链: ${chainId}`);
    if (this.middlewareManager) {
      await this.middlewareManager.stop();
      this.middlewareManager = void 0;
    }
    const process2 = this.processes.get(chainId);
    if (process2) {
      this.processes.delete(chainId);
    }
    console.log(`✅ [ProxyManager] 代理链停止成功: ${chainId}`);
  }
  /**
   * 获取代理链状态
   */
  getProxyChainStatus(chainId) {
    if (this.middlewareManager) {
      return this.middlewareManager.getStatus();
    }
    const process2 = this.processes.get(chainId);
    return process2 ? { status: "running", ...process2 } : { status: "stopped" };
  }
  /**
   * 获取流量统计
   */
  getTrafficStats() {
    if (this.middlewareManager) {
      return this.middlewareManager.getTrafficStats();
    }
    return { bytesReceived: 0, bytesSent: 0, connections: 0 };
  }
  /**
   * 切换代理链模式
   */
  setUseMiddleware(useMiddleware) {
    this.useMiddleware = useMiddleware;
    console.log(`[ProxyManager] 切换代理链模式: ${useMiddleware ? "中间件" : "传统sing-box"}`);
  }
  /**
   * 测试节点延迟
   */
  async testNodeLatency(node2) {
    console.log(`[ProxyManager] Testing latency for node: ${node2.name} (${node2.id})`);
    try {
      const startTime = Date.now();
      const https2 = require("https");
      const http2 = require("http");
      const testUrl = "http://connectivitycheck.gstatic.com/generate_204";
      const timeout = 1e4;
      return new Promise((resolve) => {
        const url2 = new URL(testUrl);
        const isHttps2 = url2.protocol === "https:";
        const client = isHttps2 ? https2 : http2;
        const req = client.request(url2, {
          method: "GET",
          timeout
        }, () => {
          const endTime = Date.now();
          const latency = endTime - startTime;
          console.log(`延迟测试成功: ${node2.name}`, { latency });
          resolve({
            success: true,
            latency,
            timestamp: Date.now()
          });
        });
        req.on("error", (error) => {
          console.error(`延迟测试失败: ${node2.name}`, error);
          resolve({
            success: false,
            error: error.message,
            latency: 0,
            timestamp: Date.now()
          });
        });
        req.on("timeout", () => {
          console.error(`延迟测试超时: ${node2.name}`);
          req.destroy();
          resolve({
            success: false,
            error: "Request timeout",
            latency: 0,
            timestamp: Date.now()
          });
        });
        req.end();
      });
    } catch (error) {
      console.error(`延迟测试失败: ${node2.name}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        latency: 0,
        timestamp: Date.now()
      };
    }
  }
  /**
   * 测试多个节点延迟
   */
  async testNodesLatency(nodes) {
    const promises = nodes.map((node2) => this.testNodeLatency(node2));
    const results = await Promise.allSettled(promises);
    return results.map((result, index) => {
      const node2 = nodes[index];
      if (!node2) {
        return { nodeId: "unknown", success: false, error: "Node not found at index", latency: 0, timestamp: Date.now() };
      }
      if (result.status === "fulfilled") {
        return {
          nodeId: node2.id,
          ...result.value
        };
      } else {
        return {
          nodeId: node2.id,
          success: false,
          error: result.reason instanceof Error ? result.reason.message : "Unknown test error",
          latency: 0,
          timestamp: Date.now()
        };
      }
    });
  }
  getMiddlewareEntryPort() {
    if (this.middlewareManager) {
      const st = this.middlewareManager.getStatus();
      return st.entryPort;
    }
    return void 0;
  }
  hasMiddlewareRunning() {
    if (!this.middlewareManager) return false;
    const st = this.middlewareManager.getStatus();
    return st.status === "running";
  }
}
const proxyManager = ProxyManager.getInstance();
class TunControllerClass {
  constructor() {
    this.runningPid = null;
    const userData = electron.app.getPath("userData");
    this.binDir = path$1.join(userData, "bin");
    this.pidFile = path$1.join(this.binDir, "tun2socks.pid");
    this.logFile = path$1.join(this.binDir, "tun2socks.log");
  }
  static getInstance() {
    if (!TunControllerClass.instance) {
      TunControllerClass.instance = new TunControllerClass();
    }
    return TunControllerClass.instance;
  }
  resolveTunBinaryPath() {
    const localPath = path$1.join(this.binDir, process.platform === "win32" ? "tun2socks.exe" : "tun2socks");
    if (fs$1.existsSync(localPath)) {
      try {
        if (process.platform !== "win32") fs$1.chmodSync(localPath, 493);
      } catch (_) {
      }
      return localPath;
    }
    const brewArm = "/opt/homebrew/bin/tun2socks";
    const brewX86 = "/usr/local/bin/tun2socks";
    if (fs$1.existsSync(brewArm)) return brewArm;
    if (fs$1.existsSync(brewX86)) return brewX86;
    return "tun2socks";
  }
  async start(options) {
    const isDarwin = process.platform === "darwin";
    const tunName = options.tunName || "utun0";
    const socksHost = options.socksHost || "127.0.0.1";
    const socksPort = options.socksPort;
    const mtu = options.mtu || 9e3;
    const enableUdp = options.enableUdp !== false;
    const enableIpv6 = !!options.enableIpv6;
    const dnsServer = options.dnsServer;
    const extraArgs = options.extraArgs || [];
    await this.stop().catch(() => {
    });
    const tun2socksPath = this.resolveTunBinaryPath();
    const args = [];
    args.push("--interface", tunName);
    args.push("--proxy", `socks5://${socksHost}:${socksPort}`);
    args.push("--mtu", String(mtu));
    args.push("--loglevel", "info");
    if (enableUdp) args.push("--udp");
    if (enableIpv6) args.push("--ipv6");
    if (dnsServer) {
      args.push("--dns-addr", dnsServer);
    }
    args.push(...extraArgs);
    const logRedir = `>> "${this.logFile}" 2>&1`;
    const cmd = `"${tun2socksPath}" ${args.map((a) => a.replace(/"/g, '\\"')).join(" ")} ${logRedir}`;
    if (isDarwin) {
      const shell = `sh -c 'cd "${this.binDir}"; nohup ${cmd} & echo $! > "${this.pidFile}"'`;
      const appleScript = `do shell script "${shell.replace(/"/g, '\\"')}" with administrator privileges`;
      await new Promise((resolve, reject) => {
        const osa = child_process.spawn("/usr/bin/osascript", ["-e", appleScript], { stdio: ["ignore", "pipe", "pipe"] });
        let stderr = "";
        osa.stderr.on("data", (d) => {
          stderr += d.toString();
        });
        osa.on("exit", (code) => {
          if (code !== 0) {
            reject(new Error(`osascript failed: ${stderr || "unknown error"}`));
            return;
          }
          try {
            if (fs$1.existsSync(this.pidFile)) {
              const t = fs$1.readFileSync(this.pidFile, "utf8").trim();
              this.runningPid = parseInt(t, 10);
            }
          } catch (_) {
          }
          resolve();
        });
      });
    } else {
      const child = child_process.spawn(tun2socksPath, args, {
        cwd: this.binDir,
        stdio: ["ignore", "ignore", "ignore"],
        detached: false
      });
      this.runningPid = child.pid || null;
      try {
        fs$1.writeFileSync(this.pidFile, String(this.runningPid || ""));
      } catch (_) {
      }
    }
  }
  async stop() {
    try {
      if (fs$1.existsSync(this.pidFile)) {
        const t = fs$1.readFileSync(this.pidFile, "utf8").trim();
        const pid = parseInt(t, 10);
        if (!isNaN(pid) && pid > 0) {
          try {
            process.kill(pid);
          } catch (_) {
          }
        }
        try {
          fs$1.unlinkSync(this.pidFile);
        } catch (_) {
        }
      }
    } catch (_) {
    }
    this.runningPid = null;
  }
  isRunning() {
    if (this.runningPid && this.runningPid > 0) {
      try {
        process.kill(this.runningPid, 0);
        return true;
      } catch (e) {
        if (e && (e.code === "EPERM" || e.errno === -1)) {
          return true;
        }
      }
    }
    try {
      if (fs$1.existsSync(this.pidFile)) {
        const t = fs$1.readFileSync(this.pidFile, "utf8").trim();
        const pid = parseInt(t, 10);
        if (!isNaN(pid)) {
          try {
            process.kill(pid, 0);
            return true;
          } catch (e) {
            if (e && (e.code === "EPERM" || e.errno === -1)) {
              return true;
            }
          }
        }
      }
    } catch (_) {
    }
    try {
      const out = fs$1.readFileSync(this.logFile, { encoding: "utf8" });
      if (out && /tun2socks/i.test(out)) {
      }
    } catch (_) {
    }
    try {
      const check = require("child_process").execSync(
        process.platform === "win32" ? "tasklist | findstr /i tun2socks" : "pgrep -fl tun2socks || true",
        { stdio: ["ignore", "pipe", "ignore"] }
      ).toString();
      if (check && check.trim().length > 0) {
        return true;
      }
    } catch (_) {
    }
    try {
      if (process.platform === "darwin") {
        const ifc = require("child_process").execSync('ifconfig -l | tr " " "\n" | grep -E "^utun[0-9]+$" | head -n 1 || true', { stdio: ["ignore", "pipe", "ignore"] }).toString();
        if (ifc && ifc.trim().length > 0) {
          return true;
        }
      }
    } catch (_) {
    }
    return false;
  }
  getPid() {
    if (this.runningPid) return this.runningPid;
    try {
      if (fs$1.existsSync(this.pidFile)) {
        const t = fs$1.readFileSync(this.pidFile, "utf8").trim();
        const pid = parseInt(t, 10);
        if (!isNaN(pid)) return pid;
      }
    } catch (_) {
    }
    return null;
  }
  async runCmd(command, timeoutMs = 4e3) {
    return new Promise((resolve) => {
      const child = child_process.exec(command, { timeout: timeoutMs }, (err, stdout, stderr) => {
        if (err) {
          resolve(`ERR: ${err.message}
${stderr || ""}`);
          return;
        }
        resolve(stdout.toString());
      });
      child.on("error", () => resolve("ERR: spawn error"));
    });
  }
  async diagnose(tunName = "utun0") {
    const running = this.isRunning();
    const pid = this.getPid();
    const ifconfig = await this.runCmd(`ifconfig ${tunName} | cat`);
    const routesIpv4 = await this.runCmd(`netstat -rn -f inet | cat`);
    const routesIpv6 = await this.runCmd(`netstat -rn -f inet6 | cat`);
    const dns3 = process.platform === "darwin" ? await this.runCmd("scutil --dns | cat") : await this.runCmd("cat /etc/resolv.conf | cat");
    return { running, pid, ifconfig, routesIpv4, routesIpv6, dns: dns3 };
  }
}
const TunController = TunControllerClass.getInstance();
class CompatPortForwarderClass {
  constructor() {
    this.servers = /* @__PURE__ */ new Map();
  }
  static getInstance() {
    if (!CompatPortForwarderClass.instance) {
      CompatPortForwarderClass.instance = new CompatPortForwarderClass();
    }
    return CompatPortForwarderClass.instance;
  }
  async start(localPort, targetHost, targetPort) {
    await this.stop(localPort).catch(() => {
    });
    const server2 = require$$0$1.createServer((client) => {
      const upstream = new require$$0$1.Socket();
      upstream.connect(targetPort, targetHost, () => {
        client.pipe(upstream).pipe(client);
      });
      upstream.on("error", () => {
        try {
          client.destroy();
        } catch (_) {
        }
      });
      client.on("error", () => {
        try {
          upstream.destroy();
        } catch (_) {
        }
      });
    });
    await new Promise((resolve, reject) => {
      server2.once("error", reject);
      server2.listen(localPort, "127.0.0.1", () => {
        server2.removeListener("error", reject);
        resolve();
      });
    });
    this.servers.set(localPort, server2);
    console.log(`[CompatPortForwarder] 监听 127.0.0.1:${localPort} -> ${targetHost}:${targetPort}`);
  }
  async stop(localPort) {
    const server2 = this.servers.get(localPort);
    if (!server2) return;
    await new Promise((resolve) => server2.close(() => resolve()));
    this.servers.delete(localPort);
    console.log(`[CompatPortForwarder] 已停止 127.0.0.1:${localPort}`);
  }
  async stopAll() {
    const ports = Array.from(this.servers.keys());
    for (const p of ports) {
      await this.stop(p).catch(() => {
      });
    }
  }
}
const CompatPortForwarder = CompatPortForwarderClass.getInstance();
class ProxyModeManager {
  constructor() {
    this.currentMode = "rule";
    this.currentVpnName = void 0;
  }
  static getInstance() {
    if (!ProxyModeManager.instance) {
      ProxyModeManager.instance = new ProxyModeManager();
    }
    return ProxyModeManager.instance;
  }
  /**
   * 应用代理模式
   */
  async applyProxyMode(config) {
    const { mode, settings, networkSettings } = config;
    console.log(`[ProxyModeManager] 应用代理模式: ${mode}`);
    try {
      await this.cleanupCurrentMode();
      switch (mode) {
        case "rule":
          return await this.applyRuleMode(settings, networkSettings);
        case "global":
          return await this.applyGlobalMode(settings, networkSettings);
        case "direct":
          return await this.applyDirectMode(settings, networkSettings);
        case "vpn":
          return await this.applyVpnMode(settings, networkSettings);
        default:
          throw new Error(`不支持的代理模式: ${mode}`);
      }
    } catch (error) {
      console.error(`[ProxyModeManager] 应用代理模式失败:`, error);
      return {
        success: false,
        message: `应用代理模式失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  /**
   * 清理当前模式
   */
  async cleanupCurrentMode() {
    console.log(`[ProxyModeManager] 清理当前模式: ${this.currentMode}`);
    try {
      if (this.currentMode === "vpn") {
        console.log(`[ProxyModeManager] 关闭 TUN 设置并重启引擎`);
        proxyManager.updateNetworkSettings({ enableTun: false });
        await proxyManager.restartAllProcesses();
        this.currentVpnName = void 0;
      }
      await systemProxyManager.clearSystemProxy();
      console.log(`[ProxyModeManager] 当前模式清理完成`);
    } catch (error) {
      console.error(`[ProxyModeManager] 清理当前模式失败:`, error);
    }
  }
  /**
   * 应用规则模式
   */
  async applyRuleMode(settings, _networkSettings) {
    console.log(`[ProxyModeManager] 应用规则模式`);
    try {
      if (settings.systemProxy) {
        await systemProxyManager.setSystemProxy("127.0.0.1", settings.socksPort, settings.proxyPort);
      }
      this.currentMode = "rule";
      return {
        success: true,
        message: "规则模式已启用，将根据用户定义的规则进行流量路由",
        port: settings.proxyPort
      };
    } catch (error) {
      throw new Error(`应用规则模式失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * 应用全局模式
   */
  async applyGlobalMode(settings, _networkSettings) {
    console.log(`[ProxyModeManager] 应用全局模式`);
    try {
      if (settings.systemProxy) {
        await systemProxyManager.setSystemProxy("127.0.0.1", settings.socksPort, settings.proxyPort);
      }
      this.currentMode = "global";
      return {
        success: true,
        message: "全局模式已启用，所有流量都将通过代理",
        port: settings.proxyPort
      };
    } catch (error) {
      throw new Error(`应用全局模式失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * 应用直连模式
   */
  async applyDirectMode(_settings, _networkSettings) {
    console.log(`[ProxyModeManager] 应用直连模式`);
    try {
      await systemProxyManager.clearSystemProxy();
      this.currentMode = "direct";
      return {
        success: true,
        message: "直连模式已启用，所有流量将直连，不经过代理"
      };
    } catch (error) {
      throw new Error(`应用直连模式失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * 应用VPN模式（TUN）
   */
  async applyVpnMode(settings, networkSettings) {
    var _a2, _b2, _c2;
    console.log(`[ProxyModeManager] 应用VPN模式（TUN）`);
    try {
      const tunName = (networkSettings == null ? void 0 : networkSettings.tunDevice) || settings.tunDevice || "utun0";
      const enableUdp = (networkSettings == null ? void 0 : networkSettings.enableUdp) ?? settings.enableUdp ?? true;
      const enableIpv6 = (networkSettings == null ? void 0 : networkSettings.enableIpv6) ?? settings.enableIpv6 ?? false;
      const dnsServer = (networkSettings == null ? void 0 : networkSettings.dnsServer) || settings.dnsServer;
      const socksPort = ((_a2 = proxyManager.getMiddlewareEntryPort) == null ? void 0 : _a2.call(proxyManager)) || settings.socksPort;
      if (!socksPort || socksPort <= 0) {
        throw new Error("无效的 SOCKS 入口端口，无法启动 TUN 模式");
      }
      const mergedNetwork = {
        enableTun: false,
        tunDevice: tunName,
        enableUdp,
        enableIpv6,
        enableDns: (networkSettings == null ? void 0 : networkSettings.enableDns) ?? settings.enableDns ?? true,
        dnsServer
      };
      proxyManager.updateNetworkSettings(mergedNetwork);
      try {
        (_b2 = proxyManager.setSuppressSystemProxyForTun) == null ? void 0 : _b2.call(proxyManager, true);
      } catch {
      }
      await TunController.start({
        tunName,
        socksHost: "127.0.0.1",
        socksPort,
        enableUdp,
        enableIpv6,
        dnsServer
      });
      this.currentMode = "vpn";
      this.currentVpnName = "ChongdongTUN";
      await systemProxyManager.clearSystemProxy();
      try {
        if (settings.enableCompatProxy) {
          const httpPort = settings.compatHttpPort || 1080;
          const socksPort2 = settings.compatSocksPort || 1080;
          const entry = ((_c2 = proxyManager.getMiddlewareEntryPort) == null ? void 0 : _c2.call(proxyManager)) || settings.socksPort;
          if (entry) {
            await CompatPortForwarder.start(httpPort, "127.0.0.1", entry);
            if (socksPort2 !== httpPort) {
              await CompatPortForwarder.start(socksPort2, "127.0.0.1", entry);
            }
          }
        } else {
          await CompatPortForwarder.stopAll();
        }
      } catch (e) {
        console.warn("[ProxyModeManager] 启动兼容端口失败:", e);
      }
      return {
        success: true,
        message: `已启用自研 TUN（tun2socks->${socksPort}），系统代理已清理。`,
        vpnName: "ChongdongTUN"
      };
    } catch (error) {
      throw new Error(`应用VPN模式失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * 获取当前模式
   */
  getCurrentMode() {
    return this.currentMode;
  }
  /**
   * 获取当前VPN名称
   */
  getCurrentVpnName() {
    return this.currentVpnName;
  }
  /**
   * 检查VPN连接状态
   */
  async checkVpnStatus() {
    if (this.currentMode !== "vpn") {
      return { connected: false, error: "当前不是VPN模式" };
    }
    try {
      const running = await Promise.resolve(TunController.isRunning());
      return running ? { connected: true } : { connected: false, error: "TUN 未运行" };
    } catch (error) {
      return { connected: false, error: `检查VPN状态失败: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
  /**
   * 断开VPN连接
   */
  async disconnectVpn() {
    var _a2;
    if (this.currentMode === "vpn") {
      try {
        await TunController.stop();
        await CompatPortForwarder.stopAll();
        proxyManager.updateNetworkSettings({ enableTun: false });
        try {
          (_a2 = proxyManager.setSuppressSystemProxyForTun) == null ? void 0 : _a2.call(proxyManager, false);
        } catch {
        }
        this.currentVpnName = void 0;
        console.log(`[ProxyModeManager] 已停止自研 TUN 模式`);
      } catch (error) {
        console.error(`[ProxyModeManager] 断开VPN连接失败:`, error);
        throw error;
      }
    }
  }
}
const proxyModeManager = ProxyModeManager.getInstance();
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
      windows.forEach((window2) => {
        if (!window2.isDestroyed()) {
          window2.reload();
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
      windows.forEach((window2) => {
        if (!window2.isDestroyed() && !window2.webContents.isDestroyed()) {
          try {
            window2.webContents.send("app:crash", crashInfo);
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
class SystemMonitor {
  constructor() {
    this.updateInterval = null;
    this.isMonitoring = false;
    this.lastCpuUsage = 0;
    this.lastCpuTime = 0;
  }
  static getInstance() {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor();
    }
    return SystemMonitor.instance;
  }
  /**
   * 启动系统监控
   */
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }
    this.isMonitoring = true;
    this.updateInterval = setInterval(() => {
      this.updateMetrics();
    }, 2e3);
    console.log("系统监控已启动");
  }
  /**
   * 停止系统监控
   */
  stopMonitoring() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isMonitoring = false;
    console.log("系统监控已停止");
  }
  /**
   * 获取当前系统指标
   */
  async getSystemMetrics() {
    const cpuUsage = await this.getCpuUsage();
    const memoryUsage = this.getMemoryUsage();
    const systemProxy = await this.getSystemProxyStatus();
    const metrics = {
      cpuUsage,
      memoryUsage,
      systemProxyEnabled: systemProxy.enabled,
      timestamp: Date.now()
    };
    if (systemProxy.host !== void 0) {
      metrics.systemProxyHost = systemProxy.host;
    }
    if (systemProxy.port !== void 0) {
      metrics.systemProxyPort = systemProxy.port;
    }
    return metrics;
  }
  /**
   * 获取CPU使用率
   */
  async getCpuUsage() {
    try {
      const cpus = os__namespace.cpus();
      if (!cpus || cpus.length === 0) {
        return 0;
      }
      let totalIdle = 0;
      let totalTick = 0;
      cpus.forEach((cpu) => {
        for (const type2 in cpu.times) {
          totalTick += cpu.times[type2];
        }
        totalIdle += cpu.times.idle;
      });
      if (this.lastCpuTime > 0) {
        const idle = totalIdle - this.lastCpuUsage;
        const total = totalTick - this.lastCpuTime;
        const usage = 100 - 100 * idle / total;
        this.lastCpuUsage = totalIdle;
        this.lastCpuTime = totalTick;
        return Math.round(usage * 100) / 100;
      } else {
        this.lastCpuUsage = totalIdle;
        this.lastCpuTime = totalTick;
        return 0;
      }
    } catch (error) {
      console.error("获取CPU使用率失败:", error);
      return 0;
    }
  }
  /**
   * 获取内存使用率
   */
  getMemoryUsage() {
    try {
      const totalMem = os__namespace.totalmem();
      const freeMem = os__namespace.freemem();
      const usedMem = totalMem - freeMem;
      const usage = usedMem / totalMem * 100;
      return Math.round(usage * 100) / 100;
    } catch (error) {
      console.error("获取内存使用率失败:", error);
      return 0;
    }
  }
  /**
   * 获取系统代理状态
   */
  async getSystemProxyStatus() {
    try {
      switch (process.platform) {
        case "darwin":
          return await this.getMacOSProxyStatus();
        case "win32":
          return await this.getWindowsProxyStatus();
        case "linux":
          return await this.getLinuxProxyStatus();
        default:
          return { enabled: false };
      }
    } catch (error) {
      console.error("获取系统代理状态失败:", error);
      return { enabled: false };
    }
  }
  /**
   * macOS系统代理状态检测
   */
  async getMacOSProxyStatus() {
    try {
      const { exec } = require("child_process");
      const { promisify } = require("util");
      const execAsync2 = promisify(exec);
      const httpResult = await execAsync2('networksetup -getwebproxy "Wi-Fi"');
      const httpEnabled = httpResult.stdout.includes("Enabled: Yes");
      if (httpEnabled) {
        const hostMatch = httpResult.stdout.match(/Server: (.+)/);
        const portMatch = httpResult.stdout.match(/Port: (\d+)/);
        const result = {
          enabled: true
        };
        if (hostMatch) {
          result.host = hostMatch[1];
        }
        if (portMatch) {
          result.port = parseInt(portMatch[1]);
        }
        return result;
      }
      const socksResult = await execAsync2('networksetup -getsocksfirewallproxy "Wi-Fi"');
      const socksEnabled = socksResult.stdout.includes("Enabled: Yes");
      if (socksEnabled) {
        const hostMatch = socksResult.stdout.match(/Server: (.+)/);
        const portMatch = socksResult.stdout.match(/Port: (\d+)/);
        const result = {
          enabled: true
        };
        if (hostMatch) {
          result.host = hostMatch[1];
        }
        if (portMatch) {
          result.port = parseInt(portMatch[1]);
        }
        return result;
      }
      return { enabled: false };
    } catch (error) {
      console.error("获取macOS代理状态失败:", error);
      return { enabled: false };
    }
  }
  /**
   * Windows系统代理状态检测
   */
  async getWindowsProxyStatus() {
    try {
      const { exec } = require("child_process");
      const { promisify } = require("util");
      const execAsync2 = promisify(exec);
      const result = await execAsync2('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable');
      const enabled = result.stdout.includes("0x1");
      if (enabled) {
        const serverResult = await execAsync2('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer');
        const serverMatch = serverResult.stdout.match(/ProxyServer\s+REG_SZ\s+(.+)/);
        if (serverMatch) {
          const [host, port] = serverMatch[1].split(":");
          const result2 = {
            enabled: true,
            host
          };
          if (port) {
            result2.port = parseInt(port);
          }
          return result2;
        }
      }
      return { enabled: false };
    } catch (error) {
      console.error("获取Windows代理状态失败:", error);
      return { enabled: false };
    }
  }
  /**
   * Linux系统代理状态检测
   */
  async getLinuxProxyStatus() {
    try {
      const httpProxy = process.env["HTTP_PROXY"] || process.env["http_proxy"];
      const httpsProxy = process.env["HTTPS_PROXY"] || process.env["https_proxy"];
      if (httpProxy || httpsProxy) {
        const proxyUrl = httpProxy || httpsProxy;
        if (proxyUrl) {
          const url2 = new URL(proxyUrl);
          return {
            enabled: true,
            host: url2.hostname,
            port: parseInt(url2.port)
          };
        }
      }
      return { enabled: false };
    } catch (error) {
      console.error("获取Linux代理状态失败:", error);
      return { enabled: false };
    }
  }
  /**
   * 更新指标并通知渲染进程
   */
  async updateMetrics() {
    try {
      const metrics = await this.getSystemMetrics();
      const windows = electron.BrowserWindow.getAllWindows();
      windows.forEach((window2) => {
        if (!window2.isDestroyed()) {
          window2.webContents.send("system:metrics-updated", metrics);
        }
      });
    } catch (error) {
      console.error("更新系统指标失败:", error);
    }
  }
  /**
   * 注册IPC处理器
   */
  registerIpcHandlers() {
    electron.ipcMain.handle("system:get-metrics", async () => {
      return await this.getSystemMetrics();
    });
    electron.ipcMain.handle("system:start-monitoring", () => {
      this.startMonitoring();
      return { success: true };
    });
    electron.ipcMain.handle("system:stop-monitoring", () => {
      this.stopMonitoring();
      return { success: true };
    });
  }
}
const systemMonitor = SystemMonitor.getInstance();
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var packet = { exports: {} };
function BufferReader$1(buffer, offset) {
  this.buffer = buffer;
  this.offset = offset || 0;
  return this;
}
BufferReader$1.read = function(buffer, offset, length) {
  let a = [];
  let c = Math.ceil(length / 8);
  let l = Math.floor(offset / 8);
  const m = offset % 8;
  function t(n) {
    const r = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 7; i >= 0; i--) {
      r[7 - i] = n & Math.pow(2, i) ? 1 : 0;
    }
    a = a.concat(r);
  }
  function p(a2) {
    let n = 0;
    const f = a2.length - 1;
    for (let i = f; i >= 0; i--) {
      if (a2[f - i]) n += Math.pow(2, i);
    }
    return n;
  }
  while (c--) t(buffer.readUInt8(l++));
  return p(a.slice(m, m + length));
};
BufferReader$1.prototype.read = function(size) {
  const val = BufferReader$1.read(this.buffer, this.offset, size);
  this.offset += size;
  return val;
};
var reader = BufferReader$1;
function BufferWriter$1() {
  this.buffer = [];
}
BufferWriter$1.prototype.write = function(d, size) {
  for (let i = 0; i < size; i++) {
    this.buffer.push(d & Math.pow(2, size - i - 1) ? 1 : 0);
  }
};
BufferWriter$1.prototype.writeBuffer = function(b) {
  this.buffer = this.buffer.concat(b.buffer);
};
BufferWriter$1.prototype.toBuffer = function() {
  const arr = [];
  for (let i = 0; i < this.buffer.length; i += 8) {
    const chunk = this.buffer.slice(i, i + 8);
    arr.push(parseInt(chunk.join(""), 2));
  }
  return Buffer.from(arr);
};
var writer = BufferWriter$1;
const { debuglog: debuglog$2 } = require$$1$1;
const BufferReader = reader;
const BufferWriter = writer;
const debug$4 = debuglog$2("dns2");
const toIPv6 = (buffer) => buffer.map((part) => part > 0 ? part.toString(16) : "0").join(":").replace(/\b(?:0+:){1,}/, ":");
const fromIPv6 = (address) => {
  const digits = address.split(":");
  if (digits[0] === "") {
    digits.shift();
  }
  if (digits[digits.length - 1] === "") {
    digits.pop();
  }
  const missingFields = 8 - digits.length + 1;
  return digits.flatMap((digit) => {
    if (digit === "") {
      return Array(missingFields).fill("0");
    }
    return digit.padStart(4, "0");
  });
};
function Packet$6(data) {
  this.header = {};
  this.questions = [];
  this.answers = [];
  this.authorities = [];
  this.additionals = [];
  if (data instanceof Packet$6) {
    return data;
  } else if (data instanceof Packet$6.Header) {
    this.header = data;
  } else if (data instanceof Packet$6.Question) {
    this.questions.push(data);
  } else if (data instanceof Packet$6.Resource) {
    this.answers.push(data);
  } else if (typeof data === "string") {
    this.questions.push(data);
  } else if (typeof data === "object") {
    const type2 = {}.toString.call(data).match(/\[object (\w+)\]/)[1];
    if (type2 === "Array") {
      this.questions = data;
    }
    if (type2 === "Object") {
      this.header = data;
    }
  }
  return this;
}
Packet$6.TYPE = {
  A: 1,
  NS: 2,
  MD: 3,
  MF: 4,
  CNAME: 5,
  SOA: 6,
  MB: 7,
  MG: 8,
  MR: 9,
  NULL: 10,
  WKS: 11,
  PTR: 12,
  HINFO: 13,
  MINFO: 14,
  MX: 15,
  TXT: 16,
  AAAA: 28,
  SRV: 33,
  EDNS: 41,
  SPF: 99,
  AXFR: 252,
  MAILB: 253,
  MAILA: 254,
  ANY: 255,
  CAA: 257
};
Packet$6.CLASS = {
  IN: 1,
  CS: 2,
  CH: 3,
  HS: 4,
  ANY: 255
};
Packet$6.EDNS_OPTION_CODE = {
  ECS: 8
};
Packet$6.uuid = function() {
  return Math.floor(Math.random() * 1e5);
};
Packet$6.parse = function(buffer) {
  const packet2 = new Packet$6();
  const reader2 = new Packet$6.Reader(buffer);
  packet2.header = Packet$6.Header.parse(reader2);
  [
    // props             parser              count
    ["questions", Packet$6.Question, packet2.header.qdcount],
    ["answers", Packet$6.Resource, packet2.header.ancount],
    ["authorities", Packet$6.Resource, packet2.header.nscount],
    ["additionals", Packet$6.Resource, packet2.header.arcount]
  ].forEach(function(def) {
    const section = def[0];
    const decoder = def[1];
    let count = def[2];
    while (count--) {
      try {
        packet2[section] = packet2[section] || [];
        packet2[section].push(decoder.parse(reader2));
      } catch (e) {
        debug$4("node-dns > parse %s error:", section, e.message);
      }
    }
  });
  return packet2;
};
Object.defineProperty(Packet$6.prototype, "recursive", {
  enumerable: true,
  configurable: true,
  get() {
    return !!this.header.rd;
  },
  set(yn) {
    this.header.rd = +yn;
    return this.header.rd;
  }
});
Packet$6.prototype.toBuffer = function(writer2) {
  writer2 = writer2 || new Packet$6.Writer();
  this.header.qdcount = this.questions.length;
  this.header.ancount = this.answers.length;
  this.header.nscount = this.authorities.length;
  this.header.arcount = this.additionals.length;
  if (!(this instanceof Packet$6.Header)) {
    this.header = new Packet$6.Header(this.header);
  }
  this.header.toBuffer(writer2);
  [
    // section          encoder
    ["questions", Packet$6.Question],
    ["answers", Packet$6.Resource],
    ["authorities", Packet$6.Resource],
    ["additionals", Packet$6.Resource]
  ].forEach((function(def) {
    const section = def[0];
    const Encoder = def[1];
    (this[section] || []).map(function(resource) {
      return Encoder.encode(resource, writer2);
    });
  }).bind(this));
  return writer2.toBuffer();
};
Packet$6.Header = function(header) {
  this.id = 0;
  this.qr = 0;
  this.opcode = 0;
  this.aa = 0;
  this.tc = 0;
  this.rd = 0;
  this.ra = 0;
  this.z = 0;
  this.rcode = 0;
  this.qdcount = 0;
  this.nscount = 0;
  this.arcount = 0;
  for (const k in header) {
    this[k] = header[k];
  }
  return this;
};
Packet$6.Header.parse = function(reader2) {
  const header = new Packet$6.Header();
  if (reader2 instanceof Buffer) {
    reader2 = new Packet$6.Reader(reader2);
  }
  header.id = reader2.read(16);
  header.qr = reader2.read(1);
  header.opcode = reader2.read(4);
  header.aa = reader2.read(1);
  header.tc = reader2.read(1);
  header.rd = reader2.read(1);
  header.ra = reader2.read(1);
  header.z = reader2.read(3);
  header.rcode = reader2.read(4);
  header.qdcount = reader2.read(16);
  header.ancount = reader2.read(16);
  header.nscount = reader2.read(16);
  header.arcount = reader2.read(16);
  return header;
};
Packet$6.Header.prototype.toBuffer = function(writer2) {
  writer2 = writer2 || new Packet$6.Writer();
  writer2.write(this.id, 16);
  writer2.write(this.qr, 1);
  writer2.write(this.opcode, 4);
  writer2.write(this.aa, 1);
  writer2.write(this.tc, 1);
  writer2.write(this.rd, 1);
  writer2.write(this.ra, 1);
  writer2.write(this.z, 3);
  writer2.write(this.rcode, 4);
  writer2.write(this.qdcount, 16);
  writer2.write(this.ancount, 16);
  writer2.write(this.nscount, 16);
  writer2.write(this.arcount, 16);
  return writer2.toBuffer();
};
Packet$6.Question = function(name, type2, cls) {
  const defaults2 = {
    type: Packet$6.TYPE.ANY,
    class: Packet$6.CLASS.ANY
  };
  if (typeof name === "object") {
    for (const k in name) {
      this[k] = name[k] || defaults2[k];
    }
  } else {
    this.name = name;
    this.type = type2 || defaults2.type;
    this.class = cls || defaults2.class;
  }
  return this;
};
Packet$6.Question.prototype.toBuffer = function(writer2) {
  return Packet$6.Question.encode(this, writer2);
};
Packet$6.Question.parse = Packet$6.Question.decode = function(reader2) {
  const question = new Packet$6.Question();
  if (reader2 instanceof Buffer) {
    reader2 = new Packet$6.Reader(reader2);
  }
  question.name = Packet$6.Name.decode(reader2);
  question.type = reader2.read(16);
  question.class = reader2.read(16);
  return question;
};
Packet$6.Question.encode = function(question, writer2) {
  writer2 = writer2 || new Packet$6.Writer();
  Packet$6.Name.encode(question.name, writer2);
  writer2.write(question.type, 16);
  writer2.write(question.class, 16);
  return writer2.toBuffer();
};
Packet$6.Resource = function(name, type2, cls, ttl) {
  const defaults2 = {
    name: "",
    ttl: 300,
    type: Packet$6.TYPE.ANY,
    class: Packet$6.CLASS.ANY
  };
  let input;
  if (typeof name === "object") {
    input = name;
  } else {
    input = {
      name,
      type: type2,
      class: cls,
      ttl
    };
  }
  Object.assign(this, defaults2, input);
  return this;
};
Packet$6.Resource.prototype.toBuffer = function(writer2) {
  return Packet$6.Resource.encode(this, writer2);
};
Packet$6.Resource.encode = function(resource, writer2) {
  writer2 = writer2 || new Packet$6.Writer();
  Packet$6.Name.encode(resource.name, writer2);
  writer2.write(resource.type, 16);
  writer2.write(resource.class, 16);
  writer2.write(resource.ttl, 32);
  const encoder = Object.keys(Packet$6.TYPE).filter(function(type2) {
    return resource.type === Packet$6.TYPE[type2];
  })[0];
  if (encoder in Packet$6.Resource && Packet$6.Resource[encoder].encode) {
    return Packet$6.Resource[encoder].encode(resource, writer2);
  } else {
    debug$4("node-dns > unknown encoder %s(%j)", encoder, resource.type);
  }
};
Packet$6.Resource.parse = Packet$6.Resource.decode = function(reader2) {
  if (reader2 instanceof Buffer) {
    reader2 = new Packet$6.Reader(reader2);
  }
  let resource = new Packet$6.Resource();
  resource.name = Packet$6.Name.decode(reader2);
  resource.type = reader2.read(16);
  resource.class = reader2.read(16);
  resource.ttl = reader2.read(32);
  let length = reader2.read(16);
  const parser = Object.keys(Packet$6.TYPE).filter(function(type2) {
    return resource.type === Packet$6.TYPE[type2];
  })[0];
  if (parser in Packet$6.Resource) {
    resource = Packet$6.Resource[parser].decode.call(resource, reader2, length);
  } else {
    debug$4("node-dns > unknown parser type: %s(%j)", parser, resource.type);
    const arr = [];
    while (length--) arr.push(reader2.read(8));
    resource.data = Buffer.from(arr);
  }
  return resource;
};
Packet$6.Name = {
  COPY: 192,
  decode: function(reader2) {
    if (reader2 instanceof Buffer) {
      reader2 = new Packet$6.Reader(reader2);
    }
    const name = [];
    let o;
    let len = reader2.read(8);
    while (len) {
      if ((len & Packet$6.Name.COPY) === Packet$6.Name.COPY) {
        len -= Packet$6.Name.COPY;
        len = len << 8;
        const pos = len + reader2.read(8);
        if (!o) o = reader2.offset;
        reader2.offset = pos * 8;
        len = reader2.read(8);
        continue;
      } else {
        let part = "";
        while (len--) part += String.fromCharCode(reader2.read(8));
        name.push(part);
        len = reader2.read(8);
      }
    }
    if (o) reader2.offset = o;
    return name.join(".");
  },
  encode: function(domain, writer2) {
    writer2 = writer2 || new Packet$6.Writer();
    (domain || "").split(".").filter(function(part) {
      return !!part;
    }).forEach(function(part) {
      writer2.write(part.length, 8);
      part.split("").map(function(c) {
        writer2.write(c.charCodeAt(0), 8);
        return c.charCodeAt(0);
      });
    });
    writer2.write(0, 8);
    return writer2.toBuffer();
  }
};
Packet$6.Resource.A = function(address) {
  this.type = Packet$6.TYPE.A;
  this.class = Packet$6.CLASS.IN;
  this.address = address;
  return this;
};
Packet$6.Resource.A.encode = function(record, writer2) {
  writer2 = writer2 || new Packet$6.Writer();
  const parts = record.address.split(".");
  writer2.write(parts.length, 16);
  parts.forEach(function(part) {
    writer2.write(parseInt(part, 10), 8);
  });
  return writer2.toBuffer();
};
Packet$6.Resource.A.decode = function(reader2, length) {
  const parts = [];
  while (length--) parts.push(reader2.read(8));
  this.address = parts.join(".");
  return this;
};
Packet$6.Resource.MX = function(exchange, priority) {
  this.type = Packet$6.TYPE.MX;
  this.class = Packet$6.CLASS.IN;
  this.exchange = exchange;
  this.priority = priority;
  return this;
};
Packet$6.Resource.MX.encode = function(record, writer2) {
  writer2 = writer2 || new Packet$6.Writer();
  const len = Packet$6.Name.encode(record.exchange).length;
  writer2.write(len + 2, 16);
  writer2.write(record.priority, 16);
  Packet$6.Name.encode(record.exchange, writer2);
  return writer2.toBuffer();
};
Packet$6.Resource.MX.decode = function(reader2, length) {
  this.priority = reader2.read(16);
  this.exchange = Packet$6.Name.decode(reader2);
  return this;
};
Packet$6.Resource.AAAA = {
  decode: function(reader2, length) {
    const parts = [];
    while (length) {
      length -= 2;
      parts.push(reader2.read(16));
    }
    this.address = toIPv6(parts);
    return this;
  },
  encode: function(record, writer2) {
    writer2 = writer2 || new Packet$6.Writer();
    const parts = fromIPv6(record.address);
    writer2.write(parts.length * 2, 16);
    parts.forEach(function(part) {
      writer2.write(parseInt(part, 16), 16);
    });
    return writer2.toBuffer();
  }
};
Packet$6.Resource.NS = {
  decode: function(reader2, length) {
    this.ns = Packet$6.Name.decode(reader2);
    return this;
  },
  encode: function(record, writer2) {
    writer2 = writer2 || new Packet$6.Writer();
    writer2.write(Packet$6.Name.encode(record.ns).length, 16);
    Packet$6.Name.encode(record.ns, writer2);
    return writer2.toBuffer();
  }
};
Packet$6.Resource.PTR = Packet$6.Resource.CNAME = {
  decode: function(reader2, length) {
    this.domain = Packet$6.Name.decode(reader2);
    return this;
  },
  encode: function(record, writer2) {
    writer2 = writer2 || new Packet$6.Writer();
    writer2.write(Packet$6.Name.encode(record.domain).length, 16);
    Packet$6.Name.encode(record.domain, writer2);
    return writer2.toBuffer();
  }
};
Packet$6.Resource.SPF = Packet$6.Resource.TXT = {
  decode: function(reader2, length) {
    const parts = [];
    let bytesRead = 0;
    let chunkLength = 0;
    while (bytesRead < length) {
      chunkLength = reader2.read(8);
      bytesRead++;
      while (chunkLength--) {
        parts.push(reader2.read(8));
        bytesRead++;
      }
    }
    this.data = Buffer.from(parts).toString("utf8");
    return this;
  },
  encode: function(record, writer2) {
    writer2 = writer2 || new Packet$6.Writer();
    const characterStrings = Array.isArray(record.data) ? record.data : [record.data];
    const characterStringBuffers = characterStrings.map(function(characterString) {
      if (Buffer.isBuffer(characterString)) {
        return characterString;
      }
      if (typeof characterString === "string") {
        return Buffer.from(characterString, "utf8");
      }
      return false;
    }).filter(function(characterString) {
      return characterString;
    });
    const bufferLength = characterStringBuffers.reduce(function(sum, characterStringBuffer) {
      return sum + characterStringBuffer.length;
    }, 0);
    writer2.write(bufferLength + characterStringBuffers.length, 16);
    characterStringBuffers.forEach(function(buffer) {
      writer2.write(buffer.length, 8);
      buffer.forEach(function(c) {
        writer2.write(c, 8);
      });
    });
    return writer2.toBuffer();
  }
};
Packet$6.Resource.SOA = {
  decode: function(reader2, length) {
    this.primary = Packet$6.Name.decode(reader2);
    this.admin = Packet$6.Name.decode(reader2);
    this.serial = reader2.read(32);
    this.refresh = reader2.read(32);
    this.retry = reader2.read(32);
    this.expiration = reader2.read(32);
    this.minimum = reader2.read(32);
    return this;
  },
  encode: function(record, writer2) {
    writer2 = writer2 || new Packet$6.Writer();
    let len = 0;
    len += Packet$6.Name.encode(record.primary).length;
    len += Packet$6.Name.encode(record.admin).length;
    len += 32 * 5 / 8;
    writer2.write(len, 16);
    Packet$6.Name.encode(record.primary, writer2);
    Packet$6.Name.encode(record.admin, writer2);
    writer2.write(record.serial, 32);
    writer2.write(record.refresh, 32);
    writer2.write(record.retry, 32);
    writer2.write(record.expiration, 32);
    writer2.write(record.minimum, 32);
    return writer2.toBuffer();
  }
};
Packet$6.Resource.SRV = {
  decode: function(reader2, length) {
    this.priority = reader2.read(16);
    this.weight = reader2.read(16);
    this.port = reader2.read(16);
    this.target = Packet$6.Name.decode(reader2);
    return this;
  },
  encode: function(record, writer2) {
    writer2 = writer2 || new Packet$6.Writer();
    const { length } = Packet$6.Name.encode(record.target);
    writer2.write(length + 6, 16);
    writer2.write(record.priority, 16);
    writer2.write(record.weight, 16);
    writer2.write(record.port, 16);
    Packet$6.Name.encode(record.target, writer2);
    return writer2.toBuffer();
  }
};
Packet$6.Resource.EDNS = function(rdata) {
  return {
    type: Packet$6.TYPE.EDNS,
    class: 512,
    // Supported UDP Payload size
    ttl: 0,
    // Extended RCODE and flags
    rdata
    // Objects of type Packet.Resource.EDNS.*
  };
};
Packet$6.Resource.EDNS.decode = function(reader2, length) {
  this.type = Packet$6.TYPE.EDNS;
  this.class = 512;
  this.ttl = 0;
  this.rdata = [];
  while (length) {
    const optionCode = reader2.read(16);
    const optionLength = reader2.read(16);
    const decoder = Object.keys(Packet$6.EDNS_OPTION_CODE).filter(function(type2) {
      return optionCode === Packet$6.EDNS_OPTION_CODE[type2];
    })[0];
    if (decoder in Packet$6.Resource.EDNS && Packet$6.Resource.EDNS[decoder].decode) {
      const rdata = Packet$6.Resource.EDNS[decoder].decode(reader2, optionLength);
      this.rdata.push(rdata);
    } else {
      reader2.read(optionLength);
      debug$4("node-dns > unknown EDNS rdata decoder %s(%j)", decoder, optionCode);
    }
    length = length - 4 - optionLength;
  }
  return this;
};
Packet$6.Resource.EDNS.encode = function(record, writer2) {
  const rdataWriter = new Packet$6.Writer();
  for (const rdata of record.rdata) {
    const encoder = Object.keys(Packet$6.EDNS_OPTION_CODE).filter(function(type2) {
      return rdata.ednsCode === Packet$6.EDNS_OPTION_CODE[type2];
    })[0];
    if (encoder in Packet$6.Resource.EDNS && Packet$6.Resource.EDNS[encoder].encode) {
      const w = new Packet$6.Writer();
      Packet$6.Resource.EDNS[encoder].encode(rdata, w);
      rdataWriter.write(rdata.ednsCode, 16);
      rdataWriter.write(w.buffer.length / 8, 16);
      rdataWriter.writeBuffer(w);
    } else {
      debug$4("node-dns > unknown EDNS rdata encoder %s(%j)", encoder, rdata.ednsCode);
    }
  }
  writer2 = writer2 || new Packet$6.Writer();
  writer2.write(rdataWriter.buffer.length / 8, 16);
  writer2.writeBuffer(rdataWriter);
  return writer2.toBuffer();
};
Packet$6.Resource.EDNS.ECS = function(clientIp) {
  const [ip, prefixLength] = clientIp.split("/");
  const numPrefixLength = parseInt(prefixLength) || 32;
  return {
    ednsCode: Packet$6.EDNS_OPTION_CODE.ECS,
    family: 1,
    sourcePrefixLength: numPrefixLength,
    scopePrefixLength: 0,
    ip
  };
};
Packet$6.Resource.EDNS.ECS.decode = function(reader2, length) {
  const rdata = {};
  rdata.ednsCode = Packet$6.EDNS_OPTION_CODE.ECS;
  rdata.family = reader2.read(16);
  rdata.sourcePrefixLength = reader2.read(8);
  rdata.scopePrefixLength = reader2.read(8);
  length -= 4;
  if (rdata.family !== 1) {
    debug$4("node-dns > unimplemented address family");
    reader2.read(length * 8);
    return rdata;
  }
  const ipv4Octets = [];
  while (length--) {
    const octet = reader2.read(8);
    ipv4Octets.push(octet);
  }
  while (ipv4Octets.length < 4) {
    ipv4Octets.push(0);
  }
  rdata.ip = ipv4Octets.join(".");
  return rdata;
};
Packet$6.Resource.EDNS.ECS.encode = function(record, writer2) {
  const ip = record.ip.split(".").map((s) => parseInt(s));
  writer2.write(record.family, 16);
  writer2.write(record.sourcePrefixLength, 8);
  writer2.write(record.scopePrefixLength, 8);
  writer2.write(ip[0], 8);
  writer2.write(ip[1], 8);
  writer2.write(ip[2], 8);
  writer2.write(ip[3], 8);
};
Packet$6.Resource.CAA = {
  encode: function(record, writer2) {
    writer2 = writer2 || new Packet$6.Writer();
    const buffer = Buffer.from(record.tag + record.value, "utf8");
    writer2.write(2 + buffer.length, 16);
    writer2.write(record.flags, 8);
    writer2.write(record.tag.length, 8);
    buffer.forEach(function(c) {
      writer2.write(c, 8);
    });
    return writer2.toBuffer();
  }
};
Packet$6.Reader = BufferReader;
Packet$6.Writer = BufferWriter;
Packet$6.createResponseFromRequest = function(request) {
  const response = new Packet$6(request);
  response.header.qr = 1;
  response.additionals = [];
  return response;
};
Packet$6.createResourceFromQuestion = function(base, record) {
  const resource = new Packet$6.Resource(base);
  Object.assign(resource, record);
  return resource;
};
Packet$6.readStream = (socket) => {
  let chunks = [];
  let chunklen = 0;
  let received = false;
  let expected = false;
  return new Promise((resolve, reject) => {
    const processMessage = () => {
      if (received) return;
      received = true;
      const buffer = Buffer.concat(chunks, chunklen);
      resolve(buffer.slice(2));
    };
    socket.on("end", processMessage);
    socket.on("error", reject);
    socket.on("readable", () => {
      let chunk;
      while ((chunk = socket.read()) !== null) {
        chunks.push(chunk);
        chunklen += chunk.length;
      }
      if (!expected && chunklen >= 2) {
        if (chunks.length > 1) {
          chunks = [Buffer.concat(chunks, chunklen)];
        }
        expected = chunks[0].readUInt16BE(0);
      }
      if (chunklen >= 2 + expected) {
        processMessage();
      }
    });
  });
};
Packet$6.prototype.toBase64URL = function() {
  const buffer = this.toBuffer();
  const base64 = buffer.toString("base64");
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
};
packet.exports = Packet$6;
packet.exports.toIPv6 = toIPv6;
packet.exports.fromIPv6 = fromIPv6;
var packetExports = packet.exports;
const udp$1 = require$$0$2;
const Packet$5 = packetExports;
let Server$2 = class Server extends udp$1.Socket {
  constructor(options) {
    let type2 = "udp4";
    if (typeof options === "object") {
      type2 = options.type;
    }
    super(type2);
    if (typeof options === "function") {
      this.on("request", options);
    }
    this.on("message", this.handle.bind(this));
  }
  handle(data, rinfo) {
    try {
      const message = Packet$5.parse(data);
      this.emit("request", message, this.response.bind(this, rinfo), rinfo);
    } catch (e) {
      this.emit("requestError", e);
    }
  }
  response(rinfo, message) {
    if (message instanceof Packet$5) {
      message = message.toBuffer();
    }
    return new Promise((resolve, reject) => {
      this.send(message, rinfo.port, rinfo.address, (err) => {
        if (err) return reject(err);
        resolve(message);
      });
    });
  }
  listen(port, address) {
    return new Promise((resolve) => this.bind(port, address, resolve));
  }
};
var udp_1$1 = Server$2;
const tcp$1 = require$$0$1;
const Packet$4 = packetExports;
let Server$1 = class Server2 extends tcp$1.Server {
  constructor(options) {
    super();
    if (typeof options === "function") {
      this.on("request", options);
    }
    this.on("connection", this.handle.bind(this));
  }
  async handle(client) {
    try {
      const data = await Packet$4.readStream(client);
      const message = Packet$4.parse(data);
      this.emit("request", message, this.response.bind(this, client), client);
    } catch (e) {
      this.emit("requestError", e);
      client.destroy();
    }
  }
  response(client, message) {
    if (message instanceof Packet$4) {
      message = message.toBuffer();
    }
    const len = Buffer.alloc(2);
    len.writeUInt16BE(message.length);
    client.end(Buffer.concat([len, message]));
  }
};
var tcp_1$1 = Server$1;
const http$2 = require$$0$4;
const https$3 = require$$1;
const { URL: URL$2 } = require$$0$3;
const Packet$3 = packetExports;
const EventEmitter$2 = require$$4;
const { debuglog: debuglog$1 } = require$$1$1;
const debug$3 = debuglog$1("dns2-server");
const decodeBase64URL = (str) => {
  let queryData = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = queryData.length % 4;
  if (pad === 1) return;
  if (pad) {
    queryData += new Array(5 - pad).join("=");
  }
  return queryData;
};
const readStream$3 = (stream2) => new Promise((resolve, reject) => {
  let buffer = "";
  stream2.on("error", reject).on("data", (chunk) => {
    buffer += chunk;
  }).on("end", () => resolve(buffer));
});
class Server3 extends EventEmitter$2 {
  constructor(options) {
    super();
    const { ssl } = Object.assign(this, { cors: true }, options);
    this.server = (ssl ? https$3.createServer(options) : http$2.createServer()).on("request", this.handleRequest.bind(this)).on("listening", () => this.emit("listening", this.address())).on("error", (error) => this.emit("error", error)).on("close", () => {
      this.server.removeAllListeners();
      this.emit("close");
    });
    return this;
  }
  async handleRequest(client, res) {
    try {
      const { method, url: url2, headers } = client;
      const { pathname, searchParams: query } = new URL$2(url2, "http://unused/");
      const { cors } = this;
      if (cors === true) {
        res.setHeader("Access-Control-Allow-Origin", "*");
      } else if (typeof cors === "string") {
        res.setHeader("Access-Control-Allow-Origin", cors);
        res.setHeader("Vary", "Origin");
      } else if (typeof cors === "function") {
        const isAllowed = cors(headers.origin);
        res.setHeader("Access-Control-Allow-Origin", isAllowed ? headers.origin : "false");
        res.setHeader("Vary", "Origin");
      }
      debug$3("request", method, url2);
      if (method !== "GET" && method !== "POST") {
        res.writeHead(405, { "Content-Type": "text/plain" });
        res.write("405 Method not allowed\n");
        res.end();
        return;
      }
      if (pathname !== "/dns-query") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.write("404 Not Found\n");
        res.end();
        return;
      }
      const contentType = headers.accept;
      if (contentType !== "application/dns-message") {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.write("400 Bad Request: Illegal content type\n");
        res.end();
        return;
      }
      let queryData;
      if (method === "GET") {
        const dns3 = query.get("dns");
        if (!dns3) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.write("400 Bad Request: No query defined\n");
          res.end();
          return;
        }
        const base64 = decodeBase64URL(dns3);
        if (!base64) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.write("400 Bad Request: Invalid query data\n");
          res.end();
          return;
        }
        queryData = Buffer.from(base64, "base64");
      } else if (method === "POST") {
        queryData = await readStream$3(client);
      }
      const message = Packet$3.parse(queryData);
      this.emit("request", message, this.response.bind(this, res), client);
    } catch (e) {
      this.emit("requestError", e);
      res.destroy();
    }
  }
  /**
   * Send of the response to the client
   * @param {*} res
   * @param {*} message
   */
  response(res, message) {
    debug$3("response");
    res.setHeader("Content-Type", "application/dns-message");
    res.writeHead(200);
    res.end(message.toBuffer());
  }
  /**
   * listen
   * @param {*} port
   * @returns
   */
  listen(port, address) {
    return this.server.listen(port || this.port, address);
  }
  address() {
    return this.server.address();
  }
  close() {
    return this.server.close();
  }
}
var doh$1 = Server3;
const EventEmitter$1 = require$$4;
const DOHServer$2 = doh$1;
const TCPServer$2 = tcp_1$1;
const UDPServer$2 = udp_1$1;
let DNSServer$1 = class DNSServer extends EventEmitter$1 {
  constructor(options = {}) {
    super();
    this.servers = {};
    if (options.doh) {
      this.servers.doh = new DOHServer$2(options.doh).on("error", (error) => this.emit("error", error, "doh"));
    }
    if (options.tcp) {
      this.servers.tcp = new TCPServer$2().on("error", (error) => this.emit("error", error, "tcp"));
    }
    if (options.udp) {
      this.servers.udp = new UDPServer$2(typeof options.udp === "object" ? options.udp : void 0).on("error", (error) => this.emit("error", error, "udp"));
    }
    const servers = Object.values(this.servers);
    this.closed = Promise.all(
      servers.map((server2) => new Promise((resolve) => server2.once("close", resolve)))
    ).then(() => {
      this.emit("close");
    });
    this.listening = Promise.all(
      servers.map((server2) => new Promise((resolve) => server2.once("listening", resolve)))
    ).then(() => {
      const addresses = this.addresses();
      this.emit("listening", addresses);
      return addresses;
    });
    const emitRequest = (request, send, client) => this.emit("request", request, send, client);
    const emitRequestError = (error) => this.emit("requestError", error);
    for (const server2 of servers) {
      server2.on("request", emitRequest);
      server2.on("requestError", emitRequestError);
    }
    if (options.handle) {
      this.on("request", options.handle.bind(options));
    }
  }
  addresses() {
    const addresses = {};
    const { udp: udp2, tcp: tcp2, doh: doh2 } = this.servers;
    if (udp2) {
      addresses.udp = udp2.address();
    }
    if (tcp2) {
      addresses.tcp = tcp2.address();
    }
    if (doh2) {
      addresses.doh = doh2.address();
    }
    return addresses;
  }
  listen(options = {}) {
    for (const serverType of Object.keys(this.servers)) {
      const server2 = this.servers[serverType];
      const serverOptions = options[serverType];
      if (serverOptions && serverOptions.port) {
        server2.listen(serverOptions.port, serverOptions.address);
      } else {
        server2.listen(serverOptions);
      }
    }
    return this.listening;
  }
  close() {
    const { doh: doh2, udp: udp2, tcp: tcp2 } = this.servers;
    if (udp2) {
      udp2.close();
    }
    if (tcp2) {
      tcp2.close();
    }
    if (doh2) {
      doh2.close();
    }
    return this.closed;
  }
};
var dns = DNSServer$1;
const UDPServer$1 = udp_1$1;
const TCPServer$1 = tcp_1$1;
const DOHServer$1 = doh$1;
const DNSServer2 = dns;
const createUDPServer$1 = (options) => {
  return new UDPServer$1(options);
};
const createTCPServer$1 = (options) => {
  return new TCPServer$1(options);
};
const createDOHServer$1 = (options) => {
  return new DOHServer$1(options);
};
const createServer$1 = (options) => {
  return new DNSServer2(options);
};
var server = {
  UDPServer: UDPServer$1,
  TCPServer: TCPServer$1,
  DOHServer: DOHServer$1,
  createTCPServer: createTCPServer$1,
  createUDPServer: createUDPServer$1,
  createDOHServer: createDOHServer$1,
  createServer: createServer$1
};
const tcp = require$$0$1;
const Packet$2 = packetExports;
var tcp_1 = ({ dns: dns3 = "1.1.1.1", port = 53 } = {}) => {
  return async (name, type2 = "A", cls = Packet$2.CLASS.IN, { clientIp, recursive = true } = {}) => {
    const packet2 = new Packet$2();
    if (recursive) {
      packet2.header.rd = 1;
    }
    if (clientIp) {
      packet2.additionals.push(Packet$2.Resource.EDNS([
        Packet$2.Resource.EDNS.ECS(clientIp)
      ]));
    }
    packet2.questions.push({
      name,
      class: cls,
      type: Packet$2.TYPE[type2]
    });
    const message = packet2.toBuffer();
    const len = Buffer.alloc(2);
    len.writeUInt16BE(message.length);
    const client = tcp.connect({ host: dns3, port });
    client.end(Buffer.concat([len, message]));
    const data = await Packet$2.readStream(client);
    if (!data.length) {
      throw new Error("Empty TCP response");
    }
    return Packet$2.parse(data);
  };
};
const Packet$1 = packetExports;
const defaultGet = (url2) => new Promise((resolve, reject) => {
  const headers = {
    accept: "application/dns-message"
  };
  const base = url2.startsWith("https") ? require$$1 : require$$0$4;
  const req = base.get(url2, { headers }, resolve);
  req.on("error", reject);
});
const readStream$2 = (stream2) => {
  const buffer = [];
  return new Promise((resolve, reject) => {
    stream2.on("error", reject).on("data", (chunk) => buffer.push(chunk)).on("end", () => resolve(Buffer.concat(buffer)));
  });
};
const DOHClient = ({ dns: dns3, http: http2, get: get2 = defaultGet } = {}) => {
  return (name, type2 = "A", cls = Packet$1.CLASS.IN, { clientIp, recursive = true } = {}) => {
    const packet2 = new Packet$1();
    if (recursive) {
      packet2.header.rd = 1;
    }
    if (clientIp) {
      packet2.additionals.push(Packet$1.Resource.EDNS([
        Packet$1.Resource.EDNS.ECS(clientIp)
      ]));
    }
    packet2.questions.push({
      name,
      class: cls,
      type: Packet$1.TYPE[type2]
    });
    const query = packet2.toBase64URL();
    return Promise.resolve(get2(`http${http2 ? "" : "s"}://${dns3}/dns-query?dns=${query}`)).then(readStream$2).then(Packet$1.parse);
  };
};
var doh = DOHClient;
const udp = require$$0$2;
const Packet = packetExports;
const { equal } = require$$2;
const { debuglog } = require$$1$1;
const debug$2 = debuglog("dns2");
var udp_1 = ({ dns: dns3 = "8.8.8.8", port = 53, socketType = "udp4" } = {}) => {
  return (name, type2 = "A", cls = Packet.CLASS.IN, { clientIp, recursive = true } = {}) => {
    const query = new Packet();
    query.header.id = Math.random() * 1e4 | 0;
    if (recursive) {
      query.header.rd = 1;
    }
    if (clientIp) {
      query.additionals.push(Packet.Resource.EDNS([
        Packet.Resource.EDNS.ECS(clientIp)
      ]));
    }
    query.questions.push({
      name,
      class: cls,
      type: Packet.TYPE[type2]
    });
    const client = new udp.Socket(socketType);
    return new Promise((resolve, reject) => {
      client.once("message", function onMessage(message) {
        client.close();
        const response = Packet.parse(message);
        equal(response.header.id, query.header.id);
        resolve(response);
      });
      debug$2("send", dns3, query.toBuffer());
      client.send(query.toBuffer(), port, dns3, (err) => err && reject(err));
    });
  };
};
const https$2 = require$$1;
const get$1 = (url2) => new Promise((resolve) => https$2.get(url2, resolve));
const readStream$1 = (stream2) => {
  const buffer = [];
  return new Promise((resolve, reject) => {
    stream2.on("error", reject).on("data", (chunk) => {
      buffer.push(chunk);
    }).on("end", () => resolve(Buffer.concat(buffer)));
  });
};
const GoogleClient = () => (name, type2 = "ANY") => {
  return Promise.resolve().then(() => get$1(`https://dns.google.com/resolve?name=${name}&type=${type2}`)).then(readStream$1).then(JSON.parse);
};
var google = GoogleClient;
const {
  TCPServer,
  UDPServer,
  DOHServer,
  createTCPServer,
  createUDPServer,
  createDOHServer,
  createServer
} = server;
const EventEmitter = require$$4;
class DNS extends EventEmitter {
  constructor(options) {
    super();
    Object.assign(this, {
      port: 53,
      retries: 3,
      timeout: 3,
      recursive: true,
      resolverProtocol: "UDP",
      nameServers: [
        "8.8.8.8",
        "114.114.114.114"
      ],
      rootServers: [
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j",
        "k",
        "l",
        "m"
      ].map((x) => `${x}.root-servers.net`)
    }, options);
  }
  /**
   * query
   * @param {*} questions
   */
  query(name, type2, cls, clientIp) {
    const { port, nameServers, recursive, resolverProtocol = "UDP" } = this;
    const createResolver = DNS[resolverProtocol + "Client"];
    return Promise.race(nameServers.map((address) => {
      const resolve = createResolver({ dns: address, port, recursive });
      return resolve(name, type2, cls, clientIp);
    }));
  }
  /**
   * resolve
   * @param {*} domain
   * @param {*} type
   * @param {*} cls
   */
  resolve(domain, type2 = "ANY", cls = DNS.Packet.CLASS.IN, clientIp = void 0) {
    return this.query(domain, type2, cls, clientIp);
  }
  resolveA(domain, clientIp) {
    return this.resolve(domain, "A", void 0, clientIp);
  }
  resolveAAAA(domain) {
    return this.resolve(domain, "AAAA");
  }
  resolveMX(domain) {
    return this.resolve(domain, "MX");
  }
  resolveCNAME(domain) {
    return this.resolve(domain, "CNAME");
  }
  resolvePTR(domain) {
    return this.resolve(domain, "PTR");
  }
}
DNS.TCPServer = TCPServer;
DNS.UDPServer = UDPServer;
DNS.DOHServer = DOHServer;
DNS.createUDPServer = createUDPServer;
DNS.createTCPServer = createTCPServer;
DNS.createDOHServer = createDOHServer;
DNS.createServer = createServer;
DNS.TCPClient = tcp_1;
DNS.DOHClient = doh;
DNS.UDPClient = udp_1;
DNS.GoogleClient = google;
DNS.Packet = packetExports;
var dns2 = DNS;
const Dns = /* @__PURE__ */ getDefaultExportFromCjs(dns2);
function bind$2(fn, thisArg) {
  return function wrap2() {
    return fn.apply(thisArg, arguments);
  };
}
const { toString } = Object.prototype;
const { getPrototypeOf } = Object;
const { iterator, toStringTag: toStringTag$1 } = Symbol;
const kindOf = /* @__PURE__ */ ((cache) => (thing) => {
  const str = toString.call(thing);
  return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(/* @__PURE__ */ Object.create(null));
const kindOfTest = (type2) => {
  type2 = type2.toLowerCase();
  return (thing) => kindOf(thing) === type2;
};
const typeOfTest = (type2) => (thing) => typeof thing === type2;
const { isArray } = Array;
const isUndefined = typeOfTest("undefined");
function isBuffer$1(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction$1(val.constructor.isBuffer) && val.constructor.isBuffer(val);
}
const isArrayBuffer = kindOfTest("ArrayBuffer");
function isArrayBufferView(val) {
  let result;
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
    result = ArrayBuffer.isView(val);
  } else {
    result = val && val.buffer && isArrayBuffer(val.buffer);
  }
  return result;
}
const isString$1 = typeOfTest("string");
const isFunction$1 = typeOfTest("function");
const isNumber = typeOfTest("number");
const isObject = (thing) => thing !== null && typeof thing === "object";
const isBoolean = (thing) => thing === true || thing === false;
const isPlainObject = (val) => {
  if (kindOf(val) !== "object") {
    return false;
  }
  const prototype2 = getPrototypeOf(val);
  return (prototype2 === null || prototype2 === Object.prototype || Object.getPrototypeOf(prototype2) === null) && !(toStringTag$1 in val) && !(iterator in val);
};
const isEmptyObject = (val) => {
  if (!isObject(val) || isBuffer$1(val)) {
    return false;
  }
  try {
    return Object.keys(val).length === 0 && Object.getPrototypeOf(val) === Object.prototype;
  } catch (e) {
    return false;
  }
};
const isDate = kindOfTest("Date");
const isFile = kindOfTest("File");
const isBlob = kindOfTest("Blob");
const isFileList = kindOfTest("FileList");
const isStream = (val) => isObject(val) && isFunction$1(val.pipe);
const isFormData = (thing) => {
  let kind;
  return thing && (typeof FormData === "function" && thing instanceof FormData || isFunction$1(thing.append) && ((kind = kindOf(thing)) === "formdata" || // detect form-data instance
  kind === "object" && isFunction$1(thing.toString) && thing.toString() === "[object FormData]"));
};
const isURLSearchParams = kindOfTest("URLSearchParams");
const [isReadableStream, isRequest, isResponse, isHeaders] = ["ReadableStream", "Request", "Response", "Headers"].map(kindOfTest);
const trim = (str) => str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
function forEach(obj, fn, { allOwnKeys = false } = {}) {
  if (obj === null || typeof obj === "undefined") {
    return;
  }
  let i;
  let l;
  if (typeof obj !== "object") {
    obj = [obj];
  }
  if (isArray(obj)) {
    for (i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    if (isBuffer$1(obj)) {
      return;
    }
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;
    for (i = 0; i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}
function findKey(obj, key) {
  if (isBuffer$1(obj)) {
    return null;
  }
  key = key.toLowerCase();
  const keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) {
      return _key;
    }
  }
  return null;
}
const _global = (() => {
  if (typeof globalThis !== "undefined") return globalThis;
  return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
})();
const isContextDefined = (context) => !isUndefined(context) && context !== _global;
function merge() {
  const { caseless } = isContextDefined(this) && this || {};
  const result = {};
  const assignValue = (val, key) => {
    const targetKey = caseless && findKey(result, key) || key;
    if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
      result[targetKey] = merge(result[targetKey], val);
    } else if (isPlainObject(val)) {
      result[targetKey] = merge({}, val);
    } else if (isArray(val)) {
      result[targetKey] = val.slice();
    } else {
      result[targetKey] = val;
    }
  };
  for (let i = 0, l = arguments.length; i < l; i++) {
    arguments[i] && forEach(arguments[i], assignValue);
  }
  return result;
}
const extend = (a, b, thisArg, { allOwnKeys } = {}) => {
  forEach(b, (val, key) => {
    if (thisArg && isFunction$1(val)) {
      a[key] = bind$2(val, thisArg);
    } else {
      a[key] = val;
    }
  }, { allOwnKeys });
  return a;
};
const stripBOM = (content) => {
  if (content.charCodeAt(0) === 65279) {
    content = content.slice(1);
  }
  return content;
};
const inherits = (constructor, superConstructor, props, descriptors2) => {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors2);
  constructor.prototype.constructor = constructor;
  Object.defineProperty(constructor, "super", {
    value: superConstructor.prototype
  });
  props && Object.assign(constructor.prototype, props);
};
const toFlatObject = (sourceObj, destObj, filter2, propFilter) => {
  let props;
  let i;
  let prop;
  const merged = {};
  destObj = destObj || {};
  if (sourceObj == null) return destObj;
  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = filter2 !== false && getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter2 || filter2(sourceObj, destObj)) && sourceObj !== Object.prototype);
  return destObj;
};
const endsWith = (str, searchString, position) => {
  str = String(str);
  if (position === void 0 || position > str.length) {
    position = str.length;
  }
  position -= searchString.length;
  const lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
};
const toArray = (thing) => {
  if (!thing) return null;
  if (isArray(thing)) return thing;
  let i = thing.length;
  if (!isNumber(i)) return null;
  const arr = new Array(i);
  while (i-- > 0) {
    arr[i] = thing[i];
  }
  return arr;
};
const isTypedArray = /* @__PURE__ */ ((TypedArray2) => {
  return (thing) => {
    return TypedArray2 && thing instanceof TypedArray2;
  };
})(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
const forEachEntry = (obj, fn) => {
  const generator = obj && obj[iterator];
  const _iterator = generator.call(obj);
  let result;
  while ((result = _iterator.next()) && !result.done) {
    const pair = result.value;
    fn.call(obj, pair[0], pair[1]);
  }
};
const matchAll = (regExp, str) => {
  let matches;
  const arr = [];
  while ((matches = regExp.exec(str)) !== null) {
    arr.push(matches);
  }
  return arr;
};
const isHTMLForm = kindOfTest("HTMLFormElement");
const toCamelCase = (str) => {
  return str.toLowerCase().replace(
    /[-_\s]([a-z\d])(\w*)/g,
    function replacer(m, p1, p2) {
      return p1.toUpperCase() + p2;
    }
  );
};
const hasOwnProperty = (({ hasOwnProperty: hasOwnProperty2 }) => (obj, prop) => hasOwnProperty2.call(obj, prop))(Object.prototype);
const isRegExp = kindOfTest("RegExp");
const reduceDescriptors = (obj, reducer) => {
  const descriptors2 = Object.getOwnPropertyDescriptors(obj);
  const reducedDescriptors = {};
  forEach(descriptors2, (descriptor, name) => {
    let ret;
    if ((ret = reducer(descriptor, name, obj)) !== false) {
      reducedDescriptors[name] = ret || descriptor;
    }
  });
  Object.defineProperties(obj, reducedDescriptors);
};
const freezeMethods = (obj) => {
  reduceDescriptors(obj, (descriptor, name) => {
    if (isFunction$1(obj) && ["arguments", "caller", "callee"].indexOf(name) !== -1) {
      return false;
    }
    const value = obj[name];
    if (!isFunction$1(value)) return;
    descriptor.enumerable = false;
    if ("writable" in descriptor) {
      descriptor.writable = false;
      return;
    }
    if (!descriptor.set) {
      descriptor.set = () => {
        throw Error("Can not rewrite read-only method '" + name + "'");
      };
    }
  });
};
const toObjectSet = (arrayOrString, delimiter) => {
  const obj = {};
  const define = (arr) => {
    arr.forEach((value) => {
      obj[value] = true;
    });
  };
  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
  return obj;
};
const noop$1 = () => {
};
const toFiniteNumber = (value, defaultValue) => {
  return value != null && Number.isFinite(value = +value) ? value : defaultValue;
};
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction$1(thing.append) && thing[toStringTag$1] === "FormData" && thing[iterator]);
}
const toJSONObject = (obj) => {
  const stack = new Array(10);
  const visit = (source, i) => {
    if (isObject(source)) {
      if (stack.indexOf(source) >= 0) {
        return;
      }
      if (isBuffer$1(source)) {
        return source;
      }
      if (!("toJSON" in source)) {
        stack[i] = source;
        const target = isArray(source) ? [] : {};
        forEach(source, (value, key) => {
          const reducedValue = visit(value, i + 1);
          !isUndefined(reducedValue) && (target[key] = reducedValue);
        });
        stack[i] = void 0;
        return target;
      }
    }
    return source;
  };
  return visit(obj, 0);
};
const isAsyncFn = kindOfTest("AsyncFunction");
const isThenable = (thing) => thing && (isObject(thing) || isFunction$1(thing)) && isFunction$1(thing.then) && isFunction$1(thing.catch);
const _setImmediate = ((setImmediateSupported, postMessageSupported) => {
  if (setImmediateSupported) {
    return setImmediate;
  }
  return postMessageSupported ? ((token, callbacks) => {
    _global.addEventListener("message", ({ source, data }) => {
      if (source === _global && data === token) {
        callbacks.length && callbacks.shift()();
      }
    }, false);
    return (cb) => {
      callbacks.push(cb);
      _global.postMessage(token, "*");
    };
  })(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
})(
  typeof setImmediate === "function",
  isFunction$1(_global.postMessage)
);
const asap = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(_global) : typeof process !== "undefined" && process.nextTick || _setImmediate;
const isIterable = (thing) => thing != null && isFunction$1(thing[iterator]);
const utils$1 = {
  isArray,
  isArrayBuffer,
  isBuffer: isBuffer$1,
  isFormData,
  isArrayBufferView,
  isString: isString$1,
  isNumber,
  isBoolean,
  isObject,
  isPlainObject,
  isEmptyObject,
  isReadableStream,
  isRequest,
  isResponse,
  isHeaders,
  isUndefined,
  isDate,
  isFile,
  isBlob,
  isRegExp,
  isFunction: isFunction$1,
  isStream,
  isURLSearchParams,
  isTypedArray,
  isFileList,
  forEach,
  merge,
  extend,
  trim,
  stripBOM,
  inherits,
  toFlatObject,
  kindOf,
  kindOfTest,
  endsWith,
  toArray,
  forEachEntry,
  matchAll,
  isHTMLForm,
  hasOwnProperty,
  hasOwnProp: hasOwnProperty,
  // an alias to avoid ESLint no-prototype-builtins detection
  reduceDescriptors,
  freezeMethods,
  toObjectSet,
  toCamelCase,
  noop: noop$1,
  toFiniteNumber,
  findKey,
  global: _global,
  isContextDefined,
  isSpecCompliantForm,
  toJSONObject,
  isAsyncFn,
  isThenable,
  setImmediate: _setImmediate,
  asap,
  isIterable
};
function AxiosError$1(message, code, config, request, response) {
  Error.call(this);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack;
  }
  this.message = message;
  this.name = "AxiosError";
  code && (this.code = code);
  config && (this.config = config);
  request && (this.request = request);
  if (response) {
    this.response = response;
    this.status = response.status ? response.status : null;
  }
}
utils$1.inherits(AxiosError$1, Error, {
  toJSON: function toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: utils$1.toJSONObject(this.config),
      code: this.code,
      status: this.status
    };
  }
});
const prototype$1 = AxiosError$1.prototype;
const descriptors = {};
[
  "ERR_BAD_OPTION_VALUE",
  "ERR_BAD_OPTION",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ERR_NETWORK",
  "ERR_FR_TOO_MANY_REDIRECTS",
  "ERR_DEPRECATED",
  "ERR_BAD_RESPONSE",
  "ERR_BAD_REQUEST",
  "ERR_CANCELED",
  "ERR_NOT_SUPPORT",
  "ERR_INVALID_URL"
  // eslint-disable-next-line func-names
].forEach((code) => {
  descriptors[code] = { value: code };
});
Object.defineProperties(AxiosError$1, descriptors);
Object.defineProperty(prototype$1, "isAxiosError", { value: true });
AxiosError$1.from = (error, code, config, request, response, customProps) => {
  const axiosError = Object.create(prototype$1);
  utils$1.toFlatObject(error, axiosError, function filter2(obj) {
    return obj !== Error.prototype;
  }, (prop) => {
    return prop !== "isAxiosError";
  });
  AxiosError$1.call(axiosError, error.message, code, config, request, response);
  axiosError.cause = error;
  axiosError.name = error.name;
  customProps && Object.assign(axiosError, customProps);
  return axiosError;
};
var Stream$2 = stream.Stream;
var util$2 = require$$1$1;
var delayed_stream = DelayedStream$1;
function DelayedStream$1() {
  this.source = null;
  this.dataSize = 0;
  this.maxDataSize = 1024 * 1024;
  this.pauseStream = true;
  this._maxDataSizeExceeded = false;
  this._released = false;
  this._bufferedEvents = [];
}
util$2.inherits(DelayedStream$1, Stream$2);
DelayedStream$1.create = function(source, options) {
  var delayedStream = new this();
  options = options || {};
  for (var option in options) {
    delayedStream[option] = options[option];
  }
  delayedStream.source = source;
  var realEmit = source.emit;
  source.emit = function() {
    delayedStream._handleEmit(arguments);
    return realEmit.apply(source, arguments);
  };
  source.on("error", function() {
  });
  if (delayedStream.pauseStream) {
    source.pause();
  }
  return delayedStream;
};
Object.defineProperty(DelayedStream$1.prototype, "readable", {
  configurable: true,
  enumerable: true,
  get: function() {
    return this.source.readable;
  }
});
DelayedStream$1.prototype.setEncoding = function() {
  return this.source.setEncoding.apply(this.source, arguments);
};
DelayedStream$1.prototype.resume = function() {
  if (!this._released) {
    this.release();
  }
  this.source.resume();
};
DelayedStream$1.prototype.pause = function() {
  this.source.pause();
};
DelayedStream$1.prototype.release = function() {
  this._released = true;
  this._bufferedEvents.forEach((function(args) {
    this.emit.apply(this, args);
  }).bind(this));
  this._bufferedEvents = [];
};
DelayedStream$1.prototype.pipe = function() {
  var r = Stream$2.prototype.pipe.apply(this, arguments);
  this.resume();
  return r;
};
DelayedStream$1.prototype._handleEmit = function(args) {
  if (this._released) {
    this.emit.apply(this, args);
    return;
  }
  if (args[0] === "data") {
    this.dataSize += args[1].length;
    this._checkIfMaxDataSizeExceeded();
  }
  this._bufferedEvents.push(args);
};
DelayedStream$1.prototype._checkIfMaxDataSizeExceeded = function() {
  if (this._maxDataSizeExceeded) {
    return;
  }
  if (this.dataSize <= this.maxDataSize) {
    return;
  }
  this._maxDataSizeExceeded = true;
  var message = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
  this.emit("error", new Error(message));
};
var util$1 = require$$1$1;
var Stream$1 = stream.Stream;
var DelayedStream = delayed_stream;
var combined_stream = CombinedStream$1;
function CombinedStream$1() {
  this.writable = false;
  this.readable = true;
  this.dataSize = 0;
  this.maxDataSize = 2 * 1024 * 1024;
  this.pauseStreams = true;
  this._released = false;
  this._streams = [];
  this._currentStream = null;
  this._insideLoop = false;
  this._pendingNext = false;
}
util$1.inherits(CombinedStream$1, Stream$1);
CombinedStream$1.create = function(options) {
  var combinedStream = new this();
  options = options || {};
  for (var option in options) {
    combinedStream[option] = options[option];
  }
  return combinedStream;
};
CombinedStream$1.isStreamLike = function(stream2) {
  return typeof stream2 !== "function" && typeof stream2 !== "string" && typeof stream2 !== "boolean" && typeof stream2 !== "number" && !Buffer.isBuffer(stream2);
};
CombinedStream$1.prototype.append = function(stream2) {
  var isStreamLike = CombinedStream$1.isStreamLike(stream2);
  if (isStreamLike) {
    if (!(stream2 instanceof DelayedStream)) {
      var newStream = DelayedStream.create(stream2, {
        maxDataSize: Infinity,
        pauseStream: this.pauseStreams
      });
      stream2.on("data", this._checkDataSize.bind(this));
      stream2 = newStream;
    }
    this._handleErrors(stream2);
    if (this.pauseStreams) {
      stream2.pause();
    }
  }
  this._streams.push(stream2);
  return this;
};
CombinedStream$1.prototype.pipe = function(dest, options) {
  Stream$1.prototype.pipe.call(this, dest, options);
  this.resume();
  return dest;
};
CombinedStream$1.prototype._getNext = function() {
  this._currentStream = null;
  if (this._insideLoop) {
    this._pendingNext = true;
    return;
  }
  this._insideLoop = true;
  try {
    do {
      this._pendingNext = false;
      this._realGetNext();
    } while (this._pendingNext);
  } finally {
    this._insideLoop = false;
  }
};
CombinedStream$1.prototype._realGetNext = function() {
  var stream2 = this._streams.shift();
  if (typeof stream2 == "undefined") {
    this.end();
    return;
  }
  if (typeof stream2 !== "function") {
    this._pipeNext(stream2);
    return;
  }
  var getStream = stream2;
  getStream((function(stream3) {
    var isStreamLike = CombinedStream$1.isStreamLike(stream3);
    if (isStreamLike) {
      stream3.on("data", this._checkDataSize.bind(this));
      this._handleErrors(stream3);
    }
    this._pipeNext(stream3);
  }).bind(this));
};
CombinedStream$1.prototype._pipeNext = function(stream2) {
  this._currentStream = stream2;
  var isStreamLike = CombinedStream$1.isStreamLike(stream2);
  if (isStreamLike) {
    stream2.on("end", this._getNext.bind(this));
    stream2.pipe(this, { end: false });
    return;
  }
  var value = stream2;
  this.write(value);
  this._getNext();
};
CombinedStream$1.prototype._handleErrors = function(stream2) {
  var self2 = this;
  stream2.on("error", function(err) {
    self2._emitError(err);
  });
};
CombinedStream$1.prototype.write = function(data) {
  this.emit("data", data);
};
CombinedStream$1.prototype.pause = function() {
  if (!this.pauseStreams) {
    return;
  }
  if (this.pauseStreams && this._currentStream && typeof this._currentStream.pause == "function") this._currentStream.pause();
  this.emit("pause");
};
CombinedStream$1.prototype.resume = function() {
  if (!this._released) {
    this._released = true;
    this.writable = true;
    this._getNext();
  }
  if (this.pauseStreams && this._currentStream && typeof this._currentStream.resume == "function") this._currentStream.resume();
  this.emit("resume");
};
CombinedStream$1.prototype.end = function() {
  this._reset();
  this.emit("end");
};
CombinedStream$1.prototype.destroy = function() {
  this._reset();
  this.emit("close");
};
CombinedStream$1.prototype._reset = function() {
  this.writable = false;
  this._streams = [];
  this._currentStream = null;
};
CombinedStream$1.prototype._checkDataSize = function() {
  this._updateDataSize();
  if (this.dataSize <= this.maxDataSize) {
    return;
  }
  var message = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
  this._emitError(new Error(message));
};
CombinedStream$1.prototype._updateDataSize = function() {
  this.dataSize = 0;
  var self2 = this;
  this._streams.forEach(function(stream2) {
    if (!stream2.dataSize) {
      return;
    }
    self2.dataSize += stream2.dataSize;
  });
  if (this._currentStream && this._currentStream.dataSize) {
    this.dataSize += this._currentStream.dataSize;
  }
};
CombinedStream$1.prototype._emitError = function(err) {
  this._reset();
  this.emit("error", err);
};
var mimeTypes = {};
const require$$0 = {
  "application/1d-interleaved-parityfec": {
    source: "iana"
  },
  "application/3gpdash-qoe-report+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/3gpp-ims+xml": {
    source: "iana",
    compressible: true
  },
  "application/3gpphal+json": {
    source: "iana",
    compressible: true
  },
  "application/3gpphalforms+json": {
    source: "iana",
    compressible: true
  },
  "application/a2l": {
    source: "iana"
  },
  "application/ace+cbor": {
    source: "iana"
  },
  "application/activemessage": {
    source: "iana"
  },
  "application/activity+json": {
    source: "iana",
    compressible: true
  },
  "application/alto-costmap+json": {
    source: "iana",
    compressible: true
  },
  "application/alto-costmapfilter+json": {
    source: "iana",
    compressible: true
  },
  "application/alto-directory+json": {
    source: "iana",
    compressible: true
  },
  "application/alto-endpointcost+json": {
    source: "iana",
    compressible: true
  },
  "application/alto-endpointcostparams+json": {
    source: "iana",
    compressible: true
  },
  "application/alto-endpointprop+json": {
    source: "iana",
    compressible: true
  },
  "application/alto-endpointpropparams+json": {
    source: "iana",
    compressible: true
  },
  "application/alto-error+json": {
    source: "iana",
    compressible: true
  },
  "application/alto-networkmap+json": {
    source: "iana",
    compressible: true
  },
  "application/alto-networkmapfilter+json": {
    source: "iana",
    compressible: true
  },
  "application/alto-updatestreamcontrol+json": {
    source: "iana",
    compressible: true
  },
  "application/alto-updatestreamparams+json": {
    source: "iana",
    compressible: true
  },
  "application/aml": {
    source: "iana"
  },
  "application/andrew-inset": {
    source: "iana",
    extensions: [
      "ez"
    ]
  },
  "application/applefile": {
    source: "iana"
  },
  "application/applixware": {
    source: "apache",
    extensions: [
      "aw"
    ]
  },
  "application/at+jwt": {
    source: "iana"
  },
  "application/atf": {
    source: "iana"
  },
  "application/atfx": {
    source: "iana"
  },
  "application/atom+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "atom"
    ]
  },
  "application/atomcat+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "atomcat"
    ]
  },
  "application/atomdeleted+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "atomdeleted"
    ]
  },
  "application/atomicmail": {
    source: "iana"
  },
  "application/atomsvc+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "atomsvc"
    ]
  },
  "application/atsc-dwd+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "dwd"
    ]
  },
  "application/atsc-dynamic-event-message": {
    source: "iana"
  },
  "application/atsc-held+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "held"
    ]
  },
  "application/atsc-rdt+json": {
    source: "iana",
    compressible: true
  },
  "application/atsc-rsat+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "rsat"
    ]
  },
  "application/atxml": {
    source: "iana"
  },
  "application/auth-policy+xml": {
    source: "iana",
    compressible: true
  },
  "application/bacnet-xdd+zip": {
    source: "iana",
    compressible: false
  },
  "application/batch-smtp": {
    source: "iana"
  },
  "application/bdoc": {
    compressible: false,
    extensions: [
      "bdoc"
    ]
  },
  "application/beep+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/calendar+json": {
    source: "iana",
    compressible: true
  },
  "application/calendar+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "xcs"
    ]
  },
  "application/call-completion": {
    source: "iana"
  },
  "application/cals-1840": {
    source: "iana"
  },
  "application/captive+json": {
    source: "iana",
    compressible: true
  },
  "application/cbor": {
    source: "iana"
  },
  "application/cbor-seq": {
    source: "iana"
  },
  "application/cccex": {
    source: "iana"
  },
  "application/ccmp+xml": {
    source: "iana",
    compressible: true
  },
  "application/ccxml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "ccxml"
    ]
  },
  "application/cdfx+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "cdfx"
    ]
  },
  "application/cdmi-capability": {
    source: "iana",
    extensions: [
      "cdmia"
    ]
  },
  "application/cdmi-container": {
    source: "iana",
    extensions: [
      "cdmic"
    ]
  },
  "application/cdmi-domain": {
    source: "iana",
    extensions: [
      "cdmid"
    ]
  },
  "application/cdmi-object": {
    source: "iana",
    extensions: [
      "cdmio"
    ]
  },
  "application/cdmi-queue": {
    source: "iana",
    extensions: [
      "cdmiq"
    ]
  },
  "application/cdni": {
    source: "iana"
  },
  "application/cea": {
    source: "iana"
  },
  "application/cea-2018+xml": {
    source: "iana",
    compressible: true
  },
  "application/cellml+xml": {
    source: "iana",
    compressible: true
  },
  "application/cfw": {
    source: "iana"
  },
  "application/city+json": {
    source: "iana",
    compressible: true
  },
  "application/clr": {
    source: "iana"
  },
  "application/clue+xml": {
    source: "iana",
    compressible: true
  },
  "application/clue_info+xml": {
    source: "iana",
    compressible: true
  },
  "application/cms": {
    source: "iana"
  },
  "application/cnrp+xml": {
    source: "iana",
    compressible: true
  },
  "application/coap-group+json": {
    source: "iana",
    compressible: true
  },
  "application/coap-payload": {
    source: "iana"
  },
  "application/commonground": {
    source: "iana"
  },
  "application/conference-info+xml": {
    source: "iana",
    compressible: true
  },
  "application/cose": {
    source: "iana"
  },
  "application/cose-key": {
    source: "iana"
  },
  "application/cose-key-set": {
    source: "iana"
  },
  "application/cpl+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "cpl"
    ]
  },
  "application/csrattrs": {
    source: "iana"
  },
  "application/csta+xml": {
    source: "iana",
    compressible: true
  },
  "application/cstadata+xml": {
    source: "iana",
    compressible: true
  },
  "application/csvm+json": {
    source: "iana",
    compressible: true
  },
  "application/cu-seeme": {
    source: "apache",
    extensions: [
      "cu"
    ]
  },
  "application/cwt": {
    source: "iana"
  },
  "application/cybercash": {
    source: "iana"
  },
  "application/dart": {
    compressible: true
  },
  "application/dash+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "mpd"
    ]
  },
  "application/dash-patch+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "mpp"
    ]
  },
  "application/dashdelta": {
    source: "iana"
  },
  "application/davmount+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "davmount"
    ]
  },
  "application/dca-rft": {
    source: "iana"
  },
  "application/dcd": {
    source: "iana"
  },
  "application/dec-dx": {
    source: "iana"
  },
  "application/dialog-info+xml": {
    source: "iana",
    compressible: true
  },
  "application/dicom": {
    source: "iana"
  },
  "application/dicom+json": {
    source: "iana",
    compressible: true
  },
  "application/dicom+xml": {
    source: "iana",
    compressible: true
  },
  "application/dii": {
    source: "iana"
  },
  "application/dit": {
    source: "iana"
  },
  "application/dns": {
    source: "iana"
  },
  "application/dns+json": {
    source: "iana",
    compressible: true
  },
  "application/dns-message": {
    source: "iana"
  },
  "application/docbook+xml": {
    source: "apache",
    compressible: true,
    extensions: [
      "dbk"
    ]
  },
  "application/dots+cbor": {
    source: "iana"
  },
  "application/dskpp+xml": {
    source: "iana",
    compressible: true
  },
  "application/dssc+der": {
    source: "iana",
    extensions: [
      "dssc"
    ]
  },
  "application/dssc+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "xdssc"
    ]
  },
  "application/dvcs": {
    source: "iana"
  },
  "application/ecmascript": {
    source: "iana",
    compressible: true,
    extensions: [
      "es",
      "ecma"
    ]
  },
  "application/edi-consent": {
    source: "iana"
  },
  "application/edi-x12": {
    source: "iana",
    compressible: false
  },
  "application/edifact": {
    source: "iana",
    compressible: false
  },
  "application/efi": {
    source: "iana"
  },
  "application/elm+json": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/elm+xml": {
    source: "iana",
    compressible: true
  },
  "application/emergencycalldata.cap+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/emergencycalldata.comment+xml": {
    source: "iana",
    compressible: true
  },
  "application/emergencycalldata.control+xml": {
    source: "iana",
    compressible: true
  },
  "application/emergencycalldata.deviceinfo+xml": {
    source: "iana",
    compressible: true
  },
  "application/emergencycalldata.ecall.msd": {
    source: "iana"
  },
  "application/emergencycalldata.providerinfo+xml": {
    source: "iana",
    compressible: true
  },
  "application/emergencycalldata.serviceinfo+xml": {
    source: "iana",
    compressible: true
  },
  "application/emergencycalldata.subscriberinfo+xml": {
    source: "iana",
    compressible: true
  },
  "application/emergencycalldata.veds+xml": {
    source: "iana",
    compressible: true
  },
  "application/emma+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "emma"
    ]
  },
  "application/emotionml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "emotionml"
    ]
  },
  "application/encaprtp": {
    source: "iana"
  },
  "application/epp+xml": {
    source: "iana",
    compressible: true
  },
  "application/epub+zip": {
    source: "iana",
    compressible: false,
    extensions: [
      "epub"
    ]
  },
  "application/eshop": {
    source: "iana"
  },
  "application/exi": {
    source: "iana",
    extensions: [
      "exi"
    ]
  },
  "application/expect-ct-report+json": {
    source: "iana",
    compressible: true
  },
  "application/express": {
    source: "iana",
    extensions: [
      "exp"
    ]
  },
  "application/fastinfoset": {
    source: "iana"
  },
  "application/fastsoap": {
    source: "iana"
  },
  "application/fdt+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "fdt"
    ]
  },
  "application/fhir+json": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/fhir+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/fido.trusted-apps+json": {
    compressible: true
  },
  "application/fits": {
    source: "iana"
  },
  "application/flexfec": {
    source: "iana"
  },
  "application/font-sfnt": {
    source: "iana"
  },
  "application/font-tdpfr": {
    source: "iana",
    extensions: [
      "pfr"
    ]
  },
  "application/font-woff": {
    source: "iana",
    compressible: false
  },
  "application/framework-attributes+xml": {
    source: "iana",
    compressible: true
  },
  "application/geo+json": {
    source: "iana",
    compressible: true,
    extensions: [
      "geojson"
    ]
  },
  "application/geo+json-seq": {
    source: "iana"
  },
  "application/geopackage+sqlite3": {
    source: "iana"
  },
  "application/geoxacml+xml": {
    source: "iana",
    compressible: true
  },
  "application/gltf-buffer": {
    source: "iana"
  },
  "application/gml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "gml"
    ]
  },
  "application/gpx+xml": {
    source: "apache",
    compressible: true,
    extensions: [
      "gpx"
    ]
  },
  "application/gxf": {
    source: "apache",
    extensions: [
      "gxf"
    ]
  },
  "application/gzip": {
    source: "iana",
    compressible: false,
    extensions: [
      "gz"
    ]
  },
  "application/h224": {
    source: "iana"
  },
  "application/held+xml": {
    source: "iana",
    compressible: true
  },
  "application/hjson": {
    extensions: [
      "hjson"
    ]
  },
  "application/http": {
    source: "iana"
  },
  "application/hyperstudio": {
    source: "iana",
    extensions: [
      "stk"
    ]
  },
  "application/ibe-key-request+xml": {
    source: "iana",
    compressible: true
  },
  "application/ibe-pkg-reply+xml": {
    source: "iana",
    compressible: true
  },
  "application/ibe-pp-data": {
    source: "iana"
  },
  "application/iges": {
    source: "iana"
  },
  "application/im-iscomposing+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/index": {
    source: "iana"
  },
  "application/index.cmd": {
    source: "iana"
  },
  "application/index.obj": {
    source: "iana"
  },
  "application/index.response": {
    source: "iana"
  },
  "application/index.vnd": {
    source: "iana"
  },
  "application/inkml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "ink",
      "inkml"
    ]
  },
  "application/iotp": {
    source: "iana"
  },
  "application/ipfix": {
    source: "iana",
    extensions: [
      "ipfix"
    ]
  },
  "application/ipp": {
    source: "iana"
  },
  "application/isup": {
    source: "iana"
  },
  "application/its+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "its"
    ]
  },
  "application/java-archive": {
    source: "apache",
    compressible: false,
    extensions: [
      "jar",
      "war",
      "ear"
    ]
  },
  "application/java-serialized-object": {
    source: "apache",
    compressible: false,
    extensions: [
      "ser"
    ]
  },
  "application/java-vm": {
    source: "apache",
    compressible: false,
    extensions: [
      "class"
    ]
  },
  "application/javascript": {
    source: "iana",
    charset: "UTF-8",
    compressible: true,
    extensions: [
      "js",
      "mjs"
    ]
  },
  "application/jf2feed+json": {
    source: "iana",
    compressible: true
  },
  "application/jose": {
    source: "iana"
  },
  "application/jose+json": {
    source: "iana",
    compressible: true
  },
  "application/jrd+json": {
    source: "iana",
    compressible: true
  },
  "application/jscalendar+json": {
    source: "iana",
    compressible: true
  },
  "application/json": {
    source: "iana",
    charset: "UTF-8",
    compressible: true,
    extensions: [
      "json",
      "map"
    ]
  },
  "application/json-patch+json": {
    source: "iana",
    compressible: true
  },
  "application/json-seq": {
    source: "iana"
  },
  "application/json5": {
    extensions: [
      "json5"
    ]
  },
  "application/jsonml+json": {
    source: "apache",
    compressible: true,
    extensions: [
      "jsonml"
    ]
  },
  "application/jwk+json": {
    source: "iana",
    compressible: true
  },
  "application/jwk-set+json": {
    source: "iana",
    compressible: true
  },
  "application/jwt": {
    source: "iana"
  },
  "application/kpml-request+xml": {
    source: "iana",
    compressible: true
  },
  "application/kpml-response+xml": {
    source: "iana",
    compressible: true
  },
  "application/ld+json": {
    source: "iana",
    compressible: true,
    extensions: [
      "jsonld"
    ]
  },
  "application/lgr+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "lgr"
    ]
  },
  "application/link-format": {
    source: "iana"
  },
  "application/load-control+xml": {
    source: "iana",
    compressible: true
  },
  "application/lost+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "lostxml"
    ]
  },
  "application/lostsync+xml": {
    source: "iana",
    compressible: true
  },
  "application/lpf+zip": {
    source: "iana",
    compressible: false
  },
  "application/lxf": {
    source: "iana"
  },
  "application/mac-binhex40": {
    source: "iana",
    extensions: [
      "hqx"
    ]
  },
  "application/mac-compactpro": {
    source: "apache",
    extensions: [
      "cpt"
    ]
  },
  "application/macwriteii": {
    source: "iana"
  },
  "application/mads+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "mads"
    ]
  },
  "application/manifest+json": {
    source: "iana",
    charset: "UTF-8",
    compressible: true,
    extensions: [
      "webmanifest"
    ]
  },
  "application/marc": {
    source: "iana",
    extensions: [
      "mrc"
    ]
  },
  "application/marcxml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "mrcx"
    ]
  },
  "application/mathematica": {
    source: "iana",
    extensions: [
      "ma",
      "nb",
      "mb"
    ]
  },
  "application/mathml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "mathml"
    ]
  },
  "application/mathml-content+xml": {
    source: "iana",
    compressible: true
  },
  "application/mathml-presentation+xml": {
    source: "iana",
    compressible: true
  },
  "application/mbms-associated-procedure-description+xml": {
    source: "iana",
    compressible: true
  },
  "application/mbms-deregister+xml": {
    source: "iana",
    compressible: true
  },
  "application/mbms-envelope+xml": {
    source: "iana",
    compressible: true
  },
  "application/mbms-msk+xml": {
    source: "iana",
    compressible: true
  },
  "application/mbms-msk-response+xml": {
    source: "iana",
    compressible: true
  },
  "application/mbms-protection-description+xml": {
    source: "iana",
    compressible: true
  },
  "application/mbms-reception-report+xml": {
    source: "iana",
    compressible: true
  },
  "application/mbms-register+xml": {
    source: "iana",
    compressible: true
  },
  "application/mbms-register-response+xml": {
    source: "iana",
    compressible: true
  },
  "application/mbms-schedule+xml": {
    source: "iana",
    compressible: true
  },
  "application/mbms-user-service-description+xml": {
    source: "iana",
    compressible: true
  },
  "application/mbox": {
    source: "iana",
    extensions: [
      "mbox"
    ]
  },
  "application/media-policy-dataset+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "mpf"
    ]
  },
  "application/media_control+xml": {
    source: "iana",
    compressible: true
  },
  "application/mediaservercontrol+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "mscml"
    ]
  },
  "application/merge-patch+json": {
    source: "iana",
    compressible: true
  },
  "application/metalink+xml": {
    source: "apache",
    compressible: true,
    extensions: [
      "metalink"
    ]
  },
  "application/metalink4+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "meta4"
    ]
  },
  "application/mets+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "mets"
    ]
  },
  "application/mf4": {
    source: "iana"
  },
  "application/mikey": {
    source: "iana"
  },
  "application/mipc": {
    source: "iana"
  },
  "application/missing-blocks+cbor-seq": {
    source: "iana"
  },
  "application/mmt-aei+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "maei"
    ]
  },
  "application/mmt-usd+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "musd"
    ]
  },
  "application/mods+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "mods"
    ]
  },
  "application/moss-keys": {
    source: "iana"
  },
  "application/moss-signature": {
    source: "iana"
  },
  "application/mosskey-data": {
    source: "iana"
  },
  "application/mosskey-request": {
    source: "iana"
  },
  "application/mp21": {
    source: "iana",
    extensions: [
      "m21",
      "mp21"
    ]
  },
  "application/mp4": {
    source: "iana",
    extensions: [
      "mp4s",
      "m4p"
    ]
  },
  "application/mpeg4-generic": {
    source: "iana"
  },
  "application/mpeg4-iod": {
    source: "iana"
  },
  "application/mpeg4-iod-xmt": {
    source: "iana"
  },
  "application/mrb-consumer+xml": {
    source: "iana",
    compressible: true
  },
  "application/mrb-publish+xml": {
    source: "iana",
    compressible: true
  },
  "application/msc-ivr+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/msc-mixer+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/msword": {
    source: "iana",
    compressible: false,
    extensions: [
      "doc",
      "dot"
    ]
  },
  "application/mud+json": {
    source: "iana",
    compressible: true
  },
  "application/multipart-core": {
    source: "iana"
  },
  "application/mxf": {
    source: "iana",
    extensions: [
      "mxf"
    ]
  },
  "application/n-quads": {
    source: "iana",
    extensions: [
      "nq"
    ]
  },
  "application/n-triples": {
    source: "iana",
    extensions: [
      "nt"
    ]
  },
  "application/nasdata": {
    source: "iana"
  },
  "application/news-checkgroups": {
    source: "iana",
    charset: "US-ASCII"
  },
  "application/news-groupinfo": {
    source: "iana",
    charset: "US-ASCII"
  },
  "application/news-transmission": {
    source: "iana"
  },
  "application/nlsml+xml": {
    source: "iana",
    compressible: true
  },
  "application/node": {
    source: "iana",
    extensions: [
      "cjs"
    ]
  },
  "application/nss": {
    source: "iana"
  },
  "application/oauth-authz-req+jwt": {
    source: "iana"
  },
  "application/oblivious-dns-message": {
    source: "iana"
  },
  "application/ocsp-request": {
    source: "iana"
  },
  "application/ocsp-response": {
    source: "iana"
  },
  "application/octet-stream": {
    source: "iana",
    compressible: false,
    extensions: [
      "bin",
      "dms",
      "lrf",
      "mar",
      "so",
      "dist",
      "distz",
      "pkg",
      "bpk",
      "dump",
      "elc",
      "deploy",
      "exe",
      "dll",
      "deb",
      "dmg",
      "iso",
      "img",
      "msi",
      "msp",
      "msm",
      "buffer"
    ]
  },
  "application/oda": {
    source: "iana",
    extensions: [
      "oda"
    ]
  },
  "application/odm+xml": {
    source: "iana",
    compressible: true
  },
  "application/odx": {
    source: "iana"
  },
  "application/oebps-package+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "opf"
    ]
  },
  "application/ogg": {
    source: "iana",
    compressible: false,
    extensions: [
      "ogx"
    ]
  },
  "application/omdoc+xml": {
    source: "apache",
    compressible: true,
    extensions: [
      "omdoc"
    ]
  },
  "application/onenote": {
    source: "apache",
    extensions: [
      "onetoc",
      "onetoc2",
      "onetmp",
      "onepkg"
    ]
  },
  "application/opc-nodeset+xml": {
    source: "iana",
    compressible: true
  },
  "application/oscore": {
    source: "iana"
  },
  "application/oxps": {
    source: "iana",
    extensions: [
      "oxps"
    ]
  },
  "application/p21": {
    source: "iana"
  },
  "application/p21+zip": {
    source: "iana",
    compressible: false
  },
  "application/p2p-overlay+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "relo"
    ]
  },
  "application/parityfec": {
    source: "iana"
  },
  "application/passport": {
    source: "iana"
  },
  "application/patch-ops-error+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "xer"
    ]
  },
  "application/pdf": {
    source: "iana",
    compressible: false,
    extensions: [
      "pdf"
    ]
  },
  "application/pdx": {
    source: "iana"
  },
  "application/pem-certificate-chain": {
    source: "iana"
  },
  "application/pgp-encrypted": {
    source: "iana",
    compressible: false,
    extensions: [
      "pgp"
    ]
  },
  "application/pgp-keys": {
    source: "iana",
    extensions: [
      "asc"
    ]
  },
  "application/pgp-signature": {
    source: "iana",
    extensions: [
      "asc",
      "sig"
    ]
  },
  "application/pics-rules": {
    source: "apache",
    extensions: [
      "prf"
    ]
  },
  "application/pidf+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/pidf-diff+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/pkcs10": {
    source: "iana",
    extensions: [
      "p10"
    ]
  },
  "application/pkcs12": {
    source: "iana"
  },
  "application/pkcs7-mime": {
    source: "iana",
    extensions: [
      "p7m",
      "p7c"
    ]
  },
  "application/pkcs7-signature": {
    source: "iana",
    extensions: [
      "p7s"
    ]
  },
  "application/pkcs8": {
    source: "iana",
    extensions: [
      "p8"
    ]
  },
  "application/pkcs8-encrypted": {
    source: "iana"
  },
  "application/pkix-attr-cert": {
    source: "iana",
    extensions: [
      "ac"
    ]
  },
  "application/pkix-cert": {
    source: "iana",
    extensions: [
      "cer"
    ]
  },
  "application/pkix-crl": {
    source: "iana",
    extensions: [
      "crl"
    ]
  },
  "application/pkix-pkipath": {
    source: "iana",
    extensions: [
      "pkipath"
    ]
  },
  "application/pkixcmp": {
    source: "iana",
    extensions: [
      "pki"
    ]
  },
  "application/pls+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "pls"
    ]
  },
  "application/poc-settings+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/postscript": {
    source: "iana",
    compressible: true,
    extensions: [
      "ai",
      "eps",
      "ps"
    ]
  },
  "application/ppsp-tracker+json": {
    source: "iana",
    compressible: true
  },
  "application/problem+json": {
    source: "iana",
    compressible: true
  },
  "application/problem+xml": {
    source: "iana",
    compressible: true
  },
  "application/provenance+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "provx"
    ]
  },
  "application/prs.alvestrand.titrax-sheet": {
    source: "iana"
  },
  "application/prs.cww": {
    source: "iana",
    extensions: [
      "cww"
    ]
  },
  "application/prs.cyn": {
    source: "iana",
    charset: "7-BIT"
  },
  "application/prs.hpub+zip": {
    source: "iana",
    compressible: false
  },
  "application/prs.nprend": {
    source: "iana"
  },
  "application/prs.plucker": {
    source: "iana"
  },
  "application/prs.rdf-xml-crypt": {
    source: "iana"
  },
  "application/prs.xsf+xml": {
    source: "iana",
    compressible: true
  },
  "application/pskc+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "pskcxml"
    ]
  },
  "application/pvd+json": {
    source: "iana",
    compressible: true
  },
  "application/qsig": {
    source: "iana"
  },
  "application/raml+yaml": {
    compressible: true,
    extensions: [
      "raml"
    ]
  },
  "application/raptorfec": {
    source: "iana"
  },
  "application/rdap+json": {
    source: "iana",
    compressible: true
  },
  "application/rdf+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "rdf",
      "owl"
    ]
  },
  "application/reginfo+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "rif"
    ]
  },
  "application/relax-ng-compact-syntax": {
    source: "iana",
    extensions: [
      "rnc"
    ]
  },
  "application/remote-printing": {
    source: "iana"
  },
  "application/reputon+json": {
    source: "iana",
    compressible: true
  },
  "application/resource-lists+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "rl"
    ]
  },
  "application/resource-lists-diff+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "rld"
    ]
  },
  "application/rfc+xml": {
    source: "iana",
    compressible: true
  },
  "application/riscos": {
    source: "iana"
  },
  "application/rlmi+xml": {
    source: "iana",
    compressible: true
  },
  "application/rls-services+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "rs"
    ]
  },
  "application/route-apd+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "rapd"
    ]
  },
  "application/route-s-tsid+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "sls"
    ]
  },
  "application/route-usd+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "rusd"
    ]
  },
  "application/rpki-ghostbusters": {
    source: "iana",
    extensions: [
      "gbr"
    ]
  },
  "application/rpki-manifest": {
    source: "iana",
    extensions: [
      "mft"
    ]
  },
  "application/rpki-publication": {
    source: "iana"
  },
  "application/rpki-roa": {
    source: "iana",
    extensions: [
      "roa"
    ]
  },
  "application/rpki-updown": {
    source: "iana"
  },
  "application/rsd+xml": {
    source: "apache",
    compressible: true,
    extensions: [
      "rsd"
    ]
  },
  "application/rss+xml": {
    source: "apache",
    compressible: true,
    extensions: [
      "rss"
    ]
  },
  "application/rtf": {
    source: "iana",
    compressible: true,
    extensions: [
      "rtf"
    ]
  },
  "application/rtploopback": {
    source: "iana"
  },
  "application/rtx": {
    source: "iana"
  },
  "application/samlassertion+xml": {
    source: "iana",
    compressible: true
  },
  "application/samlmetadata+xml": {
    source: "iana",
    compressible: true
  },
  "application/sarif+json": {
    source: "iana",
    compressible: true
  },
  "application/sarif-external-properties+json": {
    source: "iana",
    compressible: true
  },
  "application/sbe": {
    source: "iana"
  },
  "application/sbml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "sbml"
    ]
  },
  "application/scaip+xml": {
    source: "iana",
    compressible: true
  },
  "application/scim+json": {
    source: "iana",
    compressible: true
  },
  "application/scvp-cv-request": {
    source: "iana",
    extensions: [
      "scq"
    ]
  },
  "application/scvp-cv-response": {
    source: "iana",
    extensions: [
      "scs"
    ]
  },
  "application/scvp-vp-request": {
    source: "iana",
    extensions: [
      "spq"
    ]
  },
  "application/scvp-vp-response": {
    source: "iana",
    extensions: [
      "spp"
    ]
  },
  "application/sdp": {
    source: "iana",
    extensions: [
      "sdp"
    ]
  },
  "application/secevent+jwt": {
    source: "iana"
  },
  "application/senml+cbor": {
    source: "iana"
  },
  "application/senml+json": {
    source: "iana",
    compressible: true
  },
  "application/senml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "senmlx"
    ]
  },
  "application/senml-etch+cbor": {
    source: "iana"
  },
  "application/senml-etch+json": {
    source: "iana",
    compressible: true
  },
  "application/senml-exi": {
    source: "iana"
  },
  "application/sensml+cbor": {
    source: "iana"
  },
  "application/sensml+json": {
    source: "iana",
    compressible: true
  },
  "application/sensml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "sensmlx"
    ]
  },
  "application/sensml-exi": {
    source: "iana"
  },
  "application/sep+xml": {
    source: "iana",
    compressible: true
  },
  "application/sep-exi": {
    source: "iana"
  },
  "application/session-info": {
    source: "iana"
  },
  "application/set-payment": {
    source: "iana"
  },
  "application/set-payment-initiation": {
    source: "iana",
    extensions: [
      "setpay"
    ]
  },
  "application/set-registration": {
    source: "iana"
  },
  "application/set-registration-initiation": {
    source: "iana",
    extensions: [
      "setreg"
    ]
  },
  "application/sgml": {
    source: "iana"
  },
  "application/sgml-open-catalog": {
    source: "iana"
  },
  "application/shf+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "shf"
    ]
  },
  "application/sieve": {
    source: "iana",
    extensions: [
      "siv",
      "sieve"
    ]
  },
  "application/simple-filter+xml": {
    source: "iana",
    compressible: true
  },
  "application/simple-message-summary": {
    source: "iana"
  },
  "application/simplesymbolcontainer": {
    source: "iana"
  },
  "application/sipc": {
    source: "iana"
  },
  "application/slate": {
    source: "iana"
  },
  "application/smil": {
    source: "iana"
  },
  "application/smil+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "smi",
      "smil"
    ]
  },
  "application/smpte336m": {
    source: "iana"
  },
  "application/soap+fastinfoset": {
    source: "iana"
  },
  "application/soap+xml": {
    source: "iana",
    compressible: true
  },
  "application/sparql-query": {
    source: "iana",
    extensions: [
      "rq"
    ]
  },
  "application/sparql-results+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "srx"
    ]
  },
  "application/spdx+json": {
    source: "iana",
    compressible: true
  },
  "application/spirits-event+xml": {
    source: "iana",
    compressible: true
  },
  "application/sql": {
    source: "iana"
  },
  "application/srgs": {
    source: "iana",
    extensions: [
      "gram"
    ]
  },
  "application/srgs+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "grxml"
    ]
  },
  "application/sru+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "sru"
    ]
  },
  "application/ssdl+xml": {
    source: "apache",
    compressible: true,
    extensions: [
      "ssdl"
    ]
  },
  "application/ssml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "ssml"
    ]
  },
  "application/stix+json": {
    source: "iana",
    compressible: true
  },
  "application/swid+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "swidtag"
    ]
  },
  "application/tamp-apex-update": {
    source: "iana"
  },
  "application/tamp-apex-update-confirm": {
    source: "iana"
  },
  "application/tamp-community-update": {
    source: "iana"
  },
  "application/tamp-community-update-confirm": {
    source: "iana"
  },
  "application/tamp-error": {
    source: "iana"
  },
  "application/tamp-sequence-adjust": {
    source: "iana"
  },
  "application/tamp-sequence-adjust-confirm": {
    source: "iana"
  },
  "application/tamp-status-query": {
    source: "iana"
  },
  "application/tamp-status-response": {
    source: "iana"
  },
  "application/tamp-update": {
    source: "iana"
  },
  "application/tamp-update-confirm": {
    source: "iana"
  },
  "application/tar": {
    compressible: true
  },
  "application/taxii+json": {
    source: "iana",
    compressible: true
  },
  "application/td+json": {
    source: "iana",
    compressible: true
  },
  "application/tei+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "tei",
      "teicorpus"
    ]
  },
  "application/tetra_isi": {
    source: "iana"
  },
  "application/thraud+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "tfi"
    ]
  },
  "application/timestamp-query": {
    source: "iana"
  },
  "application/timestamp-reply": {
    source: "iana"
  },
  "application/timestamped-data": {
    source: "iana",
    extensions: [
      "tsd"
    ]
  },
  "application/tlsrpt+gzip": {
    source: "iana"
  },
  "application/tlsrpt+json": {
    source: "iana",
    compressible: true
  },
  "application/tnauthlist": {
    source: "iana"
  },
  "application/token-introspection+jwt": {
    source: "iana"
  },
  "application/toml": {
    compressible: true,
    extensions: [
      "toml"
    ]
  },
  "application/trickle-ice-sdpfrag": {
    source: "iana"
  },
  "application/trig": {
    source: "iana",
    extensions: [
      "trig"
    ]
  },
  "application/ttml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "ttml"
    ]
  },
  "application/tve-trigger": {
    source: "iana"
  },
  "application/tzif": {
    source: "iana"
  },
  "application/tzif-leap": {
    source: "iana"
  },
  "application/ubjson": {
    compressible: false,
    extensions: [
      "ubj"
    ]
  },
  "application/ulpfec": {
    source: "iana"
  },
  "application/urc-grpsheet+xml": {
    source: "iana",
    compressible: true
  },
  "application/urc-ressheet+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "rsheet"
    ]
  },
  "application/urc-targetdesc+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "td"
    ]
  },
  "application/urc-uisocketdesc+xml": {
    source: "iana",
    compressible: true
  },
  "application/vcard+json": {
    source: "iana",
    compressible: true
  },
  "application/vcard+xml": {
    source: "iana",
    compressible: true
  },
  "application/vemmi": {
    source: "iana"
  },
  "application/vividence.scriptfile": {
    source: "apache"
  },
  "application/vnd.1000minds.decision-model+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "1km"
    ]
  },
  "application/vnd.3gpp-prose+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp-prose-pc3ch+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp-v2x-local-service-information": {
    source: "iana"
  },
  "application/vnd.3gpp.5gnas": {
    source: "iana"
  },
  "application/vnd.3gpp.access-transfer-events+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.bsf+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.gmop+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.gtpc": {
    source: "iana"
  },
  "application/vnd.3gpp.interworking-data": {
    source: "iana"
  },
  "application/vnd.3gpp.lpp": {
    source: "iana"
  },
  "application/vnd.3gpp.mc-signalling-ear": {
    source: "iana"
  },
  "application/vnd.3gpp.mcdata-affiliation-command+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcdata-info+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcdata-payload": {
    source: "iana"
  },
  "application/vnd.3gpp.mcdata-service-config+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcdata-signalling": {
    source: "iana"
  },
  "application/vnd.3gpp.mcdata-ue-config+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcdata-user-profile+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcptt-affiliation-command+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcptt-floor-request+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcptt-info+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcptt-location-info+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcptt-mbms-usage-info+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcptt-service-config+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcptt-signed+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcptt-ue-config+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcptt-ue-init-config+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcptt-user-profile+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcvideo-affiliation-command+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcvideo-affiliation-info+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcvideo-info+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcvideo-location-info+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcvideo-mbms-usage-info+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcvideo-service-config+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcvideo-transmission-request+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcvideo-ue-config+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mcvideo-user-profile+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.mid-call+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.ngap": {
    source: "iana"
  },
  "application/vnd.3gpp.pfcp": {
    source: "iana"
  },
  "application/vnd.3gpp.pic-bw-large": {
    source: "iana",
    extensions: [
      "plb"
    ]
  },
  "application/vnd.3gpp.pic-bw-small": {
    source: "iana",
    extensions: [
      "psb"
    ]
  },
  "application/vnd.3gpp.pic-bw-var": {
    source: "iana",
    extensions: [
      "pvb"
    ]
  },
  "application/vnd.3gpp.s1ap": {
    source: "iana"
  },
  "application/vnd.3gpp.sms": {
    source: "iana"
  },
  "application/vnd.3gpp.sms+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.srvcc-ext+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.srvcc-info+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.state-and-event-info+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp.ussd+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp2.bcmcsinfo+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.3gpp2.sms": {
    source: "iana"
  },
  "application/vnd.3gpp2.tcap": {
    source: "iana",
    extensions: [
      "tcap"
    ]
  },
  "application/vnd.3lightssoftware.imagescal": {
    source: "iana"
  },
  "application/vnd.3m.post-it-notes": {
    source: "iana",
    extensions: [
      "pwn"
    ]
  },
  "application/vnd.accpac.simply.aso": {
    source: "iana",
    extensions: [
      "aso"
    ]
  },
  "application/vnd.accpac.simply.imp": {
    source: "iana",
    extensions: [
      "imp"
    ]
  },
  "application/vnd.acucobol": {
    source: "iana",
    extensions: [
      "acu"
    ]
  },
  "application/vnd.acucorp": {
    source: "iana",
    extensions: [
      "atc",
      "acutc"
    ]
  },
  "application/vnd.adobe.air-application-installer-package+zip": {
    source: "apache",
    compressible: false,
    extensions: [
      "air"
    ]
  },
  "application/vnd.adobe.flash.movie": {
    source: "iana"
  },
  "application/vnd.adobe.formscentral.fcdt": {
    source: "iana",
    extensions: [
      "fcdt"
    ]
  },
  "application/vnd.adobe.fxp": {
    source: "iana",
    extensions: [
      "fxp",
      "fxpl"
    ]
  },
  "application/vnd.adobe.partial-upload": {
    source: "iana"
  },
  "application/vnd.adobe.xdp+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "xdp"
    ]
  },
  "application/vnd.adobe.xfdf": {
    source: "iana",
    extensions: [
      "xfdf"
    ]
  },
  "application/vnd.aether.imp": {
    source: "iana"
  },
  "application/vnd.afpc.afplinedata": {
    source: "iana"
  },
  "application/vnd.afpc.afplinedata-pagedef": {
    source: "iana"
  },
  "application/vnd.afpc.cmoca-cmresource": {
    source: "iana"
  },
  "application/vnd.afpc.foca-charset": {
    source: "iana"
  },
  "application/vnd.afpc.foca-codedfont": {
    source: "iana"
  },
  "application/vnd.afpc.foca-codepage": {
    source: "iana"
  },
  "application/vnd.afpc.modca": {
    source: "iana"
  },
  "application/vnd.afpc.modca-cmtable": {
    source: "iana"
  },
  "application/vnd.afpc.modca-formdef": {
    source: "iana"
  },
  "application/vnd.afpc.modca-mediummap": {
    source: "iana"
  },
  "application/vnd.afpc.modca-objectcontainer": {
    source: "iana"
  },
  "application/vnd.afpc.modca-overlay": {
    source: "iana"
  },
  "application/vnd.afpc.modca-pagesegment": {
    source: "iana"
  },
  "application/vnd.age": {
    source: "iana",
    extensions: [
      "age"
    ]
  },
  "application/vnd.ah-barcode": {
    source: "iana"
  },
  "application/vnd.ahead.space": {
    source: "iana",
    extensions: [
      "ahead"
    ]
  },
  "application/vnd.airzip.filesecure.azf": {
    source: "iana",
    extensions: [
      "azf"
    ]
  },
  "application/vnd.airzip.filesecure.azs": {
    source: "iana",
    extensions: [
      "azs"
    ]
  },
  "application/vnd.amadeus+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.amazon.ebook": {
    source: "apache",
    extensions: [
      "azw"
    ]
  },
  "application/vnd.amazon.mobi8-ebook": {
    source: "iana"
  },
  "application/vnd.americandynamics.acc": {
    source: "iana",
    extensions: [
      "acc"
    ]
  },
  "application/vnd.amiga.ami": {
    source: "iana",
    extensions: [
      "ami"
    ]
  },
  "application/vnd.amundsen.maze+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.android.ota": {
    source: "iana"
  },
  "application/vnd.android.package-archive": {
    source: "apache",
    compressible: false,
    extensions: [
      "apk"
    ]
  },
  "application/vnd.anki": {
    source: "iana"
  },
  "application/vnd.anser-web-certificate-issue-initiation": {
    source: "iana",
    extensions: [
      "cii"
    ]
  },
  "application/vnd.anser-web-funds-transfer-initiation": {
    source: "apache",
    extensions: [
      "fti"
    ]
  },
  "application/vnd.antix.game-component": {
    source: "iana",
    extensions: [
      "atx"
    ]
  },
  "application/vnd.apache.arrow.file": {
    source: "iana"
  },
  "application/vnd.apache.arrow.stream": {
    source: "iana"
  },
  "application/vnd.apache.thrift.binary": {
    source: "iana"
  },
  "application/vnd.apache.thrift.compact": {
    source: "iana"
  },
  "application/vnd.apache.thrift.json": {
    source: "iana"
  },
  "application/vnd.api+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.aplextor.warrp+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.apothekende.reservation+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.apple.installer+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "mpkg"
    ]
  },
  "application/vnd.apple.keynote": {
    source: "iana",
    extensions: [
      "key"
    ]
  },
  "application/vnd.apple.mpegurl": {
    source: "iana",
    extensions: [
      "m3u8"
    ]
  },
  "application/vnd.apple.numbers": {
    source: "iana",
    extensions: [
      "numbers"
    ]
  },
  "application/vnd.apple.pages": {
    source: "iana",
    extensions: [
      "pages"
    ]
  },
  "application/vnd.apple.pkpass": {
    compressible: false,
    extensions: [
      "pkpass"
    ]
  },
  "application/vnd.arastra.swi": {
    source: "iana"
  },
  "application/vnd.aristanetworks.swi": {
    source: "iana",
    extensions: [
      "swi"
    ]
  },
  "application/vnd.artisan+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.artsquare": {
    source: "iana"
  },
  "application/vnd.astraea-software.iota": {
    source: "iana",
    extensions: [
      "iota"
    ]
  },
  "application/vnd.audiograph": {
    source: "iana",
    extensions: [
      "aep"
    ]
  },
  "application/vnd.autopackage": {
    source: "iana"
  },
  "application/vnd.avalon+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.avistar+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.balsamiq.bmml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "bmml"
    ]
  },
  "application/vnd.balsamiq.bmpr": {
    source: "iana"
  },
  "application/vnd.banana-accounting": {
    source: "iana"
  },
  "application/vnd.bbf.usp.error": {
    source: "iana"
  },
  "application/vnd.bbf.usp.msg": {
    source: "iana"
  },
  "application/vnd.bbf.usp.msg+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.bekitzur-stech+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.bint.med-content": {
    source: "iana"
  },
  "application/vnd.biopax.rdf+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.blink-idb-value-wrapper": {
    source: "iana"
  },
  "application/vnd.blueice.multipass": {
    source: "iana",
    extensions: [
      "mpm"
    ]
  },
  "application/vnd.bluetooth.ep.oob": {
    source: "iana"
  },
  "application/vnd.bluetooth.le.oob": {
    source: "iana"
  },
  "application/vnd.bmi": {
    source: "iana",
    extensions: [
      "bmi"
    ]
  },
  "application/vnd.bpf": {
    source: "iana"
  },
  "application/vnd.bpf3": {
    source: "iana"
  },
  "application/vnd.businessobjects": {
    source: "iana",
    extensions: [
      "rep"
    ]
  },
  "application/vnd.byu.uapi+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.cab-jscript": {
    source: "iana"
  },
  "application/vnd.canon-cpdl": {
    source: "iana"
  },
  "application/vnd.canon-lips": {
    source: "iana"
  },
  "application/vnd.capasystems-pg+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.cendio.thinlinc.clientconf": {
    source: "iana"
  },
  "application/vnd.century-systems.tcp_stream": {
    source: "iana"
  },
  "application/vnd.chemdraw+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "cdxml"
    ]
  },
  "application/vnd.chess-pgn": {
    source: "iana"
  },
  "application/vnd.chipnuts.karaoke-mmd": {
    source: "iana",
    extensions: [
      "mmd"
    ]
  },
  "application/vnd.ciedi": {
    source: "iana"
  },
  "application/vnd.cinderella": {
    source: "iana",
    extensions: [
      "cdy"
    ]
  },
  "application/vnd.cirpack.isdn-ext": {
    source: "iana"
  },
  "application/vnd.citationstyles.style+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "csl"
    ]
  },
  "application/vnd.claymore": {
    source: "iana",
    extensions: [
      "cla"
    ]
  },
  "application/vnd.cloanto.rp9": {
    source: "iana",
    extensions: [
      "rp9"
    ]
  },
  "application/vnd.clonk.c4group": {
    source: "iana",
    extensions: [
      "c4g",
      "c4d",
      "c4f",
      "c4p",
      "c4u"
    ]
  },
  "application/vnd.cluetrust.cartomobile-config": {
    source: "iana",
    extensions: [
      "c11amc"
    ]
  },
  "application/vnd.cluetrust.cartomobile-config-pkg": {
    source: "iana",
    extensions: [
      "c11amz"
    ]
  },
  "application/vnd.coffeescript": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.document": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.document-template": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.presentation": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.presentation-template": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.spreadsheet": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.spreadsheet-template": {
    source: "iana"
  },
  "application/vnd.collection+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.collection.doc+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.collection.next+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.comicbook+zip": {
    source: "iana",
    compressible: false
  },
  "application/vnd.comicbook-rar": {
    source: "iana"
  },
  "application/vnd.commerce-battelle": {
    source: "iana"
  },
  "application/vnd.commonspace": {
    source: "iana",
    extensions: [
      "csp"
    ]
  },
  "application/vnd.contact.cmsg": {
    source: "iana",
    extensions: [
      "cdbcmsg"
    ]
  },
  "application/vnd.coreos.ignition+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.cosmocaller": {
    source: "iana",
    extensions: [
      "cmc"
    ]
  },
  "application/vnd.crick.clicker": {
    source: "iana",
    extensions: [
      "clkx"
    ]
  },
  "application/vnd.crick.clicker.keyboard": {
    source: "iana",
    extensions: [
      "clkk"
    ]
  },
  "application/vnd.crick.clicker.palette": {
    source: "iana",
    extensions: [
      "clkp"
    ]
  },
  "application/vnd.crick.clicker.template": {
    source: "iana",
    extensions: [
      "clkt"
    ]
  },
  "application/vnd.crick.clicker.wordbank": {
    source: "iana",
    extensions: [
      "clkw"
    ]
  },
  "application/vnd.criticaltools.wbs+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "wbs"
    ]
  },
  "application/vnd.cryptii.pipe+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.crypto-shade-file": {
    source: "iana"
  },
  "application/vnd.cryptomator.encrypted": {
    source: "iana"
  },
  "application/vnd.cryptomator.vault": {
    source: "iana"
  },
  "application/vnd.ctc-posml": {
    source: "iana",
    extensions: [
      "pml"
    ]
  },
  "application/vnd.ctct.ws+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.cups-pdf": {
    source: "iana"
  },
  "application/vnd.cups-postscript": {
    source: "iana"
  },
  "application/vnd.cups-ppd": {
    source: "iana",
    extensions: [
      "ppd"
    ]
  },
  "application/vnd.cups-raster": {
    source: "iana"
  },
  "application/vnd.cups-raw": {
    source: "iana"
  },
  "application/vnd.curl": {
    source: "iana"
  },
  "application/vnd.curl.car": {
    source: "apache",
    extensions: [
      "car"
    ]
  },
  "application/vnd.curl.pcurl": {
    source: "apache",
    extensions: [
      "pcurl"
    ]
  },
  "application/vnd.cyan.dean.root+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.cybank": {
    source: "iana"
  },
  "application/vnd.cyclonedx+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.cyclonedx+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.d2l.coursepackage1p0+zip": {
    source: "iana",
    compressible: false
  },
  "application/vnd.d3m-dataset": {
    source: "iana"
  },
  "application/vnd.d3m-problem": {
    source: "iana"
  },
  "application/vnd.dart": {
    source: "iana",
    compressible: true,
    extensions: [
      "dart"
    ]
  },
  "application/vnd.data-vision.rdz": {
    source: "iana",
    extensions: [
      "rdz"
    ]
  },
  "application/vnd.datapackage+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.dataresource+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.dbf": {
    source: "iana",
    extensions: [
      "dbf"
    ]
  },
  "application/vnd.debian.binary-package": {
    source: "iana"
  },
  "application/vnd.dece.data": {
    source: "iana",
    extensions: [
      "uvf",
      "uvvf",
      "uvd",
      "uvvd"
    ]
  },
  "application/vnd.dece.ttml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "uvt",
      "uvvt"
    ]
  },
  "application/vnd.dece.unspecified": {
    source: "iana",
    extensions: [
      "uvx",
      "uvvx"
    ]
  },
  "application/vnd.dece.zip": {
    source: "iana",
    extensions: [
      "uvz",
      "uvvz"
    ]
  },
  "application/vnd.denovo.fcselayout-link": {
    source: "iana",
    extensions: [
      "fe_launch"
    ]
  },
  "application/vnd.desmume.movie": {
    source: "iana"
  },
  "application/vnd.dir-bi.plate-dl-nosuffix": {
    source: "iana"
  },
  "application/vnd.dm.delegation+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.dna": {
    source: "iana",
    extensions: [
      "dna"
    ]
  },
  "application/vnd.document+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.dolby.mlp": {
    source: "apache",
    extensions: [
      "mlp"
    ]
  },
  "application/vnd.dolby.mobile.1": {
    source: "iana"
  },
  "application/vnd.dolby.mobile.2": {
    source: "iana"
  },
  "application/vnd.doremir.scorecloud-binary-document": {
    source: "iana"
  },
  "application/vnd.dpgraph": {
    source: "iana",
    extensions: [
      "dpg"
    ]
  },
  "application/vnd.dreamfactory": {
    source: "iana",
    extensions: [
      "dfac"
    ]
  },
  "application/vnd.drive+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.ds-keypoint": {
    source: "apache",
    extensions: [
      "kpxx"
    ]
  },
  "application/vnd.dtg.local": {
    source: "iana"
  },
  "application/vnd.dtg.local.flash": {
    source: "iana"
  },
  "application/vnd.dtg.local.html": {
    source: "iana"
  },
  "application/vnd.dvb.ait": {
    source: "iana",
    extensions: [
      "ait"
    ]
  },
  "application/vnd.dvb.dvbisl+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.dvb.dvbj": {
    source: "iana"
  },
  "application/vnd.dvb.esgcontainer": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcdftnotifaccess": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcesgaccess": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcesgaccess2": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcesgpdd": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcroaming": {
    source: "iana"
  },
  "application/vnd.dvb.iptv.alfec-base": {
    source: "iana"
  },
  "application/vnd.dvb.iptv.alfec-enhancement": {
    source: "iana"
  },
  "application/vnd.dvb.notif-aggregate-root+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.dvb.notif-container+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.dvb.notif-generic+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.dvb.notif-ia-msglist+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.dvb.notif-ia-registration-request+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.dvb.notif-ia-registration-response+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.dvb.notif-init+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.dvb.pfr": {
    source: "iana"
  },
  "application/vnd.dvb.service": {
    source: "iana",
    extensions: [
      "svc"
    ]
  },
  "application/vnd.dxr": {
    source: "iana"
  },
  "application/vnd.dynageo": {
    source: "iana",
    extensions: [
      "geo"
    ]
  },
  "application/vnd.dzr": {
    source: "iana"
  },
  "application/vnd.easykaraoke.cdgdownload": {
    source: "iana"
  },
  "application/vnd.ecdis-update": {
    source: "iana"
  },
  "application/vnd.ecip.rlp": {
    source: "iana"
  },
  "application/vnd.eclipse.ditto+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.ecowin.chart": {
    source: "iana",
    extensions: [
      "mag"
    ]
  },
  "application/vnd.ecowin.filerequest": {
    source: "iana"
  },
  "application/vnd.ecowin.fileupdate": {
    source: "iana"
  },
  "application/vnd.ecowin.series": {
    source: "iana"
  },
  "application/vnd.ecowin.seriesrequest": {
    source: "iana"
  },
  "application/vnd.ecowin.seriesupdate": {
    source: "iana"
  },
  "application/vnd.efi.img": {
    source: "iana"
  },
  "application/vnd.efi.iso": {
    source: "iana"
  },
  "application/vnd.emclient.accessrequest+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.enliven": {
    source: "iana",
    extensions: [
      "nml"
    ]
  },
  "application/vnd.enphase.envoy": {
    source: "iana"
  },
  "application/vnd.eprints.data+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.epson.esf": {
    source: "iana",
    extensions: [
      "esf"
    ]
  },
  "application/vnd.epson.msf": {
    source: "iana",
    extensions: [
      "msf"
    ]
  },
  "application/vnd.epson.quickanime": {
    source: "iana",
    extensions: [
      "qam"
    ]
  },
  "application/vnd.epson.salt": {
    source: "iana",
    extensions: [
      "slt"
    ]
  },
  "application/vnd.epson.ssf": {
    source: "iana",
    extensions: [
      "ssf"
    ]
  },
  "application/vnd.ericsson.quickcall": {
    source: "iana"
  },
  "application/vnd.espass-espass+zip": {
    source: "iana",
    compressible: false
  },
  "application/vnd.eszigno3+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "es3",
      "et3"
    ]
  },
  "application/vnd.etsi.aoc+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.etsi.asic-e+zip": {
    source: "iana",
    compressible: false
  },
  "application/vnd.etsi.asic-s+zip": {
    source: "iana",
    compressible: false
  },
  "application/vnd.etsi.cug+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.etsi.iptvcommand+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.etsi.iptvdiscovery+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.etsi.iptvprofile+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.etsi.iptvsad-bc+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.etsi.iptvsad-cod+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.etsi.iptvsad-npvr+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.etsi.iptvservice+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.etsi.iptvsync+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.etsi.iptvueprofile+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.etsi.mcid+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.etsi.mheg5": {
    source: "iana"
  },
  "application/vnd.etsi.overload-control-policy-dataset+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.etsi.pstn+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.etsi.sci+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.etsi.simservs+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.etsi.timestamp-token": {
    source: "iana"
  },
  "application/vnd.etsi.tsl+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.etsi.tsl.der": {
    source: "iana"
  },
  "application/vnd.eu.kasparian.car+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.eudora.data": {
    source: "iana"
  },
  "application/vnd.evolv.ecig.profile": {
    source: "iana"
  },
  "application/vnd.evolv.ecig.settings": {
    source: "iana"
  },
  "application/vnd.evolv.ecig.theme": {
    source: "iana"
  },
  "application/vnd.exstream-empower+zip": {
    source: "iana",
    compressible: false
  },
  "application/vnd.exstream-package": {
    source: "iana"
  },
  "application/vnd.ezpix-album": {
    source: "iana",
    extensions: [
      "ez2"
    ]
  },
  "application/vnd.ezpix-package": {
    source: "iana",
    extensions: [
      "ez3"
    ]
  },
  "application/vnd.f-secure.mobile": {
    source: "iana"
  },
  "application/vnd.familysearch.gedcom+zip": {
    source: "iana",
    compressible: false
  },
  "application/vnd.fastcopy-disk-image": {
    source: "iana"
  },
  "application/vnd.fdf": {
    source: "iana",
    extensions: [
      "fdf"
    ]
  },
  "application/vnd.fdsn.mseed": {
    source: "iana",
    extensions: [
      "mseed"
    ]
  },
  "application/vnd.fdsn.seed": {
    source: "iana",
    extensions: [
      "seed",
      "dataless"
    ]
  },
  "application/vnd.ffsns": {
    source: "iana"
  },
  "application/vnd.ficlab.flb+zip": {
    source: "iana",
    compressible: false
  },
  "application/vnd.filmit.zfc": {
    source: "iana"
  },
  "application/vnd.fints": {
    source: "iana"
  },
  "application/vnd.firemonkeys.cloudcell": {
    source: "iana"
  },
  "application/vnd.flographit": {
    source: "iana",
    extensions: [
      "gph"
    ]
  },
  "application/vnd.fluxtime.clip": {
    source: "iana",
    extensions: [
      "ftc"
    ]
  },
  "application/vnd.font-fontforge-sfd": {
    source: "iana"
  },
  "application/vnd.framemaker": {
    source: "iana",
    extensions: [
      "fm",
      "frame",
      "maker",
      "book"
    ]
  },
  "application/vnd.frogans.fnc": {
    source: "iana",
    extensions: [
      "fnc"
    ]
  },
  "application/vnd.frogans.ltf": {
    source: "iana",
    extensions: [
      "ltf"
    ]
  },
  "application/vnd.fsc.weblaunch": {
    source: "iana",
    extensions: [
      "fsc"
    ]
  },
  "application/vnd.fujifilm.fb.docuworks": {
    source: "iana"
  },
  "application/vnd.fujifilm.fb.docuworks.binder": {
    source: "iana"
  },
  "application/vnd.fujifilm.fb.docuworks.container": {
    source: "iana"
  },
  "application/vnd.fujifilm.fb.jfi+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.fujitsu.oasys": {
    source: "iana",
    extensions: [
      "oas"
    ]
  },
  "application/vnd.fujitsu.oasys2": {
    source: "iana",
    extensions: [
      "oa2"
    ]
  },
  "application/vnd.fujitsu.oasys3": {
    source: "iana",
    extensions: [
      "oa3"
    ]
  },
  "application/vnd.fujitsu.oasysgp": {
    source: "iana",
    extensions: [
      "fg5"
    ]
  },
  "application/vnd.fujitsu.oasysprs": {
    source: "iana",
    extensions: [
      "bh2"
    ]
  },
  "application/vnd.fujixerox.art-ex": {
    source: "iana"
  },
  "application/vnd.fujixerox.art4": {
    source: "iana"
  },
  "application/vnd.fujixerox.ddd": {
    source: "iana",
    extensions: [
      "ddd"
    ]
  },
  "application/vnd.fujixerox.docuworks": {
    source: "iana",
    extensions: [
      "xdw"
    ]
  },
  "application/vnd.fujixerox.docuworks.binder": {
    source: "iana",
    extensions: [
      "xbd"
    ]
  },
  "application/vnd.fujixerox.docuworks.container": {
    source: "iana"
  },
  "application/vnd.fujixerox.hbpl": {
    source: "iana"
  },
  "application/vnd.fut-misnet": {
    source: "iana"
  },
  "application/vnd.futoin+cbor": {
    source: "iana"
  },
  "application/vnd.futoin+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.fuzzysheet": {
    source: "iana",
    extensions: [
      "fzs"
    ]
  },
  "application/vnd.genomatix.tuxedo": {
    source: "iana",
    extensions: [
      "txd"
    ]
  },
  "application/vnd.gentics.grd+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.geo+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.geocube+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.geogebra.file": {
    source: "iana",
    extensions: [
      "ggb"
    ]
  },
  "application/vnd.geogebra.slides": {
    source: "iana"
  },
  "application/vnd.geogebra.tool": {
    source: "iana",
    extensions: [
      "ggt"
    ]
  },
  "application/vnd.geometry-explorer": {
    source: "iana",
    extensions: [
      "gex",
      "gre"
    ]
  },
  "application/vnd.geonext": {
    source: "iana",
    extensions: [
      "gxt"
    ]
  },
  "application/vnd.geoplan": {
    source: "iana",
    extensions: [
      "g2w"
    ]
  },
  "application/vnd.geospace": {
    source: "iana",
    extensions: [
      "g3w"
    ]
  },
  "application/vnd.gerber": {
    source: "iana"
  },
  "application/vnd.globalplatform.card-content-mgt": {
    source: "iana"
  },
  "application/vnd.globalplatform.card-content-mgt-response": {
    source: "iana"
  },
  "application/vnd.gmx": {
    source: "iana",
    extensions: [
      "gmx"
    ]
  },
  "application/vnd.google-apps.document": {
    compressible: false,
    extensions: [
      "gdoc"
    ]
  },
  "application/vnd.google-apps.presentation": {
    compressible: false,
    extensions: [
      "gslides"
    ]
  },
  "application/vnd.google-apps.spreadsheet": {
    compressible: false,
    extensions: [
      "gsheet"
    ]
  },
  "application/vnd.google-earth.kml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "kml"
    ]
  },
  "application/vnd.google-earth.kmz": {
    source: "iana",
    compressible: false,
    extensions: [
      "kmz"
    ]
  },
  "application/vnd.gov.sk.e-form+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.gov.sk.e-form+zip": {
    source: "iana",
    compressible: false
  },
  "application/vnd.gov.sk.xmldatacontainer+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.grafeq": {
    source: "iana",
    extensions: [
      "gqf",
      "gqs"
    ]
  },
  "application/vnd.gridmp": {
    source: "iana"
  },
  "application/vnd.groove-account": {
    source: "iana",
    extensions: [
      "gac"
    ]
  },
  "application/vnd.groove-help": {
    source: "iana",
    extensions: [
      "ghf"
    ]
  },
  "application/vnd.groove-identity-message": {
    source: "iana",
    extensions: [
      "gim"
    ]
  },
  "application/vnd.groove-injector": {
    source: "iana",
    extensions: [
      "grv"
    ]
  },
  "application/vnd.groove-tool-message": {
    source: "iana",
    extensions: [
      "gtm"
    ]
  },
  "application/vnd.groove-tool-template": {
    source: "iana",
    extensions: [
      "tpl"
    ]
  },
  "application/vnd.groove-vcard": {
    source: "iana",
    extensions: [
      "vcg"
    ]
  },
  "application/vnd.hal+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.hal+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "hal"
    ]
  },
  "application/vnd.handheld-entertainment+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "zmm"
    ]
  },
  "application/vnd.hbci": {
    source: "iana",
    extensions: [
      "hbci"
    ]
  },
  "application/vnd.hc+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.hcl-bireports": {
    source: "iana"
  },
  "application/vnd.hdt": {
    source: "iana"
  },
  "application/vnd.heroku+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.hhe.lesson-player": {
    source: "iana",
    extensions: [
      "les"
    ]
  },
  "application/vnd.hl7cda+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/vnd.hl7v2+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/vnd.hp-hpgl": {
    source: "iana",
    extensions: [
      "hpgl"
    ]
  },
  "application/vnd.hp-hpid": {
    source: "iana",
    extensions: [
      "hpid"
    ]
  },
  "application/vnd.hp-hps": {
    source: "iana",
    extensions: [
      "hps"
    ]
  },
  "application/vnd.hp-jlyt": {
    source: "iana",
    extensions: [
      "jlt"
    ]
  },
  "application/vnd.hp-pcl": {
    source: "iana",
    extensions: [
      "pcl"
    ]
  },
  "application/vnd.hp-pclxl": {
    source: "iana",
    extensions: [
      "pclxl"
    ]
  },
  "application/vnd.httphone": {
    source: "iana"
  },
  "application/vnd.hydrostatix.sof-data": {
    source: "iana",
    extensions: [
      "sfd-hdstx"
    ]
  },
  "application/vnd.hyper+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.hyper-item+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.hyperdrive+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.hzn-3d-crossword": {
    source: "iana"
  },
  "application/vnd.ibm.afplinedata": {
    source: "iana"
  },
  "application/vnd.ibm.electronic-media": {
    source: "iana"
  },
  "application/vnd.ibm.minipay": {
    source: "iana",
    extensions: [
      "mpy"
    ]
  },
  "application/vnd.ibm.modcap": {
    source: "iana",
    extensions: [
      "afp",
      "listafp",
      "list3820"
    ]
  },
  "application/vnd.ibm.rights-management": {
    source: "iana",
    extensions: [
      "irm"
    ]
  },
  "application/vnd.ibm.secure-container": {
    source: "iana",
    extensions: [
      "sc"
    ]
  },
  "application/vnd.iccprofile": {
    source: "iana",
    extensions: [
      "icc",
      "icm"
    ]
  },
  "application/vnd.ieee.1905": {
    source: "iana"
  },
  "application/vnd.igloader": {
    source: "iana",
    extensions: [
      "igl"
    ]
  },
  "application/vnd.imagemeter.folder+zip": {
    source: "iana",
    compressible: false
  },
  "application/vnd.imagemeter.image+zip": {
    source: "iana",
    compressible: false
  },
  "application/vnd.immervision-ivp": {
    source: "iana",
    extensions: [
      "ivp"
    ]
  },
  "application/vnd.immervision-ivu": {
    source: "iana",
    extensions: [
      "ivu"
    ]
  },
  "application/vnd.ims.imsccv1p1": {
    source: "iana"
  },
  "application/vnd.ims.imsccv1p2": {
    source: "iana"
  },
  "application/vnd.ims.imsccv1p3": {
    source: "iana"
  },
  "application/vnd.ims.lis.v2.result+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.ims.lti.v2.toolconsumerprofile+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.ims.lti.v2.toolproxy+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.ims.lti.v2.toolproxy.id+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.ims.lti.v2.toolsettings+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.ims.lti.v2.toolsettings.simple+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.informedcontrol.rms+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.informix-visionary": {
    source: "iana"
  },
  "application/vnd.infotech.project": {
    source: "iana"
  },
  "application/vnd.infotech.project+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.innopath.wamp.notification": {
    source: "iana"
  },
  "application/vnd.insors.igm": {
    source: "iana",
    extensions: [
      "igm"
    ]
  },
  "application/vnd.intercon.formnet": {
    source: "iana",
    extensions: [
      "xpw",
      "xpx"
    ]
  },
  "application/vnd.intergeo": {
    source: "iana",
    extensions: [
      "i2g"
    ]
  },
  "application/vnd.intertrust.digibox": {
    source: "iana"
  },
  "application/vnd.intertrust.nncp": {
    source: "iana"
  },
  "application/vnd.intu.qbo": {
    source: "iana",
    extensions: [
      "qbo"
    ]
  },
  "application/vnd.intu.qfx": {
    source: "iana",
    extensions: [
      "qfx"
    ]
  },
  "application/vnd.iptc.g2.catalogitem+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.iptc.g2.conceptitem+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.iptc.g2.knowledgeitem+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.iptc.g2.newsitem+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.iptc.g2.newsmessage+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.iptc.g2.packageitem+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.iptc.g2.planningitem+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.ipunplugged.rcprofile": {
    source: "iana",
    extensions: [
      "rcprofile"
    ]
  },
  "application/vnd.irepository.package+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "irp"
    ]
  },
  "application/vnd.is-xpr": {
    source: "iana",
    extensions: [
      "xpr"
    ]
  },
  "application/vnd.isac.fcs": {
    source: "iana",
    extensions: [
      "fcs"
    ]
  },
  "application/vnd.iso11783-10+zip": {
    source: "iana",
    compressible: false
  },
  "application/vnd.jam": {
    source: "iana",
    extensions: [
      "jam"
    ]
  },
  "application/vnd.japannet-directory-service": {
    source: "iana"
  },
  "application/vnd.japannet-jpnstore-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-payment-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-registration": {
    source: "iana"
  },
  "application/vnd.japannet-registration-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-setstore-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-verification": {
    source: "iana"
  },
  "application/vnd.japannet-verification-wakeup": {
    source: "iana"
  },
  "application/vnd.jcp.javame.midlet-rms": {
    source: "iana",
    extensions: [
      "rms"
    ]
  },
  "application/vnd.jisp": {
    source: "iana",
    extensions: [
      "jisp"
    ]
  },
  "application/vnd.joost.joda-archive": {
    source: "iana",
    extensions: [
      "joda"
    ]
  },
  "application/vnd.jsk.isdn-ngn": {
    source: "iana"
  },
  "application/vnd.kahootz": {
    source: "iana",
    extensions: [
      "ktz",
      "ktr"
    ]
  },
  "application/vnd.kde.karbon": {
    source: "iana",
    extensions: [
      "karbon"
    ]
  },
  "application/vnd.kde.kchart": {
    source: "iana",
    extensions: [
      "chrt"
    ]
  },
  "application/vnd.kde.kformula": {
    source: "iana",
    extensions: [
      "kfo"
    ]
  },
  "application/vnd.kde.kivio": {
    source: "iana",
    extensions: [
      "flw"
    ]
  },
  "application/vnd.kde.kontour": {
    source: "iana",
    extensions: [
      "kon"
    ]
  },
  "application/vnd.kde.kpresenter": {
    source: "iana",
    extensions: [
      "kpr",
      "kpt"
    ]
  },
  "application/vnd.kde.kspread": {
    source: "iana",
    extensions: [
      "ksp"
    ]
  },
  "application/vnd.kde.kword": {
    source: "iana",
    extensions: [
      "kwd",
      "kwt"
    ]
  },
  "application/vnd.kenameaapp": {
    source: "iana",
    extensions: [
      "htke"
    ]
  },
  "application/vnd.kidspiration": {
    source: "iana",
    extensions: [
      "kia"
    ]
  },
  "application/vnd.kinar": {
    source: "iana",
    extensions: [
      "kne",
      "knp"
    ]
  },
  "application/vnd.koan": {
    source: "iana",
    extensions: [
      "skp",
      "skd",
      "skt",
      "skm"
    ]
  },
  "application/vnd.kodak-descriptor": {
    source: "iana",
    extensions: [
      "sse"
    ]
  },
  "application/vnd.las": {
    source: "iana"
  },
  "application/vnd.las.las+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.las.las+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "lasxml"
    ]
  },
  "application/vnd.laszip": {
    source: "iana"
  },
  "application/vnd.leap+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.liberty-request+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.llamagraphics.life-balance.desktop": {
    source: "iana",
    extensions: [
      "lbd"
    ]
  },
  "application/vnd.llamagraphics.life-balance.exchange+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "lbe"
    ]
  },
  "application/vnd.logipipe.circuit+zip": {
    source: "iana",
    compressible: false
  },
  "application/vnd.loom": {
    source: "iana"
  },
  "application/vnd.lotus-1-2-3": {
    source: "iana",
    extensions: [
      "123"
    ]
  },
  "application/vnd.lotus-approach": {
    source: "iana",
    extensions: [
      "apr"
    ]
  },
  "application/vnd.lotus-freelance": {
    source: "iana",
    extensions: [
      "pre"
    ]
  },
  "application/vnd.lotus-notes": {
    source: "iana",
    extensions: [
      "nsf"
    ]
  },
  "application/vnd.lotus-organizer": {
    source: "iana",
    extensions: [
      "org"
    ]
  },
  "application/vnd.lotus-screencam": {
    source: "iana",
    extensions: [
      "scm"
    ]
  },
  "application/vnd.lotus-wordpro": {
    source: "iana",
    extensions: [
      "lwp"
    ]
  },
  "application/vnd.macports.portpkg": {
    source: "iana",
    extensions: [
      "portpkg"
    ]
  },
  "application/vnd.mapbox-vector-tile": {
    source: "iana",
    extensions: [
      "mvt"
    ]
  },
  "application/vnd.marlin.drm.actiontoken+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.marlin.drm.conftoken+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.marlin.drm.license+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.marlin.drm.mdcf": {
    source: "iana"
  },
  "application/vnd.mason+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.maxar.archive.3tz+zip": {
    source: "iana",
    compressible: false
  },
  "application/vnd.maxmind.maxmind-db": {
    source: "iana"
  },
  "application/vnd.mcd": {
    source: "iana",
    extensions: [
      "mcd"
    ]
  },
  "application/vnd.medcalcdata": {
    source: "iana",
    extensions: [
      "mc1"
    ]
  },
  "application/vnd.mediastation.cdkey": {
    source: "iana",
    extensions: [
      "cdkey"
    ]
  },
  "application/vnd.meridian-slingshot": {
    source: "iana"
  },
  "application/vnd.mfer": {
    source: "iana",
    extensions: [
      "mwf"
    ]
  },
  "application/vnd.mfmp": {
    source: "iana",
    extensions: [
      "mfm"
    ]
  },
  "application/vnd.micro+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.micrografx.flo": {
    source: "iana",
    extensions: [
      "flo"
    ]
  },
  "application/vnd.micrografx.igx": {
    source: "iana",
    extensions: [
      "igx"
    ]
  },
  "application/vnd.microsoft.portable-executable": {
    source: "iana"
  },
  "application/vnd.microsoft.windows.thumbnail-cache": {
    source: "iana"
  },
  "application/vnd.miele+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.mif": {
    source: "iana",
    extensions: [
      "mif"
    ]
  },
  "application/vnd.minisoft-hp3000-save": {
    source: "iana"
  },
  "application/vnd.mitsubishi.misty-guard.trustweb": {
    source: "iana"
  },
  "application/vnd.mobius.daf": {
    source: "iana",
    extensions: [
      "daf"
    ]
  },
  "application/vnd.mobius.dis": {
    source: "iana",
    extensions: [
      "dis"
    ]
  },
  "application/vnd.mobius.mbk": {
    source: "iana",
    extensions: [
      "mbk"
    ]
  },
  "application/vnd.mobius.mqy": {
    source: "iana",
    extensions: [
      "mqy"
    ]
  },
  "application/vnd.mobius.msl": {
    source: "iana",
    extensions: [
      "msl"
    ]
  },
  "application/vnd.mobius.plc": {
    source: "iana",
    extensions: [
      "plc"
    ]
  },
  "application/vnd.mobius.txf": {
    source: "iana",
    extensions: [
      "txf"
    ]
  },
  "application/vnd.mophun.application": {
    source: "iana",
    extensions: [
      "mpn"
    ]
  },
  "application/vnd.mophun.certificate": {
    source: "iana",
    extensions: [
      "mpc"
    ]
  },
  "application/vnd.motorola.flexsuite": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.adsi": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.fis": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.gotap": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.kmr": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.ttc": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.wem": {
    source: "iana"
  },
  "application/vnd.motorola.iprm": {
    source: "iana"
  },
  "application/vnd.mozilla.xul+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "xul"
    ]
  },
  "application/vnd.ms-3mfdocument": {
    source: "iana"
  },
  "application/vnd.ms-artgalry": {
    source: "iana",
    extensions: [
      "cil"
    ]
  },
  "application/vnd.ms-asf": {
    source: "iana"
  },
  "application/vnd.ms-cab-compressed": {
    source: "iana",
    extensions: [
      "cab"
    ]
  },
  "application/vnd.ms-color.iccprofile": {
    source: "apache"
  },
  "application/vnd.ms-excel": {
    source: "iana",
    compressible: false,
    extensions: [
      "xls",
      "xlm",
      "xla",
      "xlc",
      "xlt",
      "xlw"
    ]
  },
  "application/vnd.ms-excel.addin.macroenabled.12": {
    source: "iana",
    extensions: [
      "xlam"
    ]
  },
  "application/vnd.ms-excel.sheet.binary.macroenabled.12": {
    source: "iana",
    extensions: [
      "xlsb"
    ]
  },
  "application/vnd.ms-excel.sheet.macroenabled.12": {
    source: "iana",
    extensions: [
      "xlsm"
    ]
  },
  "application/vnd.ms-excel.template.macroenabled.12": {
    source: "iana",
    extensions: [
      "xltm"
    ]
  },
  "application/vnd.ms-fontobject": {
    source: "iana",
    compressible: true,
    extensions: [
      "eot"
    ]
  },
  "application/vnd.ms-htmlhelp": {
    source: "iana",
    extensions: [
      "chm"
    ]
  },
  "application/vnd.ms-ims": {
    source: "iana",
    extensions: [
      "ims"
    ]
  },
  "application/vnd.ms-lrm": {
    source: "iana",
    extensions: [
      "lrm"
    ]
  },
  "application/vnd.ms-office.activex+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.ms-officetheme": {
    source: "iana",
    extensions: [
      "thmx"
    ]
  },
  "application/vnd.ms-opentype": {
    source: "apache",
    compressible: true
  },
  "application/vnd.ms-outlook": {
    compressible: false,
    extensions: [
      "msg"
    ]
  },
  "application/vnd.ms-package.obfuscated-opentype": {
    source: "apache"
  },
  "application/vnd.ms-pki.seccat": {
    source: "apache",
    extensions: [
      "cat"
    ]
  },
  "application/vnd.ms-pki.stl": {
    source: "apache",
    extensions: [
      "stl"
    ]
  },
  "application/vnd.ms-playready.initiator+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.ms-powerpoint": {
    source: "iana",
    compressible: false,
    extensions: [
      "ppt",
      "pps",
      "pot"
    ]
  },
  "application/vnd.ms-powerpoint.addin.macroenabled.12": {
    source: "iana",
    extensions: [
      "ppam"
    ]
  },
  "application/vnd.ms-powerpoint.presentation.macroenabled.12": {
    source: "iana",
    extensions: [
      "pptm"
    ]
  },
  "application/vnd.ms-powerpoint.slide.macroenabled.12": {
    source: "iana",
    extensions: [
      "sldm"
    ]
  },
  "application/vnd.ms-powerpoint.slideshow.macroenabled.12": {
    source: "iana",
    extensions: [
      "ppsm"
    ]
  },
  "application/vnd.ms-powerpoint.template.macroenabled.12": {
    source: "iana",
    extensions: [
      "potm"
    ]
  },
  "application/vnd.ms-printdevicecapabilities+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.ms-printing.printticket+xml": {
    source: "apache",
    compressible: true
  },
  "application/vnd.ms-printschematicket+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.ms-project": {
    source: "iana",
    extensions: [
      "mpp",
      "mpt"
    ]
  },
  "application/vnd.ms-tnef": {
    source: "iana"
  },
  "application/vnd.ms-windows.devicepairing": {
    source: "iana"
  },
  "application/vnd.ms-windows.nwprinting.oob": {
    source: "iana"
  },
  "application/vnd.ms-windows.printerpairing": {
    source: "iana"
  },
  "application/vnd.ms-windows.wsd.oob": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.lic-chlg-req": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.lic-resp": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.meter-chlg-req": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.meter-resp": {
    source: "iana"
  },
  "application/vnd.ms-word.document.macroenabled.12": {
    source: "iana",
    extensions: [
      "docm"
    ]
  },
  "application/vnd.ms-word.template.macroenabled.12": {
    source: "iana",
    extensions: [
      "dotm"
    ]
  },
  "application/vnd.ms-works": {
    source: "iana",
    extensions: [
      "wps",
      "wks",
      "wcm",
      "wdb"
    ]
  },
  "application/vnd.ms-wpl": {
    source: "iana",
    extensions: [
      "wpl"
    ]
  },
  "application/vnd.ms-xpsdocument": {
    source: "iana",
    compressible: false,
    extensions: [
      "xps"
    ]
  },
  "application/vnd.msa-disk-image": {
    source: "iana"
  },
  "application/vnd.mseq": {
    source: "iana",
    extensions: [
      "mseq"
    ]
  },
  "application/vnd.msign": {
    source: "iana"
  },
  "application/vnd.multiad.creator": {
    source: "iana"
  },
  "application/vnd.multiad.creator.cif": {
    source: "iana"
  },
  "application/vnd.music-niff": {
    source: "iana"
  },
  "application/vnd.musician": {
    source: "iana",
    extensions: [
      "mus"
    ]
  },
  "application/vnd.muvee.style": {
    source: "iana",
    extensions: [
      "msty"
    ]
  },
  "application/vnd.mynfc": {
    source: "iana",
    extensions: [
      "taglet"
    ]
  },
  "application/vnd.nacamar.ybrid+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.ncd.control": {
    source: "iana"
  },
  "application/vnd.ncd.reference": {
    source: "iana"
  },
  "application/vnd.nearst.inv+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.nebumind.line": {
    source: "iana"
  },
  "application/vnd.nervana": {
    source: "iana"
  },
  "application/vnd.netfpx": {
    source: "iana"
  },
  "application/vnd.neurolanguage.nlu": {
    source: "iana",
    extensions: [
      "nlu"
    ]
  },
  "application/vnd.nimn": {
    source: "iana"
  },
  "application/vnd.nintendo.nitro.rom": {
    source: "iana"
  },
  "application/vnd.nintendo.snes.rom": {
    source: "iana"
  },
  "application/vnd.nitf": {
    source: "iana",
    extensions: [
      "ntf",
      "nitf"
    ]
  },
  "application/vnd.noblenet-directory": {
    source: "iana",
    extensions: [
      "nnd"
    ]
  },
  "application/vnd.noblenet-sealer": {
    source: "iana",
    extensions: [
      "nns"
    ]
  },
  "application/vnd.noblenet-web": {
    source: "iana",
    extensions: [
      "nnw"
    ]
  },
  "application/vnd.nokia.catalogs": {
    source: "iana"
  },
  "application/vnd.nokia.conml+wbxml": {
    source: "iana"
  },
  "application/vnd.nokia.conml+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.nokia.iptv.config+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.nokia.isds-radio-presets": {
    source: "iana"
  },
  "application/vnd.nokia.landmark+wbxml": {
    source: "iana"
  },
  "application/vnd.nokia.landmark+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.nokia.landmarkcollection+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.nokia.n-gage.ac+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "ac"
    ]
  },
  "application/vnd.nokia.n-gage.data": {
    source: "iana",
    extensions: [
      "ngdat"
    ]
  },
  "application/vnd.nokia.n-gage.symbian.install": {
    source: "iana",
    extensions: [
      "n-gage"
    ]
  },
  "application/vnd.nokia.ncd": {
    source: "iana"
  },
  "application/vnd.nokia.pcd+wbxml": {
    source: "iana"
  },
  "application/vnd.nokia.pcd+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.nokia.radio-preset": {
    source: "iana",
    extensions: [
      "rpst"
    ]
  },
  "application/vnd.nokia.radio-presets": {
    source: "iana",
    extensions: [
      "rpss"
    ]
  },
  "application/vnd.novadigm.edm": {
    source: "iana",
    extensions: [
      "edm"
    ]
  },
  "application/vnd.novadigm.edx": {
    source: "iana",
    extensions: [
      "edx"
    ]
  },
  "application/vnd.novadigm.ext": {
    source: "iana",
    extensions: [
      "ext"
    ]
  },
  "application/vnd.ntt-local.content-share": {
    source: "iana"
  },
  "application/vnd.ntt-local.file-transfer": {
    source: "iana"
  },
  "application/vnd.ntt-local.ogw_remote-access": {
    source: "iana"
  },
  "application/vnd.ntt-local.sip-ta_remote": {
    source: "iana"
  },
  "application/vnd.ntt-local.sip-ta_tcp_stream": {
    source: "iana"
  },
  "application/vnd.oasis.opendocument.chart": {
    source: "iana",
    extensions: [
      "odc"
    ]
  },
  "application/vnd.oasis.opendocument.chart-template": {
    source: "iana",
    extensions: [
      "otc"
    ]
  },
  "application/vnd.oasis.opendocument.database": {
    source: "iana",
    extensions: [
      "odb"
    ]
  },
  "application/vnd.oasis.opendocument.formula": {
    source: "iana",
    extensions: [
      "odf"
    ]
  },
  "application/vnd.oasis.opendocument.formula-template": {
    source: "iana",
    extensions: [
      "odft"
    ]
  },
  "application/vnd.oasis.opendocument.graphics": {
    source: "iana",
    compressible: false,
    extensions: [
      "odg"
    ]
  },
  "application/vnd.oasis.opendocument.graphics-template": {
    source: "iana",
    extensions: [
      "otg"
    ]
  },
  "application/vnd.oasis.opendocument.image": {
    source: "iana",
    extensions: [
      "odi"
    ]
  },
  "application/vnd.oasis.opendocument.image-template": {
    source: "iana",
    extensions: [
      "oti"
    ]
  },
  "application/vnd.oasis.opendocument.presentation": {
    source: "iana",
    compressible: false,
    extensions: [
      "odp"
    ]
  },
  "application/vnd.oasis.opendocument.presentation-template": {
    source: "iana",
    extensions: [
      "otp"
    ]
  },
  "application/vnd.oasis.opendocument.spreadsheet": {
    source: "iana",
    compressible: false,
    extensions: [
      "ods"
    ]
  },
  "application/vnd.oasis.opendocument.spreadsheet-template": {
    source: "iana",
    extensions: [
      "ots"
    ]
  },
  "application/vnd.oasis.opendocument.text": {
    source: "iana",
    compressible: false,
    extensions: [
      "odt"
    ]
  },
  "application/vnd.oasis.opendocument.text-master": {
    source: "iana",
    extensions: [
      "odm"
    ]
  },
  "application/vnd.oasis.opendocument.text-template": {
    source: "iana",
    extensions: [
      "ott"
    ]
  },
  "application/vnd.oasis.opendocument.text-web": {
    source: "iana",
    extensions: [
      "oth"
    ]
  },
  "application/vnd.obn": {
    source: "iana"
  },
  "application/vnd.ocf+cbor": {
    source: "iana"
  },
  "application/vnd.oci.image.manifest.v1+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oftn.l10n+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oipf.contentaccessdownload+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oipf.contentaccessstreaming+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oipf.cspg-hexbinary": {
    source: "iana"
  },
  "application/vnd.oipf.dae.svg+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oipf.dae.xhtml+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oipf.mippvcontrolmessage+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oipf.pae.gem": {
    source: "iana"
  },
  "application/vnd.oipf.spdiscovery+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oipf.spdlist+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oipf.ueprofile+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oipf.userprofile+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.olpc-sugar": {
    source: "iana",
    extensions: [
      "xo"
    ]
  },
  "application/vnd.oma-scws-config": {
    source: "iana"
  },
  "application/vnd.oma-scws-http-request": {
    source: "iana"
  },
  "application/vnd.oma-scws-http-response": {
    source: "iana"
  },
  "application/vnd.oma.bcast.associated-procedure-parameter+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.bcast.drm-trigger+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.bcast.imd+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.bcast.ltkm": {
    source: "iana"
  },
  "application/vnd.oma.bcast.notification+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.bcast.provisioningtrigger": {
    source: "iana"
  },
  "application/vnd.oma.bcast.sgboot": {
    source: "iana"
  },
  "application/vnd.oma.bcast.sgdd+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.bcast.sgdu": {
    source: "iana"
  },
  "application/vnd.oma.bcast.simple-symbol-container": {
    source: "iana"
  },
  "application/vnd.oma.bcast.smartcard-trigger+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.bcast.sprov+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.bcast.stkm": {
    source: "iana"
  },
  "application/vnd.oma.cab-address-book+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.cab-feature-handler+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.cab-pcc+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.cab-subs-invite+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.cab-user-prefs+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.dcd": {
    source: "iana"
  },
  "application/vnd.oma.dcdc": {
    source: "iana"
  },
  "application/vnd.oma.dd2+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "dd2"
    ]
  },
  "application/vnd.oma.drm.risd+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.group-usage-list+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.lwm2m+cbor": {
    source: "iana"
  },
  "application/vnd.oma.lwm2m+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.lwm2m+tlv": {
    source: "iana"
  },
  "application/vnd.oma.pal+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.poc.detailed-progress-report+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.poc.final-report+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.poc.groups+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.poc.invocation-descriptor+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.poc.optimized-progress-report+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.push": {
    source: "iana"
  },
  "application/vnd.oma.scidm.messages+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oma.xcap-directory+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.omads-email+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/vnd.omads-file+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/vnd.omads-folder+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/vnd.omaloc-supl-init": {
    source: "iana"
  },
  "application/vnd.onepager": {
    source: "iana"
  },
  "application/vnd.onepagertamp": {
    source: "iana"
  },
  "application/vnd.onepagertamx": {
    source: "iana"
  },
  "application/vnd.onepagertat": {
    source: "iana"
  },
  "application/vnd.onepagertatp": {
    source: "iana"
  },
  "application/vnd.onepagertatx": {
    source: "iana"
  },
  "application/vnd.openblox.game+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "obgx"
    ]
  },
  "application/vnd.openblox.game-binary": {
    source: "iana"
  },
  "application/vnd.openeye.oeb": {
    source: "iana"
  },
  "application/vnd.openofficeorg.extension": {
    source: "apache",
    extensions: [
      "oxt"
    ]
  },
  "application/vnd.openstreetmap.data+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "osm"
    ]
  },
  "application/vnd.opentimestamps.ots": {
    source: "iana"
  },
  "application/vnd.openxmlformats-officedocument.custom-properties+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.customxmlproperties+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.drawing+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.drawingml.chart+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.extended-properties+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.comments+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    source: "iana",
    compressible: false,
    extensions: [
      "pptx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presprops+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slide": {
    source: "iana",
    extensions: [
      "sldx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slide+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow": {
    source: "iana",
    extensions: [
      "ppsx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.tags+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.template": {
    source: "iana",
    extensions: [
      "potx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.template.main+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    source: "iana",
    compressible: false,
    extensions: [
      "xlsx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template": {
    source: "iana",
    extensions: [
      "xltx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.theme+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.themeoverride+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.vmldrawing": {
    source: "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    source: "iana",
    compressible: false,
    extensions: [
      "docx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template": {
    source: "iana",
    extensions: [
      "dotx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-package.core-properties+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.openxmlformats-package.relationships+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oracle.resource+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.orange.indata": {
    source: "iana"
  },
  "application/vnd.osa.netdeploy": {
    source: "iana"
  },
  "application/vnd.osgeo.mapguide.package": {
    source: "iana",
    extensions: [
      "mgp"
    ]
  },
  "application/vnd.osgi.bundle": {
    source: "iana"
  },
  "application/vnd.osgi.dp": {
    source: "iana",
    extensions: [
      "dp"
    ]
  },
  "application/vnd.osgi.subsystem": {
    source: "iana",
    extensions: [
      "esa"
    ]
  },
  "application/vnd.otps.ct-kip+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.oxli.countgraph": {
    source: "iana"
  },
  "application/vnd.pagerduty+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.palm": {
    source: "iana",
    extensions: [
      "pdb",
      "pqa",
      "oprc"
    ]
  },
  "application/vnd.panoply": {
    source: "iana"
  },
  "application/vnd.paos.xml": {
    source: "iana"
  },
  "application/vnd.patentdive": {
    source: "iana"
  },
  "application/vnd.patientecommsdoc": {
    source: "iana"
  },
  "application/vnd.pawaafile": {
    source: "iana",
    extensions: [
      "paw"
    ]
  },
  "application/vnd.pcos": {
    source: "iana"
  },
  "application/vnd.pg.format": {
    source: "iana",
    extensions: [
      "str"
    ]
  },
  "application/vnd.pg.osasli": {
    source: "iana",
    extensions: [
      "ei6"
    ]
  },
  "application/vnd.piaccess.application-licence": {
    source: "iana"
  },
  "application/vnd.picsel": {
    source: "iana",
    extensions: [
      "efif"
    ]
  },
  "application/vnd.pmi.widget": {
    source: "iana",
    extensions: [
      "wg"
    ]
  },
  "application/vnd.poc.group-advertisement+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.pocketlearn": {
    source: "iana",
    extensions: [
      "plf"
    ]
  },
  "application/vnd.powerbuilder6": {
    source: "iana",
    extensions: [
      "pbd"
    ]
  },
  "application/vnd.powerbuilder6-s": {
    source: "iana"
  },
  "application/vnd.powerbuilder7": {
    source: "iana"
  },
  "application/vnd.powerbuilder7-s": {
    source: "iana"
  },
  "application/vnd.powerbuilder75": {
    source: "iana"
  },
  "application/vnd.powerbuilder75-s": {
    source: "iana"
  },
  "application/vnd.preminet": {
    source: "iana"
  },
  "application/vnd.previewsystems.box": {
    source: "iana",
    extensions: [
      "box"
    ]
  },
  "application/vnd.proteus.magazine": {
    source: "iana",
    extensions: [
      "mgz"
    ]
  },
  "application/vnd.psfs": {
    source: "iana"
  },
  "application/vnd.publishare-delta-tree": {
    source: "iana",
    extensions: [
      "qps"
    ]
  },
  "application/vnd.pvi.ptid1": {
    source: "iana",
    extensions: [
      "ptid"
    ]
  },
  "application/vnd.pwg-multiplexed": {
    source: "iana"
  },
  "application/vnd.pwg-xhtml-print+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.qualcomm.brew-app-res": {
    source: "iana"
  },
  "application/vnd.quarantainenet": {
    source: "iana"
  },
  "application/vnd.quark.quarkxpress": {
    source: "iana",
    extensions: [
      "qxd",
      "qxt",
      "qwd",
      "qwt",
      "qxl",
      "qxb"
    ]
  },
  "application/vnd.quobject-quoxdocument": {
    source: "iana"
  },
  "application/vnd.radisys.moml+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.radisys.msml+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.radisys.msml-audit+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.radisys.msml-audit-conf+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.radisys.msml-audit-conn+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.radisys.msml-audit-dialog+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.radisys.msml-audit-stream+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.radisys.msml-conf+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.radisys.msml-dialog+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.radisys.msml-dialog-base+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.radisys.msml-dialog-fax-detect+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.radisys.msml-dialog-fax-sendrecv+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.radisys.msml-dialog-group+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.radisys.msml-dialog-speech+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.radisys.msml-dialog-transform+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.rainstor.data": {
    source: "iana"
  },
  "application/vnd.rapid": {
    source: "iana"
  },
  "application/vnd.rar": {
    source: "iana",
    extensions: [
      "rar"
    ]
  },
  "application/vnd.realvnc.bed": {
    source: "iana",
    extensions: [
      "bed"
    ]
  },
  "application/vnd.recordare.musicxml": {
    source: "iana",
    extensions: [
      "mxl"
    ]
  },
  "application/vnd.recordare.musicxml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "musicxml"
    ]
  },
  "application/vnd.renlearn.rlprint": {
    source: "iana"
  },
  "application/vnd.resilient.logic": {
    source: "iana"
  },
  "application/vnd.restful+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.rig.cryptonote": {
    source: "iana",
    extensions: [
      "cryptonote"
    ]
  },
  "application/vnd.rim.cod": {
    source: "apache",
    extensions: [
      "cod"
    ]
  },
  "application/vnd.rn-realmedia": {
    source: "apache",
    extensions: [
      "rm"
    ]
  },
  "application/vnd.rn-realmedia-vbr": {
    source: "apache",
    extensions: [
      "rmvb"
    ]
  },
  "application/vnd.route66.link66+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "link66"
    ]
  },
  "application/vnd.rs-274x": {
    source: "iana"
  },
  "application/vnd.ruckus.download": {
    source: "iana"
  },
  "application/vnd.s3sms": {
    source: "iana"
  },
  "application/vnd.sailingtracker.track": {
    source: "iana",
    extensions: [
      "st"
    ]
  },
  "application/vnd.sar": {
    source: "iana"
  },
  "application/vnd.sbm.cid": {
    source: "iana"
  },
  "application/vnd.sbm.mid2": {
    source: "iana"
  },
  "application/vnd.scribus": {
    source: "iana"
  },
  "application/vnd.sealed.3df": {
    source: "iana"
  },
  "application/vnd.sealed.csf": {
    source: "iana"
  },
  "application/vnd.sealed.doc": {
    source: "iana"
  },
  "application/vnd.sealed.eml": {
    source: "iana"
  },
  "application/vnd.sealed.mht": {
    source: "iana"
  },
  "application/vnd.sealed.net": {
    source: "iana"
  },
  "application/vnd.sealed.ppt": {
    source: "iana"
  },
  "application/vnd.sealed.tiff": {
    source: "iana"
  },
  "application/vnd.sealed.xls": {
    source: "iana"
  },
  "application/vnd.sealedmedia.softseal.html": {
    source: "iana"
  },
  "application/vnd.sealedmedia.softseal.pdf": {
    source: "iana"
  },
  "application/vnd.seemail": {
    source: "iana",
    extensions: [
      "see"
    ]
  },
  "application/vnd.seis+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.sema": {
    source: "iana",
    extensions: [
      "sema"
    ]
  },
  "application/vnd.semd": {
    source: "iana",
    extensions: [
      "semd"
    ]
  },
  "application/vnd.semf": {
    source: "iana",
    extensions: [
      "semf"
    ]
  },
  "application/vnd.shade-save-file": {
    source: "iana"
  },
  "application/vnd.shana.informed.formdata": {
    source: "iana",
    extensions: [
      "ifm"
    ]
  },
  "application/vnd.shana.informed.formtemplate": {
    source: "iana",
    extensions: [
      "itp"
    ]
  },
  "application/vnd.shana.informed.interchange": {
    source: "iana",
    extensions: [
      "iif"
    ]
  },
  "application/vnd.shana.informed.package": {
    source: "iana",
    extensions: [
      "ipk"
    ]
  },
  "application/vnd.shootproof+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.shopkick+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.shp": {
    source: "iana"
  },
  "application/vnd.shx": {
    source: "iana"
  },
  "application/vnd.sigrok.session": {
    source: "iana"
  },
  "application/vnd.simtech-mindmapper": {
    source: "iana",
    extensions: [
      "twd",
      "twds"
    ]
  },
  "application/vnd.siren+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.smaf": {
    source: "iana",
    extensions: [
      "mmf"
    ]
  },
  "application/vnd.smart.notebook": {
    source: "iana"
  },
  "application/vnd.smart.teacher": {
    source: "iana",
    extensions: [
      "teacher"
    ]
  },
  "application/vnd.snesdev-page-table": {
    source: "iana"
  },
  "application/vnd.software602.filler.form+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "fo"
    ]
  },
  "application/vnd.software602.filler.form-xml-zip": {
    source: "iana"
  },
  "application/vnd.solent.sdkm+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "sdkm",
      "sdkd"
    ]
  },
  "application/vnd.spotfire.dxp": {
    source: "iana",
    extensions: [
      "dxp"
    ]
  },
  "application/vnd.spotfire.sfs": {
    source: "iana",
    extensions: [
      "sfs"
    ]
  },
  "application/vnd.sqlite3": {
    source: "iana"
  },
  "application/vnd.sss-cod": {
    source: "iana"
  },
  "application/vnd.sss-dtf": {
    source: "iana"
  },
  "application/vnd.sss-ntf": {
    source: "iana"
  },
  "application/vnd.stardivision.calc": {
    source: "apache",
    extensions: [
      "sdc"
    ]
  },
  "application/vnd.stardivision.draw": {
    source: "apache",
    extensions: [
      "sda"
    ]
  },
  "application/vnd.stardivision.impress": {
    source: "apache",
    extensions: [
      "sdd"
    ]
  },
  "application/vnd.stardivision.math": {
    source: "apache",
    extensions: [
      "smf"
    ]
  },
  "application/vnd.stardivision.writer": {
    source: "apache",
    extensions: [
      "sdw",
      "vor"
    ]
  },
  "application/vnd.stardivision.writer-global": {
    source: "apache",
    extensions: [
      "sgl"
    ]
  },
  "application/vnd.stepmania.package": {
    source: "iana",
    extensions: [
      "smzip"
    ]
  },
  "application/vnd.stepmania.stepchart": {
    source: "iana",
    extensions: [
      "sm"
    ]
  },
  "application/vnd.street-stream": {
    source: "iana"
  },
  "application/vnd.sun.wadl+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "wadl"
    ]
  },
  "application/vnd.sun.xml.calc": {
    source: "apache",
    extensions: [
      "sxc"
    ]
  },
  "application/vnd.sun.xml.calc.template": {
    source: "apache",
    extensions: [
      "stc"
    ]
  },
  "application/vnd.sun.xml.draw": {
    source: "apache",
    extensions: [
      "sxd"
    ]
  },
  "application/vnd.sun.xml.draw.template": {
    source: "apache",
    extensions: [
      "std"
    ]
  },
  "application/vnd.sun.xml.impress": {
    source: "apache",
    extensions: [
      "sxi"
    ]
  },
  "application/vnd.sun.xml.impress.template": {
    source: "apache",
    extensions: [
      "sti"
    ]
  },
  "application/vnd.sun.xml.math": {
    source: "apache",
    extensions: [
      "sxm"
    ]
  },
  "application/vnd.sun.xml.writer": {
    source: "apache",
    extensions: [
      "sxw"
    ]
  },
  "application/vnd.sun.xml.writer.global": {
    source: "apache",
    extensions: [
      "sxg"
    ]
  },
  "application/vnd.sun.xml.writer.template": {
    source: "apache",
    extensions: [
      "stw"
    ]
  },
  "application/vnd.sus-calendar": {
    source: "iana",
    extensions: [
      "sus",
      "susp"
    ]
  },
  "application/vnd.svd": {
    source: "iana",
    extensions: [
      "svd"
    ]
  },
  "application/vnd.swiftview-ics": {
    source: "iana"
  },
  "application/vnd.sycle+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.syft+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.symbian.install": {
    source: "apache",
    extensions: [
      "sis",
      "sisx"
    ]
  },
  "application/vnd.syncml+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true,
    extensions: [
      "xsm"
    ]
  },
  "application/vnd.syncml.dm+wbxml": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "bdm"
    ]
  },
  "application/vnd.syncml.dm+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true,
    extensions: [
      "xdm"
    ]
  },
  "application/vnd.syncml.dm.notification": {
    source: "iana"
  },
  "application/vnd.syncml.dmddf+wbxml": {
    source: "iana"
  },
  "application/vnd.syncml.dmddf+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true,
    extensions: [
      "ddf"
    ]
  },
  "application/vnd.syncml.dmtnds+wbxml": {
    source: "iana"
  },
  "application/vnd.syncml.dmtnds+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: true
  },
  "application/vnd.syncml.ds.notification": {
    source: "iana"
  },
  "application/vnd.tableschema+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.tao.intent-module-archive": {
    source: "iana",
    extensions: [
      "tao"
    ]
  },
  "application/vnd.tcpdump.pcap": {
    source: "iana",
    extensions: [
      "pcap",
      "cap",
      "dmp"
    ]
  },
  "application/vnd.think-cell.ppttc+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.tmd.mediaflex.api+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.tml": {
    source: "iana"
  },
  "application/vnd.tmobile-livetv": {
    source: "iana",
    extensions: [
      "tmo"
    ]
  },
  "application/vnd.tri.onesource": {
    source: "iana"
  },
  "application/vnd.trid.tpt": {
    source: "iana",
    extensions: [
      "tpt"
    ]
  },
  "application/vnd.triscape.mxs": {
    source: "iana",
    extensions: [
      "mxs"
    ]
  },
  "application/vnd.trueapp": {
    source: "iana",
    extensions: [
      "tra"
    ]
  },
  "application/vnd.truedoc": {
    source: "iana"
  },
  "application/vnd.ubisoft.webplayer": {
    source: "iana"
  },
  "application/vnd.ufdl": {
    source: "iana",
    extensions: [
      "ufd",
      "ufdl"
    ]
  },
  "application/vnd.uiq.theme": {
    source: "iana",
    extensions: [
      "utz"
    ]
  },
  "application/vnd.umajin": {
    source: "iana",
    extensions: [
      "umj"
    ]
  },
  "application/vnd.unity": {
    source: "iana",
    extensions: [
      "unityweb"
    ]
  },
  "application/vnd.uoml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "uoml"
    ]
  },
  "application/vnd.uplanet.alert": {
    source: "iana"
  },
  "application/vnd.uplanet.alert-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.bearer-choice": {
    source: "iana"
  },
  "application/vnd.uplanet.bearer-choice-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.cacheop": {
    source: "iana"
  },
  "application/vnd.uplanet.cacheop-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.channel": {
    source: "iana"
  },
  "application/vnd.uplanet.channel-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.list": {
    source: "iana"
  },
  "application/vnd.uplanet.list-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.listcmd": {
    source: "iana"
  },
  "application/vnd.uplanet.listcmd-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.signal": {
    source: "iana"
  },
  "application/vnd.uri-map": {
    source: "iana"
  },
  "application/vnd.valve.source.material": {
    source: "iana"
  },
  "application/vnd.vcx": {
    source: "iana",
    extensions: [
      "vcx"
    ]
  },
  "application/vnd.vd-study": {
    source: "iana"
  },
  "application/vnd.vectorworks": {
    source: "iana"
  },
  "application/vnd.vel+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.verimatrix.vcas": {
    source: "iana"
  },
  "application/vnd.veritone.aion+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.veryant.thin": {
    source: "iana"
  },
  "application/vnd.ves.encrypted": {
    source: "iana"
  },
  "application/vnd.vidsoft.vidconference": {
    source: "iana"
  },
  "application/vnd.visio": {
    source: "iana",
    extensions: [
      "vsd",
      "vst",
      "vss",
      "vsw"
    ]
  },
  "application/vnd.visionary": {
    source: "iana",
    extensions: [
      "vis"
    ]
  },
  "application/vnd.vividence.scriptfile": {
    source: "iana"
  },
  "application/vnd.vsf": {
    source: "iana",
    extensions: [
      "vsf"
    ]
  },
  "application/vnd.wap.sic": {
    source: "iana"
  },
  "application/vnd.wap.slc": {
    source: "iana"
  },
  "application/vnd.wap.wbxml": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "wbxml"
    ]
  },
  "application/vnd.wap.wmlc": {
    source: "iana",
    extensions: [
      "wmlc"
    ]
  },
  "application/vnd.wap.wmlscriptc": {
    source: "iana",
    extensions: [
      "wmlsc"
    ]
  },
  "application/vnd.webturbo": {
    source: "iana",
    extensions: [
      "wtb"
    ]
  },
  "application/vnd.wfa.dpp": {
    source: "iana"
  },
  "application/vnd.wfa.p2p": {
    source: "iana"
  },
  "application/vnd.wfa.wsc": {
    source: "iana"
  },
  "application/vnd.windows.devicepairing": {
    source: "iana"
  },
  "application/vnd.wmc": {
    source: "iana"
  },
  "application/vnd.wmf.bootstrap": {
    source: "iana"
  },
  "application/vnd.wolfram.mathematica": {
    source: "iana"
  },
  "application/vnd.wolfram.mathematica.package": {
    source: "iana"
  },
  "application/vnd.wolfram.player": {
    source: "iana",
    extensions: [
      "nbp"
    ]
  },
  "application/vnd.wordperfect": {
    source: "iana",
    extensions: [
      "wpd"
    ]
  },
  "application/vnd.wqd": {
    source: "iana",
    extensions: [
      "wqd"
    ]
  },
  "application/vnd.wrq-hp3000-labelled": {
    source: "iana"
  },
  "application/vnd.wt.stf": {
    source: "iana",
    extensions: [
      "stf"
    ]
  },
  "application/vnd.wv.csp+wbxml": {
    source: "iana"
  },
  "application/vnd.wv.csp+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.wv.ssp+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.xacml+json": {
    source: "iana",
    compressible: true
  },
  "application/vnd.xara": {
    source: "iana",
    extensions: [
      "xar"
    ]
  },
  "application/vnd.xfdl": {
    source: "iana",
    extensions: [
      "xfdl"
    ]
  },
  "application/vnd.xfdl.webform": {
    source: "iana"
  },
  "application/vnd.xmi+xml": {
    source: "iana",
    compressible: true
  },
  "application/vnd.xmpie.cpkg": {
    source: "iana"
  },
  "application/vnd.xmpie.dpkg": {
    source: "iana"
  },
  "application/vnd.xmpie.plan": {
    source: "iana"
  },
  "application/vnd.xmpie.ppkg": {
    source: "iana"
  },
  "application/vnd.xmpie.xlim": {
    source: "iana"
  },
  "application/vnd.yamaha.hv-dic": {
    source: "iana",
    extensions: [
      "hvd"
    ]
  },
  "application/vnd.yamaha.hv-script": {
    source: "iana",
    extensions: [
      "hvs"
    ]
  },
  "application/vnd.yamaha.hv-voice": {
    source: "iana",
    extensions: [
      "hvp"
    ]
  },
  "application/vnd.yamaha.openscoreformat": {
    source: "iana",
    extensions: [
      "osf"
    ]
  },
  "application/vnd.yamaha.openscoreformat.osfpvg+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "osfpvg"
    ]
  },
  "application/vnd.yamaha.remote-setup": {
    source: "iana"
  },
  "application/vnd.yamaha.smaf-audio": {
    source: "iana",
    extensions: [
      "saf"
    ]
  },
  "application/vnd.yamaha.smaf-phrase": {
    source: "iana",
    extensions: [
      "spf"
    ]
  },
  "application/vnd.yamaha.through-ngn": {
    source: "iana"
  },
  "application/vnd.yamaha.tunnel-udpencap": {
    source: "iana"
  },
  "application/vnd.yaoweme": {
    source: "iana"
  },
  "application/vnd.yellowriver-custom-menu": {
    source: "iana",
    extensions: [
      "cmp"
    ]
  },
  "application/vnd.youtube.yt": {
    source: "iana"
  },
  "application/vnd.zul": {
    source: "iana",
    extensions: [
      "zir",
      "zirz"
    ]
  },
  "application/vnd.zzazz.deck+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "zaz"
    ]
  },
  "application/voicexml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "vxml"
    ]
  },
  "application/voucher-cms+json": {
    source: "iana",
    compressible: true
  },
  "application/vq-rtcpxr": {
    source: "iana"
  },
  "application/wasm": {
    source: "iana",
    compressible: true,
    extensions: [
      "wasm"
    ]
  },
  "application/watcherinfo+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "wif"
    ]
  },
  "application/webpush-options+json": {
    source: "iana",
    compressible: true
  },
  "application/whoispp-query": {
    source: "iana"
  },
  "application/whoispp-response": {
    source: "iana"
  },
  "application/widget": {
    source: "iana",
    extensions: [
      "wgt"
    ]
  },
  "application/winhlp": {
    source: "apache",
    extensions: [
      "hlp"
    ]
  },
  "application/wita": {
    source: "iana"
  },
  "application/wordperfect5.1": {
    source: "iana"
  },
  "application/wsdl+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "wsdl"
    ]
  },
  "application/wspolicy+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "wspolicy"
    ]
  },
  "application/x-7z-compressed": {
    source: "apache",
    compressible: false,
    extensions: [
      "7z"
    ]
  },
  "application/x-abiword": {
    source: "apache",
    extensions: [
      "abw"
    ]
  },
  "application/x-ace-compressed": {
    source: "apache",
    extensions: [
      "ace"
    ]
  },
  "application/x-amf": {
    source: "apache"
  },
  "application/x-apple-diskimage": {
    source: "apache",
    extensions: [
      "dmg"
    ]
  },
  "application/x-arj": {
    compressible: false,
    extensions: [
      "arj"
    ]
  },
  "application/x-authorware-bin": {
    source: "apache",
    extensions: [
      "aab",
      "x32",
      "u32",
      "vox"
    ]
  },
  "application/x-authorware-map": {
    source: "apache",
    extensions: [
      "aam"
    ]
  },
  "application/x-authorware-seg": {
    source: "apache",
    extensions: [
      "aas"
    ]
  },
  "application/x-bcpio": {
    source: "apache",
    extensions: [
      "bcpio"
    ]
  },
  "application/x-bdoc": {
    compressible: false,
    extensions: [
      "bdoc"
    ]
  },
  "application/x-bittorrent": {
    source: "apache",
    extensions: [
      "torrent"
    ]
  },
  "application/x-blorb": {
    source: "apache",
    extensions: [
      "blb",
      "blorb"
    ]
  },
  "application/x-bzip": {
    source: "apache",
    compressible: false,
    extensions: [
      "bz"
    ]
  },
  "application/x-bzip2": {
    source: "apache",
    compressible: false,
    extensions: [
      "bz2",
      "boz"
    ]
  },
  "application/x-cbr": {
    source: "apache",
    extensions: [
      "cbr",
      "cba",
      "cbt",
      "cbz",
      "cb7"
    ]
  },
  "application/x-cdlink": {
    source: "apache",
    extensions: [
      "vcd"
    ]
  },
  "application/x-cfs-compressed": {
    source: "apache",
    extensions: [
      "cfs"
    ]
  },
  "application/x-chat": {
    source: "apache",
    extensions: [
      "chat"
    ]
  },
  "application/x-chess-pgn": {
    source: "apache",
    extensions: [
      "pgn"
    ]
  },
  "application/x-chrome-extension": {
    extensions: [
      "crx"
    ]
  },
  "application/x-cocoa": {
    source: "nginx",
    extensions: [
      "cco"
    ]
  },
  "application/x-compress": {
    source: "apache"
  },
  "application/x-conference": {
    source: "apache",
    extensions: [
      "nsc"
    ]
  },
  "application/x-cpio": {
    source: "apache",
    extensions: [
      "cpio"
    ]
  },
  "application/x-csh": {
    source: "apache",
    extensions: [
      "csh"
    ]
  },
  "application/x-deb": {
    compressible: false
  },
  "application/x-debian-package": {
    source: "apache",
    extensions: [
      "deb",
      "udeb"
    ]
  },
  "application/x-dgc-compressed": {
    source: "apache",
    extensions: [
      "dgc"
    ]
  },
  "application/x-director": {
    source: "apache",
    extensions: [
      "dir",
      "dcr",
      "dxr",
      "cst",
      "cct",
      "cxt",
      "w3d",
      "fgd",
      "swa"
    ]
  },
  "application/x-doom": {
    source: "apache",
    extensions: [
      "wad"
    ]
  },
  "application/x-dtbncx+xml": {
    source: "apache",
    compressible: true,
    extensions: [
      "ncx"
    ]
  },
  "application/x-dtbook+xml": {
    source: "apache",
    compressible: true,
    extensions: [
      "dtb"
    ]
  },
  "application/x-dtbresource+xml": {
    source: "apache",
    compressible: true,
    extensions: [
      "res"
    ]
  },
  "application/x-dvi": {
    source: "apache",
    compressible: false,
    extensions: [
      "dvi"
    ]
  },
  "application/x-envoy": {
    source: "apache",
    extensions: [
      "evy"
    ]
  },
  "application/x-eva": {
    source: "apache",
    extensions: [
      "eva"
    ]
  },
  "application/x-font-bdf": {
    source: "apache",
    extensions: [
      "bdf"
    ]
  },
  "application/x-font-dos": {
    source: "apache"
  },
  "application/x-font-framemaker": {
    source: "apache"
  },
  "application/x-font-ghostscript": {
    source: "apache",
    extensions: [
      "gsf"
    ]
  },
  "application/x-font-libgrx": {
    source: "apache"
  },
  "application/x-font-linux-psf": {
    source: "apache",
    extensions: [
      "psf"
    ]
  },
  "application/x-font-pcf": {
    source: "apache",
    extensions: [
      "pcf"
    ]
  },
  "application/x-font-snf": {
    source: "apache",
    extensions: [
      "snf"
    ]
  },
  "application/x-font-speedo": {
    source: "apache"
  },
  "application/x-font-sunos-news": {
    source: "apache"
  },
  "application/x-font-type1": {
    source: "apache",
    extensions: [
      "pfa",
      "pfb",
      "pfm",
      "afm"
    ]
  },
  "application/x-font-vfont": {
    source: "apache"
  },
  "application/x-freearc": {
    source: "apache",
    extensions: [
      "arc"
    ]
  },
  "application/x-futuresplash": {
    source: "apache",
    extensions: [
      "spl"
    ]
  },
  "application/x-gca-compressed": {
    source: "apache",
    extensions: [
      "gca"
    ]
  },
  "application/x-glulx": {
    source: "apache",
    extensions: [
      "ulx"
    ]
  },
  "application/x-gnumeric": {
    source: "apache",
    extensions: [
      "gnumeric"
    ]
  },
  "application/x-gramps-xml": {
    source: "apache",
    extensions: [
      "gramps"
    ]
  },
  "application/x-gtar": {
    source: "apache",
    extensions: [
      "gtar"
    ]
  },
  "application/x-gzip": {
    source: "apache"
  },
  "application/x-hdf": {
    source: "apache",
    extensions: [
      "hdf"
    ]
  },
  "application/x-httpd-php": {
    compressible: true,
    extensions: [
      "php"
    ]
  },
  "application/x-install-instructions": {
    source: "apache",
    extensions: [
      "install"
    ]
  },
  "application/x-iso9660-image": {
    source: "apache",
    extensions: [
      "iso"
    ]
  },
  "application/x-iwork-keynote-sffkey": {
    extensions: [
      "key"
    ]
  },
  "application/x-iwork-numbers-sffnumbers": {
    extensions: [
      "numbers"
    ]
  },
  "application/x-iwork-pages-sffpages": {
    extensions: [
      "pages"
    ]
  },
  "application/x-java-archive-diff": {
    source: "nginx",
    extensions: [
      "jardiff"
    ]
  },
  "application/x-java-jnlp-file": {
    source: "apache",
    compressible: false,
    extensions: [
      "jnlp"
    ]
  },
  "application/x-javascript": {
    compressible: true
  },
  "application/x-keepass2": {
    extensions: [
      "kdbx"
    ]
  },
  "application/x-latex": {
    source: "apache",
    compressible: false,
    extensions: [
      "latex"
    ]
  },
  "application/x-lua-bytecode": {
    extensions: [
      "luac"
    ]
  },
  "application/x-lzh-compressed": {
    source: "apache",
    extensions: [
      "lzh",
      "lha"
    ]
  },
  "application/x-makeself": {
    source: "nginx",
    extensions: [
      "run"
    ]
  },
  "application/x-mie": {
    source: "apache",
    extensions: [
      "mie"
    ]
  },
  "application/x-mobipocket-ebook": {
    source: "apache",
    extensions: [
      "prc",
      "mobi"
    ]
  },
  "application/x-mpegurl": {
    compressible: false
  },
  "application/x-ms-application": {
    source: "apache",
    extensions: [
      "application"
    ]
  },
  "application/x-ms-shortcut": {
    source: "apache",
    extensions: [
      "lnk"
    ]
  },
  "application/x-ms-wmd": {
    source: "apache",
    extensions: [
      "wmd"
    ]
  },
  "application/x-ms-wmz": {
    source: "apache",
    extensions: [
      "wmz"
    ]
  },
  "application/x-ms-xbap": {
    source: "apache",
    extensions: [
      "xbap"
    ]
  },
  "application/x-msaccess": {
    source: "apache",
    extensions: [
      "mdb"
    ]
  },
  "application/x-msbinder": {
    source: "apache",
    extensions: [
      "obd"
    ]
  },
  "application/x-mscardfile": {
    source: "apache",
    extensions: [
      "crd"
    ]
  },
  "application/x-msclip": {
    source: "apache",
    extensions: [
      "clp"
    ]
  },
  "application/x-msdos-program": {
    extensions: [
      "exe"
    ]
  },
  "application/x-msdownload": {
    source: "apache",
    extensions: [
      "exe",
      "dll",
      "com",
      "bat",
      "msi"
    ]
  },
  "application/x-msmediaview": {
    source: "apache",
    extensions: [
      "mvb",
      "m13",
      "m14"
    ]
  },
  "application/x-msmetafile": {
    source: "apache",
    extensions: [
      "wmf",
      "wmz",
      "emf",
      "emz"
    ]
  },
  "application/x-msmoney": {
    source: "apache",
    extensions: [
      "mny"
    ]
  },
  "application/x-mspublisher": {
    source: "apache",
    extensions: [
      "pub"
    ]
  },
  "application/x-msschedule": {
    source: "apache",
    extensions: [
      "scd"
    ]
  },
  "application/x-msterminal": {
    source: "apache",
    extensions: [
      "trm"
    ]
  },
  "application/x-mswrite": {
    source: "apache",
    extensions: [
      "wri"
    ]
  },
  "application/x-netcdf": {
    source: "apache",
    extensions: [
      "nc",
      "cdf"
    ]
  },
  "application/x-ns-proxy-autoconfig": {
    compressible: true,
    extensions: [
      "pac"
    ]
  },
  "application/x-nzb": {
    source: "apache",
    extensions: [
      "nzb"
    ]
  },
  "application/x-perl": {
    source: "nginx",
    extensions: [
      "pl",
      "pm"
    ]
  },
  "application/x-pilot": {
    source: "nginx",
    extensions: [
      "prc",
      "pdb"
    ]
  },
  "application/x-pkcs12": {
    source: "apache",
    compressible: false,
    extensions: [
      "p12",
      "pfx"
    ]
  },
  "application/x-pkcs7-certificates": {
    source: "apache",
    extensions: [
      "p7b",
      "spc"
    ]
  },
  "application/x-pkcs7-certreqresp": {
    source: "apache",
    extensions: [
      "p7r"
    ]
  },
  "application/x-pki-message": {
    source: "iana"
  },
  "application/x-rar-compressed": {
    source: "apache",
    compressible: false,
    extensions: [
      "rar"
    ]
  },
  "application/x-redhat-package-manager": {
    source: "nginx",
    extensions: [
      "rpm"
    ]
  },
  "application/x-research-info-systems": {
    source: "apache",
    extensions: [
      "ris"
    ]
  },
  "application/x-sea": {
    source: "nginx",
    extensions: [
      "sea"
    ]
  },
  "application/x-sh": {
    source: "apache",
    compressible: true,
    extensions: [
      "sh"
    ]
  },
  "application/x-shar": {
    source: "apache",
    extensions: [
      "shar"
    ]
  },
  "application/x-shockwave-flash": {
    source: "apache",
    compressible: false,
    extensions: [
      "swf"
    ]
  },
  "application/x-silverlight-app": {
    source: "apache",
    extensions: [
      "xap"
    ]
  },
  "application/x-sql": {
    source: "apache",
    extensions: [
      "sql"
    ]
  },
  "application/x-stuffit": {
    source: "apache",
    compressible: false,
    extensions: [
      "sit"
    ]
  },
  "application/x-stuffitx": {
    source: "apache",
    extensions: [
      "sitx"
    ]
  },
  "application/x-subrip": {
    source: "apache",
    extensions: [
      "srt"
    ]
  },
  "application/x-sv4cpio": {
    source: "apache",
    extensions: [
      "sv4cpio"
    ]
  },
  "application/x-sv4crc": {
    source: "apache",
    extensions: [
      "sv4crc"
    ]
  },
  "application/x-t3vm-image": {
    source: "apache",
    extensions: [
      "t3"
    ]
  },
  "application/x-tads": {
    source: "apache",
    extensions: [
      "gam"
    ]
  },
  "application/x-tar": {
    source: "apache",
    compressible: true,
    extensions: [
      "tar"
    ]
  },
  "application/x-tcl": {
    source: "apache",
    extensions: [
      "tcl",
      "tk"
    ]
  },
  "application/x-tex": {
    source: "apache",
    extensions: [
      "tex"
    ]
  },
  "application/x-tex-tfm": {
    source: "apache",
    extensions: [
      "tfm"
    ]
  },
  "application/x-texinfo": {
    source: "apache",
    extensions: [
      "texinfo",
      "texi"
    ]
  },
  "application/x-tgif": {
    source: "apache",
    extensions: [
      "obj"
    ]
  },
  "application/x-ustar": {
    source: "apache",
    extensions: [
      "ustar"
    ]
  },
  "application/x-virtualbox-hdd": {
    compressible: true,
    extensions: [
      "hdd"
    ]
  },
  "application/x-virtualbox-ova": {
    compressible: true,
    extensions: [
      "ova"
    ]
  },
  "application/x-virtualbox-ovf": {
    compressible: true,
    extensions: [
      "ovf"
    ]
  },
  "application/x-virtualbox-vbox": {
    compressible: true,
    extensions: [
      "vbox"
    ]
  },
  "application/x-virtualbox-vbox-extpack": {
    compressible: false,
    extensions: [
      "vbox-extpack"
    ]
  },
  "application/x-virtualbox-vdi": {
    compressible: true,
    extensions: [
      "vdi"
    ]
  },
  "application/x-virtualbox-vhd": {
    compressible: true,
    extensions: [
      "vhd"
    ]
  },
  "application/x-virtualbox-vmdk": {
    compressible: true,
    extensions: [
      "vmdk"
    ]
  },
  "application/x-wais-source": {
    source: "apache",
    extensions: [
      "src"
    ]
  },
  "application/x-web-app-manifest+json": {
    compressible: true,
    extensions: [
      "webapp"
    ]
  },
  "application/x-www-form-urlencoded": {
    source: "iana",
    compressible: true
  },
  "application/x-x509-ca-cert": {
    source: "iana",
    extensions: [
      "der",
      "crt",
      "pem"
    ]
  },
  "application/x-x509-ca-ra-cert": {
    source: "iana"
  },
  "application/x-x509-next-ca-cert": {
    source: "iana"
  },
  "application/x-xfig": {
    source: "apache",
    extensions: [
      "fig"
    ]
  },
  "application/x-xliff+xml": {
    source: "apache",
    compressible: true,
    extensions: [
      "xlf"
    ]
  },
  "application/x-xpinstall": {
    source: "apache",
    compressible: false,
    extensions: [
      "xpi"
    ]
  },
  "application/x-xz": {
    source: "apache",
    extensions: [
      "xz"
    ]
  },
  "application/x-zmachine": {
    source: "apache",
    extensions: [
      "z1",
      "z2",
      "z3",
      "z4",
      "z5",
      "z6",
      "z7",
      "z8"
    ]
  },
  "application/x400-bp": {
    source: "iana"
  },
  "application/xacml+xml": {
    source: "iana",
    compressible: true
  },
  "application/xaml+xml": {
    source: "apache",
    compressible: true,
    extensions: [
      "xaml"
    ]
  },
  "application/xcap-att+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "xav"
    ]
  },
  "application/xcap-caps+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "xca"
    ]
  },
  "application/xcap-diff+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "xdf"
    ]
  },
  "application/xcap-el+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "xel"
    ]
  },
  "application/xcap-error+xml": {
    source: "iana",
    compressible: true
  },
  "application/xcap-ns+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "xns"
    ]
  },
  "application/xcon-conference-info+xml": {
    source: "iana",
    compressible: true
  },
  "application/xcon-conference-info-diff+xml": {
    source: "iana",
    compressible: true
  },
  "application/xenc+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "xenc"
    ]
  },
  "application/xhtml+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "xhtml",
      "xht"
    ]
  },
  "application/xhtml-voice+xml": {
    source: "apache",
    compressible: true
  },
  "application/xliff+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "xlf"
    ]
  },
  "application/xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "xml",
      "xsl",
      "xsd",
      "rng"
    ]
  },
  "application/xml-dtd": {
    source: "iana",
    compressible: true,
    extensions: [
      "dtd"
    ]
  },
  "application/xml-external-parsed-entity": {
    source: "iana"
  },
  "application/xml-patch+xml": {
    source: "iana",
    compressible: true
  },
  "application/xmpp+xml": {
    source: "iana",
    compressible: true
  },
  "application/xop+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "xop"
    ]
  },
  "application/xproc+xml": {
    source: "apache",
    compressible: true,
    extensions: [
      "xpl"
    ]
  },
  "application/xslt+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "xsl",
      "xslt"
    ]
  },
  "application/xspf+xml": {
    source: "apache",
    compressible: true,
    extensions: [
      "xspf"
    ]
  },
  "application/xv+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "mxml",
      "xhvml",
      "xvml",
      "xvm"
    ]
  },
  "application/yang": {
    source: "iana",
    extensions: [
      "yang"
    ]
  },
  "application/yang-data+json": {
    source: "iana",
    compressible: true
  },
  "application/yang-data+xml": {
    source: "iana",
    compressible: true
  },
  "application/yang-patch+json": {
    source: "iana",
    compressible: true
  },
  "application/yang-patch+xml": {
    source: "iana",
    compressible: true
  },
  "application/yin+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "yin"
    ]
  },
  "application/zip": {
    source: "iana",
    compressible: false,
    extensions: [
      "zip"
    ]
  },
  "application/zlib": {
    source: "iana"
  },
  "application/zstd": {
    source: "iana"
  },
  "audio/1d-interleaved-parityfec": {
    source: "iana"
  },
  "audio/32kadpcm": {
    source: "iana"
  },
  "audio/3gpp": {
    source: "iana",
    compressible: false,
    extensions: [
      "3gpp"
    ]
  },
  "audio/3gpp2": {
    source: "iana"
  },
  "audio/aac": {
    source: "iana"
  },
  "audio/ac3": {
    source: "iana"
  },
  "audio/adpcm": {
    source: "apache",
    extensions: [
      "adp"
    ]
  },
  "audio/amr": {
    source: "iana",
    extensions: [
      "amr"
    ]
  },
  "audio/amr-wb": {
    source: "iana"
  },
  "audio/amr-wb+": {
    source: "iana"
  },
  "audio/aptx": {
    source: "iana"
  },
  "audio/asc": {
    source: "iana"
  },
  "audio/atrac-advanced-lossless": {
    source: "iana"
  },
  "audio/atrac-x": {
    source: "iana"
  },
  "audio/atrac3": {
    source: "iana"
  },
  "audio/basic": {
    source: "iana",
    compressible: false,
    extensions: [
      "au",
      "snd"
    ]
  },
  "audio/bv16": {
    source: "iana"
  },
  "audio/bv32": {
    source: "iana"
  },
  "audio/clearmode": {
    source: "iana"
  },
  "audio/cn": {
    source: "iana"
  },
  "audio/dat12": {
    source: "iana"
  },
  "audio/dls": {
    source: "iana"
  },
  "audio/dsr-es201108": {
    source: "iana"
  },
  "audio/dsr-es202050": {
    source: "iana"
  },
  "audio/dsr-es202211": {
    source: "iana"
  },
  "audio/dsr-es202212": {
    source: "iana"
  },
  "audio/dv": {
    source: "iana"
  },
  "audio/dvi4": {
    source: "iana"
  },
  "audio/eac3": {
    source: "iana"
  },
  "audio/encaprtp": {
    source: "iana"
  },
  "audio/evrc": {
    source: "iana"
  },
  "audio/evrc-qcp": {
    source: "iana"
  },
  "audio/evrc0": {
    source: "iana"
  },
  "audio/evrc1": {
    source: "iana"
  },
  "audio/evrcb": {
    source: "iana"
  },
  "audio/evrcb0": {
    source: "iana"
  },
  "audio/evrcb1": {
    source: "iana"
  },
  "audio/evrcnw": {
    source: "iana"
  },
  "audio/evrcnw0": {
    source: "iana"
  },
  "audio/evrcnw1": {
    source: "iana"
  },
  "audio/evrcwb": {
    source: "iana"
  },
  "audio/evrcwb0": {
    source: "iana"
  },
  "audio/evrcwb1": {
    source: "iana"
  },
  "audio/evs": {
    source: "iana"
  },
  "audio/flexfec": {
    source: "iana"
  },
  "audio/fwdred": {
    source: "iana"
  },
  "audio/g711-0": {
    source: "iana"
  },
  "audio/g719": {
    source: "iana"
  },
  "audio/g722": {
    source: "iana"
  },
  "audio/g7221": {
    source: "iana"
  },
  "audio/g723": {
    source: "iana"
  },
  "audio/g726-16": {
    source: "iana"
  },
  "audio/g726-24": {
    source: "iana"
  },
  "audio/g726-32": {
    source: "iana"
  },
  "audio/g726-40": {
    source: "iana"
  },
  "audio/g728": {
    source: "iana"
  },
  "audio/g729": {
    source: "iana"
  },
  "audio/g7291": {
    source: "iana"
  },
  "audio/g729d": {
    source: "iana"
  },
  "audio/g729e": {
    source: "iana"
  },
  "audio/gsm": {
    source: "iana"
  },
  "audio/gsm-efr": {
    source: "iana"
  },
  "audio/gsm-hr-08": {
    source: "iana"
  },
  "audio/ilbc": {
    source: "iana"
  },
  "audio/ip-mr_v2.5": {
    source: "iana"
  },
  "audio/isac": {
    source: "apache"
  },
  "audio/l16": {
    source: "iana"
  },
  "audio/l20": {
    source: "iana"
  },
  "audio/l24": {
    source: "iana",
    compressible: false
  },
  "audio/l8": {
    source: "iana"
  },
  "audio/lpc": {
    source: "iana"
  },
  "audio/melp": {
    source: "iana"
  },
  "audio/melp1200": {
    source: "iana"
  },
  "audio/melp2400": {
    source: "iana"
  },
  "audio/melp600": {
    source: "iana"
  },
  "audio/mhas": {
    source: "iana"
  },
  "audio/midi": {
    source: "apache",
    extensions: [
      "mid",
      "midi",
      "kar",
      "rmi"
    ]
  },
  "audio/mobile-xmf": {
    source: "iana",
    extensions: [
      "mxmf"
    ]
  },
  "audio/mp3": {
    compressible: false,
    extensions: [
      "mp3"
    ]
  },
  "audio/mp4": {
    source: "iana",
    compressible: false,
    extensions: [
      "m4a",
      "mp4a"
    ]
  },
  "audio/mp4a-latm": {
    source: "iana"
  },
  "audio/mpa": {
    source: "iana"
  },
  "audio/mpa-robust": {
    source: "iana"
  },
  "audio/mpeg": {
    source: "iana",
    compressible: false,
    extensions: [
      "mpga",
      "mp2",
      "mp2a",
      "mp3",
      "m2a",
      "m3a"
    ]
  },
  "audio/mpeg4-generic": {
    source: "iana"
  },
  "audio/musepack": {
    source: "apache"
  },
  "audio/ogg": {
    source: "iana",
    compressible: false,
    extensions: [
      "oga",
      "ogg",
      "spx",
      "opus"
    ]
  },
  "audio/opus": {
    source: "iana"
  },
  "audio/parityfec": {
    source: "iana"
  },
  "audio/pcma": {
    source: "iana"
  },
  "audio/pcma-wb": {
    source: "iana"
  },
  "audio/pcmu": {
    source: "iana"
  },
  "audio/pcmu-wb": {
    source: "iana"
  },
  "audio/prs.sid": {
    source: "iana"
  },
  "audio/qcelp": {
    source: "iana"
  },
  "audio/raptorfec": {
    source: "iana"
  },
  "audio/red": {
    source: "iana"
  },
  "audio/rtp-enc-aescm128": {
    source: "iana"
  },
  "audio/rtp-midi": {
    source: "iana"
  },
  "audio/rtploopback": {
    source: "iana"
  },
  "audio/rtx": {
    source: "iana"
  },
  "audio/s3m": {
    source: "apache",
    extensions: [
      "s3m"
    ]
  },
  "audio/scip": {
    source: "iana"
  },
  "audio/silk": {
    source: "apache",
    extensions: [
      "sil"
    ]
  },
  "audio/smv": {
    source: "iana"
  },
  "audio/smv-qcp": {
    source: "iana"
  },
  "audio/smv0": {
    source: "iana"
  },
  "audio/sofa": {
    source: "iana"
  },
  "audio/sp-midi": {
    source: "iana"
  },
  "audio/speex": {
    source: "iana"
  },
  "audio/t140c": {
    source: "iana"
  },
  "audio/t38": {
    source: "iana"
  },
  "audio/telephone-event": {
    source: "iana"
  },
  "audio/tetra_acelp": {
    source: "iana"
  },
  "audio/tetra_acelp_bb": {
    source: "iana"
  },
  "audio/tone": {
    source: "iana"
  },
  "audio/tsvcis": {
    source: "iana"
  },
  "audio/uemclip": {
    source: "iana"
  },
  "audio/ulpfec": {
    source: "iana"
  },
  "audio/usac": {
    source: "iana"
  },
  "audio/vdvi": {
    source: "iana"
  },
  "audio/vmr-wb": {
    source: "iana"
  },
  "audio/vnd.3gpp.iufp": {
    source: "iana"
  },
  "audio/vnd.4sb": {
    source: "iana"
  },
  "audio/vnd.audiokoz": {
    source: "iana"
  },
  "audio/vnd.celp": {
    source: "iana"
  },
  "audio/vnd.cisco.nse": {
    source: "iana"
  },
  "audio/vnd.cmles.radio-events": {
    source: "iana"
  },
  "audio/vnd.cns.anp1": {
    source: "iana"
  },
  "audio/vnd.cns.inf1": {
    source: "iana"
  },
  "audio/vnd.dece.audio": {
    source: "iana",
    extensions: [
      "uva",
      "uvva"
    ]
  },
  "audio/vnd.digital-winds": {
    source: "iana",
    extensions: [
      "eol"
    ]
  },
  "audio/vnd.dlna.adts": {
    source: "iana"
  },
  "audio/vnd.dolby.heaac.1": {
    source: "iana"
  },
  "audio/vnd.dolby.heaac.2": {
    source: "iana"
  },
  "audio/vnd.dolby.mlp": {
    source: "iana"
  },
  "audio/vnd.dolby.mps": {
    source: "iana"
  },
  "audio/vnd.dolby.pl2": {
    source: "iana"
  },
  "audio/vnd.dolby.pl2x": {
    source: "iana"
  },
  "audio/vnd.dolby.pl2z": {
    source: "iana"
  },
  "audio/vnd.dolby.pulse.1": {
    source: "iana"
  },
  "audio/vnd.dra": {
    source: "iana",
    extensions: [
      "dra"
    ]
  },
  "audio/vnd.dts": {
    source: "iana",
    extensions: [
      "dts"
    ]
  },
  "audio/vnd.dts.hd": {
    source: "iana",
    extensions: [
      "dtshd"
    ]
  },
  "audio/vnd.dts.uhd": {
    source: "iana"
  },
  "audio/vnd.dvb.file": {
    source: "iana"
  },
  "audio/vnd.everad.plj": {
    source: "iana"
  },
  "audio/vnd.hns.audio": {
    source: "iana"
  },
  "audio/vnd.lucent.voice": {
    source: "iana",
    extensions: [
      "lvp"
    ]
  },
  "audio/vnd.ms-playready.media.pya": {
    source: "iana",
    extensions: [
      "pya"
    ]
  },
  "audio/vnd.nokia.mobile-xmf": {
    source: "iana"
  },
  "audio/vnd.nortel.vbk": {
    source: "iana"
  },
  "audio/vnd.nuera.ecelp4800": {
    source: "iana",
    extensions: [
      "ecelp4800"
    ]
  },
  "audio/vnd.nuera.ecelp7470": {
    source: "iana",
    extensions: [
      "ecelp7470"
    ]
  },
  "audio/vnd.nuera.ecelp9600": {
    source: "iana",
    extensions: [
      "ecelp9600"
    ]
  },
  "audio/vnd.octel.sbc": {
    source: "iana"
  },
  "audio/vnd.presonus.multitrack": {
    source: "iana"
  },
  "audio/vnd.qcelp": {
    source: "iana"
  },
  "audio/vnd.rhetorex.32kadpcm": {
    source: "iana"
  },
  "audio/vnd.rip": {
    source: "iana",
    extensions: [
      "rip"
    ]
  },
  "audio/vnd.rn-realaudio": {
    compressible: false
  },
  "audio/vnd.sealedmedia.softseal.mpeg": {
    source: "iana"
  },
  "audio/vnd.vmx.cvsd": {
    source: "iana"
  },
  "audio/vnd.wave": {
    compressible: false
  },
  "audio/vorbis": {
    source: "iana",
    compressible: false
  },
  "audio/vorbis-config": {
    source: "iana"
  },
  "audio/wav": {
    compressible: false,
    extensions: [
      "wav"
    ]
  },
  "audio/wave": {
    compressible: false,
    extensions: [
      "wav"
    ]
  },
  "audio/webm": {
    source: "apache",
    compressible: false,
    extensions: [
      "weba"
    ]
  },
  "audio/x-aac": {
    source: "apache",
    compressible: false,
    extensions: [
      "aac"
    ]
  },
  "audio/x-aiff": {
    source: "apache",
    extensions: [
      "aif",
      "aiff",
      "aifc"
    ]
  },
  "audio/x-caf": {
    source: "apache",
    compressible: false,
    extensions: [
      "caf"
    ]
  },
  "audio/x-flac": {
    source: "apache",
    extensions: [
      "flac"
    ]
  },
  "audio/x-m4a": {
    source: "nginx",
    extensions: [
      "m4a"
    ]
  },
  "audio/x-matroska": {
    source: "apache",
    extensions: [
      "mka"
    ]
  },
  "audio/x-mpegurl": {
    source: "apache",
    extensions: [
      "m3u"
    ]
  },
  "audio/x-ms-wax": {
    source: "apache",
    extensions: [
      "wax"
    ]
  },
  "audio/x-ms-wma": {
    source: "apache",
    extensions: [
      "wma"
    ]
  },
  "audio/x-pn-realaudio": {
    source: "apache",
    extensions: [
      "ram",
      "ra"
    ]
  },
  "audio/x-pn-realaudio-plugin": {
    source: "apache",
    extensions: [
      "rmp"
    ]
  },
  "audio/x-realaudio": {
    source: "nginx",
    extensions: [
      "ra"
    ]
  },
  "audio/x-tta": {
    source: "apache"
  },
  "audio/x-wav": {
    source: "apache",
    extensions: [
      "wav"
    ]
  },
  "audio/xm": {
    source: "apache",
    extensions: [
      "xm"
    ]
  },
  "chemical/x-cdx": {
    source: "apache",
    extensions: [
      "cdx"
    ]
  },
  "chemical/x-cif": {
    source: "apache",
    extensions: [
      "cif"
    ]
  },
  "chemical/x-cmdf": {
    source: "apache",
    extensions: [
      "cmdf"
    ]
  },
  "chemical/x-cml": {
    source: "apache",
    extensions: [
      "cml"
    ]
  },
  "chemical/x-csml": {
    source: "apache",
    extensions: [
      "csml"
    ]
  },
  "chemical/x-pdb": {
    source: "apache"
  },
  "chemical/x-xyz": {
    source: "apache",
    extensions: [
      "xyz"
    ]
  },
  "font/collection": {
    source: "iana",
    extensions: [
      "ttc"
    ]
  },
  "font/otf": {
    source: "iana",
    compressible: true,
    extensions: [
      "otf"
    ]
  },
  "font/sfnt": {
    source: "iana"
  },
  "font/ttf": {
    source: "iana",
    compressible: true,
    extensions: [
      "ttf"
    ]
  },
  "font/woff": {
    source: "iana",
    extensions: [
      "woff"
    ]
  },
  "font/woff2": {
    source: "iana",
    extensions: [
      "woff2"
    ]
  },
  "image/aces": {
    source: "iana",
    extensions: [
      "exr"
    ]
  },
  "image/apng": {
    compressible: false,
    extensions: [
      "apng"
    ]
  },
  "image/avci": {
    source: "iana",
    extensions: [
      "avci"
    ]
  },
  "image/avcs": {
    source: "iana",
    extensions: [
      "avcs"
    ]
  },
  "image/avif": {
    source: "iana",
    compressible: false,
    extensions: [
      "avif"
    ]
  },
  "image/bmp": {
    source: "iana",
    compressible: true,
    extensions: [
      "bmp"
    ]
  },
  "image/cgm": {
    source: "iana",
    extensions: [
      "cgm"
    ]
  },
  "image/dicom-rle": {
    source: "iana",
    extensions: [
      "drle"
    ]
  },
  "image/emf": {
    source: "iana",
    extensions: [
      "emf"
    ]
  },
  "image/fits": {
    source: "iana",
    extensions: [
      "fits"
    ]
  },
  "image/g3fax": {
    source: "iana",
    extensions: [
      "g3"
    ]
  },
  "image/gif": {
    source: "iana",
    compressible: false,
    extensions: [
      "gif"
    ]
  },
  "image/heic": {
    source: "iana",
    extensions: [
      "heic"
    ]
  },
  "image/heic-sequence": {
    source: "iana",
    extensions: [
      "heics"
    ]
  },
  "image/heif": {
    source: "iana",
    extensions: [
      "heif"
    ]
  },
  "image/heif-sequence": {
    source: "iana",
    extensions: [
      "heifs"
    ]
  },
  "image/hej2k": {
    source: "iana",
    extensions: [
      "hej2"
    ]
  },
  "image/hsj2": {
    source: "iana",
    extensions: [
      "hsj2"
    ]
  },
  "image/ief": {
    source: "iana",
    extensions: [
      "ief"
    ]
  },
  "image/jls": {
    source: "iana",
    extensions: [
      "jls"
    ]
  },
  "image/jp2": {
    source: "iana",
    compressible: false,
    extensions: [
      "jp2",
      "jpg2"
    ]
  },
  "image/jpeg": {
    source: "iana",
    compressible: false,
    extensions: [
      "jpeg",
      "jpg",
      "jpe"
    ]
  },
  "image/jph": {
    source: "iana",
    extensions: [
      "jph"
    ]
  },
  "image/jphc": {
    source: "iana",
    extensions: [
      "jhc"
    ]
  },
  "image/jpm": {
    source: "iana",
    compressible: false,
    extensions: [
      "jpm"
    ]
  },
  "image/jpx": {
    source: "iana",
    compressible: false,
    extensions: [
      "jpx",
      "jpf"
    ]
  },
  "image/jxr": {
    source: "iana",
    extensions: [
      "jxr"
    ]
  },
  "image/jxra": {
    source: "iana",
    extensions: [
      "jxra"
    ]
  },
  "image/jxrs": {
    source: "iana",
    extensions: [
      "jxrs"
    ]
  },
  "image/jxs": {
    source: "iana",
    extensions: [
      "jxs"
    ]
  },
  "image/jxsc": {
    source: "iana",
    extensions: [
      "jxsc"
    ]
  },
  "image/jxsi": {
    source: "iana",
    extensions: [
      "jxsi"
    ]
  },
  "image/jxss": {
    source: "iana",
    extensions: [
      "jxss"
    ]
  },
  "image/ktx": {
    source: "iana",
    extensions: [
      "ktx"
    ]
  },
  "image/ktx2": {
    source: "iana",
    extensions: [
      "ktx2"
    ]
  },
  "image/naplps": {
    source: "iana"
  },
  "image/pjpeg": {
    compressible: false
  },
  "image/png": {
    source: "iana",
    compressible: false,
    extensions: [
      "png"
    ]
  },
  "image/prs.btif": {
    source: "iana",
    extensions: [
      "btif"
    ]
  },
  "image/prs.pti": {
    source: "iana",
    extensions: [
      "pti"
    ]
  },
  "image/pwg-raster": {
    source: "iana"
  },
  "image/sgi": {
    source: "apache",
    extensions: [
      "sgi"
    ]
  },
  "image/svg+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "svg",
      "svgz"
    ]
  },
  "image/t38": {
    source: "iana",
    extensions: [
      "t38"
    ]
  },
  "image/tiff": {
    source: "iana",
    compressible: false,
    extensions: [
      "tif",
      "tiff"
    ]
  },
  "image/tiff-fx": {
    source: "iana",
    extensions: [
      "tfx"
    ]
  },
  "image/vnd.adobe.photoshop": {
    source: "iana",
    compressible: true,
    extensions: [
      "psd"
    ]
  },
  "image/vnd.airzip.accelerator.azv": {
    source: "iana",
    extensions: [
      "azv"
    ]
  },
  "image/vnd.cns.inf2": {
    source: "iana"
  },
  "image/vnd.dece.graphic": {
    source: "iana",
    extensions: [
      "uvi",
      "uvvi",
      "uvg",
      "uvvg"
    ]
  },
  "image/vnd.djvu": {
    source: "iana",
    extensions: [
      "djvu",
      "djv"
    ]
  },
  "image/vnd.dvb.subtitle": {
    source: "iana",
    extensions: [
      "sub"
    ]
  },
  "image/vnd.dwg": {
    source: "iana",
    extensions: [
      "dwg"
    ]
  },
  "image/vnd.dxf": {
    source: "iana",
    extensions: [
      "dxf"
    ]
  },
  "image/vnd.fastbidsheet": {
    source: "iana",
    extensions: [
      "fbs"
    ]
  },
  "image/vnd.fpx": {
    source: "iana",
    extensions: [
      "fpx"
    ]
  },
  "image/vnd.fst": {
    source: "iana",
    extensions: [
      "fst"
    ]
  },
  "image/vnd.fujixerox.edmics-mmr": {
    source: "iana",
    extensions: [
      "mmr"
    ]
  },
  "image/vnd.fujixerox.edmics-rlc": {
    source: "iana",
    extensions: [
      "rlc"
    ]
  },
  "image/vnd.globalgraphics.pgb": {
    source: "iana"
  },
  "image/vnd.microsoft.icon": {
    source: "iana",
    compressible: true,
    extensions: [
      "ico"
    ]
  },
  "image/vnd.mix": {
    source: "iana"
  },
  "image/vnd.mozilla.apng": {
    source: "iana"
  },
  "image/vnd.ms-dds": {
    compressible: true,
    extensions: [
      "dds"
    ]
  },
  "image/vnd.ms-modi": {
    source: "iana",
    extensions: [
      "mdi"
    ]
  },
  "image/vnd.ms-photo": {
    source: "apache",
    extensions: [
      "wdp"
    ]
  },
  "image/vnd.net-fpx": {
    source: "iana",
    extensions: [
      "npx"
    ]
  },
  "image/vnd.pco.b16": {
    source: "iana",
    extensions: [
      "b16"
    ]
  },
  "image/vnd.radiance": {
    source: "iana"
  },
  "image/vnd.sealed.png": {
    source: "iana"
  },
  "image/vnd.sealedmedia.softseal.gif": {
    source: "iana"
  },
  "image/vnd.sealedmedia.softseal.jpg": {
    source: "iana"
  },
  "image/vnd.svf": {
    source: "iana"
  },
  "image/vnd.tencent.tap": {
    source: "iana",
    extensions: [
      "tap"
    ]
  },
  "image/vnd.valve.source.texture": {
    source: "iana",
    extensions: [
      "vtf"
    ]
  },
  "image/vnd.wap.wbmp": {
    source: "iana",
    extensions: [
      "wbmp"
    ]
  },
  "image/vnd.xiff": {
    source: "iana",
    extensions: [
      "xif"
    ]
  },
  "image/vnd.zbrush.pcx": {
    source: "iana",
    extensions: [
      "pcx"
    ]
  },
  "image/webp": {
    source: "apache",
    extensions: [
      "webp"
    ]
  },
  "image/wmf": {
    source: "iana",
    extensions: [
      "wmf"
    ]
  },
  "image/x-3ds": {
    source: "apache",
    extensions: [
      "3ds"
    ]
  },
  "image/x-cmu-raster": {
    source: "apache",
    extensions: [
      "ras"
    ]
  },
  "image/x-cmx": {
    source: "apache",
    extensions: [
      "cmx"
    ]
  },
  "image/x-freehand": {
    source: "apache",
    extensions: [
      "fh",
      "fhc",
      "fh4",
      "fh5",
      "fh7"
    ]
  },
  "image/x-icon": {
    source: "apache",
    compressible: true,
    extensions: [
      "ico"
    ]
  },
  "image/x-jng": {
    source: "nginx",
    extensions: [
      "jng"
    ]
  },
  "image/x-mrsid-image": {
    source: "apache",
    extensions: [
      "sid"
    ]
  },
  "image/x-ms-bmp": {
    source: "nginx",
    compressible: true,
    extensions: [
      "bmp"
    ]
  },
  "image/x-pcx": {
    source: "apache",
    extensions: [
      "pcx"
    ]
  },
  "image/x-pict": {
    source: "apache",
    extensions: [
      "pic",
      "pct"
    ]
  },
  "image/x-portable-anymap": {
    source: "apache",
    extensions: [
      "pnm"
    ]
  },
  "image/x-portable-bitmap": {
    source: "apache",
    extensions: [
      "pbm"
    ]
  },
  "image/x-portable-graymap": {
    source: "apache",
    extensions: [
      "pgm"
    ]
  },
  "image/x-portable-pixmap": {
    source: "apache",
    extensions: [
      "ppm"
    ]
  },
  "image/x-rgb": {
    source: "apache",
    extensions: [
      "rgb"
    ]
  },
  "image/x-tga": {
    source: "apache",
    extensions: [
      "tga"
    ]
  },
  "image/x-xbitmap": {
    source: "apache",
    extensions: [
      "xbm"
    ]
  },
  "image/x-xcf": {
    compressible: false
  },
  "image/x-xpixmap": {
    source: "apache",
    extensions: [
      "xpm"
    ]
  },
  "image/x-xwindowdump": {
    source: "apache",
    extensions: [
      "xwd"
    ]
  },
  "message/cpim": {
    source: "iana"
  },
  "message/delivery-status": {
    source: "iana"
  },
  "message/disposition-notification": {
    source: "iana",
    extensions: [
      "disposition-notification"
    ]
  },
  "message/external-body": {
    source: "iana"
  },
  "message/feedback-report": {
    source: "iana"
  },
  "message/global": {
    source: "iana",
    extensions: [
      "u8msg"
    ]
  },
  "message/global-delivery-status": {
    source: "iana",
    extensions: [
      "u8dsn"
    ]
  },
  "message/global-disposition-notification": {
    source: "iana",
    extensions: [
      "u8mdn"
    ]
  },
  "message/global-headers": {
    source: "iana",
    extensions: [
      "u8hdr"
    ]
  },
  "message/http": {
    source: "iana",
    compressible: false
  },
  "message/imdn+xml": {
    source: "iana",
    compressible: true
  },
  "message/news": {
    source: "iana"
  },
  "message/partial": {
    source: "iana",
    compressible: false
  },
  "message/rfc822": {
    source: "iana",
    compressible: true,
    extensions: [
      "eml",
      "mime"
    ]
  },
  "message/s-http": {
    source: "iana"
  },
  "message/sip": {
    source: "iana"
  },
  "message/sipfrag": {
    source: "iana"
  },
  "message/tracking-status": {
    source: "iana"
  },
  "message/vnd.si.simp": {
    source: "iana"
  },
  "message/vnd.wfa.wsc": {
    source: "iana",
    extensions: [
      "wsc"
    ]
  },
  "model/3mf": {
    source: "iana",
    extensions: [
      "3mf"
    ]
  },
  "model/e57": {
    source: "iana"
  },
  "model/gltf+json": {
    source: "iana",
    compressible: true,
    extensions: [
      "gltf"
    ]
  },
  "model/gltf-binary": {
    source: "iana",
    compressible: true,
    extensions: [
      "glb"
    ]
  },
  "model/iges": {
    source: "iana",
    compressible: false,
    extensions: [
      "igs",
      "iges"
    ]
  },
  "model/mesh": {
    source: "iana",
    compressible: false,
    extensions: [
      "msh",
      "mesh",
      "silo"
    ]
  },
  "model/mtl": {
    source: "iana",
    extensions: [
      "mtl"
    ]
  },
  "model/obj": {
    source: "iana",
    extensions: [
      "obj"
    ]
  },
  "model/step": {
    source: "iana"
  },
  "model/step+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "stpx"
    ]
  },
  "model/step+zip": {
    source: "iana",
    compressible: false,
    extensions: [
      "stpz"
    ]
  },
  "model/step-xml+zip": {
    source: "iana",
    compressible: false,
    extensions: [
      "stpxz"
    ]
  },
  "model/stl": {
    source: "iana",
    extensions: [
      "stl"
    ]
  },
  "model/vnd.collada+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "dae"
    ]
  },
  "model/vnd.dwf": {
    source: "iana",
    extensions: [
      "dwf"
    ]
  },
  "model/vnd.flatland.3dml": {
    source: "iana"
  },
  "model/vnd.gdl": {
    source: "iana",
    extensions: [
      "gdl"
    ]
  },
  "model/vnd.gs-gdl": {
    source: "apache"
  },
  "model/vnd.gs.gdl": {
    source: "iana"
  },
  "model/vnd.gtw": {
    source: "iana",
    extensions: [
      "gtw"
    ]
  },
  "model/vnd.moml+xml": {
    source: "iana",
    compressible: true
  },
  "model/vnd.mts": {
    source: "iana",
    extensions: [
      "mts"
    ]
  },
  "model/vnd.opengex": {
    source: "iana",
    extensions: [
      "ogex"
    ]
  },
  "model/vnd.parasolid.transmit.binary": {
    source: "iana",
    extensions: [
      "x_b"
    ]
  },
  "model/vnd.parasolid.transmit.text": {
    source: "iana",
    extensions: [
      "x_t"
    ]
  },
  "model/vnd.pytha.pyox": {
    source: "iana"
  },
  "model/vnd.rosette.annotated-data-model": {
    source: "iana"
  },
  "model/vnd.sap.vds": {
    source: "iana",
    extensions: [
      "vds"
    ]
  },
  "model/vnd.usdz+zip": {
    source: "iana",
    compressible: false,
    extensions: [
      "usdz"
    ]
  },
  "model/vnd.valve.source.compiled-map": {
    source: "iana",
    extensions: [
      "bsp"
    ]
  },
  "model/vnd.vtu": {
    source: "iana",
    extensions: [
      "vtu"
    ]
  },
  "model/vrml": {
    source: "iana",
    compressible: false,
    extensions: [
      "wrl",
      "vrml"
    ]
  },
  "model/x3d+binary": {
    source: "apache",
    compressible: false,
    extensions: [
      "x3db",
      "x3dbz"
    ]
  },
  "model/x3d+fastinfoset": {
    source: "iana",
    extensions: [
      "x3db"
    ]
  },
  "model/x3d+vrml": {
    source: "apache",
    compressible: false,
    extensions: [
      "x3dv",
      "x3dvz"
    ]
  },
  "model/x3d+xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "x3d",
      "x3dz"
    ]
  },
  "model/x3d-vrml": {
    source: "iana",
    extensions: [
      "x3dv"
    ]
  },
  "multipart/alternative": {
    source: "iana",
    compressible: false
  },
  "multipart/appledouble": {
    source: "iana"
  },
  "multipart/byteranges": {
    source: "iana"
  },
  "multipart/digest": {
    source: "iana"
  },
  "multipart/encrypted": {
    source: "iana",
    compressible: false
  },
  "multipart/form-data": {
    source: "iana",
    compressible: false
  },
  "multipart/header-set": {
    source: "iana"
  },
  "multipart/mixed": {
    source: "iana"
  },
  "multipart/multilingual": {
    source: "iana"
  },
  "multipart/parallel": {
    source: "iana"
  },
  "multipart/related": {
    source: "iana",
    compressible: false
  },
  "multipart/report": {
    source: "iana"
  },
  "multipart/signed": {
    source: "iana",
    compressible: false
  },
  "multipart/vnd.bint.med-plus": {
    source: "iana"
  },
  "multipart/voice-message": {
    source: "iana"
  },
  "multipart/x-mixed-replace": {
    source: "iana"
  },
  "text/1d-interleaved-parityfec": {
    source: "iana"
  },
  "text/cache-manifest": {
    source: "iana",
    compressible: true,
    extensions: [
      "appcache",
      "manifest"
    ]
  },
  "text/calendar": {
    source: "iana",
    extensions: [
      "ics",
      "ifb"
    ]
  },
  "text/calender": {
    compressible: true
  },
  "text/cmd": {
    compressible: true
  },
  "text/coffeescript": {
    extensions: [
      "coffee",
      "litcoffee"
    ]
  },
  "text/cql": {
    source: "iana"
  },
  "text/cql-expression": {
    source: "iana"
  },
  "text/cql-identifier": {
    source: "iana"
  },
  "text/css": {
    source: "iana",
    charset: "UTF-8",
    compressible: true,
    extensions: [
      "css"
    ]
  },
  "text/csv": {
    source: "iana",
    compressible: true,
    extensions: [
      "csv"
    ]
  },
  "text/csv-schema": {
    source: "iana"
  },
  "text/directory": {
    source: "iana"
  },
  "text/dns": {
    source: "iana"
  },
  "text/ecmascript": {
    source: "iana"
  },
  "text/encaprtp": {
    source: "iana"
  },
  "text/enriched": {
    source: "iana"
  },
  "text/fhirpath": {
    source: "iana"
  },
  "text/flexfec": {
    source: "iana"
  },
  "text/fwdred": {
    source: "iana"
  },
  "text/gff3": {
    source: "iana"
  },
  "text/grammar-ref-list": {
    source: "iana"
  },
  "text/html": {
    source: "iana",
    compressible: true,
    extensions: [
      "html",
      "htm",
      "shtml"
    ]
  },
  "text/jade": {
    extensions: [
      "jade"
    ]
  },
  "text/javascript": {
    source: "iana",
    compressible: true
  },
  "text/jcr-cnd": {
    source: "iana"
  },
  "text/jsx": {
    compressible: true,
    extensions: [
      "jsx"
    ]
  },
  "text/less": {
    compressible: true,
    extensions: [
      "less"
    ]
  },
  "text/markdown": {
    source: "iana",
    compressible: true,
    extensions: [
      "markdown",
      "md"
    ]
  },
  "text/mathml": {
    source: "nginx",
    extensions: [
      "mml"
    ]
  },
  "text/mdx": {
    compressible: true,
    extensions: [
      "mdx"
    ]
  },
  "text/mizar": {
    source: "iana"
  },
  "text/n3": {
    source: "iana",
    charset: "UTF-8",
    compressible: true,
    extensions: [
      "n3"
    ]
  },
  "text/parameters": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/parityfec": {
    source: "iana"
  },
  "text/plain": {
    source: "iana",
    compressible: true,
    extensions: [
      "txt",
      "text",
      "conf",
      "def",
      "list",
      "log",
      "in",
      "ini"
    ]
  },
  "text/provenance-notation": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/prs.fallenstein.rst": {
    source: "iana"
  },
  "text/prs.lines.tag": {
    source: "iana",
    extensions: [
      "dsc"
    ]
  },
  "text/prs.prop.logic": {
    source: "iana"
  },
  "text/raptorfec": {
    source: "iana"
  },
  "text/red": {
    source: "iana"
  },
  "text/rfc822-headers": {
    source: "iana"
  },
  "text/richtext": {
    source: "iana",
    compressible: true,
    extensions: [
      "rtx"
    ]
  },
  "text/rtf": {
    source: "iana",
    compressible: true,
    extensions: [
      "rtf"
    ]
  },
  "text/rtp-enc-aescm128": {
    source: "iana"
  },
  "text/rtploopback": {
    source: "iana"
  },
  "text/rtx": {
    source: "iana"
  },
  "text/sgml": {
    source: "iana",
    extensions: [
      "sgml",
      "sgm"
    ]
  },
  "text/shaclc": {
    source: "iana"
  },
  "text/shex": {
    source: "iana",
    extensions: [
      "shex"
    ]
  },
  "text/slim": {
    extensions: [
      "slim",
      "slm"
    ]
  },
  "text/spdx": {
    source: "iana",
    extensions: [
      "spdx"
    ]
  },
  "text/strings": {
    source: "iana"
  },
  "text/stylus": {
    extensions: [
      "stylus",
      "styl"
    ]
  },
  "text/t140": {
    source: "iana"
  },
  "text/tab-separated-values": {
    source: "iana",
    compressible: true,
    extensions: [
      "tsv"
    ]
  },
  "text/troff": {
    source: "iana",
    extensions: [
      "t",
      "tr",
      "roff",
      "man",
      "me",
      "ms"
    ]
  },
  "text/turtle": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "ttl"
    ]
  },
  "text/ulpfec": {
    source: "iana"
  },
  "text/uri-list": {
    source: "iana",
    compressible: true,
    extensions: [
      "uri",
      "uris",
      "urls"
    ]
  },
  "text/vcard": {
    source: "iana",
    compressible: true,
    extensions: [
      "vcard"
    ]
  },
  "text/vnd.a": {
    source: "iana"
  },
  "text/vnd.abc": {
    source: "iana"
  },
  "text/vnd.ascii-art": {
    source: "iana"
  },
  "text/vnd.curl": {
    source: "iana",
    extensions: [
      "curl"
    ]
  },
  "text/vnd.curl.dcurl": {
    source: "apache",
    extensions: [
      "dcurl"
    ]
  },
  "text/vnd.curl.mcurl": {
    source: "apache",
    extensions: [
      "mcurl"
    ]
  },
  "text/vnd.curl.scurl": {
    source: "apache",
    extensions: [
      "scurl"
    ]
  },
  "text/vnd.debian.copyright": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/vnd.dmclientscript": {
    source: "iana"
  },
  "text/vnd.dvb.subtitle": {
    source: "iana",
    extensions: [
      "sub"
    ]
  },
  "text/vnd.esmertec.theme-descriptor": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/vnd.familysearch.gedcom": {
    source: "iana",
    extensions: [
      "ged"
    ]
  },
  "text/vnd.ficlab.flt": {
    source: "iana"
  },
  "text/vnd.fly": {
    source: "iana",
    extensions: [
      "fly"
    ]
  },
  "text/vnd.fmi.flexstor": {
    source: "iana",
    extensions: [
      "flx"
    ]
  },
  "text/vnd.gml": {
    source: "iana"
  },
  "text/vnd.graphviz": {
    source: "iana",
    extensions: [
      "gv"
    ]
  },
  "text/vnd.hans": {
    source: "iana"
  },
  "text/vnd.hgl": {
    source: "iana"
  },
  "text/vnd.in3d.3dml": {
    source: "iana",
    extensions: [
      "3dml"
    ]
  },
  "text/vnd.in3d.spot": {
    source: "iana",
    extensions: [
      "spot"
    ]
  },
  "text/vnd.iptc.newsml": {
    source: "iana"
  },
  "text/vnd.iptc.nitf": {
    source: "iana"
  },
  "text/vnd.latex-z": {
    source: "iana"
  },
  "text/vnd.motorola.reflex": {
    source: "iana"
  },
  "text/vnd.ms-mediapackage": {
    source: "iana"
  },
  "text/vnd.net2phone.commcenter.command": {
    source: "iana"
  },
  "text/vnd.radisys.msml-basic-layout": {
    source: "iana"
  },
  "text/vnd.senx.warpscript": {
    source: "iana"
  },
  "text/vnd.si.uricatalogue": {
    source: "iana"
  },
  "text/vnd.sosi": {
    source: "iana"
  },
  "text/vnd.sun.j2me.app-descriptor": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "jad"
    ]
  },
  "text/vnd.trolltech.linguist": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/vnd.wap.si": {
    source: "iana"
  },
  "text/vnd.wap.sl": {
    source: "iana"
  },
  "text/vnd.wap.wml": {
    source: "iana",
    extensions: [
      "wml"
    ]
  },
  "text/vnd.wap.wmlscript": {
    source: "iana",
    extensions: [
      "wmls"
    ]
  },
  "text/vtt": {
    source: "iana",
    charset: "UTF-8",
    compressible: true,
    extensions: [
      "vtt"
    ]
  },
  "text/x-asm": {
    source: "apache",
    extensions: [
      "s",
      "asm"
    ]
  },
  "text/x-c": {
    source: "apache",
    extensions: [
      "c",
      "cc",
      "cxx",
      "cpp",
      "h",
      "hh",
      "dic"
    ]
  },
  "text/x-component": {
    source: "nginx",
    extensions: [
      "htc"
    ]
  },
  "text/x-fortran": {
    source: "apache",
    extensions: [
      "f",
      "for",
      "f77",
      "f90"
    ]
  },
  "text/x-gwt-rpc": {
    compressible: true
  },
  "text/x-handlebars-template": {
    extensions: [
      "hbs"
    ]
  },
  "text/x-java-source": {
    source: "apache",
    extensions: [
      "java"
    ]
  },
  "text/x-jquery-tmpl": {
    compressible: true
  },
  "text/x-lua": {
    extensions: [
      "lua"
    ]
  },
  "text/x-markdown": {
    compressible: true,
    extensions: [
      "mkd"
    ]
  },
  "text/x-nfo": {
    source: "apache",
    extensions: [
      "nfo"
    ]
  },
  "text/x-opml": {
    source: "apache",
    extensions: [
      "opml"
    ]
  },
  "text/x-org": {
    compressible: true,
    extensions: [
      "org"
    ]
  },
  "text/x-pascal": {
    source: "apache",
    extensions: [
      "p",
      "pas"
    ]
  },
  "text/x-processing": {
    compressible: true,
    extensions: [
      "pde"
    ]
  },
  "text/x-sass": {
    extensions: [
      "sass"
    ]
  },
  "text/x-scss": {
    extensions: [
      "scss"
    ]
  },
  "text/x-setext": {
    source: "apache",
    extensions: [
      "etx"
    ]
  },
  "text/x-sfv": {
    source: "apache",
    extensions: [
      "sfv"
    ]
  },
  "text/x-suse-ymp": {
    compressible: true,
    extensions: [
      "ymp"
    ]
  },
  "text/x-uuencode": {
    source: "apache",
    extensions: [
      "uu"
    ]
  },
  "text/x-vcalendar": {
    source: "apache",
    extensions: [
      "vcs"
    ]
  },
  "text/x-vcard": {
    source: "apache",
    extensions: [
      "vcf"
    ]
  },
  "text/xml": {
    source: "iana",
    compressible: true,
    extensions: [
      "xml"
    ]
  },
  "text/xml-external-parsed-entity": {
    source: "iana"
  },
  "text/yaml": {
    compressible: true,
    extensions: [
      "yaml",
      "yml"
    ]
  },
  "video/1d-interleaved-parityfec": {
    source: "iana"
  },
  "video/3gpp": {
    source: "iana",
    extensions: [
      "3gp",
      "3gpp"
    ]
  },
  "video/3gpp-tt": {
    source: "iana"
  },
  "video/3gpp2": {
    source: "iana",
    extensions: [
      "3g2"
    ]
  },
  "video/av1": {
    source: "iana"
  },
  "video/bmpeg": {
    source: "iana"
  },
  "video/bt656": {
    source: "iana"
  },
  "video/celb": {
    source: "iana"
  },
  "video/dv": {
    source: "iana"
  },
  "video/encaprtp": {
    source: "iana"
  },
  "video/ffv1": {
    source: "iana"
  },
  "video/flexfec": {
    source: "iana"
  },
  "video/h261": {
    source: "iana",
    extensions: [
      "h261"
    ]
  },
  "video/h263": {
    source: "iana",
    extensions: [
      "h263"
    ]
  },
  "video/h263-1998": {
    source: "iana"
  },
  "video/h263-2000": {
    source: "iana"
  },
  "video/h264": {
    source: "iana",
    extensions: [
      "h264"
    ]
  },
  "video/h264-rcdo": {
    source: "iana"
  },
  "video/h264-svc": {
    source: "iana"
  },
  "video/h265": {
    source: "iana"
  },
  "video/iso.segment": {
    source: "iana",
    extensions: [
      "m4s"
    ]
  },
  "video/jpeg": {
    source: "iana",
    extensions: [
      "jpgv"
    ]
  },
  "video/jpeg2000": {
    source: "iana"
  },
  "video/jpm": {
    source: "apache",
    extensions: [
      "jpm",
      "jpgm"
    ]
  },
  "video/jxsv": {
    source: "iana"
  },
  "video/mj2": {
    source: "iana",
    extensions: [
      "mj2",
      "mjp2"
    ]
  },
  "video/mp1s": {
    source: "iana"
  },
  "video/mp2p": {
    source: "iana"
  },
  "video/mp2t": {
    source: "iana",
    extensions: [
      "ts"
    ]
  },
  "video/mp4": {
    source: "iana",
    compressible: false,
    extensions: [
      "mp4",
      "mp4v",
      "mpg4"
    ]
  },
  "video/mp4v-es": {
    source: "iana"
  },
  "video/mpeg": {
    source: "iana",
    compressible: false,
    extensions: [
      "mpeg",
      "mpg",
      "mpe",
      "m1v",
      "m2v"
    ]
  },
  "video/mpeg4-generic": {
    source: "iana"
  },
  "video/mpv": {
    source: "iana"
  },
  "video/nv": {
    source: "iana"
  },
  "video/ogg": {
    source: "iana",
    compressible: false,
    extensions: [
      "ogv"
    ]
  },
  "video/parityfec": {
    source: "iana"
  },
  "video/pointer": {
    source: "iana"
  },
  "video/quicktime": {
    source: "iana",
    compressible: false,
    extensions: [
      "qt",
      "mov"
    ]
  },
  "video/raptorfec": {
    source: "iana"
  },
  "video/raw": {
    source: "iana"
  },
  "video/rtp-enc-aescm128": {
    source: "iana"
  },
  "video/rtploopback": {
    source: "iana"
  },
  "video/rtx": {
    source: "iana"
  },
  "video/scip": {
    source: "iana"
  },
  "video/smpte291": {
    source: "iana"
  },
  "video/smpte292m": {
    source: "iana"
  },
  "video/ulpfec": {
    source: "iana"
  },
  "video/vc1": {
    source: "iana"
  },
  "video/vc2": {
    source: "iana"
  },
  "video/vnd.cctv": {
    source: "iana"
  },
  "video/vnd.dece.hd": {
    source: "iana",
    extensions: [
      "uvh",
      "uvvh"
    ]
  },
  "video/vnd.dece.mobile": {
    source: "iana",
    extensions: [
      "uvm",
      "uvvm"
    ]
  },
  "video/vnd.dece.mp4": {
    source: "iana"
  },
  "video/vnd.dece.pd": {
    source: "iana",
    extensions: [
      "uvp",
      "uvvp"
    ]
  },
  "video/vnd.dece.sd": {
    source: "iana",
    extensions: [
      "uvs",
      "uvvs"
    ]
  },
  "video/vnd.dece.video": {
    source: "iana",
    extensions: [
      "uvv",
      "uvvv"
    ]
  },
  "video/vnd.directv.mpeg": {
    source: "iana"
  },
  "video/vnd.directv.mpeg-tts": {
    source: "iana"
  },
  "video/vnd.dlna.mpeg-tts": {
    source: "iana"
  },
  "video/vnd.dvb.file": {
    source: "iana",
    extensions: [
      "dvb"
    ]
  },
  "video/vnd.fvt": {
    source: "iana",
    extensions: [
      "fvt"
    ]
  },
  "video/vnd.hns.video": {
    source: "iana"
  },
  "video/vnd.iptvforum.1dparityfec-1010": {
    source: "iana"
  },
  "video/vnd.iptvforum.1dparityfec-2005": {
    source: "iana"
  },
  "video/vnd.iptvforum.2dparityfec-1010": {
    source: "iana"
  },
  "video/vnd.iptvforum.2dparityfec-2005": {
    source: "iana"
  },
  "video/vnd.iptvforum.ttsavc": {
    source: "iana"
  },
  "video/vnd.iptvforum.ttsmpeg2": {
    source: "iana"
  },
  "video/vnd.motorola.video": {
    source: "iana"
  },
  "video/vnd.motorola.videop": {
    source: "iana"
  },
  "video/vnd.mpegurl": {
    source: "iana",
    extensions: [
      "mxu",
      "m4u"
    ]
  },
  "video/vnd.ms-playready.media.pyv": {
    source: "iana",
    extensions: [
      "pyv"
    ]
  },
  "video/vnd.nokia.interleaved-multimedia": {
    source: "iana"
  },
  "video/vnd.nokia.mp4vr": {
    source: "iana"
  },
  "video/vnd.nokia.videovoip": {
    source: "iana"
  },
  "video/vnd.objectvideo": {
    source: "iana"
  },
  "video/vnd.radgamettools.bink": {
    source: "iana"
  },
  "video/vnd.radgamettools.smacker": {
    source: "iana"
  },
  "video/vnd.sealed.mpeg1": {
    source: "iana"
  },
  "video/vnd.sealed.mpeg4": {
    source: "iana"
  },
  "video/vnd.sealed.swf": {
    source: "iana"
  },
  "video/vnd.sealedmedia.softseal.mov": {
    source: "iana"
  },
  "video/vnd.uvvu.mp4": {
    source: "iana",
    extensions: [
      "uvu",
      "uvvu"
    ]
  },
  "video/vnd.vivo": {
    source: "iana",
    extensions: [
      "viv"
    ]
  },
  "video/vnd.youtube.yt": {
    source: "iana"
  },
  "video/vp8": {
    source: "iana"
  },
  "video/vp9": {
    source: "iana"
  },
  "video/webm": {
    source: "apache",
    compressible: false,
    extensions: [
      "webm"
    ]
  },
  "video/x-f4v": {
    source: "apache",
    extensions: [
      "f4v"
    ]
  },
  "video/x-fli": {
    source: "apache",
    extensions: [
      "fli"
    ]
  },
  "video/x-flv": {
    source: "apache",
    compressible: false,
    extensions: [
      "flv"
    ]
  },
  "video/x-m4v": {
    source: "apache",
    extensions: [
      "m4v"
    ]
  },
  "video/x-matroska": {
    source: "apache",
    compressible: false,
    extensions: [
      "mkv",
      "mk3d",
      "mks"
    ]
  },
  "video/x-mng": {
    source: "apache",
    extensions: [
      "mng"
    ]
  },
  "video/x-ms-asf": {
    source: "apache",
    extensions: [
      "asf",
      "asx"
    ]
  },
  "video/x-ms-vob": {
    source: "apache",
    extensions: [
      "vob"
    ]
  },
  "video/x-ms-wm": {
    source: "apache",
    extensions: [
      "wm"
    ]
  },
  "video/x-ms-wmv": {
    source: "apache",
    compressible: false,
    extensions: [
      "wmv"
    ]
  },
  "video/x-ms-wmx": {
    source: "apache",
    extensions: [
      "wmx"
    ]
  },
  "video/x-ms-wvx": {
    source: "apache",
    extensions: [
      "wvx"
    ]
  },
  "video/x-msvideo": {
    source: "apache",
    extensions: [
      "avi"
    ]
  },
  "video/x-sgi-movie": {
    source: "apache",
    extensions: [
      "movie"
    ]
  },
  "video/x-smv": {
    source: "apache",
    extensions: [
      "smv"
    ]
  },
  "x-conference/x-cooltalk": {
    source: "apache",
    extensions: [
      "ice"
    ]
  },
  "x-shader/x-fragment": {
    compressible: true
  },
  "x-shader/x-vertex": {
    compressible: true
  }
};
/*!
 * mime-db
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015-2022 Douglas Christopher Wilson
 * MIT Licensed
 */
var mimeDb = require$$0;
/*!
 * mime-types
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */
(function(exports) {
  var db = mimeDb;
  var extname = path$1.extname;
  var EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/;
  var TEXT_TYPE_REGEXP = /^text\//i;
  exports.charset = charset;
  exports.charsets = { lookup: charset };
  exports.contentType = contentType;
  exports.extension = extension;
  exports.extensions = /* @__PURE__ */ Object.create(null);
  exports.lookup = lookup;
  exports.types = /* @__PURE__ */ Object.create(null);
  populateMaps(exports.extensions, exports.types);
  function charset(type2) {
    if (!type2 || typeof type2 !== "string") {
      return false;
    }
    var match = EXTRACT_TYPE_REGEXP.exec(type2);
    var mime2 = match && db[match[1].toLowerCase()];
    if (mime2 && mime2.charset) {
      return mime2.charset;
    }
    if (match && TEXT_TYPE_REGEXP.test(match[1])) {
      return "UTF-8";
    }
    return false;
  }
  function contentType(str) {
    if (!str || typeof str !== "string") {
      return false;
    }
    var mime2 = str.indexOf("/") === -1 ? exports.lookup(str) : str;
    if (!mime2) {
      return false;
    }
    if (mime2.indexOf("charset") === -1) {
      var charset2 = exports.charset(mime2);
      if (charset2) mime2 += "; charset=" + charset2.toLowerCase();
    }
    return mime2;
  }
  function extension(type2) {
    if (!type2 || typeof type2 !== "string") {
      return false;
    }
    var match = EXTRACT_TYPE_REGEXP.exec(type2);
    var exts = match && exports.extensions[match[1].toLowerCase()];
    if (!exts || !exts.length) {
      return false;
    }
    return exts[0];
  }
  function lookup(path2) {
    if (!path2 || typeof path2 !== "string") {
      return false;
    }
    var extension2 = extname("x." + path2).toLowerCase().substr(1);
    if (!extension2) {
      return false;
    }
    return exports.types[extension2] || false;
  }
  function populateMaps(extensions, types) {
    var preference = ["nginx", "apache", void 0, "iana"];
    Object.keys(db).forEach(function forEachMimeType(type2) {
      var mime2 = db[type2];
      var exts = mime2.extensions;
      if (!exts || !exts.length) {
        return;
      }
      extensions[type2] = exts;
      for (var i = 0; i < exts.length; i++) {
        var extension2 = exts[i];
        if (types[extension2]) {
          var from = preference.indexOf(db[types[extension2]].source);
          var to = preference.indexOf(mime2.source);
          if (types[extension2] !== "application/octet-stream" && (from > to || from === to && types[extension2].substr(0, 12) === "application/")) {
            continue;
          }
        }
        types[extension2] = type2;
      }
    });
  }
})(mimeTypes);
var defer_1 = defer$1;
function defer$1(fn) {
  var nextTick = typeof setImmediate == "function" ? setImmediate : typeof process == "object" && typeof process.nextTick == "function" ? process.nextTick : null;
  if (nextTick) {
    nextTick(fn);
  } else {
    setTimeout(fn, 0);
  }
}
var defer = defer_1;
var async_1 = async$2;
function async$2(callback) {
  var isAsync = false;
  defer(function() {
    isAsync = true;
  });
  return function async_callback(err, result) {
    if (isAsync) {
      callback(err, result);
    } else {
      defer(function nextTick_callback() {
        callback(err, result);
      });
    }
  };
}
var abort_1 = abort$2;
function abort$2(state2) {
  Object.keys(state2.jobs).forEach(clean.bind(state2));
  state2.jobs = {};
}
function clean(key) {
  if (typeof this.jobs[key] == "function") {
    this.jobs[key]();
  }
}
var async$1 = async_1, abort$1 = abort_1;
var iterate_1 = iterate$2;
function iterate$2(list, iterator2, state2, callback) {
  var key = state2["keyedList"] ? state2["keyedList"][state2.index] : state2.index;
  state2.jobs[key] = runJob(iterator2, key, list[key], function(error, output) {
    if (!(key in state2.jobs)) {
      return;
    }
    delete state2.jobs[key];
    if (error) {
      abort$1(state2);
    } else {
      state2.results[key] = output;
    }
    callback(error, state2.results);
  });
}
function runJob(iterator2, key, item, callback) {
  var aborter;
  if (iterator2.length == 2) {
    aborter = iterator2(item, async$1(callback));
  } else {
    aborter = iterator2(item, key, async$1(callback));
  }
  return aborter;
}
var state_1 = state;
function state(list, sortMethod) {
  var isNamedList = !Array.isArray(list), initState2 = {
    index: 0,
    keyedList: isNamedList || sortMethod ? Object.keys(list) : null,
    jobs: {},
    results: isNamedList ? {} : [],
    size: isNamedList ? Object.keys(list).length : list.length
  };
  if (sortMethod) {
    initState2.keyedList.sort(isNamedList ? sortMethod : function(a, b) {
      return sortMethod(list[a], list[b]);
    });
  }
  return initState2;
}
var abort = abort_1, async = async_1;
var terminator_1 = terminator$2;
function terminator$2(callback) {
  if (!Object.keys(this.jobs).length) {
    return;
  }
  this.index = this.size;
  abort(this);
  async(callback)(null, this.results);
}
var iterate$1 = iterate_1, initState$1 = state_1, terminator$1 = terminator_1;
var parallel_1 = parallel;
function parallel(list, iterator2, callback) {
  var state2 = initState$1(list);
  while (state2.index < (state2["keyedList"] || list).length) {
    iterate$1(list, iterator2, state2, function(error, result) {
      if (error) {
        callback(error, result);
        return;
      }
      if (Object.keys(state2.jobs).length === 0) {
        callback(null, state2.results);
        return;
      }
    });
    state2.index++;
  }
  return terminator$1.bind(state2, callback);
}
var serialOrdered$2 = { exports: {} };
var iterate = iterate_1, initState = state_1, terminator = terminator_1;
serialOrdered$2.exports = serialOrdered$1;
serialOrdered$2.exports.ascending = ascending;
serialOrdered$2.exports.descending = descending;
function serialOrdered$1(list, iterator2, sortMethod, callback) {
  var state2 = initState(list, sortMethod);
  iterate(list, iterator2, state2, function iteratorHandler(error, result) {
    if (error) {
      callback(error, result);
      return;
    }
    state2.index++;
    if (state2.index < (state2["keyedList"] || list).length) {
      iterate(list, iterator2, state2, iteratorHandler);
      return;
    }
    callback(null, state2.results);
  });
  return terminator.bind(state2, callback);
}
function ascending(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
function descending(a, b) {
  return -1 * ascending(a, b);
}
var serialOrderedExports = serialOrdered$2.exports;
var serialOrdered = serialOrderedExports;
var serial_1 = serial;
function serial(list, iterator2, callback) {
  return serialOrdered(list, iterator2, null, callback);
}
var asynckit$1 = {
  parallel: parallel_1,
  serial: serial_1,
  serialOrdered: serialOrderedExports
};
var esObjectAtoms = Object;
var esErrors = Error;
var _eval = EvalError;
var range = RangeError;
var ref = ReferenceError;
var syntax = SyntaxError;
var type = TypeError;
var uri = URIError;
var abs$1 = Math.abs;
var floor$1 = Math.floor;
var max$2 = Math.max;
var min$1 = Math.min;
var pow$1 = Math.pow;
var round$1 = Math.round;
var _isNaN = Number.isNaN || function isNaN2(a) {
  return a !== a;
};
var $isNaN = _isNaN;
var sign$1 = function sign(number) {
  if ($isNaN(number) || number === 0) {
    return number;
  }
  return number < 0 ? -1 : 1;
};
var gOPD = Object.getOwnPropertyDescriptor;
var $gOPD$1 = gOPD;
if ($gOPD$1) {
  try {
    $gOPD$1([], "length");
  } catch (e) {
    $gOPD$1 = null;
  }
}
var gopd = $gOPD$1;
var $defineProperty$2 = Object.defineProperty || false;
if ($defineProperty$2) {
  try {
    $defineProperty$2({}, "a", { value: 1 });
  } catch (e) {
    $defineProperty$2 = false;
  }
}
var esDefineProperty = $defineProperty$2;
var shams$1;
var hasRequiredShams$1;
function requireShams$1() {
  if (hasRequiredShams$1) return shams$1;
  hasRequiredShams$1 = 1;
  shams$1 = function hasSymbols2() {
    if (typeof Symbol !== "function" || typeof Object.getOwnPropertySymbols !== "function") {
      return false;
    }
    if (typeof Symbol.iterator === "symbol") {
      return true;
    }
    var obj = {};
    var sym = Symbol("test");
    var symObj = Object(sym);
    if (typeof sym === "string") {
      return false;
    }
    if (Object.prototype.toString.call(sym) !== "[object Symbol]") {
      return false;
    }
    if (Object.prototype.toString.call(symObj) !== "[object Symbol]") {
      return false;
    }
    var symVal = 42;
    obj[sym] = symVal;
    for (var _ in obj) {
      return false;
    }
    if (typeof Object.keys === "function" && Object.keys(obj).length !== 0) {
      return false;
    }
    if (typeof Object.getOwnPropertyNames === "function" && Object.getOwnPropertyNames(obj).length !== 0) {
      return false;
    }
    var syms = Object.getOwnPropertySymbols(obj);
    if (syms.length !== 1 || syms[0] !== sym) {
      return false;
    }
    if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) {
      return false;
    }
    if (typeof Object.getOwnPropertyDescriptor === "function") {
      var descriptor = (
        /** @type {PropertyDescriptor} */
        Object.getOwnPropertyDescriptor(obj, sym)
      );
      if (descriptor.value !== symVal || descriptor.enumerable !== true) {
        return false;
      }
    }
    return true;
  };
  return shams$1;
}
var hasSymbols$1;
var hasRequiredHasSymbols;
function requireHasSymbols() {
  if (hasRequiredHasSymbols) return hasSymbols$1;
  hasRequiredHasSymbols = 1;
  var origSymbol = typeof Symbol !== "undefined" && Symbol;
  var hasSymbolSham = requireShams$1();
  hasSymbols$1 = function hasNativeSymbols() {
    if (typeof origSymbol !== "function") {
      return false;
    }
    if (typeof Symbol !== "function") {
      return false;
    }
    if (typeof origSymbol("foo") !== "symbol") {
      return false;
    }
    if (typeof Symbol("bar") !== "symbol") {
      return false;
    }
    return hasSymbolSham();
  };
  return hasSymbols$1;
}
var Reflect_getPrototypeOf;
var hasRequiredReflect_getPrototypeOf;
function requireReflect_getPrototypeOf() {
  if (hasRequiredReflect_getPrototypeOf) return Reflect_getPrototypeOf;
  hasRequiredReflect_getPrototypeOf = 1;
  Reflect_getPrototypeOf = typeof Reflect !== "undefined" && Reflect.getPrototypeOf || null;
  return Reflect_getPrototypeOf;
}
var Object_getPrototypeOf;
var hasRequiredObject_getPrototypeOf;
function requireObject_getPrototypeOf() {
  if (hasRequiredObject_getPrototypeOf) return Object_getPrototypeOf;
  hasRequiredObject_getPrototypeOf = 1;
  var $Object2 = esObjectAtoms;
  Object_getPrototypeOf = $Object2.getPrototypeOf || null;
  return Object_getPrototypeOf;
}
var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ";
var toStr = Object.prototype.toString;
var max$1 = Math.max;
var funcType = "[object Function]";
var concatty = function concatty2(a, b) {
  var arr = [];
  for (var i = 0; i < a.length; i += 1) {
    arr[i] = a[i];
  }
  for (var j = 0; j < b.length; j += 1) {
    arr[j + a.length] = b[j];
  }
  return arr;
};
var slicy = function slicy2(arrLike, offset) {
  var arr = [];
  for (var i = offset, j = 0; i < arrLike.length; i += 1, j += 1) {
    arr[j] = arrLike[i];
  }
  return arr;
};
var joiny = function(arr, joiner) {
  var str = "";
  for (var i = 0; i < arr.length; i += 1) {
    str += arr[i];
    if (i + 1 < arr.length) {
      str += joiner;
    }
  }
  return str;
};
var implementation$1 = function bind(that) {
  var target = this;
  if (typeof target !== "function" || toStr.apply(target) !== funcType) {
    throw new TypeError(ERROR_MESSAGE + target);
  }
  var args = slicy(arguments, 1);
  var bound;
  var binder = function() {
    if (this instanceof bound) {
      var result = target.apply(
        this,
        concatty(args, arguments)
      );
      if (Object(result) === result) {
        return result;
      }
      return this;
    }
    return target.apply(
      that,
      concatty(args, arguments)
    );
  };
  var boundLength = max$1(0, target.length - args.length);
  var boundArgs = [];
  for (var i = 0; i < boundLength; i++) {
    boundArgs[i] = "$" + i;
  }
  bound = Function("binder", "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }")(binder);
  if (target.prototype) {
    var Empty = function Empty2() {
    };
    Empty.prototype = target.prototype;
    bound.prototype = new Empty();
    Empty.prototype = null;
  }
  return bound;
};
var implementation = implementation$1;
var functionBind = Function.prototype.bind || implementation;
var functionCall;
var hasRequiredFunctionCall;
function requireFunctionCall() {
  if (hasRequiredFunctionCall) return functionCall;
  hasRequiredFunctionCall = 1;
  functionCall = Function.prototype.call;
  return functionCall;
}
var functionApply;
var hasRequiredFunctionApply;
function requireFunctionApply() {
  if (hasRequiredFunctionApply) return functionApply;
  hasRequiredFunctionApply = 1;
  functionApply = Function.prototype.apply;
  return functionApply;
}
var reflectApply;
var hasRequiredReflectApply;
function requireReflectApply() {
  if (hasRequiredReflectApply) return reflectApply;
  hasRequiredReflectApply = 1;
  reflectApply = typeof Reflect !== "undefined" && Reflect && Reflect.apply;
  return reflectApply;
}
var actualApply;
var hasRequiredActualApply;
function requireActualApply() {
  if (hasRequiredActualApply) return actualApply;
  hasRequiredActualApply = 1;
  var bind3 = functionBind;
  var $apply2 = requireFunctionApply();
  var $call2 = requireFunctionCall();
  var $reflectApply = requireReflectApply();
  actualApply = $reflectApply || bind3.call($call2, $apply2);
  return actualApply;
}
var callBindApplyHelpers;
var hasRequiredCallBindApplyHelpers;
function requireCallBindApplyHelpers() {
  if (hasRequiredCallBindApplyHelpers) return callBindApplyHelpers;
  hasRequiredCallBindApplyHelpers = 1;
  var bind3 = functionBind;
  var $TypeError2 = type;
  var $call2 = requireFunctionCall();
  var $actualApply = requireActualApply();
  callBindApplyHelpers = function callBindBasic(args) {
    if (args.length < 1 || typeof args[0] !== "function") {
      throw new $TypeError2("a function is required");
    }
    return $actualApply(bind3, $call2, args);
  };
  return callBindApplyHelpers;
}
var get;
var hasRequiredGet;
function requireGet() {
  if (hasRequiredGet) return get;
  hasRequiredGet = 1;
  var callBind = requireCallBindApplyHelpers();
  var gOPD2 = gopd;
  var hasProtoAccessor;
  try {
    hasProtoAccessor = /** @type {{ __proto__?: typeof Array.prototype }} */
    [].__proto__ === Array.prototype;
  } catch (e) {
    if (!e || typeof e !== "object" || !("code" in e) || e.code !== "ERR_PROTO_ACCESS") {
      throw e;
    }
  }
  var desc = !!hasProtoAccessor && gOPD2 && gOPD2(
    Object.prototype,
    /** @type {keyof typeof Object.prototype} */
    "__proto__"
  );
  var $Object2 = Object;
  var $getPrototypeOf = $Object2.getPrototypeOf;
  get = desc && typeof desc.get === "function" ? callBind([desc.get]) : typeof $getPrototypeOf === "function" ? (
    /** @type {import('./get')} */
    function getDunder(value) {
      return $getPrototypeOf(value == null ? value : $Object2(value));
    }
  ) : false;
  return get;
}
var getProto$1;
var hasRequiredGetProto;
function requireGetProto() {
  if (hasRequiredGetProto) return getProto$1;
  hasRequiredGetProto = 1;
  var reflectGetProto = requireReflect_getPrototypeOf();
  var originalGetProto = requireObject_getPrototypeOf();
  var getDunderProto = requireGet();
  getProto$1 = reflectGetProto ? function getProto2(O) {
    return reflectGetProto(O);
  } : originalGetProto ? function getProto2(O) {
    if (!O || typeof O !== "object" && typeof O !== "function") {
      throw new TypeError("getProto: not an object");
    }
    return originalGetProto(O);
  } : getDunderProto ? function getProto2(O) {
    return getDunderProto(O);
  } : null;
  return getProto$1;
}
var call = Function.prototype.call;
var $hasOwn = Object.prototype.hasOwnProperty;
var bind$1 = functionBind;
var hasown = bind$1.call(call, $hasOwn);
var undefined$1;
var $Object = esObjectAtoms;
var $Error = esErrors;
var $EvalError = _eval;
var $RangeError = range;
var $ReferenceError = ref;
var $SyntaxError = syntax;
var $TypeError$1 = type;
var $URIError = uri;
var abs = abs$1;
var floor = floor$1;
var max = max$2;
var min = min$1;
var pow = pow$1;
var round = round$1;
var sign2 = sign$1;
var $Function = Function;
var getEvalledConstructor = function(expressionSyntax) {
  try {
    return $Function('"use strict"; return (' + expressionSyntax + ").constructor;")();
  } catch (e) {
  }
};
var $gOPD = gopd;
var $defineProperty$1 = esDefineProperty;
var throwTypeError = function() {
  throw new $TypeError$1();
};
var ThrowTypeError = $gOPD ? function() {
  try {
    arguments.callee;
    return throwTypeError;
  } catch (calleeThrows) {
    try {
      return $gOPD(arguments, "callee").get;
    } catch (gOPDthrows) {
      return throwTypeError;
    }
  }
}() : throwTypeError;
var hasSymbols = requireHasSymbols()();
var getProto = requireGetProto();
var $ObjectGPO = requireObject_getPrototypeOf();
var $ReflectGPO = requireReflect_getPrototypeOf();
var $apply = requireFunctionApply();
var $call = requireFunctionCall();
var needsEval = {};
var TypedArray = typeof Uint8Array === "undefined" || !getProto ? undefined$1 : getProto(Uint8Array);
var INTRINSICS = {
  __proto__: null,
  "%AggregateError%": typeof AggregateError === "undefined" ? undefined$1 : AggregateError,
  "%Array%": Array,
  "%ArrayBuffer%": typeof ArrayBuffer === "undefined" ? undefined$1 : ArrayBuffer,
  "%ArrayIteratorPrototype%": hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined$1,
  "%AsyncFromSyncIteratorPrototype%": undefined$1,
  "%AsyncFunction%": needsEval,
  "%AsyncGenerator%": needsEval,
  "%AsyncGeneratorFunction%": needsEval,
  "%AsyncIteratorPrototype%": needsEval,
  "%Atomics%": typeof Atomics === "undefined" ? undefined$1 : Atomics,
  "%BigInt%": typeof BigInt === "undefined" ? undefined$1 : BigInt,
  "%BigInt64Array%": typeof BigInt64Array === "undefined" ? undefined$1 : BigInt64Array,
  "%BigUint64Array%": typeof BigUint64Array === "undefined" ? undefined$1 : BigUint64Array,
  "%Boolean%": Boolean,
  "%DataView%": typeof DataView === "undefined" ? undefined$1 : DataView,
  "%Date%": Date,
  "%decodeURI%": decodeURI,
  "%decodeURIComponent%": decodeURIComponent,
  "%encodeURI%": encodeURI,
  "%encodeURIComponent%": encodeURIComponent,
  "%Error%": $Error,
  "%eval%": eval,
  // eslint-disable-line no-eval
  "%EvalError%": $EvalError,
  "%Float16Array%": typeof Float16Array === "undefined" ? undefined$1 : Float16Array,
  "%Float32Array%": typeof Float32Array === "undefined" ? undefined$1 : Float32Array,
  "%Float64Array%": typeof Float64Array === "undefined" ? undefined$1 : Float64Array,
  "%FinalizationRegistry%": typeof FinalizationRegistry === "undefined" ? undefined$1 : FinalizationRegistry,
  "%Function%": $Function,
  "%GeneratorFunction%": needsEval,
  "%Int8Array%": typeof Int8Array === "undefined" ? undefined$1 : Int8Array,
  "%Int16Array%": typeof Int16Array === "undefined" ? undefined$1 : Int16Array,
  "%Int32Array%": typeof Int32Array === "undefined" ? undefined$1 : Int32Array,
  "%isFinite%": isFinite,
  "%isNaN%": isNaN,
  "%IteratorPrototype%": hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined$1,
  "%JSON%": typeof JSON === "object" ? JSON : undefined$1,
  "%Map%": typeof Map === "undefined" ? undefined$1 : Map,
  "%MapIteratorPrototype%": typeof Map === "undefined" || !hasSymbols || !getProto ? undefined$1 : getProto((/* @__PURE__ */ new Map())[Symbol.iterator]()),
  "%Math%": Math,
  "%Number%": Number,
  "%Object%": $Object,
  "%Object.getOwnPropertyDescriptor%": $gOPD,
  "%parseFloat%": parseFloat,
  "%parseInt%": parseInt,
  "%Promise%": typeof Promise === "undefined" ? undefined$1 : Promise,
  "%Proxy%": typeof Proxy === "undefined" ? undefined$1 : Proxy,
  "%RangeError%": $RangeError,
  "%ReferenceError%": $ReferenceError,
  "%Reflect%": typeof Reflect === "undefined" ? undefined$1 : Reflect,
  "%RegExp%": RegExp,
  "%Set%": typeof Set === "undefined" ? undefined$1 : Set,
  "%SetIteratorPrototype%": typeof Set === "undefined" || !hasSymbols || !getProto ? undefined$1 : getProto((/* @__PURE__ */ new Set())[Symbol.iterator]()),
  "%SharedArrayBuffer%": typeof SharedArrayBuffer === "undefined" ? undefined$1 : SharedArrayBuffer,
  "%String%": String,
  "%StringIteratorPrototype%": hasSymbols && getProto ? getProto(""[Symbol.iterator]()) : undefined$1,
  "%Symbol%": hasSymbols ? Symbol : undefined$1,
  "%SyntaxError%": $SyntaxError,
  "%ThrowTypeError%": ThrowTypeError,
  "%TypedArray%": TypedArray,
  "%TypeError%": $TypeError$1,
  "%Uint8Array%": typeof Uint8Array === "undefined" ? undefined$1 : Uint8Array,
  "%Uint8ClampedArray%": typeof Uint8ClampedArray === "undefined" ? undefined$1 : Uint8ClampedArray,
  "%Uint16Array%": typeof Uint16Array === "undefined" ? undefined$1 : Uint16Array,
  "%Uint32Array%": typeof Uint32Array === "undefined" ? undefined$1 : Uint32Array,
  "%URIError%": $URIError,
  "%WeakMap%": typeof WeakMap === "undefined" ? undefined$1 : WeakMap,
  "%WeakRef%": typeof WeakRef === "undefined" ? undefined$1 : WeakRef,
  "%WeakSet%": typeof WeakSet === "undefined" ? undefined$1 : WeakSet,
  "%Function.prototype.call%": $call,
  "%Function.prototype.apply%": $apply,
  "%Object.defineProperty%": $defineProperty$1,
  "%Object.getPrototypeOf%": $ObjectGPO,
  "%Math.abs%": abs,
  "%Math.floor%": floor,
  "%Math.max%": max,
  "%Math.min%": min,
  "%Math.pow%": pow,
  "%Math.round%": round,
  "%Math.sign%": sign2,
  "%Reflect.getPrototypeOf%": $ReflectGPO
};
if (getProto) {
  try {
    null.error;
  } catch (e) {
    var errorProto = getProto(getProto(e));
    INTRINSICS["%Error.prototype%"] = errorProto;
  }
}
var doEval = function doEval2(name) {
  var value;
  if (name === "%AsyncFunction%") {
    value = getEvalledConstructor("async function () {}");
  } else if (name === "%GeneratorFunction%") {
    value = getEvalledConstructor("function* () {}");
  } else if (name === "%AsyncGeneratorFunction%") {
    value = getEvalledConstructor("async function* () {}");
  } else if (name === "%AsyncGenerator%") {
    var fn = doEval2("%AsyncGeneratorFunction%");
    if (fn) {
      value = fn.prototype;
    }
  } else if (name === "%AsyncIteratorPrototype%") {
    var gen = doEval2("%AsyncGenerator%");
    if (gen && getProto) {
      value = getProto(gen.prototype);
    }
  }
  INTRINSICS[name] = value;
  return value;
};
var LEGACY_ALIASES = {
  __proto__: null,
  "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
  "%ArrayPrototype%": ["Array", "prototype"],
  "%ArrayProto_entries%": ["Array", "prototype", "entries"],
  "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
  "%ArrayProto_keys%": ["Array", "prototype", "keys"],
  "%ArrayProto_values%": ["Array", "prototype", "values"],
  "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
  "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
  "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
  "%BooleanPrototype%": ["Boolean", "prototype"],
  "%DataViewPrototype%": ["DataView", "prototype"],
  "%DatePrototype%": ["Date", "prototype"],
  "%ErrorPrototype%": ["Error", "prototype"],
  "%EvalErrorPrototype%": ["EvalError", "prototype"],
  "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
  "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
  "%FunctionPrototype%": ["Function", "prototype"],
  "%Generator%": ["GeneratorFunction", "prototype"],
  "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
  "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
  "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
  "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
  "%JSONParse%": ["JSON", "parse"],
  "%JSONStringify%": ["JSON", "stringify"],
  "%MapPrototype%": ["Map", "prototype"],
  "%NumberPrototype%": ["Number", "prototype"],
  "%ObjectPrototype%": ["Object", "prototype"],
  "%ObjProto_toString%": ["Object", "prototype", "toString"],
  "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
  "%PromisePrototype%": ["Promise", "prototype"],
  "%PromiseProto_then%": ["Promise", "prototype", "then"],
  "%Promise_all%": ["Promise", "all"],
  "%Promise_reject%": ["Promise", "reject"],
  "%Promise_resolve%": ["Promise", "resolve"],
  "%RangeErrorPrototype%": ["RangeError", "prototype"],
  "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
  "%RegExpPrototype%": ["RegExp", "prototype"],
  "%SetPrototype%": ["Set", "prototype"],
  "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
  "%StringPrototype%": ["String", "prototype"],
  "%SymbolPrototype%": ["Symbol", "prototype"],
  "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
  "%TypedArrayPrototype%": ["TypedArray", "prototype"],
  "%TypeErrorPrototype%": ["TypeError", "prototype"],
  "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
  "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
  "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
  "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
  "%URIErrorPrototype%": ["URIError", "prototype"],
  "%WeakMapPrototype%": ["WeakMap", "prototype"],
  "%WeakSetPrototype%": ["WeakSet", "prototype"]
};
var bind2 = functionBind;
var hasOwn$2 = hasown;
var $concat = bind2.call($call, Array.prototype.concat);
var $spliceApply = bind2.call($apply, Array.prototype.splice);
var $replace = bind2.call($call, String.prototype.replace);
var $strSlice = bind2.call($call, String.prototype.slice);
var $exec = bind2.call($call, RegExp.prototype.exec);
var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var reEscapeChar = /\\(\\)?/g;
var stringToPath = function stringToPath2(string) {
  var first = $strSlice(string, 0, 1);
  var last = $strSlice(string, -1);
  if (first === "%" && last !== "%") {
    throw new $SyntaxError("invalid intrinsic syntax, expected closing `%`");
  } else if (last === "%" && first !== "%") {
    throw new $SyntaxError("invalid intrinsic syntax, expected opening `%`");
  }
  var result = [];
  $replace(string, rePropName, function(match, number, quote, subString) {
    result[result.length] = quote ? $replace(subString, reEscapeChar, "$1") : number || match;
  });
  return result;
};
var getBaseIntrinsic = function getBaseIntrinsic2(name, allowMissing) {
  var intrinsicName = name;
  var alias;
  if (hasOwn$2(LEGACY_ALIASES, intrinsicName)) {
    alias = LEGACY_ALIASES[intrinsicName];
    intrinsicName = "%" + alias[0] + "%";
  }
  if (hasOwn$2(INTRINSICS, intrinsicName)) {
    var value = INTRINSICS[intrinsicName];
    if (value === needsEval) {
      value = doEval(intrinsicName);
    }
    if (typeof value === "undefined" && !allowMissing) {
      throw new $TypeError$1("intrinsic " + name + " exists, but is not available. Please file an issue!");
    }
    return {
      alias,
      name: intrinsicName,
      value
    };
  }
  throw new $SyntaxError("intrinsic " + name + " does not exist!");
};
var getIntrinsic = function GetIntrinsic(name, allowMissing) {
  if (typeof name !== "string" || name.length === 0) {
    throw new $TypeError$1("intrinsic name must be a non-empty string");
  }
  if (arguments.length > 1 && typeof allowMissing !== "boolean") {
    throw new $TypeError$1('"allowMissing" argument must be a boolean');
  }
  if ($exec(/^%?[^%]*%?$/, name) === null) {
    throw new $SyntaxError("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
  }
  var parts = stringToPath(name);
  var intrinsicBaseName = parts.length > 0 ? parts[0] : "";
  var intrinsic = getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing);
  var intrinsicRealName = intrinsic.name;
  var value = intrinsic.value;
  var skipFurtherCaching = false;
  var alias = intrinsic.alias;
  if (alias) {
    intrinsicBaseName = alias[0];
    $spliceApply(parts, $concat([0, 1], alias));
  }
  for (var i = 1, isOwn = true; i < parts.length; i += 1) {
    var part = parts[i];
    var first = $strSlice(part, 0, 1);
    var last = $strSlice(part, -1);
    if ((first === '"' || first === "'" || first === "`" || (last === '"' || last === "'" || last === "`")) && first !== last) {
      throw new $SyntaxError("property names with quotes must have matching quotes");
    }
    if (part === "constructor" || !isOwn) {
      skipFurtherCaching = true;
    }
    intrinsicBaseName += "." + part;
    intrinsicRealName = "%" + intrinsicBaseName + "%";
    if (hasOwn$2(INTRINSICS, intrinsicRealName)) {
      value = INTRINSICS[intrinsicRealName];
    } else if (value != null) {
      if (!(part in value)) {
        if (!allowMissing) {
          throw new $TypeError$1("base intrinsic for " + name + " exists, but the property is not available.");
        }
        return void 0;
      }
      if ($gOPD && i + 1 >= parts.length) {
        var desc = $gOPD(value, part);
        isOwn = !!desc;
        if (isOwn && "get" in desc && !("originalValue" in desc.get)) {
          value = desc.get;
        } else {
          value = value[part];
        }
      } else {
        isOwn = hasOwn$2(value, part);
        value = value[part];
      }
      if (isOwn && !skipFurtherCaching) {
        INTRINSICS[intrinsicRealName] = value;
      }
    }
  }
  return value;
};
var shams;
var hasRequiredShams;
function requireShams() {
  if (hasRequiredShams) return shams;
  hasRequiredShams = 1;
  var hasSymbols2 = requireShams$1();
  shams = function hasToStringTagShams() {
    return hasSymbols2() && !!Symbol.toStringTag;
  };
  return shams;
}
var GetIntrinsic2 = getIntrinsic;
var $defineProperty = GetIntrinsic2("%Object.defineProperty%", true);
var hasToStringTag = requireShams()();
var hasOwn$1 = hasown;
var $TypeError = type;
var toStringTag = hasToStringTag ? Symbol.toStringTag : null;
var esSetTostringtag = function setToStringTag(object, value) {
  var overrideIfSet = arguments.length > 2 && !!arguments[2] && arguments[2].force;
  var nonConfigurable = arguments.length > 2 && !!arguments[2] && arguments[2].nonConfigurable;
  if (typeof overrideIfSet !== "undefined" && typeof overrideIfSet !== "boolean" || typeof nonConfigurable !== "undefined" && typeof nonConfigurable !== "boolean") {
    throw new $TypeError("if provided, the `overrideIfSet` and `nonConfigurable` options must be booleans");
  }
  if (toStringTag && (overrideIfSet || !hasOwn$1(object, toStringTag))) {
    if ($defineProperty) {
      $defineProperty(object, toStringTag, {
        configurable: !nonConfigurable,
        enumerable: false,
        value,
        writable: false
      });
    } else {
      object[toStringTag] = value;
    }
  }
};
var populate$1 = function(dst, src2) {
  Object.keys(src2).forEach(function(prop) {
    dst[prop] = dst[prop] || src2[prop];
  });
  return dst;
};
var CombinedStream = combined_stream;
var util = require$$1$1;
var path = path$1;
var http$1 = require$$0$4;
var https$1 = require$$1;
var parseUrl$2 = require$$0$3.parse;
var fs = fs$1;
var Stream = stream.Stream;
var crypto = require$$8;
var mime = mimeTypes;
var asynckit = asynckit$1;
var setToStringTag2 = esSetTostringtag;
var hasOwn = hasown;
var populate = populate$1;
function FormData$1(options) {
  if (!(this instanceof FormData$1)) {
    return new FormData$1(options);
  }
  this._overheadLength = 0;
  this._valueLength = 0;
  this._valuesToMeasure = [];
  CombinedStream.call(this);
  options = options || {};
  for (var option in options) {
    this[option] = options[option];
  }
}
util.inherits(FormData$1, CombinedStream);
FormData$1.LINE_BREAK = "\r\n";
FormData$1.DEFAULT_CONTENT_TYPE = "application/octet-stream";
FormData$1.prototype.append = function(field, value, options) {
  options = options || {};
  if (typeof options === "string") {
    options = { filename: options };
  }
  var append2 = CombinedStream.prototype.append.bind(this);
  if (typeof value === "number" || value == null) {
    value = String(value);
  }
  if (Array.isArray(value)) {
    this._error(new Error("Arrays are not supported."));
    return;
  }
  var header = this._multiPartHeader(field, value, options);
  var footer = this._multiPartFooter();
  append2(header);
  append2(value);
  append2(footer);
  this._trackLength(header, value, options);
};
FormData$1.prototype._trackLength = function(header, value, options) {
  var valueLength = 0;
  if (options.knownLength != null) {
    valueLength += Number(options.knownLength);
  } else if (Buffer.isBuffer(value)) {
    valueLength = value.length;
  } else if (typeof value === "string") {
    valueLength = Buffer.byteLength(value);
  }
  this._valueLength += valueLength;
  this._overheadLength += Buffer.byteLength(header) + FormData$1.LINE_BREAK.length;
  if (!value || !value.path && !(value.readable && hasOwn(value, "httpVersion")) && !(value instanceof Stream)) {
    return;
  }
  if (!options.knownLength) {
    this._valuesToMeasure.push(value);
  }
};
FormData$1.prototype._lengthRetriever = function(value, callback) {
  if (hasOwn(value, "fd")) {
    if (value.end != void 0 && value.end != Infinity && value.start != void 0) {
      callback(null, value.end + 1 - (value.start ? value.start : 0));
    } else {
      fs.stat(value.path, function(err, stat) {
        if (err) {
          callback(err);
          return;
        }
        var fileSize = stat.size - (value.start ? value.start : 0);
        callback(null, fileSize);
      });
    }
  } else if (hasOwn(value, "httpVersion")) {
    callback(null, Number(value.headers["content-length"]));
  } else if (hasOwn(value, "httpModule")) {
    value.on("response", function(response) {
      value.pause();
      callback(null, Number(response.headers["content-length"]));
    });
    value.resume();
  } else {
    callback("Unknown stream");
  }
};
FormData$1.prototype._multiPartHeader = function(field, value, options) {
  if (typeof options.header === "string") {
    return options.header;
  }
  var contentDisposition = this._getContentDisposition(value, options);
  var contentType = this._getContentType(value, options);
  var contents = "";
  var headers = {
    // add custom disposition as third element or keep it two elements if not
    "Content-Disposition": ["form-data", 'name="' + field + '"'].concat(contentDisposition || []),
    // if no content type. allow it to be empty array
    "Content-Type": [].concat(contentType || [])
  };
  if (typeof options.header === "object") {
    populate(headers, options.header);
  }
  var header;
  for (var prop in headers) {
    if (hasOwn(headers, prop)) {
      header = headers[prop];
      if (header == null) {
        continue;
      }
      if (!Array.isArray(header)) {
        header = [header];
      }
      if (header.length) {
        contents += prop + ": " + header.join("; ") + FormData$1.LINE_BREAK;
      }
    }
  }
  return "--" + this.getBoundary() + FormData$1.LINE_BREAK + contents + FormData$1.LINE_BREAK;
};
FormData$1.prototype._getContentDisposition = function(value, options) {
  var filename;
  if (typeof options.filepath === "string") {
    filename = path.normalize(options.filepath).replace(/\\/g, "/");
  } else if (options.filename || value && (value.name || value.path)) {
    filename = path.basename(options.filename || value && (value.name || value.path));
  } else if (value && value.readable && hasOwn(value, "httpVersion")) {
    filename = path.basename(value.client._httpMessage.path || "");
  }
  if (filename) {
    return 'filename="' + filename + '"';
  }
};
FormData$1.prototype._getContentType = function(value, options) {
  var contentType = options.contentType;
  if (!contentType && value && value.name) {
    contentType = mime.lookup(value.name);
  }
  if (!contentType && value && value.path) {
    contentType = mime.lookup(value.path);
  }
  if (!contentType && value && value.readable && hasOwn(value, "httpVersion")) {
    contentType = value.headers["content-type"];
  }
  if (!contentType && (options.filepath || options.filename)) {
    contentType = mime.lookup(options.filepath || options.filename);
  }
  if (!contentType && value && typeof value === "object") {
    contentType = FormData$1.DEFAULT_CONTENT_TYPE;
  }
  return contentType;
};
FormData$1.prototype._multiPartFooter = function() {
  return (function(next) {
    var footer = FormData$1.LINE_BREAK;
    var lastPart = this._streams.length === 0;
    if (lastPart) {
      footer += this._lastBoundary();
    }
    next(footer);
  }).bind(this);
};
FormData$1.prototype._lastBoundary = function() {
  return "--" + this.getBoundary() + "--" + FormData$1.LINE_BREAK;
};
FormData$1.prototype.getHeaders = function(userHeaders) {
  var header;
  var formHeaders = {
    "content-type": "multipart/form-data; boundary=" + this.getBoundary()
  };
  for (header in userHeaders) {
    if (hasOwn(userHeaders, header)) {
      formHeaders[header.toLowerCase()] = userHeaders[header];
    }
  }
  return formHeaders;
};
FormData$1.prototype.setBoundary = function(boundary) {
  if (typeof boundary !== "string") {
    throw new TypeError("FormData boundary must be a string");
  }
  this._boundary = boundary;
};
FormData$1.prototype.getBoundary = function() {
  if (!this._boundary) {
    this._generateBoundary();
  }
  return this._boundary;
};
FormData$1.prototype.getBuffer = function() {
  var dataBuffer = new Buffer.alloc(0);
  var boundary = this.getBoundary();
  for (var i = 0, len = this._streams.length; i < len; i++) {
    if (typeof this._streams[i] !== "function") {
      if (Buffer.isBuffer(this._streams[i])) {
        dataBuffer = Buffer.concat([dataBuffer, this._streams[i]]);
      } else {
        dataBuffer = Buffer.concat([dataBuffer, Buffer.from(this._streams[i])]);
      }
      if (typeof this._streams[i] !== "string" || this._streams[i].substring(2, boundary.length + 2) !== boundary) {
        dataBuffer = Buffer.concat([dataBuffer, Buffer.from(FormData$1.LINE_BREAK)]);
      }
    }
  }
  return Buffer.concat([dataBuffer, Buffer.from(this._lastBoundary())]);
};
FormData$1.prototype._generateBoundary = function() {
  this._boundary = "--------------------------" + crypto.randomBytes(12).toString("hex");
};
FormData$1.prototype.getLengthSync = function() {
  var knownLength = this._overheadLength + this._valueLength;
  if (this._streams.length) {
    knownLength += this._lastBoundary().length;
  }
  if (!this.hasKnownLength()) {
    this._error(new Error("Cannot calculate proper length in synchronous way."));
  }
  return knownLength;
};
FormData$1.prototype.hasKnownLength = function() {
  var hasKnownLength = true;
  if (this._valuesToMeasure.length) {
    hasKnownLength = false;
  }
  return hasKnownLength;
};
FormData$1.prototype.getLength = function(cb) {
  var knownLength = this._overheadLength + this._valueLength;
  if (this._streams.length) {
    knownLength += this._lastBoundary().length;
  }
  if (!this._valuesToMeasure.length) {
    process.nextTick(cb.bind(this, null, knownLength));
    return;
  }
  asynckit.parallel(this._valuesToMeasure, this._lengthRetriever, function(err, values) {
    if (err) {
      cb(err);
      return;
    }
    values.forEach(function(length) {
      knownLength += length;
    });
    cb(null, knownLength);
  });
};
FormData$1.prototype.submit = function(params, cb) {
  var request;
  var options;
  var defaults2 = { method: "post" };
  if (typeof params === "string") {
    params = parseUrl$2(params);
    options = populate({
      port: params.port,
      path: params.pathname,
      host: params.hostname,
      protocol: params.protocol
    }, defaults2);
  } else {
    options = populate(params, defaults2);
    if (!options.port) {
      options.port = options.protocol === "https:" ? 443 : 80;
    }
  }
  options.headers = this.getHeaders(params.headers);
  if (options.protocol === "https:") {
    request = https$1.request(options);
  } else {
    request = http$1.request(options);
  }
  this.getLength((function(err, length) {
    if (err && err !== "Unknown stream") {
      this._error(err);
      return;
    }
    if (length) {
      request.setHeader("Content-Length", length);
    }
    this.pipe(request);
    if (cb) {
      var onResponse;
      var callback = function(error, responce) {
        request.removeListener("error", callback);
        request.removeListener("response", onResponse);
        return cb.call(this, error, responce);
      };
      onResponse = callback.bind(this, null);
      request.on("error", callback);
      request.on("response", onResponse);
    }
  }).bind(this));
  return request;
};
FormData$1.prototype._error = function(err) {
  if (!this.error) {
    this.error = err;
    this.pause();
    this.emit("error", err);
  }
};
FormData$1.prototype.toString = function() {
  return "[object FormData]";
};
setToStringTag2(FormData$1, "FormData");
var form_data = FormData$1;
const FormData$2 = /* @__PURE__ */ getDefaultExportFromCjs(form_data);
function isVisitable(thing) {
  return utils$1.isPlainObject(thing) || utils$1.isArray(thing);
}
function removeBrackets(key) {
  return utils$1.endsWith(key, "[]") ? key.slice(0, -2) : key;
}
function renderKey(path2, key, dots) {
  if (!path2) return key;
  return path2.concat(key).map(function each(token, i) {
    token = removeBrackets(token);
    return !dots && i ? "[" + token + "]" : token;
  }).join(dots ? "." : "");
}
function isFlatArray(arr) {
  return utils$1.isArray(arr) && !arr.some(isVisitable);
}
const predicates = utils$1.toFlatObject(utils$1, {}, null, function filter(prop) {
  return /^is[A-Z]/.test(prop);
});
function toFormData$1(obj, formData, options) {
  if (!utils$1.isObject(obj)) {
    throw new TypeError("target must be an object");
  }
  formData = formData || new (FormData$2 || FormData)();
  options = utils$1.toFlatObject(options, {
    metaTokens: true,
    dots: false,
    indexes: false
  }, false, function defined(option, source) {
    return !utils$1.isUndefined(source[option]);
  });
  const metaTokens = options.metaTokens;
  const visitor = options.visitor || defaultVisitor;
  const dots = options.dots;
  const indexes = options.indexes;
  const _Blob = options.Blob || typeof Blob !== "undefined" && Blob;
  const useBlob = _Blob && utils$1.isSpecCompliantForm(formData);
  if (!utils$1.isFunction(visitor)) {
    throw new TypeError("visitor must be a function");
  }
  function convertValue(value) {
    if (value === null) return "";
    if (utils$1.isDate(value)) {
      return value.toISOString();
    }
    if (utils$1.isBoolean(value)) {
      return value.toString();
    }
    if (!useBlob && utils$1.isBlob(value)) {
      throw new AxiosError$1("Blob is not supported. Use a Buffer instead.");
    }
    if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value)) {
      return useBlob && typeof Blob === "function" ? new Blob([value]) : Buffer.from(value);
    }
    return value;
  }
  function defaultVisitor(value, key, path2) {
    let arr = value;
    if (value && !path2 && typeof value === "object") {
      if (utils$1.endsWith(key, "{}")) {
        key = metaTokens ? key : key.slice(0, -2);
        value = JSON.stringify(value);
      } else if (utils$1.isArray(value) && isFlatArray(value) || (utils$1.isFileList(value) || utils$1.endsWith(key, "[]")) && (arr = utils$1.toArray(value))) {
        key = removeBrackets(key);
        arr.forEach(function each(el, index) {
          !(utils$1.isUndefined(el) || el === null) && formData.append(
            // eslint-disable-next-line no-nested-ternary
            indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]",
            convertValue(el)
          );
        });
        return false;
      }
    }
    if (isVisitable(value)) {
      return true;
    }
    formData.append(renderKey(path2, key, dots), convertValue(value));
    return false;
  }
  const stack = [];
  const exposedHelpers = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable
  });
  function build(value, path2) {
    if (utils$1.isUndefined(value)) return;
    if (stack.indexOf(value) !== -1) {
      throw Error("Circular reference detected in " + path2.join("."));
    }
    stack.push(value);
    utils$1.forEach(value, function each(el, key) {
      const result = !(utils$1.isUndefined(el) || el === null) && visitor.call(
        formData,
        el,
        utils$1.isString(key) ? key.trim() : key,
        path2,
        exposedHelpers
      );
      if (result === true) {
        build(el, path2 ? path2.concat(key) : [key]);
      }
    });
    stack.pop();
  }
  if (!utils$1.isObject(obj)) {
    throw new TypeError("data must be an object");
  }
  build(obj);
  return formData;
}
function encode$1(str) {
  const charMap = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+",
    "%00": "\0"
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
    return charMap[match];
  });
}
function AxiosURLSearchParams(params, options) {
  this._pairs = [];
  params && toFormData$1(params, this, options);
}
const prototype = AxiosURLSearchParams.prototype;
prototype.append = function append(name, value) {
  this._pairs.push([name, value]);
};
prototype.toString = function toString2(encoder) {
  const _encode = encoder ? function(value) {
    return encoder.call(this, value, encode$1);
  } : encode$1;
  return this._pairs.map(function each(pair) {
    return _encode(pair[0]) + "=" + _encode(pair[1]);
  }, "").join("&");
};
function encode(val) {
  return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+").replace(/%5B/gi, "[").replace(/%5D/gi, "]");
}
function buildURL(url2, params, options) {
  if (!params) {
    return url2;
  }
  const _encode = options && options.encode || encode;
  if (utils$1.isFunction(options)) {
    options = {
      serialize: options
    };
  }
  const serializeFn = options && options.serialize;
  let serializedParams;
  if (serializeFn) {
    serializedParams = serializeFn(params, options);
  } else {
    serializedParams = utils$1.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams(params, options).toString(_encode);
  }
  if (serializedParams) {
    const hashmarkIndex = url2.indexOf("#");
    if (hashmarkIndex !== -1) {
      url2 = url2.slice(0, hashmarkIndex);
    }
    url2 += (url2.indexOf("?") === -1 ? "?" : "&") + serializedParams;
  }
  return url2;
}
class InterceptorManager {
  constructor() {
    this.handlers = [];
  }
  /**
   * Add a new interceptor to the stack
   *
   * @param {Function} fulfilled The function to handle `then` for a `Promise`
   * @param {Function} rejected The function to handle `reject` for a `Promise`
   *
   * @return {Number} An ID used to remove interceptor later
   */
  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null
    });
    return this.handlers.length - 1;
  }
  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
   */
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }
  /**
   * Clear all interceptors from the stack
   *
   * @returns {void}
   */
  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }
  /**
   * Iterate over all the registered interceptors
   *
   * This method is particularly useful for skipping over any
   * interceptors that may have become `null` calling `eject`.
   *
   * @param {Function} fn The function to call for each interceptor
   *
   * @returns {void}
   */
  forEach(fn) {
    utils$1.forEach(this.handlers, function forEachHandler(h) {
      if (h !== null) {
        fn(h);
      }
    });
  }
}
const transitionalDefaults = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false
};
const URLSearchParams = require$$0$3.URLSearchParams;
const ALPHA = "abcdefghijklmnopqrstuvwxyz";
const DIGIT = "0123456789";
const ALPHABET = {
  DIGIT,
  ALPHA,
  ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
};
const generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
  let str = "";
  const { length } = alphabet;
  const randomValues = new Uint32Array(size);
  require$$8.randomFillSync(randomValues);
  for (let i = 0; i < size; i++) {
    str += alphabet[randomValues[i] % length];
  }
  return str;
};
const platform$1 = {
  isNode: true,
  classes: {
    URLSearchParams,
    FormData: FormData$2,
    Blob: typeof Blob !== "undefined" && Blob || null
  },
  ALPHABET,
  generateString,
  protocols: ["http", "https", "file", "data"]
};
const hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
const _navigator = typeof navigator === "object" && navigator || void 0;
const hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || ["ReactNative", "NativeScript", "NS"].indexOf(_navigator.product) < 0);
const hasStandardBrowserWebWorkerEnv = (() => {
  return typeof WorkerGlobalScope !== "undefined" && // eslint-disable-next-line no-undef
  self instanceof WorkerGlobalScope && typeof self.importScripts === "function";
})();
const origin = hasBrowserEnv && window.location.href || "http://localhost";
const utils = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  hasBrowserEnv,
  hasStandardBrowserEnv,
  hasStandardBrowserWebWorkerEnv,
  navigator: _navigator,
  origin
}, Symbol.toStringTag, { value: "Module" }));
const platform = {
  ...utils,
  ...platform$1
};
function toURLEncodedForm(data, options) {
  return toFormData$1(data, new platform.classes.URLSearchParams(), {
    visitor: function(value, key, path2, helpers) {
      if (platform.isNode && utils$1.isBuffer(value)) {
        this.append(key, value.toString("base64"));
        return false;
      }
      return helpers.defaultVisitor.apply(this, arguments);
    },
    ...options
  });
}
function parsePropPath(name) {
  return utils$1.matchAll(/\w+|\[(\w*)]/g, name).map((match) => {
    return match[0] === "[]" ? "" : match[1] || match[0];
  });
}
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  let key;
  for (i = 0; i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}
function formDataToJSON(formData) {
  function buildPath(path2, value, target, index) {
    let name = path2[index++];
    if (name === "__proto__") return true;
    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path2.length;
    name = !name && utils$1.isArray(target) ? target.length : name;
    if (isLast) {
      if (utils$1.hasOwnProp(target, name)) {
        target[name] = [target[name], value];
      } else {
        target[name] = value;
      }
      return !isNumericKey;
    }
    if (!target[name] || !utils$1.isObject(target[name])) {
      target[name] = [];
    }
    const result = buildPath(path2, value, target[name], index);
    if (result && utils$1.isArray(target[name])) {
      target[name] = arrayToObject(target[name]);
    }
    return !isNumericKey;
  }
  if (utils$1.isFormData(formData) && utils$1.isFunction(formData.entries)) {
    const obj = {};
    utils$1.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });
    return obj;
  }
  return null;
}
function stringifySafely(rawValue, parser, encoder) {
  if (utils$1.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils$1.trim(rawValue);
    } catch (e) {
      if (e.name !== "SyntaxError") {
        throw e;
      }
    }
  }
  return (encoder || JSON.stringify)(rawValue);
}
const defaults = {
  transitional: transitionalDefaults,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [function transformRequest(data, headers) {
    const contentType = headers.getContentType() || "";
    const hasJSONContentType = contentType.indexOf("application/json") > -1;
    const isObjectPayload = utils$1.isObject(data);
    if (isObjectPayload && utils$1.isHTMLForm(data)) {
      data = new FormData(data);
    }
    const isFormData2 = utils$1.isFormData(data);
    if (isFormData2) {
      return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
    }
    if (utils$1.isArrayBuffer(data) || utils$1.isBuffer(data) || utils$1.isStream(data) || utils$1.isFile(data) || utils$1.isBlob(data) || utils$1.isReadableStream(data)) {
      return data;
    }
    if (utils$1.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils$1.isURLSearchParams(data)) {
      headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
      return data.toString();
    }
    let isFileList2;
    if (isObjectPayload) {
      if (contentType.indexOf("application/x-www-form-urlencoded") > -1) {
        return toURLEncodedForm(data, this.formSerializer).toString();
      }
      if ((isFileList2 = utils$1.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
        const _FormData = this.env && this.env.FormData;
        return toFormData$1(
          isFileList2 ? { "files[]": data } : data,
          _FormData && new _FormData(),
          this.formSerializer
        );
      }
    }
    if (isObjectPayload || hasJSONContentType) {
      headers.setContentType("application/json", false);
      return stringifySafely(data);
    }
    return data;
  }],
  transformResponse: [function transformResponse(data) {
    const transitional2 = this.transitional || defaults.transitional;
    const forcedJSONParsing = transitional2 && transitional2.forcedJSONParsing;
    const JSONRequested = this.responseType === "json";
    if (utils$1.isResponse(data) || utils$1.isReadableStream(data)) {
      return data;
    }
    if (data && utils$1.isString(data) && (forcedJSONParsing && !this.responseType || JSONRequested)) {
      const silentJSONParsing = transitional2 && transitional2.silentJSONParsing;
      const strictJSONParsing = !silentJSONParsing && JSONRequested;
      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === "SyntaxError") {
            throw AxiosError$1.from(e, AxiosError$1.ERR_BAD_RESPONSE, this, null, this.response);
          }
          throw e;
        }
      }
    }
    return data;
  }],
  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: platform.classes.FormData,
    Blob: platform.classes.Blob
  },
  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },
  headers: {
    common: {
      "Accept": "application/json, text/plain, */*",
      "Content-Type": void 0
    }
  }
};
utils$1.forEach(["delete", "get", "head", "post", "put", "patch"], (method) => {
  defaults.headers[method] = {};
});
const ignoreDuplicateOf = utils$1.toObjectSet([
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "user-agent"
]);
const parseHeaders = (rawHeaders) => {
  const parsed = {};
  let key;
  let val;
  let i;
  rawHeaders && rawHeaders.split("\n").forEach(function parser(line) {
    i = line.indexOf(":");
    key = line.substring(0, i).trim().toLowerCase();
    val = line.substring(i + 1).trim();
    if (!key || parsed[key] && ignoreDuplicateOf[key]) {
      return;
    }
    if (key === "set-cookie") {
      if (parsed[key]) {
        parsed[key].push(val);
      } else {
        parsed[key] = [val];
      }
    } else {
      parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
    }
  });
  return parsed;
};
const $internals = Symbol("internals");
function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}
function normalizeValue(value) {
  if (value === false || value == null) {
    return value;
  }
  return utils$1.isArray(value) ? value.map(normalizeValue) : String(value);
}
function parseTokens(str) {
  const tokens = /* @__PURE__ */ Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;
  while (match = tokensRE.exec(str)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}
const isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
function matchHeaderValue(context, value, header, filter2, isHeaderNameFilter) {
  if (utils$1.isFunction(filter2)) {
    return filter2.call(this, value, header);
  }
  if (isHeaderNameFilter) {
    value = header;
  }
  if (!utils$1.isString(value)) return;
  if (utils$1.isString(filter2)) {
    return value.indexOf(filter2) !== -1;
  }
  if (utils$1.isRegExp(filter2)) {
    return filter2.test(value);
  }
}
function formatHeader(header) {
  return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
    return char.toUpperCase() + str;
  });
}
function buildAccessors(obj, header) {
  const accessorName = utils$1.toCamelCase(" " + header);
  ["get", "set", "has"].forEach((methodName) => {
    Object.defineProperty(obj, methodName + accessorName, {
      value: function(arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true
    });
  });
}
let AxiosHeaders$1 = class AxiosHeaders {
  constructor(headers) {
    headers && this.set(headers);
  }
  set(header, valueOrRewrite, rewrite) {
    const self2 = this;
    function setHeader(_value, _header, _rewrite) {
      const lHeader = normalizeHeader(_header);
      if (!lHeader) {
        throw new Error("header name must be a non-empty string");
      }
      const key = utils$1.findKey(self2, lHeader);
      if (!key || self2[key] === void 0 || _rewrite === true || _rewrite === void 0 && self2[key] !== false) {
        self2[key || _header] = normalizeValue(_value);
      }
    }
    const setHeaders = (headers, _rewrite) => utils$1.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));
    if (utils$1.isPlainObject(header) || header instanceof this.constructor) {
      setHeaders(header, valueOrRewrite);
    } else if (utils$1.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
      setHeaders(parseHeaders(header), valueOrRewrite);
    } else if (utils$1.isObject(header) && utils$1.isIterable(header)) {
      let obj = {}, dest, key;
      for (const entry of header) {
        if (!utils$1.isArray(entry)) {
          throw TypeError("Object iterator must return a key-value pair");
        }
        obj[key = entry[0]] = (dest = obj[key]) ? utils$1.isArray(dest) ? [...dest, entry[1]] : [dest, entry[1]] : entry[1];
      }
      setHeaders(obj, valueOrRewrite);
    } else {
      header != null && setHeader(valueOrRewrite, header, rewrite);
    }
    return this;
  }
  get(header, parser) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils$1.findKey(this, header);
      if (key) {
        const value = this[key];
        if (!parser) {
          return value;
        }
        if (parser === true) {
          return parseTokens(value);
        }
        if (utils$1.isFunction(parser)) {
          return parser.call(this, value, key);
        }
        if (utils$1.isRegExp(parser)) {
          return parser.exec(value);
        }
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(header, matcher) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils$1.findKey(this, header);
      return !!(key && this[key] !== void 0 && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
    }
    return false;
  }
  delete(header, matcher) {
    const self2 = this;
    let deleted = false;
    function deleteHeader(_header) {
      _header = normalizeHeader(_header);
      if (_header) {
        const key = utils$1.findKey(self2, _header);
        if (key && (!matcher || matchHeaderValue(self2, self2[key], key, matcher))) {
          delete self2[key];
          deleted = true;
        }
      }
    }
    if (utils$1.isArray(header)) {
      header.forEach(deleteHeader);
    } else {
      deleteHeader(header);
    }
    return deleted;
  }
  clear(matcher) {
    const keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;
    while (i--) {
      const key = keys[i];
      if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }
    return deleted;
  }
  normalize(format) {
    const self2 = this;
    const headers = {};
    utils$1.forEach(this, (value, header) => {
      const key = utils$1.findKey(headers, header);
      if (key) {
        self2[key] = normalizeValue(value);
        delete self2[header];
        return;
      }
      const normalized = format ? formatHeader(header) : String(header).trim();
      if (normalized !== header) {
        delete self2[header];
      }
      self2[normalized] = normalizeValue(value);
      headers[normalized] = true;
    });
    return this;
  }
  concat(...targets) {
    return this.constructor.concat(this, ...targets);
  }
  toJSON(asStrings) {
    const obj = /* @__PURE__ */ Object.create(null);
    utils$1.forEach(this, (value, header) => {
      value != null && value !== false && (obj[header] = asStrings && utils$1.isArray(value) ? value.join(", ") : value);
    });
    return obj;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join("\n");
  }
  getSetCookie() {
    return this.get("set-cookie") || [];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }
  static concat(first, ...targets) {
    const computed = new this(first);
    targets.forEach((target) => computed.set(target));
    return computed;
  }
  static accessor(header) {
    const internals = this[$internals] = this[$internals] = {
      accessors: {}
    };
    const accessors = internals.accessors;
    const prototype2 = this.prototype;
    function defineAccessor(_header) {
      const lHeader = normalizeHeader(_header);
      if (!accessors[lHeader]) {
        buildAccessors(prototype2, _header);
        accessors[lHeader] = true;
      }
    }
    utils$1.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
    return this;
  }
};
AxiosHeaders$1.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent", "Authorization"]);
utils$1.reduceDescriptors(AxiosHeaders$1.prototype, ({ value }, key) => {
  let mapped = key[0].toUpperCase() + key.slice(1);
  return {
    get: () => value,
    set(headerValue) {
      this[mapped] = headerValue;
    }
  };
});
utils$1.freezeMethods(AxiosHeaders$1);
function transformData(fns, response) {
  const config = this || defaults;
  const context = response || config;
  const headers = AxiosHeaders$1.from(context.headers);
  let data = context.data;
  utils$1.forEach(fns, function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : void 0);
  });
  headers.normalize();
  return data;
}
function isCancel$1(value) {
  return !!(value && value.__CANCEL__);
}
function CanceledError$1(message, config, request) {
  AxiosError$1.call(this, message == null ? "canceled" : message, AxiosError$1.ERR_CANCELED, config, request);
  this.name = "CanceledError";
}
utils$1.inherits(CanceledError$1, AxiosError$1, {
  __CANCEL__: true
});
function settle(resolve, reject, response) {
  const validateStatus2 = response.config.validateStatus;
  if (!response.status || !validateStatus2 || validateStatus2(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError$1(
      "Request failed with status code " + response.status,
      [AxiosError$1.ERR_BAD_REQUEST, AxiosError$1.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
      response.config,
      response.request,
      response
    ));
  }
}
function isAbsoluteURL(url2) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url2);
}
function combineURLs(baseURL, relativeURL) {
  return relativeURL ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
}
function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls) {
  let isRelativeUrl = !isAbsoluteURL(requestedURL);
  if (baseURL && (isRelativeUrl || allowAbsoluteUrls == false)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
}
var proxyFromEnv = {};
var parseUrl$1 = require$$0$3.parse;
var DEFAULT_PORTS = {
  ftp: 21,
  gopher: 70,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
};
var stringEndsWith = String.prototype.endsWith || function(s) {
  return s.length <= this.length && this.indexOf(s, this.length - s.length) !== -1;
};
function getProxyForUrl(url2) {
  var parsedUrl = typeof url2 === "string" ? parseUrl$1(url2) : url2 || {};
  var proto = parsedUrl.protocol;
  var hostname = parsedUrl.host;
  var port = parsedUrl.port;
  if (typeof hostname !== "string" || !hostname || typeof proto !== "string") {
    return "";
  }
  proto = proto.split(":", 1)[0];
  hostname = hostname.replace(/:\d*$/, "");
  port = parseInt(port) || DEFAULT_PORTS[proto] || 0;
  if (!shouldProxy(hostname, port)) {
    return "";
  }
  var proxy = getEnv("npm_config_" + proto + "_proxy") || getEnv(proto + "_proxy") || getEnv("npm_config_proxy") || getEnv("all_proxy");
  if (proxy && proxy.indexOf("://") === -1) {
    proxy = proto + "://" + proxy;
  }
  return proxy;
}
function shouldProxy(hostname, port) {
  var NO_PROXY = (getEnv("npm_config_no_proxy") || getEnv("no_proxy")).toLowerCase();
  if (!NO_PROXY) {
    return true;
  }
  if (NO_PROXY === "*") {
    return false;
  }
  return NO_PROXY.split(/[,\s]/).every(function(proxy) {
    if (!proxy) {
      return true;
    }
    var parsedProxy = proxy.match(/^(.+):(\d+)$/);
    var parsedProxyHostname = parsedProxy ? parsedProxy[1] : proxy;
    var parsedProxyPort = parsedProxy ? parseInt(parsedProxy[2]) : 0;
    if (parsedProxyPort && parsedProxyPort !== port) {
      return true;
    }
    if (!/^[.*]/.test(parsedProxyHostname)) {
      return hostname !== parsedProxyHostname;
    }
    if (parsedProxyHostname.charAt(0) === "*") {
      parsedProxyHostname = parsedProxyHostname.slice(1);
    }
    return !stringEndsWith.call(hostname, parsedProxyHostname);
  });
}
function getEnv(key) {
  return process.env[key.toLowerCase()] || process.env[key.toUpperCase()] || "";
}
proxyFromEnv.getProxyForUrl = getProxyForUrl;
var followRedirects$1 = { exports: {} };
var src = { exports: {} };
var browser = { exports: {} };
var ms;
var hasRequiredMs;
function requireMs() {
  if (hasRequiredMs) return ms;
  hasRequiredMs = 1;
  var s = 1e3;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  ms = function(val, options) {
    options = options || {};
    var type2 = typeof val;
    if (type2 === "string" && val.length > 0) {
      return parse(val);
    } else if (type2 === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
    );
  };
  function parse(str) {
    str = String(str);
    if (str.length > 100) {
      return;
    }
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
      str
    );
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type2 = (match[2] || "ms").toLowerCase();
    switch (type2) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "weeks":
      case "week":
      case "w":
        return n * w;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return void 0;
    }
  }
  function fmtShort(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return Math.round(ms2 / d) + "d";
    }
    if (msAbs >= h) {
      return Math.round(ms2 / h) + "h";
    }
    if (msAbs >= m) {
      return Math.round(ms2 / m) + "m";
    }
    if (msAbs >= s) {
      return Math.round(ms2 / s) + "s";
    }
    return ms2 + "ms";
  }
  function fmtLong(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return plural(ms2, msAbs, d, "day");
    }
    if (msAbs >= h) {
      return plural(ms2, msAbs, h, "hour");
    }
    if (msAbs >= m) {
      return plural(ms2, msAbs, m, "minute");
    }
    if (msAbs >= s) {
      return plural(ms2, msAbs, s, "second");
    }
    return ms2 + " ms";
  }
  function plural(ms2, msAbs, n, name) {
    var isPlural = msAbs >= n * 1.5;
    return Math.round(ms2 / n) + " " + name + (isPlural ? "s" : "");
  }
  return ms;
}
var common;
var hasRequiredCommon;
function requireCommon() {
  if (hasRequiredCommon) return common;
  hasRequiredCommon = 1;
  function setup(env) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = requireMs();
    createDebug.destroy = destroy2;
    Object.keys(env).forEach((key) => {
      createDebug[key] = env[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash = 0;
      for (let i = 0; i < namespace.length; i++) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug2(...args) {
        if (!debug2.enabled) {
          return;
        }
        const self2 = debug2;
        const curr = Number(/* @__PURE__ */ new Date());
        const ms2 = curr - (prevTime || curr);
        self2.diff = ms2;
        self2.prev = prevTime;
        self2.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string") {
          args.unshift("%O");
        }
        let index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") {
            return "%";
          }
          index++;
          const formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            const val = args[index];
            match = formatter.call(self2, val);
            args.splice(index, 1);
            index--;
          }
          return match;
        });
        createDebug.formatArgs.call(self2, args);
        const logFn = self2.log || createDebug.log;
        logFn.apply(self2, args);
      }
      debug2.namespace = namespace;
      debug2.useColors = createDebug.useColors();
      debug2.color = createDebug.selectColor(namespace);
      debug2.extend = extend2;
      debug2.destroy = createDebug.destroy;
      Object.defineProperty(debug2, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null) {
            return enableOverride;
          }
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        }
      });
      if (typeof createDebug.init === "function") {
        createDebug.init(debug2);
      }
      return debug2;
    }
    function extend2(namespace, delimiter) {
      const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const ns of split) {
        if (ns[0] === "-") {
          createDebug.skips.push(ns.slice(1));
        } else {
          createDebug.names.push(ns);
        }
      }
    }
    function matchesTemplate(search, template) {
      let searchIndex = 0;
      let templateIndex = 0;
      let starIndex = -1;
      let matchIndex = 0;
      while (searchIndex < search.length) {
        if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
          if (template[templateIndex] === "*") {
            starIndex = templateIndex;
            matchIndex = searchIndex;
            templateIndex++;
          } else {
            searchIndex++;
            templateIndex++;
          }
        } else if (starIndex !== -1) {
          templateIndex = starIndex + 1;
          matchIndex++;
          searchIndex = matchIndex;
        } else {
          return false;
        }
      }
      while (templateIndex < template.length && template[templateIndex] === "*") {
        templateIndex++;
      }
      return templateIndex === template.length;
    }
    function disable() {
      const namespaces = [
        ...createDebug.names,
        ...createDebug.skips.map((namespace) => "-" + namespace)
      ].join(",");
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      for (const skip of createDebug.skips) {
        if (matchesTemplate(name, skip)) {
          return false;
        }
      }
      for (const ns of createDebug.names) {
        if (matchesTemplate(name, ns)) {
          return true;
        }
      }
      return false;
    }
    function coerce(val) {
      if (val instanceof Error) {
        return val.stack || val.message;
      }
      return val;
    }
    function destroy2() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  common = setup;
  return common;
}
var hasRequiredBrowser;
function requireBrowser() {
  if (hasRequiredBrowser) return browser.exports;
  hasRequiredBrowser = 1;
  (function(module2, exports) {
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = /* @__PURE__ */ (() => {
      let warned2 = false;
      return () => {
        if (!warned2) {
          warned2 = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module2.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports.storage.setItem("debug", namespaces);
        } else {
          exports.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module2.exports = requireCommon()(exports);
    const { formatters } = module2.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  })(browser, browser.exports);
  return browser.exports;
}
var node = { exports: {} };
var hasFlag;
var hasRequiredHasFlag;
function requireHasFlag() {
  if (hasRequiredHasFlag) return hasFlag;
  hasRequiredHasFlag = 1;
  hasFlag = (flag, argv = process.argv) => {
    const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
    const position = argv.indexOf(prefix + flag);
    const terminatorPosition = argv.indexOf("--");
    return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
  };
  return hasFlag;
}
var supportsColor_1;
var hasRequiredSupportsColor;
function requireSupportsColor() {
  if (hasRequiredSupportsColor) return supportsColor_1;
  hasRequiredSupportsColor = 1;
  const os$1 = os;
  const tty = require$$1$2;
  const hasFlag2 = requireHasFlag();
  const { env } = process;
  let flagForceColor;
  if (hasFlag2("no-color") || hasFlag2("no-colors") || hasFlag2("color=false") || hasFlag2("color=never")) {
    flagForceColor = 0;
  } else if (hasFlag2("color") || hasFlag2("colors") || hasFlag2("color=true") || hasFlag2("color=always")) {
    flagForceColor = 1;
  }
  function envForceColor() {
    if ("FORCE_COLOR" in env) {
      if (env.FORCE_COLOR === "true") {
        return 1;
      }
      if (env.FORCE_COLOR === "false") {
        return 0;
      }
      return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
    }
  }
  function translateLevel(level) {
    if (level === 0) {
      return false;
    }
    return {
      level,
      hasBasic: true,
      has256: level >= 2,
      has16m: level >= 3
    };
  }
  function supportsColor(haveStream, { streamIsTTY, sniffFlags = true } = {}) {
    const noFlagForceColor = envForceColor();
    if (noFlagForceColor !== void 0) {
      flagForceColor = noFlagForceColor;
    }
    const forceColor = sniffFlags ? flagForceColor : noFlagForceColor;
    if (forceColor === 0) {
      return 0;
    }
    if (sniffFlags) {
      if (hasFlag2("color=16m") || hasFlag2("color=full") || hasFlag2("color=truecolor")) {
        return 3;
      }
      if (hasFlag2("color=256")) {
        return 2;
      }
    }
    if (haveStream && !streamIsTTY && forceColor === void 0) {
      return 0;
    }
    const min2 = forceColor || 0;
    if (env.TERM === "dumb") {
      return min2;
    }
    if (process.platform === "win32") {
      const osRelease = os$1.release().split(".");
      if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
        return Number(osRelease[2]) >= 14931 ? 3 : 2;
      }
      return 1;
    }
    if ("CI" in env) {
      if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE", "DRONE"].some((sign3) => sign3 in env) || env.CI_NAME === "codeship") {
        return 1;
      }
      return min2;
    }
    if ("TEAMCITY_VERSION" in env) {
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
    }
    if (env.COLORTERM === "truecolor") {
      return 3;
    }
    if ("TERM_PROGRAM" in env) {
      const version = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (env.TERM_PROGRAM) {
        case "iTerm.app":
          return version >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    if (/-256(color)?$/i.test(env.TERM)) {
      return 2;
    }
    if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
      return 1;
    }
    if ("COLORTERM" in env) {
      return 1;
    }
    return min2;
  }
  function getSupportLevel(stream2, options = {}) {
    const level = supportsColor(stream2, {
      streamIsTTY: stream2 && stream2.isTTY,
      ...options
    });
    return translateLevel(level);
  }
  supportsColor_1 = {
    supportsColor: getSupportLevel,
    stdout: getSupportLevel({ isTTY: tty.isatty(1) }),
    stderr: getSupportLevel({ isTTY: tty.isatty(2) })
  };
  return supportsColor_1;
}
var hasRequiredNode;
function requireNode() {
  if (hasRequiredNode) return node.exports;
  hasRequiredNode = 1;
  (function(module2, exports) {
    const tty = require$$1$2;
    const util2 = require$$1$1;
    exports.init = init;
    exports.log = log2;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.destroy = util2.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = requireSupportsColor();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module2.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log2(...args) {
      return process.stderr.write(util2.formatWithOptions(exports.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug2) {
      debug2.inspectOpts = {};
      const keys = Object.keys(exports.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug2.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
      }
    }
    module2.exports = requireCommon()(exports);
    const { formatters } = module2.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util2.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util2.inspect(v, this.inspectOpts);
    };
  })(node, node.exports);
  return node.exports;
}
var hasRequiredSrc;
function requireSrc() {
  if (hasRequiredSrc) return src.exports;
  hasRequiredSrc = 1;
  if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
    src.exports = requireBrowser();
  } else {
    src.exports = requireNode();
  }
  return src.exports;
}
var debug$1;
var debug_1 = function() {
  if (!debug$1) {
    try {
      debug$1 = requireSrc()("follow-redirects");
    } catch (error) {
    }
    if (typeof debug$1 !== "function") {
      debug$1 = function() {
      };
    }
  }
  debug$1.apply(null, arguments);
};
var url = require$$0$3;
var URL$1 = url.URL;
var http = require$$0$4;
var https = require$$1;
var Writable = stream.Writable;
var assert = require$$2;
var debug = debug_1;
(function detectUnsupportedEnvironment() {
  var looksLikeNode = typeof process !== "undefined";
  var looksLikeBrowser = typeof window !== "undefined" && typeof document !== "undefined";
  var looksLikeV8 = isFunction(Error.captureStackTrace);
  if (!looksLikeNode && (looksLikeBrowser || !looksLikeV8)) {
    console.warn("The follow-redirects package should be excluded from browser builds.");
  }
})();
var useNativeURL = false;
try {
  assert(new URL$1(""));
} catch (error) {
  useNativeURL = error.code === "ERR_INVALID_URL";
}
var preservedUrlFields = [
  "auth",
  "host",
  "hostname",
  "href",
  "path",
  "pathname",
  "port",
  "protocol",
  "query",
  "search",
  "hash"
];
var events = ["abort", "aborted", "connect", "error", "socket", "timeout"];
var eventHandlers = /* @__PURE__ */ Object.create(null);
events.forEach(function(event) {
  eventHandlers[event] = function(arg1, arg2, arg3) {
    this._redirectable.emit(event, arg1, arg2, arg3);
  };
});
var InvalidUrlError = createErrorType(
  "ERR_INVALID_URL",
  "Invalid URL",
  TypeError
);
var RedirectionError = createErrorType(
  "ERR_FR_REDIRECTION_FAILURE",
  "Redirected request failed"
);
var TooManyRedirectsError = createErrorType(
  "ERR_FR_TOO_MANY_REDIRECTS",
  "Maximum number of redirects exceeded",
  RedirectionError
);
var MaxBodyLengthExceededError = createErrorType(
  "ERR_FR_MAX_BODY_LENGTH_EXCEEDED",
  "Request body larger than maxBodyLength limit"
);
var WriteAfterEndError = createErrorType(
  "ERR_STREAM_WRITE_AFTER_END",
  "write after end"
);
var destroy = Writable.prototype.destroy || noop;
function RedirectableRequest(options, responseCallback) {
  Writable.call(this);
  this._sanitizeOptions(options);
  this._options = options;
  this._ended = false;
  this._ending = false;
  this._redirectCount = 0;
  this._redirects = [];
  this._requestBodyLength = 0;
  this._requestBodyBuffers = [];
  if (responseCallback) {
    this.on("response", responseCallback);
  }
  var self2 = this;
  this._onNativeResponse = function(response) {
    try {
      self2._processResponse(response);
    } catch (cause) {
      self2.emit("error", cause instanceof RedirectionError ? cause : new RedirectionError({ cause }));
    }
  };
  this._performRequest();
}
RedirectableRequest.prototype = Object.create(Writable.prototype);
RedirectableRequest.prototype.abort = function() {
  destroyRequest(this._currentRequest);
  this._currentRequest.abort();
  this.emit("abort");
};
RedirectableRequest.prototype.destroy = function(error) {
  destroyRequest(this._currentRequest, error);
  destroy.call(this, error);
  return this;
};
RedirectableRequest.prototype.write = function(data, encoding, callback) {
  if (this._ending) {
    throw new WriteAfterEndError();
  }
  if (!isString(data) && !isBuffer(data)) {
    throw new TypeError("data should be a string, Buffer or Uint8Array");
  }
  if (isFunction(encoding)) {
    callback = encoding;
    encoding = null;
  }
  if (data.length === 0) {
    if (callback) {
      callback();
    }
    return;
  }
  if (this._requestBodyLength + data.length <= this._options.maxBodyLength) {
    this._requestBodyLength += data.length;
    this._requestBodyBuffers.push({ data, encoding });
    this._currentRequest.write(data, encoding, callback);
  } else {
    this.emit("error", new MaxBodyLengthExceededError());
    this.abort();
  }
};
RedirectableRequest.prototype.end = function(data, encoding, callback) {
  if (isFunction(data)) {
    callback = data;
    data = encoding = null;
  } else if (isFunction(encoding)) {
    callback = encoding;
    encoding = null;
  }
  if (!data) {
    this._ended = this._ending = true;
    this._currentRequest.end(null, null, callback);
  } else {
    var self2 = this;
    var currentRequest = this._currentRequest;
    this.write(data, encoding, function() {
      self2._ended = true;
      currentRequest.end(null, null, callback);
    });
    this._ending = true;
  }
};
RedirectableRequest.prototype.setHeader = function(name, value) {
  this._options.headers[name] = value;
  this._currentRequest.setHeader(name, value);
};
RedirectableRequest.prototype.removeHeader = function(name) {
  delete this._options.headers[name];
  this._currentRequest.removeHeader(name);
};
RedirectableRequest.prototype.setTimeout = function(msecs, callback) {
  var self2 = this;
  function destroyOnTimeout(socket) {
    socket.setTimeout(msecs);
    socket.removeListener("timeout", socket.destroy);
    socket.addListener("timeout", socket.destroy);
  }
  function startTimer(socket) {
    if (self2._timeout) {
      clearTimeout(self2._timeout);
    }
    self2._timeout = setTimeout(function() {
      self2.emit("timeout");
      clearTimer();
    }, msecs);
    destroyOnTimeout(socket);
  }
  function clearTimer() {
    if (self2._timeout) {
      clearTimeout(self2._timeout);
      self2._timeout = null;
    }
    self2.removeListener("abort", clearTimer);
    self2.removeListener("error", clearTimer);
    self2.removeListener("response", clearTimer);
    self2.removeListener("close", clearTimer);
    if (callback) {
      self2.removeListener("timeout", callback);
    }
    if (!self2.socket) {
      self2._currentRequest.removeListener("socket", startTimer);
    }
  }
  if (callback) {
    this.on("timeout", callback);
  }
  if (this.socket) {
    startTimer(this.socket);
  } else {
    this._currentRequest.once("socket", startTimer);
  }
  this.on("socket", destroyOnTimeout);
  this.on("abort", clearTimer);
  this.on("error", clearTimer);
  this.on("response", clearTimer);
  this.on("close", clearTimer);
  return this;
};
[
  "flushHeaders",
  "getHeader",
  "setNoDelay",
  "setSocketKeepAlive"
].forEach(function(method) {
  RedirectableRequest.prototype[method] = function(a, b) {
    return this._currentRequest[method](a, b);
  };
});
["aborted", "connection", "socket"].forEach(function(property) {
  Object.defineProperty(RedirectableRequest.prototype, property, {
    get: function() {
      return this._currentRequest[property];
    }
  });
});
RedirectableRequest.prototype._sanitizeOptions = function(options) {
  if (!options.headers) {
    options.headers = {};
  }
  if (options.host) {
    if (!options.hostname) {
      options.hostname = options.host;
    }
    delete options.host;
  }
  if (!options.pathname && options.path) {
    var searchPos = options.path.indexOf("?");
    if (searchPos < 0) {
      options.pathname = options.path;
    } else {
      options.pathname = options.path.substring(0, searchPos);
      options.search = options.path.substring(searchPos);
    }
  }
};
RedirectableRequest.prototype._performRequest = function() {
  var protocol = this._options.protocol;
  var nativeProtocol = this._options.nativeProtocols[protocol];
  if (!nativeProtocol) {
    throw new TypeError("Unsupported protocol " + protocol);
  }
  if (this._options.agents) {
    var scheme = protocol.slice(0, -1);
    this._options.agent = this._options.agents[scheme];
  }
  var request = this._currentRequest = nativeProtocol.request(this._options, this._onNativeResponse);
  request._redirectable = this;
  for (var event of events) {
    request.on(event, eventHandlers[event]);
  }
  this._currentUrl = /^\//.test(this._options.path) ? url.format(this._options) : (
    // When making a request to a proxy, […]
    // a client MUST send the target URI in absolute-form […].
    this._options.path
  );
  if (this._isRedirect) {
    var i = 0;
    var self2 = this;
    var buffers = this._requestBodyBuffers;
    (function writeNext(error) {
      if (request === self2._currentRequest) {
        if (error) {
          self2.emit("error", error);
        } else if (i < buffers.length) {
          var buffer = buffers[i++];
          if (!request.finished) {
            request.write(buffer.data, buffer.encoding, writeNext);
          }
        } else if (self2._ended) {
          request.end();
        }
      }
    })();
  }
};
RedirectableRequest.prototype._processResponse = function(response) {
  var statusCode = response.statusCode;
  if (this._options.trackRedirects) {
    this._redirects.push({
      url: this._currentUrl,
      headers: response.headers,
      statusCode
    });
  }
  var location = response.headers.location;
  if (!location || this._options.followRedirects === false || statusCode < 300 || statusCode >= 400) {
    response.responseUrl = this._currentUrl;
    response.redirects = this._redirects;
    this.emit("response", response);
    this._requestBodyBuffers = [];
    return;
  }
  destroyRequest(this._currentRequest);
  response.destroy();
  if (++this._redirectCount > this._options.maxRedirects) {
    throw new TooManyRedirectsError();
  }
  var requestHeaders;
  var beforeRedirect = this._options.beforeRedirect;
  if (beforeRedirect) {
    requestHeaders = Object.assign({
      // The Host header was set by nativeProtocol.request
      Host: response.req.getHeader("host")
    }, this._options.headers);
  }
  var method = this._options.method;
  if ((statusCode === 301 || statusCode === 302) && this._options.method === "POST" || // RFC7231§6.4.4: The 303 (See Other) status code indicates that
  // the server is redirecting the user agent to a different resource […]
  // A user agent can perform a retrieval request targeting that URI
  // (a GET or HEAD request if using HTTP) […]
  statusCode === 303 && !/^(?:GET|HEAD)$/.test(this._options.method)) {
    this._options.method = "GET";
    this._requestBodyBuffers = [];
    removeMatchingHeaders(/^content-/i, this._options.headers);
  }
  var currentHostHeader = removeMatchingHeaders(/^host$/i, this._options.headers);
  var currentUrlParts = parseUrl(this._currentUrl);
  var currentHost = currentHostHeader || currentUrlParts.host;
  var currentUrl = /^\w+:/.test(location) ? this._currentUrl : url.format(Object.assign(currentUrlParts, { host: currentHost }));
  var redirectUrl = resolveUrl(location, currentUrl);
  debug("redirecting to", redirectUrl.href);
  this._isRedirect = true;
  spreadUrlObject(redirectUrl, this._options);
  if (redirectUrl.protocol !== currentUrlParts.protocol && redirectUrl.protocol !== "https:" || redirectUrl.host !== currentHost && !isSubdomain(redirectUrl.host, currentHost)) {
    removeMatchingHeaders(/^(?:(?:proxy-)?authorization|cookie)$/i, this._options.headers);
  }
  if (isFunction(beforeRedirect)) {
    var responseDetails = {
      headers: response.headers,
      statusCode
    };
    var requestDetails = {
      url: currentUrl,
      method,
      headers: requestHeaders
    };
    beforeRedirect(this._options, responseDetails, requestDetails);
    this._sanitizeOptions(this._options);
  }
  this._performRequest();
};
function wrap(protocols) {
  var exports = {
    maxRedirects: 21,
    maxBodyLength: 10 * 1024 * 1024
  };
  var nativeProtocols = {};
  Object.keys(protocols).forEach(function(scheme) {
    var protocol = scheme + ":";
    var nativeProtocol = nativeProtocols[protocol] = protocols[scheme];
    var wrappedProtocol = exports[scheme] = Object.create(nativeProtocol);
    function request(input, options, callback) {
      if (isURL(input)) {
        input = spreadUrlObject(input);
      } else if (isString(input)) {
        input = spreadUrlObject(parseUrl(input));
      } else {
        callback = options;
        options = validateUrl(input);
        input = { protocol };
      }
      if (isFunction(options)) {
        callback = options;
        options = null;
      }
      options = Object.assign({
        maxRedirects: exports.maxRedirects,
        maxBodyLength: exports.maxBodyLength
      }, input, options);
      options.nativeProtocols = nativeProtocols;
      if (!isString(options.host) && !isString(options.hostname)) {
        options.hostname = "::1";
      }
      assert.equal(options.protocol, protocol, "protocol mismatch");
      debug("options", options);
      return new RedirectableRequest(options, callback);
    }
    function get2(input, options, callback) {
      var wrappedRequest = wrappedProtocol.request(input, options, callback);
      wrappedRequest.end();
      return wrappedRequest;
    }
    Object.defineProperties(wrappedProtocol, {
      request: { value: request, configurable: true, enumerable: true, writable: true },
      get: { value: get2, configurable: true, enumerable: true, writable: true }
    });
  });
  return exports;
}
function noop() {
}
function parseUrl(input) {
  var parsed;
  if (useNativeURL) {
    parsed = new URL$1(input);
  } else {
    parsed = validateUrl(url.parse(input));
    if (!isString(parsed.protocol)) {
      throw new InvalidUrlError({ input });
    }
  }
  return parsed;
}
function resolveUrl(relative, base) {
  return useNativeURL ? new URL$1(relative, base) : parseUrl(url.resolve(base, relative));
}
function validateUrl(input) {
  if (/^\[/.test(input.hostname) && !/^\[[:0-9a-f]+\]$/i.test(input.hostname)) {
    throw new InvalidUrlError({ input: input.href || input });
  }
  if (/^\[/.test(input.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(input.host)) {
    throw new InvalidUrlError({ input: input.href || input });
  }
  return input;
}
function spreadUrlObject(urlObject, target) {
  var spread2 = target || {};
  for (var key of preservedUrlFields) {
    spread2[key] = urlObject[key];
  }
  if (spread2.hostname.startsWith("[")) {
    spread2.hostname = spread2.hostname.slice(1, -1);
  }
  if (spread2.port !== "") {
    spread2.port = Number(spread2.port);
  }
  spread2.path = spread2.search ? spread2.pathname + spread2.search : spread2.pathname;
  return spread2;
}
function removeMatchingHeaders(regex, headers) {
  var lastValue;
  for (var header in headers) {
    if (regex.test(header)) {
      lastValue = headers[header];
      delete headers[header];
    }
  }
  return lastValue === null || typeof lastValue === "undefined" ? void 0 : String(lastValue).trim();
}
function createErrorType(code, message, baseClass) {
  function CustomError(properties) {
    if (isFunction(Error.captureStackTrace)) {
      Error.captureStackTrace(this, this.constructor);
    }
    Object.assign(this, properties || {});
    this.code = code;
    this.message = this.cause ? message + ": " + this.cause.message : message;
  }
  CustomError.prototype = new (baseClass || Error)();
  Object.defineProperties(CustomError.prototype, {
    constructor: {
      value: CustomError,
      enumerable: false
    },
    name: {
      value: "Error [" + code + "]",
      enumerable: false
    }
  });
  return CustomError;
}
function destroyRequest(request, error) {
  for (var event of events) {
    request.removeListener(event, eventHandlers[event]);
  }
  request.on("error", noop);
  request.destroy(error);
}
function isSubdomain(subdomain, domain) {
  assert(isString(subdomain) && isString(domain));
  var dot = subdomain.length - domain.length - 1;
  return dot > 0 && subdomain[dot] === "." && subdomain.endsWith(domain);
}
function isString(value) {
  return typeof value === "string" || value instanceof String;
}
function isFunction(value) {
  return typeof value === "function";
}
function isBuffer(value) {
  return typeof value === "object" && "length" in value;
}
function isURL(value) {
  return URL$1 && value instanceof URL$1;
}
followRedirects$1.exports = wrap({ http, https });
followRedirects$1.exports.wrap = wrap;
var followRedirectsExports = followRedirects$1.exports;
const followRedirects = /* @__PURE__ */ getDefaultExportFromCjs(followRedirectsExports);
const VERSION$1 = "1.11.0";
function parseProtocol(url2) {
  const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url2);
  return match && match[1] || "";
}
const DATA_URL_PATTERN = /^(?:([^;]+);)?(?:[^;]+;)?(base64|),([\s\S]*)$/;
function fromDataURI(uri2, asBlob, options) {
  const _Blob = options && options.Blob || platform.classes.Blob;
  const protocol = parseProtocol(uri2);
  if (asBlob === void 0 && _Blob) {
    asBlob = true;
  }
  if (protocol === "data") {
    uri2 = protocol.length ? uri2.slice(protocol.length + 1) : uri2;
    const match = DATA_URL_PATTERN.exec(uri2);
    if (!match) {
      throw new AxiosError$1("Invalid URL", AxiosError$1.ERR_INVALID_URL);
    }
    const mime2 = match[1];
    const isBase64 = match[2];
    const body = match[3];
    const buffer = Buffer.from(decodeURIComponent(body), isBase64 ? "base64" : "utf8");
    if (asBlob) {
      if (!_Blob) {
        throw new AxiosError$1("Blob is not supported", AxiosError$1.ERR_NOT_SUPPORT);
      }
      return new _Blob([buffer], { type: mime2 });
    }
    return buffer;
  }
  throw new AxiosError$1("Unsupported protocol " + protocol, AxiosError$1.ERR_NOT_SUPPORT);
}
const kInternals = Symbol("internals");
class AxiosTransformStream extends stream.Transform {
  constructor(options) {
    options = utils$1.toFlatObject(options, {
      maxRate: 0,
      chunkSize: 64 * 1024,
      minChunkSize: 100,
      timeWindow: 500,
      ticksRate: 2,
      samplesCount: 15
    }, null, (prop, source) => {
      return !utils$1.isUndefined(source[prop]);
    });
    super({
      readableHighWaterMark: options.chunkSize
    });
    const internals = this[kInternals] = {
      timeWindow: options.timeWindow,
      chunkSize: options.chunkSize,
      maxRate: options.maxRate,
      minChunkSize: options.minChunkSize,
      bytesSeen: 0,
      isCaptured: false,
      notifiedBytesLoaded: 0,
      ts: Date.now(),
      bytes: 0,
      onReadCallback: null
    };
    this.on("newListener", (event) => {
      if (event === "progress") {
        if (!internals.isCaptured) {
          internals.isCaptured = true;
        }
      }
    });
  }
  _read(size) {
    const internals = this[kInternals];
    if (internals.onReadCallback) {
      internals.onReadCallback();
    }
    return super._read(size);
  }
  _transform(chunk, encoding, callback) {
    const internals = this[kInternals];
    const maxRate = internals.maxRate;
    const readableHighWaterMark = this.readableHighWaterMark;
    const timeWindow = internals.timeWindow;
    const divider = 1e3 / timeWindow;
    const bytesThreshold = maxRate / divider;
    const minChunkSize = internals.minChunkSize !== false ? Math.max(internals.minChunkSize, bytesThreshold * 0.01) : 0;
    const pushChunk = (_chunk, _callback) => {
      const bytes = Buffer.byteLength(_chunk);
      internals.bytesSeen += bytes;
      internals.bytes += bytes;
      internals.isCaptured && this.emit("progress", internals.bytesSeen);
      if (this.push(_chunk)) {
        process.nextTick(_callback);
      } else {
        internals.onReadCallback = () => {
          internals.onReadCallback = null;
          process.nextTick(_callback);
        };
      }
    };
    const transformChunk = (_chunk, _callback) => {
      const chunkSize = Buffer.byteLength(_chunk);
      let chunkRemainder = null;
      let maxChunkSize = readableHighWaterMark;
      let bytesLeft;
      let passed = 0;
      if (maxRate) {
        const now = Date.now();
        if (!internals.ts || (passed = now - internals.ts) >= timeWindow) {
          internals.ts = now;
          bytesLeft = bytesThreshold - internals.bytes;
          internals.bytes = bytesLeft < 0 ? -bytesLeft : 0;
          passed = 0;
        }
        bytesLeft = bytesThreshold - internals.bytes;
      }
      if (maxRate) {
        if (bytesLeft <= 0) {
          return setTimeout(() => {
            _callback(null, _chunk);
          }, timeWindow - passed);
        }
        if (bytesLeft < maxChunkSize) {
          maxChunkSize = bytesLeft;
        }
      }
      if (maxChunkSize && chunkSize > maxChunkSize && chunkSize - maxChunkSize > minChunkSize) {
        chunkRemainder = _chunk.subarray(maxChunkSize);
        _chunk = _chunk.subarray(0, maxChunkSize);
      }
      pushChunk(_chunk, chunkRemainder ? () => {
        process.nextTick(_callback, null, chunkRemainder);
      } : _callback);
    };
    transformChunk(chunk, function transformNextChunk(err, _chunk) {
      if (err) {
        return callback(err);
      }
      if (_chunk) {
        transformChunk(_chunk, transformNextChunk);
      } else {
        callback(null);
      }
    });
  }
}
const { asyncIterator } = Symbol;
const readBlob = async function* (blob) {
  if (blob.stream) {
    yield* blob.stream();
  } else if (blob.arrayBuffer) {
    yield await blob.arrayBuffer();
  } else if (blob[asyncIterator]) {
    yield* blob[asyncIterator]();
  } else {
    yield blob;
  }
};
const BOUNDARY_ALPHABET = platform.ALPHABET.ALPHA_DIGIT + "-_";
const textEncoder = typeof TextEncoder === "function" ? new TextEncoder() : new require$$1$1.TextEncoder();
const CRLF = "\r\n";
const CRLF_BYTES = textEncoder.encode(CRLF);
const CRLF_BYTES_COUNT = 2;
class FormDataPart {
  constructor(name, value) {
    const { escapeName } = this.constructor;
    const isStringValue = utils$1.isString(value);
    let headers = `Content-Disposition: form-data; name="${escapeName(name)}"${!isStringValue && value.name ? `; filename="${escapeName(value.name)}"` : ""}${CRLF}`;
    if (isStringValue) {
      value = textEncoder.encode(String(value).replace(/\r?\n|\r\n?/g, CRLF));
    } else {
      headers += `Content-Type: ${value.type || "application/octet-stream"}${CRLF}`;
    }
    this.headers = textEncoder.encode(headers + CRLF);
    this.contentLength = isStringValue ? value.byteLength : value.size;
    this.size = this.headers.byteLength + this.contentLength + CRLF_BYTES_COUNT;
    this.name = name;
    this.value = value;
  }
  async *encode() {
    yield this.headers;
    const { value } = this;
    if (utils$1.isTypedArray(value)) {
      yield value;
    } else {
      yield* readBlob(value);
    }
    yield CRLF_BYTES;
  }
  static escapeName(name) {
    return String(name).replace(/[\r\n"]/g, (match) => ({
      "\r": "%0D",
      "\n": "%0A",
      '"': "%22"
    })[match]);
  }
}
const formDataToStream = (form, headersHandler, options) => {
  const {
    tag = "form-data-boundary",
    size = 25,
    boundary = tag + "-" + platform.generateString(size, BOUNDARY_ALPHABET)
  } = options || {};
  if (!utils$1.isFormData(form)) {
    throw TypeError("FormData instance required");
  }
  if (boundary.length < 1 || boundary.length > 70) {
    throw Error("boundary must be 10-70 characters long");
  }
  const boundaryBytes = textEncoder.encode("--" + boundary + CRLF);
  const footerBytes = textEncoder.encode("--" + boundary + "--" + CRLF);
  let contentLength = footerBytes.byteLength;
  const parts = Array.from(form.entries()).map(([name, value]) => {
    const part = new FormDataPart(name, value);
    contentLength += part.size;
    return part;
  });
  contentLength += boundaryBytes.byteLength * parts.length;
  contentLength = utils$1.toFiniteNumber(contentLength);
  const computedHeaders = {
    "Content-Type": `multipart/form-data; boundary=${boundary}`
  };
  if (Number.isFinite(contentLength)) {
    computedHeaders["Content-Length"] = contentLength;
  }
  headersHandler && headersHandler(computedHeaders);
  return stream.Readable.from(async function* () {
    for (const part of parts) {
      yield boundaryBytes;
      yield* part.encode();
    }
    yield footerBytes;
  }());
};
class ZlibHeaderTransformStream extends stream.Transform {
  __transform(chunk, encoding, callback) {
    this.push(chunk);
    callback();
  }
  _transform(chunk, encoding, callback) {
    if (chunk.length !== 0) {
      this._transform = this.__transform;
      if (chunk[0] !== 120) {
        const header = Buffer.alloc(2);
        header[0] = 120;
        header[1] = 156;
        this.push(header, encoding);
      }
    }
    this.__transform(chunk, encoding, callback);
  }
}
const callbackify = (fn, reducer) => {
  return utils$1.isAsyncFn(fn) ? function(...args) {
    const cb = args.pop();
    fn.apply(this, args).then((value) => {
      try {
        reducer ? cb(null, ...reducer(value)) : cb(null, value);
      } catch (err) {
        cb(err);
      }
    }, cb);
  } : fn;
};
function speedometer(samplesCount, min2) {
  samplesCount = samplesCount || 10;
  const bytes = new Array(samplesCount);
  const timestamps = new Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;
  min2 = min2 !== void 0 ? min2 : 1e3;
  return function push(chunkLength) {
    const now = Date.now();
    const startedAt = timestamps[tail];
    if (!firstSampleTS) {
      firstSampleTS = now;
    }
    bytes[head] = chunkLength;
    timestamps[head] = now;
    let i = tail;
    let bytesCount = 0;
    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }
    head = (head + 1) % samplesCount;
    if (head === tail) {
      tail = (tail + 1) % samplesCount;
    }
    if (now - firstSampleTS < min2) {
      return;
    }
    const passed = startedAt && now - startedAt;
    return passed ? Math.round(bytesCount * 1e3 / passed) : void 0;
  };
}
function throttle(fn, freq) {
  let timestamp = 0;
  let threshold = 1e3 / freq;
  let lastArgs;
  let timer;
  const invoke = (args, now = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn(...args);
  };
  const throttled = (...args) => {
    const now = Date.now();
    const passed = now - timestamp;
    if (passed >= threshold) {
      invoke(args, now);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          invoke(lastArgs);
        }, threshold - passed);
      }
    }
  };
  const flush = () => lastArgs && invoke(lastArgs);
  return [throttled, flush];
}
const progressEventReducer = (listener, isDownloadStream, freq = 3) => {
  let bytesNotified = 0;
  const _speedometer = speedometer(50, 250);
  return throttle((e) => {
    const loaded = e.loaded;
    const total = e.lengthComputable ? e.total : void 0;
    const progressBytes = loaded - bytesNotified;
    const rate = _speedometer(progressBytes);
    const inRange = loaded <= total;
    bytesNotified = loaded;
    const data = {
      loaded,
      total,
      progress: total ? loaded / total : void 0,
      bytes: progressBytes,
      rate: rate ? rate : void 0,
      estimated: rate && total && inRange ? (total - loaded) / rate : void 0,
      event: e,
      lengthComputable: total != null,
      [isDownloadStream ? "download" : "upload"]: true
    };
    listener(data);
  }, freq);
};
const progressEventDecorator = (total, throttled) => {
  const lengthComputable = total != null;
  return [(loaded) => throttled[0]({
    lengthComputable,
    total,
    loaded
  }), throttled[1]];
};
const asyncDecorator = (fn) => (...args) => utils$1.asap(() => fn(...args));
const zlibOptions = {
  flush: zlib.constants.Z_SYNC_FLUSH,
  finishFlush: zlib.constants.Z_SYNC_FLUSH
};
const brotliOptions = {
  flush: zlib.constants.BROTLI_OPERATION_FLUSH,
  finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH
};
const isBrotliSupported = utils$1.isFunction(zlib.createBrotliDecompress);
const { http: httpFollow, https: httpsFollow } = followRedirects;
const isHttps = /https:?/;
const supportedProtocols = platform.protocols.map((protocol) => {
  return protocol + ":";
});
const flushOnFinish = (stream2, [throttled, flush]) => {
  stream2.on("end", flush).on("error", flush);
  return throttled;
};
function dispatchBeforeRedirect(options, responseDetails) {
  if (options.beforeRedirects.proxy) {
    options.beforeRedirects.proxy(options);
  }
  if (options.beforeRedirects.config) {
    options.beforeRedirects.config(options, responseDetails);
  }
}
function setProxy(options, configProxy, location) {
  let proxy = configProxy;
  if (!proxy && proxy !== false) {
    const proxyUrl = proxyFromEnv.getProxyForUrl(location);
    if (proxyUrl) {
      proxy = new URL(proxyUrl);
    }
  }
  if (proxy) {
    if (proxy.username) {
      proxy.auth = (proxy.username || "") + ":" + (proxy.password || "");
    }
    if (proxy.auth) {
      if (proxy.auth.username || proxy.auth.password) {
        proxy.auth = (proxy.auth.username || "") + ":" + (proxy.auth.password || "");
      }
      const base64 = Buffer.from(proxy.auth, "utf8").toString("base64");
      options.headers["Proxy-Authorization"] = "Basic " + base64;
    }
    options.headers.host = options.hostname + (options.port ? ":" + options.port : "");
    const proxyHost = proxy.hostname || proxy.host;
    options.hostname = proxyHost;
    options.host = proxyHost;
    options.port = proxy.port;
    options.path = location;
    if (proxy.protocol) {
      options.protocol = proxy.protocol.includes(":") ? proxy.protocol : `${proxy.protocol}:`;
    }
  }
  options.beforeRedirects.proxy = function beforeRedirect(redirectOptions) {
    setProxy(redirectOptions, configProxy, redirectOptions.href);
  };
}
const isHttpAdapterSupported = typeof process !== "undefined" && utils$1.kindOf(process) === "process";
const wrapAsync = (asyncExecutor) => {
  return new Promise((resolve, reject) => {
    let onDone;
    let isDone;
    const done = (value, isRejected) => {
      if (isDone) return;
      isDone = true;
      onDone && onDone(value, isRejected);
    };
    const _resolve = (value) => {
      done(value);
      resolve(value);
    };
    const _reject = (reason) => {
      done(reason, true);
      reject(reason);
    };
    asyncExecutor(_resolve, _reject, (onDoneHandler) => onDone = onDoneHandler).catch(_reject);
  });
};
const resolveFamily = ({ address, family }) => {
  if (!utils$1.isString(address)) {
    throw TypeError("address must be a string");
  }
  return {
    address,
    family: family || (address.indexOf(".") < 0 ? 6 : 4)
  };
};
const buildAddressEntry = (address, family) => resolveFamily(utils$1.isObject(address) ? address : { address, family });
const httpAdapter = isHttpAdapterSupported && function httpAdapter2(config) {
  return wrapAsync(async function dispatchHttpRequest(resolve, reject, onDone) {
    let { data, lookup, family } = config;
    const { responseType, responseEncoding } = config;
    const method = config.method.toUpperCase();
    let isDone;
    let rejected = false;
    let req;
    if (lookup) {
      const _lookup = callbackify(lookup, (value) => utils$1.isArray(value) ? value : [value]);
      lookup = (hostname, opt, cb) => {
        _lookup(hostname, opt, (err, arg0, arg1) => {
          if (err) {
            return cb(err);
          }
          const addresses = utils$1.isArray(arg0) ? arg0.map((addr) => buildAddressEntry(addr)) : [buildAddressEntry(arg0, arg1)];
          opt.all ? cb(err, addresses) : cb(err, addresses[0].address, addresses[0].family);
        });
      };
    }
    const emitter = new require$$4.EventEmitter();
    const onFinished = () => {
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(abort2);
      }
      if (config.signal) {
        config.signal.removeEventListener("abort", abort2);
      }
      emitter.removeAllListeners();
    };
    onDone((value, isRejected) => {
      isDone = true;
      if (isRejected) {
        rejected = true;
        onFinished();
      }
    });
    function abort2(reason) {
      emitter.emit("abort", !reason || reason.type ? new CanceledError$1(null, config, req) : reason);
    }
    emitter.once("abort", reject);
    if (config.cancelToken || config.signal) {
      config.cancelToken && config.cancelToken.subscribe(abort2);
      if (config.signal) {
        config.signal.aborted ? abort2() : config.signal.addEventListener("abort", abort2);
      }
    }
    const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
    const parsed = new URL(fullPath, platform.hasBrowserEnv ? platform.origin : void 0);
    const protocol = parsed.protocol || supportedProtocols[0];
    if (protocol === "data:") {
      let convertedData;
      if (method !== "GET") {
        return settle(resolve, reject, {
          status: 405,
          statusText: "method not allowed",
          headers: {},
          config
        });
      }
      try {
        convertedData = fromDataURI(config.url, responseType === "blob", {
          Blob: config.env && config.env.Blob
        });
      } catch (err) {
        throw AxiosError$1.from(err, AxiosError$1.ERR_BAD_REQUEST, config);
      }
      if (responseType === "text") {
        convertedData = convertedData.toString(responseEncoding);
        if (!responseEncoding || responseEncoding === "utf8") {
          convertedData = utils$1.stripBOM(convertedData);
        }
      } else if (responseType === "stream") {
        convertedData = stream.Readable.from(convertedData);
      }
      return settle(resolve, reject, {
        data: convertedData,
        status: 200,
        statusText: "OK",
        headers: new AxiosHeaders$1(),
        config
      });
    }
    if (supportedProtocols.indexOf(protocol) === -1) {
      return reject(new AxiosError$1(
        "Unsupported protocol " + protocol,
        AxiosError$1.ERR_BAD_REQUEST,
        config
      ));
    }
    const headers = AxiosHeaders$1.from(config.headers).normalize();
    headers.set("User-Agent", "axios/" + VERSION$1, false);
    const { onUploadProgress, onDownloadProgress } = config;
    const maxRate = config.maxRate;
    let maxUploadRate = void 0;
    let maxDownloadRate = void 0;
    if (utils$1.isSpecCompliantForm(data)) {
      const userBoundary = headers.getContentType(/boundary=([-_\w\d]{10,70})/i);
      data = formDataToStream(data, (formHeaders) => {
        headers.set(formHeaders);
      }, {
        tag: `axios-${VERSION$1}-boundary`,
        boundary: userBoundary && userBoundary[1] || void 0
      });
    } else if (utils$1.isFormData(data) && utils$1.isFunction(data.getHeaders)) {
      headers.set(data.getHeaders());
      if (!headers.hasContentLength()) {
        try {
          const knownLength = await require$$1$1.promisify(data.getLength).call(data);
          Number.isFinite(knownLength) && knownLength >= 0 && headers.setContentLength(knownLength);
        } catch (e) {
        }
      }
    } else if (utils$1.isBlob(data) || utils$1.isFile(data)) {
      data.size && headers.setContentType(data.type || "application/octet-stream");
      headers.setContentLength(data.size || 0);
      data = stream.Readable.from(readBlob(data));
    } else if (data && !utils$1.isStream(data)) {
      if (Buffer.isBuffer(data)) ;
      else if (utils$1.isArrayBuffer(data)) {
        data = Buffer.from(new Uint8Array(data));
      } else if (utils$1.isString(data)) {
        data = Buffer.from(data, "utf-8");
      } else {
        return reject(new AxiosError$1(
          "Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream",
          AxiosError$1.ERR_BAD_REQUEST,
          config
        ));
      }
      headers.setContentLength(data.length, false);
      if (config.maxBodyLength > -1 && data.length > config.maxBodyLength) {
        return reject(new AxiosError$1(
          "Request body larger than maxBodyLength limit",
          AxiosError$1.ERR_BAD_REQUEST,
          config
        ));
      }
    }
    const contentLength = utils$1.toFiniteNumber(headers.getContentLength());
    if (utils$1.isArray(maxRate)) {
      maxUploadRate = maxRate[0];
      maxDownloadRate = maxRate[1];
    } else {
      maxUploadRate = maxDownloadRate = maxRate;
    }
    if (data && (onUploadProgress || maxUploadRate)) {
      if (!utils$1.isStream(data)) {
        data = stream.Readable.from(data, { objectMode: false });
      }
      data = stream.pipeline([data, new AxiosTransformStream({
        maxRate: utils$1.toFiniteNumber(maxUploadRate)
      })], utils$1.noop);
      onUploadProgress && data.on("progress", flushOnFinish(
        data,
        progressEventDecorator(
          contentLength,
          progressEventReducer(asyncDecorator(onUploadProgress), false, 3)
        )
      ));
    }
    let auth = void 0;
    if (config.auth) {
      const username = config.auth.username || "";
      const password = config.auth.password || "";
      auth = username + ":" + password;
    }
    if (!auth && parsed.username) {
      const urlUsername = parsed.username;
      const urlPassword = parsed.password;
      auth = urlUsername + ":" + urlPassword;
    }
    auth && headers.delete("authorization");
    let path2;
    try {
      path2 = buildURL(
        parsed.pathname + parsed.search,
        config.params,
        config.paramsSerializer
      ).replace(/^\?/, "");
    } catch (err) {
      const customErr = new Error(err.message);
      customErr.config = config;
      customErr.url = config.url;
      customErr.exists = true;
      return reject(customErr);
    }
    headers.set(
      "Accept-Encoding",
      "gzip, compress, deflate" + (isBrotliSupported ? ", br" : ""),
      false
    );
    const options = {
      path: path2,
      method,
      headers: headers.toJSON(),
      agents: { http: config.httpAgent, https: config.httpsAgent },
      auth,
      protocol,
      family,
      beforeRedirect: dispatchBeforeRedirect,
      beforeRedirects: {}
    };
    !utils$1.isUndefined(lookup) && (options.lookup = lookup);
    if (config.socketPath) {
      options.socketPath = config.socketPath;
    } else {
      options.hostname = parsed.hostname.startsWith("[") ? parsed.hostname.slice(1, -1) : parsed.hostname;
      options.port = parsed.port;
      setProxy(options, config.proxy, protocol + "//" + parsed.hostname + (parsed.port ? ":" + parsed.port : "") + options.path);
    }
    let transport;
    const isHttpsRequest = isHttps.test(options.protocol);
    options.agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;
    if (config.transport) {
      transport = config.transport;
    } else if (config.maxRedirects === 0) {
      transport = isHttpsRequest ? require$$1 : require$$0$4;
    } else {
      if (config.maxRedirects) {
        options.maxRedirects = config.maxRedirects;
      }
      if (config.beforeRedirect) {
        options.beforeRedirects.config = config.beforeRedirect;
      }
      transport = isHttpsRequest ? httpsFollow : httpFollow;
    }
    if (config.maxBodyLength > -1) {
      options.maxBodyLength = config.maxBodyLength;
    } else {
      options.maxBodyLength = Infinity;
    }
    if (config.insecureHTTPParser) {
      options.insecureHTTPParser = config.insecureHTTPParser;
    }
    req = transport.request(options, function handleResponse(res) {
      if (req.destroyed) return;
      const streams = [res];
      const responseLength = +res.headers["content-length"];
      if (onDownloadProgress || maxDownloadRate) {
        const transformStream = new AxiosTransformStream({
          maxRate: utils$1.toFiniteNumber(maxDownloadRate)
        });
        onDownloadProgress && transformStream.on("progress", flushOnFinish(
          transformStream,
          progressEventDecorator(
            responseLength,
            progressEventReducer(asyncDecorator(onDownloadProgress), true, 3)
          )
        ));
        streams.push(transformStream);
      }
      let responseStream = res;
      const lastRequest = res.req || req;
      if (config.decompress !== false && res.headers["content-encoding"]) {
        if (method === "HEAD" || res.statusCode === 204) {
          delete res.headers["content-encoding"];
        }
        switch ((res.headers["content-encoding"] || "").toLowerCase()) {
          case "gzip":
          case "x-gzip":
          case "compress":
          case "x-compress":
            streams.push(zlib.createUnzip(zlibOptions));
            delete res.headers["content-encoding"];
            break;
          case "deflate":
            streams.push(new ZlibHeaderTransformStream());
            streams.push(zlib.createUnzip(zlibOptions));
            delete res.headers["content-encoding"];
            break;
          case "br":
            if (isBrotliSupported) {
              streams.push(zlib.createBrotliDecompress(brotliOptions));
              delete res.headers["content-encoding"];
            }
        }
      }
      responseStream = streams.length > 1 ? stream.pipeline(streams, utils$1.noop) : streams[0];
      const offListeners = stream.finished(responseStream, () => {
        offListeners();
        onFinished();
      });
      const response = {
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: new AxiosHeaders$1(res.headers),
        config,
        request: lastRequest
      };
      if (responseType === "stream") {
        response.data = responseStream;
        settle(resolve, reject, response);
      } else {
        const responseBuffer = [];
        let totalResponseBytes = 0;
        responseStream.on("data", function handleStreamData(chunk) {
          responseBuffer.push(chunk);
          totalResponseBytes += chunk.length;
          if (config.maxContentLength > -1 && totalResponseBytes > config.maxContentLength) {
            rejected = true;
            responseStream.destroy();
            reject(new AxiosError$1(
              "maxContentLength size of " + config.maxContentLength + " exceeded",
              AxiosError$1.ERR_BAD_RESPONSE,
              config,
              lastRequest
            ));
          }
        });
        responseStream.on("aborted", function handlerStreamAborted() {
          if (rejected) {
            return;
          }
          const err = new AxiosError$1(
            "stream has been aborted",
            AxiosError$1.ERR_BAD_RESPONSE,
            config,
            lastRequest
          );
          responseStream.destroy(err);
          reject(err);
        });
        responseStream.on("error", function handleStreamError(err) {
          if (req.destroyed) return;
          reject(AxiosError$1.from(err, null, config, lastRequest));
        });
        responseStream.on("end", function handleStreamEnd() {
          try {
            let responseData = responseBuffer.length === 1 ? responseBuffer[0] : Buffer.concat(responseBuffer);
            if (responseType !== "arraybuffer") {
              responseData = responseData.toString(responseEncoding);
              if (!responseEncoding || responseEncoding === "utf8") {
                responseData = utils$1.stripBOM(responseData);
              }
            }
            response.data = responseData;
          } catch (err) {
            return reject(AxiosError$1.from(err, null, config, response.request, response));
          }
          settle(resolve, reject, response);
        });
      }
      emitter.once("abort", (err) => {
        if (!responseStream.destroyed) {
          responseStream.emit("error", err);
          responseStream.destroy();
        }
      });
    });
    emitter.once("abort", (err) => {
      reject(err);
      req.destroy(err);
    });
    req.on("error", function handleRequestError(err) {
      reject(AxiosError$1.from(err, null, config, req));
    });
    req.on("socket", function handleRequestSocket(socket) {
      socket.setKeepAlive(true, 1e3 * 60);
    });
    if (config.timeout) {
      const timeout = parseInt(config.timeout, 10);
      if (Number.isNaN(timeout)) {
        reject(new AxiosError$1(
          "error trying to parse `config.timeout` to int",
          AxiosError$1.ERR_BAD_OPTION_VALUE,
          config,
          req
        ));
        return;
      }
      req.setTimeout(timeout, function handleRequestTimeout() {
        if (isDone) return;
        let timeoutErrorMessage = config.timeout ? "timeout of " + config.timeout + "ms exceeded" : "timeout exceeded";
        const transitional2 = config.transitional || transitionalDefaults;
        if (config.timeoutErrorMessage) {
          timeoutErrorMessage = config.timeoutErrorMessage;
        }
        reject(new AxiosError$1(
          timeoutErrorMessage,
          transitional2.clarifyTimeoutError ? AxiosError$1.ETIMEDOUT : AxiosError$1.ECONNABORTED,
          config,
          req
        ));
        abort2();
      });
    }
    if (utils$1.isStream(data)) {
      let ended = false;
      let errored = false;
      data.on("end", () => {
        ended = true;
      });
      data.once("error", (err) => {
        errored = true;
        req.destroy(err);
      });
      data.on("close", () => {
        if (!ended && !errored) {
          abort2(new CanceledError$1("Request stream has been aborted", config, req));
        }
      });
      data.pipe(req);
    } else {
      req.end(data);
    }
  });
};
const isURLSameOrigin = platform.hasStandardBrowserEnv ? /* @__PURE__ */ ((origin2, isMSIE) => (url2) => {
  url2 = new URL(url2, platform.origin);
  return origin2.protocol === url2.protocol && origin2.host === url2.host && (isMSIE || origin2.port === url2.port);
})(
  new URL(platform.origin),
  platform.navigator && /(msie|trident)/i.test(platform.navigator.userAgent)
) : () => true;
const cookies = platform.hasStandardBrowserEnv ? (
  // Standard browser envs support document.cookie
  {
    write(name, value, expires, path2, domain, secure) {
      const cookie = [name + "=" + encodeURIComponent(value)];
      utils$1.isNumber(expires) && cookie.push("expires=" + new Date(expires).toGMTString());
      utils$1.isString(path2) && cookie.push("path=" + path2);
      utils$1.isString(domain) && cookie.push("domain=" + domain);
      secure === true && cookie.push("secure");
      document.cookie = cookie.join("; ");
    },
    read(name) {
      const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
      return match ? decodeURIComponent(match[3]) : null;
    },
    remove(name) {
      this.write(name, "", Date.now() - 864e5);
    }
  }
) : (
  // Non-standard browser env (web workers, react-native) lack needed support.
  {
    write() {
    },
    read() {
      return null;
    },
    remove() {
    }
  }
);
const headersToObject = (thing) => thing instanceof AxiosHeaders$1 ? { ...thing } : thing;
function mergeConfig$1(config1, config2) {
  config2 = config2 || {};
  const config = {};
  function getMergedValue(target, source, prop, caseless) {
    if (utils$1.isPlainObject(target) && utils$1.isPlainObject(source)) {
      return utils$1.merge.call({ caseless }, target, source);
    } else if (utils$1.isPlainObject(source)) {
      return utils$1.merge({}, source);
    } else if (utils$1.isArray(source)) {
      return source.slice();
    }
    return source;
  }
  function mergeDeepProperties(a, b, prop, caseless) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(a, b, prop, caseless);
    } else if (!utils$1.isUndefined(a)) {
      return getMergedValue(void 0, a, prop, caseless);
    }
  }
  function valueFromConfig2(a, b) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(void 0, b);
    }
  }
  function defaultToConfig2(a, b) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(void 0, b);
    } else if (!utils$1.isUndefined(a)) {
      return getMergedValue(void 0, a);
    }
  }
  function mergeDirectKeys(a, b, prop) {
    if (prop in config2) {
      return getMergedValue(a, b);
    } else if (prop in config1) {
      return getMergedValue(void 0, a);
    }
  }
  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true)
  };
  utils$1.forEach(Object.keys({ ...config1, ...config2 }), function computeConfigValue(prop) {
    const merge2 = mergeMap[prop] || mergeDeepProperties;
    const configValue = merge2(config1[prop], config2[prop], prop);
    utils$1.isUndefined(configValue) && merge2 !== mergeDirectKeys || (config[prop] = configValue);
  });
  return config;
}
const resolveConfig = (config) => {
  const newConfig = mergeConfig$1({}, config);
  let { data, withXSRFToken, xsrfHeaderName, xsrfCookieName, headers, auth } = newConfig;
  newConfig.headers = headers = AxiosHeaders$1.from(headers);
  newConfig.url = buildURL(buildFullPath(newConfig.baseURL, newConfig.url, newConfig.allowAbsoluteUrls), config.params, config.paramsSerializer);
  if (auth) {
    headers.set(
      "Authorization",
      "Basic " + btoa((auth.username || "") + ":" + (auth.password ? unescape(encodeURIComponent(auth.password)) : ""))
    );
  }
  let contentType;
  if (utils$1.isFormData(data)) {
    if (platform.hasStandardBrowserEnv || platform.hasStandardBrowserWebWorkerEnv) {
      headers.setContentType(void 0);
    } else if ((contentType = headers.getContentType()) !== false) {
      const [type2, ...tokens] = contentType ? contentType.split(";").map((token) => token.trim()).filter(Boolean) : [];
      headers.setContentType([type2 || "multipart/form-data", ...tokens].join("; "));
    }
  }
  if (platform.hasStandardBrowserEnv) {
    withXSRFToken && utils$1.isFunction(withXSRFToken) && (withXSRFToken = withXSRFToken(newConfig));
    if (withXSRFToken || withXSRFToken !== false && isURLSameOrigin(newConfig.url)) {
      const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies.read(xsrfCookieName);
      if (xsrfValue) {
        headers.set(xsrfHeaderName, xsrfValue);
      }
    }
  }
  return newConfig;
};
const isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
const xhrAdapter = isXHRAdapterSupported && function(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    const _config = resolveConfig(config);
    let requestData = _config.data;
    const requestHeaders = AxiosHeaders$1.from(_config.headers).normalize();
    let { responseType, onUploadProgress, onDownloadProgress } = _config;
    let onCanceled;
    let uploadThrottled, downloadThrottled;
    let flushUpload, flushDownload;
    function done() {
      flushUpload && flushUpload();
      flushDownload && flushDownload();
      _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
      _config.signal && _config.signal.removeEventListener("abort", onCanceled);
    }
    let request = new XMLHttpRequest();
    request.open(_config.method.toUpperCase(), _config.url, true);
    request.timeout = _config.timeout;
    function onloadend() {
      if (!request) {
        return;
      }
      const responseHeaders = AxiosHeaders$1.from(
        "getAllResponseHeaders" in request && request.getAllResponseHeaders()
      );
      const responseData = !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response;
      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config,
        request
      };
      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);
      request = null;
    }
    if ("onloadend" in request) {
      request.onloadend = onloadend;
    } else {
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf("file:") === 0)) {
          return;
        }
        setTimeout(onloadend);
      };
    }
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }
      reject(new AxiosError$1("Request aborted", AxiosError$1.ECONNABORTED, config, request));
      request = null;
    };
    request.onerror = function handleError() {
      reject(new AxiosError$1("Network Error", AxiosError$1.ERR_NETWORK, config, request));
      request = null;
    };
    request.ontimeout = function handleTimeout() {
      let timeoutErrorMessage = _config.timeout ? "timeout of " + _config.timeout + "ms exceeded" : "timeout exceeded";
      const transitional2 = _config.transitional || transitionalDefaults;
      if (_config.timeoutErrorMessage) {
        timeoutErrorMessage = _config.timeoutErrorMessage;
      }
      reject(new AxiosError$1(
        timeoutErrorMessage,
        transitional2.clarifyTimeoutError ? AxiosError$1.ETIMEDOUT : AxiosError$1.ECONNABORTED,
        config,
        request
      ));
      request = null;
    };
    requestData === void 0 && requestHeaders.setContentType(null);
    if ("setRequestHeader" in request) {
      utils$1.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
        request.setRequestHeader(key, val);
      });
    }
    if (!utils$1.isUndefined(_config.withCredentials)) {
      request.withCredentials = !!_config.withCredentials;
    }
    if (responseType && responseType !== "json") {
      request.responseType = _config.responseType;
    }
    if (onDownloadProgress) {
      [downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true);
      request.addEventListener("progress", downloadThrottled);
    }
    if (onUploadProgress && request.upload) {
      [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
      request.upload.addEventListener("progress", uploadThrottled);
      request.upload.addEventListener("loadend", flushUpload);
    }
    if (_config.cancelToken || _config.signal) {
      onCanceled = (cancel) => {
        if (!request) {
          return;
        }
        reject(!cancel || cancel.type ? new CanceledError$1(null, config, request) : cancel);
        request.abort();
        request = null;
      };
      _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
      if (_config.signal) {
        _config.signal.aborted ? onCanceled() : _config.signal.addEventListener("abort", onCanceled);
      }
    }
    const protocol = parseProtocol(_config.url);
    if (protocol && platform.protocols.indexOf(protocol) === -1) {
      reject(new AxiosError$1("Unsupported protocol " + protocol + ":", AxiosError$1.ERR_BAD_REQUEST, config));
      return;
    }
    request.send(requestData || null);
  });
};
const composeSignals = (signals, timeout) => {
  const { length } = signals = signals ? signals.filter(Boolean) : [];
  if (timeout || length) {
    let controller = new AbortController();
    let aborted;
    const onabort = function(reason) {
      if (!aborted) {
        aborted = true;
        unsubscribe();
        const err = reason instanceof Error ? reason : this.reason;
        controller.abort(err instanceof AxiosError$1 ? err : new CanceledError$1(err instanceof Error ? err.message : err));
      }
    };
    let timer = timeout && setTimeout(() => {
      timer = null;
      onabort(new AxiosError$1(`timeout ${timeout} of ms exceeded`, AxiosError$1.ETIMEDOUT));
    }, timeout);
    const unsubscribe = () => {
      if (signals) {
        timer && clearTimeout(timer);
        timer = null;
        signals.forEach((signal2) => {
          signal2.unsubscribe ? signal2.unsubscribe(onabort) : signal2.removeEventListener("abort", onabort);
        });
        signals = null;
      }
    };
    signals.forEach((signal2) => signal2.addEventListener("abort", onabort));
    const { signal } = controller;
    signal.unsubscribe = () => utils$1.asap(unsubscribe);
    return signal;
  }
};
const streamChunk = function* (chunk, chunkSize) {
  let len = chunk.byteLength;
  if (len < chunkSize) {
    yield chunk;
    return;
  }
  let pos = 0;
  let end;
  while (pos < len) {
    end = pos + chunkSize;
    yield chunk.slice(pos, end);
    pos = end;
  }
};
const readBytes = async function* (iterable, chunkSize) {
  for await (const chunk of readStream(iterable)) {
    yield* streamChunk(chunk, chunkSize);
  }
};
const readStream = async function* (stream2) {
  if (stream2[Symbol.asyncIterator]) {
    yield* stream2;
    return;
  }
  const reader2 = stream2.getReader();
  try {
    for (; ; ) {
      const { done, value } = await reader2.read();
      if (done) {
        break;
      }
      yield value;
    }
  } finally {
    await reader2.cancel();
  }
};
const trackStream = (stream2, chunkSize, onProgress, onFinish) => {
  const iterator2 = readBytes(stream2, chunkSize);
  let bytes = 0;
  let done;
  let _onFinish = (e) => {
    if (!done) {
      done = true;
      onFinish && onFinish(e);
    }
  };
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done: done2, value } = await iterator2.next();
        if (done2) {
          _onFinish();
          controller.close();
          return;
        }
        let len = value.byteLength;
        if (onProgress) {
          let loadedBytes = bytes += len;
          onProgress(loadedBytes);
        }
        controller.enqueue(new Uint8Array(value));
      } catch (err) {
        _onFinish(err);
        throw err;
      }
    },
    cancel(reason) {
      _onFinish(reason);
      return iterator2.return();
    }
  }, {
    highWaterMark: 2
  });
};
const isFetchSupported = typeof fetch === "function" && typeof Request === "function" && typeof Response === "function";
const isReadableStreamSupported = isFetchSupported && typeof ReadableStream === "function";
const encodeText = isFetchSupported && (typeof TextEncoder === "function" ? /* @__PURE__ */ ((encoder) => (str) => encoder.encode(str))(new TextEncoder()) : async (str) => new Uint8Array(await new Response(str).arrayBuffer()));
const test = (fn, ...args) => {
  try {
    return !!fn(...args);
  } catch (e) {
    return false;
  }
};
const supportsRequestStream = isReadableStreamSupported && test(() => {
  let duplexAccessed = false;
  const hasContentType = new Request(platform.origin, {
    body: new ReadableStream(),
    method: "POST",
    get duplex() {
      duplexAccessed = true;
      return "half";
    }
  }).headers.has("Content-Type");
  return duplexAccessed && !hasContentType;
});
const DEFAULT_CHUNK_SIZE = 64 * 1024;
const supportsResponseStream = isReadableStreamSupported && test(() => utils$1.isReadableStream(new Response("").body));
const resolvers = {
  stream: supportsResponseStream && ((res) => res.body)
};
isFetchSupported && ((res) => {
  ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((type2) => {
    !resolvers[type2] && (resolvers[type2] = utils$1.isFunction(res[type2]) ? (res2) => res2[type2]() : (_, config) => {
      throw new AxiosError$1(`Response type '${type2}' is not supported`, AxiosError$1.ERR_NOT_SUPPORT, config);
    });
  });
})(new Response());
const getBodyLength = async (body) => {
  if (body == null) {
    return 0;
  }
  if (utils$1.isBlob(body)) {
    return body.size;
  }
  if (utils$1.isSpecCompliantForm(body)) {
    const _request = new Request(platform.origin, {
      method: "POST",
      body
    });
    return (await _request.arrayBuffer()).byteLength;
  }
  if (utils$1.isArrayBufferView(body) || utils$1.isArrayBuffer(body)) {
    return body.byteLength;
  }
  if (utils$1.isURLSearchParams(body)) {
    body = body + "";
  }
  if (utils$1.isString(body)) {
    return (await encodeText(body)).byteLength;
  }
};
const resolveBodyLength = async (headers, body) => {
  const length = utils$1.toFiniteNumber(headers.getContentLength());
  return length == null ? getBodyLength(body) : length;
};
const fetchAdapter = isFetchSupported && (async (config) => {
  let {
    url: url2,
    method,
    data,
    signal,
    cancelToken,
    timeout,
    onDownloadProgress,
    onUploadProgress,
    responseType,
    headers,
    withCredentials = "same-origin",
    fetchOptions
  } = resolveConfig(config);
  responseType = responseType ? (responseType + "").toLowerCase() : "text";
  let composedSignal = composeSignals([signal, cancelToken && cancelToken.toAbortSignal()], timeout);
  let request;
  const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
    composedSignal.unsubscribe();
  });
  let requestContentLength;
  try {
    if (onUploadProgress && supportsRequestStream && method !== "get" && method !== "head" && (requestContentLength = await resolveBodyLength(headers, data)) !== 0) {
      let _request = new Request(url2, {
        method: "POST",
        body: data,
        duplex: "half"
      });
      let contentTypeHeader;
      if (utils$1.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type"))) {
        headers.setContentType(contentTypeHeader);
      }
      if (_request.body) {
        const [onProgress, flush] = progressEventDecorator(
          requestContentLength,
          progressEventReducer(asyncDecorator(onUploadProgress))
        );
        data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
      }
    }
    if (!utils$1.isString(withCredentials)) {
      withCredentials = withCredentials ? "include" : "omit";
    }
    const isCredentialsSupported = "credentials" in Request.prototype;
    request = new Request(url2, {
      ...fetchOptions,
      signal: composedSignal,
      method: method.toUpperCase(),
      headers: headers.normalize().toJSON(),
      body: data,
      duplex: "half",
      credentials: isCredentialsSupported ? withCredentials : void 0
    });
    let response = await fetch(request, fetchOptions);
    const isStreamResponse = supportsResponseStream && (responseType === "stream" || responseType === "response");
    if (supportsResponseStream && (onDownloadProgress || isStreamResponse && unsubscribe)) {
      const options = {};
      ["status", "statusText", "headers"].forEach((prop) => {
        options[prop] = response[prop];
      });
      const responseContentLength = utils$1.toFiniteNumber(response.headers.get("content-length"));
      const [onProgress, flush] = onDownloadProgress && progressEventDecorator(
        responseContentLength,
        progressEventReducer(asyncDecorator(onDownloadProgress), true)
      ) || [];
      response = new Response(
        trackStream(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
          flush && flush();
          unsubscribe && unsubscribe();
        }),
        options
      );
    }
    responseType = responseType || "text";
    let responseData = await resolvers[utils$1.findKey(resolvers, responseType) || "text"](response, config);
    !isStreamResponse && unsubscribe && unsubscribe();
    return await new Promise((resolve, reject) => {
      settle(resolve, reject, {
        data: responseData,
        headers: AxiosHeaders$1.from(response.headers),
        status: response.status,
        statusText: response.statusText,
        config,
        request
      });
    });
  } catch (err) {
    unsubscribe && unsubscribe();
    if (err && err.name === "TypeError" && /Load failed|fetch/i.test(err.message)) {
      throw Object.assign(
        new AxiosError$1("Network Error", AxiosError$1.ERR_NETWORK, config, request),
        {
          cause: err.cause || err
        }
      );
    }
    throw AxiosError$1.from(err, err && err.code, config, request);
  }
});
const knownAdapters = {
  http: httpAdapter,
  xhr: xhrAdapter,
  fetch: fetchAdapter
};
utils$1.forEach(knownAdapters, (fn, value) => {
  if (fn) {
    try {
      Object.defineProperty(fn, "name", { value });
    } catch (e) {
    }
    Object.defineProperty(fn, "adapterName", { value });
  }
});
const renderReason = (reason) => `- ${reason}`;
const isResolvedHandle = (adapter) => utils$1.isFunction(adapter) || adapter === null || adapter === false;
const adapters = {
  getAdapter: (adapters2) => {
    adapters2 = utils$1.isArray(adapters2) ? adapters2 : [adapters2];
    const { length } = adapters2;
    let nameOrAdapter;
    let adapter;
    const rejectedReasons = {};
    for (let i = 0; i < length; i++) {
      nameOrAdapter = adapters2[i];
      let id;
      adapter = nameOrAdapter;
      if (!isResolvedHandle(nameOrAdapter)) {
        adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
        if (adapter === void 0) {
          throw new AxiosError$1(`Unknown adapter '${id}'`);
        }
      }
      if (adapter) {
        break;
      }
      rejectedReasons[id || "#" + i] = adapter;
    }
    if (!adapter) {
      const reasons = Object.entries(rejectedReasons).map(
        ([id, state2]) => `adapter ${id} ` + (state2 === false ? "is not supported by the environment" : "is not available in the build")
      );
      let s = length ? reasons.length > 1 ? "since :\n" + reasons.map(renderReason).join("\n") : " " + renderReason(reasons[0]) : "as no adapter specified";
      throw new AxiosError$1(
        `There is no suitable adapter to dispatch the request ` + s,
        "ERR_NOT_SUPPORT"
      );
    }
    return adapter;
  },
  adapters: knownAdapters
};
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
  if (config.signal && config.signal.aborted) {
    throw new CanceledError$1(null, config);
  }
}
function dispatchRequest(config) {
  throwIfCancellationRequested(config);
  config.headers = AxiosHeaders$1.from(config.headers);
  config.data = transformData.call(
    config,
    config.transformRequest
  );
  if (["post", "put", "patch"].indexOf(config.method) !== -1) {
    config.headers.setContentType("application/x-www-form-urlencoded", false);
  }
  const adapter = adapters.getAdapter(config.adapter || defaults.adapter);
  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);
    response.data = transformData.call(
      config,
      config.transformResponse,
      response
    );
    response.headers = AxiosHeaders$1.from(response.headers);
    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel$1(reason)) {
      throwIfCancellationRequested(config);
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          config.transformResponse,
          reason.response
        );
        reason.response.headers = AxiosHeaders$1.from(reason.response.headers);
      }
    }
    return Promise.reject(reason);
  });
}
const validators$1 = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach((type2, i) => {
  validators$1[type2] = function validator2(thing) {
    return typeof thing === type2 || "a" + (i < 1 ? "n " : " ") + type2;
  };
});
const deprecatedWarnings = {};
validators$1.transitional = function transitional(validator2, version, message) {
  function formatMessage(opt, desc) {
    return "[Axios v" + VERSION$1 + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
  }
  return (value, opt, opts) => {
    if (validator2 === false) {
      throw new AxiosError$1(
        formatMessage(opt, " has been removed" + (version ? " in " + version : "")),
        AxiosError$1.ERR_DEPRECATED
      );
    }
    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      console.warn(
        formatMessage(
          opt,
          " has been deprecated since v" + version + " and will be removed in the near future"
        )
      );
    }
    return validator2 ? validator2(value, opt, opts) : true;
  };
};
validators$1.spelling = function spelling(correctSpelling) {
  return (value, opt) => {
    console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
    return true;
  };
};
function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== "object") {
    throw new AxiosError$1("options must be an object", AxiosError$1.ERR_BAD_OPTION_VALUE);
  }
  const keys = Object.keys(options);
  let i = keys.length;
  while (i-- > 0) {
    const opt = keys[i];
    const validator2 = schema[opt];
    if (validator2) {
      const value = options[opt];
      const result = value === void 0 || validator2(value, opt, options);
      if (result !== true) {
        throw new AxiosError$1("option " + opt + " must be " + result, AxiosError$1.ERR_BAD_OPTION_VALUE);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError$1("Unknown option " + opt, AxiosError$1.ERR_BAD_OPTION);
    }
  }
}
const validator = {
  assertOptions,
  validators: validators$1
};
const validators = validator.validators;
let Axios$1 = class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig || {};
    this.interceptors = {
      request: new InterceptorManager(),
      response: new InterceptorManager()
    };
  }
  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  async request(configOrUrl, config) {
    try {
      return await this._request(configOrUrl, config);
    } catch (err) {
      if (err instanceof Error) {
        let dummy = {};
        Error.captureStackTrace ? Error.captureStackTrace(dummy) : dummy = new Error();
        const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, "") : "";
        try {
          if (!err.stack) {
            err.stack = stack;
          } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ""))) {
            err.stack += "\n" + stack;
          }
        } catch (e) {
        }
      }
      throw err;
    }
  }
  _request(configOrUrl, config) {
    if (typeof configOrUrl === "string") {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }
    config = mergeConfig$1(this.defaults, config);
    const { transitional: transitional2, paramsSerializer, headers } = config;
    if (transitional2 !== void 0) {
      validator.assertOptions(transitional2, {
        silentJSONParsing: validators.transitional(validators.boolean),
        forcedJSONParsing: validators.transitional(validators.boolean),
        clarifyTimeoutError: validators.transitional(validators.boolean)
      }, false);
    }
    if (paramsSerializer != null) {
      if (utils$1.isFunction(paramsSerializer)) {
        config.paramsSerializer = {
          serialize: paramsSerializer
        };
      } else {
        validator.assertOptions(paramsSerializer, {
          encode: validators.function,
          serialize: validators.function
        }, true);
      }
    }
    if (config.allowAbsoluteUrls !== void 0) ;
    else if (this.defaults.allowAbsoluteUrls !== void 0) {
      config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
    } else {
      config.allowAbsoluteUrls = true;
    }
    validator.assertOptions(config, {
      baseUrl: validators.spelling("baseURL"),
      withXsrfToken: validators.spelling("withXSRFToken")
    }, true);
    config.method = (config.method || this.defaults.method || "get").toLowerCase();
    let contextHeaders = headers && utils$1.merge(
      headers.common,
      headers[config.method]
    );
    headers && utils$1.forEach(
      ["delete", "get", "head", "post", "put", "patch", "common"],
      (method) => {
        delete headers[method];
      }
    );
    config.headers = AxiosHeaders$1.concat(contextHeaders, headers);
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) {
        return;
      }
      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
      requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
    });
    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });
    let promise;
    let i = 0;
    let len;
    if (!synchronousRequestInterceptors) {
      const chain = [dispatchRequest.bind(this), void 0];
      chain.unshift(...requestInterceptorChain);
      chain.push(...responseInterceptorChain);
      len = chain.length;
      promise = Promise.resolve(config);
      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }
      return promise;
    }
    len = requestInterceptorChain.length;
    let newConfig = config;
    i = 0;
    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }
    try {
      promise = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }
    i = 0;
    len = responseInterceptorChain.length;
    while (i < len) {
      promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    }
    return promise;
  }
  getUri(config) {
    config = mergeConfig$1(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
};
utils$1.forEach(["delete", "get", "head", "options"], function forEachMethodNoData(method) {
  Axios$1.prototype[method] = function(url2, config) {
    return this.request(mergeConfig$1(config || {}, {
      method,
      url: url2,
      data: (config || {}).data
    }));
  };
});
utils$1.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
  function generateHTTPMethod(isForm) {
    return function httpMethod(url2, data, config) {
      return this.request(mergeConfig$1(config || {}, {
        method,
        headers: isForm ? {
          "Content-Type": "multipart/form-data"
        } : {},
        url: url2,
        data
      }));
    };
  }
  Axios$1.prototype[method] = generateHTTPMethod();
  Axios$1.prototype[method + "Form"] = generateHTTPMethod(true);
});
let CancelToken$1 = class CancelToken {
  constructor(executor) {
    if (typeof executor !== "function") {
      throw new TypeError("executor must be a function.");
    }
    let resolvePromise;
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });
    const token = this;
    this.promise.then((cancel) => {
      if (!token._listeners) return;
      let i = token._listeners.length;
      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });
    this.promise.then = (onfulfilled) => {
      let _resolve;
      const promise = new Promise((resolve) => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);
      promise.cancel = function reject() {
        token.unsubscribe(_resolve);
      };
      return promise;
    };
    executor(function cancel(message, config, request) {
      if (token.reason) {
        return;
      }
      token.reason = new CanceledError$1(message, config, request);
      resolvePromise(token.reason);
    });
  }
  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }
  /**
   * Subscribe to the cancel signal
   */
  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }
    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }
  }
  /**
   * Unsubscribe from the cancel signal
   */
  unsubscribe(listener) {
    if (!this._listeners) {
      return;
    }
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }
  toAbortSignal() {
    const controller = new AbortController();
    const abort2 = (err) => {
      controller.abort(err);
    };
    this.subscribe(abort2);
    controller.signal.unsubscribe = () => this.unsubscribe(abort2);
    return controller.signal;
  }
  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let cancel;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return {
      token,
      cancel
    };
  }
};
function spread$1(callback) {
  return function wrap2(arr) {
    return callback.apply(null, arr);
  };
}
function isAxiosError$1(payload) {
  return utils$1.isObject(payload) && payload.isAxiosError === true;
}
const HttpStatusCode$1 = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511
};
Object.entries(HttpStatusCode$1).forEach(([key, value]) => {
  HttpStatusCode$1[value] = key;
});
function createInstance(defaultConfig) {
  const context = new Axios$1(defaultConfig);
  const instance = bind$2(Axios$1.prototype.request, context);
  utils$1.extend(instance, Axios$1.prototype, context, { allOwnKeys: true });
  utils$1.extend(instance, context, null, { allOwnKeys: true });
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig$1(defaultConfig, instanceConfig));
  };
  return instance;
}
const axios = createInstance(defaults);
axios.Axios = Axios$1;
axios.CanceledError = CanceledError$1;
axios.CancelToken = CancelToken$1;
axios.isCancel = isCancel$1;
axios.VERSION = VERSION$1;
axios.toFormData = toFormData$1;
axios.AxiosError = AxiosError$1;
axios.Cancel = axios.CanceledError;
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = spread$1;
axios.isAxiosError = isAxiosError$1;
axios.mergeConfig = mergeConfig$1;
axios.AxiosHeaders = AxiosHeaders$1;
axios.formToJSON = (thing) => formDataToJSON(utils$1.isHTMLForm(thing) ? new FormData(thing) : thing);
axios.getAdapter = adapters.getAdapter;
axios.HttpStatusCode = HttpStatusCode$1;
axios.default = axios;
const {
  Axios: Axios2,
  AxiosError,
  CanceledError,
  isCancel,
  CancelToken: CancelToken2,
  VERSION,
  all: all2,
  Cancel,
  isAxiosError,
  spread,
  toFormData,
  AxiosHeaders: AxiosHeaders2,
  HttpStatusCode,
  formToJSON,
  getAdapter,
  mergeConfig
} = axios;
const perf = typeof performance === "object" && performance && typeof performance.now === "function" ? performance : Date;
const warned = /* @__PURE__ */ new Set();
const PROCESS = typeof process === "object" && !!process ? process : {};
const emitWarning = (msg, type2, code, fn) => {
  typeof PROCESS.emitWarning === "function" ? PROCESS.emitWarning(msg, type2, code, fn) : console.error(`[${code}] ${type2}: ${msg}`);
};
let AC = globalThis.AbortController;
let AS = globalThis.AbortSignal;
if (typeof AC === "undefined") {
  AS = class AbortSignal {
    constructor() {
      __publicField(this, "onabort");
      __publicField(this, "_onabort", []);
      __publicField(this, "reason");
      __publicField(this, "aborted", false);
    }
    addEventListener(_, fn) {
      this._onabort.push(fn);
    }
  };
  AC = class AbortController {
    constructor() {
      __publicField(this, "signal", new AS());
      warnACPolyfill();
    }
    abort(reason) {
      var _a2, _b2;
      if (this.signal.aborted)
        return;
      this.signal.reason = reason;
      this.signal.aborted = true;
      for (const fn of this.signal._onabort) {
        fn(reason);
      }
      (_b2 = (_a2 = this.signal).onabort) == null ? void 0 : _b2.call(_a2, reason);
    }
  };
  let printACPolyfillWarning = ((_a = PROCESS.env) == null ? void 0 : _a.LRU_CACHE_IGNORE_AC_WARNING) !== "1";
  const warnACPolyfill = () => {
    if (!printACPolyfillWarning)
      return;
    printACPolyfillWarning = false;
    emitWarning("AbortController is not defined. If using lru-cache in node 14, load an AbortController polyfill from the `node-abort-controller` package. A minimal polyfill is provided for use by LRUCache.fetch(), but it should not be relied upon in other contexts (eg, passing it to other APIs that use AbortController/AbortSignal might have undesirable effects). You may disable this with LRU_CACHE_IGNORE_AC_WARNING=1 in the env.", "NO_ABORT_CONTROLLER", "ENOTSUP", warnACPolyfill);
  };
}
const shouldWarn = (code) => !warned.has(code);
const isPosInt = (n) => n && n === Math.floor(n) && n > 0 && isFinite(n);
const getUintArray = (max2) => !isPosInt(max2) ? null : max2 <= Math.pow(2, 8) ? Uint8Array : max2 <= Math.pow(2, 16) ? Uint16Array : max2 <= Math.pow(2, 32) ? Uint32Array : max2 <= Number.MAX_SAFE_INTEGER ? ZeroArray : null;
class ZeroArray extends Array {
  constructor(size) {
    super(size);
    this.fill(0);
  }
}
const _Stack = class _Stack {
  constructor(max2, HeapCls) {
    __publicField(this, "heap");
    __publicField(this, "length");
    if (!__privateGet(_Stack, _constructing)) {
      throw new TypeError("instantiate Stack using Stack.create(n)");
    }
    this.heap = new HeapCls(max2);
    this.length = 0;
  }
  static create(max2) {
    const HeapCls = getUintArray(max2);
    if (!HeapCls)
      return [];
    __privateSet(_Stack, _constructing, true);
    const s = new _Stack(max2, HeapCls);
    __privateSet(_Stack, _constructing, false);
    return s;
  }
  push(n) {
    this.heap[this.length++] = n;
  }
  pop() {
    return this.heap[--this.length];
  }
};
_constructing = new WeakMap();
// private constructor
__privateAdd(_Stack, _constructing, false);
let Stack = _Stack;
const _LRUCache = class _LRUCache {
  constructor(options) {
    __privateAdd(this, _LRUCache_instances);
    // options that cannot be changed without disaster
    __privateAdd(this, _max);
    __privateAdd(this, _maxSize);
    __privateAdd(this, _dispose);
    __privateAdd(this, _onInsert);
    __privateAdd(this, _disposeAfter);
    __privateAdd(this, _fetchMethod);
    __privateAdd(this, _memoMethod);
    /**
     * {@link LRUCache.OptionsBase.ttl}
     */
    __publicField(this, "ttl");
    /**
     * {@link LRUCache.OptionsBase.ttlResolution}
     */
    __publicField(this, "ttlResolution");
    /**
     * {@link LRUCache.OptionsBase.ttlAutopurge}
     */
    __publicField(this, "ttlAutopurge");
    /**
     * {@link LRUCache.OptionsBase.updateAgeOnGet}
     */
    __publicField(this, "updateAgeOnGet");
    /**
     * {@link LRUCache.OptionsBase.updateAgeOnHas}
     */
    __publicField(this, "updateAgeOnHas");
    /**
     * {@link LRUCache.OptionsBase.allowStale}
     */
    __publicField(this, "allowStale");
    /**
     * {@link LRUCache.OptionsBase.noDisposeOnSet}
     */
    __publicField(this, "noDisposeOnSet");
    /**
     * {@link LRUCache.OptionsBase.noUpdateTTL}
     */
    __publicField(this, "noUpdateTTL");
    /**
     * {@link LRUCache.OptionsBase.maxEntrySize}
     */
    __publicField(this, "maxEntrySize");
    /**
     * {@link LRUCache.OptionsBase.sizeCalculation}
     */
    __publicField(this, "sizeCalculation");
    /**
     * {@link LRUCache.OptionsBase.noDeleteOnFetchRejection}
     */
    __publicField(this, "noDeleteOnFetchRejection");
    /**
     * {@link LRUCache.OptionsBase.noDeleteOnStaleGet}
     */
    __publicField(this, "noDeleteOnStaleGet");
    /**
     * {@link LRUCache.OptionsBase.allowStaleOnFetchAbort}
     */
    __publicField(this, "allowStaleOnFetchAbort");
    /**
     * {@link LRUCache.OptionsBase.allowStaleOnFetchRejection}
     */
    __publicField(this, "allowStaleOnFetchRejection");
    /**
     * {@link LRUCache.OptionsBase.ignoreFetchAbort}
     */
    __publicField(this, "ignoreFetchAbort");
    // computed properties
    __privateAdd(this, _size);
    __privateAdd(this, _calculatedSize);
    __privateAdd(this, _keyMap);
    __privateAdd(this, _keyList);
    __privateAdd(this, _valList);
    __privateAdd(this, _next);
    __privateAdd(this, _prev);
    __privateAdd(this, _head);
    __privateAdd(this, _tail);
    __privateAdd(this, _free);
    __privateAdd(this, _disposed);
    __privateAdd(this, _sizes);
    __privateAdd(this, _starts);
    __privateAdd(this, _ttls);
    __privateAdd(this, _hasDispose);
    __privateAdd(this, _hasFetchMethod);
    __privateAdd(this, _hasDisposeAfter);
    __privateAdd(this, _hasOnInsert);
    // conditionally set private methods related to TTL
    __privateAdd(this, _updateItemAge, () => {
    });
    __privateAdd(this, _statusTTL, () => {
    });
    __privateAdd(this, _setItemTTL, () => {
    });
    /* c8 ignore stop */
    __privateAdd(this, _isStale, () => false);
    __privateAdd(this, _removeItemSize, (_i) => {
    });
    __privateAdd(this, _addItemSize, (_i, _s, _st) => {
    });
    __privateAdd(this, _requireSize, (_k, _v, size, sizeCalculation) => {
      if (size || sizeCalculation) {
        throw new TypeError("cannot set size without setting maxSize or maxEntrySize on cache");
      }
      return 0;
    });
    /**
     * A String value that is used in the creation of the default string
     * description of an object. Called by the built-in method
     * `Object.prototype.toString`.
     */
    __publicField(this, _b, "LRUCache");
    const { max: max2 = 0, ttl, ttlResolution = 1, ttlAutopurge, updateAgeOnGet, updateAgeOnHas, allowStale, dispose, onInsert, disposeAfter, noDisposeOnSet, noUpdateTTL, maxSize = 0, maxEntrySize = 0, sizeCalculation, fetchMethod, memoMethod, noDeleteOnFetchRejection, noDeleteOnStaleGet, allowStaleOnFetchRejection, allowStaleOnFetchAbort, ignoreFetchAbort } = options;
    if (max2 !== 0 && !isPosInt(max2)) {
      throw new TypeError("max option must be a nonnegative integer");
    }
    const UintArray = max2 ? getUintArray(max2) : Array;
    if (!UintArray) {
      throw new Error("invalid max value: " + max2);
    }
    __privateSet(this, _max, max2);
    __privateSet(this, _maxSize, maxSize);
    this.maxEntrySize = maxEntrySize || __privateGet(this, _maxSize);
    this.sizeCalculation = sizeCalculation;
    if (this.sizeCalculation) {
      if (!__privateGet(this, _maxSize) && !this.maxEntrySize) {
        throw new TypeError("cannot set sizeCalculation without setting maxSize or maxEntrySize");
      }
      if (typeof this.sizeCalculation !== "function") {
        throw new TypeError("sizeCalculation set to non-function");
      }
    }
    if (memoMethod !== void 0 && typeof memoMethod !== "function") {
      throw new TypeError("memoMethod must be a function if defined");
    }
    __privateSet(this, _memoMethod, memoMethod);
    if (fetchMethod !== void 0 && typeof fetchMethod !== "function") {
      throw new TypeError("fetchMethod must be a function if specified");
    }
    __privateSet(this, _fetchMethod, fetchMethod);
    __privateSet(this, _hasFetchMethod, !!fetchMethod);
    __privateSet(this, _keyMap, /* @__PURE__ */ new Map());
    __privateSet(this, _keyList, new Array(max2).fill(void 0));
    __privateSet(this, _valList, new Array(max2).fill(void 0));
    __privateSet(this, _next, new UintArray(max2));
    __privateSet(this, _prev, new UintArray(max2));
    __privateSet(this, _head, 0);
    __privateSet(this, _tail, 0);
    __privateSet(this, _free, Stack.create(max2));
    __privateSet(this, _size, 0);
    __privateSet(this, _calculatedSize, 0);
    if (typeof dispose === "function") {
      __privateSet(this, _dispose, dispose);
    }
    if (typeof onInsert === "function") {
      __privateSet(this, _onInsert, onInsert);
    }
    if (typeof disposeAfter === "function") {
      __privateSet(this, _disposeAfter, disposeAfter);
      __privateSet(this, _disposed, []);
    } else {
      __privateSet(this, _disposeAfter, void 0);
      __privateSet(this, _disposed, void 0);
    }
    __privateSet(this, _hasDispose, !!__privateGet(this, _dispose));
    __privateSet(this, _hasOnInsert, !!__privateGet(this, _onInsert));
    __privateSet(this, _hasDisposeAfter, !!__privateGet(this, _disposeAfter));
    this.noDisposeOnSet = !!noDisposeOnSet;
    this.noUpdateTTL = !!noUpdateTTL;
    this.noDeleteOnFetchRejection = !!noDeleteOnFetchRejection;
    this.allowStaleOnFetchRejection = !!allowStaleOnFetchRejection;
    this.allowStaleOnFetchAbort = !!allowStaleOnFetchAbort;
    this.ignoreFetchAbort = !!ignoreFetchAbort;
    if (this.maxEntrySize !== 0) {
      if (__privateGet(this, _maxSize) !== 0) {
        if (!isPosInt(__privateGet(this, _maxSize))) {
          throw new TypeError("maxSize must be a positive integer if specified");
        }
      }
      if (!isPosInt(this.maxEntrySize)) {
        throw new TypeError("maxEntrySize must be a positive integer if specified");
      }
      __privateMethod(this, _LRUCache_instances, initializeSizeTracking_fn).call(this);
    }
    this.allowStale = !!allowStale;
    this.noDeleteOnStaleGet = !!noDeleteOnStaleGet;
    this.updateAgeOnGet = !!updateAgeOnGet;
    this.updateAgeOnHas = !!updateAgeOnHas;
    this.ttlResolution = isPosInt(ttlResolution) || ttlResolution === 0 ? ttlResolution : 1;
    this.ttlAutopurge = !!ttlAutopurge;
    this.ttl = ttl || 0;
    if (this.ttl) {
      if (!isPosInt(this.ttl)) {
        throw new TypeError("ttl must be a positive integer if specified");
      }
      __privateMethod(this, _LRUCache_instances, initializeTTLTracking_fn).call(this);
    }
    if (__privateGet(this, _max) === 0 && this.ttl === 0 && __privateGet(this, _maxSize) === 0) {
      throw new TypeError("At least one of max, maxSize, or ttl is required");
    }
    if (!this.ttlAutopurge && !__privateGet(this, _max) && !__privateGet(this, _maxSize)) {
      const code = "LRU_CACHE_UNBOUNDED";
      if (shouldWarn(code)) {
        warned.add(code);
        const msg = "TTL caching without ttlAutopurge, max, or maxSize can result in unbounded memory consumption.";
        emitWarning(msg, "UnboundedCacheWarning", code, _LRUCache);
      }
    }
  }
  /**
   * Do not call this method unless you need to inspect the
   * inner workings of the cache.  If anything returned by this
   * object is modified in any way, strange breakage may occur.
   *
   * These fields are private for a reason!
   *
   * @internal
   */
  static unsafeExposeInternals(c) {
    return {
      // properties
      starts: __privateGet(c, _starts),
      ttls: __privateGet(c, _ttls),
      sizes: __privateGet(c, _sizes),
      keyMap: __privateGet(c, _keyMap),
      keyList: __privateGet(c, _keyList),
      valList: __privateGet(c, _valList),
      next: __privateGet(c, _next),
      prev: __privateGet(c, _prev),
      get head() {
        return __privateGet(c, _head);
      },
      get tail() {
        return __privateGet(c, _tail);
      },
      free: __privateGet(c, _free),
      // methods
      isBackgroundFetch: (p) => {
        var _a2;
        return __privateMethod(_a2 = c, _LRUCache_instances, isBackgroundFetch_fn).call(_a2, p);
      },
      backgroundFetch: (k, index, options, context) => {
        var _a2;
        return __privateMethod(_a2 = c, _LRUCache_instances, backgroundFetch_fn).call(_a2, k, index, options, context);
      },
      moveToTail: (index) => {
        var _a2;
        return __privateMethod(_a2 = c, _LRUCache_instances, moveToTail_fn).call(_a2, index);
      },
      indexes: (options) => {
        var _a2;
        return __privateMethod(_a2 = c, _LRUCache_instances, indexes_fn).call(_a2, options);
      },
      rindexes: (options) => {
        var _a2;
        return __privateMethod(_a2 = c, _LRUCache_instances, rindexes_fn).call(_a2, options);
      },
      isStale: (index) => {
        var _a2;
        return __privateGet(_a2 = c, _isStale).call(_a2, index);
      }
    };
  }
  // Protected read-only members
  /**
   * {@link LRUCache.OptionsBase.max} (read-only)
   */
  get max() {
    return __privateGet(this, _max);
  }
  /**
   * {@link LRUCache.OptionsBase.maxSize} (read-only)
   */
  get maxSize() {
    return __privateGet(this, _maxSize);
  }
  /**
   * The total computed size of items in the cache (read-only)
   */
  get calculatedSize() {
    return __privateGet(this, _calculatedSize);
  }
  /**
   * The number of items stored in the cache (read-only)
   */
  get size() {
    return __privateGet(this, _size);
  }
  /**
   * {@link LRUCache.OptionsBase.fetchMethod} (read-only)
   */
  get fetchMethod() {
    return __privateGet(this, _fetchMethod);
  }
  get memoMethod() {
    return __privateGet(this, _memoMethod);
  }
  /**
   * {@link LRUCache.OptionsBase.dispose} (read-only)
   */
  get dispose() {
    return __privateGet(this, _dispose);
  }
  /**
   * {@link LRUCache.OptionsBase.onInsert} (read-only)
   */
  get onInsert() {
    return __privateGet(this, _onInsert);
  }
  /**
   * {@link LRUCache.OptionsBase.disposeAfter} (read-only)
   */
  get disposeAfter() {
    return __privateGet(this, _disposeAfter);
  }
  /**
   * Return the number of ms left in the item's TTL. If item is not in cache,
   * returns `0`. Returns `Infinity` if item is in cache without a defined TTL.
   */
  getRemainingTTL(key) {
    return __privateGet(this, _keyMap).has(key) ? Infinity : 0;
  }
  /**
   * Return a generator yielding `[key, value]` pairs,
   * in order from most recently used to least recently used.
   */
  *entries() {
    for (const i of __privateMethod(this, _LRUCache_instances, indexes_fn).call(this)) {
      if (__privateGet(this, _valList)[i] !== void 0 && __privateGet(this, _keyList)[i] !== void 0 && !__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, __privateGet(this, _valList)[i])) {
        yield [__privateGet(this, _keyList)[i], __privateGet(this, _valList)[i]];
      }
    }
  }
  /**
   * Inverse order version of {@link LRUCache.entries}
   *
   * Return a generator yielding `[key, value]` pairs,
   * in order from least recently used to most recently used.
   */
  *rentries() {
    for (const i of __privateMethod(this, _LRUCache_instances, rindexes_fn).call(this)) {
      if (__privateGet(this, _valList)[i] !== void 0 && __privateGet(this, _keyList)[i] !== void 0 && !__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, __privateGet(this, _valList)[i])) {
        yield [__privateGet(this, _keyList)[i], __privateGet(this, _valList)[i]];
      }
    }
  }
  /**
   * Return a generator yielding the keys in the cache,
   * in order from most recently used to least recently used.
   */
  *keys() {
    for (const i of __privateMethod(this, _LRUCache_instances, indexes_fn).call(this)) {
      const k = __privateGet(this, _keyList)[i];
      if (k !== void 0 && !__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, __privateGet(this, _valList)[i])) {
        yield k;
      }
    }
  }
  /**
   * Inverse order version of {@link LRUCache.keys}
   *
   * Return a generator yielding the keys in the cache,
   * in order from least recently used to most recently used.
   */
  *rkeys() {
    for (const i of __privateMethod(this, _LRUCache_instances, rindexes_fn).call(this)) {
      const k = __privateGet(this, _keyList)[i];
      if (k !== void 0 && !__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, __privateGet(this, _valList)[i])) {
        yield k;
      }
    }
  }
  /**
   * Return a generator yielding the values in the cache,
   * in order from most recently used to least recently used.
   */
  *values() {
    for (const i of __privateMethod(this, _LRUCache_instances, indexes_fn).call(this)) {
      const v = __privateGet(this, _valList)[i];
      if (v !== void 0 && !__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, __privateGet(this, _valList)[i])) {
        yield __privateGet(this, _valList)[i];
      }
    }
  }
  /**
   * Inverse order version of {@link LRUCache.values}
   *
   * Return a generator yielding the values in the cache,
   * in order from least recently used to most recently used.
   */
  *rvalues() {
    for (const i of __privateMethod(this, _LRUCache_instances, rindexes_fn).call(this)) {
      const v = __privateGet(this, _valList)[i];
      if (v !== void 0 && !__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, __privateGet(this, _valList)[i])) {
        yield __privateGet(this, _valList)[i];
      }
    }
  }
  /**
   * Iterating over the cache itself yields the same results as
   * {@link LRUCache.entries}
   */
  [(_c = Symbol.iterator, _b = Symbol.toStringTag, _c)]() {
    return this.entries();
  }
  /**
   * Find a value for which the supplied fn method returns a truthy value,
   * similar to `Array.find()`. fn is called as `fn(value, key, cache)`.
   */
  find(fn, getOptions = {}) {
    for (const i of __privateMethod(this, _LRUCache_instances, indexes_fn).call(this)) {
      const v = __privateGet(this, _valList)[i];
      const value = __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v) ? v.__staleWhileFetching : v;
      if (value === void 0)
        continue;
      if (fn(value, __privateGet(this, _keyList)[i], this)) {
        return this.get(__privateGet(this, _keyList)[i], getOptions);
      }
    }
  }
  /**
   * Call the supplied function on each item in the cache, in order from most
   * recently used to least recently used.
   *
   * `fn` is called as `fn(value, key, cache)`.
   *
   * If `thisp` is provided, function will be called in the `this`-context of
   * the provided object, or the cache if no `thisp` object is provided.
   *
   * Does not update age or recenty of use, or iterate over stale values.
   */
  forEach(fn, thisp = this) {
    for (const i of __privateMethod(this, _LRUCache_instances, indexes_fn).call(this)) {
      const v = __privateGet(this, _valList)[i];
      const value = __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v) ? v.__staleWhileFetching : v;
      if (value === void 0)
        continue;
      fn.call(thisp, value, __privateGet(this, _keyList)[i], this);
    }
  }
  /**
   * The same as {@link LRUCache.forEach} but items are iterated over in
   * reverse order.  (ie, less recently used items are iterated over first.)
   */
  rforEach(fn, thisp = this) {
    for (const i of __privateMethod(this, _LRUCache_instances, rindexes_fn).call(this)) {
      const v = __privateGet(this, _valList)[i];
      const value = __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v) ? v.__staleWhileFetching : v;
      if (value === void 0)
        continue;
      fn.call(thisp, value, __privateGet(this, _keyList)[i], this);
    }
  }
  /**
   * Delete any stale entries. Returns true if anything was removed,
   * false otherwise.
   */
  purgeStale() {
    let deleted = false;
    for (const i of __privateMethod(this, _LRUCache_instances, rindexes_fn).call(this, { allowStale: true })) {
      if (__privateGet(this, _isStale).call(this, i)) {
        __privateMethod(this, _LRUCache_instances, delete_fn).call(this, __privateGet(this, _keyList)[i], "expire");
        deleted = true;
      }
    }
    return deleted;
  }
  /**
   * Get the extended info about a given entry, to get its value, size, and
   * TTL info simultaneously. Returns `undefined` if the key is not present.
   *
   * Unlike {@link LRUCache#dump}, which is designed to be portable and survive
   * serialization, the `start` value is always the current timestamp, and the
   * `ttl` is a calculated remaining time to live (negative if expired).
   *
   * Always returns stale values, if their info is found in the cache, so be
   * sure to check for expirations (ie, a negative {@link LRUCache.Entry#ttl})
   * if relevant.
   */
  info(key) {
    const i = __privateGet(this, _keyMap).get(key);
    if (i === void 0)
      return void 0;
    const v = __privateGet(this, _valList)[i];
    const value = __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v) ? v.__staleWhileFetching : v;
    if (value === void 0)
      return void 0;
    const entry = { value };
    if (__privateGet(this, _ttls) && __privateGet(this, _starts)) {
      const ttl = __privateGet(this, _ttls)[i];
      const start = __privateGet(this, _starts)[i];
      if (ttl && start) {
        const remain = ttl - (perf.now() - start);
        entry.ttl = remain;
        entry.start = Date.now();
      }
    }
    if (__privateGet(this, _sizes)) {
      entry.size = __privateGet(this, _sizes)[i];
    }
    return entry;
  }
  /**
   * Return an array of [key, {@link LRUCache.Entry}] tuples which can be
   * passed to {@link LRUCache#load}.
   *
   * The `start` fields are calculated relative to a portable `Date.now()`
   * timestamp, even if `performance.now()` is available.
   *
   * Stale entries are always included in the `dump`, even if
   * {@link LRUCache.OptionsBase.allowStale} is false.
   *
   * Note: this returns an actual array, not a generator, so it can be more
   * easily passed around.
   */
  dump() {
    const arr = [];
    for (const i of __privateMethod(this, _LRUCache_instances, indexes_fn).call(this, { allowStale: true })) {
      const key = __privateGet(this, _keyList)[i];
      const v = __privateGet(this, _valList)[i];
      const value = __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v) ? v.__staleWhileFetching : v;
      if (value === void 0 || key === void 0)
        continue;
      const entry = { value };
      if (__privateGet(this, _ttls) && __privateGet(this, _starts)) {
        entry.ttl = __privateGet(this, _ttls)[i];
        const age = perf.now() - __privateGet(this, _starts)[i];
        entry.start = Math.floor(Date.now() - age);
      }
      if (__privateGet(this, _sizes)) {
        entry.size = __privateGet(this, _sizes)[i];
      }
      arr.unshift([key, entry]);
    }
    return arr;
  }
  /**
   * Reset the cache and load in the items in entries in the order listed.
   *
   * The shape of the resulting cache may be different if the same options are
   * not used in both caches.
   *
   * The `start` fields are assumed to be calculated relative to a portable
   * `Date.now()` timestamp, even if `performance.now()` is available.
   */
  load(arr) {
    this.clear();
    for (const [key, entry] of arr) {
      if (entry.start) {
        const age = Date.now() - entry.start;
        entry.start = perf.now() - age;
      }
      this.set(key, entry.value, entry);
    }
  }
  /**
   * Add a value to the cache.
   *
   * Note: if `undefined` is specified as a value, this is an alias for
   * {@link LRUCache#delete}
   *
   * Fields on the {@link LRUCache.SetOptions} options param will override
   * their corresponding values in the constructor options for the scope
   * of this single `set()` operation.
   *
   * If `start` is provided, then that will set the effective start
   * time for the TTL calculation. Note that this must be a previous
   * value of `performance.now()` if supported, or a previous value of
   * `Date.now()` if not.
   *
   * Options object may also include `size`, which will prevent
   * calling the `sizeCalculation` function and just use the specified
   * number if it is a positive integer, and `noDisposeOnSet` which
   * will prevent calling a `dispose` function in the case of
   * overwrites.
   *
   * If the `size` (or return value of `sizeCalculation`) for a given
   * entry is greater than `maxEntrySize`, then the item will not be
   * added to the cache.
   *
   * Will update the recency of the entry.
   *
   * If the value is `undefined`, then this is an alias for
   * `cache.delete(key)`. `undefined` is never stored in the cache.
   */
  set(k, v, setOptions = {}) {
    var _a2, _b2, _c2, _d, _e, _f, _g;
    if (v === void 0) {
      this.delete(k);
      return this;
    }
    const { ttl = this.ttl, start, noDisposeOnSet = this.noDisposeOnSet, sizeCalculation = this.sizeCalculation, status } = setOptions;
    let { noUpdateTTL = this.noUpdateTTL } = setOptions;
    const size = __privateGet(this, _requireSize).call(this, k, v, setOptions.size || 0, sizeCalculation);
    if (this.maxEntrySize && size > this.maxEntrySize) {
      if (status) {
        status.set = "miss";
        status.maxEntrySizeExceeded = true;
      }
      __privateMethod(this, _LRUCache_instances, delete_fn).call(this, k, "set");
      return this;
    }
    let index = __privateGet(this, _size) === 0 ? void 0 : __privateGet(this, _keyMap).get(k);
    if (index === void 0) {
      index = __privateGet(this, _size) === 0 ? __privateGet(this, _tail) : __privateGet(this, _free).length !== 0 ? __privateGet(this, _free).pop() : __privateGet(this, _size) === __privateGet(this, _max) ? __privateMethod(this, _LRUCache_instances, evict_fn).call(this, false) : __privateGet(this, _size);
      __privateGet(this, _keyList)[index] = k;
      __privateGet(this, _valList)[index] = v;
      __privateGet(this, _keyMap).set(k, index);
      __privateGet(this, _next)[__privateGet(this, _tail)] = index;
      __privateGet(this, _prev)[index] = __privateGet(this, _tail);
      __privateSet(this, _tail, index);
      __privateWrapper(this, _size)._++;
      __privateGet(this, _addItemSize).call(this, index, size, status);
      if (status)
        status.set = "add";
      noUpdateTTL = false;
      if (__privateGet(this, _hasOnInsert)) {
        (_a2 = __privateGet(this, _onInsert)) == null ? void 0 : _a2.call(this, v, k, "add");
      }
    } else {
      __privateMethod(this, _LRUCache_instances, moveToTail_fn).call(this, index);
      const oldVal = __privateGet(this, _valList)[index];
      if (v !== oldVal) {
        if (__privateGet(this, _hasFetchMethod) && __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, oldVal)) {
          oldVal.__abortController.abort(new Error("replaced"));
          const { __staleWhileFetching: s } = oldVal;
          if (s !== void 0 && !noDisposeOnSet) {
            if (__privateGet(this, _hasDispose)) {
              (_b2 = __privateGet(this, _dispose)) == null ? void 0 : _b2.call(this, s, k, "set");
            }
            if (__privateGet(this, _hasDisposeAfter)) {
              (_c2 = __privateGet(this, _disposed)) == null ? void 0 : _c2.push([s, k, "set"]);
            }
          }
        } else if (!noDisposeOnSet) {
          if (__privateGet(this, _hasDispose)) {
            (_d = __privateGet(this, _dispose)) == null ? void 0 : _d.call(this, oldVal, k, "set");
          }
          if (__privateGet(this, _hasDisposeAfter)) {
            (_e = __privateGet(this, _disposed)) == null ? void 0 : _e.push([oldVal, k, "set"]);
          }
        }
        __privateGet(this, _removeItemSize).call(this, index);
        __privateGet(this, _addItemSize).call(this, index, size, status);
        __privateGet(this, _valList)[index] = v;
        if (status) {
          status.set = "replace";
          const oldValue = oldVal && __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, oldVal) ? oldVal.__staleWhileFetching : oldVal;
          if (oldValue !== void 0)
            status.oldValue = oldValue;
        }
      } else if (status) {
        status.set = "update";
      }
      if (__privateGet(this, _hasOnInsert)) {
        (_f = this.onInsert) == null ? void 0 : _f.call(this, v, k, v === oldVal ? "update" : "replace");
      }
    }
    if (ttl !== 0 && !__privateGet(this, _ttls)) {
      __privateMethod(this, _LRUCache_instances, initializeTTLTracking_fn).call(this);
    }
    if (__privateGet(this, _ttls)) {
      if (!noUpdateTTL) {
        __privateGet(this, _setItemTTL).call(this, index, ttl, start);
      }
      if (status)
        __privateGet(this, _statusTTL).call(this, status, index);
    }
    if (!noDisposeOnSet && __privateGet(this, _hasDisposeAfter) && __privateGet(this, _disposed)) {
      const dt = __privateGet(this, _disposed);
      let task;
      while (task = dt == null ? void 0 : dt.shift()) {
        (_g = __privateGet(this, _disposeAfter)) == null ? void 0 : _g.call(this, ...task);
      }
    }
    return this;
  }
  /**
   * Evict the least recently used item, returning its value or
   * `undefined` if cache is empty.
   */
  pop() {
    var _a2;
    try {
      while (__privateGet(this, _size)) {
        const val = __privateGet(this, _valList)[__privateGet(this, _head)];
        __privateMethod(this, _LRUCache_instances, evict_fn).call(this, true);
        if (__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, val)) {
          if (val.__staleWhileFetching) {
            return val.__staleWhileFetching;
          }
        } else if (val !== void 0) {
          return val;
        }
      }
    } finally {
      if (__privateGet(this, _hasDisposeAfter) && __privateGet(this, _disposed)) {
        const dt = __privateGet(this, _disposed);
        let task;
        while (task = dt == null ? void 0 : dt.shift()) {
          (_a2 = __privateGet(this, _disposeAfter)) == null ? void 0 : _a2.call(this, ...task);
        }
      }
    }
  }
  /**
   * Check if a key is in the cache, without updating the recency of use.
   * Will return false if the item is stale, even though it is technically
   * in the cache.
   *
   * Check if a key is in the cache, without updating the recency of
   * use. Age is updated if {@link LRUCache.OptionsBase.updateAgeOnHas} is set
   * to `true` in either the options or the constructor.
   *
   * Will return `false` if the item is stale, even though it is technically in
   * the cache. The difference can be determined (if it matters) by using a
   * `status` argument, and inspecting the `has` field.
   *
   * Will not update item age unless
   * {@link LRUCache.OptionsBase.updateAgeOnHas} is set.
   */
  has(k, hasOptions = {}) {
    const { updateAgeOnHas = this.updateAgeOnHas, status } = hasOptions;
    const index = __privateGet(this, _keyMap).get(k);
    if (index !== void 0) {
      const v = __privateGet(this, _valList)[index];
      if (__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v) && v.__staleWhileFetching === void 0) {
        return false;
      }
      if (!__privateGet(this, _isStale).call(this, index)) {
        if (updateAgeOnHas) {
          __privateGet(this, _updateItemAge).call(this, index);
        }
        if (status) {
          status.has = "hit";
          __privateGet(this, _statusTTL).call(this, status, index);
        }
        return true;
      } else if (status) {
        status.has = "stale";
        __privateGet(this, _statusTTL).call(this, status, index);
      }
    } else if (status) {
      status.has = "miss";
    }
    return false;
  }
  /**
   * Like {@link LRUCache#get} but doesn't update recency or delete stale
   * items.
   *
   * Returns `undefined` if the item is stale, unless
   * {@link LRUCache.OptionsBase.allowStale} is set.
   */
  peek(k, peekOptions = {}) {
    const { allowStale = this.allowStale } = peekOptions;
    const index = __privateGet(this, _keyMap).get(k);
    if (index === void 0 || !allowStale && __privateGet(this, _isStale).call(this, index)) {
      return;
    }
    const v = __privateGet(this, _valList)[index];
    return __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v) ? v.__staleWhileFetching : v;
  }
  async fetch(k, fetchOptions = {}) {
    const {
      // get options
      allowStale = this.allowStale,
      updateAgeOnGet = this.updateAgeOnGet,
      noDeleteOnStaleGet = this.noDeleteOnStaleGet,
      // set options
      ttl = this.ttl,
      noDisposeOnSet = this.noDisposeOnSet,
      size = 0,
      sizeCalculation = this.sizeCalculation,
      noUpdateTTL = this.noUpdateTTL,
      // fetch exclusive options
      noDeleteOnFetchRejection = this.noDeleteOnFetchRejection,
      allowStaleOnFetchRejection = this.allowStaleOnFetchRejection,
      ignoreFetchAbort = this.ignoreFetchAbort,
      allowStaleOnFetchAbort = this.allowStaleOnFetchAbort,
      context,
      forceRefresh = false,
      status,
      signal
    } = fetchOptions;
    if (!__privateGet(this, _hasFetchMethod)) {
      if (status)
        status.fetch = "get";
      return this.get(k, {
        allowStale,
        updateAgeOnGet,
        noDeleteOnStaleGet,
        status
      });
    }
    const options = {
      allowStale,
      updateAgeOnGet,
      noDeleteOnStaleGet,
      ttl,
      noDisposeOnSet,
      size,
      sizeCalculation,
      noUpdateTTL,
      noDeleteOnFetchRejection,
      allowStaleOnFetchRejection,
      allowStaleOnFetchAbort,
      ignoreFetchAbort,
      status,
      signal
    };
    let index = __privateGet(this, _keyMap).get(k);
    if (index === void 0) {
      if (status)
        status.fetch = "miss";
      const p = __privateMethod(this, _LRUCache_instances, backgroundFetch_fn).call(this, k, index, options, context);
      return p.__returned = p;
    } else {
      const v = __privateGet(this, _valList)[index];
      if (__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v)) {
        const stale = allowStale && v.__staleWhileFetching !== void 0;
        if (status) {
          status.fetch = "inflight";
          if (stale)
            status.returnedStale = true;
        }
        return stale ? v.__staleWhileFetching : v.__returned = v;
      }
      const isStale = __privateGet(this, _isStale).call(this, index);
      if (!forceRefresh && !isStale) {
        if (status)
          status.fetch = "hit";
        __privateMethod(this, _LRUCache_instances, moveToTail_fn).call(this, index);
        if (updateAgeOnGet) {
          __privateGet(this, _updateItemAge).call(this, index);
        }
        if (status)
          __privateGet(this, _statusTTL).call(this, status, index);
        return v;
      }
      const p = __privateMethod(this, _LRUCache_instances, backgroundFetch_fn).call(this, k, index, options, context);
      const hasStale = p.__staleWhileFetching !== void 0;
      const staleVal = hasStale && allowStale;
      if (status) {
        status.fetch = isStale ? "stale" : "refresh";
        if (staleVal && isStale)
          status.returnedStale = true;
      }
      return staleVal ? p.__staleWhileFetching : p.__returned = p;
    }
  }
  async forceFetch(k, fetchOptions = {}) {
    const v = await this.fetch(k, fetchOptions);
    if (v === void 0)
      throw new Error("fetch() returned undefined");
    return v;
  }
  memo(k, memoOptions = {}) {
    const memoMethod = __privateGet(this, _memoMethod);
    if (!memoMethod) {
      throw new Error("no memoMethod provided to constructor");
    }
    const { context, forceRefresh, ...options } = memoOptions;
    const v = this.get(k, options);
    if (!forceRefresh && v !== void 0)
      return v;
    const vv = memoMethod(k, v, {
      options,
      context
    });
    this.set(k, vv, options);
    return vv;
  }
  /**
   * Return a value from the cache. Will update the recency of the cache
   * entry found.
   *
   * If the key is not found, get() will return `undefined`.
   */
  get(k, getOptions = {}) {
    const { allowStale = this.allowStale, updateAgeOnGet = this.updateAgeOnGet, noDeleteOnStaleGet = this.noDeleteOnStaleGet, status } = getOptions;
    const index = __privateGet(this, _keyMap).get(k);
    if (index !== void 0) {
      const value = __privateGet(this, _valList)[index];
      const fetching = __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, value);
      if (status)
        __privateGet(this, _statusTTL).call(this, status, index);
      if (__privateGet(this, _isStale).call(this, index)) {
        if (status)
          status.get = "stale";
        if (!fetching) {
          if (!noDeleteOnStaleGet) {
            __privateMethod(this, _LRUCache_instances, delete_fn).call(this, k, "expire");
          }
          if (status && allowStale)
            status.returnedStale = true;
          return allowStale ? value : void 0;
        } else {
          if (status && allowStale && value.__staleWhileFetching !== void 0) {
            status.returnedStale = true;
          }
          return allowStale ? value.__staleWhileFetching : void 0;
        }
      } else {
        if (status)
          status.get = "hit";
        if (fetching) {
          return value.__staleWhileFetching;
        }
        __privateMethod(this, _LRUCache_instances, moveToTail_fn).call(this, index);
        if (updateAgeOnGet) {
          __privateGet(this, _updateItemAge).call(this, index);
        }
        return value;
      }
    } else if (status) {
      status.get = "miss";
    }
  }
  /**
   * Deletes a key out of the cache.
   *
   * Returns true if the key was deleted, false otherwise.
   */
  delete(k) {
    return __privateMethod(this, _LRUCache_instances, delete_fn).call(this, k, "delete");
  }
  /**
   * Clear the cache entirely, throwing away all values.
   */
  clear() {
    return __privateMethod(this, _LRUCache_instances, clear_fn).call(this, "delete");
  }
};
_max = new WeakMap();
_maxSize = new WeakMap();
_dispose = new WeakMap();
_onInsert = new WeakMap();
_disposeAfter = new WeakMap();
_fetchMethod = new WeakMap();
_memoMethod = new WeakMap();
_size = new WeakMap();
_calculatedSize = new WeakMap();
_keyMap = new WeakMap();
_keyList = new WeakMap();
_valList = new WeakMap();
_next = new WeakMap();
_prev = new WeakMap();
_head = new WeakMap();
_tail = new WeakMap();
_free = new WeakMap();
_disposed = new WeakMap();
_sizes = new WeakMap();
_starts = new WeakMap();
_ttls = new WeakMap();
_hasDispose = new WeakMap();
_hasFetchMethod = new WeakMap();
_hasDisposeAfter = new WeakMap();
_hasOnInsert = new WeakMap();
_LRUCache_instances = new WeakSet();
initializeTTLTracking_fn = function() {
  const ttls = new ZeroArray(__privateGet(this, _max));
  const starts = new ZeroArray(__privateGet(this, _max));
  __privateSet(this, _ttls, ttls);
  __privateSet(this, _starts, starts);
  __privateSet(this, _setItemTTL, (index, ttl, start = perf.now()) => {
    starts[index] = ttl !== 0 ? start : 0;
    ttls[index] = ttl;
    if (ttl !== 0 && this.ttlAutopurge) {
      const t = setTimeout(() => {
        if (__privateGet(this, _isStale).call(this, index)) {
          __privateMethod(this, _LRUCache_instances, delete_fn).call(this, __privateGet(this, _keyList)[index], "expire");
        }
      }, ttl + 1);
      if (t.unref) {
        t.unref();
      }
    }
  });
  __privateSet(this, _updateItemAge, (index) => {
    starts[index] = ttls[index] !== 0 ? perf.now() : 0;
  });
  __privateSet(this, _statusTTL, (status, index) => {
    if (ttls[index]) {
      const ttl = ttls[index];
      const start = starts[index];
      if (!ttl || !start)
        return;
      status.ttl = ttl;
      status.start = start;
      status.now = cachedNow || getNow();
      const age = status.now - start;
      status.remainingTTL = ttl - age;
    }
  });
  let cachedNow = 0;
  const getNow = () => {
    const n = perf.now();
    if (this.ttlResolution > 0) {
      cachedNow = n;
      const t = setTimeout(() => cachedNow = 0, this.ttlResolution);
      if (t.unref) {
        t.unref();
      }
    }
    return n;
  };
  this.getRemainingTTL = (key) => {
    const index = __privateGet(this, _keyMap).get(key);
    if (index === void 0) {
      return 0;
    }
    const ttl = ttls[index];
    const start = starts[index];
    if (!ttl || !start) {
      return Infinity;
    }
    const age = (cachedNow || getNow()) - start;
    return ttl - age;
  };
  __privateSet(this, _isStale, (index) => {
    const s = starts[index];
    const t = ttls[index];
    return !!t && !!s && (cachedNow || getNow()) - s > t;
  });
};
_updateItemAge = new WeakMap();
_statusTTL = new WeakMap();
_setItemTTL = new WeakMap();
_isStale = new WeakMap();
initializeSizeTracking_fn = function() {
  const sizes = new ZeroArray(__privateGet(this, _max));
  __privateSet(this, _calculatedSize, 0);
  __privateSet(this, _sizes, sizes);
  __privateSet(this, _removeItemSize, (index) => {
    __privateSet(this, _calculatedSize, __privateGet(this, _calculatedSize) - sizes[index]);
    sizes[index] = 0;
  });
  __privateSet(this, _requireSize, (k, v, size, sizeCalculation) => {
    if (__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v)) {
      return 0;
    }
    if (!isPosInt(size)) {
      if (sizeCalculation) {
        if (typeof sizeCalculation !== "function") {
          throw new TypeError("sizeCalculation must be a function");
        }
        size = sizeCalculation(v, k);
        if (!isPosInt(size)) {
          throw new TypeError("sizeCalculation return invalid (expect positive integer)");
        }
      } else {
        throw new TypeError("invalid size value (must be positive integer). When maxSize or maxEntrySize is used, sizeCalculation or size must be set.");
      }
    }
    return size;
  });
  __privateSet(this, _addItemSize, (index, size, status) => {
    sizes[index] = size;
    if (__privateGet(this, _maxSize)) {
      const maxSize = __privateGet(this, _maxSize) - sizes[index];
      while (__privateGet(this, _calculatedSize) > maxSize) {
        __privateMethod(this, _LRUCache_instances, evict_fn).call(this, true);
      }
    }
    __privateSet(this, _calculatedSize, __privateGet(this, _calculatedSize) + sizes[index]);
    if (status) {
      status.entrySize = size;
      status.totalCalculatedSize = __privateGet(this, _calculatedSize);
    }
  });
};
_removeItemSize = new WeakMap();
_addItemSize = new WeakMap();
_requireSize = new WeakMap();
indexes_fn = function* ({ allowStale = this.allowStale } = {}) {
  if (__privateGet(this, _size)) {
    for (let i = __privateGet(this, _tail); true; ) {
      if (!__privateMethod(this, _LRUCache_instances, isValidIndex_fn).call(this, i)) {
        break;
      }
      if (allowStale || !__privateGet(this, _isStale).call(this, i)) {
        yield i;
      }
      if (i === __privateGet(this, _head)) {
        break;
      } else {
        i = __privateGet(this, _prev)[i];
      }
    }
  }
};
rindexes_fn = function* ({ allowStale = this.allowStale } = {}) {
  if (__privateGet(this, _size)) {
    for (let i = __privateGet(this, _head); true; ) {
      if (!__privateMethod(this, _LRUCache_instances, isValidIndex_fn).call(this, i)) {
        break;
      }
      if (allowStale || !__privateGet(this, _isStale).call(this, i)) {
        yield i;
      }
      if (i === __privateGet(this, _tail)) {
        break;
      } else {
        i = __privateGet(this, _next)[i];
      }
    }
  }
};
isValidIndex_fn = function(index) {
  return index !== void 0 && __privateGet(this, _keyMap).get(__privateGet(this, _keyList)[index]) === index;
};
evict_fn = function(free) {
  var _a2, _b2;
  const head = __privateGet(this, _head);
  const k = __privateGet(this, _keyList)[head];
  const v = __privateGet(this, _valList)[head];
  if (__privateGet(this, _hasFetchMethod) && __privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v)) {
    v.__abortController.abort(new Error("evicted"));
  } else if (__privateGet(this, _hasDispose) || __privateGet(this, _hasDisposeAfter)) {
    if (__privateGet(this, _hasDispose)) {
      (_a2 = __privateGet(this, _dispose)) == null ? void 0 : _a2.call(this, v, k, "evict");
    }
    if (__privateGet(this, _hasDisposeAfter)) {
      (_b2 = __privateGet(this, _disposed)) == null ? void 0 : _b2.push([v, k, "evict"]);
    }
  }
  __privateGet(this, _removeItemSize).call(this, head);
  if (free) {
    __privateGet(this, _keyList)[head] = void 0;
    __privateGet(this, _valList)[head] = void 0;
    __privateGet(this, _free).push(head);
  }
  if (__privateGet(this, _size) === 1) {
    __privateSet(this, _head, __privateSet(this, _tail, 0));
    __privateGet(this, _free).length = 0;
  } else {
    __privateSet(this, _head, __privateGet(this, _next)[head]);
  }
  __privateGet(this, _keyMap).delete(k);
  __privateWrapper(this, _size)._--;
  return head;
};
backgroundFetch_fn = function(k, index, options, context) {
  const v = index === void 0 ? void 0 : __privateGet(this, _valList)[index];
  if (__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v)) {
    return v;
  }
  const ac = new AC();
  const { signal } = options;
  signal == null ? void 0 : signal.addEventListener("abort", () => ac.abort(signal.reason), {
    signal: ac.signal
  });
  const fetchOpts = {
    signal: ac.signal,
    options,
    context
  };
  const cb = (v2, updateCache = false) => {
    const { aborted } = ac.signal;
    const ignoreAbort = options.ignoreFetchAbort && v2 !== void 0;
    if (options.status) {
      if (aborted && !updateCache) {
        options.status.fetchAborted = true;
        options.status.fetchError = ac.signal.reason;
        if (ignoreAbort)
          options.status.fetchAbortIgnored = true;
      } else {
        options.status.fetchResolved = true;
      }
    }
    if (aborted && !ignoreAbort && !updateCache) {
      return fetchFail(ac.signal.reason);
    }
    const bf2 = p;
    if (__privateGet(this, _valList)[index] === p) {
      if (v2 === void 0) {
        if (bf2.__staleWhileFetching) {
          __privateGet(this, _valList)[index] = bf2.__staleWhileFetching;
        } else {
          __privateMethod(this, _LRUCache_instances, delete_fn).call(this, k, "fetch");
        }
      } else {
        if (options.status)
          options.status.fetchUpdated = true;
        this.set(k, v2, fetchOpts.options);
      }
    }
    return v2;
  };
  const eb = (er) => {
    if (options.status) {
      options.status.fetchRejected = true;
      options.status.fetchError = er;
    }
    return fetchFail(er);
  };
  const fetchFail = (er) => {
    const { aborted } = ac.signal;
    const allowStaleAborted = aborted && options.allowStaleOnFetchAbort;
    const allowStale = allowStaleAborted || options.allowStaleOnFetchRejection;
    const noDelete = allowStale || options.noDeleteOnFetchRejection;
    const bf2 = p;
    if (__privateGet(this, _valList)[index] === p) {
      const del = !noDelete || bf2.__staleWhileFetching === void 0;
      if (del) {
        __privateMethod(this, _LRUCache_instances, delete_fn).call(this, k, "fetch");
      } else if (!allowStaleAborted) {
        __privateGet(this, _valList)[index] = bf2.__staleWhileFetching;
      }
    }
    if (allowStale) {
      if (options.status && bf2.__staleWhileFetching !== void 0) {
        options.status.returnedStale = true;
      }
      return bf2.__staleWhileFetching;
    } else if (bf2.__returned === bf2) {
      throw er;
    }
  };
  const pcall = (res, rej) => {
    var _a2;
    const fmp = (_a2 = __privateGet(this, _fetchMethod)) == null ? void 0 : _a2.call(this, k, v, fetchOpts);
    if (fmp && fmp instanceof Promise) {
      fmp.then((v2) => res(v2 === void 0 ? void 0 : v2), rej);
    }
    ac.signal.addEventListener("abort", () => {
      if (!options.ignoreFetchAbort || options.allowStaleOnFetchAbort) {
        res(void 0);
        if (options.allowStaleOnFetchAbort) {
          res = (v2) => cb(v2, true);
        }
      }
    });
  };
  if (options.status)
    options.status.fetchDispatched = true;
  const p = new Promise(pcall).then(cb, eb);
  const bf = Object.assign(p, {
    __abortController: ac,
    __staleWhileFetching: v,
    __returned: void 0
  });
  if (index === void 0) {
    this.set(k, bf, { ...fetchOpts.options, status: void 0 });
    index = __privateGet(this, _keyMap).get(k);
  } else {
    __privateGet(this, _valList)[index] = bf;
  }
  return bf;
};
isBackgroundFetch_fn = function(p) {
  if (!__privateGet(this, _hasFetchMethod))
    return false;
  const b = p;
  return !!b && b instanceof Promise && b.hasOwnProperty("__staleWhileFetching") && b.__abortController instanceof AC;
};
connect_fn = function(p, n) {
  __privateGet(this, _prev)[n] = p;
  __privateGet(this, _next)[p] = n;
};
moveToTail_fn = function(index) {
  if (index !== __privateGet(this, _tail)) {
    if (index === __privateGet(this, _head)) {
      __privateSet(this, _head, __privateGet(this, _next)[index]);
    } else {
      __privateMethod(this, _LRUCache_instances, connect_fn).call(this, __privateGet(this, _prev)[index], __privateGet(this, _next)[index]);
    }
    __privateMethod(this, _LRUCache_instances, connect_fn).call(this, __privateGet(this, _tail), index);
    __privateSet(this, _tail, index);
  }
};
delete_fn = function(k, reason) {
  var _a2, _b2, _c2, _d;
  let deleted = false;
  if (__privateGet(this, _size) !== 0) {
    const index = __privateGet(this, _keyMap).get(k);
    if (index !== void 0) {
      deleted = true;
      if (__privateGet(this, _size) === 1) {
        __privateMethod(this, _LRUCache_instances, clear_fn).call(this, reason);
      } else {
        __privateGet(this, _removeItemSize).call(this, index);
        const v = __privateGet(this, _valList)[index];
        if (__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v)) {
          v.__abortController.abort(new Error("deleted"));
        } else if (__privateGet(this, _hasDispose) || __privateGet(this, _hasDisposeAfter)) {
          if (__privateGet(this, _hasDispose)) {
            (_a2 = __privateGet(this, _dispose)) == null ? void 0 : _a2.call(this, v, k, reason);
          }
          if (__privateGet(this, _hasDisposeAfter)) {
            (_b2 = __privateGet(this, _disposed)) == null ? void 0 : _b2.push([v, k, reason]);
          }
        }
        __privateGet(this, _keyMap).delete(k);
        __privateGet(this, _keyList)[index] = void 0;
        __privateGet(this, _valList)[index] = void 0;
        if (index === __privateGet(this, _tail)) {
          __privateSet(this, _tail, __privateGet(this, _prev)[index]);
        } else if (index === __privateGet(this, _head)) {
          __privateSet(this, _head, __privateGet(this, _next)[index]);
        } else {
          const pi = __privateGet(this, _prev)[index];
          __privateGet(this, _next)[pi] = __privateGet(this, _next)[index];
          const ni = __privateGet(this, _next)[index];
          __privateGet(this, _prev)[ni] = __privateGet(this, _prev)[index];
        }
        __privateWrapper(this, _size)._--;
        __privateGet(this, _free).push(index);
      }
    }
  }
  if (__privateGet(this, _hasDisposeAfter) && ((_c2 = __privateGet(this, _disposed)) == null ? void 0 : _c2.length)) {
    const dt = __privateGet(this, _disposed);
    let task;
    while (task = dt == null ? void 0 : dt.shift()) {
      (_d = __privateGet(this, _disposeAfter)) == null ? void 0 : _d.call(this, ...task);
    }
  }
  return deleted;
};
clear_fn = function(reason) {
  var _a2, _b2, _c2;
  for (const index of __privateMethod(this, _LRUCache_instances, rindexes_fn).call(this, { allowStale: true })) {
    const v = __privateGet(this, _valList)[index];
    if (__privateMethod(this, _LRUCache_instances, isBackgroundFetch_fn).call(this, v)) {
      v.__abortController.abort(new Error("deleted"));
    } else {
      const k = __privateGet(this, _keyList)[index];
      if (__privateGet(this, _hasDispose)) {
        (_a2 = __privateGet(this, _dispose)) == null ? void 0 : _a2.call(this, v, k, reason);
      }
      if (__privateGet(this, _hasDisposeAfter)) {
        (_b2 = __privateGet(this, _disposed)) == null ? void 0 : _b2.push([v, k, reason]);
      }
    }
  }
  __privateGet(this, _keyMap).clear();
  __privateGet(this, _valList).fill(void 0);
  __privateGet(this, _keyList).fill(void 0);
  if (__privateGet(this, _ttls) && __privateGet(this, _starts)) {
    __privateGet(this, _ttls).fill(0);
    __privateGet(this, _starts).fill(0);
  }
  if (__privateGet(this, _sizes)) {
    __privateGet(this, _sizes).fill(0);
  }
  __privateSet(this, _head, 0);
  __privateSet(this, _tail, 0);
  __privateGet(this, _free).length = 0;
  __privateSet(this, _calculatedSize, 0);
  __privateSet(this, _size, 0);
  if (__privateGet(this, _hasDisposeAfter) && __privateGet(this, _disposed)) {
    const dt = __privateGet(this, _disposed);
    let task;
    while (task = dt == null ? void 0 : dt.shift()) {
      (_c2 = __privateGet(this, _disposeAfter)) == null ? void 0 : _c2.call(this, ...task);
    }
  }
};
let LRUCache = _LRUCache;
class DnsService {
  constructor() {
    this.dnsServer = null;
    this.settings = null;
    this.execAsync = require$$1$1.promisify(child_process.exec);
    this.dnsCache = new LRUCache({ max: 100 });
    console.log("DnsService initialized");
  }
  init(settings) {
    var _a2;
    this.settings = settings;
    console.log("DnsService settings updated.");
    this.dnsCache = new LRUCache({ max: this.settings.dnsCacheSize || 100 });
    if (((_a2 = this.settings) == null ? void 0 : _a2.enableDns) && this.dnsServer) {
      this.stopDnsService().then(() => this.startDnsService());
    }
  }
  async startDnsService() {
    var _a2, _b2;
    if (this.dnsServer) {
      console.log("DNS服务已在运行");
      return;
    }
    if (!((_a2 = this.settings) == null ? void 0 : _a2.enableDns)) {
      console.log("DNS服务未启用，无法启动。");
      return;
    }
    try {
      this.dnsServer = Dns.createServer({
        udp: true,
        tcp: true,
        handle: (request, send, _rinfo) => this.handleDnsRequest(request, send)
      });
      const port = ((_b2 = this.settings) == null ? void 0 : _b2.dnsListenPort) || 53;
      await this.dnsServer.listen(port);
      console.log(`DNS服务启动成功，监听端口 ${port}`);
    } catch (error) {
      console.error("DNS服务启动失败:", error);
      this.dnsServer = null;
      throw error;
    }
  }
  async stopDnsService() {
    if (this.dnsServer) {
      try {
        await this.dnsServer.close();
        console.log("DNS服务已成功停止");
      } catch (error) {
        console.error("停止DNS服务时出错:", error);
      } finally {
        this.dnsServer = null;
      }
    } else {
      console.log("DNS服务未运行");
    }
  }
  async handleDnsRequest(request, send) {
    var _a2;
    const startTime = Date.now();
    const question = request.questions[0];
    if (!question || !this.settings) {
      return send(request);
    }
    const domain = question.name;
    if (this.settings.enableDnsLogging) {
      console.log(`[DNS Log] Query received for: ${domain}`);
    }
    if (this.settings.enableDnsCache) {
      const cachedIp = this.dnsCache.get(domain);
      if (cachedIp) {
        const cachedResponse = Dns.Packet.createResponseFromRequest(request);
        cachedResponse.answers.push({ name: domain, type: Dns.Packet.TYPE.A, class: Dns.Packet.CLASS.IN, ttl: 60, address: cachedIp });
        return send(cachedResponse);
      }
    }
    const ruleResult = this.applyDnsRules(domain, this.settings);
    switch (ruleResult.action) {
      case "block":
        const blockResponse = Dns.Packet.createResponseFromRequest(request);
        blockResponse.header.rcode = 3;
        return send(blockResponse);
      case "custom":
        return this.resolveWithUpstream(domain, [ruleResult.server], request, send, startTime);
      case "proxy":
      case "direct":
      default:
        const upstreamServers = ((_a2 = this.settings.dnsServers) == null ? void 0 : _a2.length) ? this.settings.dnsServers : ["8.8.8.8"];
        return this.resolveWithUpstream(domain, upstreamServers, request, send, startTime);
    }
  }
  async resolveWithUpstream(domain, servers, request, send, startTime) {
    var _a2, _b2, _c2, _d, _e, _f, _g, _h;
    const response = Dns.Packet.createResponseFromRequest(request);
    let isResolved = false;
    let serversToUse = [...servers];
    if ((_a2 = this.settings) == null ? void 0 : _a2.dnsLeakStrict) {
      serversToUse = serversToUse.filter((s) => s.startsWith("https://") || s.startsWith("tls://"));
      if (serversToUse.length === 0) {
        console.error("[DNS Strict Mode] No secure (DoH/DoT) DNS servers configured. Blocking query.");
        response.header.rcode = 3;
        return send(response);
      }
    }
    const serversToTry = ((_b2 = this.settings) == null ? void 0 : _b2.enableDnsLoadBalance) ? this.shuffleArray(serversToUse) : serversToUse;
    for (const server2 of serversToTry) {
      try {
        let resolver;
        if (server2.startsWith("https://")) {
          resolver = this.resolveSingleDoH;
        } else if (server2.startsWith("tls://")) {
          resolver = this.resolveSingleDoT;
        } else {
          resolver = this.resolveSingleStandard;
        }
        const resultIp = await resolver(domain, server2, request);
        if (resultIp) {
          if ((_c2 = this.settings) == null ? void 0 : _c2.enableDnsCache) {
            this.dnsCache.set(domain, resultIp);
          }
          response.answers.push({ name: domain, type: Dns.Packet.TYPE.A, class: Dns.Packet.CLASS.IN, ttl: ((_d = this.settings) == null ? void 0 : _d.dnsCacheTtl) || 300, address: resultIp });
          isResolved = true;
          break;
        }
      } catch (error) {
        console.warn(`DNS resolution failed for ${domain} with server ${server2}:`, error);
      }
    }
    if (!isResolved && ((_e = this.settings) == null ? void 0 : _e.enableDnsFallback) && ((_f = this.settings.dnsFallbackServers) == null ? void 0 : _f.length)) {
      console.log(`Primary DNS failed for ${domain}, trying fallback servers...`);
      const fallbackSettings = { ...this.settings, enableDnsFallback: false };
      const tempService = new DnsService();
      tempService.init(fallbackSettings);
      await tempService.resolveWithUpstream(domain, this.settings.dnsFallbackServers, request, (fallbackResponse) => {
        var _a3;
        if (fallbackResponse.answers.length > 0) {
          response.answers.push(...fallbackResponse.answers);
          isResolved = true;
          if ((_a3 = this.settings) == null ? void 0 : _a3.enableDnsLogging) {
            const answer = fallbackResponse.answers[0];
            console.log(`[DNS Log] Fallback success for ${domain}: -> ${answer.address} in ${Date.now() - startTime}ms`);
          }
        }
      }, startTime);
    }
    if (isResolved) {
      if ((_g = this.settings) == null ? void 0 : _g.enableDnsLogging) {
        const answer = response.answers[0];
        console.log(`[DNS Log] Resolved ${domain} -> ${answer.address} in ${Date.now() - startTime}ms`);
      }
    } else {
      response.header.rcode = 2;
      if ((_h = this.settings) == null ? void 0 : _h.enableDnsLogging) {
        console.log(`[DNS Log] Failed to resolve ${domain} in ${Date.now() - startTime}ms`);
      }
    }
    send(response);
  }
  // 将解析器重构为返回Promise<string | null>的单一解析函数
  async resolveSingleStandard(domain, server2, _request) {
    try {
      const resolver = new (await import("dns")).promises.Resolver();
      resolver.setServers([server2]);
      const addresses = await resolver.resolve4(domain);
      return addresses[0] || null;
    } catch (error) {
      console.error(`Standard DNS resolution failed for ${domain} with server ${server2}:`, error);
      throw error;
    }
  }
  async resolveSingleDoH(domain, server2, _request) {
    try {
      const dohResponse = await axios.get(server2, {
        params: { name: domain, type: "A" },
        headers: { "accept": "application/dns-json" },
        timeout: 3e3
      });
      if (dohResponse.data.Status === 0 && dohResponse.data.Answer) {
        const answer = dohResponse.data.Answer.find((a) => a.type === 1);
        return (answer == null ? void 0 : answer.data) || null;
      }
      return null;
    } catch (error) {
      console.error(`DoH resolution failed for ${domain} with server ${server2}:`, error);
      throw error;
    }
  }
  async resolveSingleDoT(domain, server2, _request) {
    return new Promise((resolve, reject) => {
      const [host, portStr] = server2.replace("tls://", "").split(":");
      const port = portStr ? parseInt(portStr, 10) : 853;
      const dnsQueryPacket = new Dns.Packet();
      dnsQueryPacket.questions.push({ name: domain, type: Dns.Packet.TYPE.A, class: Dns.Packet.CLASS.IN });
      const queryBuffer = dnsQueryPacket.toBuffer();
      const lengthBuffer = Buffer.alloc(2);
      lengthBuffer.writeUInt16BE(queryBuffer.length, 0);
      const finalQuery = Buffer.concat([lengthBuffer, queryBuffer]);
      const socket = tls.connect({ host, port, servername: host }, () => {
        socket.write(finalQuery);
      });
      socket.setTimeout(3e3);
      socket.on("data", (data) => {
        try {
          const answerPacket = Dns.Packet.parse(data.slice(2));
          if (answerPacket.answers.length > 0 && answerPacket.answers[0].address) {
            resolve(answerPacket.answers[0].address);
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(e);
        } finally {
          socket.end();
        }
      });
      socket.on("error", (err) => {
        reject(err);
        socket.end();
      });
      socket.on("timeout", () => {
        reject(new Error("DoT resolution timed out"));
        socket.end();
      });
    });
  }
  // 洗牌算法，用于负载均衡
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      const jValue = array[j];
      if (temp !== void 0 && jValue !== void 0) {
        array[i] = jValue;
        array[j] = temp;
      }
    }
    return array;
  }
  applyDnsRules(domain, settings) {
    if (!settings.enableDnsRules || !settings.dnsRules) {
      return { action: "none" };
    }
    for (const rule of settings.dnsRules) {
      if (!rule.enabled) continue;
      const match = this.isMatch(domain, rule.patternType, rule.pattern);
      if (match) {
        const result = { action: rule.action };
        if (rule.customServer) {
          result.server = rule.customServer;
        }
        return result;
      }
    }
    return { action: "none" };
  }
  isMatch(domain, type2, value) {
    try {
      switch (type2) {
        case "domain":
          return domain === value;
        case "suffix":
          return domain.endsWith(`.${value}`);
        case "keyword":
          return domain.includes(value);
        case "regex":
          return new RegExp(value).test(domain);
        default:
          return false;
      }
    } catch (e) {
      console.error(`Invalid regex in DNS rule: ${value}`, e);
      return false;
    }
  }
  async getSystemDnsServers() {
    try {
      const platform2 = os.platform();
      if (platform2 === "darwin") {
        const { stdout } = await this.execAsync(`scutil --dns | grep "nameserver\\[" | awk '{print $2}'`);
        return stdout.trim().split("\n").filter((server2) => server2.length > 0 && !server2.includes(":"));
      } else if (platform2 === "win32") {
        const { stdout } = await this.execAsync('ipconfig /all | findstr "DNS Servers"');
        const dnsServers = stdout.match(/\d+\.\d+\.\d+\.\d+/g);
        return dnsServers || [];
      } else {
        const { stdout } = await this.execAsync(`grep "nameserver" /etc/resolv.conf | awk '{print $2}'`);
        return stdout.trim().split("\n").filter((server2) => server2.length > 0 && !server2.includes(":"));
      }
    } catch (error) {
      console.error("获取系统DNS服务器失败:", error);
      return ["8.8.8.8", "1.1.1.1"];
    }
  }
  async testDnsQuery(domain, dnsServer) {
    const startTime = Date.now();
    try {
      const resolver = new (await import("dns")).promises.Resolver();
      resolver.setServers([dnsServer]);
      const addresses = await resolver.resolve4(domain);
      const responseTime = Date.now() - startTime;
      const ip = addresses[0];
      if (ip) {
        return { success: true, ip, responseTime };
      } else {
        return { success: false, error: "DNS查询返回空结果", responseTime };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "DNS查询执行失败", responseTime: Date.now() - startTime };
    }
  }
  async checkDnsLeak() {
    const details = [];
    let leaked = false;
    if (!this.settings) return { leaked: true, details: ["Settings not initialized"] };
    try {
      const testDomains = ["google.com", "facebook.com", "youtube.com"];
      const systemDns = await this.getSystemDnsServers();
      details.push(`系统DNS服务器: ${systemDns.join(", ")}`);
      for (const domain of testDomains) {
        const result = await this.testDnsQuery(domain, this.settings.dnsServer || "8.8.8.8");
        if (result.success && result.ip) {
          details.push(`✅ ${domain} -> ${result.ip} (${result.responseTime}ms)`);
        } else {
          details.push(`❌ ${domain} 查询失败: ${result.error}`);
        }
      }
      if (details.some((d) => d.includes("查询失败"))) {
        leaked = true;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      details.push(`DNS泄露检测执行失败: ${errorMessage}`);
      leaked = true;
    }
    return { leaked, details };
  }
  clearDnsCache() {
    this.dnsCache.clear();
    console.log("DNS cache cleared.");
  }
}
const dnsService = new DnsService();
class LocalSubscriptionStore {
  getSubscriptions() {
    const allSettings = settingsManager.getSettings();
    return allSettings.subscriptions || [];
  }
}
class DynamicChainManager {
  constructor() {
    this.activeTimers = /* @__PURE__ */ new Map();
    this.localSubscriptionStore = new LocalSubscriptionStore();
  }
  static getInstance() {
    if (!DynamicChainManager.instance) {
      DynamicChainManager.instance = new DynamicChainManager();
    }
    return DynamicChainManager.instance;
  }
  async startChain(chainConfig, listenPort) {
    if (chainConfig.type !== "dynamic" || !chainConfig.proxies) {
      throw new Error("Invalid dynamic chain configuration.");
    }
    console.log(`[DynamicChainManager] Starting dynamic chain: ${chainConfig.name} on port ${listenPort}`);
    const result = await this.updateAndApplyChain(chainConfig, listenPort);
    const updateInterval = 3e5;
    if (this.activeTimers.has(chainConfig.id)) {
      clearInterval(this.activeTimers.get(chainConfig.id));
    }
    const timer = setInterval(() => {
      console.log(`[DynamicChainManager] Auto-updating chain: ${chainConfig.name}`);
      this.updateAndApplyChain(chainConfig, listenPort).catch((error) => {
        console.error(`[DynamicChainManager] Auto-update failed for chain ${chainConfig.name}:`, error);
      });
    }, updateInterval);
    this.activeTimers.set(chainConfig.id, timer);
    return result;
  }
  stopChain(chainId) {
    if (this.activeTimers.has(chainId)) {
      clearInterval(this.activeTimers.get(chainId));
      this.activeTimers.delete(chainId);
      console.log(`[DynamicChainManager] Stopped scheduled updates for chain ID: ${chainId}`);
    }
  }
  async updateAndApplyChain(chainConfig, listenPort) {
    try {
      const allSubscriptions = this.localSubscriptionStore.getSubscriptions();
      const nodesToTest = [];
      const subscriptionNodeMap = /* @__PURE__ */ new Map();
      for (const subId of chainConfig.proxies) {
        const subscription = allSubscriptions.find((s) => s.id === subId);
        if (subscription && subscription.servers) {
          const subscriptionNodes = subscription.servers.map((server2) => {
            var _a2;
            const nodeConfig = {
              id: server2.id,
              name: server2.name,
              type: server2.protocol,
              // `protocol` 映射到 `type`
              server: server2.host,
              // `host` 映射到 `server`
              port: server2.port,
              subscriptionId: subId
            };
            if (server2.uuid) nodeConfig.uuid = server2.uuid;
            if (server2.password) nodeConfig.password = server2.password;
            if (server2.encryption) nodeConfig.encryption = server2.encryption;
            if (server2.network) nodeConfig.network = server2.network;
            if (server2.wsPath) nodeConfig.wsPath = server2.wsPath;
            if ((_a2 = server2.wsHeaders) == null ? void 0 : _a2["Host"]) nodeConfig.wsHost = server2.wsHeaders["Host"];
            if (server2.alterId) nodeConfig.alterId = server2.alterId;
            return nodeConfig;
          });
          nodesToTest.push(...subscriptionNodes);
          subscriptionNodeMap.set(subId, subscriptionNodes);
        }
      }
      if (nodesToTest.length === 0) {
        console.warn(`[DynamicChainManager] No nodes found for dynamic chain ${chainConfig.name}.`);
        return { port: 0 };
      }
      console.log(`[DynamicChainManager] Testing latency for ${nodesToTest.length} nodes...`);
      const testResults = await proxyManager.testNodesLatency(nodesToTest);
      const bestNodes = [];
      const selectedProtocol = this.selectCompatibleProtocol(nodesToTest);
      console.log(`[DynamicChainManager] 选择的兼容协议类型: ${selectedProtocol}`);
      for (const subId of chainConfig.proxies) {
        const nodesInSub = subscriptionNodeMap.get(subId) || [];
        const resultsForSub = testResults.filter((r) => nodesInSub.some((n) => n.id === r.nodeId));
        const validResults = resultsForSub.filter((r) => {
          const node2 = nodesInSub.find((n) => n.id === r.nodeId);
          return r.success && r.latency > 0 && node2 && node2.type === selectedProtocol;
        });
        if (validResults.length > 0) {
          validResults.sort((a, b) => a.latency - b.latency);
          const bestResult = validResults[0];
          const bestNode = nodesInSub.find((n) => n.id === bestResult.nodeId);
          if (bestNode) {
            bestNodes.push(bestNode);
            console.log(`[DynamicChainManager] 为订阅 ${subId} 选择节点: ${bestNode.name} (协议: ${bestNode.type}, 延迟: ${bestResult.latency}ms)`);
          }
        } else {
          const fallbackResults = resultsForSub.filter((r) => r.success && r.latency > 0);
          if (fallbackResults.length > 0) {
            fallbackResults.sort((a, b) => a.latency - b.latency);
            const fallbackResult = fallbackResults[0];
            const fallbackNode = nodesInSub.find((n) => n.id === fallbackResult.nodeId);
            if (fallbackNode) {
              bestNodes.push(fallbackNode);
              console.log(`[DynamicChainManager] 为订阅 ${subId} 选择备用节点: ${fallbackNode.name} (协议: ${fallbackNode.type}, 延迟: ${fallbackResult.latency}ms)`);
            }
          }
        }
      }
      if (bestNodes.length === 0) {
        console.error(`[DynamicChainManager] Could not find any valid nodes for chain ${chainConfig.name} after testing.`);
        throw new Error(`Could not find any valid nodes for chain ${chainConfig.name} after testing.`);
      }
      if (bestNodes.length > 0) {
        console.log(`[DynamicChainManager] Starting proxy manager with ${bestNodes.length} best nodes.`);
        await proxyManager.startProxyChain(`${chainConfig.name}_dynamic`, bestNodes, listenPort);
        console.log(`[DynamicChainManager] Proxy manager started successfully for chain: ${chainConfig.name}`);
        return { port: listenPort };
      } else {
        console.warn("[DynamicChainManager] No nodes found after latency test for dynamic chain", chainConfig.name);
        return { port: 0 };
      }
    } catch (error) {
      console.error(`[DynamicChainManager] Failed to update and apply chain ${chainConfig.name}:`, error);
      throw error;
    }
  }
  selectCompatibleProtocol(nodes) {
    const protocols = /* @__PURE__ */ new Set();
    nodes.forEach((node2) => {
      protocols.add(node2.type);
    });
    if (protocols.size === 0) {
      return "vmess";
    }
    const protocolCounts = {};
    protocols.forEach((p) => {
      protocolCounts[p] = (protocolCounts[p] || 0) + 1;
    });
    let mostCommonProtocol = "vmess";
    let maxCount = 0;
    for (const protocol in protocolCounts) {
      if (protocolCounts[protocol] && protocolCounts[protocol] > maxCount) {
        mostCommonProtocol = protocol;
        maxCount = protocolCounts[protocol];
      }
    }
    return mostCommonProtocol;
  }
}
const dynamicChainManager = DynamicChainManager.getInstance();
class DatabaseUpdateManager {
  constructor() {
    this.updateTimer = null;
    this.isChecking = false;
    this.databases = [
      {
        name: "GeoIP",
        fileName: "geoip.db",
        downloadUrl: "https://github.com/SagerNet/sing-geoip/releases/latest/download/geoip.db",
        etagUrl: "https://github.com/SagerNet/sing-geoip/releases/latest/download/geoip.db"
      },
      {
        name: "GeoSite",
        fileName: "geosite.db",
        downloadUrl: "https://github.com/SagerNet/sing-geosite/releases/latest/download/geosite.db",
        etagUrl: "https://github.com/SagerNet/sing-geosite/releases/latest/download/geosite.db"
      }
    ];
  }
  static getInstance() {
    if (!DatabaseUpdateManager.instance) {
      DatabaseUpdateManager.instance = new DatabaseUpdateManager();
    }
    return DatabaseUpdateManager.instance;
  }
  /**
   * 启动自动更新检查
   */
  startAutoUpdate(settings) {
    this.stopAutoUpdate();
    if (!settings.enableDatabaseAutoUpdate) {
      console.log("[DatabaseUpdateManager] 数据库自动更新已禁用");
      return;
    }
    const interval = settings.databaseUpdateInterval || 24;
    const intervalMs = interval * 60 * 60 * 1e3;
    console.log(`[DatabaseUpdateManager] 启动自动更新检查，间隔: ${interval}小时`);
    this.checkForUpdates(settings);
    this.updateTimer = setInterval(() => {
      this.checkForUpdates(settings);
    }, intervalMs);
  }
  /**
   * 停止自动更新检查
   */
  stopAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
      console.log("[DatabaseUpdateManager] 已停止自动更新检查");
    }
  }
  /**
   * 检查数据库更新
   */
  async checkForUpdates(settings) {
    if (this.isChecking) {
      console.log("[DatabaseUpdateManager] 正在检查中，跳过重复请求");
      return;
    }
    this.isChecking = true;
    console.log("[DatabaseUpdateManager] 开始检查数据库更新...");
    try {
      const results = [];
      for (const db of this.databases) {
        const result = await this.checkDatabaseUpdate(db);
        results.push(result);
        if (result.hasUpdate) {
          console.log(`[DatabaseUpdateManager] ${db.name} 有可用更新`);
          await this.downloadDatabase(db);
        } else if (result.error) {
          console.error(`[DatabaseUpdateManager] 检查 ${db.name} 失败:`, result.error);
        } else {
          console.log(`[DatabaseUpdateManager] ${db.name} 已是最新版本`);
        }
      }
      settings.databaseLastUpdateCheck = Date.now();
      this.sendUpdateNotification(results);
    } catch (error) {
      console.error("[DatabaseUpdateManager] 检查更新失败:", error);
    } finally {
      this.isChecking = false;
    }
  }
  /**
   * 检查单个数据库更新
   */
  async checkDatabaseUpdate(db) {
    try {
      const binDir = path$1.join(electron.app.getPath("userData"), "bin");
      const localPath = path$1.join(binDir, db.fileName);
      if (!fs$1.existsSync(localPath)) {
        return { hasUpdate: true, error: "本地文件不存在" };
      }
      const localStats = fs$1.statSync(localPath);
      const localModified = localStats.mtime.toISOString();
      const remoteInfo = await this.getRemoteFileInfo(db.downloadUrl);
      if (!remoteInfo.lastModified) {
        return { hasUpdate: false, error: "无法获取远程文件信息" };
      }
      const hasUpdate = new Date(remoteInfo.lastModified) > new Date(localModified);
      return {
        hasUpdate,
        currentVersion: localModified,
        latestVersion: remoteInfo.lastModified,
        lastModified: remoteInfo.lastModified
      };
    } catch (error) {
      return { hasUpdate: false, error: error instanceof Error ? error.message : "未知错误" };
    }
  }
  /**
   * 获取远程文件信息
   */
  async getRemoteFileInfo(url2) {
    return new Promise((resolve) => {
      const req = require$$1.get(url2, { method: "HEAD" }, (res) => {
        const lastModified = res.headers["last-modified"];
        const etag = res.headers.etag;
        resolve({ lastModified, etag });
      });
      req.on("error", () => {
        resolve({});
      });
      req.setTimeout(1e4, () => {
        req.destroy();
        resolve({});
      });
    });
  }
  /**
   * 下载数据库文件
   */
  async downloadDatabase(db) {
    try {
      console.log(`[DatabaseUpdateManager] 开始下载 ${db.name}...`);
      await coreDownloader.downloadDatabase(db.name.toLowerCase());
      console.log(`[DatabaseUpdateManager] ${db.name} 下载完成`);
      this.sendDownloadSuccessNotification(db.name);
    } catch (error) {
      console.error(`[DatabaseUpdateManager] 下载 ${db.name} 失败:`, error);
      this.sendDownloadErrorNotification(db.name, error instanceof Error ? error.message : "未知错误");
    }
  }
  /**
   * 手动触发更新检查
   */
  async manualUpdateCheck(settings) {
    try {
      await this.checkForUpdates(settings);
      return { success: true, message: "数据库更新检查完成" };
    } catch (error) {
      return {
        success: false,
        message: `更新检查失败: ${error instanceof Error ? error.message : "未知错误"}`
      };
    }
  }
  /**
   * 发送更新通知
   */
  sendUpdateNotification(results) {
    var _a2, _b2;
    const updatedDbs = results.filter((r) => r.hasUpdate).length;
    const errorDbs = results.filter((r) => r.error).length;
    if (updatedDbs > 0) {
      (_a2 = getNotificationManager()) == null ? void 0 : _a2.sendNotification({
        title: "数据库更新",
        body: `发现 ${updatedDbs} 个数据库有可用更新`,
        timeoutType: "default"
      });
    }
    if (errorDbs > 0) {
      (_b2 = getNotificationManager()) == null ? void 0 : _b2.sendNotification({
        title: "数据库更新检查失败",
        body: `${errorDbs} 个数据库检查失败，请检查网络连接`,
        timeoutType: "default"
      });
    }
  }
  /**
   * 发送下载成功通知
   */
  sendDownloadSuccessNotification(dbName) {
    var _a2;
    (_a2 = getNotificationManager()) == null ? void 0 : _a2.sendNotification({
      title: "数据库更新成功",
      body: `${dbName} 数据库已更新到最新版本`,
      timeoutType: "default"
    });
  }
  /**
   * 发送下载失败通知
   */
  sendDownloadErrorNotification(dbName, error) {
    var _a2;
    (_a2 = getNotificationManager()) == null ? void 0 : _a2.sendNotification({
      title: "数据库更新失败",
      body: `${dbName} 数据库更新失败: ${error}`,
      timeoutType: "default"
    });
  }
  /**
   * 获取数据库状态
   */
  getDatabaseStatus() {
    const binDir = path$1.join(electron.app.getPath("userData"), "bin");
    const status = {};
    for (const db of this.databases) {
      const localPath = path$1.join(binDir, db.fileName);
      const installed = fs$1.existsSync(localPath);
      if (installed) {
        try {
          const stats = fs$1.statSync(localPath);
          status[db.name.toLowerCase()] = {
            installed: true,
            lastModified: stats.mtime.toISOString()
          };
        } catch {
          status[db.name.toLowerCase()] = { installed: true };
        }
      } else {
        status[db.name.toLowerCase()] = { installed: false };
      }
    }
    return status;
  }
}
const databaseUpdateManager = DatabaseUpdateManager.getInstance();
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
let rebuildTrayMenu = null;
let savedChainsCache = [];
let isQuitting = false;
function broadcastProxyStatus(running, payload = {}) {
  try {
    const windows = electron.BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (win && !win.isDestroyed()) {
        win.webContents.send("proxy:statusChanged", { running, ...payload });
      }
    }
  } catch (err) {
    console.warn("广播代理状态失败:", err);
  }
}
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
      for (const window2 of windows) {
        if (!window2.isDestroyed()) {
          window2.destroy();
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
    if (tray) {
      console.log("托盘已存在，跳过创建");
      return;
    }
    let icon;
    try {
      const fs2 = require("fs");
      const candidates = [];
      try {
        candidates.push(path$1.join(electron.app.getAppPath(), "src/renderer/assets/tray-icon.png"));
      } catch {
      }
      candidates.push(path$1.join(__dirname, "../renderer/tray-icon.png"));
      candidates.push(path$1.join(__dirname, "../renderer/assets/tray-icon.png"));
      try {
        candidates.push(path$1.join(process.resourcesPath, "assets", "tray-icon.png"));
      } catch {
      }
      try {
        candidates.push(path$1.join(process.resourcesPath, "assets", "icon.png"));
      } catch {
      }
      candidates.push(path$1.join(__dirname, "../renderer/assets/icon.png"));
      const hit = candidates.find((p) => {
        try {
          return fs2.existsSync(p);
        } catch {
          return false;
        }
      });
      if (!hit) throw new Error("未找到托盘图标文件");
      icon = electron.nativeImage.createFromPath(hit).resize({ width: 18, height: 18 });
      if (process.platform === "darwin" && icon && typeof icon.setTemplateImage === "function") {
        try {
          icon.setTemplateImage(false);
        } catch {
        }
      }
      console.log("使用托盘图标:", hit);
    } catch (error) {
      console.log("使用默认托盘图标");
      icon = electron.nativeImage.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAB8SURBVDiNY2AYBYMRMDIyMjAyMjL8//+f4f///wws0AqYGBkZGRgYGBj+//8P5v///5+BBaQYpBikCKoYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGKQYpBikGAAAZqQZ8QAAAABJRU5ErkJggg==").resize({ width: 18, height: 18 });
    }
    tray = new electron.Tray(icon);
    console.log("托盘图标已创建");
    const buildTrayMenu = () => {
      const settings = settingsManager.getSettings();
      const mode = proxyModeManager.getCurrentMode();
      const modeItems = [
        { label: "规则模式", type: "radio", checked: mode === "rule", click: async () => {
          await proxyModeManager.applyProxyMode({ mode: "rule", settings });
          rebuildTrayMenu && rebuildTrayMenu();
        } },
        { label: "全局模式", type: "radio", checked: mode === "global", click: async () => {
          await proxyModeManager.applyProxyMode({ mode: "global", settings });
          rebuildTrayMenu && rebuildTrayMenu();
        } },
        { label: "直连模式", type: "radio", checked: mode === "direct", click: async () => {
          await proxyModeManager.applyProxyMode({ mode: "direct", settings });
          rebuildTrayMenu && rebuildTrayMenu();
        } },
        { label: "VPN 模式 (TUN)", type: "radio", checked: mode === "vpn", click: async () => {
          await proxyModeManager.applyProxyMode({ mode: "vpn", settings, networkSettings: { enableTun: true, tunDevice: settings.tunDevice } });
          rebuildTrayMenu && rebuildTrayMenu();
        } }
      ];
      const subs = settings.subscriptions || [];
      const allNodes = [];
      for (const s of subs) {
        for (const n of s.servers || []) {
          allNodes.push({ id: n.id, name: n.name });
        }
      }
      const nodeItems = allNodes.length > 0 ? allNodes.map((n) => ({
        label: n.name,
        click: async () => {
          try {
            const appSettings = settingsManager.getSettings();
            const found = (() => {
              for (const s of appSettings.subscriptions || []) {
                const f = (s.servers || []).find((sv) => sv.id === n.id);
                if (f) return f;
              }
              return null;
            })();
            if (!found) return;
            await proxyManager.stopMiddleware().catch(() => {
            });
            const proto = (found.protocol || "").toLowerCase();
            const normalizedType = proto === "ss" ? "shadowsocks" : proto;
            const outbound = {
              type: normalizedType,
              tag: found.name || `proxy-${n.id}`,
              server: found.host,
              server_port: found.port
            };
            if (normalizedType === "vmess") {
              outbound.uuid = found.uuid;
              outbound.security = found.security || "auto";
              if (found.network === "ws") {
                outbound.transport = {
                  type: "ws",
                  path: found.wsPath || "/",
                  headers: found.wsHeaders || {}
                };
                if (found.wsHost && !outbound.transport.headers.Host) {
                  outbound.transport.headers.Host = found.wsHost;
                }
              }
            } else if (normalizedType === "shadowsocks") {
              outbound.method = found.method || found.encryption;
              outbound.password = found.password;
            } else if (normalizedType === "trojan") {
              outbound.password = found.password;
              const serverName = found.sni || found.host;
              outbound.tls = { enabled: true, server_name: serverName, insecure: found.allowInsecure ?? true };
            }
            const cfg = {
              log: { level: appSettings.logLevel || "info", output: appSettings.enableLog ? appSettings.logFile || "chongdong.log" : "console" },
              experimental: { clash_api: { external_controller: "127.0.0.1:9090", external_ui: "", secret: "" } },
              dns: { servers: [{ tag: "default", address: appSettings.dnsServer || "8.8.8.8", detour: "direct" }], final: "default" },
              inbounds: [{ type: "socks", tag: "socks-in", listen: "127.0.0.1", listen_port: appSettings.socksPort || 7896 }, { type: "http", tag: "http-in", listen: "127.0.0.1", listen_port: appSettings.proxyPort || 7897 }],
              outbounds: [{ type: "direct", tag: "direct" }, { type: "dns", tag: "dns" }, outbound],
              route: { rules: [{ geoip: "private", outbound: "direct" }, { geoip: "cn", outbound: "direct" }], final: outbound.tag }
            };
            await proxyManager.startSingbox(cfg);
            broadcastProxyStatus(true, { source: "tray-node" });
            try {
              const socksPort = appSettings.socksPort || 7896;
              const httpPort = appSettings.proxyPort || 7897;
              await systemProxyManager.setSystemProxy("127.0.0.1", socksPort, httpPort);
            } catch (err) {
              console.warn("设置系统代理失败:", err);
            }
          } catch (e) {
            console.error("通过托盘启动节点失败:", e);
          }
        }
      })) : [{ label: "无可用节点", enabled: false }];
      const dynamicChainItems = [{
        label: "启动（从全部订阅自动择优）",
        click: async () => {
          try {
            const subs2 = settingsManager.getSettings().subscriptions || [];
            if (subs2.length === 0) return;
            const chain = { id: "tray_dynamic_all", name: "托盘·自动链", description: "从全部订阅自动选择最佳节点", type: "dynamic", proxies: subs2.map((s) => s.id), rules: [], enabled: true, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() };
            const port = settings.proxyPort || 7897;
            const result = await dynamicChainManager.startChain(chain, port);
            broadcastProxyStatus(true, { source: "tray-dynamic-all", port: result.port || port });
            try {
              await systemProxyManager.setSystemProxy("127.0.0.1", result.port || port, result.port || port);
            } catch (err) {
              console.warn("设置系统代理失败:", err);
            }
          } catch (e) {
            console.error("通过托盘启动动态链失败:", e);
          }
        }
      }];
      try {
        const chainsFromRenderer = savedChainsCache || [];
        const chainsOnDisk = loadChainsFromDisk();
        const chainsFromSettings = settings.chains || [];
        const chains = chainsFromRenderer && chainsFromRenderer.length > 0 ? chainsFromRenderer : chainsOnDisk && chainsOnDisk.length > 0 ? chainsOnDisk : chainsFromSettings || [];
        if (Array.isArray(chains) && chains.length > 0) {
          dynamicChainItems.push({ type: "separator" });
          for (const c of chains) {
            dynamicChainItems.push({
              label: `启动：${c.name}`,
              click: async () => {
                try {
                  const port = settings.proxyPort || 7897;
                  if (c.type === "dynamic") {
                    const result = await dynamicChainManager.startChain(c, port);
                    broadcastProxyStatus(true, { source: "tray-dynamic", chainId: c.id, port: result.port || port });
                    try {
                      await systemProxyManager.setSystemProxy("127.0.0.1", result.port || port, result.port || port);
                    } catch (err) {
                      console.warn("设置系统代理失败:", err);
                    }
                  } else {
                    await proxyManager.startChain(c, { listenPort: port });
                    broadcastProxyStatus(true, { source: "tray-static", chainId: c.id, port });
                    try {
                      await systemProxyManager.setSystemProxy("127.0.0.1", port, port);
                    } catch (err) {
                      console.warn("设置系统代理失败:", err);
                    }
                  }
                } catch (e) {
                  console.error("启动已保存代理链失败:", e);
                }
              }
            });
          }
        }
      } catch (e) {
      }
      const menu = electron.Menu.buildFromTemplate([
        { label: "显示主窗口", click: () => showMainWindow() },
        { type: "separator" },
        { label: "代理模式", submenu: modeItems },
        { label: "选择节点", submenu: nodeItems },
        { label: "代理链", submenu: dynamicChainItems },
        { type: "separator" },
        { label: "停止代理", click: async () => {
          try {
            await proxyManager.stopAll();
            await systemProxyManager.clearSystemProxy();
            broadcastProxyStatus(false, { source: "tray-stop" });
          } catch (e) {
            console.warn(e);
          }
        } },
        { label: "刷新菜单", click: () => {
          rebuildTrayMenu && rebuildTrayMenu();
        } },
        { type: "separator" },
        { label: "隐藏", click: () => {
          if (mainWindow) mainWindow.hide();
        } },
        { label: "退出", click: async () => {
          await quitApp();
        } }
      ]);
      return menu;
    };
    rebuildTrayMenu = () => {
      try {
        if (!tray) return;
        tray.setContextMenu(buildTrayMenu());
      } catch (e) {
        console.error("刷新托盘菜单失败:", e);
      }
    };
    tray.setContextMenu(buildTrayMenu());
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
function loadChainsFromDisk() {
  try {
    const p = path$1.join(electron.app.getPath("userData"), "chains.json");
    if (fs__namespace.existsSync(p)) {
      const raw = fs__namespace.readFileSync(p, "utf8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    console.warn("读取 chains.json 失败:", e);
  }
  return [];
}
function createWindow() {
  const preferences = getUserPreferences();
  let iconPath;
  try {
    if (process.platform === "darwin") {
      const icnsPath = path$1.join(__dirname, "../../release/mac/虫洞.app/Contents/Resources/electron.icns");
      const fs2 = require("fs");
      if (fs2.existsSync(icnsPath)) {
        iconPath = icnsPath;
        console.log("使用 macOS 图标:", iconPath);
      }
    } else {
      const pngPath = path$1.join(__dirname, "../renderer/assets/icon.png");
      const fs2 = require("fs");
      if (fs2.existsSync(pngPath)) {
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
      preload: path$1.join(__dirname, "../preload/index.js"),
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
      mainWindow == null ? void 0 : mainWindow.loadFile(path$1.join(__dirname, "../renderer/index.html"));
    }
  };
  mainWindow.on("ready-to-show", () => {
    if (!tray) createTray();
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
electron.app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.chongdong.app");
  crashMonitor.startMonitoring();
  try {
    const settings = settingsManager.getSettings();
    dnsService.init(settings);
    console.log("DNS服务已初始化");
  } catch (error) {
    console.error("初始化DNS服务失败:", error);
  }
  try {
    const settings = settingsManager.getSettings();
    console.log(`[应用启动] 应用默认代理模式: ${settings.mode}`);
    await proxyModeManager.applyProxyMode({
      mode: settings.mode,
      settings,
      networkSettings: {
        listenPort: settings.proxyPort
      }
    });
    console.log(`[应用启动] 默认代理模式应用完成: ${settings.mode}`);
  } catch (error) {
    console.error("[应用启动] 应用默认代理模式失败:", error);
  }
  electron.app.on("browser-window-created", (_, window2) => {
    optimizer.watchWindowShortcuts(window2);
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
electron.ipcMain.handle("chains:updateSaved", async (_e, chains) => {
  try {
    if (Array.isArray(chains)) {
      savedChainsCache = chains;
      console.log(`已更新保存的代理链(${chains.length})`);
      try {
        rebuildTrayMenu && rebuildTrayMenu();
      } catch {
      }
      return { success: true };
    }
    return { success: false, error: "Invalid chains payload" };
  } catch (err) {
    return { success: false, error: (err == null ? void 0 : err.message) || String(err) };
  }
});
electron.ipcMain.handle("chains:save", async (_e, chains) => {
  try {
    if (!Array.isArray(chains)) return { success: false, error: "Invalid chains payload" };
    const p = path$1.join(electron.app.getPath("userData"), "chains.json");
    fs__namespace.writeFileSync(p, JSON.stringify(chains, null, 2), "utf8");
    savedChainsCache = chains;
    try {
      rebuildTrayMenu && rebuildTrayMenu();
    } catch {
    }
    return { success: true, path: p };
  } catch (err) {
    return { success: false, error: (err == null ? void 0 : err.message) || String(err) };
  }
});
electron.ipcMain.handle("chains:get", async () => {
  try {
    const settings = settingsManager.getSettings();
    const chains = savedChainsCache && savedChainsCache.length > 0 ? savedChainsCache : loadChainsFromDisk().length > 0 ? loadChainsFromDisk() : settings.chains || [];
    return { success: true, chains };
  } catch (err) {
    return { success: false, error: (err == null ? void 0 : err.message) || String(err) };
  }
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
    try {
      await proxyManager.stopMiddleware();
    } catch (e) {
      console.warn("[IPC] stopMiddleware ignore:", e);
    }
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
    try {
      await proxyManager.stopMiddleware();
    } catch (e) {
      console.warn("[IPC] stopMiddleware ignore:", e);
    }
    await proxyManager.startXray(config);
    return { success: true };
  } catch (error) {
    console.error("Failed to start Xray:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("proxy:startClash", async (_, config) => {
  try {
    try {
      await proxyManager.stopMiddleware();
    } catch (e) {
      console.warn("[IPC] stopMiddleware ignore:", e);
    }
    await proxyManager.startClash(config);
    return { success: true };
  } catch (error) {
    console.error("Failed to start Clash:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("proxy:stop", async () => {
  try {
    try {
      await proxyManager.stopMiddleware();
    } catch (e) {
      console.warn("[IPC] stopMiddleware ignore:", e);
    }
    await proxyManager.stopAll();
    try {
      await systemProxyManager.clearSystemProxy();
    } catch {
    }
    broadcastProxyStatus(false, { source: "ipc-stop" });
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
electron.ipcMain.handle("proxy:testLatency", async (_, { node: node2, config }) => {
  try {
    console.log("开始测试节点延迟:", node2.name, config);
    const startTime = Date.now();
    const https2 = require("https");
    const http2 = require("http");
    const testUrl = config.testUrl || "http://connectivitycheck.gstatic.com/generate_204";
    const timeout = config.timeout || 1e4;
    return new Promise((resolve) => {
      const url2 = new URL(testUrl);
      const isHttps2 = url2.protocol === "https:";
      const client = isHttps2 ? https2 : http2;
      const req = client.request(url2, {
        method: "GET",
        timeout
        // 如果需要通过代理测试，可以在这里添加代理配置
        // 例如：agent: new HttpsProxyAgent(proxyUrl)
      }, (res) => {
        const endTime = Date.now();
        const latency = endTime - startTime;
        console.log(`延迟测试成功: ${node2.name}`, { latency });
        resolve({
          success: true,
          latency,
          statusCode: res.statusCode
        });
      });
      req.on("error", (error) => {
        console.error(`延迟测试失败: ${node2.name}`, error);
        resolve({
          success: false,
          error: error.message,
          latency: 0
        });
      });
      req.on("timeout", () => {
        console.error(`延迟测试超时: ${node2.name}`);
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
  var _a2;
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
        try {
          const mode = proxyModeManager.getCurrentMode();
          if (mode === "vpn") {
            await CompatPortForwarder.stopAll();
            const appSettings = settings.settings;
            if (appSettings.enableCompatProxy) {
              const entry = ((_a2 = proxyManager2.getMiddlewareEntryPort) == null ? void 0 : _a2.call(proxyManager2)) || appSettings.socksPort || appSettings.mixedPort || appSettings.proxyPort;
              if (entry) {
                const httpPort = appSettings.compatHttpPort || 1080;
                const socksPort = appSettings.compatSocksPort || 1080;
                await CompatPortForwarder.start(httpPort, "127.0.0.1", entry);
                if (socksPort !== httpPort) {
                  await CompatPortForwarder.start(socksPort, "127.0.0.1", entry);
                }
              }
            }
          }
        } catch (err) {
          console.warn("应用兼容端口设置失败:", err);
        }
      } catch (error) {
        console.error("更新代理管理器设置失败:", error);
      }
    }
    if (settings.settings) {
      try {
        dnsService.init(settings.settings);
        console.log("DNS服务设置已更新");
      } catch (error) {
        console.error("更新DNS服务设置失败:", error);
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
  var _a2, _b2;
  try {
    const interfaces = systemProxyManager.getNetworkInterfaces();
    return {
      connected: interfaces.length > 0,
      type: "ethernet",
      interface: ((_a2 = interfaces[0]) == null ? void 0 : _a2.name) || "",
      ip: ((_b2 = interfaces[0]) == null ? void 0 : _b2.address) || ""
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
electron.ipcMain.handle("chain:getStatus", async (_, chainId) => {
  try {
    let chainStatus = chainStatusManager.getChainStatus(chainId);
    if (!chainStatus) {
      const all3 = chainStatusManager.getAllChainStatuses();
      const running = all3.find((s) => s.status === "running");
      chainStatus = (running || all3[0]) ?? null;
    }
    if (!chainStatus) {
      return { success: false, error: "未找到任何代理链状态" };
    }
    return { success: true, data: chainStatus };
  } catch (error) {
    console.error("获取代理链状态失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
});
electron.ipcMain.handle("chain:getAllStatuses", async () => {
  try {
    const allStatuses = chainStatusManager.getAllChainStatuses();
    return { success: true, data: allStatuses };
  } catch (error) {
    console.error("获取所有代理链状态失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
});
electron.ipcMain.handle("chain:detectNodeIPs", async (_, chainId) => {
  try {
    let targetId = chainId;
    const current = chainStatusManager.getChainStatus(chainId);
    if (!current) {
      const all3 = chainStatusManager.getAllChainStatuses();
      const running = all3.find((s) => s.status === "running");
      if (running) targetId = running.chainId;
      else if (all3[0]) targetId = all3[0].chainId;
    }
    const nodeIPs = await chainStatusManager.detectChainNodeIPs(targetId);
    return { success: true, data: nodeIPs };
  } catch (error) {
    console.error("检测代理链节点IP失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
});
electron.ipcMain.handle("chain:getConfig", async (_, chainId) => {
  try {
    const chainStatus = chainStatusManager.getChainStatus(chainId);
    if (chainStatus) {
      const chainConfig = {
        id: chainStatus.chainId,
        name: chainStatus.chainName,
        description: `代理链: ${chainStatus.chainName}`,
        type: chainStatus.chainType,
        proxies: chainStatus.nodes.map((node2) => node2.nodeId),
        // 只返回节点ID数组
        rules: [],
        enabled: true,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      return { success: true, data: chainConfig };
    }
    const chains = loadChainsFromDisk();
    const chain = chains.find((c) => c.id === chainId);
    if (chain) {
      return { success: true, data: chain };
    } else {
      return { success: false, error: "代理链配置不存在" };
    }
  } catch (error) {
    console.error("获取代理链配置失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
});
electron.ipcMain.handle("geolocation:testViaProxy", async (_, { proxyUrl }) => {
  try {
    console.log("开始通过代理测试IP地理位置:", proxyUrl);
    const { URL: URL2 } = require("url");
    const apis = [
      "https://ipapi.co/json/",
      "https://ipinfo.io/json",
      "https://api.ipify.org?format=json"
    ];
    const proxyUrlObj = new URL2(proxyUrl);
    const appSettings = settingsManager.getSettings();
    const proxyHost = proxyUrlObj.hostname || "127.0.0.1";
    const socksPort = Number(proxyUrlObj.port) || Number(appSettings == null ? void 0 : appSettings.socksPort) || 7896;
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
                console.log("Raw response body from SOCKS:", body);
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
                console.log("Raw response body from SOCKS:", body);
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
      const r = await tryViaSocks(api);
      if (r && r.success) {
        console.log(`IP地理位置API ${api} 通过 SOCKS 代理测试成功`);
        return r;
      }
      console.warn(`IP地理位置API ${api} 通过 SOCKS 代理测试失败:`, (r == null ? void 0 : r.error) || "Unknown error");
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
electron.ipcMain.handle("dns:startService", async () => {
  try {
    await dnsService.startDnsService();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("dns:stopService", async () => {
  try {
    await dnsService.stopDnsService();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("dns:getSystemDnsServers", async () => {
  try {
    const servers = await dnsService.getSystemDnsServers();
    return { success: true, servers };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("dns:testDnsQuery", async (_, { domain, dnsServer }) => {
  try {
    const result = await dnsService.testDnsQuery(domain, dnsServer);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("dns:checkDnsLeak", async () => {
  try {
    const result = await dnsService.checkDnsLeak();
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("dns:clearDnsCache", () => {
  try {
    dnsService.clearDnsCache();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("proxy:start-dynamic-chain", async (_event, { chain, listenPort }) => {
  try {
    const result = await dynamicChainManager.startChain(chain, listenPort);
    return { success: true, port: result.port };
  } catch (error) {
    console.error("启动动态代理链失败:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});
electron.ipcMain.handle("dns:start-service", async (_event, _settings) => {
  try {
    await dnsService.startDnsService();
    return { success: true };
  } catch (error) {
    console.error("Failed to start DNS service:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
systemMonitor.registerIpcHandlers();
systemMonitor.startMonitoring();
electron.ipcMain.handle("proxy:applyMode", async (_, { mode, settings, networkSettings }) => {
  try {
    const result = await proxyModeManager.applyProxyMode({
      mode,
      settings,
      networkSettings
    });
    return result;
  } catch (error) {
    console.error("应用代理模式失败:", error);
    return {
      success: false,
      message: `应用代理模式失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
});
electron.ipcMain.handle("proxy:getCurrentMode", async () => {
  try {
    const mode = proxyModeManager.getCurrentMode();
    const vpnName = proxyModeManager.getCurrentVpnName();
    return { success: true, mode, vpnName };
  } catch (error) {
    console.error("获取当前代理模式失败:", error);
    return {
      success: false,
      error: `获取当前代理模式失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
});
electron.ipcMain.handle("proxy:checkVpnStatus", async () => {
  try {
    const status = await proxyModeManager.checkVpnStatus();
    return { success: true, ...status };
  } catch (error) {
    console.error("检查VPN状态失败:", error);
    return {
      success: false,
      error: `检查VPN状态失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
});
electron.ipcMain.handle("tun:diagnose", async (_event, tunName) => {
  try {
    const result = await TunController.diagnose(tunName || "utun0");
    return { success: true, data: result };
  } catch (error) {
    console.error("TUN 诊断失败:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});
electron.ipcMain.handle("proxy:disconnectVpn", async () => {
  try {
    await proxyModeManager.disconnectVpn();
    return { success: true, message: "VPN连接已断开" };
  } catch (error) {
    console.error("断开VPN连接失败:", error);
    return {
      success: false,
      error: `断开VPN连接失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
});
electron.ipcMain.handle("database:checkUpdate", async (_, settings) => {
  try {
    const result = await databaseUpdateManager.manualUpdateCheck(settings);
    return result;
  } catch (error) {
    console.error("手动检查数据库更新失败:", error);
    return {
      success: false,
      message: `检查失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
});
electron.ipcMain.handle("database:getStatus", async () => {
  try {
    const status = databaseUpdateManager.getDatabaseStatus();
    return { success: true, status };
  } catch (error) {
    console.error("获取数据库状态失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
});
