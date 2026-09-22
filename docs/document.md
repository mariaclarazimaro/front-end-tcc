# Documentação do sistema — Doce Sabor

> Documentação técnica e funcional do projeto acadêmico **Doce Sabor**, um sistema web para gestão interna de estoque e vendas de uma doceria.

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Tecnologias e arquitetura](#2-tecnologias-e-arquitetura)
3. [Requisitos](#3-requisitos)
4. [Perfis e permissões](#4-perfis-e-permissões)
5. [Regras de negócio](#5-regras-de-negócio)
6. [Funcionalidades e fluxos](#6-funcionalidades-e-fluxos)
7. [Banco de dados](#7-banco-de-dados)
8. [Segurança](#8-segurança)
9. [Instalação e execução local](#9-instalação-e-execução-local)
10. [Implantação e continuidade](#10-implantação-e-continuidade)
11. [Escopo e limitações](#11-escopo-e-limitações)
12. [Documentação complementar](#12-documentação-complementar)

## 1. Visão geral

O **Doce Sabor** centraliza o cadastro de produtos, recebimento de lotes, acompanhamento de fabricação e validade, registro de vendas, descartes e identificação dos responsáveis por operações. É destinado à operação interna de uma doceria.

**Objetivo:** integrar estoque, validade e vendas com persistência de dados e rastreabilidade. A prevenção de desperdícios é uma finalidade do projeto, **não um resultado comercial quantitativamente comprovado**.

**Escopo:** produtos acabados vendidos em quantidades inteiras (unidade, fatia, caixa ou pacote). O sistema não gerencia ingredientes, receitas, fornecedores, compras, emissão fiscal, comércio eletrônico ou conciliação bancária.

## 2. Tecnologias e arquitetura

| Camada | Tecnologia | Responsabilidade |
| --- | --- | --- |
| Interface | HTML, CSS e JavaScript | Telas, formulários, interações e requisições à API |
| Servidor | PHP 8.3 e Laravel 13 | Autenticação, autorização, validações e regras de negócio |
| Banco de dados | **MySQL** | Persistência relacional de contas, produtos, lotes e operações |
| Dependências | Composer | Instalação e gerenciamento de bibliotecas PHP |
| Hospedagem planejada | Railway | Serviço da aplicação e serviço do banco de dados |

```text
Navegador (HTML, CSS, JavaScript)
               |
               v
       API PHP / Laravel
     (sessão e permissões)
               |
               v
             MySQL
```

A interface é servida pela pasta `public/` e acessa a API na mesma origem. O servidor valida as operações e grava os dados no banco. **Somente `public/` deve ser exposta pelo servidor web.**

### Organização principal

```text
app/Http/Controllers/  Controladores de autenticação, usuários e operações
app/Http/Middleware/   Verificações de sessão e segurança
app/Models/           Modelos da aplicação
app/Support/          Definições de permissões
bootstrap/            Inicialização do Laravel
config/               Configurações
database/migrations/  Estrutura versionada do banco
database/seeders/     Dados iniciais e de demonstração
public/               Interface e entrada web
routes/               Rotas
storage/              Arquivos de execução do Laravel
docs/                 Guias e documentação
artisan               Console Laravel
composer.json         Dependências
.env.example          Exemplo de configuração, sem credenciais
railway.json          Configuração de publicação
```

## 3. Requisitos

### 3.1 Funcionais

| ID | Requisito |
| --- | --- |
| RF01 | Autenticar por e-mail e senha, encerrar sessão e exigir troca de senha temporária. |
| RF02 | Cadastrar e administrar contas, perfis, permissões adicionais e desativação. |
| RF03 | Cadastrar e editar produtos, categorias, unidades, preços e estoque mínimo. |
| RF04 | Receber lotes vinculados a produtos com datas e quantidades. |
| RF05 | Consultar estoque, lotes e movimentações com busca, filtros e paginação visual. |
| RF06 | Registrar vendas com itens, vendedor e pagamento; calcular e baixar estoque no servidor. |
| RF07 | Consultar histórico, detalhar vendas e exportar CSV. |
| RF08 | Confirmar descartes com motivo e registro do responsável. |
| RF09 | Apresentar indicadores de validade, reposição, faturamento e desperdício. |
| RF10 | Registrar ações sensíveis em auditoria sem gravar senhas nos registros. |

### 3.2 Não funcionais

- **Integridade:** chaves estrangeiras e transações impedem baixa parcial de uma venda que falhou.
- **Segurança:** autenticação, hash de senha, CSRF, validação e autorização no servidor.
- **Usabilidade:** produtos e lotes separados, filtros e confirmação de ações destrutivas.
- **Responsividade:** interface adaptada a telas móveis; tabelas com rolagem interna.
- **Acessibilidade:** rótulos, foco, navegação por teclado e estados textuais; sem certificação formal.
- **Manutenção:** módulos separados, migrations e guias de instalação.
- **Desempenho:** paginação na interface; não há garantia aferida de tempo máximo de resposta.

## 4. Perfis e permissões

| Operação | Operador | Estoquista | Gerente | Administrador |
| --- | :---: | :---: | :---: | :---: |
| Consultar estoque e alertas | ✓ | ✓ | ✓ | ✓ |
| Registrar vendas | ✓ | — | ✓ | ✓ |
| Consultar vendas | Próprias | — | Todas | Todas |
| Receber lotes | — | ✓ | ✓ | ✓ |
| Gerenciar produtos | — | — | ✓ | ✓ |
| Autorizar descartes | — | — | ✓ | ✓ |
| Relatórios e auditoria | — | — | ✓ | ✓ |
| Gerenciar contas | — | — | — | ✓ |
| Alterar a própria senha | ✓ | ✓ | ✓ | ✓ |

O administrador pode conceder permissões extras para tarefas específicas sem alterar o perfil principal. **Gerenciar contas permanece exclusivo do administrador.** Alterações de acesso invalidam sessões anteriores; o sistema preserva pelo menos um administrador ativo. A permissão de relatórios dá acesso a informações globais, enquanto o histórico detalhado respeita o alcance de consulta de vendas da conta.

## 5. Regras de negócio

### 5.1 Produtos e lotes

O **produto** contém nome, categoria, unidade, preço e estoque mínimo. O **lote** representa uma entrada desse produto, com fabricação, validade, quantidade inicial e saldo atual. Um produto pode possuir vários lotes.

### 5.2 Validade

| Condição | Estado | Venda |
| --- | --- | --- |
| Mais de 5 dias até vencer | Em dia | Permitida |
| De 3 a 5 dias | A vencer | Permitida, com aviso |
| De 0 a 2 dias | Urgente | Permitida durante a validade |
| Validade anterior ao dia atual | Vencido | Bloqueada |
| Saldo zero | Esgotado | Sem disponibilidade |
| Baixa por descarte | Descartado | Sem saldo vendável |

A comparação usa datas de calendário no fuso `America/Sao_Paulo`. O dia da validade ainda permite venda. O alerta não substitui a avaliação das condições de conservação do produto.

### 5.3 Estoque mínimo

O estoque disponível soma os saldos de lotes **ativos e válidos**. O mínimo padrão é 10, editável por produto. Saldo zero significa sem estoque; saldo positivo até a metade inteira do mínimo é crítico; acima dessa metade até o mínimo é baixo; acima do mínimo é normal. Lotes vencidos não compõem o saldo disponível para venda.

### 5.4 Vendas e alocação de lotes

- O usuário informa produtos, quantidades inteiras e forma de pagamento: dinheiro, Pix, débito ou crédito.
- O servidor identifica o vendedor pela sessão e obtém os preços do banco; não confia em totais enviados pelo navegador.
- A baixa utiliza lotes válidos de **fabricação mais antiga**, podendo distribuir um item por mais de um lote.
- Venda, itens e baixa são confirmados na mesma transação. Falta de saldo em qualquer item reverte a operação inteira.
- Uma chave de idempotência evita duplicar a venda quando a mesma solicitação é reenviada.
- Nome e preço praticados ficam preservados nos itens históricos.

**Atenção:** registrar Pix ou cartão apenas identifica o meio de pagamento; não realiza cobrança nem confirma recebimento. Não há cancelamento com estorno de venda concluída nesta versão.

### 5.5 Descartes

Descartar exige permissão, confirmação e motivo: validade vencida, avaria, qualidade inadequada ou outro. O motivo “outro” exige observação; “validade vencida” só é aceito após a data. A operação baixa **todo o saldo restante do lote**, preserva o lote e registra quantidade, usuário e momento. Novo descarte de lote esgotado ou já descartado é rejeitado.

## 6. Funcionalidades e fluxos

### 6.1 Autenticação

1. O usuário informa e-mail e senha.
2. O servidor valida credenciais e limites de tentativas.
3. Se a senha for temporária, o usuário deve substituí-la.
4. Uma sessão autenticada permite acessar somente as operações autorizadas.
5. Ao sair, a sessão é invalidada.

### 6.2 Recebimento de lote

1. Um usuário autorizado seleciona um produto existente.
2. Informa fabricação, validade e quantidade.
3. O servidor valida produto, datas, quantidade e permissão.
4. Um novo lote é persistido, vinculado ao produto e ao responsável.

### 6.3 Registro de venda

1. Selecionar produtos e quantidades.
2. Escolher a forma de pagamento e confirmar.
3. O servidor valida a autorização, consulta preços e disponibilidade.
4. Seleciona lotes elegíveis por fabricação mais antiga.
5. Grava venda, itens e movimentações de saída em uma transação.
6. Retorna a confirmação ou reverte tudo em caso de erro.

### 6.4 Descarte

1. Abrir o lote e solicitar descarte.
2. Conferir saldo, informar motivo e, quando exigida, observação.
3. Confirmar explicitamente.
4. O servidor valida permissão e condições, zera o saldo e registra a operação.

### 6.5 Consultas e indicadores

As telas permitem consultar produtos, lotes, movimentações, alertas e histórico conforme as permissões. Os alertas são **calculados a partir dos lotes**, não armazenados em tabela própria. Os indicadores incluem faturamento, unidades vendidas, estoque e desperdício; o índice de desperdício relaciona unidades descartadas às recebidas, não representa necessariamente perda financeira.

## 7. Banco de dados

A modelagem documentada possui **sete tabelas de domínio e quatro técnicas**, totalizando 11. Nomes de tabelas e colunas permanecem em inglês porque correspondem aos identificadores do código e das migrations; os textos explicativos estão em português.

| Tabela | Finalidade | Campos representativos |
| --- | --- | --- |
| `users` | Contas, perfil e estado de acesso | `id`, `nome`, `email`, `password`, `perfil`, `extras`, `active` |
| `products` | Catálogo de produtos | `id`, `nome`, `categoria`, `unidade`, `preco`, `minimo` |
| `lots` | Entradas e saldos por lote | `id`, `product_id`, `fabricacao`, `validade`, `qtd_inicial`, `qtd_atual`, `status`, `created_by` |
| `sales` | Cabeçalho das vendas | `id`, `user_id`, `vendedor_nome`, `vendedor_email`, `pagamento`, `total`, `idempotency_key` |
| `sale_items` | Itens e lotes consumidos nas vendas | `id`, `sale_id`, `lot_id`, `product_id`, `nome`, `qtd`, `preco_unit` |
| `discards` | Descartes justificados | `id`, `lot_id`, `user_id`, `quantidade`, `motivo`, `observacao` |
| `audit_logs` | Auditoria de eventos | `id`, `user_id`, `type`, `description`, `created_at` |
| `sessions` | Sessões persistidas | Tabela técnica |
| `cache` | Valores temporários e contadores | Tabela técnica |
| `cache_locks` | Bloqueios auxiliares | Tabela técnica |
| `migrations` | Histórico de alterações de esquema | Tabela técnica |

**Relacionamentos principais:** usuário → vendas e entradas; produto → lotes; venda → itens; item → produto e lote; lote → descartes. As chaves estrangeiras e os índices são definidos nas migrations. O estado “vencido” é calculado pela data de validade, não por uma alteração obrigatória do campo `status`.

A estrutura exportada, quando presente no repositório, fica em `database/doce_sabor-estrutura.sql`. Ela representa o esquema e **não é um backup dos dados**. Para instalar o Laravel, utilize migrations em um banco vazio: não importe esse SQL antes de executar `php artisan migrate`, para evitar conflito entre tabelas.

## 8. Segurança

- Senhas armazenadas com hash `bcrypt`.
- Limitação de tentativas por e-mail/origem e por origem; dez falhas na conta geram bloqueio temporário de 15 minutos.
- Sessões persistidas no banco, cookies `HttpOnly` e `SameSite`, expiração após 30 minutos sem requisições e limite absoluto de oito horas.
- Troca obrigatória de senha inicial; alteração de acessos e desativação invalidam sessões anteriores.
- Proteção CSRF, validação de entradas e autorização na API, independentemente dos botões exibidos.
- Transações para preservar consistência entre vendas e baixa de estoque.
- Registros de auditoria de ações relevantes sem armazenar senhas.

A segurança da implantação também depende de HTTPS, credenciais privadas, configuração correta do servidor e backups.

## 9. Instalação e execução local

**Pré-requisitos:** PHP compatível (ambiente documentado: PHP 8.3), Composer e um servidor **MySQL**. Configure o servidor web para expor apenas `public/` quando não utilizar o servidor de desenvolvimento.

```bash
# Na raiz do projeto
composer install
```

Crie o arquivo `.env` a partir do `.env.example` (no Windows, copie pelo Explorador ou use `copy .env.example .env`). Configure nele a conexão MySQL e os demais valores necessários, sem versionar credenciais.

```bash
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Acesse `http://localhost:8000`.

Em uma instalação de demonstração nova, a documentação do projeto informa a conta inicial `admin@docesabor.local` e senha temporária `DoceSabor@2026`, com troca obrigatória no primeiro acesso. **Não utilize essa senha pública em uma implantação real**: defina uma senha privada conforme o guia de hospedagem.

O seed inicial inclui oito produtos e nove lotes de demonstração. Reexecutá-lo não deve ser usado como mecanismo para repor estoque ou restaurar vendas. Para transferir registros entre ambientes, é necessário um backup completo do banco.

> Consulte `.env.example` e [backend](backend-laravel.md) para a configuração inicial.

## 10. Implantação e continuidade

A arquitetura de hospedagem prevista utiliza Railway com um serviço Laravel e um serviço MySQL. As variáveis devem ser cadastradas no ambiente de hospedagem, sem publicar o `.env` local. Configure `APP_KEY`, conexão com o banco e senha inicial privada (`INITIAL_ADMIN_PASSWORD`) conforme o guia do projeto. Preserve a chave da aplicação entre publicações.

**Situação registrada na documentação do TCC:** a publicação remota ainda depende de configuração e verificação dos fluxos no domínio HTTPS; não é apresentada como implantação já validada.

Para continuidade operacional, mantenha backups completos e teste a restauração. O SQL apenas de estrutura não transporta usuários, vendas nem histórico. A paginação atual do estoque ocorre na interface; grandes volumes podem exigir paginação no servidor.

## 11. Escopo e limitações

- Não há integração com adquirentes de cartão ou confirmação automática de Pix.
- Não há estorno de vendas concluídas, recuperação de senha por e-mail, gestão de ingredientes, fornecedores ou emissão fiscal.
- Alertas são exibidos nas telas; não há envio automático de e-mails nem tarefa agendada diária.
- Não foram apresentados estudo de campo em doceria, medição de impacto comercial, certificação formal de acessibilidade ou teste de carga de grande porte.
- A validação descrita no TCC é técnica e local, com testes de regras, permissões, autenticação, operações de banco e verificações de interface.

## 12. Documentação complementar

Quando disponíveis no repositório:

- [`docs/hospedagem-railway.md`](hospedagem-railway.md) — publicação.
- [`docs/backend-laravel.md`](backend-laravel.md) — arquitetura e API.
- Os diagramas e capturas ficam nas pastas `diagramas/` e `telas/`; documentos originais em `referencias/`.

---

**Projeto acadêmico:** Doce Sabor — Sistema de Gestão de Estoque e Vendas.  
**Autoras:** Beatriz Miranda Mantovani; Julia Tiemi Akiyoshi Zacaro; Kathleen Kaianne Soares; Maria Clara Zimaro Vieira.  
**Orientadores:** preencher com os dois nomes completos.


## Inicialização administrativa e banco de dados e backup

Em um banco MySQL novo, `php artisan migrate --seed` cria uma única conta administrativa inicial (`admin@docesabor.local`), ativa e com troca obrigatória de senha. Em `APP_ENV=local`, sem `INITIAL_ADMIN_PASSWORD`, a senha de demonstração é `DoceSabor@2026`. No Railway, configure `INITIAL_ADMIN_PASSWORD` antes do deploy; para reproduzir a mesma credencial inicial, informe o mesmo valor, mas uma senha privada exclusiva é mais segura. Não inclua senhas reais no GitHub.

O seeder só cria o administrador se a tabela `users` estiver vazia. Não redefine senhas, não duplica usuários e não recupera automaticamente administradores em bancos já preenchidos. Um backup completo do MySQL é necessário para transportar usuários, vendas e lotes; o arquivo `database/doce_sabor-estrutura.sql` contém apenas a estrutura. Não importe essa estrutura antes de executar as migrations em um banco novo.

A hospedagem configurada é Railway (Laravel + MySQL). Vercel não está configurada para executar este backend. Consulte [hospedagem](hospedagem-railway.md) e [backend](backend-laravel.md).
