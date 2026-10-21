/** Minúsculas, sem acentos e com espaços simples: a forma que as regras comparam. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function onlyDigits(text: string): string {
  return text.replace(/\D/g, '');
}

export function toDigits(text: string): number[] {
  return Array.from(onlyDigits(text), Number);
}

/** Distância de edição entre duas palavras (inserção, remoção ou troca de uma letra). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, (previous[j - 1] ?? 0) + cost);
    }
    previous = current;
  }

  return previous[b.length] ?? 0;
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatBRL(value: number): string {
  return BRL.format(value);
}

/** "2026-11-10" -> "10/11/2026" */
export function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}
