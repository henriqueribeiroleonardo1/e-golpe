import { toDigits } from './text.js';

export interface BoletoInfo {
  type: 'bancario' | 'arrecadacao';
  valid: boolean;
  /** Código do banco (boleto bancário) ou segmento (conta de consumo). */
  issuerCode?: string;
  amount?: number;
  dueDate?: string;
}

const DAY_MS = 86_400_000;
/** Fator 1000 = 03/07/2000 na base antiga. */
const OLD_FACTOR_BASE = Date.UTC(1997, 9, 7);
/** Em 22/02/2025 o fator chegou a 9999 e recomeçou em 1000. */
const NEW_FACTOR_BASE = Date.UTC(2025, 1, 22);

/** Módulo 10 da FEBRABAN: pesos 2,1,2,1... da direita para a esquerda. */
export function mod10(digits: number[]): number {
  const sum = digits
    .toReversed()
    .map((digit, i) => digit * (i % 2 === 0 ? 2 : 1))
    .reduce((acc, product) => acc + (product > 9 ? product - 9 : product), 0);
  return (10 - (sum % 10)) % 10;
}

/** Soma ponderada com pesos 2 a 9 da direita para a esquerda; devolve o resto por 11. */
function mod11Remainder(digits: number[]): number {
  const sum = digits.toReversed().reduce((acc, digit, i) => acc + digit * ((i % 8) + 2), 0);
  return sum % 11;
}

function bankBarcodeCheck(digits: number[]): number {
  const dv = 11 - mod11Remainder(digits);
  return dv === 0 || dv === 10 || dv === 11 ? 1 : dv;
}

function utilityMod11(digits: number[]): number {
  const rest = mod11Remainder(digits);
  return rest === 0 || rest === 1 ? 0 : 11 - rest;
}

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** O mesmo fator aponta para duas datas (antes e depois de 2025). Fica a mais próxima de hoje. */
function dueDateFromFactor(factor: number, now: Date): string | undefined {
  if (factor === 0) return undefined;
  const candidates = [OLD_FACTOR_BASE + factor * DAY_MS];
  if (factor >= 1000) candidates.push(NEW_FACTOR_BASE + (factor - 1000) * DAY_MS);

  const closest = candidates.reduce((best, date) =>
    Math.abs(date - now.getTime()) < Math.abs(best - now.getTime()) ? date : best,
  );
  return isoDay(closest);
}

const sliceNumber = (digits: number[], start: number, end: number) => Number(digits.slice(start, end).join(''));

/**
 * Linha digitável de boleto bancário (47 dígitos):
 * AAABC.CCCCX DDDDD.DDDDDY EEEEE.EEEEEZ K UUUUVVVVVVVVVV
 */
function parseBankBoleto(d: number[], now: Date): BoletoInfo {
  const fieldsValid =
    mod10(d.slice(0, 9)) === d[9] && mod10(d.slice(10, 20)) === d[20] && mod10(d.slice(21, 31)) === d[31];

  // Código de barras de 44 posições, sem o dígito geral (posição 5).
  const barcodeWithoutDv = [
    ...d.slice(0, 4),
    ...d.slice(33, 47),
    ...d.slice(4, 9),
    ...d.slice(10, 20),
    ...d.slice(21, 31),
  ];
  const generalValid = bankBarcodeCheck(barcodeWithoutDv) === d[32];

  const amount = sliceNumber(d, 37, 47) / 100;
  const dueDate = dueDateFromFactor(sliceNumber(d, 33, 37), now);

  return {
    type: 'bancario',
    valid: fieldsValid && generalValid,
    issuerCode: d.slice(0, 3).join(''),
    ...(amount > 0 && { amount }),
    ...(dueDate && { dueDate }),
  };
}

/** Conta de consumo / tributo (48 dígitos, começa com 8): 4 blocos de 11 dígitos + DV. */
function parseUtilityBoleto(d: number[]): BoletoInfo {
  const valueType = d[2];
  const checker = valueType === 6 || valueType === 7 ? mod10 : utilityMod11;

  const blocks = [0, 12, 24, 36].map((start) => d.slice(start, start + 12));
  const valid = blocks.every((block) => checker(block.slice(0, 11)) === block[11]);

  const barcode = blocks.flatMap((block) => block.slice(0, 11));
  const hasRealAmount = valueType === 6 || valueType === 8;
  const amount = hasRealAmount ? sliceNumber(barcode, 4, 15) / 100 : 0;

  return {
    type: 'arrecadacao',
    valid,
    issuerCode: String(d[1]),
    ...(amount > 0 && { amount }),
  };
}

/** Recebe a linha digitável (com ou sem pontos e espaços). */
export function parseBoleto(line: string, now = new Date()): BoletoInfo | null {
  const digits = toDigits(line);
  if (digits.length === 47) return parseBankBoleto(digits, now);
  if (digits.length === 48 && digits[0] === 8) return parseUtilityBoleto(digits);
  return null;
}

export const UTILITY_SEGMENTS: Readonly<Record<string, string>> = {
  '1': 'prefeitura',
  '2': 'água e saneamento',
  '3': 'energia ou gás',
  '4': 'telefone e internet',
  '5': 'órgão público',
  '6': 'carnê',
  '7': 'multa de trânsito',
  '9': 'uso interno de banco',
};
