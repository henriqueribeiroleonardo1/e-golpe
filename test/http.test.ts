import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MEDIA_REPLY, WELCOME } from '../src/channels/conversation.js';
import { createTelegramChannel } from '../src/channels/telegram.js';
import { createWhatsAppChannel } from '../src/channels/whatsapp.js';
import { ConfigError, loadConfig } from '../src/config.js';
import { analyzeMessage } from '../src/core/index.js';
import { createApp, type AppDeps } from '../src/http/app.js';
import { createRateLimiter } from '../src/lib/rate-limit.js';
import { hmacSha256Hex } from '../src/lib/security.js';

interface SentRequest {
  url: string;
  body: Record<string, unknown>;
}

/** `fetch` falso que guarda o que o bot tentou enviar. */
function fakeFetch() {
  const sent: SentRequest[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    sent.push({ url: String(input), body: JSON.parse(String(init?.body ?? '{}')) });
    return Response.json({ ok: true, result: {} });
  };
  return { fetch, sent };
}

const analyze = (text: string) => analyzeMessage(text);

function makeApp(overrides: Partial<AppDeps> = {}) {
  return createApp({ analyze, rateLimiter: createRateLimiter({ limit: 100, windowMs: 60_000 }), ...overrides });
}

const post = (path: string, body: string, headers: Record<string, string> = {}) =>
  new Request(`http://test${path}`, {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json', ...headers },
  });

describe('API /api/analyze', () => {
  it('devolve o veredito e a resposta pronta', async () => {
    const response = await makeApp().fetch(post('/api/analyze', JSON.stringify({ text: 'acesse itau-seguranca.com' })));
    assert.equal(response.status, 200);
    const body = (await response.json()) as { level: string; reply: string };
    assert.equal(body.level, 'danger');
    assert.match(body.reply, /^🔴/);
  });

  it('recusa corpo inválido com mensagem clara', async () => {
    const response = await makeApp().fetch(post('/api/analyze', 'isso não é json'));
    assert.equal(response.status, 400);
  });

  it('limita análises seguidas do mesmo IP', async () => {
    const app = makeApp({ rateLimiter: createRateLimiter({ limit: 2, windowMs: 60_000 }) });
    const call = () => app.fetch(post('/api/analyze', JSON.stringify({ text: 'oi' })), '1.2.3.4');
    assert.equal((await call()).status, 200);
    assert.equal((await call()).status, 200);
    const blocked = await call();
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  });

  it('responde 404 em rota desconhecida', async () => {
    assert.equal((await makeApp().fetch(new Request('http://test/nada'))).status, 404);
  });
});

describe('webhook do Telegram', () => {
  const update = {
    update_id: 1,
    message: { message_id: 7, chat: { id: 42 }, text: 'Me passa o código que chegou por SMS' },
  };

  it('recusa chamada sem o segredo', async () => {
    const { fetch } = fakeFetch();
    const telegram = createTelegramChannel({ token: 't', webhookSecret: 's3cr3t', analyze, fetch });
    const response = await makeApp({ telegram }).fetch(post('/webhooks/telegram', JSON.stringify(update)));
    assert.equal(response.status, 401);
  });

  it('analisa e responde no mesmo chat', async () => {
    const { fetch, sent } = fakeFetch();
    const telegram = createTelegramChannel({ token: 't', webhookSecret: 's3cr3t', analyze, fetch });
    const response = await makeApp({ telegram }).fetch(
      post('/webhooks/telegram', JSON.stringify(update), { 'x-telegram-bot-api-secret-token': 's3cr3t' }),
    );
    assert.equal(response.status, 200);
    assert.equal(sent[0]?.url, 'https://api.telegram.org/bott/sendMessage');
    assert.equal(sent[0]?.body.chat_id, 42);
    assert.match(String(sent[0]?.body.text), /<b>Alto risco de golpe<\/b>/);
  });

  it('dá boas-vindas e explica que ainda não lê imagem', async () => {
    const { fetch, sent } = fakeFetch();
    const telegram = createTelegramChannel({ token: 't', analyze, fetch });
    await telegram.handleUpdate({ update_id: 2, message: { message_id: 1, chat: { id: 1 }, text: '/start' } });
    await telegram.handleUpdate({ update_id: 3, message: { message_id: 2, chat: { id: 1 }, photo: [{}] } });
    assert.equal(sent[0]?.body.text, WELCOME);
    assert.equal(sent[1]?.body.text, MEDIA_REPLY);
  });
});

describe('webhook do WhatsApp', () => {
  const options = {
    token: 't',
    phoneNumberId: '123',
    verifyToken: 'verifica',
    appSecret: 'segredo-do-app',
    graphVersion: 'v23.0',
  };
  const payload = JSON.stringify({
    entry: [
      {
        changes: [
          {
            value: { messages: [{ from: '5561999998888', id: 'wamid.1', type: 'text', text: { body: 'bit.ly/abc' } }] },
          },
        ],
      },
    ],
  });

  it('responde ao desafio de cadastro só com o token certo', async () => {
    const whatsapp = createWhatsAppChannel({ ...options, analyze, fetch: fakeFetch().fetch });
    const app = makeApp({ whatsapp });
    const ok = await app.fetch(
      new Request('http://test/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verifica&hub.challenge=123'),
    );
    assert.equal(await ok.text(), '123');
    const bad = await app.fetch(
      new Request('http://test/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=123'),
    );
    assert.equal(bad.status, 403);
  });

  it('recusa corpo com assinatura errada', async () => {
    const whatsapp = createWhatsAppChannel({ ...options, analyze, fetch: fakeFetch().fetch });
    const response = await makeApp({ whatsapp }).fetch(
      post('/webhooks/whatsapp', payload, { 'x-hub-signature-256': 'sha256=00' }),
    );
    assert.equal(response.status, 401);
  });

  it('confere a assinatura HMAC e responde a mensagem', async () => {
    const { fetch, sent } = fakeFetch();
    const whatsapp = createWhatsAppChannel({ ...options, analyze, fetch });
    const signature = `sha256=${await hmacSha256Hex(options.appSecret, payload)}`;
    const response = await makeApp({ whatsapp }).fetch(
      post('/webhooks/whatsapp', payload, { 'x-hub-signature-256': signature }),
    );
    assert.equal(response.status, 200);
    assert.equal(sent[0]?.url, 'https://graph.facebook.com/v23.0/123/messages');
    assert.equal(sent[0]?.body.to, '5561999998888');
    assert.match(String((sent[0]?.body.text as { body: string }).body), /^🟡 \*Confirme antes de seguir\*/);
  });
});

describe('configuração', () => {
  it('liga só os canais com credenciais', () => {
    const config = loadConfig({ TELEGRAM_BOT_TOKEN: 'abc' });
    assert.equal(config.port, 3000);
    assert.equal(config.telegram?.token, 'abc');
    assert.equal(config.whatsapp, undefined);
  });

  it('explica o que falta quando o WhatsApp está pela metade', () => {
    assert.throws(() => loadConfig({ WHATSAPP_TOKEN: 'x' }), ConfigError);
  });
});
