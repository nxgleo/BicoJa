<div align="center">

# 🛠️ BicoJá

### Marketplace de Serviços Locais

*Conectando contratantes e prestadores de serviços com tecnologia, agilidade e segurança.*

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL+PostGIS-16-336791?logo=postgresql)](https://postgis.net/)
[![Redis](https://img.shields.io/badge/Redis-ioredis-DC382D?logo=redis)](https://redis.io/)
[![License](https://img.shields.io/badge/Licença-Educacional-green)](#-licença)

</div>

---

## 📖 Sobre o Projeto

**BicoJá** é uma plataforma PWA desenvolvida para otimizar a descoberta, negociação e contratação de trabalhos temporários e serviços autônomos locais. O projeto conecta contratantes e prestadores de serviços em tempo real, combinando:

- 🗺️ Busca por **proximidade geográfica**
- 💬 **Chat interativo** com suporte a propostas e fotos
- 🔒 **Confirmação segura** via código de verificação
- 📲 **Notificações push** nativas e funcionamento offline (PWA)

---

## 👥 Integrantes do Projeto

| Nome | Matrícula |
|------|-----------|
| Denilzo Kazuo T. Da Pureza | `04178647` |
| Leonardo Moraes Nogueira | `04178661` |

---

## 🚀 Funcionalidades Principais

| # | Funcionalidade | Descrição |
|---|---------------|-----------|
| 1 | 👤 **Perfil Multiuso** | Troca simplificada entre os modos *Contratante* e *Prestador* em uma mesma conta |
| 2 | 📍 **Geolocalização** | Busca de serviços por proximidade via **PostGIS** + OpenStreetMap / Nominatim |
| 3 | 💬 **Chat em Tempo Real** | Comunicação direta integrada com **Socket.IO** (mensagens, propostas e fotos) |
| 4 | 🔒 **Conclusão Segura** | Código de verificação de 4 dígitos para liberação segura do serviço / pagamento |
| 5 | 📲 **PWA & Push** | Suporte offline via *Service Workers* (Workbox) e notificações via *Web Push API* |
| 6 | ♿ **Acessibilidade** | Interface inclusiva com alto contraste, leitores de tela e navegação por teclado (auditada com `axe`) |

---

## 💻 Stack Tecnológica

### 🖥️ Front-End & PWA

| Tecnologia | Uso |
|-----------|-----|
| **Next.js (App Router)** + **React** | Renderização híbrida (SSR/Client) e roteamento moderno |
| **TypeScript** | Tipagem estática em todo o projeto |
| **Tailwind CSS** | Estilização responsiva e acessível |
| **Workbox + Web Push API** | Cache offline, Service Workers e notificações push |
| **Leaflet / OpenStreetMap** | Renderização visual interativa de mapas |

### ⚙️ Back-End & Infraestrutura

| Tecnologia | Uso |
|-----------|-----|
| **Node.js + server.js** | Servidor customizado com integração nativa Socket.IO |
| **PostgreSQL + PostGIS** | Banco relacional com suporte a consultas geoespaciais |
| **Prisma ORM** | Mapeamento objeto-relacional e gerenciamento de migrações |
| **Redis (`ioredis`)** | Cache de consultas frequentes e *rate-limiting* |
| **NextAuth.js** | Autenticação via JWT e Credentials |
| **Docker + Docker Compose** | Conteinerização dos serviços de banco e cache |

---

## 📁 Estrutura do Repositório

```text
bicoja-projeto/
├── app/                      # Rotas e páginas (Next.js App Router)
│   ├── (app)/                # Telas autenticadas: feed, busca, chat, perfil
│   ├── (conta)/              # Telas de login e cadastro
│   └── api/                  # Endpoints REST (auth, serviços, propostas, etc.)
├── components/               # Componentes reutilizáveis da interface
├── docs/                     # Documentação de arquitetura e decisões técnicas
├── lib/                      # Regras de negócio e integrações (Prisma, Redis, Socket)
├── Prisma/                   # Schema do banco de dados e migrações
├── public/                   # Recursos estáticos e Service Worker (sw.js)
├── scripts/                  # Scripts auxiliares (ex: geração de dados de teste)
├── types/                    # Definições de tipos TypeScript
├── .gitignore
├── CONTEXT.md                # Documentação técnica e histórico do projeto
├── docker-compose.yml        # Configuração do PostgreSQL (PostGIS) e Redis
├── middleware.ts             # Proteção de rotas e controle de sessão
├── server.js                 # Servidor customizado Node.js + Socket.IO
└── README.md
```

---

## ⚙️ Como Executar o Projeto Localmente

### Pré-requisitos

> [!IMPORTANT]
> Certifique-se de ter as ferramentas abaixo instaladas antes de prosseguir.

- **Node.js** v18 ou superior
- **Docker** e **Docker Compose**

---

### Passo a Passo

**1. Clonar o repositório**

```bash
git clone https://github.com/nxgleo/BicoJa.git
cd BicoJa
```

**2. Instalar as dependências**

```bash
npm install
```

**3. Configurar as variáveis de ambiente**

Crie um arquivo `.env` na raiz do projeto com base no `.env.example`:

```env
DATABASE_URL="postgresql://admin:123@localhost:5432/banco_servicos?schema=public"
NEXTAUTH_SECRET="sua_chave_secreta_aqui"
NEXTAUTH_URL="http://localhost:3000"
REDIS_URL="redis://localhost:6379"
CONFIRMAR_EMAIL="nao"
```

> [!CAUTION]
> Nunca versione o arquivo `.env` com credenciais reais. Ele já está incluído no `.gitignore`.

**4. Subir os serviços com Docker**

```bash
docker compose up -d
```

Isso inicializará os containers do **PostgreSQL/PostGIS** e do **Redis**.

**5. Executar as migrações do banco de dados**

```bash
npx prisma migrate dev
```

**6. (Opcional) Gerar dados de teste**

```bash
node scripts/dados-teste.mjs
```

**7. Iniciar o servidor de desenvolvimento**

```bash
node server.js
```

> [!NOTE]
> O servidor customizado `server.js` é necessário para o funcionamento correto dos WebSockets via Socket.IO.

---

Acesse a aplicação em: **[http://localhost:3000](http://localhost:3000)**

---

## 📜 Licença

Este projeto foi desenvolvido para fins **educacionais** no contexto de disciplina acadêmica. Todos os direitos reservados aos autores.
