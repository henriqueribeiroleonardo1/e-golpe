import type { Analyzer } from './channels/conversation.js';
import { createTelegramChannel, type TelegramChannel } from './channels/telegram.js';
import { createWhatsAppChannel, type WhatsAppChannel } from './channels/whatsapp.js';
import type { Config } from './config.js';
import { analyzeMessage, createRdapLookup } from './core/index.js';

export interface Services {
  analyze: Analyzer;
  telegram?: TelegramChannel;
  whatsapp?: WhatsAppChannel;
}

/** Monta as dependências a partir da configuração. Único lugar que conhece todas as peças. */
export function createServices(config: Config): Services {
  const lookupDomainAge = config.domainAgeLookup ? createRdapLookup() : undefined;
  const analyze: Analyzer = (text) => analyzeMessage(text, lookupDomainAge ? { lookupDomainAge } : {});

  return {
    analyze,
    ...(config.telegram && { telegram: createTelegramChannel({ ...config.telegram, analyze }) }),
    ...(config.whatsapp && { whatsapp: createWhatsAppChannel({ ...config.whatsapp, analyze }) }),
  };
}

export function loadDotEnv(): void {
  try {
    process.loadEnvFile();
  } catch {
    // Sem arquivo .env: usamos só as variáveis do ambiente.
  }
}
