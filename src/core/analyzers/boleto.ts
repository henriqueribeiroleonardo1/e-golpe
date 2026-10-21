import { parseBoleto, UTILITY_SEGMENTS } from '../../lib/boleto.js';
import { bankName } from '../data/banks.js';
import type { AnalyzerResult, BoletoFinding, Signal } from '../types.js';

const INVALID: Omit<Signal, 'id'> = {
  category: 'boleto',
  severity: 'high',
  reason: 'Os dígitos verificadores do boleto não fecham. Ele foi digitado errado ou adulterado',
  advice: 'Não pague. Gere a segunda via no site ou app oficial de quem está cobrando.',
};

export function analyzeBoletos(lines: string[], now: Date): AnalyzerResult {
  const signals: Signal[] = [];
  const findings: BoletoFinding[] = [];

  lines.forEach((line, index) => {
    const info = parseBoleto(line, now);
    if (!info) return;

    const issuer =
      info.type === 'bancario'
        ? bankName(info.issuerCode ?? '')
        : `conta de ${UTILITY_SEGMENTS[info.issuerCode ?? ''] ?? 'consumo'}`;

    findings.push({
      kind: 'boleto',
      type: info.type,
      valid: info.valid,
      issuer,
      ...(info.amount !== undefined && { amount: info.amount }),
      ...(info.dueDate !== undefined && { dueDate: info.dueDate }),
    });

    if (!info.valid) signals.push({ id: `boleto-invalid:${index}`, ...INVALID });
  });

  return { signals, findings };
}
