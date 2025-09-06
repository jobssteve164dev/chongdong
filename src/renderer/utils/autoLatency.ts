import { Storage, STORAGE_KEYS } from './storage';
import { DefaultSettings } from './defaultSettings';
import { useNodeStore } from './stores';
import { latencyTester } from './latencyTester';

class AutoLatencyScheduler {
  private timer: any = null;

  public start(): void {
    try {
      this.stop();

      const settings = Storage.get(STORAGE_KEYS.SETTINGS, DefaultSettings.getDefaultAppSettings()) || DefaultSettings.getDefaultAppSettings();
      if (!settings.enableAutoLatencyTest) {
        return;
      }

      const intervalMinutes = settings.latencyTestInterval || 10; // 默认10分钟
      const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;

      // 立即执行一次
      this.tick(settings).catch(() => {});

      // 周期执行
      this.timer = setInterval(() => {
        this.tick(settings).catch(() => {});
      }, intervalMs);
    } catch (error) {
      console.warn('[AutoLatencyScheduler] start failed:', error);
    }
  }

  public stop(): void {
    if (this.timer) {
      try { clearInterval(this.timer); } catch {}
      this.timer = null;
    }
  }

  public restart(): void {
    this.start();
  }

  private async tick(settings: any): Promise<void> {
    const state = useNodeStore.getState();
    const nodes = state.nodes || [];
    if (!nodes.length) return;

    const validityPeriod = (settings.latencyTestValidityPeriod || 30) * 60 * 1000;
    const nodesToTest = nodes.filter(n => !state.isLatencyValid(n.id, validityPeriod));
    if (nodesToTest.length === 0) return;

    const proxyServers = nodesToTest.map(n => ({
      id: n.id,
      name: n.name,
      protocol: n.type as any,
      host: n.server,
      port: n.port,
      enabled: true,
      uuid: (n as any).uuid,
      password: (n as any).password,
      security: (n as any).security,
      network: (n as any).network,
      wsPath: (n as any).wsPath,
      wsHost: (n as any).wsHost,
    }));

    await latencyTester.testNodesLatencyViaMainProcess(
      proxyServers,
      undefined,
      (nodeId, result) => {
        try {
          const latency = result.success ? result.latency : 0;
          state.setNodeLatency(nodeId, latency, result.timestamp);
          try { window.electron.ipcRenderer.invoke('tray:latencyUpdated').catch(() => {}); } catch {}
        } catch {}
      }
    );
  }
}

export const autoLatency = new AutoLatencyScheduler();


