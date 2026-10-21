// Interface da página. Usa o motor empacotado em e-golpe.js (global `EGolpe`).
(() => {
  /* ================= utilidades ================= */

  /** Cria um elemento com texto seguro (nunca innerHTML com conteúdo do usuário). */
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    for (const child of children) node.append(child);
    return node;
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs = {}, text) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const fmt = new Intl.NumberFormat('pt-BR');
  const fmt1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  /* ================= demo ================= */

  const BOLETO_OK = '34191.09123 34567.812341 56789.012301 1 16260000045000';
  const BOLETO_ADULTERADO = '34191.09123 34567.812341 56789.012301 1 16260000145000';
  const PIX_PESSOA =
    '00020126330014br.gov.bcb.pix01115299822472552040000530398654071850.005802BR5913JOAO DA SILVA6009SAO PAULO62070503***630458AC';

  const EXAMPLES = [
    {
      label: 'Falso parente',
      text: 'Oi mãe, troquei de número. Salva esse aqui. Consegue me fazer um Pix de R$ 1.850 agora? É urgente, te devolvo amanhã. Não comenta com o pai.',
    },
    {
      label: 'Central do banco',
      text: 'Aqui é da Central de Segurança do Itaú. Identificamos uma compra não reconhecida de R$ 2.390. Para proteger seu dinheiro, transfira seu saldo para a conta de segurança ainda hoje.',
    },
    {
      label: 'Encomenda',
      text: 'CORREIOS: Sua encomenda está retida por falta de pagamento da taxa de importação. Regularize em até 24h: correios-taxa-rastreio.com/pagar',
    },
    { label: 'Boleto adulterado', text: `Bom dia! Segue o boleto atualizado do condomínio: ${BOLETO_ADULTERADO}` },
    { label: 'Pix trocado', text: `Itaú: quite sua fatura com 70% de desconto pelo Pix copia e cola: ${PIX_PESSOA}` },
    { label: 'Boleto ok', text: `Segue o boleto do condomínio de novembro: ${BOLETO_OK}` },
    { label: 'Link oficial', text: 'Sua fatura do cartão já está disponível em https://www.itau.com.br/cartoes' },
  ];

  const SEVERITY = { critical: 'crítico', high: 'alto', medium: 'médio', low: 'baixo', trust: 'oficial' };

  const textarea = document.getElementById('message');
  const result = document.getElementById('result');
  const count = document.getElementById('count');
  const examples = document.getElementById('examples');

  function block(title, items) {
    return el(
      'div',
      { class: 'r-block' },
      el('span', { class: 'micro' }, title),
      el('ul', { class: 'r-list' }, ...items),
    );
  }

  function renderAnalysis(analysis) {
    const verdict = el(
      'div',
      { class: 'verdict', 'data-level': analysis.level },
      el('span', { class: 'lamp', 'aria-hidden': 'true' }),
      el('h3', {}, analysis.title),
    );
    if (analysis.level !== 'inconclusive') {
      verdict.append(el('span', { class: 'score' }, 'risco', el('b', {}, String(analysis.score))));
    }

    const parts = [verdict];
    if (analysis.signals.length > 0) {
      parts.push(
        block(
          'Por quê',
          analysis.signals.map((s) =>
            el('li', {}, el('span', { class: `sev sev-${s.severity}` }, SEVERITY[s.severity]), s.reason),
          ),
        ),
      );
    }
    if (analysis.findings.length > 0) {
      parts.push(
        block(
          'O que encontrei',
          analysis.findings.map((f) => el('li', { class: 'finding' }, EGolpe.describeFinding(f))),
        ),
      );
    }
    parts.push(el('p', { class: 'advice' }, el('b', {}, 'O que fazer'), analysis.advice));
    parts.push(
      el('details', {}, el('summary', {}, 'resposta do bot no WhatsApp'), el('pre', {}, EGolpe.formatReply(analysis))),
    );
    parts.push(
      el(
        'details',
        {},
        el('summary', {}, 'POST /api/analyze → JSON'),
        el('pre', {}, JSON.stringify(analysis, null, 2)),
      ),
    );
    result.replaceChildren(...parts);
  }

  let ticket = 0;
  async function analyze() {
    const text = textarea.value;
    count.textContent = `${fmt.format(text.length)} / 5.000`;
    const mine = ++ticket;
    const analysis = await EGolpe.analyzeMessage(text);
    if (mine === ticket) renderAnalysis(analysis);
  }

  function selectExample(index) {
    textarea.value = EXAMPLES[index].text;
    [...examples.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
    analyze();
  }

  EXAMPLES.forEach((example, index) => {
    const button = el('button', { type: 'button', 'aria-pressed': 'false' }, example.label);
    button.addEventListener('click', () => selectExample(index));
    examples.append(button);
  });

  let typingTimer;
  textarea.addEventListener('input', () => {
    for (const b of examples.children) b.setAttribute('aria-pressed', 'false');
    clearTimeout(typingTimer);
    typingTimer = setTimeout(analyze, 150);
  });

  selectExample(0);

  /* ================= planilhas ================= */

  const SRC_ANUARIO_2026 = {
    label: 'Anuário Brasileiro de Segurança Pública 2026 (FBSP), via Metrópoles, 23/07/2026',
    url: 'https://www.metropoles.com/brasil/golpes-sobem-430-desde-2018-anuario-seguranca-publica',
  };
  const SRC_ANUARIO_JP = {
    label: 'Anuário Brasileiro de Segurança Pública 2026 (FBSP), via Jovem Pan, 23/07/2026',
    url: 'https://jovempan.com.br/brasil/estelionatos-sobem-31-e-brasil-registra-258-golpes-por-hora-em-2025/',
  };
  const SRC_FEBRABAN = {
    label: 'Febraban, via Poder360, 12/03/2025',
    url: 'https://www.poder360.com.br/poder-economia/golpes-causaram-prejuizo-de-r-101-bi-em-2024-diz-febraban/',
  };

  /** Cada aba é uma planilha: colunas, linhas, gráfico e fonte. Os números são os publicados. */
  const SHEETS = [
    {
      id: 'ano',
      tab: 'Por ano',
      title: 'Registros de estelionato no Brasil',
      formula: '=SÉRIE(estelionato; 2018:2025)',
      columns: ['Ano', 'Registros', 'Variação'],
      rows: [
        [2018, 426799],
        [2019, 523820],
        [2020, 927898],
        [2021, 1312964],
        [2022, 1816438],
        [2023, 2000960],
        [2024, 2193122],
        [2025, 2261055],
      ].map(([year, value], i, all) => [year, value, i === 0 ? null : value / all[i - 1][1] - 1]),
      format: [
        (v) => String(v),
        (v) => fmt.format(v),
        (v) => (v === null ? '—' : `${v > 0 ? '+' : ''}${fmt1.format(v * 100)}%`),
      ],
      chart: 'columns',
      note: 'O salto de 2020 coincide com a pandemia, quando a vida financeira foi para o celular. A variação anual foi calculada a partir dos totais publicados.',
      source: SRC_ANUARIO_2026,
    },
    {
      id: 'uf',
      tab: 'Por estado',
      title: 'Estelionato por 100 mil habitantes, 2025',
      formula: '=MAIORES(taxa_por_100mil; 7)',
      columns: ['UF', 'Estado', 'Taxa'],
      rows: [
        ['SP', 'São Paulo', 1808.3],
        ['DF', 'Distrito Federal', 1717.0],
        ['PR', 'Paraná', 1339.1],
        ['RO', 'Rondônia', 1329.6],
        ['SC', 'Santa Catarina', 1294.8],
        ['ES', 'Espírito Santo', 1254.7],
        ['GO', 'Goiás', 1075.6],
      ],
      format: [(v) => v, (v) => v, (v) => fmt1.format(v)],
      chart: 'bars',
      barLabel: (row) => row[0],
      barValue: (row) => row[2],
      barText: (row) => fmt1.format(row[2]),
      note: 'Os sete estados com as maiores taxas. O Distrito Federal fica em segundo, logo atrás de São Paulo.',
      source: SRC_ANUARIO_2026,
    },
    {
      id: 'tipos',
      tab: 'Modalidades',
      title: 'Golpes mais comuns',
      formula: '=PARTICIPAÇÃO(modalidade)',
      columns: ['Modalidade', 'Participação'],
      rows: [
        ['Clonagem ou troca de cartão', 45],
        ['Golpe do WhatsApp', 34],
        ['Falsa central bancária', 31],
        ['Golpe do Pix', 24],
        ['Uso indevido de CPF por SMS', 13],
        ['Leilão ou loja virtual falsa', 10],
      ],
      format: [(v) => v, (v) => `${v}%`],
      chart: 'bars',
      barLabel: (row) => row[0],
      barValue: (row) => row[1],
      barText: (row) => `${row[1]}%`,
      max: 50,
      note: 'Dados do setor financeiro citados no Anuário. A soma passa de 100% porque um mesmo golpe pode usar mais de um meio.',
      source: SRC_ANUARIO_JP,
    },
    {
      id: 'prejuizo',
      tab: 'Prejuízo',
      title: 'Dinheiro perdido em golpes e fraudes bancárias',
      formula: '=SOMA(prejuízo; R$ bilhões)',
      columns: ['Período', 'Recorte', 'R$ bilhões'],
      rows: [
        ['2023', 'Golpes e fraudes bancárias', 8.6],
        ['2024', 'Golpes e fraudes bancárias', 10.1],
        ['2023–2024', 'Só fraudes via Pix', 2.7],
      ],
      format: [(v) => v, (v) => v, (v) => fmt1.format(v)],
      chart: 'bars',
      barLabel: (row) => (row[0].includes('–') ? 'Pix 23–24' : row[0]),
      barValue: (row) => row[2],
      barText: (row) => `R$ ${fmt1.format(row[2])} bi`,
      max: 12,
      note: 'O prejuízo subiu 17% de 2023 para 2024. As fraudes via Pix cresceram 43% no período.',
      source: SRC_FEBRABAN,
    },
    {
      id: 'funil',
      tab: 'Punição',
      title: 'De 1.000 golpes registrados, 28 viram processo',
      formula: '=FUNIL(boletins; processos; presos)',
      columns: ['Etapa', 'Total 2025', 'A cada 1.000'],
      rows: [
        ['Boletins de ocorrência', 2261055, 1000],
        ['Processos penais', 63771, 28.2],
        ['Pessoas presas', 4819, 2.1],
      ],
      format: [(v) => v, (v) => fmt.format(v), (v) => fmt1.format(v)],
      chart: 'dots',
      note: 'Cada quadrado é um boletim. Os rosa viraram processo e os brancos terminaram em prisão. Mais de 97% dos casos nunca chegam à Justiça.',
      source: SRC_ANUARIO_JP,
    },
  ];

  const tableWrap = document.getElementById('sheet-table');
  const tabs = document.getElementById('sheet-tabs');
  const fx = document.querySelector('#fx span');
  const chart = document.getElementById('chart');
  const chartTitle = document.getElementById('chart-title');
  const chartNote = document.getElementById('chart-note');
  const chartSource = document.getElementById('chart-source');
  const chartLabel = document.getElementById('chart-label');
  const copyButton = document.getElementById('copy-csv');
  let current = SHEETS[0];

  const LETTERS = 'ABCDEFGH';

  function renderTable(sheet) {
    const head = el('tr', {}, el('th', { class: 'rn' }, ''), ...sheet.columns.map((_, i) => el('th', {}, LETTERS[i])));
    const headerRow = el(
      'tr',
      { class: 'head' },
      el('td', { class: 'rn' }, '1'),
      ...sheet.columns.map((c) => el('td', {}, c)),
    );
    const body = sheet.rows.map((row, r) =>
      el(
        'tr',
        {},
        el('td', { class: 'rn' }, String(r + 2)),
        ...row.map((value, c) =>
          el('td', { class: typeof value === 'number' || value === null ? 'num' : '' }, sheet.format[c](value)),
        ),
      ),
    );
    const table = el('table', { class: 'xl' }, el('thead', {}, head), el('tbody', {}, headerRow, ...body));

    table.addEventListener('click', (event) => {
      const cell = event.target.closest('td');
      if (!cell || cell.classList.contains('rn')) return;
      table.querySelectorAll('.sel').forEach((c) => c.classList.remove('sel'));
      cell.classList.add('sel');
      const col = LETTERS[cell.cellIndex - 1];
      const row = cell.parentElement.rowIndex;
      fx.textContent = `${col}${row}  ${cell.textContent}`;
    });

    tableWrap.replaceChildren(table);
  }

  /* ---------- gráficos (SVG desenhado em escala) ---------- */

  function columnsChart(sheet) {
    const W = 560;
    const H = 300;
    const pad = { top: 26, right: 8, bottom: 30, left: 44 };
    const max = 2_500_000;
    const ticks = [0, 500_000, 1_000_000, 1_500_000, 2_000_000, 2_500_000];
    const y = (v) => pad.top + (1 - v / max) * (H - pad.top - pad.bottom);
    const slot = (W - pad.left - pad.right) / sheet.rows.length;
    const barW = slot * 0.62;

    const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': sheet.title });
    const defs = svg('defs');
    const grad = svg('linearGradient', { id: 'colgrad', x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.append(
      svg('stop', { offset: 0, 'stop-color': '#ff8fc0' }),
      svg('stop', { offset: 0.5, 'stop-color': '#e0168f' }),
      svg('stop', { offset: 1, 'stop-color': '#5a2bff' }),
    );
    defs.append(grad);
    root.append(defs);

    for (const t of ticks) {
      root.append(
        svg('line', {
          x1: pad.left,
          x2: W - pad.right,
          y1: y(t),
          y2: y(t),
          stroke: '#2a2a30',
          'stroke-dasharray': t === 0 ? '' : '2 4',
        }),
      );
      root.append(
        svg('text', { x: pad.left - 8, y: y(t) + 4, 'text-anchor': 'end' }, t === 0 ? '0' : `${t / 1_000_000} mi`),
      );
    }
    sheet.rows.forEach(([year, value], i) => {
      const x = pad.left + slot * i + (slot - barW) / 2;
      const last = i === sheet.rows.length - 1;
      root.append(
        svg('rect', {
          x,
          y: y(value),
          width: barW,
          height: y(0) - y(value),
          rx: 3,
          fill: last ? 'url(#colgrad)' : '#3a3843',
        }),
      );
      root.append(svg('text', { x: x + barW / 2, y: H - 10, 'text-anchor': 'middle' }, String(year)));
      if (last || i === 0) {
        root.append(
          svg(
            'text',
            { x: x + barW / 2, y: y(value) - 8, 'text-anchor': 'middle', class: 'v' },
            `${fmt1.format(value / 1_000_000)} mi`,
          ),
        );
      }
    });
    return root;
  }

  function barsChart(sheet) {
    const W = 560;
    const rowH = 40;
    const labelW = sheet.rows.some((r) => String(sheet.barLabel(r)).length > 10) ? 190 : 70;
    const H = sheet.rows.length * rowH + 6;
    const max = sheet.max ?? Math.max(...sheet.rows.map(sheet.barValue));
    const trackW = W - labelW - 96;

    const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': sheet.title });
    const defs = svg('defs');
    const grad = svg('linearGradient', { id: 'bargrad', x1: 0, y1: 0, x2: 1, y2: 0 });
    grad.append(
      svg('stop', { offset: 0, 'stop-color': '#ff8fc0' }),
      svg('stop', { offset: 0.5, 'stop-color': '#e0168f' }),
      svg('stop', { offset: 1, 'stop-color': '#8a1fd6' }),
    );
    defs.append(grad);
    root.append(defs);

    sheet.rows.forEach((row, i) => {
      const cy = i * rowH + rowH / 2;
      const w = Math.max(2, (sheet.barValue(row) / max) * trackW);
      root.append(svg('text', { x: 0, y: cy + 4 }, String(sheet.barLabel(row))));
      root.append(svg('rect', { x: labelW, y: cy - 9, width: trackW, height: 18, rx: 3, fill: '#1d1d22' }));
      root.append(
        svg('rect', { x: labelW, y: cy - 9, width: w, height: 18, rx: 3, fill: i === 0 ? 'url(#bargrad)' : '#4a4754' }),
      );
      root.append(svg('text', { x: labelW + w + 8, y: cy + 4, class: 'v' }, sheet.barText(row)));
    });
    return root;
  }

  function dotsChart() {
    const cols = 50;
    const rows = 20;
    const size = 9;
    const gap = 2.2;
    const W = cols * (size + gap);
    const H = rows * (size + gap);
    const root = svg('svg', {
      viewBox: `0 0 ${W} ${H}`,
      role: 'img',
      'aria-label': 'De 1.000 boletins, 28 viram processo e 2 terminam em prisão',
    });
    for (let i = 0; i < cols * rows; i++) {
      const x = (i % cols) * (size + gap);
      const yy = Math.floor(i / cols) * (size + gap);
      const fill = i < 2 ? '#f3f2f5' : i < 28 ? '#e0168f' : '#26252b';
      root.append(svg('rect', { x, y: yy, width: size, height: size, rx: 1.5, fill }));
    }
    return root;
  }

  function renderChart(sheet) {
    const draw = { columns: columnsChart, bars: barsChart, dots: dotsChart }[sheet.chart];
    chart.replaceChildren(draw(sheet));
    chartTitle.textContent = sheet.title;
    chartNote.textContent = sheet.note;
    chartLabel.textContent = `Gráfico · ${sheet.tab}`;
    chartSource.replaceChildren('Fonte: ', el('a', { href: sheet.source.url }, sheet.source.label));
  }

  function toCsv(sheet) {
    const escape = (v) => {
      const s = v === null ? '' : String(v);
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [sheet.columns, ...sheet.rows].map((row) => row.map(escape).join(';')).join('\n');
  }

  function openSheet(sheet, focus = false) {
    current = sheet;
    renderTable(sheet);
    renderChart(sheet);
    fx.textContent = sheet.formula;
    for (const tab of tabs.children) {
      const active = tab.dataset.id === sheet.id;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    }
  }

  SHEETS.forEach((sheet) => {
    const tab = el('button', { type: 'button', role: 'tab', 'data-id': sheet.id }, sheet.tab);
    tab.addEventListener('click', () => openSheet(sheet));
    tabs.append(tab);
  });
  tabs.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const i = SHEETS.indexOf(current);
    const next = SHEETS[(i + (event.key === 'ArrowRight' ? 1 : SHEETS.length - 1)) % SHEETS.length];
    openSheet(next, true);
  });

  copyButton.addEventListener('click', async () => {
    const csv = toCsv(current);
    try {
      await navigator.clipboard.writeText(csv);
      copyButton.textContent = 'Copiado';
    } catch {
      fx.textContent = csv.replace(/\n/g, '  ·  ');
      copyButton.textContent = 'Selecione e copie';
    }
    setTimeout(() => (copyButton.textContent = 'Copiar CSV'), 1800);
  });

  openSheet(SHEETS[0]);

  /* ================= acervo ================= */

  const list = document.getElementById('acervo-lista');
  const search = document.getElementById('acervo-busca');
  const categoryChips = document.getElementById('acervo-categorias');
  const channelSelect = document.getElementById('acervo-canal');
  const acervoCount = document.getElementById('acervo-count');
  const ALL = 'Todas';
  const filters = { category: ALL, channel: ALL, query: '' };

  /** Mesma normalização do motor: minúsculas e sem acento. */
  const plain = (text) =>
    text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();

  function testInDetector(scam) {
    textarea.value = scam.example;
    for (const b of examples.children) b.setAttribute('aria-pressed', 'false');
    analyze();
    document.getElementById('testar').scrollIntoView({ behavior: 'smooth' });
    textarea.focus({ preventScroll: true });
  }

  function caseCard(scam) {
    const details = el(
      'details',
      {},
      el('summary', {}, 'sinais de alerta e o que fazer'),
      el('h4', { class: 'micro' }, 'Sinais de alerta'),
      el('ul', {}, ...scam.signs.map((sign) => el('li', {}, sign))),
      el('h4', { class: 'micro' }, 'O que fazer'),
      el('ul', {}, ...scam.whatToDo.map((step) => el('li', {}, step))),
    );
    const button = el('button', { class: 'btn btn--line btn--sm', type: 'button' }, 'Testar no detector');
    button.addEventListener('click', () => testInDetector(scam));

    return el(
      'article',
      { class: 'cell case', 'data-risk': scam.risk },
      el(
        'div',
        { class: 'case-top' },
        el('span', { class: 'micro' }, `${scam.category} · ${scam.channel}`),
        el('span', { class: 'risk' }, `Risco ${scam.risk}`),
      ),
      el('h3', {}, scam.title),
      el('p', {}, scam.summary),
      el('p', { class: 'origin' }, el('span', {}, 'origem típica: '), scam.origin),
      details,
      button,
    );
  }

  function renderCases() {
    const query = plain(filters.query.trim());
    const visible = EGolpe.CASES.filter(
      (scam) =>
        (filters.category === ALL || scam.category === filters.category) &&
        (filters.channel === ALL || scam.channel === filters.channel) &&
        (!query ||
          plain([scam.title, scam.summary, scam.channel, scam.category, scam.origin, ...scam.signs].join(' ')).includes(
            query,
          )),
    );
    acervoCount.textContent = `${visible.length} ${visible.length === 1 ? 'caso encontrado' : 'casos encontrados'}`;
    list.replaceChildren(
      ...(visible.length > 0
        ? visible.map(caseCard)
        : [el('p', { class: 'cell empty' }, 'Nenhum caso com esse filtro. Tente outra palavra ou limpe os filtros.')]),
    );
  }

  [ALL, ...EGolpe.CATEGORIES].forEach((category) => {
    const chip = el('button', { type: 'button', 'aria-pressed': String(category === ALL) }, category);
    chip.addEventListener('click', () => {
      filters.category = category;
      for (const c of categoryChips.children) c.setAttribute('aria-pressed', String(c === chip));
      renderCases();
    });
    categoryChips.append(chip);
  });

  const channels = [...new Set(EGolpe.CASES.map((scam) => scam.channel))];
  channelSelect.append(el('option', { value: ALL }, 'Todos'), ...channels.map((c) => el('option', { value: c }, c)));
  channelSelect.addEventListener('change', () => {
    filters.channel = channelSelect.value;
    renderCases();
  });

  search.addEventListener('input', () => {
    filters.query = search.value;
    renderCases();
  });

  renderCases();
})();
