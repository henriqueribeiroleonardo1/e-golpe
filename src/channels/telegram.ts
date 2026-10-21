import { TELEGRAM_HTML_STYLE } from '../core/index.js';
import { safeEqual } from '../lib/security.js';
import { respond, type Analyzer, type IncomingMessage } from './conversation.js';

/** Só os campos da Bot API que o bot usa. */
export interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  text?: string;
  caption?: string;
  photo?: unknown[];
  document?: unknown;
  voice?: unknown;
  video?: unknown;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TelegramOptions {
  token: string;
  webhookSecret?: string;
  analyze: Analyzer;
  fetch?: typeof globalThis.fetch;
}

export interface TelegramChannel {
  /** Confere o header `X-Telegram-Bot-Api-Secret-Token` enviado pelo Telegram. */
  isAuthentic(secretHeader: string | null): boolean;
  handleUpdate(update: TelegramUpdate): Promise<void>;
  call<T>(method: string, body?: Record<string, unknown>): Promise<T>;
}

export function toIncoming(message: TelegramMessage): IncomingMessage {
  const text = message.text ?? message.caption;
  if (text?.trim()) return { kind: 'text', text };
  if (message.photo || message.document || message.voice || message.video) return { kind: 'media' };
  return { kind: 'other' };
}

export function createTelegramChannel({
  token,
  webhookSecret,
  analyze,
  fetch = globalThis.fetch,
}: TelegramOptions): TelegramChannel {
  async function call<T>(method: string, body: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { ok: boolean; result: T; description?: string };
    if (!data.ok) throw new Error(`Telegram ${method} falhou: ${data.description ?? response.status}`);
    return data.result;
  }

  return {
    call,

    isAuthentic(secretHeader) {
      // Sem segredo configurado, o webhook fica fechado: só o modo polling funciona.
      return Boolean(webhookSecret && secretHeader && safeEqual(secretHeader, webhookSecret));
    },

    async handleUpdate(update) {
      const message = update.message;
      if (!message) return;

      const reply = await respond(toIncoming(message), analyze, TELEGRAM_HTML_STYLE);
      await call('sendMessage', {
        chat_id: message.chat.id,
        text: reply,
        parse_mode: 'HTML',
        reply_parameters: { message_id: message.message_id },
        link_preview_options: { is_disabled: true },
      });
    },
  };
}
