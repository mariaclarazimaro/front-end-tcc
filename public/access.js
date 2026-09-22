/* Política compartilhada pelo protótipo. Repetir a autorização no servidor Laravel. */
(function(root) {
  const permissions = {
    'sales.create': {label:'Registrar vendas', description:'Usar o caixa e finalizar vendas.'},
    'sales.own': {label:'Consultar as próprias vendas', description:'Consultar e exportar vendas da própria conta.'},
    'sales.all': {label:'Consultar todas as vendas', description:'Consultar e exportar vendas de toda a equipe.'},
    'stock.receive': {label:'Registrar entradas de estoque', description:'Adicionar lotes a produtos existentes.'},
    'products.manage': {label:'Gerenciar produtos', description:'Cadastrar e editar preço, categoria e estoque mínimo.'},
    'stock.discard': {label:'Autorizar descartes', description:'Confirmar a baixa de lotes com motivo.'},
    'reports.view': {label:'Consultar relatórios e auditoria', description:'Acompanhar faturamento, perdas e atividades da equipe.'}
  };
  const roles = {
    operador: {label:'Operador', description:'Atendimento e vendas do dia a dia.', permissions:['sales.create','sales.own']},
    estoquista: {label:'Estoquista', description:'Recebimento de produtos e acompanhamento dos lotes.', permissions:['stock.receive']},
    gerente: {label:'Gerente', description:'Gestão da operação, catálogo e resultados.', permissions:Object.keys(permissions)},
    admin: {label:'Administrador', description:'Acesso completo, incluindo gestão de usuários e permissões.', permissions:[...Object.keys(permissions),'users.manage']}
  };
  function can(user, permission) {
    if(!user || !roles[user.perfil]) return false;
    return roles[user.perfil].permissions.includes(permission) || (permission !== 'users.manage' && Object.hasOwn(permissions,permission) && (user.extras||[]).includes(permission));
  }
  const canView = (user,view) => ['dashboard','estoque','alertas'].includes(view) ? !!roles[user?.perfil] : view==='vendas' ? can(user,'sales.create') : view==='historico' ? can(user,'sales.own')||can(user,'sales.all') : view==='relatorios' ? can(user,'reports.view') : view==='usuarios' ? can(user,'users.manage') : false;
  function extrasFor(role,extras=[]) {
    if(!roles[role] || !Array.isArray(extras)) throw Error('Perfil ou permissões inválidos.');
    if(extras.some(p=>!Object.hasOwn(permissions,p))) throw Error('Permissão inválida.');
    return [...new Set(extras)].filter(p=>!roles[role].permissions.includes(p));
  }
  const api={roles,permissions,can,canView,extrasFor};
  if(typeof module!=='undefined') module.exports=api; else root.Access=api;
})(globalThis);
