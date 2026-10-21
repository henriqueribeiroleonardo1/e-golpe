/** Código de compensação (3 dígitos) → nome curto da instituição. */
export const BANKS: Readonly<Record<string, string>> = {
  '001': 'Banco do Brasil',
  '004': 'Banco do Nordeste',
  '021': 'Banestes',
  '033': 'Santander',
  '041': 'Banrisul',
  '070': 'BRB',
  '077': 'Banco Inter',
  '104': 'Caixa',
  '197': 'Stone',
  '208': 'BTG Pactual',
  '212': 'Banco Original',
  '237': 'Bradesco',
  '260': 'Nubank',
  '290': 'PagBank',
  '323': 'Mercado Pago',
  '336': 'C6 Bank',
  '341': 'Itaú',
  '380': 'PicPay',
  '403': 'Cora',
  '422': 'Safra',
  '655': 'Banco Votorantim',
  '748': 'Sicredi',
  '756': 'Sicoob',
};

export function bankName(code: string): string {
  const name = BANKS[code];
  return name ? `${name} (${code})` : `banco ${code}`;
}
