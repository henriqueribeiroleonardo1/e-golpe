import type { DomainAgeLookup } from './analyzers/links.js';

/**
 * Descobre a data de criação de um domínio pelo RDAP, o sucessor público e gratuito do WHOIS.
 * Domínios .br vão direto ao Registro.br; o resto passa pelo rdap.org, que redireciona
 * para o registro certo.
 */
export interface RdapOptions {
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  cacheTtlMs?: number;
  now?: () => number;
}

interface RdapEvent {
  eventAction?: string;
  eventDate?: string;
}

const DAY_MS = 86_400_000;

function rdapUrl(domain: string): string {
  const base = domain.endsWith('.br') ? 'https://rdap.registro.br/domain/' : 'https://rdap.org/domain/';
  return base + encodeURIComponent(domain);
}

export function createRdapLookup(options: RdapOptions = {}): DomainAgeLookup {
  const { fetch = globalThis.fetch, timeoutMs = 3_000, cacheTtlMs = 6 * 60 * 60 * 1000, now = Date.now } = options;
  const cache = new Map<string, { registeredAt: number | null; expiresAt: number }>();

  async function registrationDate(domain: string): Promise<number | null> {
    const response = await fetch(rdapUrl(domain), {
      headers: { accept: 'application/rdap+json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;

    const body = (await response.json()) as { events?: RdapEvent[] };
    const event = body.events?.find((e) => e.eventAction === 'registration');
    const time = event?.eventDate ? Date.parse(event.eventDate) : Number.NaN;
    return Number.isNaN(time) ? null : time;
  }

  return async (domain) => {
    const cached = cache.get(domain);
    let registeredAt: number | null;

    if (cached && cached.expiresAt > now()) {
      registeredAt = cached.registeredAt;
    } else {
      registeredAt = await registrationDate(domain).catch(() => null);
      cache.set(domain, { registeredAt, expiresAt: now() + cacheTtlMs });
    }

    return registeredAt === null ? null : Math.max(0, Math.floor((now() - registeredAt) / DAY_MS));
  };
}
