/**
 * Exemplos gerados por uma implementação independente (Python) das regras da FEBRABAN
 * e do Banco Central, para que os testes não validem o código contra ele mesmo.
 */
export const VALID_BOLETO = '34191.09123 34567.812341 56789.012301 1 16260000045000';
/** Mesmo boleto com o valor trocado de R$ 450 para R$ 1.450. */
export const TAMPERED_BOLETO = '34191.09123 34567.812341 56789.012301 1 16260000145000';
export const VALID_UTILITY_BOLETO = '83660000001-9 23450109000-0 00000000000-0 00000000000-0';

export const BRCODE_PERSON =
  '00020126330014br.gov.bcb.pix01115299822472552040000530398654071850.005802BR5913JOAO DA SILVA6009SAO PAULO62070503***630458AC';
export const BRCODE_ITAU =
  '00020126360014br.gov.bcb.pix011460701190000104520400005303986540599.905802BR5916ITAU UNIBANCO SA6009SAO PAULO62070503***63041938';

export const VALID_CPF = '529.982.247-25';
export const VALID_CNPJ = '60.701.190/0001-04';

/** Data fixa para os testes de vencimento. */
export const TODAY = new Date('2026-10-21T12:00:00Z');
