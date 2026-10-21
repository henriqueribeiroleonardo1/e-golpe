/** Resultado final mostrado para quem encaminhou a mensagem. */
export type RiskLevel = 'safe' | 'caution' | 'danger' | 'inconclusive';

/** Quanto um sinal pesa no veredito. `trust` reduz o risco. */
export type Severity = 'low' | 'medium' | 'high' | 'critical' | 'trust';

export type SignalCategory = 'script' | 'link' | 'boleto' | 'pix';

/** Um motivo concreto, em português, que explica o veredito. */
export interface Signal {
  id: string;
  category: SignalCategory;
  severity: Severity;
  reason: string;
  advice?: string;
}

export interface LinkFinding {
  kind: 'link';
  url: string;
  hostname: string;
  officialBrand?: string;
  ageDays?: number;
}

export interface BoletoFinding {
  kind: 'boleto';
  type: 'bancario' | 'arrecadacao';
  valid: boolean;
  issuer?: string;
  amount?: number;
  /** Data no formato ISO (AAAA-MM-DD). */
  dueDate?: string;
}

export type PixKeyType = 'cpf' | 'cnpj' | 'phone' | 'email' | 'random';

export interface PixFinding {
  kind: 'pix';
  source: 'key' | 'brcode';
  keyType?: PixKeyType;
  key?: string;
  receiverName?: string;
  city?: string;
  amount?: number;
}

/** Algo que o motor reconheceu na mensagem, mesmo sem ser suspeito. */
export type Finding = LinkFinding | BoletoFinding | PixFinding;

export interface Analysis {
  level: RiskLevel;
  /** 0 a 100. Quanto maior, mais arriscado. */
  score: number;
  title: string;
  signals: Signal[];
  findings: Finding[];
  advice: string;
}

export interface AnalyzerResult {
  signals: Signal[];
  findings: Finding[];
}

export const EMPTY_RESULT: AnalyzerResult = Object.freeze({ signals: [], findings: [] }) as AnalyzerResult;
