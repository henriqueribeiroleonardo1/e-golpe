import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzeMessage } from '../src/core/index.js';
import { CASES } from '../src/web/acervo.js';

describe('acervo de golpes', () => {
  for (const scam of CASES) {
    it(`sinaliza o exemplo "${scam.title}"`, async () => {
      const analysis = await analyzeMessage(scam.example);
      assert.ok(
        analysis.level === 'danger' || analysis.level === 'caution',
        `veio ${analysis.level}: ${analysis.signals.map((s) => s.id).join(', ')}`,
      );
    });
  }

  it('tem ids únicos', () => {
    assert.equal(new Set(CASES.map((scam) => scam.id)).size, CASES.length);
  });
});

describe('regras novas', () => {
  const cases: [string, string][] = [
    ['overpayment', 'Paguei a mais sem querer, devolve a diferença?'],
    ['account-update', 'Faça seu recadastramento para não perder o acesso'],
    ['off-platform', 'Vamos fechar fora do app, me chama no whatsapp'],
    ['advance-fee', 'Crédito aprovado! Pague a taxa de liberação para receber'],
    ['dda-charge', 'Apareceu um boleto DDA no meu app'],
    ['unsolicited-charge', 'Boleto de anuidade de registro de marca'],
    ['card-pickup', 'O motoboy do banco vai buscar seu cartão hoje'],
    ['fake-auction', 'Leilão do carro: pague a caução para reservar'],
  ];
  for (const [id, text] of cases) {
    it(`reconhece ${id}`, async () => {
      const analysis = await analyzeMessage(text);
      assert.ok(
        analysis.signals.some((signal) => signal.id === id),
        analysis.signals.map((s) => s.id).join(', '),
      );
    });
  }
});
