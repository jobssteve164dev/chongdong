"use strict";
const electron = require("electron");
const path = require("path");
const child_process = require("child_process");
const fs = require("fs");
const https = require("https");
const util = require("util");
const os = require("os");
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
  async extractFile(filePath, extractDir) {
    return new Promise((resolve, reject) => {
      const isGzip = filePath.endsWith(".gz");
      const isZip = filePath.endsWith(".zip");
      const isTarGz = filePath.endsWith(".tar.gz");
      let command;
      let args;
      if (isTarGz) {
        command = "tar";
        args = ["-xzf", filePath, "-C", extractDir, "--strip-components=1"];
      } else if (isGzip) {
        command = "gunzip";
        args = ["-f", filePath];
      } else if (isZip) {
        command = "unzip";
        args = ["-o", filePath, "-d", extractDir];
      } else {
        resolve();
        return;
      }
      const child = child_process.spawn(command, args);
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`解压失败: ${command} exited with code ${code}`));
        }
      });
      child.on("error", (error) => {
        reject(new Error(`解压失败: ${error.message}`));
      });
    });
  }
  /**
   * 下载并安装核心
   */
  async downloadCore(coreName) {
    try {
      const coreInfo = this.getCoreInfo(coreName);
      const downloadPath = path.join(this.coresDir, `${coreName}-${coreInfo.version}.${coreInfo.downloadUrl.split(".").pop()}`);
      const corePath = path.join(this.binDir, coreInfo.fileName);
      console.log(`开始下载 ${coreInfo.name} v${coreInfo.version}...`);
      await this.downloadFile(coreInfo.downloadUrl, downloadPath);
      console.log(`下载完成，开始解压...`);
      await this.extractFile(downloadPath, this.binDir);
      if (process.platform !== "win32") {
        try {
          fs.chmodSync(corePath, 493);
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
   * 获取所有核心的安装状态
   */
  getCoresStatus() {
    return {
      singbox: this.isCoreInstalled("singbox"),
      xray: this.isCoreInstalled("xray"),
      clash: this.isCoreInstalled("clash")
    };
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
   * 启动Sing-box引擎
   */
  async startSingbox(config) {
    var _a, _b;
    const processId = `singbox_${Date.now()}`;
    const configPath = path.join(this.configDir, `${processId}.json`);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    const singboxPath = await this.getSingboxPath();
    const childProcess = child_process.spawn(singboxPath, ["run", "-c", configPath], {
      stdio: ["pipe", "pipe", "pipe"],
      detached: false
    });
    childProcess.on("error", (error) => {
      console.error("Sing-box process error:", error);
    });
    childProcess.on("exit", (code, signal) => {
      console.log(`Sing-box process exited with code ${code} and signal ${signal}`);
      this.processes.delete(processId);
    });
    this.processes.set(processId, {
      id: processId,
      type: "singbox",
      process: childProcess,
      config,
      port: ((_b = (_a = config.inbounds) == null ? void 0 : _a[0]) == null ? void 0 : _b.listen_port) || 7890
    });
    console.log(`Started Sing-box process: ${processId}`);
  }
  /**
   * 启动Xray引擎
   */
  async startXray(config) {
    var _a, _b;
    const processId = `xray_${Date.now()}`;
    const configPath = path.join(this.configDir, `${processId}.json`);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    const xrayPath = await this.getXrayPath();
    const childProcess = child_process.spawn(xrayPath, ["run", "-c", configPath], {
      stdio: ["pipe", "pipe", "pipe"],
      detached: false
    });
    childProcess.on("error", (error) => {
      console.error("Xray process error:", error);
    });
    childProcess.on("exit", (code, signal) => {
      console.log(`Xray process exited with code ${code} and signal ${signal}`);
      this.processes.delete(processId);
    });
    this.processes.set(processId, {
      id: processId,
      type: "xray",
      process: childProcess,
      config,
      port: ((_b = (_a = config.inbounds) == null ? void 0 : _a[0]) == null ? void 0 : _b.port) || 1080
    });
    console.log(`Started Xray process: ${processId}`);
  }
  /**
   * 启动Clash引擎
   */
  async startClash(config) {
    const processId = `clash_${Date.now()}`;
    const configPath = path.join(this.configDir, `${processId}.yaml`);
    fs.writeFileSync(configPath, this.convertClashConfigToYaml(config));
    const clashPath = await this.getClashPath();
    const childProcess = child_process.spawn(clashPath, ["-d", this.configDir, "-f", configPath], {
      stdio: ["pipe", "pipe", "pipe"],
      detached: false
    });
    childProcess.on("error", (error) => {
      console.error("Clash process error:", error);
    });
    childProcess.on("exit", (code, signal) => {
      console.log(`Clash process exited with code ${code} and signal ${signal}`);
      this.processes.delete(processId);
    });
    this.processes.set(processId, {
      id: processId,
      type: "clash",
      process: childProcess,
      config,
      port: config.port || 7890
    });
    console.log(`Started Clash process: ${processId}`);
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
    return {
      totalUpload: 0,
      totalDownload: 0,
      activeConnections: this.processes.size,
      totalConnections: this.processes.size
    };
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
  async setSystemProxy(host, port) {
    switch (process.platform) {
      case "win32":
        await this.setWindowsProxy(host, port);
        break;
      case "darwin":
        await this.setMacOSProxy(host, port);
        break;
      case "linux":
        await this.setLinuxProxy(host, port);
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
  async setMacOSProxy(host, port) {
    try {
      const { stdout: services } = await execAsync("networksetup -listallnetworkservices");
      const serviceLines = services.split("\n").filter((line) => line.trim() && !line.includes("*"));
      for (const service of serviceLines) {
        if (service.trim()) {
          await execAsync(`networksetup -setwebproxy "${service.trim()}" ${host} ${port}`);
          await execAsync(`networksetup -setsecurewebproxy "${service.trim()}" ${host} ${port}`);
          await execAsync(`networksetup -setsocksfirewallproxy "${service.trim()}" ${host} ${port}`);
          await execAsync(`networksetup -setwebproxystate "${service.trim()}" on`);
          await execAsync(`networksetup -setsecurewebproxystate "${service.trim()}" on`);
          await execAsync(`networksetup -setsocksfirewallproxystate "${service.trim()}" on`);
        }
      }
      console.log(`macOS proxy set to ${host}:${port}`);
    } catch (error) {
      throw new Error(`Failed to set macOS proxy: ${error}`);
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
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    // 暂时移除图标设置，避免找不到图标文件
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  const template = [
    {
      label: "文件",
      submenu: [
        {
          label: "新建配置",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow.webContents.send("menu-new-config");
          }
        },
        {
          label: "导入配置",
          accelerator: "CmdOrCtrl+O",
          click: () => {
            mainWindow.webContents.send("menu-import-config");
          }
        },
        { type: "separator" },
        {
          label: "退出",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            electron.app.quit();
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
            mainWindow.webContents.send("menu-about");
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
  electron.app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
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
electron.ipcMain.handle("core:getStatus", () => {
  return coreDownloader.getCoresStatus();
});
electron.ipcMain.handle("core:download", async (_, { coreName }) => {
  try {
    await coreDownloader.downloadCore(coreName);
    return { success: true };
  } catch (error) {
    console.error(`Failed to download core ${coreName}:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("core:isInstalled", (_, coreName) => {
  return coreDownloader.isCoreInstalled(coreName);
});
electron.ipcMain.handle("proxy:startSingbox", async (_, config) => {
  try {
    await proxyManager.startSingbox(config);
    return { success: true };
  } catch (error) {
    console.error("Failed to start Sing-box:", error);
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
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
});
electron.ipcMain.handle("system:setProxy", async (_, { host, port }) => {
  try {
    await systemProxyManager.setSystemProxy(host, port);
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
    return null;
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
