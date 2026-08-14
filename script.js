/* =========================================================
   DOCE SABOR — Sistema de Gestão de Estoque e Vendas
   Front-end de demonstração (dados em memória, sem back-end).
   Baseado nas regras de negócio da documentação do projeto:
     - Semáforo de validade: verde (>5 dias), amarelo (3-5 dias),
       vermelho (<3 dias)
     - Método PEPS: o lote mais antigo é sempre vendido primeiro
   ========================================================= */

(() => {
  "use strict";

  /* ---------------- Helpers de data ---------------- */
  const DAY = 24 * 60 * 60 * 1000;
  const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
  const addDays = (n) => { const d = today(); d.setDate(d.getDate() + n); return d; };
  const toISO = (d) => d.toISOString().slice(0, 10);
  const fmtDate = (iso) => {
    const [y,m,d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };
  const diasRestantes = (validadeISO) => Math.round((new Date(validadeISO) - today()) / DAY);
  const fmtBRL = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function statusSemaforo(dias) {
    if (dias < 0) return "vencido";
    if (dias < 3) return "vermelho";
    if (dias <= 5) return "amarelo";
    return "verde";
  }
  const STATUS_LABEL = { verde: "Verde", amarelo: "Amarelo", vermelho: "Vermelho", vencido: "Vencido" };
  const STATUS_COLOR = { verde: "var(--status-green)", amarelo: "var(--status-yellow)", vermelho: "var(--status-red)", vencido: "var(--status-red)" };

  /* ---------------- Estado (dados em memória) ---------------- */

  const state = {
    user: null,
    view: "dashboard",
    cart: [], // {loteId, qty}
    nextProdutoId: 7,
    nextLoteId: 12,
    nextVendaId: 1,
    nextHistoricoId: 1,

    // ETAPA 1: array que guarda o "log" de ações importantes
    // (quem cadastrou lote, quem excluiu lote, quem cadastrou usuário).
    // Cada item: { id, tipo, descricao, usuario, dataHora }
    historico: [],

    usuarios: [
      // ETAPA SENHA: agora cada usuário tem uma "senha" de verdade.
      // Aqui ela está em texto puro só porque isso ainda é 100% front-end.
      // Quando o PHP entrar, essa senha NUNCA deve ir em texto puro pro banco —
      // o certo lá é usar password_hash() ao salvar e password_verify() ao conferir.
      { email: "admin@gmail.com.br", nome: "user teste", perfil: "admin", senha: "demo1234" },
      { email: "operador@gmail.com.br", nome: "user teste", perfil: "operador", senha: "demo1234" },
    ],

    produtos: [
      { id: 1, nome: "Brigadeiro Gourmet", categoria: "Doce", unidade: "unidade", preco: 4.5 },
      { id: 2, nome: "Bolo de Chocolate", categoria: "Bolo", unidade: "fatia", preco: 9.0 },
      { id: 3, nome: "Coxinha de Frango", categoria: "Salgado", unidade: "unidade", preco: 7.5 },
      { id: 4, nome: "Beijinho", categoria: "Doce", unidade: "unidade", preco: 4.0 },
      { id: 5, nome: "Torta de Limão", categoria: "Torta", unidade: "fatia", preco: 11.0 },
      { id: 6, nome: "Pão de Queijo", categoria: "Salgado", unidade: "unidade", preco: 5.0 },
    ],

    // datas relativas a hoje para que o semáforo já nasça coerente
    // ETAPA 2: cada lote agora tem "criadoPor" — quem cadastrou aquele lote.
    // Os lotes de exemplo (seed) recebem "Sistema" porque não foram
    // cadastrados por ninguém logado.
    lotes: [
      { id: 1, produtoId: 1, fabricacao: addDays(-10), validade: addDays(1), qtdInicial: 40, qtdAtual: 14, status: "ativo", criadoPor: "Sistema" },
      { id: 2, produtoId: 1, fabricacao: addDays(-2), validade: addDays(9), qtdInicial: 30, qtdAtual: 30, status: "ativo", criadoPor: "Sistema" },
      { id: 3, produtoId: 2, fabricacao: addDays(-6), validade: addDays(2), qtdInicial: 12, qtdAtual: 5, status: "ativo", criadoPor: "Sistema" },
      { id: 4, produtoId: 2, fabricacao: addDays(-1), validade: addDays(8), qtdInicial: 16, qtdAtual: 16, status: "ativo", criadoPor: "Sistema" },
      { id: 5, produtoId: 3, fabricacao: addDays(-3), validade: addDays(4), qtdInicial: 25, qtdAtual: 18, status: "ativo", criadoPor: "Sistema" },
      { id: 6, produtoId: 4, fabricacao: addDays(-8), validade: addDays(-1), qtdInicial: 20, qtdAtual: 3, status: "ativo", criadoPor: "Sistema" },
      { id: 7, produtoId: 4, fabricacao: addDays(-1), validade: addDays(10), qtdInicial: 24, qtdAtual: 24, status: "ativo", criadoPor: "Sistema" },
      { id: 8, produtoId: 5, fabricacao: addDays(-2), validade: addDays(5), qtdInicial: 10, qtdAtual: 7, status: "ativo", criadoPor: "Sistema" },
      { id: 9, produtoId: 6, fabricacao: addDays(-4), validade: addDays(3), qtdInicial: 35, qtdAtual: 21, status: "ativo", criadoPor: "Sistema" },
      { id: 10, produtoId: 6, fabricacao: addDays(-1), validade: addDays(12), qtdInicial: 30, qtdAtual: 30, status: "ativo", criadoPor: "Sistema" },
      { id: 11, produtoId: 3, fabricacao: addDays(-9), validade: addDays(-2), qtdInicial: 15, qtdAtual: 0, status: "vencido", criadoPor: "Sistema" },
    ],

    vendas: [], // {id, dataHora, itens:[{loteId, produtoId, qtd, precoUnit}], total}
  };

  /* ---------------- Lookups ---------------- */
  const produtoById = (id) => state.produtos.find((p) => p.id === id);
  const loteById = (id) => state.lotes.find((l) => l.id === id);

  function lotesAtivos() {
    return state.lotes.filter((l) => l.status !== "vencido" && l.qtdAtual > 0);
  }

  // PEPS: entre os lotes ativos de um produto, retorna o de fabricação mais antiga
  function loteMaisAntigo(produtoId) {
    return lotesAtivos()
      .filter((l) => l.produtoId === produtoId)
      .sort((a, b) => a.fabricacao - b.fabricacao)[0] || null;
  }

  /* ---------------- Toast ---------------- */
  let toastTimer = null;
  function toast(msg, isError = false) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.toggle("error", isError);
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  /* ---------------- Histórico de ações (auditoria) ---------------- */
  // ETAPA 3: função central que registra uma ação no "log".
  // Sempre que alguém cadastra lote, exclui lote, ou cadastra usuário,
  // chamamos essa função para guardar quem fez, o quê e quando.
  function logHistorico(tipo, descricao) {
    state.historico.unshift({
      id: state.nextHistoricoId++,
      tipo,               // 'lote_criado' | 'lote_excluido' | 'usuario_criado'
      descricao,          // texto pronto pra mostrar na tela
      usuario: state.user.nome,
      dataHora: new Date().toISOString(),
    });
  }

  /* =========================================================
     LOGIN
     ========================================================= */
  const loginScreen = document.getElementById("login-screen");
  const appRoot = document.getElementById("app");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");

  document.querySelectorAll(".demo-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.getElementById("login-email").value = chip.dataset.email;
      document.getElementById("login-password").value = "demo1234";
    });
  });

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const senha = document.getElementById("login-password").value;

    if (!email || !senha) {
      showLoginError("Informe e-mail e senha para continuar.");
      return;
    }
    const user = state.usuarios.find((u) => u.email === email);
    if (!user) {
      showLoginError("E-mail não encontrado. Tente uma das contas de demonstração.");
      return;
    }
    // ETAPA SENHA: agora a senha é conferida de verdade.
    // Aqui é uma comparação simples de texto (só porque tudo ainda é
    // front-end). No PHP, essa checagem vira password_verify($senha, $hash).
    if (senha !== user.senha) {
      showLoginError("Senha incorreta.");
      return;
    }
    loginError.hidden = true;
    state.user = user;
    enterApp();
  });

  function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.hidden = false;
  }

  function enterApp() {
    loginScreen.hidden = true;
    appRoot.hidden = false;
    document.getElementById("sidebar-username").textContent = state.user.nome;
    document.getElementById("sidebar-userrole").textContent = state.user.perfil;
    document.getElementById("sidebar-avatar").textContent = state.user.nome.charAt(0);
    toast(`Bem-vinda, ${state.user.nome.split(" ")[0]}!`);
    applyPermissions();
    renderAll();
  }

  // ETAPA 4: define o que cada perfil pode ver.
  // Por enquanto a única diferença é: só "admin" enxerga o menu "Usuários".
  function applyPermissions() {
    const isAdmin = state.user.perfil === "admin";
    document.querySelectorAll('[data-admin-only="true"]').forEach((el) => {
      el.hidden = !isAdmin;
    });
  }

  document.getElementById("logout-btn").addEventListener("click", () => {
    state.user = null;
    state.cart = [];
    appRoot.hidden = true;
    loginScreen.hidden = false;
    loginForm.reset();
  });

  /* =========================================================
     NAVEGAÇÃO
     ========================================================= */
  const views = document.querySelectorAll(".view");
  const navItems = document.querySelectorAll(".nav-item");
  const topbarTitle = document.getElementById("topbar-title");
  const topbarEyebrow = document.getElementById("topbar-eyebrow");

  const VIEW_META = {
    dashboard: { title: "Dashboard", eyebrow: "Visão geral" },
    estoque: { title: "Gestão de estoque", eyebrow: "Produtos & lotes" },
    vendas: { title: "Registrar venda", eyebrow: "PDV · PEPS automático" },
    alertas: { title: "Alertas de validade", eyebrow: "Ação necessária" },
    relatorios: { title: "Relatórios", eyebrow: "Desempenho & desperdício" },
    usuarios: { title: "Usuários", eyebrow: "Administração" },
  };

  function navigate(view) {
    // ETAPA 5 (segurança extra): se um operador tentar entrar em "usuarios"
    // de algum jeito (ex: link direto), a gente barra e volta pro dashboard.
    if (view === "usuarios" && state.user?.perfil !== "admin") {
      view = "dashboard";
    }
    state.view = view;
    views.forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
    navItems.forEach((n) => n.classList.toggle("active", n.dataset.view === view));
    topbarTitle.textContent = VIEW_META[view].title;
    topbarEyebrow.textContent = VIEW_META[view].eyebrow;
    document.querySelector(".sidebar")?.classList.remove("open");
    renderAll();
  }
  navItems.forEach((n) => n.addEventListener("click", () => navigate(n.dataset.view)));

  /* =========================================================
     RELÓGIO
     ========================================================= */
  function tickClock() {
    const el = document.getElementById("topbar-clock");
    const now = new Date();
    el.textContent = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) +
      " · " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  tickClock();
  setInterval(tickClock, 30000);

  /* =========================================================
     RENDER: DASHBOARD
     ========================================================= */
  function renderDashboard() {
    const ativos = lotesAtivos();
    const urgentes = ativos.filter((l) => statusSemaforo(diasRestantes(toISO(l.validade))) === "vermelho");
    const atencao = ativos.filter((l) => statusSemaforo(diasRestantes(toISO(l.validade))) === "amarelo");

    document.getElementById("kpi-lotes-ativos").textContent = ativos.length;
    document.getElementById("kpi-urgentes").textContent = urgentes.length;
    document.getElementById("kpi-atencao").textContent = atencao.length;

    const hojeISO = toISO(today());
    const vendasHoje = state.vendas.filter((v) => v.dataHora.slice(0, 10) === hojeISO);
    document.getElementById("kpi-vendas-hoje").textContent = vendasHoje.length;
    document.getElementById("kpi-vendas-hoje-valor").textContent =
      fmtBRL(vendasHoje.reduce((s, v) => s + v.total, 0));

    // Rings — todos os lotes ativos, ordenados por urgência
    const ringWrap = document.getElementById("dashboard-rings");
    const ordenados = [...ativos].sort((a, b) => a.validade - b.validade).slice(0, 10);
    ringWrap.innerHTML = ordenados.map((l) => {
      const dias = diasRestantes(toISO(l.validade));
      const st = statusSemaforo(dias);
      const produto = produtoById(l.produtoId);
      const pct = Math.max(0, Math.min(1, dias / 14)); // janela de referência: 14 dias
      const r = 38, circ = 2 * Math.PI * r;
      const offset = circ * (1 - pct);
      return `
        <div class="ring-card">
          <div class="ring">
            <svg viewBox="0 0 88 88">
              <circle class="ring__track" cx="44" cy="44" r="${r}"></circle>
              <circle class="ring__fill" cx="44" cy="44" r="${r}"
                stroke="${STATUS_COLOR[st]}"
                stroke-dasharray="${circ}" stroke-dashoffset="${offset}"></circle>
            </svg>
            <div class="ring__center">
              <strong>${dias < 0 ? "0" : dias}</strong>
              <span>dias</span>
            </div>
          </div>
          <div class="ring-card__name">${produto.nome}</div>
          <div class="ring-card__lote">lote #${String(l.id).padStart(3, "0")}</div>
        </div>`;
    }).join("") || `<p class="empty-state">Nenhum lote ativo no estoque.</p>`;

    // Painel de urgência
    const urgWrap = document.getElementById("dashboard-urgentes");
    const criticos = [...ativos]
      .map((l) => ({ l, dias: diasRestantes(toISO(l.validade)) }))
      .filter((x) => x.dias <= 5)
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 8);
    urgWrap.innerHTML = criticos.map(({ l, dias }) => {
      const st = statusSemaforo(dias);
      const produto = produtoById(l.produtoId);
      return `
        <div class="urgent-row">
          <span class="urgent-row__badge" style="background:${STATUS_COLOR[st]}"></span>
          <div class="urgent-row__info">
            <strong>${produto.nome}</strong>
            <small>lote #${String(l.id).padStart(3, "0")} · ${l.qtdAtual} ${produto.unidade}</small>
          </div>
          <span class="urgent-row__days" style="background:${st === "vermelho" ? "var(--status-red-bg)" : "var(--status-yellow-bg)"}; color:${st === "vermelho" ? "var(--status-red)" : "#8a6d00"}">
            ${dias < 0 ? "vencido" : `${dias}d`}
          </span>
        </div>`;
    }).join("") || `<p class="empty-state">Nenhum item crítico. 🎉</p>`;

    // badge do menu
    const badge = document.getElementById("nav-alert-count");
    const totalAlertas = urgentes.length + atencao.length;
    badge.textContent = totalAlertas;
    badge.hidden = totalAlertas === 0;
  }

  /* =========================================================
     RENDER: ESTOQUE
     ========================================================= */
  const estoqueSearch = document.getElementById("estoque-search");
  const estoqueFilterCategoria = document.getElementById("estoque-filter-categoria");
  const estoqueFilterStatus = document.getElementById("estoque-filter-status");
  [estoqueSearch, estoqueFilterCategoria, estoqueFilterStatus].forEach((el) =>
    el.addEventListener("input", renderEstoque)
  );

  function populateCategoriaFilter() {
    const cats = [...new Set(state.produtos.map((p) => p.categoria))];
    estoqueFilterCategoria.innerHTML = `<option value="">Todas as categorias</option>` +
      cats.map((c) => `<option value="${c}">${c}</option>`).join("");
  }

  function renderEstoque() {
    const term = estoqueSearch.value.trim().toLowerCase();
    const cat = estoqueFilterCategoria.value;
    const statusFilter = estoqueFilterStatus.value;

    const rows = state.lotes
      .map((l) => ({ l, produto: produtoById(l.produtoId), dias: diasRestantes(toISO(l.validade)) }))
      .filter(({ produto }) => produto.nome.toLowerCase().includes(term))
      .filter(({ produto }) => !cat || produto.categoria === cat)
      .filter(({ l, dias }) => !statusFilter || (l.status === "vencido" ? "vermelho" : statusSemaforo(dias)) === statusFilter)
      .sort((a, b) => a.dias - b.dias);

    const tbody = document.getElementById("estoque-tbody");
    tbody.innerHTML = rows.map(({ l, produto, dias }) => {
      const st = l.status === "vencido" ? "vencido" : statusSemaforo(dias);
      const pillClass = st === "vencido" ? "vermelho" : st;
      return `
        <tr>
          <td class="cell-strong">${produto.nome}</td>
          <td>${produto.categoria}</td>
          <td class="cell-mono">#${String(l.id).padStart(3, "0")}</td>
          <td class="cell-mono">${fmtDate(toISO(l.fabricacao))}</td>
          <td class="cell-mono">${fmtDate(toISO(l.validade))}</td>
          <td class="cell-strong">${l.qtdAtual} <span style="color:var(--plum-500);font-weight:500;">${produto.unidade}</span></td>
          <td><span class="status-pill status-pill--${pillClass}">${st === "vencido" ? "Vencido" : STATUS_LABEL[st]}</span></td>
          <td class="cell-mono">${l.criadoPor || "—"}</td>
          <td>
            <button class="icon-btn icon-btn--danger" data-excluir-lote="${l.id}" title="Excluir lote" aria-label="Excluir lote">
              <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-8 0 1 13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </td>
        </tr>`;
    }).join("");

    document.getElementById("estoque-empty").hidden = rows.length > 0;

    // ETAPA 3: liga o clique do botão de excluir em cada linha da tabela.
    // Pede confirmação, remove o lote da lista e registra no histórico quem excluiu.
    tbody.querySelectorAll("[data-excluir-lote]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const loteId = parseInt(btn.dataset.excluirLote, 10);
        const lote = loteById(loteId);
        if (!lote) return;
        const produto = produtoById(lote.produtoId);

        const confirmado = confirm(`Excluir o lote #${String(loteId).padStart(3, "0")} de ${produto.nome}? Essa ação não pode ser desfeita.`);
        if (!confirmado) return;

        state.lotes = state.lotes.filter((l) => l.id !== loteId);
        logHistorico("lote_excluido", `${state.user.nome} excluiu o lote #${String(loteId).padStart(3, "0")} de ${produto.nome}`);

        toast("Lote excluído.");
        renderAll();
      });
    });
  }

  /* -------- Modal: novo lote / produto -------- */
  const modalLote = document.getElementById("modal-lote");
  const formLote = document.getElementById("form-lote");
  const loteProdutoExistente = document.getElementById("lote-produto-existente");
  const novoProdutoFields = document.getElementById("novo-produto-fields");
  const loteFormError = document.getElementById("lote-form-error");

  function populateProdutoSelect() {
    loteProdutoExistente.innerHTML = `<option value="">— Novo produto —</option>` +
      state.produtos.map((p) => `<option value="${p.id}">${p.nome}</option>`).join("");
  }

  function openModalLote() {
    formLote.reset();
    loteFormError.hidden = true;
    populateProdutoSelect();
    novoProdutoFields.style.display = "block";
    document.getElementById("lote-data-fabricacao").value = toISO(today());
    modalLote.hidden = false;
  }
  function closeModalLote() { modalLote.hidden = true; }

  document.getElementById("open-novo-lote").addEventListener("click", openModalLote);
  document.getElementById("close-modal-lote").addEventListener("click", closeModalLote);
  document.getElementById("cancel-modal-lote").addEventListener("click", closeModalLote);
  modalLote.addEventListener("click", (e) => { if (e.target === modalLote) closeModalLote(); });

  loteProdutoExistente.addEventListener("change", () => {
    novoProdutoFields.style.display = loteProdutoExistente.value ? "none" : "block";
  });

  formLote.addEventListener("submit", (e) => {
    e.preventDefault();
    const fab = document.getElementById("lote-data-fabricacao").value;
    const val = document.getElementById("lote-data-validade").value;
    const qtd = parseInt(document.getElementById("lote-quantidade").value, 10);

    if (!fab || !val || !qtd || qtd <= 0) {
      return showLoteError("Preencha as datas e uma quantidade válida.");
    }
    if (new Date(val) <= new Date(fab)) {
      return showLoteError("A validade precisa ser posterior à fabricação.");
    }

    let produtoId = parseInt(loteProdutoExistente.value, 10);
    if (!produtoId) {
      const nome = document.getElementById("lote-produto-nome").value.trim();
      if (!nome) return showLoteError("Informe o nome do novo produto.");
      const preco = parseFloat(document.getElementById("lote-produto-preco").value) || 0;
      produtoId = state.nextProdutoId++;
      state.produtos.push({
        id: produtoId,
        nome,
        categoria: document.getElementById("lote-produto-categoria").value,
        unidade: document.getElementById("lote-produto-unidade").value,
        preco,
      });
    }

    const novoLoteId = state.nextLoteId++;
    state.lotes.push({
      id: novoLoteId,
      produtoId,
      fabricacao: new Date(fab),
      validade: new Date(val),
      qtdInicial: qtd,
      qtdAtual: qtd,
      status: "ativo",
      criadoPor: state.user.nome, // ETAPA 2: guarda quem cadastrou este lote
    });

    // ETAPA 3: registra a ação no histórico de auditoria
    const produtoDoLote = produtoById(produtoId);
    logHistorico("lote_criado", `${state.user.nome} cadastrou o lote #${String(novoLoteId).padStart(3, "0")} de ${produtoDoLote.nome}`);

    closeModalLote();
    toast("Lote cadastrado com sucesso.");
    populateCategoriaFilter();
    renderAll();
  });

  function showLoteError(msg) {
    loteFormError.textContent = msg;
    loteFormError.hidden = false;
  }

  /* =========================================================
     RENDER: PDV (Registrar venda)
     ========================================================= */
  const pdvSearch = document.getElementById("pdv-search");
  pdvSearch.addEventListener("input", renderPdvProdutos);

  function renderPdvProdutos() {
    const term = pdvSearch.value.trim().toLowerCase();
    const wrap = document.getElementById("pdv-produtos");
    const list = state.produtos.filter((p) => p.nome.toLowerCase().includes(term));

    wrap.innerHTML = list.map((p) => {
      const lote = loteMaisAntigo(p.id);
      const disabled = !lote;
      const dias = lote ? diasRestantes(toISO(lote.validade)) : null;
      const st = lote ? statusSemaforo(dias) : null;
      return `
        <button class="pdv-produto-card" data-produto-id="${p.id}" ${disabled ? "disabled" : ""}>
          <div class="pdv-produto-card__top">
            <div>
              <div class="pdv-produto-card__name">${p.nome}</div>
              <div class="pdv-produto-card__cat">${p.categoria}</div>
            </div>
            <div class="pdv-produto-card__price">${fmtBRL(p.preco)}</div>
          </div>
          ${lote
            ? `<div class="pdv-produto-card__lote"><span class="dot" style="background:${STATUS_COLOR[st]}"></span> Lote #${String(lote.id).padStart(3,"0")} · vence em ${dias < 0 ? "0" : dias}d · ${lote.qtdAtual} disp.</div>`
            : `<div class="pdv-produto-card__lote">Sem estoque disponível</div>`}
        </button>`;
    }).join("");

    wrap.querySelectorAll(".pdv-produto-card:not(:disabled)").forEach((btn) => {
      btn.addEventListener("click", () => addToCart(parseInt(btn.dataset.produtoId, 10)));
    });
  }

  function addToCart(produtoId) {
    const lote = loteMaisAntigo(produtoId);
    if (!lote) return toast("Sem lote disponível para este produto.", true);

    const existing = state.cart.find((c) => c.loteId === lote.id);
    const currentQty = existing ? existing.qty : 0;
    if (currentQty + 1 > lote.qtdAtual) {
      return toast("Quantidade solicitada excede o estoque do lote.", true);
    }
    if (existing) existing.qty++;
    else state.cart.push({ loteId: lote.id, qty: 1 });

    renderCart();
    renderPdvProdutos();
  }

  function changeCartQty(loteId, delta) {
    const item = state.cart.find((c) => c.loteId === loteId);
    if (!item) return;
    const lote = loteById(loteId);
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      state.cart = state.cart.filter((c) => c.loteId !== loteId);
    } else if (newQty > lote.qtdAtual) {
      toast("Quantidade excede o estoque disponível.", true);
      return;
    } else {
      item.qty = newQty;
    }
    renderCart();
    renderPdvProdutos();
  }

  function renderCart() {
    const wrap = document.getElementById("pdv-cart-items");
    const finalizarBtn = document.getElementById("finalizar-venda");
    const hint = document.getElementById("pdv-cart-hint");

    if (state.cart.length === 0) {
      wrap.innerHTML = `<div class="pdv-cart__empty">Nenhum item no carrinho ainda.</div>`;
      finalizarBtn.disabled = true;
      hint.textContent = "Adicione produtos ao carrinho.";
    } else {
      wrap.innerHTML = state.cart.map((c) => {
        const lote = loteById(c.loteId);
        const produto = produtoById(lote.produtoId);
        return `
          <div class="cart-item">
            <div class="cart-item__info">
              <strong>${produto.nome}</strong>
              <small>lote #${String(lote.id).padStart(3, "0")} · ${fmtBRL(produto.preco)} / ${produto.unidade}</small>
            </div>
            <div class="qty-stepper">
              <button type="button" data-lote="${lote.id}" data-delta="-1">−</button>
              <span>${c.qty}</span>
              <button type="button" data-lote="${lote.id}" data-delta="1">+</button>
            </div>
            <button class="cart-item__remove" data-remove="${lote.id}" title="Remover" aria-label="Remover">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>`;
      }).join("");
      finalizarBtn.disabled = false;
      hint.textContent = `${state.cart.reduce((s, c) => s + c.qty, 0)} item(ns) no carrinho — PEPS aplicado automaticamente.`;

      wrap.querySelectorAll("[data-delta]").forEach((btn) =>
        btn.addEventListener("click", () => changeCartQty(parseInt(btn.dataset.lote, 10), parseInt(btn.dataset.delta, 10)))
      );
      wrap.querySelectorAll("[data-remove]").forEach((btn) =>
        btn.addEventListener("click", () => {
          state.cart = state.cart.filter((c) => c.loteId !== parseInt(btn.dataset.remove, 10));
          renderCart();
          renderPdvProdutos();
        })
      );
    }

    const total = state.cart.reduce((sum, c) => {
      const lote = loteById(c.loteId);
      const produto = produtoById(lote.produtoId);
      return sum + produto.preco * c.qty;
    }, 0);
    document.getElementById("pdv-total").textContent = fmtBRL(total);
  }

  document.getElementById("cancelar-venda").addEventListener("click", () => {
    state.cart = [];
    renderCart();
    renderPdvProdutos();
  });

  document.getElementById("finalizar-venda").addEventListener("click", () => {
    if (state.cart.length === 0) return;

    const itens = state.cart.map((c) => {
      const lote = loteById(c.loteId);
      const produto = produtoById(lote.produtoId);
      lote.qtdAtual -= c.qty; // baixa automática no estoque
      return { loteId: lote.id, produtoId: produto.id, qtd: c.qty, precoUnit: produto.preco };
    });
    const total = itens.reduce((s, i) => s + i.precoUnit * i.qtd, 0);

    state.vendas.unshift({
      id: state.nextVendaId++,
      dataHora: new Date().toISOString(),
      itens,
      total,
    });

    state.cart = [];
    toast(`Venda registrada: ${fmtBRL(total)}`);
    renderAll();
  });

  /* =========================================================
     RENDER: ALERTAS
     ========================================================= */
  function renderAlertas() {
    const wrap = document.getElementById("alertas-list");
    const criticos = lotesAtivos()
      .map((l) => ({ l, dias: diasRestantes(toISO(l.validade)) }))
      .filter((x) => x.dias <= 5)
      .sort((a, b) => a.dias - b.dias);

    wrap.innerHTML = criticos.map(({ l, dias }) => {
      const st = statusSemaforo(dias);
      const produto = produtoById(l.produtoId);
      const rowClass = st === "vermelho" ? "vermelho" : "amarelo";
      const icon = st === "vermelho"
        ? `<path d="M12 3 2 20h20L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 10v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`
        : `<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
      return `
        <div class="alert-row alert-row--${rowClass}">
          <div class="alert-row__icon"><svg viewBox="0 0 24 24" fill="none">${icon}</svg></div>
          <div class="alert-row__info">
            <strong>${produto.nome} · lote #${String(l.id).padStart(3, "0")}</strong>
            <p>${st === "vermelho" ? "Venda urgente ou descarte recomendado." : "Priorizar a venda deste lote."}</p>
            <div class="alert-row__meta">${l.qtdAtual} ${produto.unidade} · vence em ${fmtDate(toISO(l.validade))} (${dias < 0 ? "vencido" : dias + "d"})</div>
          </div>
          <div class="alert-row__actions">
            <button class="btn btn--primary btn--sm" data-priorizar="${l.produtoId}">Priorizar venda</button>
            <button class="btn btn--ghost btn--sm" data-descartar="${l.id}">Descartar lote</button>
          </div>
        </div>`;
    }).join("");

    document.getElementById("alertas-empty").hidden = criticos.length > 0;

    wrap.querySelectorAll("[data-priorizar]").forEach((btn) =>
      btn.addEventListener("click", () => {
        navigate("vendas");
        addToCart(parseInt(btn.dataset.priorizar, 10));
      })
    );
    wrap.querySelectorAll("[data-descartar]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const lote = loteById(parseInt(btn.dataset.descartar, 10));
        lote.status = "vencido";
        lote.qtdAtual = 0;
        toast("Lote descartado e removido do estoque ativo.");
        renderAll();
      })
    );
  }

  /* =========================================================
     RENDER: RELATÓRIOS
     ========================================================= */
  function renderRelatorios() {
    // Rotatividade: unidades vendidas por produto
    const vendidosPorProduto = {};
    state.vendas.forEach((v) => v.itens.forEach((i) => {
      vendidosPorProduto[i.produtoId] = (vendidosPorProduto[i.produtoId] || 0) + i.qtd;
    }));
    const ranking = state.produtos
      .map((p) => ({ p, qtd: vendidosPorProduto[p.id] || 0 }))
      .sort((a, b) => b.qtd - a.qtd);
    const max = Math.max(1, ...ranking.map((r) => r.qtd));

    document.getElementById("report-rotatividade").innerHTML = ranking.map(({ p, qtd }) => `
      <div class="bar-chart__col">
        <span class="bar-chart__value">${qtd}</span>
        <div class="bar-chart__bar" style="height:${Math.max(4, (qtd / max) * 100)}%"></div>
        <span class="bar-chart__label">${p.nome}</span>
      </div>`).join("") || `<p class="empty-state">Ainda não há vendas registradas.</p>`;

    // Índice de desperdício
    const total = state.lotes.length;
    const descartados = state.lotes.filter((l) => l.status === "vencido").length;
    const pct = total ? Math.round((descartados / total) * 100) : 0;
    const r = 58, circ = 2 * Math.PI * r;
    document.getElementById("waste-gauge-fill").setAttribute("stroke-dasharray", circ);
    document.getElementById("waste-gauge-fill").setAttribute("stroke-dashoffset", circ * (1 - pct / 100));
    document.getElementById("waste-percent").textContent = `${pct}%`;
    document.getElementById("waste-descartados").textContent = descartados;
    document.getElementById("waste-ok").textContent = total - descartados;

    // Histórico
    const hist = document.getElementById("report-historico");
    hist.innerHTML = state.vendas.slice(0, 12).map((v) => {
      const dt = new Date(v.dataHora);
      const qtdTotal = v.itens.reduce((s, i) => s + i.qtd, 0);
      return `
        <div class="history-row">
          <div class="history-row__info">
            <strong>Venda #${String(v.id).padStart(4, "0")} · ${qtdTotal} item(ns)</strong>
            <small>${dt.toLocaleDateString("pt-BR")} às ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small>
          </div>
          <span class="history-row__value">${fmtBRL(v.total)}</span>
        </div>`;
    }).join("") || `<p class="empty-state">Nenhuma venda no histórico ainda.</p>`;

    // ETAPA 3: renderiza o histórico de ações (auditoria) — quem cadastrou
    // e quem excluiu lotes, e quem cadastrou usuários.
    const auditWrap = document.getElementById("report-auditoria");
    auditWrap.innerHTML = state.historico.slice(0, 15).map((h) => {
      const dt = new Date(h.dataHora);
      return `
        <div class="history-row">
          <div class="history-row__info">
            <strong>${h.descricao}</strong>
            <small>${dt.toLocaleDateString("pt-BR")} às ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small>
          </div>
        </div>`;
    }).join("");
    document.getElementById("auditoria-empty").hidden = state.historico.length > 0;
  }

  /* =========================================================
     EXPORTAR VENDAS DO DIA (EXCEL)
     ========================================================= */
  // ETAPA EXCEL 1: separa "pegar os dados" de "gerar o arquivo".
  // Isso facilita trocar só essa função por uma chamada fetch() pro PHP
  // no futuro, sem mexer no resto do código.
  function getVendasHoje() {
    const hojeISO = toISO(today());
    return state.vendas.filter((v) => v.dataHora.slice(0, 10) === hojeISO);
  }

  // ETAPA EXCEL 2: monta as linhas da planilha — uma linha por item
  // vendido (não por venda), que é o formato mais útil pra relatório.
  function montarLinhasRelatorioVendas(vendas) {
    const linhas = [];
    vendas.forEach((v) => {
      const dt = new Date(v.dataHora);
      v.itens.forEach((item) => {
        const produto = produtoById(item.produtoId);
        linhas.push({
          "Venda": `#${String(v.id).padStart(4, "0")}`,
          "Data": dt.toLocaleDateString("pt-BR"),
          "Hora": dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          "Produto": produto ? produto.nome : "—",
          "Quantidade": item.qtd,
          "Preço unitário (R$)": item.precoUnit,
          "Subtotal (R$)": +(item.precoUnit * item.qtd).toFixed(2),
        });
      });
    });
    return linhas;
  }

  // ETAPA EXCEL 3: gera o arquivo .xlsx de verdade usando a biblioteca
  // SheetJS (carregada no index.html) e dispara o download no navegador.
  function exportarVendasDoDiaExcel() {
    const vendas = getVendasHoje();
    if (vendas.length === 0) {
      toast("Nenhuma venda registrada hoje para exportar.", true);
      return;
    }

    const linhas = montarLinhasRelatorioVendas(vendas);
    const totalDia = vendas.reduce((s, v) => s + v.total, 0);

    // linha em branco + linha de total no fim da planilha
    linhas.push({});
    linhas.push({ "Venda": "", "Data": "", "Hora": "", "Produto": "", "Quantidade": "", "Preço unitário (R$)": "TOTAL DO DIA", "Subtotal (R$)": +totalDia.toFixed(2) });

    const planilha = XLSX.utils.json_to_sheet(linhas);
    planilha["!cols"] = [{ wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 26 }, { wch: 11 }, { wch: 18 }, { wch: 14 }];

    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, "Vendas do dia");

    const nomeArquivo = `vendas-${toISO(today())}.xlsx`;
    XLSX.writeFile(livro, nomeArquivo);
    toast("Planilha exportada com sucesso.");
  }

  document.getElementById("export-vendas-dia").addEventListener("click", exportarVendasDoDiaExcel);

  /* =========================================================
     USUÁRIOS (somente administrador)
     ========================================================= */
  // ETAPA 4: lista os usuários cadastrados na tabela da tela "Usuários".
  function renderUsuarios() {
    const tbody = document.getElementById("usuarios-tbody");
    if (!tbody) return; // segurança: só roda se a seção existir no HTML
    tbody.innerHTML = state.usuarios.map((u) => `
      <tr>
        <td class="cell-strong">${u.nome}</td>
        <td class="cell-mono">${u.email}</td>
        <td style="text-transform:capitalize;">${u.perfil}</td>
      </tr>`).join("");
  }

  // ETAPA 4: cadastro de novo usuário — só quem está logado como admin
  // consegue ver este formulário (o menu "Usuários" já fica escondido
  // para operador), mas checamos de novo aqui por segurança.
  const formUsuario = document.getElementById("form-usuario");
  const usuarioFormError = document.getElementById("usuario-form-error");

  formUsuario.addEventListener("submit", (e) => {
    e.preventDefault();

    if (state.user.perfil !== "admin") {
      usuarioFormError.textContent = "Apenas administradores podem cadastrar usuários.";
      usuarioFormError.hidden = false;
      return;
    }

    const nome = document.getElementById("usuario-nome").value.trim();
    const email = document.getElementById("usuario-email").value.trim().toLowerCase();
    const perfil = document.getElementById("usuario-perfil").value;
    const senha = document.getElementById("usuario-senha").value;

    if (!nome || !email || !senha) {
      usuarioFormError.textContent = "Preencha nome, e-mail e senha inicial.";
      usuarioFormError.hidden = false;
      return;
    }
    if (senha.length < 6) {
      usuarioFormError.textContent = "A senha precisa ter pelo menos 6 caracteres.";
      usuarioFormError.hidden = false;
      return;
    }
    if (state.usuarios.some((u) => u.email === email)) {
      usuarioFormError.textContent = "Já existe um usuário com esse e-mail.";
      usuarioFormError.hidden = false;
      return;
    }

    usuarioFormError.hidden = true;
    state.usuarios.push({ nome, email, perfil, senha });

    // registra no histórico de auditoria quem cadastrou o novo usuário
    // (nunca gravamos a senha em si no histórico, só a ação)
    logHistorico("usuario_criado", `${state.user.nome} cadastrou o usuário ${nome} (${perfil})`);

    formUsuario.reset();
    toast("Usuário cadastrado com sucesso.");
    renderUsuarios();
    renderRelatorios();
  });

  /* =========================================================
     MINHA CONTA — REDEFINIR SENHA
     ========================================================= */
  // ETAPA SENHA: qualquer usuário logado (admin ou operador) pode abrir
  // esse modal pra trocar a própria senha, sem precisar de um admin.
  const modalSenha = document.getElementById("modal-senha");
  const formSenha = document.getElementById("form-senha");
  const senhaFormError = document.getElementById("senha-form-error");

  function openModalSenha() {
    formSenha.reset();
    senhaFormError.hidden = true;
    document.getElementById("senha-modal-usuario").textContent = state.user.nome;
    modalSenha.hidden = false;
  }
  function closeModalSenha() { modalSenha.hidden = true; }

  document.getElementById("minha-conta-btn").addEventListener("click", openModalSenha);
  document.getElementById("close-modal-senha").addEventListener("click", closeModalSenha);
  document.getElementById("cancel-modal-senha").addEventListener("click", closeModalSenha);
  modalSenha.addEventListener("click", (e) => { if (e.target === modalSenha) closeModalSenha(); });

  formSenha.addEventListener("submit", (e) => {
    e.preventDefault();

    const senhaAtual = document.getElementById("senha-atual").value;
    const senhaNova = document.getElementById("senha-nova").value;
    const senhaConfirmar = document.getElementById("senha-confirmar").value;

    // ETAPA SENHA: no PHP, essa comparação vira password_verify() lendo
    // o hash salvo no banco — aqui ainda é comparação direta de texto.
    if (senhaAtual !== state.user.senha) {
      senhaFormError.textContent = "Senha atual incorreta.";
      senhaFormError.hidden = false;
      return;
    }
    if (senhaNova.length < 6) {
      senhaFormError.textContent = "A nova senha precisa ter pelo menos 6 caracteres.";
      senhaFormError.hidden = false;
      return;
    }
    if (senhaNova !== senhaConfirmar) {
      senhaFormError.textContent = "As senhas não coincidem.";
      senhaFormError.hidden = false;
      return;
    }

    // atualiza a senha tanto no usuário logado quanto na lista de usuários
    // (são o mesmo objeto na memória, mas deixamos explícito por clareza)
    state.user.senha = senhaNova;
    const usuarioNaLista = state.usuarios.find((u) => u.email === state.user.email);
    if (usuarioNaLista) usuarioNaLista.senha = senhaNova;

    logHistorico("senha_alterada", `${state.user.nome} redefiniu a própria senha`);

    senhaFormError.hidden = true;
    closeModalSenha();
    toast("Senha atualizada com sucesso.");
    renderRelatorios();
  });

  /* =========================================================
     RENDER ALL
     ========================================================= */
  function renderAll() {
    if (!state.user) return;
    renderDashboard();
    populateCategoriaFilter();
    renderEstoque();
    renderPdvProdutos();
    renderCart();
    renderAlertas();
    renderRelatorios();
    renderUsuarios();
  }

  // estado inicial de navegação
  navigate("dashboard");
})();
