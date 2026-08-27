import { randomBytes } from 'crypto';

export const internalApiSecret = randomBytes(32).toString('hex');

export function secureInternalClashApi(config: any, defaultPort = 9090): any {
  config.experimental = config.experimental || {};
  const current = config.experimental.clash_api || {};
  const controller = String(current.external_controller || `127.0.0.1:${defaultPort}`);
  const match = controller.match(/^(127\.0\.0\.1|localhost):([1-9]\d{0,4})$/);
  const port = Number(match?.[2]);
  if (!match || port > 65535) {
    throw new Error('内部控制 API 只允许监听有效的回环地址与端口');
  }
  config.experimental.clash_api = {
    ...current,
    external_controller: controller,
    external_ui: '',
    secret: internalApiSecret
  };
  return config;
}
