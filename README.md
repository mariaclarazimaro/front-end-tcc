# 🍰 Doce Sabor

O **Doce Sabor** é um sistema web desenvolvido para auxiliar no gerenciamento de **estoque e vendas de uma doceria**.

O projeto tem como objetivo centralizar o controle de produtos, lotes, validade, vendas e movimentações de estoque, facilitando a organização das informações e permitindo maior rastreabilidade das operações realizadas no estabelecimento.

O sistema foi desenvolvido como **Trabalho de Conclusão de Curso (TCC)** do curso de Desenvolvimento de Sistemas.

## 📌 Sobre o projeto

O sistema permite acompanhar todo o fluxo dos produtos, desde a entrada de um lote no estoque até sua venda ou descarte.

Cada produto pode possuir diferentes lotes, contendo informações como data de fabricação, validade e quantidade disponível. Dessa forma, o sistema consegue identificar produtos próximos do vencimento e priorizar a saída dos lotes mais antigos.

Além do controle de estoque, o Doce Sabor possui gerenciamento de usuários e diferentes níveis de acesso, permitindo que cada funcionário utilize apenas as funcionalidades relacionadas à sua função.

## ✨ Funcionalidades

- Autenticação de usuários;
- Controle de sessão;
- Diferentes perfis de acesso;
- Gerenciamento de usuários e permissões;
- Cadastro e edição de produtos;
- Registro de entrada de lotes;
- Controle de quantidade em estoque;
- Controle de fabricação e validade;
- Alertas para produtos próximos do vencimento;
- Indicadores de estoque baixo e crítico;
- Registro de vendas;
- Identificação do vendedor responsável;
- Registro da forma de pagamento;
- Baixa automática dos produtos vendidos;
- Priorização dos lotes mais antigos (PEPS);
- Histórico de vendas;
- Filtros e busca de registros;
- Registro de descartes;
- Histórico de movimentações;
- Relatórios e indicadores;
- Interface responsiva para computadores e dispositivos móveis.

## 👥 Perfis de acesso

O sistema possui quatro perfis principais:

| Perfil | Principais funções |
| --- | --- |
| **Operador** | Realizar vendas e consultar suas vendas |
| **Estoquista** | Registrar entrada de lotes e acompanhar o estoque |
| **Gerente** | Gerenciar produtos, vendas, estoque, descartes e relatórios |
| **Administrador** | Acesso completo ao sistema e gerenciamento de usuários |

Também podem ser concedidas **permissões adicionais** individualmente, permitindo liberar determinadas funcionalidades sem alterar o perfil principal do usuário.

## 📦 Controle de estoque

O estoque é organizado através de **produtos e lotes**.

Um produto contém informações como:

- Nome;
- Categoria;
- Unidade;
- Preço;
- Estoque mínimo.

Cada lote registra:

- Produto relacionado;
- Data de fabricação;
- Data de validade;
- Quantidade inicial;
- Quantidade disponível;
- Responsável pela entrada.

Essa separação permite acompanhar com maior precisão a origem e a situação dos produtos disponíveis.

## ⏳ Controle de validade

Os lotes são classificados de acordo com sua data de validade:

| Situação | Período |
| --- | --- |
| 🔴 **Vencido** | Data de validade anterior ao dia atual |
| 🟠 **Urgente** | De 0 a 2 dias |
| 🟡 **A vencer** | De 3 a 5 dias |
| 🟢 **Em dia** | Mais de 5 dias |

Produtos vencidos não ficam disponíveis para venda.

## 🛒 Registro de vendas

Durante uma venda, o usuário seleciona os produtos e suas respectivas quantidades.

O sistema registra:

- Produtos vendidos;
- Quantidades;
- Preço praticado;
- Valor total;
- Vendedor responsável;
- Forma de pagamento;
- Data e horário da operação.

A retirada do estoque utiliza os **lotes elegíveis com fabricação mais antiga**, seguindo o princípio PEPS (*Primeiro que Entra, Primeiro que Sai*).

Caso um lote não seja suficiente para atender toda a quantidade solicitada, a venda pode utilizar unidades de outros lotes disponíveis do mesmo produto.

## 🗑️ Descarte de produtos

O sistema permite registrar o descarte do saldo restante de um lote quando necessário.

O descarte armazena informações como:

- Quantidade descartada;
- Motivo;
- Observação;
- Usuário responsável;
- Data e horário.

O lote permanece registrado no sistema para preservar o histórico e a rastreabilidade das movimentações.

## 📊 Histórico e indicadores

O Doce Sabor disponibiliza informações para acompanhamento da operação, incluindo:

- Histórico de vendas;
- Detalhamento dos itens vendidos;
- Movimentações de estoque;
- Produtos próximos do vencimento;
- Produtos com estoque baixo;
- Faturamento;
- Unidades vendidas;
- Desperdício.

## 🔐 Segurança

O sistema possui mecanismos para proteção das contas e das operações realizadas.

Entre eles estão:

- Senhas armazenadas com hash;
- Controle de sessões;
- Limitação de tentativas de login;
- Bloqueio temporário após tentativas inválidas;
- Troca obrigatória da senha inicial;
- Controle de permissões;
- Validação das operações no servidor;
- Proteção CSRF;
- Validação dos dados recebidos.

## 🛠️ Tecnologias utilizadas

### Front-end

- HTML5
- CSS3
- JavaScript

### Back-end

- PHP
- Laravel

### Banco de dados

- MySQL / MariaDB

### Ferramentas

- Composer
- Git
- GitHub
- XAMPP
- Railway

## 🏗️ Arquitetura

O navegador utiliza a interface desenvolvida em HTML, CSS e JavaScript para realizar as operações.

As requisições são processadas pela API desenvolvida com **PHP e Laravel**, responsável pelas regras de negócio, autenticação, permissões e comunicação com o banco de dados.

```text
Interface
HTML / CSS / JavaScript
        │
        ▼
API
PHP / Laravel
        │
        ▼
Banco de Dados
MySQL
```

## 📂 Estrutura do projeto

```text
app/                    Lógica da aplicação
bootstrap/              Inicialização do Laravel
config/                 Configurações
database/               Migrations e estrutura do banco
docs/                   Documentação do projeto
lang/                   Mensagens em português
public/                 Interface do sistema
routes/                 Rotas da aplicação
storage/                Arquivos utilizados pelo Laravel
artisan                  Console do Laravel
composer.json           Dependências PHP
.env.example            Modelo das variáveis de ambiente
```

## 🚀 Executando o projeto

Clone o repositório:

```bash
git clone URL-DO-REPOSITORIO
cd doce-sabor
```

Instale as dependências:

```bash
composer install
```

Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

Gere a chave da aplicação:

```bash
php artisan key:generate
```

Configure o banco de dados no `.env` e execute:

```bash
php artisan migrate --seed
```

Inicie o servidor:

```bash
php artisan serve
```

Depois, acesse:

```text
http://localhost:8000
```

## 🎓 Projeto acadêmico

Projeto desenvolvido como **Trabalho de Conclusão de Curso (TCC)** do curso de **Desenvolvimento de Sistemas**.

### Autoras

- Beatriz Miranda Mantovani
- Julia Tiemi Akiyoshi Zacaro
- Kathleen Kaianne Soares
- Maria Clara Zimaro Vieira

---

<p align="center">
  <strong>Doce Sabor 🍰</strong><br>
  Sistema de Gestão de Estoque e Vendas
</p>