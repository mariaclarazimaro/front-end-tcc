/* =========================================================
   DOCE SABOR — Sistema de Gestão de Estoque e Vendas
   Interface integrada à API Laravel e ao MySQL.
   Baseado nas regras de negócio da documentação do projeto:
     - Semáforo de validade: verde (>5 dias), amarelo (3-5 dias),
       vermelho (<3 dias)
     - Método PEPS: o lote mais antigo é sempre vendido primeiro
   ========================================================= */

(async () => {
  "use strict";

  /* ---------------- Helpers de data ---------------- */
  const DAY = 24 * 60 * 60 * 1000;
  const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
  const addDays = (n) => { const d = today(); d.setDate(d.getDate() + n); return d; };
  const toISO = Rules.iso;
  const fmtDate = (iso) => {
    const [y,m,d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };
  const diasRestantes = Rules.days;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]));
  const fmtBRL = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const statusSemaforo = Rules.status;
  const STATUS_LABEL = { verde: "Em dia", amarelo: "A vencer", vermelho: "Urgente", vencido: "Vencido" };
  const STATUS_COLOR = { verde: "var(--status-green)", amarelo: "var(--status-yellow)", vermelho: "var(--status-red)", vencido: "var(--status-red)" };

  /* ---------------- Estado (dados em memória) ---------------- */

  const state={user:null,view:'dashboard',cart:[],usuarios:[],produtos:[],lotes:[],vendas:[],historico:[],descartes:[],movements:[]};
  let toastTimer=null;
  try { await AuthClient.init(); } catch { location.replace('index.html'); return; }
  state.user=AuthClient.current();
  if(!state.user || state.user.must_change_password){location.replace('index.html');return;}
  state.usuarios=AuthClient.users();
  async function refreshData(){
    try {await AuthClient.refresh();const data=await AuthClient.request('state');Object.assign(state,data);state.lotes.forEach(l=>{l.fabricacao=new Date(l.fabricacao);l.validade=new Date(l.validade);});}
    catch(e){if(e.status===401||e.passwordRequired){location.replace('index.html');}throw e;}
  }
  function save() {} // Persistência ocorre nas operações da API, nunca no navegador.
  async function remote(path,method,body){
    let result;
    try{result=await AuthClient.request(path,method,body);}catch(e){if(e.status===401||e.passwordRequired)location.replace('index.html');toast(e.message,true);throw e;}
    try{await refreshData();renderAll();}catch(e){toast('Operação registrada. Recarregue para atualizar os dados.',true);}
    return result;
  }

  try {await refreshData();}catch {document.getElementById('toast').textContent='Não foi possível carregar os dados. Recarregue a página.';document.getElementById('toast').classList.add('show');return;}
  const can = permission => Access.can(AuthClient.current(), permission);
  function guard(permission) { if(can(permission)) return true; toast('Você não tem permissão para esta ação.',true); return false; }
  const validLots = id => state.lotes.filter(l=>l.produtoId===id && Rules.sellable(l));
  const visibleSales = () => state.vendas.filter(v=>can('sales.all') || (can('sales.own') && v.vendedorEmail===state.user.email));

  /* ---------------- Lookups ---------------- */
  const produtoById = (id) => state.produtos.find((p) => p.id === id);
  const loteById = (id) => state.lotes.find((l) => l.id === id);

  function lotesAtivos() {
    return state.lotes.filter((l) => l.status === "ativo" && l.qtdAtual > 0);
  }

  function loteMaisAntigo(produtoId) {
    return lotesAtivos()
      .filter((l) => l.produtoId === produtoId && Rules.sellable(l))
      .sort((a, b) => a.fabricacao - b.fabricacao)[0] || null;
  }

  /* ---------------- Toast ---------------- */
  function toast(msg, isError = false) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.toggle("error", isError);
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  /* ---------------- Histórico de ações (auditoria) ---------------- */

  function logHistorico() {} // Auditoria registrada pelo servidor junto à transação.

  /* =========================================================
     LOGIN
     ========================================================= */
  const appRoot = document.getElementById('app');
  appRoot.hidden=false;
  document.getElementById('sidebar-username').textContent=state.user.nome;
  document.getElementById('sidebar-userrole').textContent=Access.roles[state.user.perfil]?.label || state.user.perfil;
  document.getElementById('sidebar-avatar').textContent=state.user.nome.charAt(0);
  document.getElementById('pdv-vendedor').textContent=`Vendedor: ${state.user.nome}`;
  function applyPermissions() {
    document.querySelectorAll('[data-permission]').forEach(el=>el.hidden=!can(el.dataset.permission));
    document.querySelectorAll('.nav-item').forEach(el=>el.hidden=!Access.canView(state.user,el.dataset.view));
    document.getElementById('management-group').hidden=!can('reports.view')&&!can('users.manage');
  }
  applyPermissions();
  document.getElementById('logout-btn').addEventListener('click',async()=>{
    try {await AuthClient.logout();location.replace('index.html');}catch(e){toast(e.message,true);}
  });
  window.addEventListener('pageshow',()=>{if(!AuthClient.current()) location.replace('index.html');});
  /* =========================================================
     NAVEGAÇÃO
     ========================================================= */
  const views = document.querySelectorAll(".view");
  const navItems = document.querySelectorAll(".nav-item");
  const topbarTitle = document.getElementById("topbar-title");
  const topbarEyebrow = document.getElementById("topbar-eyebrow");

  const VIEW_META = {
    dashboard: { title: "Visão geral", eyebrow: "Visão geral" },
    estoque: { title: "Gestão de estoque", eyebrow: "Operação" },
    vendas: { title: "Registrar venda", eyebrow: "Vendas" },
    alertas: { title: "Alertas de validade", eyebrow: "Ação necessária" },
    relatorios: { title: "Relatórios", eyebrow: "Desempenho & desperdício" },
    historico: { title: "Histórico de vendas", eyebrow: "Consulta de transações" },
    usuarios: { title: "Usuários", eyebrow: "Administração" },
  };

  function navigate(view) {

    if (!Access.canView(AuthClient.current(),view)) {
      view = "dashboard";
    }
    if(!VIEW_META[view]) view="dashboard";
    state.view = view;
    views.forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
    navItems.forEach((n) => { n.classList.toggle("active", n.dataset.view === view); if(n.dataset.view===view) n.setAttribute("aria-current","page"); else n.removeAttribute("aria-current"); });
    topbarTitle.textContent = VIEW_META[view].title;
    topbarEyebrow.textContent = VIEW_META[view].eyebrow;
    closeMenu();
    document.getElementById('main-content').focus({preventScroll:true});
    renderAll();
  }
  navItems.forEach((n) => n.addEventListener("click", () => navigate(n.dataset.view)));

  /* =========================================================
     RELÓGIO
     ========================================================= */
  function tickClock() {
    const el = document.getElementById("topbar-clock");
    const now = new Date();
    if(state.user && !AuthClient.current()) { AuthClient.logout(); location.replace("index.html"); return; }
    el.textContent = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) +
      " · " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  tickClock();
  let renderedDay=toISO(today());
  setInterval(()=>{tickClock();const currentDay=toISO(today());if(currentDay!==renderedDay){renderedDay=currentDay;renderAll();}}, 30000);

  /* =========================================================
     RENDER: DASHBOARD
     ========================================================= */
  function renderDashboard() {
    const ativos = lotesAtivos();
    const urgentes = ativos.filter((l) => diasRestantes(toISO(l.validade)) < 3);
    const atencao = ativos.filter((l) => statusSemaforo(diasRestantes(toISO(l.validade))) === "amarelo");

    document.getElementById("kpi-lotes-ativos").textContent = ativos.length;
    document.getElementById("kpi-urgentes").textContent = urgentes.length;
    document.getElementById("kpi-atencao").textContent = atencao.length;

    const hojeISO = toISO(today());
    const vendasHoje = visibleSales().filter((v) => toISO(new Date(v.dataHora)) === hojeISO);
    document.getElementById("kpi-vendas-hoje").textContent = vendasHoje.length;
    document.getElementById("kpi-vendas-hoje-valor").textContent =
      fmtBRL(vendasHoje.reduce((s, v) => s + v.total, 0));

    const ringWrap = document.getElementById("dashboard-rings");
    const ordenados = [...ativos].sort((a, b) => a.validade - b.validade).slice(0, 6);
    ringWrap.innerHTML = ordenados.map((l) => {
      const dias = diasRestantes(toISO(l.validade));
      const st = statusSemaforo(dias);
      const produto = produtoById(l.produtoId);
      return `<div class="expiry-row"><div><strong>${esc(produto.nome)}</strong><small>Lote #${l.id} · ${l.qtdAtual} ${esc(produto.unidade)}</small></div><span>${fmtDate(toISO(l.validade))}</span><span class="status-pill status-pill--${st==='vencido'?'vermelho':st}">${STATUS_LABEL[st]}</span></div>`;
    }).join("") || `<p class="empty-state">Nenhum lote em estoque.</p>`;

    const urgWrap = document.getElementById("dashboard-urgentes");
    const criticos = [...ativos]
      .map((l) => ({ l, dias: diasRestantes(toISO(l.validade)) }))
      .filter((x) => x.dias < 3)
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 8);
    urgWrap.innerHTML = criticos.map(({ l, dias }) => {
      const st = statusSemaforo(dias);
      const produto = produtoById(l.produtoId);
      return `
        <div class="urgent-row">
          <span class="urgent-row__badge" style="background:${STATUS_COLOR[st]}"></span>
          <div class="urgent-row__info">
            <strong>${esc(produto.nome)}</strong>
            <small>lote #${String(l.id).padStart(3, "0")} · ${l.qtdAtual} ${esc(produto.unidade)}</small>
          </div>
          <span class="urgent-row__days" style="background:${["vermelho","vencido"].includes(st) ? "var(--status-red-bg)" : "var(--status-yellow-bg)"}; color:${["vermelho","vencido"].includes(st) ? "var(--status-red)" : "#8a6d00"}">
            ${dias < 0 ? "vencido" : `${dias}d`}
          </span>
        </div>`;
    }).join("") || `<p class="empty-state">Nenhum item crítico.</p>`;

    const badge = document.getElementById("nav-alert-count");
    const totalAlertas = urgentes.length + atencao.length;
    badge.textContent = totalAlertas;
    badge.hidden = totalAlertas === 0;
  }

  /* =========================================================
     RENDER: ESTOQUE
     ========================================================= */
  let inventory;
  function populateCategoriaFilter() {}
  function renderEstoque() { inventory?.render(); }

  /* -------- Modal: novo lote / produto -------- */
  const modalLote = document.getElementById("modal-lote");
  const formLote = document.getElementById("form-lote");
  const loteProdutoExistente = document.getElementById("lote-produto-existente");
  const loteFormError = document.getElementById("lote-form-error");

  function populateProdutoSelect() {
    loteProdutoExistente.innerHTML = `<option value="">Selecione um produto</option>` +
      state.produtos.filter(p=>p.nome.toLowerCase().includes(document.getElementById("receive-search").value.toLowerCase())).sort((a,b)=>a.nome.localeCompare(b.nome)).map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join("");
  }

  function openModalLote(id) {
    if(!guard("stock.receive")) return;
    formLote.reset();
    loteFormError.hidden = true;
    populateProdutoSelect();
    if(typeof id==='number') loteProdutoExistente.value=id;
    document.getElementById("lote-data-fabricacao").value = toISO(today());
    modalLote.hidden = false;
  }
  function closeModalLote() { modalLote.hidden = true; }

  document.getElementById("open-novo-lote").addEventListener("click", openModalLote);
  document.getElementById("close-modal-lote").addEventListener("click", closeModalLote);
  document.getElementById("cancel-modal-lote").addEventListener("click", closeModalLote);
  modalLote.addEventListener("click", (e) => { if (e.target === modalLote) closeModalLote(); });

  document.getElementById('receive-search').addEventListener('input',populateProdutoSelect);

  formLote.addEventListener("submit", async (e) => {
    e.preventDefault();
    if(!guard("stock.receive")) return;
    const fab = document.getElementById("lote-data-fabricacao").value;
    const val = document.getElementById("lote-data-validade").value;
    const qtd = Number(document.getElementById("lote-quantidade").value);

    if (!fab || !val || !Number.isSafeInteger(qtd) || qtd <= 0) {
      return showLoteError("Preencha as datas e uma quantidade válida.");
    }
    if (new Date(val) <= new Date(fab)) {
      return showLoteError("A validade precisa ser posterior à fabricação.");
    }

    if(fab > toISO(today()) || val < toISO(today())) return showLoteError("Fabricação não pode estar no futuro e validade não pode estar vencida.");
    let produtoId = parseInt(loteProdutoExistente.value, 10);
    if (!produtoById(produtoId)) return showLoteError("Selecione um produto cadastrado.");

    const button=formLote.querySelector('[type=submit]');button.disabled=true;
    try{await remote('lots','POST',{produtoId,fabricacao:fab,validade:val,quantidade:qtd});closeModalLote();toast('Entrada registrada.');}
    catch(error){showLoteError(error.message);}finally{button.disabled=false;}

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
              <div class="pdv-produto-card__name">${esc(p.nome)}</div>
              <div class="pdv-produto-card__cat">${esc(p.categoria)}</div>
            </div>
            <div class="pdv-produto-card__price">${fmtBRL(p.preco)}</div>
          </div>
          ${lote
            ? `<div class="pdv-produto-card__lote"><span class="dot" style="background:${STATUS_COLOR[st]}"></span> Lote #${String(lote.id).padStart(3,"0")} · vence em ${dias < 0 ? "Vencido" : dias}d · ${lote.qtdAtual} disp.</div>`
            : `<div class="pdv-produto-card__lote">Sem estoque disponível</div>`}
        </button>`;
    }).join("");

    wrap.querySelectorAll(".pdv-produto-card:not(:disabled)").forEach((btn) => {
      btn.addEventListener("click", () => addToCart(parseInt(btn.dataset.produtoId, 10)));
    });
  }

  function cartQty(id) { return state.cart.filter(c=>loteById(c.loteId)?.produtoId===id).reduce((n,c)=>n+c.qty,0); }
  function setProductQty(id,qty) {
    saleKey=null;
    if(!guard("sales.create")) return;
    try {
      const allocated = qty>0 ? Rules.allocate(state.lotes,id,qty) : [];
      state.cart=state.cart.filter(c=>loteById(c.loteId)?.produtoId!==id).concat(allocated);
      renderCart(); renderPdvProdutos();
    } catch(e) { toast(e.message,true); }
  }
  function addToCart(id) { setProductQty(id,cartQty(id)+1); }
  function changeCartQty(loteId,delta) { const id=loteById(loteId).produtoId; setProductQty(id,cartQty(id)+delta); }

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
              <strong>${esc(produto.nome)}</strong>
              <small>lote #${String(lote.id).padStart(3, "0")} · ${fmtBRL(produto.preco)} / ${esc(produto.unidade)}</small>
            </div>
            <div class="qty-stepper">
              <button type="button" aria-label="Diminuir quantidade de ${esc(produto.nome)}" data-lote="${lote.id}" data-delta="-1">−</button>
              <span>${c.qty}</span>
              <button type="button" aria-label="Aumentar quantidade de ${esc(produto.nome)}" data-lote="${lote.id}" data-delta="1">+</button>
            </div>
            <button class="cart-item__remove" aria-label="Remover ${esc(produto.nome)} do carrinho" data-remove="${lote.id}" title="Remover">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>`;
      }).join("");
      finalizarBtn.disabled = false;
      hint.textContent = `${state.cart.reduce((s, c) => s + c.qty, 0)} item(ns) no carrinho.`;

      wrap.querySelectorAll("[data-delta]").forEach((btn) =>
        btn.addEventListener("click", () => changeCartQty(parseInt(btn.dataset.lote, 10), parseInt(btn.dataset.delta, 10)))
      );
      wrap.querySelectorAll("[data-remove]").forEach((btn) =>
        btn.addEventListener("click", () => {
          const item=state.cart.find(c=>c.loteId===Number(btn.dataset.remove));
          const id=loteById(item.loteId).produtoId;
          setProductQty(id,cartQty(id)-item.qty);
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
    state.cart = []; saleKey=null;
    renderCart();
    renderPdvProdutos();
  });

  let saleKey=null;
  document.getElementById("finalizar-venda").addEventListener("click", async () => {
    if (!AuthClient.current()) { location.replace('index.html'); return; }
    if(!guard('sales.create')) return;
    if (state.cart.length === 0) return;
    const pagamento=document.getElementById('pdv-pagamento').value;
    if(!['Dinheiro','Pix','Cartão de débito','Cartão de crédito'].includes(pagamento)) return toast('Selecione a forma de pagamento.',true);
    if(state.cart.some(c=>!Rules.sellable(loteById(c.loteId)) || c.qty>loteById(c.loteId).qtdAtual)) { state.cart=[]; renderAll(); return toast('Estoque ou validade mudou. Monte o carrinho novamente.',true); }

    const quantities=new Map();state.cart.forEach(c=>{const id=loteById(c.loteId).produtoId;quantities.set(id,(quantities.get(id)||0)+c.qty);});
    const button=document.getElementById('finalizar-venda');button.disabled=true;saleKey??=crypto.randomUUID();
    try{const result=await remote('sales','POST',{pagamento,idempotency_key:saleKey,items:[...quantities].map(([produtoId,quantidade])=>({produtoId,quantidade}))});state.cart=[];saleKey=null;document.getElementById('pdv-pagamento').value='';renderAll();toast(`Venda registrada: ${fmtBRL(result.total)}`);}
    catch(e){if(e.status && e.status<500)saleKey=null;}finally{button.disabled=state.cart.length===0;}

  });

  /* =========================================================
     RENDER: ALERTAS
     ========================================================= */
  function renderAlertas() {
    const wrap = document.getElementById("alertas-list");
    const criticos = lotesAtivos()
      .map((l) => ({ l, dias: diasRestantes(toISO(l.validade)) }))
      .filter((x) => x.dias < 3)
      .sort((a, b) => a.dias - b.dias);

    wrap.innerHTML = criticos.map(({ l, dias }) => {
      const st = statusSemaforo(dias);
      const produto = produtoById(l.produtoId);
      const rowClass = ["vermelho","vencido"].includes(st) ? "vermelho" : "amarelo";
      const icon = st === "vermelho"
        ? `<path d="M12 3 2 20h20L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 10v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`
        : `<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
      return `
        <div class="alert-row alert-row--${rowClass}">
          <div class="alert-row__icon"><svg viewBox="0 0 24 24" fill="none">${icon}</svg></div>
          <div class="alert-row__info">
            <strong>${esc(produto.nome)} · lote #${String(l.id).padStart(3, "0")}</strong>
            <p>${["vermelho","vencido"].includes(st) ? (dias<0 ? "Vencido. Venda bloqueada. Solicite o descarte a um responsável." : "Validade próxima. Priorize a venda enquanto estiver válido.") : "Priorizar a venda deste lote."}</p>
            <div class="alert-row__meta">${l.qtdAtual} ${esc(produto.unidade)} · vence em ${fmtDate(toISO(l.validade))} (${dias < 0 ? "vencido" : dias + "d"})</div>
          </div>
          <div class="alert-row__actions">
            <button ${dias<0 || !can("sales.create") ? "hidden" : ""} class="btn btn--primary btn--sm" data-priorizar="${l.produtoId}">Priorizar venda</button>
            <button ${!can("stock.discard") ? "hidden" : ""} class="btn btn--ghost btn--sm" data-descartar="${l.id}">Descartar lote</button>
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
        openDiscard(Number(btn.dataset.descartar));
      })
    );
  }

  /* =========================================================
     RENDER: RELATÓRIOS
     ========================================================= */
  function renderRelatorios() {

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
        <div class="bar-chart__bar" style="height:${(qtd / max) * 65}%"></div>
        <span class="bar-chart__label">${esc(p.nome)}</span>
      </div>`).join("") || `<p class="empty-state">Ainda não há vendas registradas.</p>`;

    const total = state.lotes.reduce((n,l)=>n+l.qtdInicial,0);
    const descartados = state.descartes.reduce((n,d)=>n+d.quantidade,0);
    const pct = total ? Math.round((descartados / total) * 100) : 0;
    const r = 58, circ = 2 * Math.PI * r;
    document.getElementById("waste-gauge-fill").setAttribute("stroke-dasharray", circ);
    document.getElementById("waste-gauge-fill").setAttribute("stroke-dashoffset", circ * (1 - pct / 100));
    document.getElementById("waste-percent").textContent = `${pct}%`;
    document.getElementById("waste-descartados").textContent = descartados;
    document.getElementById("waste-ok").textContent = total - descartados;

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
          <span class="history-row__value">${fmtBRL(v.total)}<small class="sale-meta">${esc(v.vendedorNome)} · ${esc(v.pagamento)}</small></span>
        </div>`;
    }).join("") || `<p class="empty-state">Nenhuma venda no histórico ainda.</p>`;

    const auditWrap = document.getElementById("report-auditoria");
    auditWrap.innerHTML = state.historico.slice(0, 15).map((h) => {
      const dt = new Date(h.dataHora);
      return `
        <div class="history-row">
          <div class="history-row__info">
            <strong>${esc(h.descricao)}</strong>
            <small>${dt.toLocaleDateString("pt-BR")} às ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small>
          </div>
        </div>`;
    }).join("");
    document.getElementById("auditoria-empty").hidden = state.historico.length > 0;
  }

  /* =========================================================
     EXPORTAR VENDAS DO DIA (EXCEL)
     ========================================================= */

  function getVendasHoje() {
    const hojeISO = toISO(today());
    return visibleSales().filter((v) => toISO(new Date(v.dataHora)) === hojeISO);
  }

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

  function exportarVendasDoDiaExcel() { if(guard('reports.view')) exportSales(state.vendas.filter(v=>toISO(new Date(v.dataHora))===toISO(today()))); }

  document.getElementById("export-vendas-dia").addEventListener("click", exportarVendasDoDiaExcel);

  /* =========================================================
     USUÁRIOS (somente administrador)
     ========================================================= */

  function renderUsuarios() {
    const tbody = document.getElementById("usuarios-tbody");
    if (!tbody) return; // segurança: só roda se a seção existir no HTML
    team?.render();
  }
  let team;

  /* =========================================================
     MINHA CONTA — REDEFINIR SENHA
     ========================================================= */

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

  formSenha.addEventListener('submit',async e=>{
    e.preventDefault(); const button=formSenha.querySelector('[type=submit]'); button.disabled=true;
    try {
      const next=document.getElementById('senha-nova').value;
      if(next!==document.getElementById('senha-confirmar').value) throw Error('As senhas não coincidem.');
      await AuthClient.change(document.getElementById('senha-atual').value,next);
      state.user=AuthClient.current(); state.usuarios=AuthClient.users(); logHistorico('senha_alterada',`${state.user.nome} alterou a própria senha`);
      closeModalSenha(); save(); toast('Senha alterada.');
    } catch(error) { senhaFormError.textContent=error.message; senhaFormError.hidden=false; }
    finally { button.disabled=false; }
  });

  /* =========================================================
     RENDER ALL
     ========================================================= */
  function renderAll() {
    state.user=AuthClient.current();
    if (!state.user) { location.replace('index.html'); return; }
    applyPermissions();
    renderDashboard();
    populateCategoriaFilter();
    if(state.view==='estoque') renderEstoque();
    if(state.view==='vendas' && can('sales.create')) { renderPdvProdutos(); renderCart(); }
    if(state.view==='alertas') renderAlertas();
    if(state.view==='relatorios' && can('reports.view')) renderRelatorios();
    if(state.view==='usuarios' && can('users.manage')) renderUsuarios(); else document.getElementById('usuarios-tbody').textContent='';
    renderExtras(); save();
  }

  // Descartes preservam lotes e vínculos com vendas anteriores.
  let discardId=null;
  const discardDialog=document.getElementById('discard-dialog');
  discardDialog.setAttribute('aria-labelledby','discard-title');
  function openDiscard(id) {
    if(!guard('stock.discard')) return;
    const lote=loteById(id); if(!lote || lote.qtdAtual<1 || lote.status!=='ativo') return;
    discardId=id; document.getElementById('discard-form').reset();
    document.getElementById('discard-error').hidden=true;
    document.getElementById('discard-description').textContent=`Descartar ${lote.qtdAtual} unidade(s) de ${produtoById(lote.produtoId).nome}, lote #${id}? A baixa será registrada no histórico e não poderá ser desfeita.`;
    discardDialog.showModal();
  }
  document.getElementById('discard-cancel').onclick=()=>discardDialog.close();
  document.getElementById('discard-form').onsubmit=async e=>{
    e.preventDefault(); if(!guard('stock.discard')) return;
    const motivo=document.getElementById('discard-reason').value, observacao=document.getElementById('discard-note').value.trim();
    const lote=loteById(discardId);
    if(!lote || lote.qtdAtual<1 || lote.status!=='ativo') return;
    if(!motivo || (motivo==='Outro' && !observacao) || (motivo==='Validade vencida' && diasRestantes(toISO(lote.validade))>=0)) {
      const el=document.getElementById('discard-error'); el.hidden=false; el.textContent='Informe um motivo coerente com a validade e detalhe quando escolher Outro.'; return;
    }
    if(!lote || lote.qtdAtual<1 || lote.status!=='ativo') return;
    const button=document.querySelector('#discard-form [type=submit]');button.disabled=true;
    try{await remote('lots/'+lote.id+'/discard','POST',{motivo,observacao});state.cart=state.cart.filter(c=>c.loteId!==lote.id);discardDialog.close();renderAll();toast('Descarte registrado.');}
    catch(e){document.getElementById('discard-error').textContent=e.message;document.getElementById('discard-error').hidden=false;}finally{button.disabled=false;}

  };
  function filteredSales() {
    const from=document.getElementById('history-from').value, to=document.getElementById('history-to').value;
    const term=document.getElementById('history-search').value.trim().toLowerCase(), payment=document.getElementById('history-payment').value;
    if(from && to && from>to) return [];
    return visibleSales().filter(v=>{
      const date=toISO(new Date(v.dataHora));
      return (!from || date>=from) && (!to || date<=to) && (!payment || v.pagamento===payment) && `${v.id} ${v.vendedorNome} ${v.itens.map(i=>i.nome).join(' ')}`.toLowerCase().includes(term);
    });
  }
  function renderHistory() {
    const sales=filteredSales();
    document.getElementById('history-scope').textContent=can('sales.all')?'Vendas de toda a equipe.':'Vendas registradas pela sua conta.';
    const from=document.getElementById('history-from').value, to=document.getElementById('history-to').value;
    document.getElementById('history-summary').textContent=from && to && from>to?'A data inicial deve ser anterior ou igual à final.':`${sales.length} venda(s) • Total: ${fmtBRL(sales.reduce((n,v)=>n+v.total,0))}`;
    document.getElementById('sales-history').innerHTML=sales.map(v=>`<details class="sale-detail"><summary><strong>Venda #${String(v.id).padStart(4,'0')}</strong><span>${esc(new Date(v.dataHora).toLocaleString('pt-BR'))}</span><strong>${fmtBRL(v.total)}</strong></summary><p class="sale-meta">Vendedor: ${esc(v.vendedorNome)} (${esc(v.vendedorEmail)}) • ${esc(v.pagamento)}</p><div class="table-wrap"><table class="data-table"><caption>Itens da venda #${v.id}</caption><thead><tr><th scope="col">Produto</th><th scope="col">Lote</th><th scope="col">Quantidade</th><th scope="col">Preço</th><th scope="col">Subtotal</th></tr></thead><tbody>${v.itens.map(i=>`<tr><td>${esc(i.nome)}</td><td>#${i.loteId}</td><td>${i.qtd}</td><td>${fmtBRL(i.precoUnit)}</td><td>${fmtBRL(i.qtd*i.precoUnit)}</td></tr>`).join('')}</tbody></table></div></details>`).join('') || '<p class="empty-state">Nenhuma venda encontrada para estes filtros.</p>';
  }
  function exportSales(sales) {
    if(!sales.length) return toast('Nenhuma venda para exportar.',true);
    // Neutraliza fórmulas de planilha e preserva separadores e quebras de linha.
    const cell=value=>{let text=String(value??''); if(/^[\s]*[=+@-]/.test(text)) text="'"+text; return '"'+text.replaceAll('"','""')+'"';};
    const rows=[['Venda','Data e hora','Vendedor','E-mail','Pagamento','Produto','Lote','Quantidade','Preço unitário','Subtotal']];
    sales.forEach(v=>v.itens.forEach(i=>rows.push([v.id,new Date(v.dataHora).toLocaleString('pt-BR'),v.vendedorNome,v.vendedorEmail,v.pagamento,i.nome,i.loteId,i.qtd,i.precoUnit.toFixed(2).replace('.',','),(i.qtd*i.precoUnit).toFixed(2).replace('.',',')])));
    const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(row=>row.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a'); a.href=url; a.download=`vendas-${toISO(today())}.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  ['history-from','history-to','history-search','history-payment'].forEach(id=>document.getElementById(id).addEventListener('input',renderHistory));
  document.getElementById('history-clear').onclick=()=>{['history-from','history-to','history-search','history-payment'].forEach(id=>document.getElementById(id).value='');renderHistory();};
  document.getElementById('history-export').onclick=()=>exportSales(filteredSales());
  function renderExtras() {
    document.getElementById('stock-summary').innerHTML=state.produtos.filter(p=>validLots(p.id).reduce((n,l)=>n+l.qtdAtual,0)<=(p.minimo||10)).slice(0,6).map(p=>{
      const qty=validLots(p.id).reduce((n,l)=>n+l.qtdAtual,0), label=Rules.stock(qty,p.minimo||10);
      return `<div class="stock-item"><strong>${esc(p.nome)}</strong><span>${qty} ${esc(p.unidade)} • mínimo ${p.minimo||10}</span><span class="status-pill status-pill--${label==='Normal'?'verde':label==='Baixo'?'amarelo':'vermelho'}">${label}</span></div>`;
    }).join('') || '<p class="empty-state">Todos os produtos estão acima do estoque mínimo.</p>';
    if(state.view==='relatorios' && can('reports.view')) {
      const points=Array.from({length:7},(_,i)=>{const date=addDays(i-6);return {date,value:state.vendas.filter(v=>toISO(new Date(v.dataHora))===toISO(date)).reduce((n,v)=>n+v.total,0)};});
      const max=Math.max(1,...points.map(p=>p.value));
      document.getElementById('sales-chart').innerHTML=points.map(p=>`<div class="bar-chart__col"><span class="bar-chart__value">${fmtBRL(p.value)}</span><div aria-hidden="true" class="bar-chart__bar" style="height:${p.value/max*65}%"></div><span class="bar-chart__label">${p.date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</span></div>`).join('');
    }
    if(state.view==='historico' && Access.canView(state.user,'historico')) renderHistory();
  }
  function closeMenu() {
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('menu-backdrop').hidden=true;
    document.getElementById('menu-toggle').setAttribute('aria-expanded','false');
    document.body.classList.remove('menu-open');
    document.querySelector('.sidebar').inert=matchMedia('(max-width:860px)').matches;
  }
  document.getElementById('menu-toggle').onclick=()=>{
    const sidebar=document.querySelector('.sidebar'); const open=!sidebar.classList.contains('open'); closeMenu();
    if(open) {sidebar.inert=false;sidebar.classList.add('open');document.getElementById('menu-backdrop').hidden=false;document.getElementById('menu-toggle').setAttribute('aria-expanded','true');document.body.classList.add('menu-open');sidebar.querySelector('button:not([hidden])').focus();}
  };
  document.getElementById('menu-backdrop').onclick=closeMenu;
  window.addEventListener('resize',closeMenu);
  // Os modais legados recebem foco inicial, contenção de Tab e retorno ao acionador.
  let modalTrigger=null;
  document.querySelectorAll('.modal-overlay').forEach(overlay=>{
    const heading=overlay.querySelector('h2'); heading.id=overlay.id+'-title'; overlay.querySelector('[role=dialog]').setAttribute('aria-labelledby',heading.id);
    new MutationObserver(()=>{
      if(!overlay.hidden) {modalTrigger=document.activeElement;appRoot.inert=true;overlay.querySelector('input,select,button').focus();}
      else {appRoot.inert=false; if(modalTrigger?.isConnected) modalTrigger.focus();}
    }).observe(overlay,{attributes:true,attributeFilter:['hidden']});
  });
  document.addEventListener('keydown',e=>{
    const modal=document.querySelector('.modal-overlay:not([hidden])');
    const menu=document.querySelector('.sidebar.open');
    if(e.key==='Escape') { if(modal) modal.hidden=true; if(menu) {closeMenu();document.getElementById('menu-toggle').focus();} }
    const container=modal||menu;
    if(e.key==='Tab' && container) {
      const focusable=[...container.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(el=>!el.disabled && el.getClientRects().length);
      const first=focusable[0], last=focusable.at(-1);
      if(e.shiftKey && document.activeElement===first) {e.preventDefault();last.focus();}
      if(!e.shiftKey && document.activeElement===last) {e.preventDefault();first.focus();}
    }
  });
  document.querySelectorAll('.field-error').forEach(el=>el.setAttribute('role','alert'));
  document.querySelectorAll('th').forEach(el=>el.setAttribute('scope','col'));

  inventory=Inventory.mount({remote,state,can,guard,esc,fmtBRL,logHistorico,onChange:renderAll,onReceive:openModalLote,onDiscard:openDiscard});
  team=Team.mount({state,esc,logHistorico,onChange:renderAll,toast});
  document.addEventListener('visibilitychange',async()=>{if(!document.hidden){try{await refreshData();renderAll();}catch(e){toast(e.message,true);}}});

  navigate("dashboard");
})();

