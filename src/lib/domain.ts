/**
 * Sufixos com mais de um nível que importam para o público brasileiro.
 * É um recorte da Public Suffix List: suficiente para achar o "domínio de verdade"
 * (ex.: itau.com.br) sem carregar a lista inteira.
 */
// prettier-ignore
const MULTI_LEVEL_SUFFIXES = new Set([
  // Brasil (registro.br)
  'com.br', 'net.br', 'org.br', 'gov.br', 'edu.br', 'mil.br', 'jus.br', 'leg.br', 'mp.br',
  'art.br', 'blog.br', 'app.br', 'dev.br', 'eco.br', 'emp.br', 'ind.br', 'inf.br', 'log.br',
  'med.br', 'nom.br', 'tv.br', 'tec.br', 'srv.br', 'adv.br', 'eng.br', 'wiki.br', 'vlog.br',
  // Outros países comuns em golpes que chegam aqui
  'co.uk', 'com.ar', 'com.mx', 'com.pt', 'com.co', 'com.au',
]);

/**
 * Serviços onde qualquer pessoa cria um site de graça em segundos.
 * Tratados como sufixo, então `golpe.github.io` vira o domínio `golpe.github.io`.
 */
// prettier-ignore
export const FREE_HOSTING_SUFFIXES = new Set([
  'github.io', 'vercel.app', 'netlify.app', 'pages.dev', 'workers.dev', 'web.app',
  'firebaseapp.com', 'herokuapp.com', 'onrender.com', 'glitch.me', 'blogspot.com',
  'wixsite.com', 'weebly.com', 'webflow.io', 'carrd.co', 'ngrok.io', 'ngrok-free.app',
  '000webhostapp.com', 'replit.app', 'godaddysites.com', 'square.site',
]);

export interface ParsedHost {
  hostname: string;
  /** Domínio registrável: o que alguém de fato comprou (ex.: itau.com.br). */
  domain: string;
  /** Domínio sem o sufixo (ex.: "itau"). */
  label: string;
  suffix: string;
  isIp: boolean;
  isFreeHosting: boolean;
}

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

export function parseHost(hostname: string): ParsedHost {
  const host = hostname.toLowerCase().replace(/\.$/, '');

  if (IPV4.test(host) || host.startsWith('[')) {
    return { hostname: host, domain: host, label: host, suffix: '', isIp: true, isFreeHosting: false };
  }

  const parts = host.split('.');
  const lastTwo = parts.slice(-2).join('.');
  const isFreeHosting = FREE_HOSTING_SUFFIXES.has(lastTwo);
  const suffixSize = isFreeHosting || MULTI_LEVEL_SUFFIXES.has(lastTwo) ? 2 : 1;

  const suffix = parts.slice(-suffixSize).join('.');
  const label = parts.at(-suffixSize - 1) ?? '';
  const domain = label ? `${label}.${suffix}` : suffix;

  return { hostname: host, domain, label, suffix, isIp: false, isFreeHosting };
}

/** `true` para o próprio domínio e qualquer subdomínio dele. */
export function hostBelongsTo(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}
