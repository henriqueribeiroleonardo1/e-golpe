import { toDigits } from './text.js';

const allSame = (digits: number[]) => digits.every((d) => d === digits[0]);

function weightedSum(digits: number[], weights: number[]): number {
  return weights.reduce((sum, weight, i) => sum + weight * (digits[i] ?? 0), 0);
}

export function isValidCpf(value: string): boolean {
  const digits = toDigits(value);
  if (digits.length !== 11 || allSame(digits)) return false;

  const check = (length: number) => {
    const weights = Array.from({ length }, (_, i) => length + 1 - i);
    return ((weightedSum(digits, weights) * 10) % 11) % 10;
  };

  return check(9) === digits[9] && check(10) === digits[10];
}

export function isValidCnpj(value: string): boolean {
  const digits = toDigits(value);
  if (digits.length !== 14 || allSame(digits)) return false;

  const check = (weights: number[]) => {
    const rest = weightedSum(digits, weights) % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const first = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const second = [6, ...first];
  return check(first) === digits[12] && check(second) === digits[13];
}

/** Mostra só o miolo do CPF, como os bancos fazem no comprovante. */
export function maskCpf(value: string): string {
  const d = value.replace(/\D/g, '');
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}
