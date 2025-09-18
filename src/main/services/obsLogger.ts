export type ObsLevel = 'info' | 'warn' | 'error';

export interface ObsLogEntry {
  timestamp: number;
  component: 'DNS' | 'TUN' | 'VPN' | 'SystemProxy' | 'KillSwitch' | 'IPv6' | 'WebRTC' | 'App';
  level: ObsLevel;
  event: string;
  data?: any;
}

class ObsLoggerClass {
  private buffer: ObsLogEntry[] = [];
  private maxSize = 1000;

  public add(component: ObsLogEntry['component'], level: ObsLevel, event: string, data?: any): void {
    const entry: ObsLogEntry = { timestamp: Date.now(), component, level, event, data };
    this.buffer.push(entry);
    if (this.buffer.length > this.maxSize) this.buffer.shift();
  }

  public getAll(): ObsLogEntry[] {
    return [...this.buffer];
  }

  public clear(): void {
    this.buffer = [];
  }
}

export const obsLogger = new ObsLoggerClass();


