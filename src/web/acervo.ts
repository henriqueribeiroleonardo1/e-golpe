/**
 * Acervo de golpes documentados que aparece na página.
 * Cada caso traz um exemplo de mensagem que o motor analisa ao vivo, e os testes
 * garantem que nenhum desses exemplos passa como "sem sinais de golpe".
 */

export type Category = 'WhatsApp e SMS' | 'Banco' | 'E-mail' | 'Boleto' | 'Marketplace' | 'Pix' | 'Oferta';
export type Channel =
  | 'WhatsApp'
  | 'SMS'
  | 'Ligação'
  | 'E-mail'
  | 'Boleto impresso'
  | 'Boleto DDA'
  | 'OLX'
  | 'Mercado Livre'
  | 'Redes sociais';
export type Risk = 'alto' | 'médio';

export interface ScamCase {
  id: string;
  title: string;
  category: Category;
  channel: Channel;
  risk: Risk;
  summary: string;
  signs: string[];
  /** Remetente, link ou número típico. Sempre fictício. */
  origin: string;
  whatToDo: string[];
  example: string;
}

const BOLETO_ADULTERADO = '34191.09123 34567.812341 56789.012301 1 16260000145000';
const BOLETO_VALIDO = '34191.09123 34567.812341 56789.012301 1 16260000045000';

export const CASES: ScamCase[] = [
  {
    id: 'falso-parente',
    title: 'Parente com número novo pedindo Pix',
    category: 'WhatsApp e SMS',
    channel: 'WhatsApp',
    risk: 'alto',
    summary: 'Alguém usa a foto de um filho ou sobrinho, diz que trocou de número e logo pede um Pix urgente.',
    signs: ['Diz que trocou de número', 'Pede dinheiro no mesmo dia', 'Pede segredo ou diz que não pode ligar'],
    origin: '+55 11 9xxxx-xxxx (número desconhecido)',
    whatToDo: [
      'Ligue para o número antigo da pessoa',
      'Faça uma pergunta que só ela saberia',
      'Não faça Pix antes de falar por voz',
    ],
    example:
      'Oi mãe, troquei de número. Salva esse aqui. Consegue me fazer um Pix de R$ 1.850 agora? É urgente, te devolvo amanhã. Não comenta com o pai.',
  },
  {
    id: 'falsa-central',
    title: 'Falsa central de segurança do banco',
    category: 'Banco',
    channel: 'Ligação',
    risk: 'alto',
    summary:
      'Uma "central antifraude" avisa de uma compra suspeita e pede para você mover o saldo para uma conta de segurança.',
    signs: [
      'Cria susto com compra que você não fez',
      'Fala em conta de segurança',
      'Pede senha, token ou transferência',
    ],
    origin: '0800 falso ou número que imita o do cartão',
    whatToDo: ['Desligue', 'Ligue você para o número do verso do cartão', 'Nunca transfira para "proteger" o dinheiro'],
    example:
      'Aqui é da Central de Segurança do Itaú. Identificamos uma compra não reconhecida de R$ 2.390. Para proteger seu dinheiro, transfira seu saldo para a conta de segurança ainda hoje.',
  },
  {
    id: 'phishing-cadastro',
    title: 'E-mail de atualização cadastral com bloqueio em 24h',
    category: 'E-mail',
    channel: 'E-mail',
    risk: 'alto',
    summary: 'O e-mail copia logo e cores do banco, ameaça bloquear a conta e leva a uma página que rouba a senha.',
    signs: ['Remetente com domínio que não é o do banco', 'Prazo curto para não ser bloqueado', 'Pede senha ou código'],
    origin: 'seguranca@bancodobrasil-cadastro.online',
    whatToDo: [
      'Não clique no botão do e-mail',
      'Entre no app oficial e veja se há aviso',
      'Denuncie o e-mail como phishing',
    ],
    example:
      'Banco do Brasil: sua conta será bloqueada em 24 horas. Faça a atualização cadastral agora em https://bancodobrasil-cadastro.online/acesso',
  },
  {
    id: 'encomenda',
    title: 'SMS de encomenda retida com taxa',
    category: 'WhatsApp e SMS',
    channel: 'SMS',
    risk: 'médio',
    summary: 'Uma mensagem diz que um pacote está parado na alfândega e cobra uma taxa pequena para liberar.',
    signs: ['Taxa baixa para parecer inofensiva', 'Link que não é correios.com.br', 'Prazo para pagar'],
    origin: 'correios-taxa-rastreio.com',
    whatToDo: ['Rastreie pelo app oficial dos Correios', 'Taxa de importação real aparece no app, nunca por SMS'],
    example:
      'CORREIOS: Sua encomenda está retida por falta de pagamento da taxa de importação. Regularize em até 24h: correios-taxa-rastreio.com/pagar',
  },
  {
    id: 'codigo-whatsapp',
    title: 'Pedido do código que chegou por SMS',
    category: 'WhatsApp e SMS',
    channel: 'WhatsApp',
    risk: 'alto',
    summary: 'O golpista tenta entrar no seu WhatsApp e pede o código de 6 dígitos que o próprio app te mandou.',
    signs: [
      'Diz que mandou um código "sem querer"',
      'Insiste que é urgente',
      'Às vezes vem de um contato conhecido já clonado',
    ],
    origin: 'Contato da sua lista ou número de "pesquisa" e "promoção"',
    whatToDo: [
      'Nunca repasse códigos',
      'Ative a confirmação em duas etapas',
      'Avise o contato por ligação se a conta dele foi clonada',
    ],
    example: 'Oi! Te mandei um código por SMS sem querer, me passa o código por favor? É urgente.',
  },
  {
    id: 'boleto-adulterado',
    title: 'Boleto "atualizado" com valor e banco trocados',
    category: 'Boleto',
    channel: 'Boleto impresso',
    risk: 'alto',
    summary: 'Chega por mensagem um boleto novo de uma conta que você já paga, com a linha digitável alterada.',
    signs: ['Diz que o boleto foi atualizado', 'Dígitos verificadores que não fecham', 'Beneficiário diferente no app'],
    origin: 'PDF por WhatsApp ou e-mail, fora do site da empresa',
    whatToDo: ['Gere a segunda via no site oficial', 'Confira o beneficiário antes de confirmar'],
    example: `Bom dia! Segue o boleto atualizado do condomínio: ${BOLETO_ADULTERADO}`,
  },
  {
    id: 'cobranca-nao-solicitada',
    title: 'Cobrança impressa de serviço que você não contratou',
    category: 'Boleto',
    channel: 'Boleto impresso',
    risk: 'médio',
    summary:
      'Chega pelo correio uma cobrança com cara de oficial, como renovação de registro de marca, que você nunca pediu.',
    signs: [
      'Nome parecido com órgão público',
      'Serviço que você não reconhece',
      'Letras miúdas dizendo que é "oferta"',
    ],
    origin: 'Carta com boleto e CNPJ de empresa privada',
    whatToDo: [
      'Não pague o que você não reconhece',
      'Confira o CNPJ do beneficiário',
      'Procure o órgão pelo site oficial',
    ],
    example: `Aviso de renovação de registro de marca. Evite o cancelamento pagando até sexta: ${BOLETO_VALIDO}`,
  },
  {
    id: 'dda',
    title: 'Débito DDA que você não autorizou',
    category: 'Boleto',
    channel: 'Boleto DDA',
    risk: 'médio',
    summary:
      'Golpistas registram boletos no seu CPF e eles aparecem no app como DDA, esperando um pagamento distraído.',
    signs: ['Boleto que aparece sozinho no app', 'Empresa que você não conhece', 'Vencimento próximo'],
    origin: 'Lista de boletos DDA no app do banco',
    whatToDo: [
      'Confira nome e CNPJ do beneficiário',
      'Recuse no app o que não reconhecer',
      'Desative o pagamento automático de DDA',
    ],
    example: 'Você tem um boleto DDA de R$ 389,90 vencendo hoje. Pague agora pelo app para evitar multa.',
  },
  {
    id: 'comprador-paga-mais',
    title: 'Comprador que diz ter pagado a mais',
    category: 'Marketplace',
    channel: 'OLX',
    risk: 'alto',
    summary: 'O "comprador" manda um comprovante falso com valor maior e pede que você devolva a diferença por Pix.',
    signs: ['Comprovante só por print ou e-mail', 'Valor a mais "sem querer"', 'Pressa para você devolver'],
    origin: 'E-mail que imita a plataforma ou print de comprovante',
    whatToDo: ['Confira o saldo no app do banco', 'Nunca devolva dinheiro que não caiu na conta'],
    example:
      'Oi, comprei seu sofá e paguei a mais sem querer, mandei R$ 1.500 em vez de R$ 900. Pode devolver a diferença por Pix agora? Já te mandei o comprovante.',
  },
  {
    id: 'fora-da-plataforma',
    title: 'Vendedor que pede para pagar fora do app',
    category: 'Marketplace',
    channel: 'Mercado Livre',
    risk: 'alto',
    summary:
      'O anúncio tem preço ótimo, mas o vendedor quer fechar pelo WhatsApp e manda um link de pagamento próprio.',
    signs: ['Preço muito abaixo do mercado', 'Pede para sair da plataforma', 'Link de pagamento fora do site'],
    origin: 'mercadolivre-pagamento-seguro.site',
    whatToDo: ['Pague só dentro do app', 'Desconfie de preço bom demais', 'Denuncie o anúncio'],
    example:
      'Faço por R$ 1.200 o iPhone, mas só fora do app. Me chama no whatsapp e pague por esse link: https://mercadolivre-pagamento-seguro.site/checkout',
  },
  {
    id: 'pix-trocado',
    title: 'Pix copia e cola com recebedor trocado',
    category: 'Pix',
    channel: 'WhatsApp',
    risk: 'alto',
    summary: 'A mensagem diz ser do banco ou da loja, mas o código Pix leva o dinheiro para a conta de outra pessoa.',
    signs: ['Desconto alto para quitar à vista', 'Nome do recebedor não é a empresa', 'Código enviado por mensagem'],
    origin: 'Mensagem com "Pix copia e cola" de pessoa física',
    whatToDo: ['Antes de confirmar, leia o nome do recebedor no app', 'Pague dívidas só pelo canal oficial'],
    example:
      'Itaú: quite sua fatura com 70% de desconto pelo Pix copia e cola: 00020126330014br.gov.bcb.pix01115299822472552040000530398654071850.005802BR5913JOAO DA SILVA6009SAO PAULO62070503***630458AC',
  },
  {
    id: 'trabalho-tarefa',
    title: 'Trabalho de curtir vídeos que pede depósito',
    category: 'Oferta',
    channel: 'Redes sociais',
    risk: 'alto',
    summary: 'Pagam centavos por curtidas no começo. Depois pedem um depósito para liberar tarefas maiores e somem.',
    signs: ['Renda fácil por tarefa simples', 'Grupo no Telegram com "mentor"', 'Pedido de depósito para sacar'],
    origin: 'Mensagem de recrutadora no WhatsApp ou Instagram',
    whatToDo: ['Não deposite nada para trabalhar', 'Saia do grupo e denuncie o perfil'],
    example:
      'Vaga home office! Ganhe R$ 300 por dia para curtir vídeos e avaliar produtos. Tarefas simples, pagamento na hora.',
  },
  {
    id: 'emprestimo-taxa',
    title: 'Empréstimo aprovado que cobra taxa antes',
    category: 'Oferta',
    channel: 'Redes sociais',
    risk: 'alto',
    summary:
      'Uma "financeira" aprova crédito mesmo para negativado, mas exige uma taxa de liberação antes do dinheiro cair.',
    signs: ['Aprovação sem análise', 'Taxa antes de liberar', 'Pagamento para pessoa física'],
    origin: 'Anúncio patrocinado ou perfil de "correspondente bancário"',
    whatToDo: ['Nunca pague para receber empréstimo', 'Confira no Banco Central se a empresa é autorizada'],
    example:
      'Seu empréstimo de R$ 8.000 foi aprovado! Para a liberação do crédito, faça o pagamento da taxa de abertura de R$ 250 via Pix.',
  },
  {
    id: 'motoboy-cartao',
    title: 'Motoboy que vem buscar o cartão "clonado"',
    category: 'Banco',
    channel: 'Ligação',
    risk: 'alto',
    summary:
      'Depois de uma falsa ligação do banco, um "funcionário" aparece na sua porta para recolher o cartão e a senha.',
    signs: ['Pede o cartão físico', 'Pede para digitar a senha no telefone', 'Promete um cartão novo em casa'],
    origin: 'Ligação de "segurança" seguida de visita',
    whatToDo: ['Não entregue o cartão', 'Corte o chip e ligue para o banco', 'Registre boletim de ocorrência'],
    example:
      'Seu cartão foi clonado. Um motoboy do banco vai passar hoje para buscar o cartão antigo e entregar o novo. Deixe a senha anotada no envelope.',
  },
  {
    id: 'leilao-falso',
    title: 'Leilão de carro com preço bom demais',
    category: 'Oferta',
    channel: 'Redes sociais',
    risk: 'médio',
    summary: 'Um site de leilão anuncia carros pela metade do preço e pede um sinal por Pix para garantir o lance.',
    signs: ['Preço muito abaixo da tabela', 'Sinal ou caução por Pix', 'Leiloeiro sem registro'],
    origin: 'leilao-veiculos-oficial.online',
    whatToDo: ['Procure o leiloeiro na Junta Comercial', 'Nunca pague sinal para pessoa física'],
    example:
      'Leilão de veículos: Onix 2022 por R$ 19.900! Para garantir o seu lance, pague o sinal de R$ 1.500 via Pix hoje em https://leilao-veiculos-oficial.online',
  },
];

export const CATEGORIES: Category[] = ['WhatsApp e SMS', 'Banco', 'E-mail', 'Boleto', 'Marketplace', 'Pix', 'Oferta'];
