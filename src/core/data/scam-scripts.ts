import type { Severity } from '../types.js';

/**
 * Roteiros de golpe escritos como regras declarativas.
 * Os padrões rodam sobre o texto normalizado (minúsculas e sem acento).
 * Para ensinar um golpe novo ao motor, basta adicionar uma regra aqui e um teste.
 */
export interface ScriptRule {
  id: string;
  severity: Severity;
  reason: string;
  advice?: string;
  patterns: RegExp[];
}

/** Regras que só disparam quando outras aparecem juntas na mesma mensagem. */
export interface ComboRule {
  id: string;
  requires: string[];
  severity: Severity;
  reason: string;
  advice: string;
}

const VERIFY_BY_CALL =
  'Ligue para a pessoa no número antigo, ou faça uma pergunta que só ela saberia, antes de qualquer Pix.';
const CALL_THE_BANK = 'Desligue e ligue você mesmo para o número que está no verso do seu cartão.';

export const SCRIPT_RULES: ScriptRule[] = [
  {
    id: 'new-number',
    severity: 'medium',
    reason: 'Diz que trocou de número',
    advice: VERIFY_BY_CALL,
    patterns: [
      /\btroquei (de |o )?(numero|celular|chip|whats(app)?|zap)\b/,
      /\b(meu )?(numero novo|novo numero)\b/,
      /\bsalva (esse|este|o meu|meu) (numero|contato)\b/,
      /\b(perdi|quebrei|roubaram) (o |meu )?(celular|telefone)\b/,
    ],
  },
  {
    id: 'money-request',
    severity: 'medium',
    reason: 'Pede dinheiro, Pix ou transferência',
    advice: 'Confirme o pedido numa ligação ou pessoalmente antes de pagar.',
    patterns: [
      /\b(faz|faca|fazer|manda|mande|mandar|transfere|transfira|transferir|empresta|emprestar|deposita|depositar|paga|pagar)\b.{0,40}\b(pix|transferencia|dinheiro|deposito|reais|r\$ ?\d)/,
      /\bme (empresta|passa|arruma|adianta)\b.{0,30}\b(dinheiro|pix|reais|grana|r\$)/,
    ],
  },
  {
    id: 'urgency',
    severity: 'low',
    reason: 'Cria pressa para você não pensar',
    patterns: [
      /\burgen(te|cia)\b/,
      /\b(agora mesmo|imediatamente|o (mais )?rapido possivel|ainda hoje)\b/,
      /\bultim[ao]s? (dia|chance|aviso|horas?)\b/,
      /\bem ate \d+ ?(h|hs|horas?|minutos?)\b/,
      /\bexpira (hoje|em)\b/,
    ],
  },
  {
    id: 'secrecy',
    severity: 'medium',
    reason: 'Pede para manter segredo',
    advice: 'Pedido de segredo é marca de golpe. Converse com alguém de confiança antes de fazer qualquer coisa.',
    patterns: [
      /\bnao (conta|fala|comenta|diz)\b.{0,15}\b(ninguem|pai|mae|marido|esposa)\b/,
      /\b(e segredo|so entre (nos|a gente)|ninguem pode saber)\b/,
    ],
  },
  {
    id: 'fake-bank-central',
    severity: 'high',
    reason: 'Diz ser da central do banco ou do cartão',
    advice: CALL_THE_BANK,
    patterns: [
      /\b(central|setor|departamento) (de )?(seguranca|atendimento|antifraude|fraude|prevencao)\b/,
      /\bcompra (suspeita|nao reconhecida|nao autorizada)\b/,
      /\b(conta|cartao) (foi |esta |sera )?(bloquead|clonad|invadid|suspens)/,
      /\btentativa de (acesso|invasao|compra)\b/,
    ],
  },
  {
    id: 'safe-account',
    severity: 'critical',
    reason: 'Pede para mover seu dinheiro para uma conta de segurança. Nenhum banco faz isso',
    advice: CALL_THE_BANK,
    patterns: [
      /\bconta (de )?(seguranca|segura|protegida|transitoria|reserva)\b/,
      /\btransfer(e|ir|ia) (todo )?(o )?(seu )?saldo\b/,
    ],
  },
  {
    id: 'code-request',
    severity: 'critical',
    reason: 'Pede um código que chegou por SMS. É assim que clonam o WhatsApp',
    advice: 'Nunca repasse códigos. Ative a confirmação em duas etapas em WhatsApp > Configurações > Conta.',
    patterns: [
      /\b(passa|passe|envia|envie|manda|mande|informa|informe|fala|confirma|confirme|digita|digite)\b.{0,25}\b(codigo|token)\b/,
      /\b(codigo|token)\b.{0,30}\b(que (chegou|vai chegar|voce recebeu)|por sms)\b/,
    ],
  },
  {
    id: 'password-request',
    severity: 'critical',
    reason: 'Pede a sua senha',
    advice: 'Banco e empresa séria nunca pedem senha por mensagem ou ligação.',
    patterns: [
      /\b(informe|informar|digite|digitar|confirme|confirmar|atualize|atualizar|envie|enviar|passa|passe)\b.{0,20}\bsenha\b/,
    ],
  },
  {
    id: 'parcel-fee',
    severity: 'high',
    reason: 'Cobra taxa para liberar uma encomenda',
    advice: 'Rastreie a encomenda só no site ou app oficial dos Correios ou da loja.',
    patterns: [
      /\b(encomenda|pacote|objeto|mercadoria)\b.{0,40}\b(retid|taxad|aguardando pagamento|bloquead|devolvid)/,
      /\btaxa (de )?(entrega|liberacao|alfandega|alfandegaria|importacao|reenvio|desembaraco)\b/,
    ],
  },
  {
    id: 'prize',
    severity: 'high',
    reason: 'Promete prêmio, pontos ou dinheiro para resgatar',
    advice: 'Prêmio de verdade não cobra nada para ser liberado. Confira no site oficial de quem diz ter sorteado.',
    patterns: [
      /\b(voce|vc) (foi )?(ganhou|sorteado|sorteada|contemplado|contemplada|selecionado|selecionada)\b/,
      /\bresgat(e|ar)\b.{0,20}\b(premio|bonus|saldo|pontos|valor|dinheiro)\b/,
      /\bpontos\b.{0,20}\b(expiram|vao expirar|vencem)\b/,
    ],
  },
  {
    id: 'easy-job',
    severity: 'high',
    reason: 'Oferece trabalho fácil com pagamento rápido',
    advice: 'Trabalho que paga para curtir posts e depois pede depósito é o golpe da tarefa. Não deposite nada.',
    patterns: [
      /\b(curtir|avaliar|assistir|seguir)\b.{0,20}\b(videos?|produtos?|posts?|hoteis|perfis)\b.{0,40}\b(ganh|pag|renda|r\$)/,
      /\b(ganhe|ganhar|renda|lucre|lucrar)\b.{0,30}\b(reais|r\$ ?\d).{0,20}\b(por dia|diarios?|por hora|por tarefa)\b/,
      /\btarefas? (simples|pagas|remuneradas)\b/,
    ],
  },
  {
    id: 'debt-threat',
    severity: 'high',
    reason: 'Ameaça com dívida, multa ou nome sujo',
    advice: 'Consulte pendências direto no gov.br, na Serasa ou no app do seu banco. Nunca por um link recebido.',
    patterns: [
      /\b(cpf|nome|titulo|cnh)\b.{0,20}\b(sera|vai ser|foi|esta) (negativad|bloquead|cancelad|suspens|irregular)/,
      /\b(regularize|regularizar|quite|quitar)\b.{0,30}\b(pendencia|divida|debito|multa|situacao)\b/,
      /\bevite (o |a )?(bloqueio|protesto|negativacao|multa|cancelamento)\b/,
    ],
  },
  {
    id: 'investment',
    severity: 'high',
    reason: 'Promete lucro garantido',
    advice: 'Lucro garantido não existe. Confira se a empresa tem registro na CVM antes de investir.',
    patterns: [
      /\b(lucro|retorno|rendimento|ganho)s? (garantid|certo|diario)/,
      /\bdobr(a|ar|e) (o |seu )?(dinheiro|investimento|valor)\b/,
      /\b\d{1,3} ?% (ao|por) dia\b/,
    ],
  },
  {
    id: 'changed-bank-details',
    severity: 'high',
    reason: 'Avisa que mudou de conta ou de chave Pix',
    advice: 'Confirme a mudança ligando para a empresa no telefone que você já tinha.',
    patterns: [
      /\b(mudamos|mudou|alteramos|trocamos|atualizamos) (a |de |nossa )?(conta|chave( pix)?|dados bancarios|banco)\b/,
      /\bnova chave( pix)?\b/,
    ],
  },
  {
    id: 'new-boleto',
    severity: 'medium',
    reason: 'Manda um boleto novo ou atualizado por mensagem',
    advice: 'Gere a segunda via só no site ou app oficial de quem cobra.',
    patterns: [/\b(novo|segunda via do?) boleto\b/, /\bboleto (atualizado|com desconto|corrigido|novo)\b/],
  },
  {
    id: 'overpayment',
    severity: 'high',
    reason: 'Diz que pagou a mais e pede a diferença de volta',
    advice: 'Confira o extrato no app do banco. Pagamento a mais que só aparece em print ou e-mail não existe.',
    patterns: [
      /\b(paguei|transferi|depositei|mandei|enviei) (um valor )?(a mais|errado|em dobro|valor maior)\b/,
      /\b(devolv|estorn|reembols)\w* (a |o )?(diferenca|valor a mais|excedente|troco)\b/,
    ],
  },
  {
    id: 'account-update',
    severity: 'medium',
    reason: 'Pede atualização de cadastro por mensagem',
    advice: 'Atualize dados só pelo app oficial ou digitando o endereço do site você mesmo.',
    patterns: [
      /\b(atualizacao|atualizar|atualize) (cadastral|seus dados|de dados|do cadastro|o cadastro)\b/,
      /\brecadastr(amento|ar|e)\b/,
    ],
  },
  {
    id: 'off-platform',
    severity: 'high',
    reason: 'Pede para negociar ou pagar fora da plataforma',
    advice: 'Pague e converse só dentro do app do marketplace. Fora dele, a compra não tem garantia.',
    patterns: [
      /\bfora d[oa] (app|aplicativo|plataforma|site|olx|mercado livre|marketplace)\b/,
      /\b(chama|me chama|fala comigo|vamos conversar)\b.{0,20}\b(no|pelo) (whats|whatsapp|zap|telegram)\b/,
      /\b(pague|paga|pagar|finalize|finaliza|conclua)\b.{0,25}\b(por esse|neste|nesse|pelo) link\b/,
    ],
  },
  {
    id: 'advance-fee',
    severity: 'high',
    reason: 'Cobra uma taxa antes de liberar empréstimo ou crédito',
    advice: 'Empréstimo de verdade desconta as taxas do valor liberado. Nunca pague nada antes de receber.',
    patterns: [
      /\b(emprestimo|credito|financiamento)\b.{0,60}\b(taxa|deposito|pagamento|seguro) (antecipad|de liberacao|de abertura|de cadastro)/,
      /\b(liberar|liberacao do|liberacao de)\b.{0,20}\b(emprestimo|credito)\b.{0,50}\b(pag|taxa|deposit)/,
    ],
  },
  {
    id: 'dda-charge',
    severity: 'medium',
    reason: 'Cita uma cobrança DDA, que pode ter sido registrada no seu CPF por golpistas',
    advice: 'No app do banco, confira o nome e o CNPJ do beneficiário antes de autorizar. Se não reconhecer, recuse.',
    patterns: [/\b(boleto|debito|cobranca|pagamento)s? (via |por |no )?dda\b/, /\bdebito direto autorizado\b/],
  },
  {
    id: 'unsolicited-charge',
    severity: 'medium',
    reason: 'Cobrança de um serviço que você pode não ter contratado',
    advice: 'Não pague o que você não reconhece. Procure a empresa por um canal oficial e confira o CNPJ do boleto.',
    patterns: [
      /\b(renovacao|anuidade|manutencao|taxa) (de |do |da )?(registro|marca|dominio|cadastro|associacao|inscricao)\b/,
      /\bcobranca (nao (solicitada|reconhecida)|indevida)\b/,
    ],
  },
  {
    id: 'card-pickup',
    severity: 'critical',
    reason: 'Diz que vai mandar alguém buscar o seu cartão. Banco nenhum faz isso',
    advice: 'Não entregue o cartão a ninguém. Corte o chip e ligue para o número do verso.',
    patterns: [
      /\b(motoboy|portador|funcionario|tecnico|agente|mensageiro)\b.{0,50}\b(buscar|retirar|recolher|pegar)\b.{0,25}\bcarta(o|oes)\b/,
    ],
  },
  {
    id: 'fake-auction',
    severity: 'medium',
    reason: 'Leilão com preço muito abaixo do mercado e pagamento por fora',
    advice: 'Confira o leiloeiro na Junta Comercial do estado e nunca pague sinal por Pix para pessoa física.',
    patterns: [
      /\bleil(ao|oes)\b.{0,80}\b(sinal|caucao|garantir (o|seu) lance|reserva)\b/,
      /\b(arremat|lance)\w*\b.{0,60}\b(pix|deposito|transferencia)\b/,
    ],
  },
];

export const COMBO_RULES: ComboRule[] = [
  {
    id: 'fake-relative',
    requires: ['new-number', 'money-request'],
    severity: 'critical',
    reason: 'Troca de número seguida de pedido de dinheiro: é o golpe do falso parente',
    advice: VERIFY_BY_CALL,
  },
  {
    id: 'fake-central-transfer',
    requires: ['fake-bank-central', 'money-request'],
    severity: 'critical',
    reason: 'Diz ser do banco e pede transferência',
    advice: CALL_THE_BANK,
  },
];
