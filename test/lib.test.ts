import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseBoleto } from '../src/lib/boleto.js';
import { isValidCnpj, isValidCpf, maskCpf } from '../src/lib/br-documents.js';
import { parseHost } from '../src/lib/domain.js';
import { crc16, findBrCodes, parseBrCode } from '../src/lib/pix-brcode.js';
import { levenshtein, normalize } from '../src/lib/text.js';
import {
  BRCODE_PERSON,
  TAMPERED_BOLETO,
  TODAY,
  VALID_BOLETO,
  VALID_CNPJ,
  VALID_CPF,
  VALID_UTILITY_BOLETO,
} from './fixtures.js';

describe('text', () => {
  it('normaliza acentos, caixa e espaços', () => {
    assert.equal(normalize('  Olá,   MÃE!  '), 'ola, mae!');
  });

  it('calcula distância de edição', () => {
    assert.equal(levenshtein('nubank', 'nubamk'), 1);
    assert.equal(levenshtein('itau', 'itau'), 0);
  });
});

describe('documentos', () => {
  it('valida CPF e CNPJ pelos dígitos verificadores', () => {
    assert.ok(isValidCpf(VALID_CPF));
    assert.ok(!isValidCpf('529.982.247-24'));
    assert.ok(!isValidCpf('111.111.111-11'));
    assert.ok(isValidCnpj(VALID_CNPJ));
    assert.ok(!isValidCnpj('60.701.190/0001-05'));
  });

  it('mascara o CPF', () => {
    assert.equal(maskCpf(VALID_CPF), '***.982.247-**');
  });
});

describe('domínio', () => {
  it('acha o domínio registrável em sufixos brasileiros', () => {
    const host = parseHost('www.itau.com.br');
    assert.equal(host.domain, 'itau.com.br');
    assert.equal(host.label, 'itau');
  });

  it('trata hospedagem gratuita como sufixo', () => {
    const host = parseHost('itau-app.web.app');
    assert.equal(host.domain, 'itau-app.web.app');
    assert.ok(host.isFreeHosting);
  });

  it('reconhece IP', () => {
    assert.ok(parseHost('192.168.0.10').isIp);
  });
});

describe('boleto', () => {
  it('lê banco, valor e vencimento de um boleto bancário válido', () => {
    assert.deepEqual(parseBoleto(VALID_BOLETO, TODAY), {
      type: 'bancario',
      valid: true,
      issuerCode: '341',
      amount: 450,
      dueDate: '2026-11-10',
    });
  });

  it('detecta boleto adulterado', () => {
    assert.equal(parseBoleto(TAMPERED_BOLETO, TODAY)?.valid, false);
  });

  it('valida conta de consumo (48 dígitos)', () => {
    const info = parseBoleto(VALID_UTILITY_BOLETO, TODAY);
    assert.equal(info?.type, 'arrecadacao');
    assert.equal(info?.valid, true);
    assert.equal(info?.issuerCode, '3');
    assert.equal(info?.amount, 123.45);
  });

  it('ignora números que não são boleto', () => {
    assert.equal(parseBoleto('123'), null);
  });
});

describe('Pix copia e cola', () => {
  it('calcula o CRC16 do padrão', () => {
    assert.equal(crc16('123456789'), '29B1');
  });

  it('lê recebedor, cidade, valor e chave', () => {
    assert.deepEqual(parseBrCode(BRCODE_PERSON), {
      payload: BRCODE_PERSON,
      crcValid: true,
      key: '52998224725',
      amount: 1850,
      receiverName: 'JOAO DA SILVA',
      city: 'SAO PAULO',
    });
  });

  it('acha o código no meio de um texto e detecta alteração', () => {
    const tampered = BRCODE_PERSON.replace('1850.00', '9850.00');
    assert.deepEqual(findBrCodes(`Paga esse aqui: ${tampered} obrigado`), [tampered]);
    assert.equal(parseBrCode(tampered).crcValid, false);
  });
});
