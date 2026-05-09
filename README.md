# DuoCal

> **Sincronia é a base de tudo.**

O **DuoCal** é uma aplicação **PWA mobile-first** em desenvolvimento, criada para funcionar como uma agenda compartilhada para casais.  
A proposta é transformar o **“meu horário”** em **“nosso tempo”**, permitindo que duas pessoas organizem juntas compromissos, tarefas, eventos, rotina e notificações em um único espaço colaborativo.

> 🚧 **Projeto em construção**  
> Este repositório ainda está em fase inicial de desenvolvimento. Estrutura, funcionalidades e regras de negócio podem mudar conforme o projeto evolui.

---

## 📱 Sobre o projeto

O DuoCal nasceu com o objetivo de ser uma agenda compartilhada, simples e colaborativa, onde os membros de um mesmo workspace possam:

- Criar eventos para si, para o parceiro(a) ou para o casal;
- Visualizar uma agenda compartilhada;
- Organizar tarefas em formato Kanban;
- Criar categorias para compromissos;
- Receber notificações internas;
- Conectar usuários por token;
- Utilizar a aplicação como PWA no celular.

A aplicação será inicialmente pensada para casais, mas a arquitetura está sendo construída de forma **multi-tenant**, permitindo que futuramente o sistema possa ser utilizado por outros tipos de grupos.

---

## ✨ Conceito

O DuoCal não é apenas uma agenda individual com compartilhamento.

A ideia principal é:

> Uma agenda feita para dois, onde a rotina individual e os momentos do casal são organizados em um único espaço compartilhado.

---

## 🛠️ Tecnologias utilizadas

- **React**
- **TypeScript**
- **Tailwind CSS**
- **Supabase**
- **Supabase Auth**
- **Supabase Database**
- **Row Level Security**
- **TanStack Query**
- **TanStack Router**
- **Vite**
- **PWA**

---

## 🧱 Arquitetura inicial

O projeto está sendo desenvolvido com foco em:

- Mobile-first;
- Visual inspirado em iOS;
- Estrutura PWA;
- Banco com migrations;
- Segurança com RLS;
- Organização por workspace;
- Taxonomia de banco em português;
- Separação entre autenticação e dados da aplicação.

---

## 🔐 Autenticação

A autenticação será feita com **Supabase Auth**.

Além da tabela `auth.users`, o projeto possui uma tabela própria de usuários no banco da aplicação, seguindo o padrão:

```txt
dim_usuario
```

Cada usuário terá:

- UUID próprio;
- vínculo com `auth.users`;
- nome;
- e-mail;
- token de conexão com 6 dígitos;
- controle de perfil completo;
- status ativo/inativo.

---

## 🔗 Conexão entre usuários

Cada usuário terá um **token de conexão de 6 dígitos**.

Esse token será usado para conectar duas pessoas no mesmo workspace.

Exemplo de fluxo:

```txt
1. Usuário A cria sua conta.
2. Usuário A recebe um token de conexão.
3. Usuário B cria sua conta.
4. Usuário B digita o token do Usuário A.
5. Os dois passam a compartilhar o mesmo workspace.
```

---

## 🗂️ Workspace

O workspace representa o espaço compartilhado do casal.

Toda informação operacional do sistema deve estar vinculada a um `workspace_id`.

Exemplos:

```txt
eventos.workspace_id
categorias.workspace_id
notificacoes.workspace_id
tarefas.workspace_id
configuracoes.workspace_id
```

Essa regra existe para garantir que o projeto já nasça preparado para múltiplos casais/grupos.

---

## 📌 Funcionalidades planejadas

### MVP 1 — Base sólida

- Auth com Supabase;
- Criar workspace;
- Conectar usuários por token;
- Configurações básicas do workspace;
- Criar eventos;
- Atribuir evento a um ou mais membros;
- Visualizar agenda compartilhada;
- Criar evento recorrente simples;
- Criar categorias;
- Criar notificações internas;
- Central de notificações;
- PWA instalável.

### MVP 2 — Notificações reais

- Salvar Push Subscription;
- Ativar/desativar notificações por dispositivo;
- Service Worker + Web Push;
- Edge Function para envio;
- Cron para lembretes;
- Logs de envio;
- Preferências por tipo de notificação.

### MVP 3 — Produto compartilhável

- Tema por workspace;
- Nome e slogan por workspace;
- Recursos ativáveis/desativáveis;
- Templates de agenda;
- Mais de dois membros opcional;
- Permissões leves por papel.

---

## 🎨 Direção visual

A interface está sendo desenvolvida com foco em:

- Mobile-first;
- Estilo iOS;
- Visual limpo;
- Cards arredondados;
- Gradientes suaves;
- Tipografia moderna;
- Layout simples e afetivo;
- Experiência fluida para uso diário.

Paleta principal:

```txt
Indigo principal: #5466F1
Violeta: #B66DFF
Gradiente: #5466F1 → #B66DFF
Fundo claro: #F6F7FB
Texto principal: #11144A
Texto secundário: #6B7280
```

---

## 📲 Telas planejadas

- Login;
- Completar perfil;
- Tela inicial sem workspace;
- Dashboard;
- Agenda compartilhada;
- Kanban;
- Notificações;
- Perfil e configurações do workspace;
- Criação de evento.

---

## 🗃️ Padrão de banco

O banco segue uma taxonomia em português, inspirada em padrões dimensionais:

```txt
dim_  → dimensões/cadastros
fato_ → fatos/eventos operacionais
rel_  → relacionamentos
cfg_  → configurações
log_  → logs/auditoria
aux_  → tabelas auxiliares
rpc_  → funções chamadas pelo client
fn_   → funções internas
trg_  → triggers
```

---

## 🔒 Segurança

O projeto utiliza **Row Level Security** desde o início.

Regras principais:

- Usuário só acessa seus próprios dados;
- Usuário só acessa workspaces dos quais é membro;
- Eventos são visíveis apenas dentro do workspace;
- Notificações são vinculadas ao usuário de destino;
- Dados de um workspace não podem vazar para outro;
- Operações sensíveis devem ser feitas por RPCs seguras.

---

## 🧪 Status atual

```txt
🚧 Em desenvolvimento inicial
```

Etapa atual:

- Estrutura inicial do projeto criada;
- Design visual inicial definido;
- Auth e fluxo inicial em desenvolvimento;
- Migrations do banco em construção;
- Login mobile/iOS em implementação;
- PWA sendo configurado.

---

## 🚀 Como rodar o projeto

Clone o repositório:

```bash
git clone <url-do-repositorio>
```

Acesse a pasta:

```bash
cd DuoCal
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env.local` com as variáveis necessárias:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_VERSION=20260508.001
```

Rode o projeto:

```bash
npm run dev
```

---

## 📦 Build

Para gerar o build de produção:

```bash
npm run build
```

Para visualizar o build localmente:

```bash
npm run preview
```

---

## 🧭 Roadmap resumido

```txt
1. Base de Auth e usuários
2. Conexão por token
3. Workspace compartilhado
4. Login mobile/iOS
5. Dashboard inicial
6. Agenda compartilhada
7. Kanban
8. Notificações internas
9. PWA instalável
10. Web Push
```

---

## 📄 Licença

Este projeto está em desenvolvimento pessoal.  
A licença ainda será definida.

---

## 👨‍💻 Autor

Desenvolvido por **Kayo Weiber**.

```txt
DuoCal — Sincronia é a base de tudo.
```
