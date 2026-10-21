/**
 * Leitor do "Pix copia e cola" (BR Code), que segue o padrão EMV QRCPS:
 * uma sequência de campos ID(2) + TAMANHO(2) + VALOR, terminando no CRC (campo 63).
 */

export interface BrCode {
  payload: string;
  key?: string;
  /** URL de cobrança dinâmica (campo 25), quando existe. */
  location?: string;
  amount?: number;
  receiverName?: string;
  city?: string;
  crcValid: boolean;
}

interface Field {
  id: string;
  value: string;
  next: number;
}

const PIX_GUI = 'br.gov.bcb.pix';
const TWO_DIGITS = /^\d{2}$/;

function readField(text: string, start: number): Field | null {
  const id = text.slice(start, start + 2);
  const size = text.slice(start + 2, start + 4);
  if (!TWO_DIGITS.test(id) || !TWO_DIGITS.test(size)) return null;

  const value = text.slice(start + 4, start + 4 + Number(size));
  if (value.length !== Number(size)) return null;

  return { id, value, next: start + 4 + value.length };
}

function readFields(text: string): Map<string, string> {
  const fields = new Map<string, string>();
  let position = 0;
  while (position < text.length) {
    const field = readField(text, position);
    if (!field) break;
    fields.set(field.id, field.value);
    position = field.next;
  }
  return fields;
}

/** CRC16/CCITT-FALSE (polinômio 0x1021, início 0xFFFF), exigido pelo Banco Central. */
export function crc16(data: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(data)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Lê campos a partir de `start` até o CRC. Devolve o código completo ou `null`. */
function readPayloadAt(text: string, start: number): string | null {
  let position = start;
  while (position < text.length) {
    const field = readField(text, position);
    if (!field) return null;
    position = field.next;
    if (field.id === '63') return field.value.length === 4 ? text.slice(start, position) : null;
  }
  return null;
}

/** Acha todos os códigos Pix copia e cola dentro de um texto. */
export function findBrCodes(text: string): string[] {
  const found: string[] = [];
  let index = text.indexOf('000201');
  while (index !== -1) {
    const payload = readPayloadAt(text, index);
    if (payload?.includes(PIX_GUI)) {
      found.push(payload);
      index = text.indexOf('000201', index + payload.length);
    } else {
      index = text.indexOf('000201', index + 1);
    }
  }
  return found;
}

export function parseBrCode(payload: string): BrCode {
  const fields = readFields(payload);

  // A conta do recebedor fica em algum campo entre 26 e 51 que contenha o GUI do Pix.
  const account = [...fields.entries()]
    .filter(([id]) => Number(id) >= 26 && Number(id) <= 51)
    .map(([, value]) => readFields(value))
    .find((sub) => sub.get('00')?.toLowerCase() === PIX_GUI);

  const amount = Number(fields.get('54'));
  const key = account?.get('01');
  const location = account?.get('25');
  const receiverName = fields.get('59')?.trim();
  const city = fields.get('60')?.trim();

  return {
    payload,
    crcValid: crc16(payload.slice(0, -4)) === payload.slice(-4).toUpperCase(),
    ...(key && { key }),
    ...(location && { location }),
    ...(amount > 0 && { amount }),
    ...(receiverName && { receiverName }),
    ...(city && { city }),
  };
}
