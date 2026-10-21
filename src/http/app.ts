import type { Analyzer } from '../channels/conversation.js';
import type { TelegramChannel, TelegramUpdate } from '../channels/telegram.js';
import type { WhatsAppChannel, WhatsAppWebhook } from '../channels/whatsapp.js';
import { formatReply, MAX_MESSAGE_LENGTH } from '../core/index.js';
import type { RateLimiter } from '../lib/rate-limit.js';

export interface AppDeps {
  analyze: Analyzer;
  rateLimiter: RateLimiter;
  telegram?: TelegramChannel;
  whatsapp?: WhatsAppChannel;
  /** Serve arquivos da demo. Devolve `null` quando o arquivo não existe. */
  serveStatic?: (pathname: string) => Promise<Response | null>;
  log?: (line: string) => void;
}

export interface App {
  fetch(request: Request, clientIp?: string): Promise<Response>;
}

type Handler = (request: Request, clientIp: string) => Promise<Response> | Response;

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { ...SECURITY_HEADERS, ...headers } });

const problem = (status: number, message: string, headers?: Record<string, string>) =>
  json({ error: message }, status, headers);

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Servidor HTTP escrito sobre `Request`/`Response` da Web.
 * Roda igual em Node, Bun, Deno ou Cloudflare Workers, e os testes chamam `app.fetch()` direto.
 */
export function createApp(deps: AppDeps): App {
  const { analyze, rateLimiter, telegram, whatsapp, serveStatic, log = () => {} } = deps;

  const analyzeApi: Handler = async (request, clientIp) => {
    const retryAfter = rateLimiter.hit(clientIp);
    if (retryAfter > 0) {
      return problem(429, 'Muitas análises seguidas. Tente de novo em instantes.', {
        ...CORS,
        'retry-after': String(retryAfter),
      });
    }

    const body = await readJson<{ text?: unknown }>(request);
    const text = body?.text;
    if (typeof text !== 'string' || text.trim() === '') {
      return problem(400, 'Envie um JSON no formato { "text": "mensagem suspeita" }.', CORS);
    }
    if (text.length > MAX_MESSAGE_LENGTH) {
      return problem(413, `A mensagem passa de ${MAX_MESSAGE_LENGTH} caracteres.`, CORS);
    }

    const analysis = await analyze(text);
    return json({ ...analysis, reply: formatReply(analysis) }, 200, CORS);
  };

  const telegramWebhook: Handler = async (request) => {
    if (!telegram) return problem(404, 'Telegram não está configurado.');
    if (!telegram.isAuthentic(request.headers.get('x-telegram-bot-api-secret-token'))) {
      return problem(401, 'Assinatura inválida.');
    }
    const update = await readJson<TelegramUpdate>(request);
    if (update) await telegram.handleUpdate(update);
    return json({ ok: true });
  };

  const whatsappVerify: Handler = (request) => {
    if (!whatsapp) return problem(404, 'WhatsApp não está configurado.');
    const challenge = whatsapp.verifySubscription(new URL(request.url).searchParams);
    return challenge
      ? new Response(challenge, { headers: SECURITY_HEADERS })
      : problem(403, 'Token de verificação inválido.');
  };

  const whatsappWebhook: Handler = async (request) => {
    if (!whatsapp) return problem(404, 'WhatsApp não está configurado.');
    const rawBody = await request.text();
    if (!(await whatsapp.isAuthentic(rawBody, request.headers.get('x-hub-signature-256')))) {
      return problem(401, 'Assinatura inválida.');
    }
    try {
      await whatsapp.handleWebhook(JSON.parse(rawBody) as WhatsAppWebhook);
    } catch (error) {
      log(`whatsapp: ${(error as Error).message}`);
    }
    // A Meta reenvia o evento se não receber 200, então respondemos 200 mesmo em falha de envio.
    return json({ ok: true });
  };

  const routes: Record<string, Handler> = {
    'GET /health': () => json({ ok: true }),
    'POST /api/analyze': analyzeApi,
    'OPTIONS /api/analyze': () => new Response(null, { status: 204, headers: CORS }),
    'POST /webhooks/telegram': telegramWebhook,
    'GET /webhooks/whatsapp': whatsappVerify,
    'POST /webhooks/whatsapp': whatsappWebhook,
  };

  async function route(request: Request, pathname: string, clientIp: string): Promise<Response> {
    const handler = routes[`${request.method} ${pathname}`];
    if (handler) return handler(request, clientIp);

    if (request.method === 'GET' && serveStatic) {
      const file = await serveStatic(pathname);
      if (file) return file;
    }
    return problem(404, 'Rota não encontrada.');
  }

  return {
    async fetch(request, clientIp = 'unknown') {
      const started = performance.now();
      const { pathname } = new URL(request.url);

      let response: Response;
      try {
        response = await route(request, pathname, clientIp);
      } catch (error) {
        log(`erro em ${pathname}: ${(error as Error).message}`);
        response = problem(500, 'Erro interno.');
      }

      // Nunca registramos o conteúdo das mensagens, só a rota e o tempo.
      log(`${request.method} ${pathname} ${response.status} ${Math.round(performance.now() - started)}ms`);
      return response;
    },
  };
}
