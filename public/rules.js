/* Regras puras compartilhadas pela interface e pelos testes. */
(function (root) {
  const iso = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const dayNumber = value => { const [y,m,d] = value.split('-').map(Number); return Date.UTC(y,m-1,d)/86400000; };
  const days = (value, now = new Date()) => dayNumber(value) - dayNumber(iso(now));
  const status = d => d < 0 ? 'vencido' : d < 3 ? 'vermelho' : d <= 5 ? 'amarelo' : 'verde';
  const stock = (qty, minimum=10) => qty === 0 ? 'Sem estoque' : qty <= Math.floor(minimum/2) ? 'Crítico' : qty <= minimum ? 'Baixo' : 'Normal';
  const sellable = (l, now=new Date()) => l.status === 'ativo' && l.qtdAtual > 0 && days(iso(new Date(l.validade)), now) >= 0;
  const allocate = (lotes, produtoId, qty, now=new Date()) => {
    if (!Number.isSafeInteger(qty) || qty < 1) throw new Error('Quantidade inválida.');
    const result = [];
    for (const lote of lotes.filter(l => l.produtoId === produtoId && sellable(l, now)).sort((a,b) => new Date(a.fabricacao)-new Date(b.fabricacao) || a.id-b.id)) {
      const take = Math.min(qty,lote.qtdAtual); result.push({loteId:lote.id,qty:take}); qty -= take;
      if (!qty) return result;
    }
    throw new Error('Estoque disponível insuficiente.');
  };
  const api = {iso,days,status,stock,sellable,allocate};
  if (typeof module !== 'undefined') module.exports = api; else root.Rules = api;
})(globalThis);
