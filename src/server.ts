import { fileURLToPath } from 'node:url';
import { createServices, loadDotEnv } from './bootstrap.js';
import { loadConfig } from './config.js';
import { createApp } from './http/app.js';
import { serveNode, staticFolder } from './http/node-adapter.js';
import { createRateLimiter } from './lib/rate-limit.js';

loadDotEnv();
const config = loadConfig();
const services = createServices(config);

const publicDir = fileURLToPath(new URL('../public', import.meta.url));

const app = createApp({
  ...services,
  rateLimiter: createRateLimiter({ limit: 20, windowMs: 60_000 }),
  serveStatic: staticFolder(publicDir),
  log: (line) => console.log(line),
});

serveNode(app, config.port);

const channels = [services.telegram && 'Telegram', services.whatsapp && 'WhatsApp'].filter(Boolean);
console.log(`É Golpe? ouvindo em http://localhost:${config.port}`);
console.log(`Canais ativos: ${channels.length > 0 ? channels.join(', ') : 'nenhum (só API e demo)'}`);
if (config.telegram && !config.telegram.webhookSecret) {
  console.log('Aviso: defina TELEGRAM_WEBHOOK_SECRET para receber o webhook do Telegram.');
}
