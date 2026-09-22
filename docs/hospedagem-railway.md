# Hospedar o Doce Sabor no Railway

Este roteiro publica a interface e o Laravel no mesmo serviço, com um serviço MySQL separado. Não é necessário Vercel nesta configuração. O domínio único mantém API, sessão e CSRF na mesma origem. A publicação na nuvem ainda não foi realizada; o primeiro deploy deve confirmar a compatibilidade do ambiente.

## 1. Escolher os dados da apresentação

Há duas opções:

- **Começar uma demonstração nova:** não importe SQL. O deploy cria tabelas, administrador com senha temporária e oito produtos com nove lotes automaticamente.
- **Levar o banco local:** importe o backup completo no MySQL vazio, antes de publicar a aplicação. Contas e senhas permanecem como estavam na exportação. A carga não troca a senha nem duplica os exemplos existentes.

O arquivo `database/doce_sabor-estrutura.sql` não é um backup completo. Consulte [orientações de banco e backup](document.md#banco-de-dados-e-backup) para transportar os registros.

## 2. Preparar o código no GitHub

Crie um repositório e envie a raiz do projeto, incluindo `composer.lock`, `railway.json`, `public`, `resources`, migrations e seeders. Respeite `.gitignore`: não envie `.env`, `vendor`, logs nem backups completos. Confira os arquivos antes de publicar.

Não há Dockerfile ou Compose. Railpack identifica o projeto PHP/Laravel pelo código e instala as dependências. A pasta pública é `public/`. [Referência do Railpack](https://railpack.com/languages/php/).

## 3. Criar o MySQL

No Railway, crie um projeto e adicione o serviço MySQL. Aguarde ficar disponível. Ele fornece as variáveis de conexão; não use as credenciais `root` sem senha do XAMPP. [MySQL no Railway](https://docs.railway.com/databases/mysql).

Para transportar o banco local, faça a importação **neste momento**, antes de conectar o repositório da aplicação. Use o endereço e a porta externos/TCP proxy informados pelo serviço no Workbench, selecione o banco de destino e importe o arquivo completo. O endereço privado do serviço só funciona dentro do Railway. Confira o término sem erros e a presença de usuários, produtos, lotes e `migrations`. Confirme a importação no MySQL de destino antes de encerrar a cópia local.

Após importar e antes de disponibilizar o site, limpe apenas os registros transitórios do banco remoto selecionado:

```sql
DELETE FROM sessions;
DELETE FROM cache;
DELETE FROM cache_locks;
```

Isso remove sessões locais e limites transitórios; não apaga cadastros nem vendas. Uma chave APP_KEY nova não altera as senhas armazenadas com bcrypt.

## 4. Configurar a aplicação

Adicione um serviço para o repositório GitHub. O diretório raiz é a raiz do projeto, onde está `artisan`. Cadastre as variáveis abaixo antes de concluir um deploy bem-sucedido. Caso a conexão ao repositório dispare um deploy antes das variáveis, configure-as e publique novamente.

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://SEU-DOMINIO.up.railway.app
APP_KEY=base64:SUA_CHAVE_GERADA
DB_CONNECTION=mysql
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_DATABASE=${{MySQL.MYSQLDATABASE}}
DB_USERNAME=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
SESSION_SECURE_COOKIE=true
LOG_CHANNEL=stderr
TRUSTED_PROXIES=*
RAILPACK_SKIP_MIGRATIONS=true
INITIAL_ADMIN_EMAIL=admin@docesabor.local
INITIAL_ADMIN_PASSWORD=SENHA_TEMPORARIA_DEFINIDA_NAS_VARIABLES
```

Substitua os textos de exemplo. As referências pressupõem o serviço chamado `MySQL`; ajuste o nome se necessário. Gere a chave no terminal local com `php artisan key:generate --show` e copie o resultado para APP_KEY. Esse comando apenas exibe uma nova chave, sem substituir a local. Preserve a chave remota nos próximos deploys.

A senha temporária da hospedagem deve ter pelo menos 12 caracteres, maiúscula, minúscula e número. Para usar a mesma credencial inicial local e remota, defina `INITIAL_ADMIN_EMAIL=admin@docesabor.local` e configure `INITIAL_ADMIN_PASSWORD` com a mesma senha temporária local. **Isso expõe uma credencial previsível em um site público: prefira uma senha privada exclusiva para a hospedagem.** Em produção, um banco sem usuários exige `INITIAL_ADMIN_PASSWORD`; a aplicação não publica automaticamente uma conta com senha conhecida por todos. O administrador é criado automaticamente e precisa trocar a senha no primeiro login. Havendo usuários importados, essas variáveis não alteram suas contas.

`TRUSTED_PROXIES=*` corresponde ao uso atrás do proxy Railway; em outra infraestrutura configure os proxies efetivamente confiáveis. `RAILPACK_SKIP_MIGRATIONS=true` evita repetir no início o trabalho já definido no pre-deploy.

## 5. Publicar e entrar

O arquivo `railway.json` define:

```sh
php artisan migrate --force --seed
```

Esse comando roda antes da publicação, cria ou atualiza tabelas e aplica a carga inicial. Falhas impedem a publicação dessa versão. Não use `migrate:fresh`: ele apaga tabelas. O endpoint de saúde é `/up`. [Pre-deploy no Railway](https://docs.railway.com/deployments/pre-deploy-command).

Gere um domínio em Settings → Networking → Generate Domain, ajuste APP_URL e reaplique as variáveis. Use a inicialização detectada pelo Railpack; não configure `php artisan serve` como servidor público.

Abra o endereço HTTPS. Em uma instalação nova, use INITIAL_ADMIN_EMAIL e a senha temporária escolhida e altere-a imediatamente. No banco importado, entre com a senha que existia quando o backup foi exportado. Após a troca, a variável inicial não redefine a senha; pode ser removida quando o primeiro cadastro estiver concluído.

## 6. Conferir a apresentação

Confira login, troca de senha, saída, perfis e permissão extra; cadastre ou receba um lote, registre uma venda e confira vendedor, pagamento, saldo, histórico e gráfico. Confira motivo e confirmação do descarte e o layout no celular. Use dados fictícios.

Uma resposta saudável em `/up` confirma inicialização, mas não substitui essa conferência dos fluxos e do banco. Verifique os logs do serviço se houver erro 500; erros de conexão indicam conferir DB_* e a disponibilidade do MySQL. Erro 419 exige conferir domínio, HTTPS, cookies e APP_URL.

Mantenha um backup antes da apresentação. Para publicar mudanças, envie o código ao GitHub e acompanhe o deploy; não é preciso restaurar o banco toda vez. Não remova o serviço/volume MySQL: é nele que ficam os registros. Não há workers, cron ou Node obrigatórios nos fluxos atuais.

## Por que não separar na Vercel agora

A entrega foi preparada para executar PHP e as telas juntos. Separar o front-end exigiria configurar endereço da API, CORS e cookies/CSRF entre origens. Essa adaptação não faz parte da configuração atual.

> **Vercel:** este projeto não inclui configuração de execução do Laravel na Vercel. O procedimento testável/documentado aqui é Railway para aplicação e MySQL; não presuma que enviar o repositório à Vercel criará o administrador.
