import { readFileSync } from 'fs';
import { join } from 'path';
import { DefaultSettings } from './defaultSettings';

const source = (relativePath: string): string =>
  readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('trusted network security controls', () => {
  it('uses encrypted DNS defaults without a self-referential resolver', () => {
    const settings = DefaultSettings.getDefaultAppSettings();
    expect(settings.enableDoh).toBe(true);
    expect(settings.dohServer).toMatch(/^https:\/\//);
    expect(settings.dnsServer).not.toMatch(/^127\./);
  });

  it('keeps renderer IPC on an explicit capability allowlist', () => {
    const preload = source('src/preload/index.ts');
    expect(preload).toContain("'chains:save'");
    expect(preload).toContain("'network:getStatus'");
    expect(preload).not.toContain("'network:setRoutes'");
    expect(preload).not.toContain("'network:setDNS'");
  });

  it('does not disable TLS certificate verification', () => {
    const files = [
      'src/main/index.ts',
      'src/main/chainStatusManager.ts',
      'src/main/services/dnsService.ts',
      'src/main/services/geolocationLeakTester.ts',
      'src/renderer/utils/chainIPDetector.ts'
    ];
    for (const file of files) {
      expect(source(file)).not.toContain('rejectUnauthorized: false');
    }
  });

  it('requires official tun2socks device syntax and verified route capture', () => {
    const controller = source('src/main/tunController.ts');
    const modeManager = source('src/main/proxyModeManager.ts');
    expect(controller).toContain("'--device', `tun://${tunName}`");
    expect(controller).not.toContain("args.push('--udp')");
    expect(controller).not.toContain("args.push('--dns-addr'");
    expect(modeManager).toContain('TunController.verifyTrafficCapture(tunName)');
  });

  it('verifies release checksums before extracting a core', () => {
    const downloader = source('src/main/coreDownloader.ts');
    const checksumIndex = downloader.indexOf('const checksum = await this.calculateSha256(downloadPath)');
    const extractIndex = downloader.indexOf('await this.extractFile(downloadPath');
    expect(checksumIndex).toBeGreaterThan(-1);
    expect(extractIndex).toBeGreaterThan(checksumIndex);
    expect(downloader).toContain('压缩包包含不安全路径');
  });

  it('never renders an unverified leak check as a green pass', () => {
    const settingsPage = source('src/renderer/pages/Settings.tsx');
    expect(settingsPage).not.toContain('hasLeak');
    expect(settingsPage).toContain("result.verified !== true");
    expect(settingsPage).toContain("text: '缺少出口证据'");
    expect(settingsPage).toContain('allLeakCheckResult.http2Protection');
  });

  it('keeps raw MAC addresses out of logs and renderer IPC results', () => {
    const macService = source('src/main/services/macAddressProtectionService.ts');
    expect(macService).not.toContain('${interfaceName}: ${address.mac}');
    expect(macService).toContain('result.detectedMacAddresses = []');
    expect(macService).toContain('未实现可验证的操作系统级 MAC 地址随机化');
  });

  it('fails closed instead of bypassing a selected trust path', () => {
    const router = source('src/main/trafficRouter.ts');
    const edgeClient = source('src/main/services/cfEdgeClient.ts');
    expect(router).not.toContain('fallback local chain');
    expect(router).not.toContain('已降级为透明转发');
    expect(router).toContain('已拒绝绕过所选路径');
    expect(edgeClient).toContain("endpoint.protocol !== 'https:'");
    expect(edgeClient).toContain('CF Edge PSK 未配置或长度不足');
  });

  it('sends decoy traffic only through the trusted loopback entry', () => {
    const decoy = source('src/main/services/trafficDecoyService.ts');
    expect(decoy).not.toContain("import https from 'https'");
    expect(decoy).toContain("proxy: { host: '127.0.0.1', port: socksPort, type: 5 }");
    expect(decoy).toContain('rejectUnauthorized: true');
  });

  it('rejects empty chains and certificate-insecure core configs', () => {
    const generator = source('src/main/proxyChainConfigGenerator.ts');
    const exporter = source('src/renderer/utils/configExporter.ts');
    const engine = source('src/renderer/utils/proxyEngine.ts');
    const main = source('src/main/index.ts');
    expect(generator).toContain('拒绝生成直连回退配置');
    expect(generator).not.toContain('insecure: true');
    expect(exporter).not.toContain('insecure: true');
    expect(exporter).not.toContain("'skip-cert-verify': true");
    expect(engine).not.toContain('insecure: outbound.allowInsecure');
    expect(main).not.toContain('insecure: (best as any).allowInsecure');
  });

  it('validates mutable routing data before replacing the local copy', () => {
    const cidrManager = source('src/main/services/cnCidrManager.ts');
    expect(cidrManager).toContain('CN CIDR 列表条目过少');
    expect(cidrManager).toContain('CN CIDR 列表格式校验失败');
    expect(cidrManager).toContain('mode: 0o600');
  });

  it('authenticates loopback control APIs and keeps connection metadata out of logs', () => {
    const auth = source('src/main/internalApiAuth.ts');
    const manager = source('src/main/proxyManager.ts');
    const adapter = source('src/main/protocolAdapter.ts');
    const rendererEngine = source('src/renderer/utils/proxyEngine.ts');
    expect(auth).toContain('randomBytes(32)');
    expect(auth).toContain('内部控制 API 只允许监听有效的回环地址与端口');
    expect(manager).toContain('Authorization: `Bearer ${internalApiSecret}`');
    expect(adapter).toContain('Authorization: `Bearer ${internalApiSecret}`');
    expect(manager).not.toContain("console.log('Sing-box API响应:', { connectionsData })");
    expect(rendererEngine).not.toContain("'secret': ''");
    expect(rendererEngine).not.toContain("listen: '0.0.0.0:53'");
  });
});
