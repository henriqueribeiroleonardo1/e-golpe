import { isValidCpf } from '../../lib/br-documents.js';
import { parseBrCode } from '../../lib/pix-brcode.js';
import { onlyDigits } from '../../lib/text.js';
import { nameMatchesBrand, type Brand } from '../data/brands.js';
import type { PixKeyCandidate } from '../extract.js';
import type { AnalyzerResult, PixFinding, PixKeyType, Signal } from '../types.js';

const CHECK_RECEIVER = 'Antes de confirmar, confira no app do banco o nome de quem vai receber.';
const COMPANY_TALK = /\b(empresa|loja|ltda|banco|central|financeiro|cobranca|condominio|escola|atendimento)\b/;
const PERSONAL_EMAIL = /@(gmail|hotmail|outlook|yahoo|icloud|live|bol|uol)\./;

export interface PixInput {
  brCodes: string[];
  keys: PixKeyCandidate[];
  normalizedText: string;
  brands: Brand[];
}

const RANDOM_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function keyTypeOf(key: string): PixKeyType {
  if (key.includes('@')) return 'email';
  if (RANDOM_KEY.test(key)) return 'random';
  const digits = onlyDigits(key);
  if (digits.length === 14) return 'cnpj';
  if (digits.length === 11 && isValidCpf(digits)) return 'cpf';
  return 'phone';
}

const isPersonalKey = (type: PixKeyType, key: string) =>
  type === 'cpf' || type === 'phone' || (type === 'email' && PERSONAL_EMAIL.test(key));

const pixSignal = (id: string, severity: Signal['severity'], reason: string, advice = CHECK_RECEIVER): Signal => ({
  id,
  category: 'pix',
  severity,
  reason,
  advice,
});

export function analyzePix({ brCodes, keys, normalizedText, brands }: PixInput): AnalyzerResult {
  const signals: Signal[] = [];
  const findings: PixFinding[] = [];
  const talksLikeCompany = brands.length > 0 || COMPANY_TALK.test(normalizedText);
  const claimedBrand = brands[0];

  for (const code of brCodes.map(parseBrCode)) {
    const keyType = code.key ? keyTypeOf(code.key) : undefined;
    findings.push({
      kind: 'pix',
      source: 'brcode',
      ...(code.key && { key: code.key }),
      ...(keyType && { keyType }),
      ...(code.receiverName && { receiverName: code.receiverName }),
      ...(code.city && { city: code.city }),
      ...(code.amount !== undefined && { amount: code.amount }),
    });

    if (!code.crcValid) {
      signals.push(
        pixSignal(
          'brcode-crc',
          'high',
          'O Pix copia e cola foi alterado: o código de verificação não confere',
          'Não pague com esse código. Peça um novo direto no site ou app de quem cobra.',
        ),
      );
    }

    const receiver = code.receiverName;
    if (claimedBrand && receiver && !brands.some((brand) => nameMatchesBrand(receiver, brand))) {
      signals.push(
        pixSignal(
          'receiver-mismatch',
          'high',
          `A mensagem fala em ${claimedBrand.name}, mas o Pix vai para ${receiver}`,
        ),
      );
    }
  }

  for (const key of keys) {
    findings.push({ kind: 'pix', source: 'key', keyType: key.type, key: key.value });
    if (talksLikeCompany && isPersonalKey(key.type, key.value)) {
      signals.push(
        pixSignal('personal-key', 'medium', 'Fala em nome de uma empresa, mas a chave Pix é de pessoa física'),
      );
    }
  }

  return { signals, findings };
}
