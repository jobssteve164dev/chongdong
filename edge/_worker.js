export default {
  async fetch(request, env, ctx) {
    try {
      if (request.method !== 'POST') {
        return new Response('Only POST supported', { status: 405 });
      }
      const contentType = request.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return new Response('Expect application/json', { status: 400 });
      }
      const payload = await request.json();
      const targetUrl = payload?.url;
      if (!targetUrl) {
        return new Response('Missing url', { status: 400 });
      }

      const method = String(payload?.method || 'GET').toUpperCase();
      if (!['GET','POST','HEAD','PUT','DELETE','OPTIONS','PATCH'].includes(method)) return new Response('Bad method', { status: 400 });

      // 速率限制（基于CF连接IP）
      const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';
      if (env.RATE && clientIp) {
        const conf = JSON.parse(env.RATE);
        const limit = Number(conf.limit || 60);
        const windowSec = Number(conf.window || 60);
        const key = `rl:${clientIp}:${Math.floor(Date.now()/1000/windowSec)}`;
        const count = (await env?.KV?.get(key)) || '0';
        const n = parseInt(count, 10) || 0;
        if (n >= limit) return new Response('Rate limit', { status: 429 });
        await env?.KV?.put(key, String(n+1), { expirationTtl: windowSec });
      }

      // 时间窗 + HMAC
      const ts = Number(payload?.ts || 0);
      const kid = String(payload?.kid || '');
      const sig = String(payload?.sig || '');
      const pskMap = (env && env.PSKS) ? JSON.parse(env.PSKS) : {};
      const psk = pskMap[kid] || env.PSK || '';
      if (!psk) return new Response('PSK missing', { status: 401 });
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - ts) > 120) return new Response('Expired', { status: 401 });
      const bodyB64 = payload?.body || '';
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(psk), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const data = new TextEncoder().encode(`${kid}|${ts}|${method}|${targetUrl}|${bodyB64}`);
      const mac = await crypto.subtle.sign('HMAC', key, data);
      const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2,'0')).join('');
      if (hex !== sig) return new Response('Bad signature', { status: 401 });

      // 目标主机白名单（可选）
      const allowHosts = (env && env.ALLOW_HOSTS) ? JSON.parse(env.ALLOW_HOSTS) : null;
      // 私网IP目标拦截（仅对直接IP生效）
      try {
        const u = new URL(targetUrl);
        const host = u.hostname;
        if (allowHosts && Array.isArray(allowHosts) && allowHosts.length > 0) {
          let allowed = false;
          for (const p of allowHosts) {
            if (p.startsWith('*.') && host.endsWith(p.slice(1))) { allowed = true; break; }
            if (host === p) { allowed = true; break; }
          }
          if (!allowed) return new Response('Host not allowed', { status: 403 });
        }
        if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
          const [a,b] = host.split('.').map(x=>parseInt(x,10));
          const isPrivate = a===10 || (a===172 && b>=16 && b<=31) || (a===192 && b===168) || a===127 || a===169;
          if (isPrivate) return new Response('Private address blocked', { status: 403 });
        }
      } catch {}

      const headersObj = payload?.headers || {};
      const blocked = new Set(['x-forwarded-for', 'cf-connecting-ip', 'true-client-ip', 'via', 'forwarded', 'x-real-ip']);
      const outHeaders = new Headers();
      for (const [k, v] of Object.entries(headersObj)) {
        const keyh = String(k).toLowerCase();
        if (!blocked.has(keyh)) outHeaders.set(k, String(v));
      }
      const body = bodyB64 ? new Uint8Array(atob(bodyB64).split('').map(c => c.charCodeAt(0))) : undefined;
      const resp = await fetch(targetUrl, { method, headers: outHeaders, body });
      const passthroughHeaders = new Headers();
      const safeHeaders = ['content-type', 'content-length', 'cache-control', 'etag', 'last-modified'];
      resp.headers.forEach((v, k) => { if (safeHeaders.includes(k.toLowerCase())) passthroughHeaders.set(k, v); });
      // MIME白名单（可选）
      const mimeAllow = (env && env.MIME_ALLOW) ? JSON.parse(env.MIME_ALLOW) : null;
      const ct = resp.headers.get('content-type') || '';
      if (mimeAllow && Array.isArray(mimeAllow) && mimeAllow.length > 0) {
        const ok = mimeAllow.some(p => ct.toLowerCase().includes(String(p).toLowerCase()));
        if (!ok) return new Response('Blocked content-type', { status: 415 });
      }
      // 响应大小上限（字节）
      const maxBytes = env?.MAX_BYTES ? parseInt(env.MAX_BYTES, 10) : 0;
      if (maxBytes && maxBytes > 0 && resp.body) {
        const reader = resp.body.getReader();
        let pushed = 0;
        const stream = new ReadableStream({
          async pull(controller) {
            const { value, done } = await reader.read();
            if (done) { controller.close(); return; }
            if (value) {
              pushed += value.byteLength;
              if (pushed > maxBytes) { controller.close(); return; }
              controller.enqueue(value);
            }
          }
        });
        return new Response(stream, { status: resp.status, headers: passthroughHeaders });
      }
      return new Response(resp.body, { status: resp.status, headers: passthroughHeaders });
    } catch (e) {
      return new Response('Edge error: ' + (e?.message || String(e)), { status: 500 });
    }
  }
};


