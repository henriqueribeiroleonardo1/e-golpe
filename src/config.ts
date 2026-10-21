export interface Config {
  port: number;
  /** Consulta a idade dos domínios via RDAP. Desligue para rodar 100% offline. */
  domainAgeLookup: boolean;
  telegram?: { token: string; webhookSecret?: string };
  whatsapp?: { token: string; phoneNumberId: string; verifyToken: string; appSecret: string; graphVersion: string };
}

export class ConfigError extends Error {
  override name = 'ConfigError';
}

type Env = Record<string, string | undefined>;

const WHATSAPP_VARS = [
  'WHATSAPP_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_VERIFY_TOKEN',
  'WHATSAPP_APP_SECRET',
] as const;

function readPort(value: string | undefined): number {
  const port = Number(value ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new ConfigError(`PORT inválida: "${value}"`);
  return port;
}

function readWhatsApp(env: Env): Config['whatsapp'] {
  const present = WHATSAPP_VARS.filter((name) => env[name]);
  if (present.length === 0) return undefined;

  const missing = WHATSAPP_VARS.filter((name) => !env[name]);
  if (missing.length > 0) throw new ConfigError(`Para ligar o WhatsApp, defina também: ${missing.join(', ')}`);

  return {
    token: env.WHATSAPP_TOKEN as string,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID as string,
    verifyToken: env.WHATSAPP_VERIFY_TOKEN as string,
    appSecret: env.WHATSAPP_APP_SECRET as string,
    graphVersion: env.WHATSAPP_GRAPH_VERSION ?? 'v23.0',
  };
}

/** Lê e valida as variáveis de ambiente. Canais sem credenciais ficam desligados. */
export function loadConfig(env: Env = process.env): Config {
  const telegramToken = env.TELEGRAM_BOT_TOKEN;
  const whatsapp = readWhatsApp(env);

  return {
    port: readPort(env.PORT),
    domainAgeLookup: env.DOMAIN_AGE_LOOKUP !== 'off',
    ...(telegramToken && {
      telegram: {
        token: telegramToken,
        ...(env.TELEGRAM_WEBHOOK_SECRET && { webhookSecret: env.TELEGRAM_WEBHOOK_SECRET }),
      },
    }),
    ...(whatsapp && { whatsapp }),
  };
}
