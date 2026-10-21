import { normalize } from '../lib/text.js';
import { analyzeBoletos } from './analyzers/boleto.js';
import { analyzeLinks, type DomainAgeLookup } from './analyzers/links.js';
import { analyzePix } from './analyzers/pix.js';
import { analyzeScript } from './analyzers/script.js';
import { brandsMentionedIn } from './data/brands.js';
import { extract } from './extract.js';
import type { Analysis } from './types.js';
import { buildAnalysis } from './verdict.js';

export const MAX_MESSAGE_LENGTH = 5_000;

export interface AnalyzeOptions {
  /** Data de referência para vencimentos. Útil em testes. */
  now?: Date;
  /** Consulta da idade do domínio. Sem ela, a análise roda 100% offline. */
  lookupDomainAge?: DomainAgeLookup;
}

/** Ponto de entrada do motor: recebe o texto encaminhado e devolve o veredito. */
export async function analyzeMessage(text: string, options: AnalyzeOptions = {}): Promise<Analysis> {
  const message = text.slice(0, MAX_MESSAGE_LENGTH);
  const normalizedText = normalize(message);
  const extracted = extract(message);
  const now = options.now ?? new Date();

  const results = await Promise.all([
    analyzeScript(normalizedText),
    analyzeLinks(extracted.urls, options.lookupDomainAge),
    analyzeBoletos(extracted.boletoLines, now),
    analyzePix({
      brCodes: extracted.brCodes,
      keys: extracted.pixKeys,
      normalizedText,
      brands: brandsMentionedIn(normalizedText),
    }),
  ]);

  return buildAnalysis(results);
}
