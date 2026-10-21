import type { Analysis, AnalyzerResult, Finding, RiskLevel, Severity, Signal } from './types.js';

const WEIGHT: Record<Severity, number> = { critical: 60, high: 35, medium: 20, low: 10, trust: -25 };
const ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, trust: 4 };

const DANGER_SCORE = 50;
const CAUTION_SCORE = 20;

const TITLES: Record<RiskLevel, string> = {
  danger: 'Alto risco de golpe',
  caution: 'Confirme antes de seguir',
  safe: 'Não encontrei sinais de golpe',
  inconclusive: 'Não achei nada para checar',
};

const DEFAULT_ADVICE: Record<RiskLevel, string> = {
  danger: 'Não clique, não pague e não responda.',
  caution: 'Confirme por outro canal oficial antes de clicar ou pagar.',
  safe: 'Se algo parecer estranho, confirme por outro canal oficial.',
  inconclusive: 'Encaminhe a mensagem com o link, o boleto ou a chave Pix que você recebeu.',
};

const PAYMENT_ADVICE = 'Mesmo assim, confira no app do banco o nome de quem vai receber antes de confirmar.';

function uniqueById(signals: Signal[]): Signal[] {
  const byId = new Map<string, Signal>();
  for (const signal of signals) if (!byId.has(signal.id)) byId.set(signal.id, signal);
  return [...byId.values()];
}

function decideLevel(signals: Signal[], findings: Finding[], score: number): RiskLevel {
  if (signals.length === 0 && findings.length === 0) return 'inconclusive';
  if (signals.some((signal) => signal.severity === 'critical') || score >= DANGER_SCORE) return 'danger';
  if (score >= CAUTION_SCORE) return 'caution';
  return 'safe';
}

function pickAdvice(level: RiskLevel, signals: Signal[], findings: Finding[]): string {
  if (level === 'danger' || level === 'caution') {
    return signals.find((signal) => signal.severity !== 'trust' && signal.advice)?.advice ?? DEFAULT_ADVICE[level];
  }
  const involvesPayment = findings.some((finding) => finding.kind === 'boleto' || finding.kind === 'pix');
  return level === 'safe' && involvesPayment ? PAYMENT_ADVICE : DEFAULT_ADVICE[level];
}

/** Junta o que cada analisador achou e transforma em um veredito de semáforo. */
export function buildAnalysis(results: AnalyzerResult[]): Analysis {
  const signals = uniqueById(results.flatMap((result) => result.signals)).sort(
    (a, b) => ORDER[a.severity] - ORDER[b.severity],
  );
  const findings = results.flatMap((result) => result.findings);

  const rawScore = signals.reduce((sum, signal) => sum + WEIGHT[signal.severity], 0);
  const score = Math.min(100, Math.max(0, rawScore));
  const level = decideLevel(signals, findings, score);

  return { level, score, title: TITLES[level], signals, findings, advice: pickAdvice(level, signals, findings) };
}
