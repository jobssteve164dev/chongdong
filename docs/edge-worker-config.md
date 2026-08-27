# Cloudflare Edge Worker 可定义配置说明

本文档说明 edge/_worker.js 可通过环境变量与绑定资源进行的安全与行为配置。适用于 Cloudflare Workers 与 Pages Functions(_worker.js)。

## 1. 必填/推荐环境变量

- PSK / PSKS（二选一）
  - PSK: 单一预共享密钥，用于 HMAC 签名校验。
  - PSKS: 多密钥映射（JSON 字符串），例如：
    - PSKS='{"key-current":"replace-with-at-least-32-random-bytes","key-next":"replace-with-another-32-random-bytes"}'
  - 每个 PSK 至少 16 个字符，生产环境应使用密码学安全随机值并通过密钥轮换流程管理。
  - Worker端行为：优先从 PSKS 里用 kid 找到对应的 psk；找不到则回退到 PSK。

- KV（绑定）
  - 绑定名：KV
  - 用途：速率限制计数存储。
  - Wrangler（示例）：
    ```toml
    kv_namespaces = [
      { binding = "KV", id = "<your_kv_namespace_id>" }
    ]
    ```

## 2. 可选安全/行为配置（环境变量）

- RATE：按 IP 速率限制
  - 类型：JSON 字符串
  - 字段：
    - limit：窗口内允许的最大请求数（默认 60）
    - window：时间窗口（秒，默认 60）
  - 例：RATE='{"limit":60,"window":60}'

- ALLOW_HOSTS：目标主机白名单
  - 类型：JSON 数组，支持精确与前缀通配（*.example.com）
  - 命中白名单才允许转发；未配置则不启用白名单校验。
  - 例：ALLOW_HOSTS='["example.com","*.google.com"]'

- MIME_ALLOW：响应 MIME 白名单
  - 类型：JSON 数组；按包含匹配（小写包含判断）
  - 示例：MIME_ALLOW='["text/html","application/json"]'
  - 不在白名单返回 415（Unsupported Media Type）。未配置则不启用 MIME 限制。

- MAX_BYTES：响应大小上限（字节）
  - 类型：整数；超过即流式截断，防止大对象滥用
  - 例：MAX_BYTES=1048576（1 MiB）

- PSK / PSKS 运行时说明
  - 客户端签名公式（16进制）：
    - sig = HMAC_SHA256(psk, `${kid}|${ts}|${method}|${url}|${bodyBase64}`)
  - ts 为 Unix 秒级时间戳；Worker 端允许 ±120 秒时间窗。
  - method 需为标准 HTTP 方法之一；url 必须为绝对 URL；bodyBase64 为请求体 Base64 编码（GET 无包体则空字符串）。

## 3. Worker 安全行为（内置）

- HMAC 签名与时间窗校验：
  - 若签名不匹配或超时：返回 401。
- 私网直连阻断：
  - 若目标为 IPv4 且处于私网/保留网段（10/8、172.16/12、192.168/16、127/8、169.254/16）：返回 403。
- 头部最小化与敏感头屏蔽：
  - 屏蔽：x-forwarded-for、cf-connecting-ip、true-client-ip、x-real-ip、via、forwarded。
  - 仅回传必要响应头：content-type、content-length、cache-control、etag、last-modified。

## 4. 速率限制（RATE）说明

- 依赖 KV 存储，按 cf-connecting-ip 分桶。
- 计数键格式：rl:<ip>:<timeWindowBucket>。
- 超额返回 429（Rate limit）。

## 5. 部署与绑定（示例）

- Workers（wrangler.toml）：
  ```toml
  name = "edge-egress"
  main = "_worker.js"
  compatibility_date = "2024-09-01"

  kv_namespaces = [
    { binding = "KV", id = "<your_kv_namespace_id>" }
  ]

  [vars]
  PSK = "replace-with-at-least-32-random-bytes"
  # 或 PSKS (多密钥)
  # PSKS = '{"key-current":"replace-with-at-least-32-random-bytes","key-next":"replace-with-another-32-random-bytes"}'

  # 可选安全参数
  RATE = '{"limit":60,"window":60}'
  ALLOW_HOSTS = '["example.com","*.google.com"]'
  MIME_ALLOW = '["text/html","application/json"]'
  MAX_BYTES = "1048576"
  ```

- Pages Functions：
  - 在项目设置中新增环境变量（与上面一致）。
  - KV 绑定：Pages 支持在“Functions → Settings → Bindings”中配置 KV 并设置绑定名为 KV。

## 6. 客户端请求负载格式（示例）

客户端向 Worker 发送的 JSON 结构（POST application/json）：
```json
{
  "url": "https://example.com/path?x=1",
  "method": "GET",
  "headers": {
    "Accept": "text/html,application/xhtml+xml,application/xml"
  },
  "body": "",
  "ts": 1726400000,
  "kid": "key-2025-09",
  "sig": "<hmac-hex>"
}
```

## 7. 常见问题（FAQ）

- Q: 只能用 PSK 吗？
  - A: 支持 PSKS 多密钥映射。客户端需携带 kid 指示所用密钥。

- Q: 忽略 MIME 或主机白名单？
  - A: 不设置对应环境变量即可禁用该校验。

- Q: 速率限制依赖 KV 必须吗？
  - A: 是。未绑定 KV 或未设置 RATE 时，不启用速率限制。

- Q: 响应截断会损坏内容吗？
  - A: 超过 MAX_BYTES 即停止向下游推送，客户端将收到被截断的响应体（用于防滥用场景）。

---

建议：将 PSK/PSKS 存入 Cloudflare Encrypted Variables；按需开启 ALLOW_HOSTS、MIME_ALLOW 与 MAX_BYTES，并设置合理的 RATE。遵循最小暴露与最小权限原则。
