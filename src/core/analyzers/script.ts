import { COMBO_RULES, SCRIPT_RULES } from '../data/scam-scripts.js';
import type { AnalyzerResult, Severity, Signal } from '../types.js';

interface RuleLike {
  id: string;
  severity: Severity;
  reason: string;
  advice?: string;
}

const toSignal = ({ id, severity, reason, advice }: RuleLike): Signal => ({
  id,
  category: 'script',
  severity,
  reason,
  ...(advice && { advice }),
});

/** Procura roteiros de golpe conhecidos no texto já normalizado. */
export function analyzeScript(normalizedText: string): AnalyzerResult {
  const matched = SCRIPT_RULES.filter((rule) => rule.patterns.some((pattern) => pattern.test(normalizedText)));
  const matchedIds = new Set(matched.map((rule) => rule.id));
  const combos = COMBO_RULES.filter((combo) => combo.requires.every((id) => matchedIds.has(id)));

  return { signals: [...combos, ...matched].map(toSignal), findings: [] };
}
