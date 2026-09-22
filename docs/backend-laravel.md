# Arquitetura atual do Doce Sabor

A aplicação utiliza PHP/Laravel, MySQL e interface em HTML, CSS e JavaScript. O código PHP fica na raiz do projeto; `public/` é a única pasta exposta pelo servidor web. O front-end acessa `/api/` na mesma origem. A publicação prevista é um serviço Laravel e um serviço MySQL no Railway, conforme o README.

## Fluxo de acesso

`GET /api/csrf` inicia a sessão e fornece o token. `POST /api/login` valida credenciais e limites de tentativa. O middleware `AccountSession` verifica conta ativa, versão da sessão, prazo absoluto e troca obrigatória de senha. O middleware padrão do Laravel confere CSRF nas alterações. As permissões ficam em `app/Support/Permissions.php` e são verificadas em cada operação protegida.

## API implementada

| Método e rota | Finalidade |
| --- | --- |
| GET /api/csrf | Token CSRF |
| POST /api/login | Entrar |
| GET /api/me | Consultar conta autenticada |
| POST /api/logout | Sair |
| PUT /api/password | Alterar a própria senha |
| GET /api/state | Produtos, lotes, movimentações e vendas permitidas |
| GET e POST /api/users | Consultar e criar contas |
| PATCH /api/users/{user} | Alterar perfil, extras, ativação, bloqueio e senha temporária |
| POST /api/products | Cadastrar produto |
| PUT /api/products/{id} | Editar produto |
| POST /api/lots | Receber lote |
| POST /api/sales | Confirmar venda e baixa |
| POST /api/lots/{id}/discard | Descartar saldo com motivo |

## Persistência e regras

A migration em `database/migrations/` define usuários, produtos, lotes, vendas, itens, descartes, auditoria e as tabelas auxiliares de sessão e cache. O arquivo `database/doce_sabor-estrutura.sql` guarda uma exportação das 11 tabelas, sem registros, para consulta e reprodução da estrutura em um banco vazio. Para instalar a aplicação Laravel, use as migrations conforme o README. O preço e o vendedor da venda vêm do servidor. A transação bloqueia as linhas necessárias, distribui unidades entre lotes elegíveis e confirma todos os itens juntos. O reenvio da mesma chave de idempotência retorna a venda anterior.

O saldo vendável exclui lotes vencidos e descartados. O critério de seleção é fabricação mais antiga e identificador em caso de empate. O descarte baixa o saldo integral sem apagar o lote. O controle de validade considera o calendário no fuso `America/Sao_Paulo`.

## Hospedagem e manutenção

`railway.json` seleciona Railpack, executa migrations e DatabaseSeeder antes da publicação e usa `/up` para verificar a inicialização. As credenciais são variáveis do serviço. Sessões e limites de acesso ficam no MySQL; os logs seguem para stderr. Não há filas ou tarefas agendadas para manter. A configuração e o primeiro acesso estão detalhados no README.

A paginação atual acontece na interface depois da consulta do estado autorizado. Paginação da API, recuperação por e-mail e estorno de vendas permanecem como evoluções. Não há validação de pagamento junto a bancos ou operadoras de cartão.

## Administrador inicial e carga de demonstração

Em um banco MySQL novo, execute `php artisan migrate --seed`. O `DatabaseSeeder` cria **uma única conta administrativa inicial**, somente quando a tabela de usuários está vazia. A conta é ativa, tem perfil `admin`, senha armazenada por hash e exige a troca da senha no primeiro acesso (`must_change_password=true`).

- **E-mail inicial:** `admin@docesabor.local`. Para escolher outro e-mail antes da primeira carga, defina `INITIAL_ADMIN_EMAIL`.
- **Execução local (`APP_ENV=local`):** a senha temporária padrão é `DoceSabor@2026` quando `INITIAL_ADMIN_PASSWORD` não está definida.
- **Hospedagem no Railway (`APP_ENV=production`):** defina `INITIAL_ADMIN_PASSWORD` nas variáveis do serviço **antes do primeiro deploy**. Se quiser as mesmas credenciais iniciais do ambiente local, configure `INITIAL_ADMIN_EMAIL=admin@docesabor.local` e `INITIAL_ADMIN_PASSWORD` com a mesma senha temporária. Por segurança, recomenda-se uma senha privada diferente para um serviço exposto à internet. O código atual **não aplica automaticamente a senha padrão local em produção**.

O `railway.json` executa `php artisan migrate --force --seed` no pré-deploy. Depois que o administrador é criado, executar o seeder novamente **não cria outra conta nem redefine a senha**. A criação automática acontece apenas se não existir nenhum usuário; ela não impede que outras funcionalidades criem administradores posteriormente. Se houver usuários, mas nenhum administrador ativo, a carga falha; para recuperar o acesso, utilize o comando administrativo `php artisan doce:admin email@exemplo.com` de forma autorizada, sem apagar o banco.

O `PresentationCatalogSeeder` adiciona produtos de demonstração ausentes sem repor saldos existentes. Nenhum seeder é executado durante o login.

**Vercel:** este repositório não configura o deploy do Laravel na Vercel. O backend e o MySQL estão preparados para o Railway; publicar somente o frontend na Vercel requer configuração adicional de API, CORS e sessão.
