import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzeMessage, formatReply, type Analysis, type DomainAgeLookup } from '../src/core/index.js';
import { BRCODE_ITAU, BRCODE_PERSON, TAMPERED_BOLETO, TODAY, VALID_BOLETO, VALID_CPF } from './fixtures.js';

const analyze = (text: string, lookupDomainAge?: DomainAgeLookup) =>
  analyzeMessage(text, { now: TODAY, ...(lookupDomainAge && { lookupDomainAge }) });

const ids = (analysis: Analysis) => analysis.signals.map((signal) => signal.id.split(':')[0]);

describe('roteiros de golpe', () => {
  it('pega o golpe do falso parente', async () => {
    const result = await analyze(
      'Oi mãe, troquei de número. Salva esse aqui. Consegue me fazer um Pix de R$ 1.850 agora? É urgente. Não comenta com o pai.',
    );
    assert.equal(result.level, 'danger');
    assert.deepEqual(ids(result).slice(0, 1), ['fake-relative']);
    assert.ok(ids(result).includes('secrecy'));
  });

  it('pega a falsa central do banco', async () => {
    const result = await analyze(
      'Aqui é da central de segurança do Itaú. Identificamos uma compra suspeita. Transfira seu saldo para a conta de segurança.',
    );
    assert.equal(result.level, 'danger');
    assert.ok(ids(result).includes('safe-account'));
  });

  it('pega pedido de código do WhatsApp', async () => {
    const result = await analyze('Te mandei um código por SMS sem querer, me passa o código por favor?');
    assert.equal(result.level, 'danger');
    assert.ok(ids(result).includes('code-request'));
  });

  it('não acusa conversa comum', async () => {
    const result = await analyze('Oi mãe, chego pro almoço às 13h. Quer que eu leve pão?');
    assert.equal(result.level, 'inconclusive');
  });
});

describe('links', () => {
  it('pega domínio que usa o nome de um banco', async () => {
    const result = await analyze('Seu acesso foi bloqueado, regularize em itau-seguranca.com/login');
    assert.equal(result.level, 'danger');
    assert.ok(ids(result).includes('impersonation'));
  });

  it('pega letras trocadas', async () => {
    const result = await analyze('Confira sua fatura: https://nubamk.com.br');
    assert.ok(ids(result).includes('typosquat'));
  });

  it('confia no domínio oficial', async () => {
    const result = await analyze('Sua fatura está em https://www.itau.com.br/cartoes');
    assert.equal(result.level, 'safe');
    assert.equal(result.signals[0]?.severity, 'trust');
  });

  it('desconfia de link encurtado', async () => {
    const result = await analyze('Olha isso: https://bit.ly/3xYz');
    assert.equal(result.level, 'caution');
  });

  it('usa a idade do domínio quando a consulta está disponível', async () => {
    const lookup: DomainAgeLookup = async () => 3;
    const result = await analyze('Sua encomenda está retida: https://entrega-rapida.top/pagar', lookup);
    assert.equal(result.level, 'danger');
    assert.ok(ids(result).includes('new-domain'));
    assert.match(formatReply(result), /criado há 3 dias/);
  });

  it('segue funcionando se a consulta de idade falhar', async () => {
    const lookup: DomainAgeLookup = async () => {
      throw new Error('sem internet');
    };
    const result = await analyze('Veja https://exemplo.com.br', lookup);
    assert.equal(result.level, 'safe');
  });
});

describe('boletos', () => {
  it('mostra banco, valor e vencimento de um boleto válido', async () => {
    const result = await analyze(`Segue o boleto do condomínio: ${VALID_BOLETO}`);
    assert.equal(result.level, 'safe');
    assert.match(formatReply(result), /Itaú \(341\) · R\$\s450,00 · vence 10\/11\/2026/);
  });

  it('alerta sobre boleto adulterado', async () => {
    const result = await analyze(`Segue o novo boleto atualizado: ${TAMPERED_BOLETO}`);
    assert.equal(result.level, 'danger');
    assert.ok(ids(result).includes('boleto-invalid'));
  });
});

describe('Pix', () => {
  it('avisa quando a marca da mensagem não bate com o recebedor', async () => {
    const result = await analyze(`Itaú: pague sua fatura com desconto pelo Pix ${BRCODE_PERSON}`);
    assert.equal(result.level, 'caution');
    assert.match(result.signals[0]?.reason ?? '', /vai para JOAO DA SILVA/);
  });

  it('aceita quando o recebedor é a própria marca', async () => {
    const result = await analyze(`Itaú: pague sua fatura pelo Pix ${BRCODE_ITAU}`);
    assert.equal(result.level, 'safe');
  });

  it('desconfia de empresa com chave de pessoa física e esconde o CPF', async () => {
    const result = await analyze(`Loja Virtual: faça o pagamento na chave pix ${VALID_CPF}`);
    assert.ok(ids(result).includes('personal-key'));
    assert.match(formatReply(result), /\*\*\*\.982\.247-\*\*/);
    assert.doesNotMatch(formatReply(result), /529/);
  });
});
