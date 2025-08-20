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
      await this.verifyProxySettings(serviceLines);
    } catch (error) {
      throw new Error(`Failed to set macOS proxy: ${error}`);
    }
  }

  /**
   * 验证代理设置是否生效
   */
  private async verifyProxySettings(services: string[]): Promise<void> {
    console.log(`=== 验证代理设置是否生效 ===`);
    
    try {
      for (const service of services) {
        if (service.trim()) {
          console.log(`检查网络服务 "${service.trim()}" 的代理状态...`);
          
          // 检查HTTP代理状态
          const { stdout: httpStatus } = await execAsync(`networksetup -getwebproxy "${service.trim()}"`);
          console.log(`HTTP代理状态:`, httpStatus);
          
          // 检查HTTPS代理状态
          const { stdout: httpsStatus } = await execAsync(`networksetup -getsecurewebproxy "${service.trim()}"`);
          console.log(`HTTPS代理状态:`, httpsStatus);
          
          // 检查SOCKS代理状态
          const { stdout: socksStatus } = await execAsync(`networksetup -getsocksfirewallproxy "${service.trim()}"`);
          console.log(`SOCKS代理状态:`, socksStatus);
        }
      }
      
      console.log(`=== 代理设置验证完成 ===`);
    } catch (error) {
      console.error(`代理设置验证失败:`, error);
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
      // macOS VPN创建需要更复杂的配置
      // 这里提供简化版本
      console.log(`macOS VPN creation not fully implemented for ${config.name}`);
    } catch (error) {
      throw new Error(`Failed to create macOS VPN: ${error}`);
    }
  }

  private async connectMacOSVPN(name: string): Promise<void> {
    try {
      await execAsync(`networksetup -connectpppoeservice "${name}"`);
      console.log(`macOS VPN connected: ${name}`);
    } catch (error) {
      throw new Error(`Failed to connect macOS VPN: ${error}`);
    }
  }

  private async disconnectMacOSVPN(name: string): Promise<void> {
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
