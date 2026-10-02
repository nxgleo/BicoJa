# CONTEXT.md — Projeto BicoJá

> [!NOTE]
> Documento de contexto e referência central para o desenvolvimento do back-end da plataforma **BicoJá**.

---

## 1. Visão Geral do Projeto

O **BicoJá** é um marketplace de serviços locais construído para otimizar a descoberta e a contratação de trabalhos temporários[cite: 2]. Ele conecta demandas imediatas a profissionais da região com segurança, agilidade e integração nativa com mapas de geolocalização[cite: 2].

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Função Principal |
| :--- | :--- | :--- |
| **Front-End** | Next.js (React), Workbox (PWA), Tailwind CSS | SSR, otimização de SEO, suporte offline e estilização rápida. |
| **Back-End** | Node.js (App Router) | APIs, alta performance e facilidade de integração com WebSockets. |
| **Banco de Dados** | PostgreSQL + PostGIS | Persistência relacional e suporte a consultas espaciais/geográficas. |
| **Cache & Filas** | Redis | Cache de consultas, controle de taxa (rate-limiting) e gestão de sessões. |
| **Autenticação** | NextAuth.js (com Credentials + JWT) | Gestão de acesso, contas e sessões de usuários. |
| **APIs Externas** | Google Maps Platform, Mercado Pago, Web Push API | Geolocalização, processamento de pagamentos e notificações. |

---

## 3. Modelagem do Banco de Dados (`schema.prisma`)

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

enum Role {
  CONTRATANTE
  PRESTADOR
  AMBOS
}

enum StatusProposta {
  PENDENTE
  ACEITA
  RECUSADA
}

model User {
  id            String    @id @default(uuid())
  nome          String?
  email         String?   @unique
  emailVerified DateTime?
  senha         String?
  telefone      String?
  image         String?
  role          Role      @default(CONTRATANTE)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts Account[]
  sessions Session[]

  servicosContratados Servico[]  @relation("ClienteServicos")
  servicosOferecidos  Servico[]  @relation("PrestadorServicos")
  propostas           Proposta[] @relation("PrestadorPropostas")
}

model Account {
  id                String  @id @default(uuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(uuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Servico {
  id        String   @id @default(uuid())
  titulo    String
  descricao String
  preco     Float

  latitude  Float
  longitude Float
  localizacao Unsupported("geometry(Point, 4326)")?

  createdAt DateTime @default(now())

  clienteId String?
  cliente   User?   @relation("ClienteServicos", fields: [clienteId], references: [id])

  prestadorId String
  prestador   User    @relation("PrestadorServicos", fields: [prestadorId], references: [id])

  propostas Proposta[]
}

model Proposta {
  id        String         @id @default(uuid())
  valor     Float
  mensagem  String?
  status    StatusProposta @default(PENDENTE)
  createdAt DateTime       @default(now())

  servicoId String
  servico   Servico @relation(fields: [servicoId], references: [id], onDelete: Cascade)

  prestadorId String
  prestador   User    @relation("PrestadorPropostas", fields: [prestadorId], references: [id])
}
```

---

## 4: Estrutura de pastas:

bicoja-projeto/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── register/
│   │   │   └── route.ts
│   │   └── servicos/
│   │       ├── route.ts
│   │       └── [id]/
│   │           └── route.ts
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
├── lib/
│   └── prisma.ts
├── Prisma/
│   ├── migrations/
│   └── schema.prisma
├── public/
├── .env
├── .gitignore
├── docker-compose.yml
├── index.js
├── next-env.d.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
└── tsconfig.json

---

## 5 Rotas e Endpoints:

### auth/[...nextauth]/route.ts
```typescript
import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.senha) return null;

        const isValid = await bcrypt.compare(credentials.password, user.senha);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.nome,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

### register/route.ts (POST)
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { nome, email, senha, telefone, role } = await req.json();

    if (!email || !senha || !nome) {
      return NextResponse.json(
        { success: false, data: null, error: "Nome, email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return NextResponse.json(
        { success: false, data: null, error: "Email já cadastrado" },
        { status: 400 }
      );
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const user = await prisma.user.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        telefone,
        role: role || "CONTRATANTE",
      },
    });

    return NextResponse.json(
      { success: true, data: { userId: user.id }, error: null },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, data: null, error: "Erro interno ao criar utilizador" },
      { status: 500 }
    );
  }
}
```

### servicos/route.ts (GET e POST)
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      titulo,
      descricao,
      preco,
      latitude,
      longitude,
      prestadorId,
      clienteId,
    } = body;

    if (
      !titulo ||
      !descricao ||
      preco === undefined ||
      latitude === undefined ||
      longitude === undefined ||
      !prestadorId
    ) {
      return NextResponse.json(
        { success: false, data: null, error: "Todos os campos obrigatórios devem ser enviados." },
        { status: 400 }
      );
    }

    const prestadorExists = await prisma.user.findUnique({
      where: { id: prestadorId },
    });

    if (!prestadorExists) {
      return NextResponse.json(
        { success: false, data: null, error: "Prestador não encontrado." },
        { status: 404 }
      );
    }

    const novoServico = await prisma.servico.create({
      data: {
        titulo,
        descricao,
        preco: parseFloat(preco),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        prestador: {
          connect: { id: prestadorId },
        },
        ...(clienteId
          ? {
              cliente: {
                connect: { id: clienteId },
              },
            }
          : {}),
      },
    });

    return NextResponse.json(
      { success: true, data: novoServico, error: null },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, data: null, error: "Erro interno ao cadastrar serviço." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const servicos = await prisma.servico.findMany({
      include: {
        prestador: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      { success: true, data: servicos, error: null },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, data: null, error: "Erro interno ao buscar serviços." },
      { status: 500 }
    );
  }
}
```

### servicos/[id]/route.ts (GET, PUT e DELETE)
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const servico = await prisma.servico.findUnique({
      where: { id },
      include: {
        prestador: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
          },
        },
        cliente: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
          },
        },
      },
    });

    if (!servico) {
      return NextResponse.json(
        { success: false, data: null, error: "Serviço não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: servico, error: null },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, data: null, error: "Erro interno ao buscar o serviço." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { titulo, descricao, preco, latitude, longitude } = body;

    const servicoExists = await prisma.servico.findUnique({
      where: { id },
    });

    if (!servicoExists) {
      return NextResponse.json(
        { success: false, data: null, error: "Serviço não encontrado." },
        { status: 404 }
      );
    }

    const servicoAtualizado = await prisma.servico.update({
      where: { id },
      data: {
        ...(titulo && { titulo }),
        ...(descricao && { descricao }),
        ...(preco !== undefined && { preco: parseFloat(preco) }),
        ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
        ...(longitude !== undefined && { longitude: parseFloat(longitude) }),
      },
    });

    return NextResponse.json(
      { success: true, data: servicoAtualizado, error: null },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, data: null, error: "Erro interno ao atualizar o serviço." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const servicoExists = await prisma.servico.findUnique({
      where: { id },
    });

    if (!servicoExists) {
      return NextResponse.json(
        { success: false, data: null, error: "Serviço não encontrado." },
        { status: 404 }
      );
    }

    await prisma.servico.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true, data: { message: "Serviço removido com sucesso." }, error: null },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, data: null, error: "Erro interno ao remover o serviço." },
      { status: 500 }
    );
  }
}
```

---

## 6 Regras de negócio
>[!IMPORTANT]
>Estas diretrizes determinam o funcionamento operacional da plataforma e devem ser respeitadas em todos os novos controllers.

>Geolocalização: A busca de serviços por proximidade deve priorizar os registros dentro do raio de distância informado, utilizando cálculos espaciais via PostGIS[cite: 3].

>Contratação de Serviços: Somente usuários cadastrados com informações obrigatórias completas podem criar solicitações de serviço.

>Rate Limiting: A taxa limite global para chamadas de API é de no máximo 100 requisições por minuto por usuário/IP, gerenciada via Redis[cite: 3].

---

## 7 Padronização de Respostas da API
Todas as rotas da API devem retornar JSON no formato padronizado abaixo:

### Sucesso (HTTP 200, 201):
```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "titulo": "Serviço de Exemplo"
  },
  "error": null
}
```

### Erro (HTTP 400, 404, 500):
```json
{
  "success": false,
  "data": null,
  "error": "Descrição clara e objetiva do erro ocorrido."
}
```

---

## 8 Roadmap & Progresso
[x] Etapa 1: Configuração do ambiente e contêineres Docker (PostgreSQL + PostGIS + Redis).

[x] Etapa 2: Modelagem e inicialização do banco de dados com Prisma ORM.

[x] Etapa 3: Configuração da autenticação via NextAuth.js e rota de registro de usuários.

[/] Etapa 4: Módulo de Serviços (API de Serviços) — EM ANDAMENTO

[x] Criação de serviço (POST /api/servicos)

[x] Listagem geral de serviços (GET /api/servicos)

[x] Rota dinâmica por ID (GET /api/servicos/[id])

[x] Atualização e remoção de serviço (PUT e DELETE /api/servicos/[id])

[ ] Consulta de geolocalização por proximidade (raio em km usando PostGIS)[cite: 3].

[ ] Etapa 5: Controle de limites (Rate-limiting) e cache com Redis[cite: 3].

[ ] Etapa 6: Sistema de propostas e contratação.

[ ] Etapa 7: Integração de pagamentos com Mercado Pago API[cite: 3].

[ ] Etapa 8: Notificações instantâneas via Web Push e WebSockets[cite: 3].