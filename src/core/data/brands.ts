import { normalize } from '../../lib/text.js';

export interface Brand {
  name: string;
  /** Palavras que aparecem em domínios falsos (já sem acento). */
  keywords: string[];
  /** Domínios oficiais. Subdomínios também contam. */
  official: string[];
  /** Como a marca aparece escrita numa mensagem. */
  mentions: RegExp;
}

const GOV = 'gov.br';

/** Marcas mais imitadas em golpes no Brasil. */
export const BRANDS: Brand[] = [
  { name: 'Itaú', keywords: ['itau'], official: ['itau.com.br', 'itau.com'], mentions: /\bitau\b/ },
  { name: 'Bradesco', keywords: ['bradesco'], official: ['bradesco.com.br', 'bradesco'], mentions: /\bbradesco\b/ },
  { name: 'Santander', keywords: ['santander'], official: ['santander.com.br'], mentions: /\bsantander\b/ },
  {
    name: 'Caixa',
    keywords: ['caixa'],
    official: ['caixa.gov.br'],
    mentions: /\b(caixa economica|da caixa|app caixa|caixa tem)\b/,
  },
  {
    name: 'Banco do Brasil',
    keywords: ['bancodobrasil', 'bb'],
    official: ['bb.com.br'],
    mentions: /\bbanco do brasil\b/,
  },
  { name: 'Nubank', keywords: ['nubank'], official: ['nubank.com.br', 'nu.com.br'], mentions: /\bnubank\b/ },
  {
    name: 'Banco Inter',
    keywords: ['bancointer'],
    official: ['bancointer.com.br', 'inter.co'],
    mentions: /\bbanco inter\b/,
  },
  { name: 'C6 Bank', keywords: ['c6bank'], official: ['c6bank.com.br'], mentions: /\bc6( bank)?\b/ },
  { name: 'PicPay', keywords: ['picpay'], official: ['picpay.com'], mentions: /\bpicpay\b/ },
  {
    name: 'Mercado Pago',
    keywords: ['mercadopago'],
    official: ['mercadopago.com.br', 'mercadopago.com'],
    mentions: /\bmercado ?pago\b/,
  },
  {
    name: 'Mercado Livre',
    keywords: ['mercadolivre', 'mercadolibre'],
    official: ['mercadolivre.com.br', 'mercadolibre.com'],
    mentions: /\bmercado ?livre\b/,
  },
  { name: 'Correios', keywords: ['correios'], official: ['correios.com.br'], mentions: /\bcorreios\b/ },
  { name: 'Receita Federal', keywords: ['receitafederal'], official: [GOV], mentions: /\breceita federal\b/ },
  { name: 'gov.br', keywords: ['gov', 'govbr'], official: [GOV], mentions: /\bgov\.?br\b/ },
  { name: 'Detran', keywords: ['detran'], official: [GOV], mentions: /\bdetran\b/ },
  { name: 'Banco Central', keywords: ['bancocentral', 'bcb'], official: ['bcb.gov.br'], mentions: /\bbanco central\b/ },
  { name: 'Serasa', keywords: ['serasa'], official: ['serasa.com.br'], mentions: /\bserasa\b/ },
  { name: 'Shopee', keywords: ['shopee'], official: ['shopee.com.br', 'shopee.com'], mentions: /\bshopee\b/ },
  {
    name: 'Magalu',
    keywords: ['magalu', 'magazineluiza'],
    official: ['magazineluiza.com.br', 'magalu.com', 'magalu.com.br'],
    mentions: /\b(magalu|magazine luiza)\b/,
  },
  { name: 'Americanas', keywords: ['americanas'], official: ['americanas.com.br'], mentions: /\bamericanas\b/ },
  { name: 'Amazon', keywords: ['amazon'], official: ['amazon.com.br', 'amazon.com'], mentions: /\bamazon\b/ },
  { name: 'iFood', keywords: ['ifood'], official: ['ifood.com.br'], mentions: /\bifood\b/ },
  { name: 'Netflix', keywords: ['netflix'], official: ['netflix.com'], mentions: /\bnetflix\b/ },
  { name: 'WhatsApp', keywords: ['whatsapp'], official: ['whatsapp.com', 'wa.me'], mentions: /\bwhatsapp suporte\b/ },
  { name: 'Instagram', keywords: ['instagram'], official: ['instagram.com'], mentions: /\binstagram suporte\b/ },
];

export function brandsMentionedIn(normalizedText: string): Brand[] {
  return BRANDS.filter((brand) => brand.mentions.test(normalizedText));
}

/** O nome do recebedor do Pix bate com a marca? (ex.: "ITAU UNIBANCO SA" e Itaú) */
export function nameMatchesBrand(name: string, brand: Brand): boolean {
  const compact = normalize(name).replace(/[^a-z0-9]/g, '');
  return brand.keywords.some((keyword) => keyword.length > 2 && compact.includes(keyword));
}
