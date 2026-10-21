import { maskCpf } from '../lib/br-documents.js';
import { formatBRL, formatIsoDate } from '../lib/text.js';
import type { Analysis, Finding, PixKeyType, RiskLevel } from './types.js';

export const LIGHTS: Record<RiskLevel, string> = { danger: '🔴', caution: '🟡', safe: '🟢', inconclusive: '⚪' };

const KEY_LABEL: Record<PixKeyType, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  phone: 'celular',
  email: 'e-mail',
  random: 'aleatória',
};

const MAX_REASONS = 4;

function ageLabel(days: number): string {
  if (days < 1) return 'criado hoje';
  if (days < 60) return `criado há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  if (days < 730) return `criado há ${Math.round(days / 30)} meses`;
  return `no ar há ${Math.floor(days / 365)} anos`;
}

export function describeFinding(finding: Finding): string {
  switch (finding.kind) {
    case 'link': {
      const notes = [finding.officialBrand && 'oficial', finding.ageDays !== undefined && ageLabel(finding.ageDays)];
      const extra = notes.filter(Boolean).join(', ');
      return `Link: ${finding.hostname}${extra ? ` (${extra})` : ''}`;
    }
    case 'boleto': {
      if (!finding.valid) return 'Boleto com dígitos inválidos';
      const parts = [
        finding.issuer,
        finding.amount !== undefined && formatBRL(finding.amount),
        finding.dueDate && `vence ${formatIsoDate(finding.dueDate)}`,
      ];
      return `Boleto: ${parts.filter(Boolean).join(' · ')}`;
    }
    case 'pix': {
      if (finding.source === 'brcode') {
        const receiver = finding.receiverName ? ` para ${finding.receiverName}` : '';
        const city = finding.city ? ` (${finding.city})` : '';
        const amount = finding.amount !== undefined ? ` · ${formatBRL(finding.amount)}` : '';
        return `Pix copia e cola${receiver}${city}${amount}`;
      }
      const key = finding.keyType === 'cpf' && finding.key ? maskCpf(finding.key) : finding.key;
      return `Chave Pix (${KEY_LABEL[finding.keyType ?? 'random']}): ${key}`;
    }
  }
}

/** Como cada chat marca negrito e escapa texto. */
export interface ReplyStyle {
  bold: (text: string) => string;
  escape: (text: string) => string;
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const WHATSAPP_STYLE: ReplyStyle = { bold: (text) => `*${text}*`, escape: (text) => text };
export const TELEGRAM_HTML_STYLE: ReplyStyle = { bold: (text) => `<b>${escapeHtml(text)}</b>`, escape: escapeHtml };

/** Texto pronto para responder no chat. */
export function formatReply(analysis: Analysis, style: ReplyStyle = WHATSAPP_STYLE): string {
  const { bold, escape } = style;
  const lines = [`${LIGHTS[analysis.level]} ${bold(analysis.title)}`];

  const risks = analysis.signals.filter((signal) => signal.severity !== 'trust').slice(0, MAX_REASONS);
  const trusts = analysis.level === 'danger' ? [] : analysis.signals.filter((signal) => signal.severity === 'trust');

  if (risks.length > 0 || trusts.length > 0) {
    lines.push(
      '',
      'Por quê:',
      ...risks.map((s) => `• ${escape(s.reason)}`),
      ...trusts.map((s) => `✓ ${escape(s.reason)}`),
    );
  }
  if (analysis.findings.length > 0) {
    lines.push('', 'O que encontrei:', ...analysis.findings.map((finding) => `• ${escape(describeFinding(finding))}`));
  }

  lines.push('', `${bold('O que fazer:')} ${escape(analysis.advice)}`);
  return lines.join('\n');
}
