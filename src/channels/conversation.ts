import { formatReply, type Analysis, type ReplyStyle } from '../core/index.js';
import { normalize } from '../lib/text.js';

/** O que chegou do chat, já independente de plataforma. */
export type IncomingMessage = { kind: 'text'; text: string } | { kind: 'media' } | { kind: 'other' };

export type Analyzer = (text: string) => Promise<Analysis>;

export const WELCOME = [
  'Oi! Aqui é o É Golpe?, um detector de golpes. 🟢🟡🔴',
  '',
  'Encaminhe para mim qualquer coisa suspeita: um link, um boleto, um Pix copia e cola ou aquele pedido de dinheiro estranho. Respondo em segundos com um semáforo e o que fazer.',
  '',
  'Eu não guardo as mensagens que você manda.',
].join('\n');

export const MEDIA_REPLY =
  'Por enquanto eu só leio texto. Copie e cole aqui o texto da mensagem, o link ou a linha digitável do boleto.';

const GREETINGS = new Set([
  '/start',
  '/ajuda',
  '/help',
  'oi',
  'ola',
  'menu',
  'ajuda',
  'bom dia',
  'boa tarde',
  'boa noite',
]);

/** Decide a resposta para uma mensagem. Mesma lógica para WhatsApp e Telegram. */
export async function respond(message: IncomingMessage, analyze: Analyzer, style: ReplyStyle): Promise<string> {
  if (message.kind === 'media') return MEDIA_REPLY;
  if (message.kind === 'other') return WELCOME;

  const greeting = normalize(message.text).replace(/[!.?]+$/, '');
  if (GREETINGS.has(greeting)) return WELCOME;

  return formatReply(await analyze(message.text), style);
}
