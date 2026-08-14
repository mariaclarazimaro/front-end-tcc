# 🍬 Doce Sabor — Gestão de Estoque e Vendas

Front-end de um sistema de controle de estoque e vendas para docerias
(TCC), focado em evitar perdas por vencimento através de rotação de lotes
por PEPS/FIFO e alertas visuais de validade.

> ⚠️ **Apenas o front-end.** Versão estática (HTML, CSS e JS puro), só
> para navegação visual entre as telas. Sem back-end ou banco conectado —
> os dados são fixos (mock) e nenhuma ação é salva de verdade.

---

## 📋 Regras de negócio já implementadas

- **Semáforo de validade** — 🟢 verde (+5 dias), 🟡 amarelo (3–5 dias), 🔴 vermelho (<3 dias ou vencido)
- **PEPS/FIFO** — o lote mais antigo é sempre vendido primeiro
- **Alertas de validade** — lista dos lotes que precisam de atenção
- **Permissões** — perfis admin e operador, com telas restritas
- **Histórico de ações** — auditoria de quem cadastrou/excluiu lotes e usuários

## 🛠️ Tecnologias

HTML5 + CSS3 + JavaScript
-[SheetJS] exportação de planilha Excel.

## 📁 Estrutura

```
doce-sabor/
├── index.html
├── style.css
├── script.js
├── img/
│   └── logo.svg
└── README.md
```

## 🚀 Como rodar

Basta abrir o `index.html` no navegador — não precisa de instalação nem build.

## 🧩 Próximos passos — Back-end (Laravel + MySQL)

Este front-end foi construído de propósito para ser plugado depois em um
back-end real, sem precisar ser reescrito:

- [ ] Modelar o banco em MySQL (`usuarios`, `produtos`, `lotes`, `vendas`, `historico`)
- [ ] Construir a API em Laravel (rotas, controllers e models)
- [ ] Autenticação e permissões reais (Laravel Sanctum/Breeze)
- [ ] Trocar as chamadas locais do JS por `fetch`/Axios para a API
- [ ] Salvar os dados no MySQL de verdade, no lugar dos dados fixos que hoje estão escritos no `script.js`

Os pontos exatos de integração já estão marcados no `script.js` com o
comentário `🧩 PEÇA PHP`.

## 📁 Estruturação futura (com back-end)

Com o Laravel entrando, a ideia é separar front-end e back-end em pastas
próprias, mantendo o front-end como está hoje:

```
doce-sabor/
├── frontend/              # este repositório atual
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── img/
│       └── logo.svg
│
├── backend/                # API em Laravel
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── ProdutoController.php
│   │   │   ├── LoteController.php
│   │   │   ├── VendaController.php
│   │   │   └── UsuarioController.php
│   │   └── Models/
│   │       ├── Usuario.php
│   │       ├── Produto.php
│   │       ├── Lote.php
│   │       ├── Venda.php
│   │       └── Historico.php
│   ├── database/
│   │   └── migrations/     # criação das tabelas no MySQL
│   ├── routes/
│   │   └── api.php         # endpoints que o front-end vai chamar
│   └── .env                # credenciais do banco (não vai pro Git)
│
└── README.md
```

## 👥 Autoria

Projeto desenvolvido em grupo como Trabalho de Conclusão de Curso (TCC).
