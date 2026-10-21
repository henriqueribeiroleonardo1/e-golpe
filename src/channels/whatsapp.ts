import { WHATSAPP_STYLE } from '../core/index.js';
import { hmacSha256Hex, safeEqual } from '../lib/security.js';
import { respond, type Analyzer, type IncomingMessage } from './conversation.js';

/** Só os campos do webhook da WhatsApp Cloud API que o bot usa. */
export interface WhatsAppMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  image?: { caption?: string };
}

export interface WhatsAppWebhook {
  entry?: { changes?: { value?: { messages?: WhatsAppMessage[] } }[] }[];
}

export interface WhatsAppOptions {
  token: string;
  phoneNumberId: string;
  verifyToken: string;
  appSecret: string;
  graphVersion: string;
  analyze: Analyzer;
  fetch?: typeof globalThis.fetch;
}

export interface WhatsAppChannel {
  /** Responde ao desafio que a Meta faz ao cadastrar o webhook. Devolve o `challenge` ou `null`. */
  verifySubscription(params: URLSearchParams): string | null;
  /** Confere o header `X-Hub-Signature-256` contra o corpo bruto da requisição. */
  isAuthentic(rawBody: string, signatureHeader: string | null): Promise<boolean>;
  handleWebhook(payload: WhatsAppWebhook): Promise<void>;
}

const MEDIA_TYPES = new Set(['image', 'audio', 'video', 'document', 'sticker']);

export function toIncoming(message: WhatsAppMessage): IncomingMessage {
  const text = message.text?.body ?? message.image?.caption;
  if (text?.trim()) return { kind: 'text', text };
  if (MEDIA_TYPES.has(message.type)) return { kind: 'media' };
  return { kind: 'other' };
}

export function messagesOf(payload: WhatsAppWebhook): WhatsAppMessage[] {
  return (payload.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) => change.value?.messages ?? []),
  );
}

export function createWhatsAppChannel(options: WhatsAppOptions): WhatsAppChannel {
  const { token, phoneNumberId, verifyToken, appSecret, graphVersion, analyze, fetch = globalThis.fetch } = options;

  async function sendText(to: string, replyTo: string, body: string): Promise<void> {
    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        context: { message_id: replyTo },
        text: { body, preview_url: false },
      }),
    });
    if (!response.ok) throw new Error(`WhatsApp respondeu ${response.status}`);
  }

  return {
    verifySubscription(params) {
      const ok = params.get('hub.mode') === 'subscribe' && safeEqual(params.get('hub.verify_token') ?? '', verifyToken);
      return ok ? params.get('hub.challenge') : null;
    },

    async isAuthentic(rawBody, signatureHeader) {
      if (!signatureHeader?.startsWith('sha256=')) return false;
      const expected = await hmacSha256Hex(appSecret, rawBody);
      return safeEqual(signatureHeader.slice('sha256='.length), expected);
    },

    async handleWebhook(payload) {
      await Promise.all(
        messagesOf(payload).map(async (message) => {
          const reply = await respond(toIncoming(message), analyze, WHATSAPP_STYLE);
          await sendText(message.from, message.id, reply);
        }),
      );
    },
  };
}
