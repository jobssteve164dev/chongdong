/**
 * 通过本地 SOCKS 代理分别使用 HTTP/1.1 与 HTTP/2 访问外部IP服务
 * 验证两种协议下的出口 IP 与地区是否一致
 */

import tls from 'tls';
import http2 from 'http2';

type IpResult = { success: boolean; ip?: string; country?: string; region?: string; city?: string; source: string; error?: string };

function getSocksPort(): number {
  const envPort = Number((process.env as any)['CHONGDONG_SOCKS_PORT'] || (process.env as any)['SOCKS_PORT']);
  if (Number.isFinite(envPort) && envPort > 0) return envPort;
  // 默认端口（与应用默认一致）
  return 7896;
}

async function getSocksSocket(host: string, port: number) {
  const { SocksClient } = require('socks');
  const socksPort = getSocksPort();
  const proxy = { host: '127.0.0.1', port: socksPort, type: 5 };
  const { socket } = await SocksClient.createConnection({ proxy, command: 'connect', destination: { host, port }, timeout: 10000 });
  return socket as import('net').Socket;
}

async function fetchHttp1Json(host: string, path: string): Promise<IpResult> {
  try {
    const socket = await getSocksSocket(host, 443);
    const tlsSocket = tls.connect({ socket, servername: host, rejectUnauthorized: true });
    const requestLines = [
      `GET ${path} HTTP/1.1`,
      `Host: ${host}`,
      'Accept: application/json',
      'User-Agent: Chongdong-E2E/1.0',
      'Connection: close',
      '',
      ''
    ].join('\r\n');

    return await new Promise<IpResult>((resolve) => {
      let data = '';
      tlsSocket
        .once('secureConnect', () => tlsSocket.write(requestLines))
        .on('data', (chunk) => (data += chunk.toString()))
        .on('end', () => {
          try {
            const body = data.split('\r\n\r\n')[1] || '';
            const json = JSON.parse(body);
            resolve({ success: true, ip: json.ip, country: json.country || json.country_name, region: json.region, city: json.city, source: 'http1.1' });
          } catch (e: any) {
            resolve({ success: false, error: e?.message || 'parse error', source: 'http1.1' });
          }
        })
        .on('error', (err) => resolve({ success: false, error: (err as any)?.message || String(err), source: 'http1.1' }));
    });
  } catch (error: any) {
    return { success: false, error: error?.message || String(error), source: 'http1.1' };
  }
}

async function fetchHttp2Json(host: string, path: string): Promise<IpResult> {
  try {
    const socket = await getSocksSocket(host, 443);
    const tlsSocket = tls.connect({ socket, servername: host, rejectUnauthorized: true, ALPNProtocols: ['h2'] });

    return await new Promise<IpResult>((resolve) => {
      const session = http2.connect(`https://${host}`, {
        createConnection: () => tlsSocket
      });

      session.on('error', (err) => resolve({ success: false, error: (err as any)?.message || String(err), source: 'http2' }));

      const req = session.request({
        ':method': 'GET',
        ':path': path,
        ':authority': host,
        ':scheme': 'https',
        'accept': 'application/json',
        'user-agent': 'Chongdong-E2E/1.0'
      });

      let data = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ success: true, ip: json.ip, country: json.country || json.country_name, region: json.region, city: json.city, source: 'http2' });
        } catch (e: any) {
          resolve({ success: false, error: e?.message || 'parse error', source: 'http2' });
        }
        session.close();
      });
      req.on('error', (err) => {
        resolve({ success: false, error: (err as any)?.message || String(err), source: 'http2' });
        session.close();
      });
      req.end();
    });
  } catch (error: any) {
    return { success: false, error: error?.message || String(error), source: 'http2' };
  }
}

async function run(): Promise<void> {
  console.log('=== HTTP/1.1 vs HTTP/2 出口一致性测试 ===');
  const services = [
    { host: 'ipinfo.io', path: '/json' },
    { host: 'ipapi.co', path: '/json' }
  ];

  const results: Array<{ service: string; h1: IpResult; h2: IpResult; consistent: boolean }> = [];

  for (const svc of services) {
    console.log(`\n测试服务: ${svc.host}${svc.path}`);
    const h1 = await fetchHttp1Json(svc.host, svc.path);
    console.log('  HTTP/1.1 =>', h1);
    const h2 = await fetchHttp2Json(svc.host, svc.path);
    console.log('  HTTP/2   =>', h2);

    const consistent = !!(h1.success && h2.success && h1.ip && h2.ip && h1.ip === h2.ip);
    results.push({ service: `${svc.host}${svc.path}`, h1, h2, consistent });
  }

  console.log('\n=== 结果统计 ===');
  let allOk = true;
  for (const r of results) {
    const mark = r.consistent ? '✅' : '❌';
    console.log(`${mark} ${r.service}: ${r.h1.ip || 'N/A'} vs ${r.h2.ip || 'N/A'} (一致=${r.consistent})`);
    if (!r.consistent) allOk = false;
  }

  if (!allOk) {
    console.log('\n⚠️ 检测到出口不一致，建议检查：QUIC是否禁用、DNS是否统一走代理、敏感域是否强制HTTP/1.1或启用隔离');
    process.exitCode = 1;
  } else {
    console.log('\n✅ 所有服务在 HTTP/1.1 与 HTTP/2 下出口一致');
  }
}

if (require.main === module) {
  run().catch(err => {
    console.error('测试执行失败:', err);
    process.exit(2);
  });
}

