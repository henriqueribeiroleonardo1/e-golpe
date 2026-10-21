import { hostBelongsTo, parseHost, type ParsedHost } from '../../lib/domain.js';
import { levenshtein, normalize } from '../../lib/text.js';
import { BRANDS, type Brand } from '../data/brands.js';
import type { ExtractedUrl } from '../extract.js';
import type { AnalyzerResult, LinkFinding, Severity, Signal } from '../types.js';

/** Devolve há quantos dias o domínio foi registrado, ou `null` se não souber. */
export type DomainAgeLookup = (domain: string) => Promise<number | null>;

// prettier-ignore
const SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 'cutt.ly', 'is.gd', 'rebrand.ly', 'shorturl.at', 'encurtador.com.br',
  'encr.pw', 'abre.ai', 'l1nq.com', 'tiny.cc', 'ow.ly', 'buff.ly', 's.id', 'rb.gy', 'v.gd', 'surl.li', 'urlz.fr',
]);

/** Extensões baratas ou gratuitas que aparecem muito em campanhas de phishing. */
// prettier-ignore
const CHEAP_TLDS = new Set([
  'top', 'xyz', 'icu', 'shop', 'online', 'site', 'click', 'live', 'buzz', 'cyou', 'sbs', 'rest', 'lat', 'vip', 'fun', 'space', 'website', 'monster', 'cfd',
]);

// prettier-ignore
const BAIT_WORDS = [
  'rastreio', 'rastreamento', 'taxa', 'regulariza', 'desbloque', 'atualiza', 'cadastro', 'premio', 'resgat',
  'seguranca', 'verifica', 'confirma', 'pendencia', 'liberacao', 'cupom', 'brinde', 'saque', 'fgts', 'indeniza',
];

/** Dígitos e combinações usados para imitar letras: n1bank, itaú com "rn" no lugar de "m"... */
const LOOKALIKES: [RegExp, string][] = [
  [/0/g, 'o'],
  [/1/g, 'i'],
  [/3/g, 'e'],
  [/4/g, 'a'],
  [/5/g, 's'],
  [/rn/g, 'm'],
  [/vv/g, 'w'],
];

const NEW_DOMAIN_DAYS = 30;
const RECENT_DOMAIN_DAYS = 180;
const DONT_OPEN = 'Não abra o link. Se precisar, entre no site digitando o endereço você mesmo ou use o app oficial.';

const signal = (id: string, severity: Severity, reason: string, advice = DONT_OPEN): Signal => ({
  id,
  category: 'link',
  severity,
  reason,
  ...(severity !== 'trust' && { advice }),
});

const findOfficialBrand = (hostname: string) =>
  BRANDS.find((brand) => brand.official.some((domain) => hostBelongsTo(hostname, domain)));

function findImpersonatedBrand(host: ParsedHost): Brand | undefined {
  const tokens = host.hostname.split(/[.-]/);
  const compact = host.hostname.replace(/[.-]/g, '');
  return BRANDS.find((brand) =>
    brand.keywords.some((keyword) => tokens.includes(keyword) || (keyword.length >= 6 && compact.includes(keyword))),
  );
}

function findTyposquattedBrand(label: string): Brand | undefined {
  const unmasked = LOOKALIKES.reduce((text, [pattern, letter]) => text.replace(pattern, letter), label);
  return BRANDS.find((brand) =>
    brand.keywords.some((keyword) => {
      if (keyword.length < 5) return false;
      if (unmasked === keyword && label !== keyword) return true;
      const distance = levenshtein(label, keyword);
      return distance > 0 && distance <= (keyword.length >= 8 ? 2 : 1);
    }),
  );
}

function ageText(days: number): string {
  if (days < 1) return 'hoje';
  if (days === 1) return 'há 1 dia';
  if (days < 60) return `há ${days} dias`;
  return `há ${Math.round(days / 30)} meses`;
}

/** Verificações que não precisam de internet. */
function staticChecks({ url, explicitScheme }: ExtractedUrl, host: ParsedHost): Signal[] {
  const name = host.hostname;
  const signals: Signal[] = [];
  const add = (id: string, severity: Severity, reason: string, advice?: string) =>
    signals.push(signal(`${id}:${name}`, severity, reason, advice));

  if (url.username) add('hidden-host', 'high', `O link esconde o endereço real (${name}) atrás de um @`);
  if (host.isIp) add('ip-host', 'high', 'O link usa números no lugar do nome de um site');
  if (name.includes('xn--'))
    add('punycode', 'high', `${name} usa letras de outros alfabetos para imitar um endereço conhecido`);

  if (SHORTENERS.has(host.domain)) {
    add(
      'shortener',
      'medium',
      `Link encurtado (${host.domain}) esconde o destino real`,
      'Não abra. Peça o endereço completo a quem mandou.',
    );
  }
  if (host.isFreeHosting) add('free-hosting', 'medium', `${name} está num serviço onde qualquer um cria site de graça`);

  const impersonated = findImpersonatedBrand(host);
  const typosquatted = impersonated ? undefined : findTyposquattedBrand(host.label);
  const brand = impersonated ?? typosquatted;
  const officialAdvice = brand && `Entre digitando ${brand.official[0]} no navegador ou pelo app oficial.`;

  if (impersonated)
    add(
      'impersonation',
      'critical',
      `${name} usa o nome ${impersonated.name}, mas não é um site oficial`,
      officialAdvice,
    );
  if (typosquatted)
    add('typosquat', 'high', `${name} imita ${typosquatted.official[0]} com letras trocadas`, officialAdvice);

  if (CHEAP_TLDS.has(host.suffix))
    add('cheap-tld', 'low', `Termina em .${host.suffix}, extensão barata muito usada em golpes`);
  if (explicitScheme && url.protocol === 'http:') add('no-https', 'low', `${name} não usa conexão segura (https)`);
  if (name.split('.').length - host.domain.split('.').length >= 3)
    add('deep-subdomain', 'low', `${name} tem subdomínios demais`);

  const bait = BAIT_WORDS.find((word) => normalize(`${name}${url.pathname}`).includes(word));
  if (bait) add('bait-word', 'low', `O endereço usa palavras de isca como "${bait}"`);

  return signals;
}

async function checkUrl(extracted: ExtractedUrl, lookupAge?: DomainAgeLookup): Promise<AnalyzerResult> {
  const host = parseHost(extracted.url.hostname);
  const finding: LinkFinding = { kind: 'link', url: extracted.url.href, hostname: host.hostname };

  const official = extracted.url.username ? undefined : findOfficialBrand(host.hostname);
  if (official) {
    finding.officialBrand = official.name;
    return {
      signals: [
        signal(`official:${host.domain}`, 'trust', `${host.hostname} é um endereço oficial de ${official.name}`),
      ],
      findings: [finding],
    };
  }

  const signals = staticChecks(extracted, host);

  if (lookupAge && !host.isIp && !host.isFreeHosting) {
    const ageDays = await lookupAge(host.domain).catch(() => null);
    if (ageDays !== null) {
      finding.ageDays = ageDays;
      if (ageDays <= NEW_DOMAIN_DAYS) {
        signals.push(signal(`new-domain:${host.domain}`, 'high', `${host.domain} foi criado ${ageText(ageDays)}`));
      } else if (ageDays <= RECENT_DOMAIN_DAYS) {
        signals.push(signal(`recent-domain:${host.domain}`, 'medium', `${host.domain} foi criado ${ageText(ageDays)}`));
      }
    }
  }

  return { signals, findings: [finding] };
}

export async function analyzeLinks(urls: ExtractedUrl[], lookupAge?: DomainAgeLookup): Promise<AnalyzerResult> {
  const results = await Promise.all(urls.map((url) => checkUrl(url, lookupAge)));
  return {
    signals: results.flatMap((result) => result.signals),
    findings: results.flatMap((result) => result.findings),
  };
}
