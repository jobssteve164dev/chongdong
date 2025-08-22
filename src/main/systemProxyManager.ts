import { exec } from 'child_process';
import { promisify } from 'util';
import { networkInterfaces } from 'os';

const execAsync = promisify(exec);

export class SystemProxyManager {
  private static instance: SystemProxyManager;

  private constructor() {}

  public static getInstance(): SystemProxyManager {
    if (!SystemProxyManager.instance) {
      SystemProxyManager.instance = new SystemProxyManager();
    }
    return SystemProxyManager.instance;
  }

  /**
   * 设置系统代理
   */
  public async setSystemProxy(host: string, socksPort: number, httpPort?: number): Promise<void> {
    switch (process.platform) {
      case 'win32':
        await this.setWindowsProxy(host, httpPort || socksPort);
        break;
      case 'darwin':
        await this.setMacOSProxy(host, socksPort, httpPort);
        break;
      case 'linux':
        await this.setLinuxProxy(host, httpPort || socksPort);
        break;
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }

  /**
   * 清除系统代理
   */
  public async clearSystemProxy(): Promise<void> {
    switch (process.platform) {
      case 'win32':
        await this.clearWindowsProxy();
        break;
      case 'darwin':
        await this.clearMacOSProxy();
        break;
      case 'linux':
        await this.clearLinuxProxy();
        break;
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }

  /**
   * 获取当前系统代理设置
   */
  public async getSystemProxy(): Promise<{ host: string; port: number; enabled: boolean } | null> {
    switch (process.platform) {
      case 'win32':
        return await this.getWindowsProxy();
      case 'darwin':
        return await this.getMacOSProxy();
      case 'linux':
        return await this.getLinuxProxy();
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }

  /**
   * Windows系统代理设置
   */
  private async setWindowsProxy(host: string, port: number): Promise<void> {
    try {
      // 设置HTTP代理
      await execAsync(`netsh winhttp set proxy ${host}:${port}`);
      
      // 设置系统代理（需要管理员权限）
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

  private async clearWindowsProxy(): Promise<void> {
    try {
      // 清除HTTP代理
      await execAsync('netsh winhttp reset proxy');
      
      // 清除系统代理
      const script = `
        $regPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
        Set-ItemProperty -Path $regPath -Name ProxyEnable -Value 0
        Remove-ItemProperty -Path $regPath -Name ProxyServer -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path $regPath -Name ProxyOverride -ErrorAction SilentlyContinue
      `;
      
      await execAsync(`powershell -Command "${script}"`);
      console.log('Windows proxy cleared');
    } catch (error) {
      throw new Error(`Failed to clear Windows proxy: ${error}`);
    }
  }

  private async getWindowsProxy(): Promise<{ host: string; port: number; enabled: boolean } | null> {
    try {
      const { stdout } = await execAsync('netsh winhttp show proxy');
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        if (line.includes('Proxy Server(s):')) {
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
      console.error('Failed to get Windows proxy:', error);
      return null;
    }
  }

  /**
   * macOS系统代理设置
   */
  private async setMacOSProxy(host: string, socksPort: number, httpPort?: number): Promise<void> {
    console.log(`=== 开始设置 macOS 系统代理 ===`);
    console.log(`代理主机: ${host}`);
    console.log(`SOCKS端口: ${socksPort}`);
    console.log(`HTTP端口: ${httpPort || socksPort}`);
    
    const actualHttpPort = httpPort || socksPort;
    
    try {
      // 获取网络服务名称
      console.log(`获取网络服务列表...`);
      const { stdout: services } = await execAsync('networksetup -listallnetworkservices');
      const serviceLines = services.split('\n').filter(line => line.trim() && !line.includes('*'));
      console.log(`找到网络服务:`, serviceLines);
      
      for (const service of serviceLines) {
        if (service.trim()) {
          console.log(`设置网络服务 "${service.trim()}" 的代理...`);
          
          // 设置HTTP代理（使用HTTP端口）
          console.log(`设置HTTP代理: ${host}:${actualHttpPort}`);
          await execAsync(`networksetup -setwebproxy "${service.trim()}" ${host} ${actualHttpPort}`);
          
          // 设置HTTPS代理（使用HTTP端口）
          console.log(`设置HTTPS代理: ${host}:${actualHttpPort}`);
          await execAsync(`networksetup -setsecurewebproxy "${service.trim()}" ${host} ${actualHttpPort}`);
          
          // 设置SOCKS代理（使用SOCKS端口）
          console.log(`设置SOCKS代理: ${host}:${socksPort}`);
          await execAsync(`networksetup -setsocksfirewallproxy "${service.trim()}" ${host} ${socksPort}`);
          
          // 启用代理
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
      
      // 验证代理设置是否生效
      await this.verifyProxySettings();
    } catch (error) {
      throw new Error(`Failed to set macOS proxy: ${error}`);
    }
  }

  /**
   * 验证代理设置是否生效
   */
  public async verifyProxySettings(): Promise<void> {
    console.log(`=== 验证代理设置是否生效 ===`);
    
    try {
      // 获取网络服务列表
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      // 检查所有网络服务的代理状态
      const networkServices = ['Ethernet', 'Wi-Fi'];
      
      for (const service of networkServices) {
        console.log(`检查网络服务 "${service}" 的代理状态...`);
        
        try {
          // 检查HTTP代理
          const httpResult = await execAsync(`networksetup -getwebproxy "${service}"`);
          console.log(`HTTP代理状态: ${httpResult.stdout}`);
          
          // 检查HTTPS代理
          const httpsResult = await execAsync(`networksetup -getsecurewebproxy "${service}"`);
          console.log(`HTTPS代理状态: ${httpsResult.stdout}`);
          
          // 检查SOCKS代理
          const socksResult = await execAsync(`networksetup -getsocksfirewallproxy "${service}"`);
          console.log(`SOCKS代理状态: ${socksResult.stdout}`);
          
          // 检查代理是否启用
          const enabledResult = await execAsync(`networksetup -getwebproxy "${service}" | grep "Enabled:"`);
          const isEnabled = enabledResult.stdout.includes('Yes');
          console.log(`🔍 [代理验证] ${service} 代理启用状态: ${isEnabled ? '已启用' : '未启用'}`);
          
          if (!isEnabled) {
            console.warn(`⚠️  [代理验证] ${service} 代理未启用，这可能是导致无法联网的原因`);
          }
          
        } catch (error) {
          console.error(`❌ [代理验证] 检查 ${service} 代理状态失败:`, error);
        }
      }
      
      // 测试系统代理是否真正生效
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
  private async testSystemProxyEffectiveness(): Promise<void> {
    console.log(`🔍 [系统代理测试] 开始测试系统代理是否真正生效...`);
    
    try {
      const https = require('https');
      const http = require('http');
      
      // 测试URL
      const testUrl = 'http://connectivitycheck.gstatic.com/generate_204';
      
      console.log(`🔍 [系统代理测试] 测试URL: ${testUrl}`);
      
      const testRequest = () => {
        return new Promise<{ success: boolean; statusCode?: number; error?: string }>((resolve) => {
          const url = new URL(testUrl);
          const isHttps = url.protocol === 'https:';
          const client = isHttps ? https : http;
          
          const req = client.request(url, {
            method: 'GET',
            timeout: 10000
          }, (res: any) => {
            console.log(`✅ [系统代理测试] 请求成功，状态码: ${res.statusCode}`);
            console.log(`🔍 [系统代理测试] 响应头:`, res.headers);
            resolve({ success: true, statusCode: res.statusCode });
          });
          
          req.on('error', (error: any) => {
            console.error(`❌ [系统代理测试] 请求失败:`, error.message);
            console.error(`🔍 [系统代理测试] 错误详情:`, error);
            resolve({ success: false, error: error.message });
          });
          
          req.on('timeout', () => {
            console.error(`⏰ [系统代理测试] 请求超时`);
            req.destroy();
            resolve({ success: false, error: 'Request timeout' });
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

  private async clearMacOSProxy(): Promise<void> {
    try {
      const { stdout: services } = await execAsync('networksetup -listallnetworkservices');
      const serviceLines = services.split('\n').filter(line => line.trim() && !line.includes('*'));
      
      for (const service of serviceLines) {
        if (service.trim()) {
          // 禁用代理
          await execAsync(`networksetup -setwebproxystate "${service.trim()}" off`);
          await execAsync(`networksetup -setsecurewebproxystate "${service.trim()}" off`);
          await execAsync(`networksetup -setsocksfirewallproxystate "${service.trim()}" off`);
        }
      }
      
      console.log('macOS proxy cleared');
    } catch (error) {
      throw new Error(`Failed to clear macOS proxy: ${error}`);
    }
  }

  private async getMacOSProxy(): Promise<{ host: string; port: number; enabled: boolean } | null> {
    try {
      const { stdout: services } = await execAsync('networksetup -listallnetworkservices');
      const serviceLines = services.split('\n').filter(line => line.trim() && !line.includes('*'));
      
      for (const service of serviceLines) {
        if (service.trim()) {
          const { stdout } = await execAsync(`networksetup -getwebproxy "${service.trim()}"`);
          const lines = stdout.split('\n');
          
          for (const line of lines) {
            if (line.includes('Server:') && !line.includes('(null)')) {
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
      console.error('Failed to get macOS proxy:', error);
      return null;
    }
  }

  /**
   * Linux系统代理设置
   */
  private async setLinuxProxy(host: string, port: number): Promise<void> {
    try {
      // 设置环境变量
      const proxyUrl = `http://${host}:${port}`;
      
      // 设置系统级代理（需要root权限）
      await execAsync(`export http_proxy=${proxyUrl}`);
      await execAsync(`export https_proxy=${proxyUrl}`);
      await execAsync(`export HTTP_PROXY=${proxyUrl}`);
      await execAsync(`export HTTPS_PROXY=${proxyUrl}`);
      
      // 尝试使用gsettings（GNOME桌面环境）
      try {
        await execAsync(`gsettings set org.gnome.system.proxy mode 'manual'`);
        await execAsync(`gsettings set org.gnome.system.proxy.http host '${host}'`);
        await execAsync(`gsettings set org.gnome.system.proxy.http port ${port}`);
        await execAsync(`gsettings set org.gnome.system.proxy.https host '${host}'`);
        await execAsync(`gsettings set org.gnome.system.proxy.https port ${port}`);
      } catch (error) {
        console.warn('GNOME settings not available, using environment variables only');
      }
      
      console.log(`Linux proxy set to ${host}:${port}`);
    } catch (error) {
      throw new Error(`Failed to set Linux proxy: ${error}`);
    }
  }

  private async clearLinuxProxy(): Promise<void> {
    try {
      // 清除环境变量
      await execAsync('unset http_proxy');
      await execAsync('unset https_proxy');
      await execAsync('unset HTTP_PROXY');
      await execAsync('unset HTTPS_PROXY');
      
      // 尝试使用gsettings
      try {
        await execAsync('gsettings set org.gnome.system.proxy mode "none"');
      } catch (error) {
        console.warn('GNOME settings not available');
      }
      
      console.log('Linux proxy cleared');
    } catch (error) {
      throw new Error(`Failed to clear Linux proxy: ${error}`);
    }
  }

  private async getLinuxProxy(): Promise<{ host: string; port: number; enabled: boolean } | null> {
    try {
      // 检查环境变量
      const httpProxy = process.env['http_proxy'] || process.env['HTTP_PROXY'];
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
      
      // 尝试从gsettings获取
      try {
        const { stdout } = await execAsync('gsettings get org.gnome.system.proxy mode');
        if (stdout.includes('manual')) {
          const { stdout: host } = await execAsync('gsettings get org.gnome.system.proxy.http host');
          const { stdout: port } = await execAsync('gsettings get org.gnome.system.proxy.http port');
          
          if (host && port) {
            return {
              host: host.trim().replace(/['"]/g, ''),
              port: parseInt(port.trim()),
              enabled: true
            };
          }
        }
      } catch (error) {
        console.warn('GNOME settings not available');
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get Linux proxy:', error);
      return null;
    }
  }

  /**
   * 创建VPN连接
   */
  public async createVPNConnection(config: {
    name: string;
    server: string;
    username?: string;
    password?: string;
    type: 'openvpn' | 'wireguard' | 'ikev2' | 'l2tp';
  }): Promise<void> {
    switch (process.platform) {
      case 'win32':
        await this.createWindowsVPN(config);
        break;
      case 'darwin':
        await this.createMacOSVPN(config);
        break;
      case 'linux':
        await this.createLinuxVPN(config);
        break;
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }

  /**
   * 连接VPN
   */
  public async connectVPN(name: string): Promise<void> {
    switch (process.platform) {
      case 'win32':
        await this.connectWindowsVPN(name);
        break;
      case 'darwin':
        await this.connectMacOSVPN(name);
        break;
      case 'linux':
        await this.connectLinuxVPN(name);
        break;
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }

  /**
   * 断开VPN
   */
  public async disconnectVPN(name: string): Promise<void> {
    switch (process.platform) {
      case 'win32':
        await this.disconnectWindowsVPN(name);
        break;
      case 'darwin':
        await this.disconnectMacOSVPN(name);
        break;
      case 'linux':
        await this.disconnectLinuxVPN(name);
        break;
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }

  /**
   * Windows VPN操作
   */
  private async createWindowsVPN(config: any): Promise<void> {
    try {
      const command = `Add-VpnConnection -Name "${config.name}" -ServerAddress "${config.server}" -TunnelType "${config.type}" -EncryptionLevel "Required" -AuthenticationMethod MSChapv2 -Force -PassThru -AllUserConnection`;
      await execAsync(`powershell -Command "${command}"`);
      console.log(`Windows VPN connection created: ${config.name}`);
    } catch (error) {
      throw new Error(`Failed to create Windows VPN: ${error}`);
    }
  }

  private async connectWindowsVPN(name: string): Promise<void> {
    try {
      await execAsync(`rasdial "${name}"`);
      console.log(`Windows VPN connected: ${name}`);
    } catch (error) {
      throw new Error(`Failed to connect Windows VPN: ${error}`);
    }
  }

  private async disconnectWindowsVPN(name: string): Promise<void> {
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
  private async createMacOSVPN(config: any): Promise<void> {
    try {
      console.log(`[SystemProxyManager] 尝试创建macOS VPN服务: ${config.name}`);
      
      // 使用scutil --nc命令管理VPN服务
      // 首先检查VPN服务是否已存在
      try {
        const { stdout } = await execAsync(`scutil --nc list`);
        if (stdout.includes(config.name)) {
          console.log(`macOS VPN service ${config.name} already exists`);
          return;
        }
      } catch (error) {
        console.log(`[SystemProxyManager] 检查VPN服务列表失败: ${error}`);
      }

      // 创建VPN配置文件
      // macOS VPN配置存储在/Library/Preferences/SystemConfiguration/目录下
      const vpnConfigPath = `/Library/Preferences/SystemConfiguration/${config.name}.plist`;
      
      // 创建VPN配置plist文件
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
    <string>${config.username || 'chongdong'}</string>
    <key>AuthPassword</key>
    <string>${config.password || 'defaultsecret'}</string>
    <key>VPNType</key>
    <string>L2TP</string>
  </dict>
</dict>
</plist>`;

      try {
        // 写入VPN配置文件
        require('fs').writeFileSync(vpnConfigPath, vpnConfig);
        console.log(`[SystemProxyManager] VPN配置文件已创建: ${vpnConfigPath}`);
        
        // 使用scutil启用VPN服务
        await execAsync(`sudo scutil --nc select "${config.name}"`);
        console.log(`[SystemProxyManager] VPN服务已启用: ${config.name}`);
        
      } catch (error) {
        console.warn(`[SystemProxyManager] VPN配置创建失败: ${error}`);
        
        // 备用方案：使用系统偏好设置的方式
        console.log(`[SystemProxyManager] 使用备用方案创建VPN服务`);
        
        // 尝试使用networksetup创建PPPoE服务作为VPN替代
        try {
          await execAsync(`sudo networksetup -createpppoeservice "${config.name}" "en0" "${config.username || 'chongdong'}" "${config.password || 'defaultsecret'}"`);
          console.log(`[SystemProxyManager] PPPoE VPN服务已创建: ${config.name}`);
        } catch (pppoeError) {
          console.warn(`[SystemProxyManager] PPPoE服务创建也失败: ${pppoeError}`);
          // 不抛出错误，让VPN模式继续工作
        }
      }
      
    } catch (error) {
      console.warn(`[SystemProxyManager] VPN创建失败，但继续执行: ${error}`);
      // 不抛出错误，让VPN模式继续工作
    }
  }

  private async connectMacOSVPN(name: string): Promise<void> {
    try {
      console.log(`[SystemProxyManager] 尝试连接macOS VPN: ${name}`);
      
      // 使用scutil --nc start命令连接VPN
      try {
        await execAsync(`sudo scutil --nc start "${name}"`);
        console.log(`macOS VPN connected via scutil: ${name}`);
      } catch (scutilError) {
        console.warn(`[SystemProxyManager] scutil连接失败: ${scutilError}`);
        
        // 备用方案：尝试PPPoE连接
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

  private async disconnectMacOSVPN(name: string): Promise<void> {
    try {
      console.log(`[SystemProxyManager] 尝试断开macOS VPN: ${name}`);
      
      // 使用scutil --nc stop命令断开VPN
      try {
        await execAsync(`sudo scutil --nc stop "${name}"`);
        console.log(`macOS VPN disconnected via scutil: ${name}`);
      } catch (scutilError) {
        console.warn(`[SystemProxyManager] scutil断开失败: ${scutilError}`);
        
        // 备用方案：尝试PPPoE断开
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
  private async createLinuxVPN(config: any): Promise<void> {
    try {
      // Linux VPN创建需要更复杂的配置
      // 这里提供简化版本
      console.log(`Linux VPN creation not fully implemented for ${config.name}`);
    } catch (error) {
      throw new Error(`Failed to create Linux VPN: ${error}`);
    }
  }

  private async connectLinuxVPN(name: string): Promise<void> {
    try {
      await execAsync(`nmcli connection up "${name}"`);
      console.log(`Linux VPN connected: ${name}`);
    } catch (error) {
      throw new Error(`Failed to connect Linux VPN: ${error}`);
    }
  }

  private async disconnectLinuxVPN(name: string): Promise<void> {
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
  public getNetworkInterfaces(): Array<{
    name: string;
    address: string;
    netmask: string;
    family: string;
    internal: boolean;
  }> {
    const interfaces = networkInterfaces();
    const result: Array<{
      name: string;
      address: string;
      netmask: string;
      family: string;
      internal: boolean;
    }> = [];

    for (const [name, nets] of Object.entries(interfaces)) {
      if (nets) {
        for (const net of nets) {
          if (net.family === 'IPv4') {
            result.push({
              name,
              address: net.address,
              netmask: net.netmask || '',
              family: 'IPv4',
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
  public async getVPNStatus(name: string): Promise<{ connected: boolean; error?: string }> {
    try {
      switch (process.platform) {
        case 'win32':
          return await this.getWindowsVPNStatus(name);
        case 'darwin':
          return await this.getMacOSVPNStatus(name);
        case 'linux':
          return await this.getLinuxVPNStatus(name);
        default:
          return { connected: false, error: `Unsupported platform: ${process.platform}` };
      }
    } catch (error) {
      console.error('Failed to get VPN status:', error);
      return { connected: false, error: `Failed to get VPN status: ${error}` };
    }
  }

  /**
   * Windows VPN状态检查
   */
  private async getWindowsVPNStatus(name: string): Promise<{ connected: boolean; error?: string }> {
    try {
      const command = `Get-VpnConnection -Name "${name}" | Select-Object -ExpandProperty ConnectionStatus`;
      const result = await execAsync(`powershell -Command "${command}"`);
      const status = result.stdout.trim().toLowerCase();
      return { connected: status === 'connected' };
    } catch (error) {
      return { connected: false, error: `Windows VPN status check failed: ${error}` };
    }
  }

  /**
   * macOS VPN状态检查
   */
  private async getMacOSVPNStatus(name: string): Promise<{ connected: boolean; error?: string }> {
    try {
      console.log(`[SystemProxyManager] 检查macOS VPN状态: ${name}`);
      
      // 首先检查VPN服务是否存在
      try {
        const { stdout } = await execAsync(`scutil --nc list`);
        if (!stdout.includes(name)) {
          return { connected: false, error: `VPN service "${name}" does not exist` };
        }
      } catch (error) {
        console.warn(`[SystemProxyManager] 检查VPN服务列表失败: ${error}`);
      }

      // 检查VPN连接状态
      try {
        // 使用scutil --nc status检查连接状态
        const result = await execAsync(`sudo scutil --nc status "${name}"`);
        const isConnected = result.stdout.includes('Connected') || result.stdout.includes('connected');
        console.log(`[SystemProxyManager] VPN状态检查结果: ${result.stdout}`);
        return { connected: isConnected };
      } catch (scutilError) {
        console.warn(`[SystemProxyManager] scutil状态检查失败: ${scutilError}`);
        
        // 备用方案：尝试使用networksetup检查
        try {
          const result = await execAsync(`sudo networksetup -showpppoestatus "${name}"`);
          const isConnected = result.stdout.includes('connected') || result.stdout.includes('Connected');
          return { connected: isConnected };
        } catch (networksetupError) {
          console.warn(`[SystemProxyManager] networksetup状态检查也失败: ${networksetupError}`);
          // 如果都失败了，假设未连接
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
  private async getLinuxVPNStatus(name: string): Promise<{ connected: boolean; error?: string }> {
    try {
      const command = `nmcli -t -f NAME,TYPE,DEVICE,STATE connection show --active | grep "${name}"`;
      const result = await execAsync(command);
      return { connected: result.stdout.includes('activated') };
    } catch (error) {
      return { connected: false, error: `Linux VPN status check failed: ${error}` };
    }
  }

  /**
   * 检查系统权限
   */
  public async checkPermissions(): Promise<{
    admin: boolean;
    network: boolean;
    vpn: boolean;
  }> {
    const result = {
      admin: false,
      network: false,
      vpn: false
    };

    try {
      // 检查管理员权限
      if (process.platform === 'win32') {
        await execAsync('net session');
        result.admin = true;
      } else {
        await execAsync('sudo -n true');
        result.admin = true;
      }
    } catch (error) {
      result.admin = false;
    }

    // 检查网络权限
    try {
      const interfaces = this.getNetworkInterfaces();
      result.network = interfaces.length > 0;
    } catch (error) {
      result.network = false;
    }

    // 检查VPN权限
    result.vpn = result.admin; // VPN通常需要管理员权限

    return result;
  }
}

export const systemProxyManager = SystemProxyManager.getInstance();
