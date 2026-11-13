/**
 * CONDOMÍNIO JARDIM DO YPÊ - APLICAÇÃO WIKI INTERATIVA
 * Consumo dinâmico de arquivos Markdown (.md)
 * Compatível com execução web, GitHub Pages e Google Sites (Iframe / Embed)
 */

// Configurações dos Documentos
const DOCS_CONFIG = {
  convencao: {
    key: 'convencao',
    title: 'Convenção Condominial',
    file: 'data/convencao_jardim_do_ype.md',
    badge: 'Convenção 1990',
    icon: '📘',
    subtitle: 'Normas fundamentais, constituição, direitos e governança do Condomínio Jardim do Ypê'
  },
  regulamento: {
    key: 'regulamento',
    title: 'Regulamento Interno',
    file: 'data/regulamento_interno_jardim_do_ype.md',
    badge: 'Regulamento 2009',
    icon: '📋',
    subtitle: 'Regras de convivência, uso das áreas comuns, horários, garagens, salão de festas e piscina'
  },
  faq: {
    key: 'faq',
    title: 'Perguntas Frequentes (FAQ)',
    file: 'data/faq.md',
    badge: 'Dúvidas Frequentes',
    icon: '❓',
    subtitle: 'Respostas diretas e esclarecedoras para as dúvidas mais comuns dos condôminos'
  }
};

// Estado da Aplicação
const appState = {
  activeTab: 'convencao', // 'convencao' | 'regulamento' | 'faq' | 'tematico' | 'busca'
  docsContent: {},        // Raw markdown por key
  docsHtml: {},           // HTML gerado por key
  searchIndex: [],        // Chunks para busca
  tocData: {},            // Sumário por documento
  isLiveSync: false,      // Se foi carregado via fetch ao vivo
  lastUpdated: null,
  theme: localStorage.getItem('jardim_theme') || 'light',
  fontSize: parseFloat(localStorage.getItem('jardim_font_size') || '1')
};

// Normalização para busca sem acentos
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Gerador de Slugs para cabeçalhos e âncoras
function slugify(text) {
  return normalizeText(text)
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/* ==========================================================================
   CARREGAMENTO DINÂMICO DOS ARQUIVOS MARKDOWN
   ========================================================================== */
async function loadDocument(docKey) {
  const config = DOCS_CONFIG[docKey];
  if (!config) return null;

  // 1. Tenta buscar via fetch dinâmico (com query param para evitar cache)
  try {
    const response = await fetch(`${config.file}?v=${Date.now()}`);
    if (response.ok) {
      const text = await response.text();
      appState.isLiveSync = true;
      return text;
    }
  } catch (err) {
    console.warn(`[Wiki] Fetch dinâmico falhou para ${config.file}:`, err);
  }

  // 2. Fallback: Se fetch falhou (ex: file:// ou sandbox do Google Sites sem CORS),
  // usa o cache embutido gerado em docs-cache.js
  if (window.EMBEDDED_DOCS && window.EMBEDDED_DOCS.docs && window.EMBEDDED_DOCS.docs[docKey]) {
    console.info(`[Wiki] Usando cache embutido para ${docKey}`);
    return window.EMBEDDED_DOCS.docs[docKey];
  }

  return `# Erro ao carregar ${config.title}\n\nNão foi possível carregar o arquivo **${config.file}**. Verifique se o arquivo está na mesma pasta.`;
}

// Parser Fallback Simples caso a biblioteca marked não seja carregada
function simpleMarkdownParser(md) {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Cabeçalhos
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Separador
  html = html.replace(/^---$/gim, '<hr>');

  // Negrito e Itálico
  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>');

  // Listas
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');

  // Parágrafos
  html = html.split('\n\n').map(p => {
    if (p.trim().startsWith('<h') || p.trim().startsWith('<ul') || p.trim().startsWith('<hr')) {
      return p;
    }
    return `<p>${p.trim()}</p>`;
  }).join('\n');

  return html;
}

// Renderiza Markdown para HTML
function parseMarkdown(md) {
  if (typeof marked !== 'undefined' && marked.parse) {
    return marked.parse(md, { gfm: true, breaks: true });
  }
  return simpleMarkdownParser(md);
}

/* ==========================================================================
   PÓS-PROCESSAMENTO DE HTML E GERAÇÃO DO ÍNDICE DINÂMICO (TOC)
   ========================================================================== */
function processDocumentHtml(rawHtml, docKey) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
  const container = doc.body.firstElementChild;
  const headings = container.querySelectorAll('h1, h2, h3, h4');
  const tocList = [];
  const usedSlugs = new Set();

  headings.forEach(heading => {
    const text = heading.textContent.trim();
    let baseSlug = slugify(text);
    if (!baseSlug) baseSlug = 'secao';

    // Garante unicidade de slug
    let slug = `${docKey}-${baseSlug}`;
    let counter = 1;
    while (usedSlugs.has(slug)) {
      slug = `${docKey}-${baseSlug}-${counter++}`;
    }
    usedSlugs.add(slug);

    heading.id = slug;

    // Adiciona botão de copiar link da seção
    const copyBtn = doc.createElement('button');
    copyBtn.className = 'anchor-link-btn';
    copyBtn.setAttribute('title', 'Copiar link direto para esta seção');
    copyBtn.setAttribute('onclick', `copyAnchorLink('${docKey}', '${slug}')`);
    copyBtn.innerHTML = '🔗';
    heading.appendChild(copyBtn);

    // Registra no TOC (somente h2 e h3)
    const level = parseInt(heading.tagName.substring(1));
    if (level === 2 || level === 3) {
      tocList.push({
        level: level,
        id: slug,
        text: text.replace('#PendenteRevisaoManual', '').trim()
      });
    }
  });

  // Intercepta links internos em markdown para navegação suave
  container.querySelectorAll('a').forEach(anchor => {
    const href = anchor.getAttribute('href');
    if (href) {
      if (href.startsWith('convencao#') || href.startsWith('regulamento#') || href.startsWith('faq#')) {
        const [targetDoc, targetId] = href.split('#');
        anchor.setAttribute('onclick', `navigateToTarget('${targetDoc}', '${targetId}', event)`);
        anchor.setAttribute('href', `#${targetDoc}/${targetId}`);
      } else if (href.startsWith('#')) {
        const targetId = href.substring(1);
        anchor.setAttribute('onclick', `navigateToTarget('${docKey}', '${targetId}', event)`);
      }
    }
  });

  return {
    html: container.innerHTML,
    toc: tocList
  };
}

/* ==========================================================================
   INDEXAÇÃO PARA O MECANISMO DE BUSCA GLOBAL
   ========================================================================== */
function buildSearchIndex() {
  const index = [];

  ['convencao', 'regulamento', 'faq'].forEach(docKey => {
    const rawMd = appState.docsContent[docKey];
    if (!rawMd) return;

    const lines = rawMd.split('\n');
    let currentChapter = '';
    let currentSection = '';
    let currentChunkText = [];
    let currentId = '';

    const flushChunk = () => {
      if (currentChunkText.length > 0) {
        const fullText = currentChunkText.join(' ').trim();
        if (fullText.length > 10) {
          index.push({
            docKey: docKey,
            docTitle: DOCS_CONFIG[docKey].title,
            chapter: currentChapter || DOCS_CONFIG[docKey].title,
            section: currentSection || currentChapter || 'Geral',
            id: currentId,
            text: fullText,
            normText: normalizeText(fullText)
          });
        }
        currentChunkText = [];
      }
    };

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('## ')) {
        flushChunk();
        currentChapter = trimmed.replace('## ', '').trim();
        currentSection = currentChapter;
        currentId = `${docKey}-${slugify(currentChapter)}`;
      } else if (trimmed.startsWith('### ')) {
        flushChunk();
        currentSection = trimmed.replace('### ', '').trim();
        currentId = `${docKey}-${slugify(currentSection)}`;
      } else if (trimmed.startsWith('* **') || trimmed.startsWith('**PARÁGRAFO')) {
        flushChunk();
        currentChunkText.push(trimmed);
      } else if (trimmed.length > 0 && !trimmed.startsWith('---') && !trimmed.startsWith('# ')) {
        currentChunkText.push(trimmed);
      }
    });

    flushChunk();
  });

  appState.searchIndex = index;
}

/* ==========================================================================
   EXECUÇÃO DA BUSCA
   ========================================================================== */
function executeSearch(query) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const terms = normalizeText(query)
    .split(/\s+/)
    .filter(t => t.length > 1);

  if (terms.length === 0) return [];

  const results = [];

  appState.searchIndex.forEach(item => {
    let score = 0;
    let allMatch = true;

    for (const term of terms) {
      const inSection = normalizeText(item.section).includes(term);
      const inChapter = normalizeText(item.chapter).includes(term);
      const inText = item.normText.includes(term);

      if (inSection || inChapter || inText) {
        if (inSection) score += 15;
        if (inChapter) score += 10;
        if (inText) score += 3;
      } else {
        allMatch = false;
        break;
      }
    }

    if (allMatch && score > 0) {
      results.push({
        ...item,
        score: score
      });
    }
  });

  return results.sort((a, b) => b.score - a.score).slice(0, 50);
}

// Cria snippets com termos destacados
function createHighlightSnippet(text, query) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 1);

  if (terms.length === 0) return text.substring(0, 180) + '...';

  // Encontra a primeira ocorrência
  let firstPos = -1;
  const lower = text.toLowerCase();
  for (const t of terms) {
    const pos = lower.indexOf(t);
    if (pos !== -1 && (firstPos === -1 || pos < firstPos)) {
      firstPos = pos;
    }
  }

  const start = Math.max(0, firstPos - 60);
  const end = Math.min(text.length, start + 240);
  let snippet = (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');

  // Destaca os termos
  terms.forEach(term => {
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    snippet = snippet.replace(regex, '<mark class="search-match">$1</mark>');
  });

  return snippet;
}

/* ==========================================================================
   RENDERIZAÇÃO DAS TELAS / VIEWS
   ========================================================================== */

// Atualiza a Sidebar com o Sumário Dinâmico
function renderSidebarToc(docKey) {
  const tocListEl = document.getElementById('tocList');
  if (!tocListEl) return;

  const toc = appState.tocData[docKey] || [];
  if (toc.length === 0) {
    tocListEl.innerHTML = '<li class="toc-item" style="color:var(--text-muted);font-size:0.8rem;">Sumário indisponível para esta visualização.</li>';
    return;
  }

  tocListEl.innerHTML = toc.map(item => `
    <li class="toc-item">
      <a href="#${docKey}/${item.id}" 
         class="toc-link toc-level-${item.level}" 
         onclick="navigateToTarget('${docKey}', '${item.id}', event)">
        ${item.text}
      </a>
    </li>
  `).join('');
}

// Renderiza visualização de Documento (Convenção / Regulamento)
function renderDocumentView(docKey) {
  const container = document.getElementById('mainContentArea');
  const config = DOCS_CONFIG[docKey];
  const html = appState.docsHtml[docKey] || '<p>Carregando...</p>';

  container.innerHTML = `
    <div class="document-header-box">
      <h2>${config.icon} ${config.title}</h2>
      <p>${config.subtitle}</p>
      <div class="doc-meta-tags">
        <span class="doc-meta-tag">📄 Arquivo: ${config.file}</span>
        <span class="doc-meta-tag">${config.badge}</span>
        <span class="doc-meta-tag">🔄 Sincronização Dinâmica</span>
      </div>
    </div>
    <div class="markdown-body">
      ${html}
    </div>
  `;

  renderSidebarToc(docKey);
}

// Renderiza visualização do FAQ (Perguntas Frequentes Interativas)
function renderFaqView(filterTag = 'todas') {
  const container = document.getElementById('mainContentArea');
  const rawMd = appState.docsContent['faq'] || '';

  // Parser específico para estruturar o FAQ em cards interativos
  const sections = rawMd.split(/^## /m).slice(1);
  const faqItems = [];

  sections.forEach(sec => {
    const lines = sec.trim().split('\n');
    const categoryTitle = lines[0].trim();
    const rest = lines.slice(1).join('\n');
    const qas = rest.split(/^### /m).slice(1);

    qas.forEach(qa => {
      const qaLines = qa.trim().split('\n');
      const question = qaLines[0].trim();
      const answerMd = qaLines.slice(1).join('\n').trim();

      // Identifica categoria / tags
      let tag = 'geral';
      if (categoryTitle.toLowerCase().includes('silêncio') || categoryTitle.toLowerCase().includes('silencio')) tag = 'silencio';
      else if (categoryTitle.toLowerCase().includes('garagem') || categoryTitle.toLowerCase().includes('veículos')) tag = 'garagem';
      else if (categoryTitle.toLowerCase().includes('mudança') || categoryTitle.toLowerCase().includes('elevador')) tag = 'mudancas';
      else if (categoryTitle.toLowerCase().includes('obras') || categoryTitle.toLowerCase().includes('reformas')) tag = 'obras';
      else if (categoryTitle.toLowerCase().includes('animais') || categoryTitle.toLowerCase().includes('pet')) tag = 'animais';
      else if (categoryTitle.toLowerCase().includes('festa') || categoryTitle.toLowerCase().includes('churrasqueira')) tag = 'festas';
      else if (categoryTitle.toLowerCase().includes('piscina') || categoryTitle.toLowerCase().includes('sauna')) tag = 'piscina';
      else if (categoryTitle.toLowerCase().includes('lixo') || categoryTitle.toLowerCase().includes('higiene')) tag = 'lixo';
      else if (categoryTitle.toLowerCase().includes('taxa') || categoryTitle.toLowerCase().includes('assembleia')) tag = 'financeiro';
      else if (categoryTitle.toLowerCase().includes('infracao') || categoryTitle.toLowerCase().includes('multa')) tag = 'multas';

      faqItems.push({
        category: categoryTitle,
        tag: tag,
        question: question,
        answerHtml: parseMarkdown(answerMd),
        id: `faq-${slugify(question)}`
      });
    });
  });

  const filtered = filterTag === 'todas' ? faqItems : faqItems.filter(item => item.tag === filterTag);

  container.innerHTML = `
    <div class="document-header-box" style="background: linear-gradient(135deg, #2d6a4f, #1b4332);">
      <h2>❓ Perguntas Frequentes dos Condôminos</h2>
      <p>Esclareça rapidamente suas dúvidas sobre barulho, regras de garagem, mudanças, piscina, salão de festas e convivência.</p>
      <div class="doc-meta-tags">
        <span class="doc-meta-tag">💡 ${faqItems.length} Dúvidas Cadastradas</span>
        <span class="doc-meta-tag">🔗 Links Diretos para a Convenção e Regulamento</span>
      </div>
    </div>

    <div class="faq-controls">
      <div class="faq-filter-chips">
        <button class="faq-chip ${filterTag === 'todas' ? 'active' : ''}" onclick="filterFaq('todas')">Todas</button>
        <button class="faq-chip ${filterTag === 'silencio' ? 'active' : ''}" onclick="filterFaq('silencio')">🔇 Silêncio</button>
        <button class="faq-chip ${filterTag === 'garagem' ? 'active' : ''}" onclick="filterFaq('garagem')">🚗 Garagem</button>
        <button class="faq-chip ${filterTag === 'mudancas' ? 'active' : ''}" onclick="filterFaq('mudancas')">📦 Mudanças</button>
        <button class="faq-chip ${filterTag === 'obras' ? 'active' : ''}" onclick="filterFaq('obras')">🔨 Reformas</button>
        <button class="faq-chip ${filterTag === 'animais' ? 'active' : ''}" onclick="filterFaq('animais')">🐶 Animais</button>
        <button class="faq-chip ${filterTag === 'festas' ? 'active' : ''}" onclick="filterFaq('festas')">🎉 Salão/Churrasq.</button>
        <button class="faq-chip ${filterTag === 'piscina' ? 'active' : ''}" onclick="filterFaq('piscina')">🏊 Piscina/Sauna</button>
        <button class="faq-chip ${filterTag === 'lixo' ? 'active' : ''}" onclick="filterFaq('lixo')">🗑️ Lixo</button>
        <button class="faq-chip ${filterTag === 'financeiro' ? 'active' : ''}" onclick="filterFaq('financeiro')">💰 Cota/Assembleias</button>
        <button class="faq-chip ${filterTag === 'multas' ? 'active' : ''}" onclick="filterFaq('multas')">⚖️ Multas</button>
      </div>
      <div class="faq-action-btns">
        <button class="btn-secondary" onclick="toggleAllFaq(true)">Expandir Todos</button>
        <button class="btn-secondary" onclick="toggleAllFaq(false)">Recolher Todos</button>
      </div>
    </div>

    <div class="faq-accordion-group">
      ${filtered.map(item => `
        <div class="faq-card" id="${item.id}">
          <button class="faq-question-btn" onclick="toggleFaqCard(this)">
            <span>${item.question}</span>
            <span class="toggle-icon">▼</span>
          </button>
          <div class="faq-answer-panel">
            ${item.answerHtml}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  renderSidebarToc('faq');
}

// Renderiza visualização do Índice Temático (Guia Rápido por Assuntos)
function renderThematicView() {
  const container = document.getElementById('mainContentArea');

  const topics = [
    {
      icon: '🔇',
      title: 'Silêncio, Barulho e Convivência',
      desc: 'Horário de silêncio (22h às 07h), uso de instrumentos, tolerância diurna e normas de sossego público.',
      links: [
        { label: 'Horário de Silêncio das 22h às 07h', doc: 'regulamento', target: 'regulamento-item-1-2' },
        { label: 'Uso de Aparelhos de Som e TV 24h', doc: 'regulamento', target: 'regulamento-item-1-3' },
        { label: 'Instrumentos Ruidosos e Perturbação', doc: 'regulamento', target: 'regulamento-item-13-22' },
        { label: 'FAQ: Perguntas sobre Silêncio', doc: 'faq', target: 'faq-silencio' }
      ]
    },
    {
      icon: '🚗',
      title: 'Garagem, Vagas e Veículos',
      desc: 'Regra de 1 vaga por unidade, estacionamento obrigatório de ré, limite de 10 km/h, motos e uso de crachás.',
      links: [
        { label: 'Estacionar de Ré e Limites da Vaga', doc: 'regulamento', target: 'regulamento-item-4-4' },
        { label: 'Velocidade Máxima de 10 km/h', doc: 'regulamento', target: 'regulamento-item-4-8' },
        { label: 'Proibição de Lavagem de Carros', doc: 'regulamento', target: 'regulamento-item-4-16' },
        { label: 'Regras de Guarda de Motocicletas', doc: 'regulamento', target: 'regulamento-item-4-24' },
        { label: 'Proibição de Ceder Vaga a Não Residentes', doc: 'regulamento', target: 'regulamento-item-4-6' },
        { label: 'Destinação e Seguro da Garagem', doc: 'convencao', target: 'convencao-clausula-40' }
      ]
    },
    {
      icon: '📦',
      title: 'Mudanças, Cargas e Elevadores',
      desc: 'Horários para mudança (seg a sáb das 09h às 18h), proteção acolchoada nos elevadores e proibições aos domingos.',
      links: [
        { label: 'Horário de Cargas e Mudanças', doc: 'regulamento', target: 'regulamento-item-2-8' },
        { label: 'Proteção Acolchoada Obrigatória no Elevador', doc: 'regulamento', target: 'regulamento-item-3-3' },
        { label: 'Trajes de Banho e Animais no Elevador', doc: 'regulamento', target: 'regulamento-item-3-1' }
      ]
    },
    {
      icon: '🔨',
      title: 'Reformas, Obras e Fachada',
      desc: 'Horários para obras ruidosas (09h às 17h), aviso prévio de 10 dias, ar-condicionado e proibição de fechar sacada.',
      links: [
        { label: 'Horários de Obras e Furadeiras', doc: 'regulamento', target: 'regulamento-item-13-25' },
        { label: 'Aviso Prévio Obrigatório de 10 Dias', doc: 'regulamento', target: 'regulamento-item-13-24' },
        { label: 'Proibição de Fechar/Envidraçar Sacada', doc: 'regulamento', target: 'regulamento-item-17-1' },
        { label: 'Ar-Condicionado Modelo Split na Varanda', doc: 'regulamento', target: 'regulamento-item-13-20' },
        { label: 'Proibição Absoluta de Botijão de Gás', doc: 'regulamento', target: 'regulamento-item-17-3' }
      ]
    },
    {
      icon: '🐶',
      title: 'Animais Domésticos (Pets)',
      desc: 'Trânsito obrigatório pelo estacionamento com guia, recolhimento de fezes, focinheira para raças de guarda e regras de elevador.',
      links: [
        { label: 'Permissão Geral de Pets nos Apartamentos', doc: 'regulamento', target: 'regulamento-item-19-1' },
        { label: 'Trânsito Exclusivo pelo Estacionamento', doc: 'regulamento', target: 'regulamento-item-19-3' },
        { label: 'Obrigatoriedade de Recolher Fezes', doc: 'regulamento', target: 'regulamento-item-19-4' },
        { label: 'Animais no Elevador (Apenas no Colo)', doc: 'regulamento', target: 'regulamento-item-19-6' },
        { label: 'Focinheira Obrigatória para Raças de Guarda', doc: 'regulamento', target: 'regulamento-item-19-7' }
      ]
    },
    {
      icon: '🎉',
      title: 'Salão de Festas e Churrasqueira',
      desc: 'Turnos (09h-14h e 17h-22h), encerramento às 22h, taxa de 10% da cota, lista de convidados na portaria e termo de uso.',
      links: [
        { label: 'Turnos e Horários de Uso', doc: 'regulamento', target: 'regulamento-item-9-3' },
        { label: 'Término Impreterível às 22:00h', doc: 'regulamento', target: 'regulamento-item-9-4' },
        { label: 'Taxa de Locação (10% da cota)', doc: 'regulamento', target: 'regulamento-item-9-7' },
        { label: 'Lista de Convidados Obrigatória', doc: 'regulamento', target: 'regulamento-item-9-19' },
        { label: 'Proibição de Convidados na Piscina', doc: 'regulamento', target: 'regulamento-item-9-17' }
      ]
    },
    {
      icon: '🏊',
      title: 'Piscina, Sauna e Áreas de Lazer',
      desc: 'Horários da piscina (08h às 17h, fecha às segundas), exame médico trimestral, sauna mista e proibição de vidro.',
      links: [
        { label: 'Horários e Manutenção da Piscina', doc: 'regulamento', target: 'regulamento-item-7-10' },
        { label: 'Exame Médico Trimestral Obrigatório', doc: 'regulamento', target: 'regulamento-item-7-17' },
        { label: 'Proibição de Vidros e Som na Piscina', doc: 'regulamento', target: 'regulamento-item-7-6' },
        { label: 'Regras e Horários da Sauna Mista', doc: 'regulamento', target: 'regulamento-item-8-4' },
        { label: 'Horário do Playground (07h às 22h)', doc: 'regulamento', target: 'regulamento-item-5-2' }
      ]
    },
    {
      icon: '🏋️',
      title: 'Academia e Quadra Poliesportiva',
      desc: 'Sala de ginástica (08h às 22h, privativa de moradores), quadra poliesportiva (07h às 22h) e uso obrigatório de tênis.',
      links: [
        { label: 'Regras da Sala de Ginástica', doc: 'regulamento', target: 'regulamento-item-10-1' },
        { label: 'Horários e Normas da Quadra Poliesportiva', doc: 'regulamento', target: 'regulamento-item-11-1' },
        { label: 'Uso Obrigatório de Tênis na Quadra', doc: 'regulamento', target: 'regulamento-item-11-8' }
      ]
    },
    {
      icon: '🗑️',
      title: 'Lixo, Coleta e Higiene Predial',
      desc: 'Proibição de sacos no hall dos elevadores, descarte de materiais volumosos e entulhos de reforma.',
      links: [
        { label: 'Proibição Absoluta de Lixo nos Halls', doc: 'regulamento', target: 'regulamento-item-1-17' },
        { label: 'Regras de Tubulação e Descarte Seguro', doc: 'regulamento', target: 'regulamento-item-6-1' },
        { label: 'Descarte Proibido de Móveis Velhos nas Lixeiras', doc: 'regulamento', target: 'regulamento-item-2-14' }
      ]
    },
    {
      icon: '⚖️',
      title: 'Penalidades, Multas e Recursos',
      desc: 'Multa de 1 a 5 cotas condominiais por infração; até 10 cotas por conduta antissocial reiterada; recurso em até 30 dias.',
      links: [
        { label: 'Aplicação de Multas de 1 a 5 Cotas', doc: 'regulamento', target: 'regulamento-item-1-9' },
        { label: 'Multa de até 10 Cotas (Comportamento Antissocial)', doc: 'regulamento', target: 'regulamento-item-1-10' },
        { label: 'Recurso ao Conselho Consultivo em 30 Dias', doc: 'regulamento', target: 'regulamento-item-16-8' },
        { label: 'Penalidades na Convenção', doc: 'convencao', target: 'convencao-clausula-14' }
      ]
    },
    {
      icon: '🗳️',
      title: 'Assembleias, Quórum e Votação',
      desc: 'Convocação, AGO ordinária anual, quórum de deliberação, procurações de inquilinos e direitos de voto.',
      links: [
        { label: 'Assembleia Geral Ordinária (AGO)', doc: 'convencao', target: 'convencao-clausula-21' },
        { label: 'Direito de Voto e Inadimplência', doc: 'convencao', target: 'convencao-clausula-25' },
        { label: 'Representação por Procuração', doc: 'convencao', target: 'convencao-clausula-26' },
        { label: 'Quórum para Alteração da Convenção', doc: 'convencao', target: 'convencao-clausula-44' }
      ]
    },
    {
      icon: '🏢',
      title: 'Composição do Condomínio (Torres e Blocos)',
      desc: 'Identificação dos 6 blocos, 17 torres (Acácia até Quaresmeira), 457 vagas de garagem e áreas comuns.',
      links: [
        { label: 'Descrição dos 6 Blocos e 17 Torres', doc: 'convencao', target: 'convencao-clausula-2' },
        { label: 'Descrição das Partes Comuns', doc: 'convencao', target: 'convencao-clausula-4' },
        { label: 'Identificação das Unidades Autônomas', doc: 'convencao', target: 'convencao-clausula-5' }
      ]
    }
  ];

  container.innerHTML = `
    <div class="document-header-box" style="background: linear-gradient(135deg, #1b4332, #2d6a4f);">
      <h2>📑 Guia Rápido por Assuntos (Índice Temático)</h2>
      <p>Acesso rápido e direto às cláusulas e itens mais consultados pelos condôminos, organizados por temas do dia a dia.</p>
    </div>

    <div class="thematic-grid">
      ${topics.map(topic => `
        <div class="thematic-card">
          <div class="thematic-card-header">
            <div class="thematic-icon">${topic.icon}</div>
            <h3>${topic.title}</h3>
          </div>
          <p>${topic.desc}</p>
          <ul class="thematic-links-list">
            ${topic.links.map(link => `
              <li>
                <a href="#${link.doc}/${link.target}" class="thematic-link" onclick="navigateToTarget('${link.doc}', '${link.target}', event)">
                  <span>${link.label}</span>
                  <span>➜</span>
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
  `;

  renderSidebarToc('tematico');
}

// Renderiza visualização de Resultados da Busca
function renderSearchResultsView(query, results) {
  const container = document.getElementById('mainContentArea');

  container.innerHTML = `
    <div class="search-results-panel">
      <div class="search-results-header">
        <div>
          <h2>Resultados da Pesquisa por: "<em>${query}</em>"</h2>
          <span style="font-size:0.85rem;color:var(--text-muted);">Pesquisa instantânea em toda a Convenção, Regulamento e FAQ</span>
        </div>
        <span class="search-count-badge">${results.length} ocorrência(s) encontrada(s)</span>
      </div>

      ${results.length === 0 ? `
        <div style="text-align:center;padding:3rem 1rem;color:var(--text-muted);">
          <p style="font-size:1.1rem;margin-bottom:0.5rem;">Nenhum resultado encontrado para o termo pesquisado.</p>
          <p style="font-size:0.85rem;">Tente pesquisar por palavras-chave mais simples, como <strong>silêncio</strong>, <strong>mudança</strong>, <strong>vaga</strong>, <strong>piscina</strong>, <strong>multa</strong> ou <strong>pet</strong>.</p>
        </div>
      ` : `
        <div class="search-results-list">
          ${results.map(r => `
            <div class="search-result-item" onclick="navigateToTarget('${r.docKey}', '${r.id}', event)">
              <div class="result-header">
                <span class="result-doc-tag">${r.docTitle}</span>
                <span class="result-title">${r.section}</span>
              </div>
              <div class="result-snippet">${createHighlightSnippet(r.text, query)}</div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

/* ==========================================================================
   NAVEGAÇÃO, TABS E ROTEAMENTO POR HASH
   ========================================================================== */
function switchTab(tabKey) {
  appState.activeTab = tabKey;

  // Atualiza classes ativas nas abas do topo
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabKey);
  });

  if (tabKey === 'convencao' || tabKey === 'regulamento') {
    renderDocumentView(tabKey);
  } else if (tabKey === 'faq') {
    renderFaqView();
  } else if (tabKey === 'tematico') {
    renderThematicView();
  }

  // Fecha sidebar mobile se estiver aberta
  closeMobileSidebar();
}

// Navega e rola diretamente até uma âncora/cláusula
function navigateToTarget(docKey, targetId, event) {
  if (event) event.preventDefault();

  // Troca para o documento alvo se for diferente
  if (appState.activeTab !== docKey) {
    switchTab(docKey);
  }

  setTimeout(() => {
    let targetEl = document.getElementById(targetId);

    // Se não encontrou o ID exato, procura por aproximação
    if (!targetEl) {
      const candidates = document.querySelectorAll(`[id*="${targetId}"]`);
      if (candidates.length > 0) targetEl = candidates[0];
    }

    if (targetEl) {
      // Se for um item de FAQ fechado, abre-o
      const faqCard = targetEl.closest('.faq-card');
      if (faqCard && !faqCard.classList.contains('open')) {
        faqCard.classList.add('open');
      }

      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetEl.classList.remove('highlight-target');
      void targetEl.offsetWidth; // Força reflow
      targetEl.classList.add('highlight-target');

      // Atualiza o hash da URL
      window.location.hash = `${docKey}/${targetId}`;
    }
  }, 100);

  closeMobileSidebar();
}

// Copia o link direto para a seção na área de transferência
function copyAnchorLink(docKey, slug) {
  const url = `${window.location.origin}${window.location.pathname}#${docKey}/${slug}`;
  navigator.clipboard.writeText(url).then(() => {
    alert(`Link copiado para a área de transferência:\n${url}`);
  }).catch(() => {
    prompt('Copie o link abaixo:', url);
  });
}

/* ==========================================================================
   INTERAÇÕES DO FAQ
   ========================================================================== */
function toggleFaqCard(button) {
  const card = button.closest('.faq-card');
  card.classList.toggle('open');
}

function toggleAllFaq(expand) {
  document.querySelectorAll('.faq-card').forEach(card => {
    card.classList.toggle('open', expand);
  });
}

function filterFaq(tag) {
  renderFaqView(tag);
}

/* ==========================================================================
   ACERTOS DE ACESSIBILIDADE E TEMA
   ========================================================================== */
function toggleTheme() {
  const newTheme = appState.theme === 'light' ? 'dark' : 'light';
  appState.theme = newTheme;
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('jardim_theme', newTheme);
  document.getElementById('themeToggleBtn').innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
}

function changeFontSize(delta) {
  let newSize = appState.fontSize + delta;
  if (newSize < 0.85) newSize = 0.85;
  if (newSize > 1.35) newSize = 1.35;
  appState.fontSize = newSize;
  document.documentElement.style.setProperty('--font-size-multiplier', newSize);
  localStorage.setItem('jardim_font_size', newSize);
}

function resetFontSize() {
  appState.fontSize = 1;
  document.documentElement.style.setProperty('--font-size-multiplier', 1);
  localStorage.setItem('jardim_font_size', 1);
}

// Controle da Sidebar no Mobile
function toggleMobileSidebar() {
  const sidebar = document.getElementById('appSidebar');
  sidebar.classList.toggle('mobile-open');
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('appSidebar');
  if (sidebar) sidebar.classList.remove('mobile-open');
}

// Modais
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('open');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}

/* ==========================================================================
   INICIALIZAÇÃO DO APLICATIVO
   ========================================================================== */
async function initializeApp() {
  console.info('[Wiki Jardim do Ypê] Inicializando aplicação...');

  // Configura tema
  document.documentElement.setAttribute('data-theme', appState.theme);
  document.getElementById('themeToggleBtn').innerHTML = appState.theme === 'dark' ? '☀️' : '🌙';
  document.documentElement.style.setProperty('--font-size-multiplier', appState.fontSize);

  // 1. Carrega todos os documentos em paralelo
  const keys = ['convencao', 'regulamento', 'faq'];
  for (const key of keys) {
    const rawText = await loadDocument(key);
    appState.docsContent[key] = rawText;

    const parsedHtml = parseMarkdown(rawText);
    const processed = processDocumentHtml(parsedHtml, key);
    appState.docsHtml[key] = processed.html;
    appState.tocData[key] = processed.toc;
  }

  // 2. Atualiza badge de status da sincronização
  const statusBadge = document.getElementById('liveStatusBadge');
  if (statusBadge) {
    if (appState.isLiveSync) {
      statusBadge.innerHTML = '<span class="status-dot"></span> Sincronizado ao vivo (.md)';
      statusBadge.setAttribute('title', 'Consumindo os arquivos .md diretamente via HTTP. Qualquer alteração nos arquivos é refletida automaticamente!');
    } else {
      statusBadge.innerHTML = '<span class="status-dot" style="background-color:#eab308"></span> Modo Cache / Offline';
      statusBadge.setAttribute('title', 'Executando em modo de contingência/offline. Quando hospedado na web, a sincronização é 100% ao vivo.');
    }
  }

  // 3. Monta o índice de busca
  buildSearchIndex();

  // 4. Configura ouvintes de busca em tempo real
  const searchInput = document.getElementById('globalSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim();

      if (query.length > 0 && clearSearchBtn) {
        clearSearchBtn.style.display = 'block';
      } else if (clearSearchBtn) {
        clearSearchBtn.style.display = 'none';
      }

      debounceTimer = setTimeout(() => {
        if (query.length >= 2) {
          const results = executeSearch(query);
          renderSearchResultsView(query, results);
        } else if (query.length === 0) {
          switchTab(appState.activeTab);
        }
      }, 180);
    });

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        switchTab(appState.activeTab);
      });
    }

    // Atalho de teclado: tecla '/' ou 'Ctrl+K' foca na busca
    window.addEventListener('keydown', (e) => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      } else if (e.key === 'Escape' && document.activeElement === searchInput) {
        searchInput.blur();
      }
    });
  }

  // 5. Botão Voltar ao Topo
  const backToTopBtn = document.getElementById('backToTopBtn');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  });

  // 6. Roteamento inicial por Hash (ex: #regulamento/item-4-4 ou #faq)
  const initialHash = window.location.hash.substring(1);
  if (initialHash) {
    const parts = initialHash.split('/');
    const targetDoc = parts[0];
    const targetId = parts[1];

    if (DOCS_CONFIG[targetDoc] || targetDoc === 'tematico') {
      switchTab(targetDoc);
      if (targetId) {
        setTimeout(() => navigateToTarget(targetDoc, targetId), 200);
      }
    } else {
      switchTab('convencao');
    }
  } else {
    // Aba padrão inicial
    switchTab('convencao');
  }

  console.info('[Wiki Jardim do Ypê] Aplicação carregada e pronta com sucesso!');
}

// Inicia quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initializeApp);
