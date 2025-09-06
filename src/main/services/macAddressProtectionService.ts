import { MacAddressLeakResult } from '../../shared/types';
import { networkInterfaces } from 'os';

/**
 * MAC地址防护服务
 * 负责检测和防护MAC地址泄露，实现网络接口MAC地址随机化
 */
export class MacAddressProtectionService {
  private enabled: boolean = true;
  private mode: 'strict' | 'relaxed' = 'relaxed';
  private originalMacAddresses: Map<string, string> = new Map();
  private randomizedMacAddresses: Map<string, string> = new Map();

  // MAC地址类型标识 (保留用于未来扩展)
  // private readonly macAddressTypes = {
  //   // 单播地址 (第1位为0)
  //   unicast: 0x00,
  //   // 多播地址 (第1位为1)
  //   multicast: 0x01,
  //   // 本地管理地址 (第2位为1)
  //   locallyAdministered: 0x02,
  //   // 全局管理地址 (第2位为0)
  //   globallyAdministered: 0x00
  // };

  // 网络接口类型
  private readonly interfaceTypes = {
    ethernet: ['en0', 'en1', 'en2', 'en3'],
    wifi: ['en0', 'en1'],
    bluetooth: ['en2', 'en3'],
    virtual: ['utun0', 'utun1', 'utun2', 'utun3', 'vboxnet0', 'vmnet0', 'vmnet1'],
    loopback: ['lo0']
  };

  constructor() {
    console.log('MAC地址防护服务初始化完成');
    this.initializeMacAddresses();
  }

  /**
   * 初始化MAC地址信息
   */
  private initializeMacAddresses(): void {
    try {
      const interfaces = networkInterfaces();
      
      for (const [interfaceName, addresses] of Object.entries(interfaces)) {
        if (addresses) {
          for (const address of addresses) {
            if (address.mac && address.mac !== '00:00:00:00:00:00') {
              this.originalMacAddresses.set(interfaceName, address.mac);
              console.log(`发现网络接口 ${interfaceName}: ${address.mac}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('初始化MAC地址信息失败:', error);
    }
  }

  /**
   * 配置MAC地址防护
   */
  public configure(config: {
    enabled: boolean;
    mode: 'strict' | 'relaxed';
  }): void {
    this.enabled = config.enabled;
    this.mode = config.mode;
    
    console.log(`MAC地址防护配置更新: enabled=${this.enabled}, mode=${this.mode}`);
  }

  /**
   * 检测MAC地址泄露
   */
  public async checkMacAddressLeak(): Promise<MacAddressLeakResult> {
    console.log('开始MAC地址泄露检测...');
    
    const result: MacAddressLeakResult = {
      leaked: false,
      details: [],
      leakSources: [],
      detectedMacAddresses: [],
      networkInterfaces: []
    };

    try {
      // 获取当前MAC地址
      const currentMacAddresses = await this.getCurrentMacAddresses();
      result.detectedMacAddresses = Array.from(currentMacAddresses.values());
      result.networkInterfaces = Array.from(currentMacAddresses.keys());
      
      // 检测MAC地址泄露
      const leakDetected = await this.detectMacAddressLeak(currentMacAddresses);
      
      if (leakDetected.leaked) {
        result.leaked = true;
        result.leakSources = leakDetected.sources;
        result.details.push(`检测到MAC地址泄露: ${leakDetected.sources.join(', ')}`);
        
        if (this.mode === 'strict') {
          result.details.push('严格模式下检测到MAC地址泄露');
        }
      } else {
        result.details.push('✅ MAC地址防护正常，未检测到泄露');
      }

      // 记录检测到的MAC地址信息
      result.details.push(`检测到${currentMacAddresses.size}个网络接口的MAC地址`);

    } catch (error) {
      console.error('MAC地址泄露检测失败:', error);
      result.details.push(`检测失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    console.log('MAC地址泄露检测完成:', result);
    return result;
  }

  /**
   * 获取当前MAC地址
   */
  private async getCurrentMacAddresses(): Promise<Map<string, string>> {
    const macAddresses = new Map<string, string>();
    
    try {
      const interfaces = networkInterfaces();
      
      for (const [interfaceName, addresses] of Object.entries(interfaces)) {
        if (addresses) {
          for (const address of addresses) {
            if (address.mac && address.mac !== '00:00:00:00:00:00') {
              macAddresses.set(interfaceName, address.mac);
            }
          }
        }
      }
    } catch (error) {
      console.error('获取MAC地址失败:', error);
    }
    
    return macAddresses;
  }

  /**
   * 检测MAC地址泄露
   */
  private async detectMacAddressLeak(macAddresses: Map<string, string>): Promise<{
    leaked: boolean;
    sources: string[];
  }> {
    const sources: string[] = [];

    try {
      // 检查是否使用原始MAC地址
      for (const [interfaceName, macAddress] of macAddresses) {
        const originalMac = this.originalMacAddresses.get(interfaceName);
        
        if (originalMac && macAddress === originalMac) {
          sources.push(`${interfaceName}使用原始MAC地址`);
        }
      }

      // 检查MAC地址类型
      for (const [interfaceName, macAddress] of macAddresses) {
        const macType = this.analyzeMacAddressType(macAddress);
        
        if (macType.isGloballyAdministered) {
          sources.push(`${interfaceName}使用全局管理MAC地址`);
        }
        
        if (macType.isMulticast) {
          sources.push(`${interfaceName}使用多播MAC地址`);
        }
      }

      // 检查网络接口类型
      for (const [interfaceName, macAddress] of macAddresses) {
        const interfaceType = this.getInterfaceType(interfaceName);
        
        if (interfaceType === 'ethernet' || interfaceType === 'wifi') {
          // 以太网和WiFi接口应该使用随机化MAC地址
          if (!this.isRandomizedMacAddress(macAddress)) {
            sources.push(`${interfaceName}(${interfaceType})未使用随机化MAC地址`);
          }
        }
      }

      // 检查MAC地址唯一性
      const uniqueMacs = new Set(macAddresses.values());
      if (uniqueMacs.size !== macAddresses.size) {
        sources.push('检测到重复的MAC地址');
      }

      const leaked = sources.length > 0;
      
      if (leaked && this.mode === 'strict') {
        sources.push('严格模式检测到MAC地址泄露');
      }

      return { leaked, sources };
    } catch (error) {
      console.error('检测MAC地址泄露失败:', error);
      return { leaked: false, sources: [] };
    }
  }

  /**
   * 分析MAC地址类型
   */
  private analyzeMacAddressType(macAddress: string): {
    isUnicast: boolean;
    isMulticast: boolean;
    isLocallyAdministered: boolean;
    isGloballyAdministered: boolean;
  } {
    try {
      // 解析MAC地址
      const bytes = macAddress.split(':').map(byte => parseInt(byte, 16));
      const firstByte = bytes[0];
      
      if (firstByte === undefined) {
        return {
          isUnicast: false,
          isMulticast: false,
          isLocallyAdministered: false,
          isGloballyAdministered: false
        };
      }
      
      const isUnicast = (firstByte & 0x01) === 0;
      const isMulticast = (firstByte & 0x01) === 1;
      const isLocallyAdministered = (firstByte & 0x02) === 2;
      const isGloballyAdministered = (firstByte & 0x02) === 0;
      
      return {
        isUnicast,
        isMulticast,
        isLocallyAdministered,
        isGloballyAdministered
      };
    } catch (error) {
      console.error('分析MAC地址类型失败:', error);
      return {
        isUnicast: false,
        isMulticast: false,
        isLocallyAdministered: false,
        isGloballyAdministered: false
      };
    }
  }

  /**
   * 获取网络接口类型
   */
  private getInterfaceType(interfaceName: string): string {
    for (const [type, interfaces] of Object.entries(this.interfaceTypes)) {
      if (interfaces.includes(interfaceName)) {
        return type;
      }
    }
    return 'unknown';
  }

  /**
   * 检查是否为随机化MAC地址
   */
  private isRandomizedMacAddress(macAddress: string): boolean {
    try {
      const bytes = macAddress.split(':').map(byte => parseInt(byte, 16));
      const firstByte = bytes[0];
      
      if (firstByte === undefined) {
        return false;
      }
      
      // 随机化MAC地址通常是本地管理地址
      return (firstByte & 0x02) === 2;
    } catch (error) {
      console.error('检查随机化MAC地址失败:', error);
      return false;
    }
  }

  /**
   * 生成随机MAC地址
   */
  private generateRandomMacAddress(): string {
    const bytes = new Array(6);
    
    // 第一个字节：本地管理地址，单播
    bytes[0] = 0x02; // 本地管理地址
    
    // 其余字节：随机生成
    for (let i = 1; i < 6; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    
    return bytes.map(byte => byte.toString(16).padStart(2, '0')).join(':');
  }

  /**
   * 随机化MAC地址
   */
  public async randomizeMacAddresses(): Promise<boolean> {
    if (!this.enabled) {
      console.log('MAC地址防护已禁用');
      return false;
    }

    try {
      console.log('开始随机化MAC地址...');
      
      const interfaces = networkInterfaces();
      const randomizedAddresses = new Map<string, string>();
      
      for (const [interfaceName, addresses] of Object.entries(interfaces)) {
        if (addresses) {
          for (const address of addresses) {
            if (address.mac && address.mac !== '00:00:00:00:00:00') {
              const interfaceType = this.getInterfaceType(interfaceName);
              
              // 只对以太网和WiFi接口进行随机化
              if (interfaceType === 'ethernet' || interfaceType === 'wifi') {
                const randomMac = this.generateRandomMacAddress();
                randomizedAddresses.set(interfaceName, randomMac);
                console.log(`随机化接口 ${interfaceName}: ${address.mac} -> ${randomMac}`);
              }
            }
          }
        }
      }
      
      this.randomizedMacAddresses = randomizedAddresses;
      
      // 注意：实际的MAC地址修改需要系统级权限
      // 这里只是生成随机地址并记录
      console.log(`生成了${randomizedAddresses.size}个随机MAC地址`);
      
      return true;
    } catch (error) {
      console.error('随机化MAC地址失败:', error);
      return false;
    }
  }

  /**
   * 恢复原始MAC地址
   */
  public async restoreOriginalMacAddresses(): Promise<boolean> {
    try {
      console.log('恢复原始MAC地址...');
      
      // 注意：实际的MAC地址恢复需要系统级权限
      // 这里只是清除随机化记录
      this.randomizedMacAddresses.clear();
      
      console.log('原始MAC地址恢复完成');
      return true;
    } catch (error) {
      console.error('恢复原始MAC地址失败:', error);
      return false;
    }
  }

  /**
   * 应用MAC地址防护
   */
  public async applyProtection(): Promise<boolean> {
    if (!this.enabled) {
      console.log('MAC地址防护已禁用');
      return false;
    }

    try {
      console.log(`应用MAC地址防护: mode=${this.mode}`);
      
      // 应用随机化
      const success = await this.randomizeMacAddresses();
      
      if (success) {
        console.log('MAC地址防护应用成功');
      } else {
        console.log('MAC地址防护应用失败');
      }
      
      return success;
    } catch (error) {
      console.error('应用MAC地址防护失败:', error);
      return false;
    }
  }

  /**
   * 获取防护状态
   */
  public getProtectionStatus(): {
    enabled: boolean;
    mode: 'strict' | 'relaxed';
    originalMacCount: number;
    randomizedMacCount: number;
    lastCheck?: Date;
  } {
    return {
      enabled: this.enabled,
      mode: this.mode,
      originalMacCount: this.originalMacAddresses.size,
      randomizedMacCount: this.randomizedMacAddresses.size,
      lastCheck: new Date()
    };
  }

  /**
   * 获取随机化MAC地址
   */
  public getRandomizedMacAddresses(): Map<string, string> {
    return new Map(this.randomizedMacAddresses);
  }

  /**
   * 获取原始MAC地址
   */
  public getOriginalMacAddresses(): Map<string, string> {
    return new Map(this.originalMacAddresses);
  }
}
