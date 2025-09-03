import { createServer, Socket, Server } from 'net';

class CompatPortForwarderClass {
  private static instance: CompatPortForwarderClass;
  private servers: Map<number, Server> = new Map();

  public static getInstance(): CompatPortForwarderClass {
    if (!CompatPortForwarderClass.instance) {
      CompatPortForwarderClass.instance = new CompatPortForwarderClass();
    }
    return CompatPortForwarderClass.instance;
  }

  public async start(localPort: number, targetHost: string, targetPort: number): Promise<void> {
    await this.stop(localPort).catch(() => {});
    const server = createServer((client: Socket) => {
      const upstream = new Socket();
      upstream.connect(targetPort, targetHost, () => {
        client.pipe(upstream).pipe(client);
      });
      upstream.on('error', () => {
        try { client.destroy(); } catch (_) {}
      });
      client.on('error', () => {
        try { upstream.destroy(); } catch (_) {}
      });
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(localPort, '127.0.0.1', () => {
        server.removeListener('error', reject as any);
        resolve();
      });
    });
    this.servers.set(localPort, server);
    console.log(`[CompatPortForwarder] 监听 127.0.0.1:${localPort} -> ${targetHost}:${targetPort}`);
  }

  public async stop(localPort: number): Promise<void> {
    const server = this.servers.get(localPort);
    if (!server) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    this.servers.delete(localPort);
    console.log(`[CompatPortForwarder] 已停止 127.0.0.1:${localPort}`);
  }

  public async stopAll(): Promise<void> {
    const ports = Array.from(this.servers.keys());
    for (const p of ports) {
      await this.stop(p).catch(() => {});
    }
  }
}

export const CompatPortForwarder = CompatPortForwarderClass.getInstance();


