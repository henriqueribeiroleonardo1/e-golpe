import { isValidCnpj, isValidCpf } from '../lib/br-documents.js';
import { findBrCodes } from '../lib/pix-brcode.js';
import { normalize, onlyDigits } from '../lib/text.js';
import type { PixKeyType } from './types.js';

export interface ExtractedUrl {
  url: URL;
  /** A pessoa escreveu "http://" ou "https://"? */
  explicitScheme: boolean;
}

export interface PixKeyCandidate {
  type: PixKeyType;
  value: string;
}

/** Tudo o que dá para verificar dentro de uma mensagem. */
export interface Extracted {
  urls: ExtractedUrl[];
  boletoLines: string[];
  brCodes: string[];
  pixKeys: PixKeyCandidate[];
}

const MAX_URLS = 5;

const URL_WITH_SCHEME = /\bhttps?:\/\/[^\s<>"'`]+/gi;
/** Domínio sem "http", aceitando só extensões comuns para não confundir com "arquivo.pdf". */
const BARE_DOMAIN =
  /(?<![@\w.-])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:com|br|net|org|io|co|me|app|dev|info|biz|xyz|top|online|site|shop|store|click|live|link|icu|buzz|cyou|sbs|rest|lat|vip|club|fun|space|website|tech|cc|ly|gl|gd|to|ai|tv|us|pt|id|in)(?![\w-])(?:\/[^\s<>"'`]*)?/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}"'*_]+$/;

const BOLETO_LINE = /\d[\d.\s-]{44,64}\d/g;
const EMAIL = /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g;
const RANDOM_KEY = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const CNPJ = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const ELEVEN_DIGITS =
  /(?<![\d.])(?:\+?55[\s-]?)?\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}(?![\d])|\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const MENTIONS_PIX = /\b(pix|chave)\b/;

/** Troca um trecho já reconhecido por espaços para que não seja lido duas vezes. */
const blank = (text: string, part: string) => text.replaceAll(part, ' '.repeat(part.length));

/** Devolve os links achados e o texto com eles apagados. */
function extractUrls(text: string): { urls: ExtractedUrl[]; remaining: string } {
  const seen = new Set<string>();
  const urls: ExtractedUrl[] = [];
  let remaining = text;

  const take = (raw: string, explicitScheme: boolean) => {
    remaining = blank(remaining, raw);
    const cleaned = raw.replace(TRAILING_PUNCTUATION, '');
    try {
      const url = new URL(explicitScheme ? cleaned : `https://${cleaned}`);
      if (!seen.has(url.href) && urls.length < MAX_URLS) {
        seen.add(url.href);
        urls.push({ url, explicitScheme });
      }
    } catch {
      // Não era um endereço de verdade.
    }
  };

  for (const [match] of text.matchAll(URL_WITH_SCHEME)) take(match, true);
  for (const [match] of remaining.matchAll(BARE_DOMAIN)) take(match, false);

  return { urls, remaining };
}

function classifyNumber(raw: string): PixKeyType | null {
  const digits = onlyDigits(raw);
  if (digits.length === 11 && isValidCpf(digits)) return 'cpf';
  const local = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
  return local.length === 11 && local[2] === '9' ? 'phone' : null;
}

function extractPixKeys(text: string): PixKeyCandidate[] {
  if (!MENTIONS_PIX.test(normalize(text))) return [];

  const keys: PixKeyCandidate[] = [];
  let remaining = text;

  for (const [value] of text.matchAll(RANDOM_KEY)) {
    keys.push({ type: 'random', value: value.toLowerCase() });
    remaining = blank(remaining, value);
  }
  for (const [value] of remaining.matchAll(EMAIL)) {
    keys.push({ type: 'email', value: value.toLowerCase() });
    remaining = blank(remaining, value);
  }
  for (const [value] of remaining.matchAll(CNPJ)) {
    if (!isValidCnpj(value)) continue;
    keys.push({ type: 'cnpj', value });
    remaining = blank(remaining, value);
  }
  for (const [value] of remaining.matchAll(ELEVEN_DIGITS)) {
    const type = classifyNumber(value);
    if (type) keys.push({ type, value: value.trim() });
  }

  return keys;
}

/**
 * Separa a mensagem em partes verificáveis.
 * A ordem importa: o Pix copia e cola e o boleto são removidos antes de procurar
 * links e chaves, para que os números deles não sejam confundidos com outra coisa.
 */
export function extract(text: string): Extracted {
  let remaining = text;

  const brCodes = findBrCodes(remaining);
  for (const code of brCodes) remaining = blank(remaining, code);

  const boletoLines = [...remaining.matchAll(BOLETO_LINE)]
    .map(([match]) => match)
    .filter((match) => {
      const size = onlyDigits(match).length;
      return size === 47 || size === 48;
    });
  for (const line of boletoLines) remaining = blank(remaining, line);

  const links = extractUrls(remaining);

  return { urls: links.urls, boletoLines, brCodes, pixKeys: extractPixKeys(links.remaining) };
}
