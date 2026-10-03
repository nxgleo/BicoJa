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
| **Back-End** | Next.js App Router em servidor Node.js customizado, Socket.IO | APIs HTTP e comunicação em tempo real inicializada por `server.js`. |
| **Banco de Dados** | PostgreSQL + PostGIS | Persistência relacional e suporte a consultas espaciais/geográficas. |
| **Cache & Filas** | Redis (`ioredis`) | Cache da listagem de serviços e rate limiting por IP em rotas selecionadas. |
| **Autenticação** | NextAuth.js (com Credentials + JWT) | Gestão de acesso, contas e sessões de usuários. |
| **APIs Externas** | OpenStreetMap Nominatim, Mercado Pago e Web Push API | Geocodificação de endereços via Nominatim; Mercado Pago ainda simulado localmente. |

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
  pushSubscriptions   PushSubscription[]
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

model PushSubscription {
  id        String   @id @default(uuid())
  endpoint  String   @unique
  keys      Json
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}
```

### Prisma/migrations/20261003190724_add_push_subscriptions/migration.sql
```sql
-- DropForeignKey
ALTER TABLE "Servico" DROP CONSTRAINT "Servico_clienteId_fkey";
ALTER TABLE "Servico" DROP CONSTRAINT "Servico_prestadorId_fkey";

-- AlterTable
ALTER TABLE "Servico" ALTER COLUMN "clienteId" DROP NOT NULL,
ALTER COLUMN "prestadorId" SET NOT NULL;

-- CreateTable
CREATE TABLE "PushSubscription" (
  "id" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "keys" JSONB NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_prestadorId_fkey" FOREIGN KEY ("prestadorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## 4: Estrutura de pastas:

bicoja-projeto/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── notificacoes/
│   │   │   ├── inscrever/
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── pagamentos/
│   │   │   └── simular/
│   │   │       └── route.ts
│   │   ├── propostas/
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   └── route.ts
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
│   ├── maps.ts
│   ├── payments.ts
│   ├── prisma.ts
│   ├── rate-limit.ts
│   ├── redis.ts
│   ├── socket.ts
│   └── web-push.ts
├── Prisma/
│   ├── migrations/
│   │   └── 20261003190724_add_push_subscriptions/
│   │       └── migration.sql
│   └── schema.prisma
├── public/
│   └── sw.js
├── .env
├── .gitignore
├── docker-compose.yml
├── index.js
├── next-env.d.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── server.js
└── tsconfig.json


### Scripts do package.json
```json
{
  "dev": "node server.js",
  "build": "next build",
  "start": "NODE_ENV=production node server.js",
  "lint": "next lint",
  "postinstall": "prisma generate"
}
```
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
import { redis } from "@/lib/redis";
import { checkRateLimit } from "@/lib/rate-limit";
import { geocodeEndereco } from "@/lib/maps";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rate = await checkRateLimit(`post_servicos:${ip}`);

    if (!rate.success) {
      return NextResponse.json(
        { success: false, data: null, error: "Limite de requisições excedido. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const body = await req.json();
    let {
      titulo,
      descricao,
      preco,
      latitude,
      longitude,
      endereco,
      prestadorId,
      clienteId,
    } = body;

    if ((latitude === undefined || longitude === undefined) && endereco) {
      const coords = await geocodeEndereco(endereco);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      } else {
        return NextResponse.json(
          { success: false, data: null, error: "Não foi possível obter coordenadas para este endereço." },
          { status: 400 }
        );
      }
    }

    if (
      !titulo ||
      !descricao ||
      preco === undefined ||
      latitude === undefined ||
      longitude === undefined ||
      !prestadorId
    ) {
      return NextResponse.json(
        { success: false, data: null, error: "Todos os campos obrigatórios (ou endereço válido) devem ser enviados." },
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

    const latFloat = parseFloat(latitude);
    const lngFloat = parseFloat(longitude);

    const novoServico = await prisma.servico.create({
      data: {
        titulo,
        descricao,
        preco: parseFloat(preco),
        latitude: latFloat,
        longitude: lngFloat,
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

    await prisma.$executeRaw`
      UPDATE "Servico"
      SET localizacao = ST_SetSRID(ST_MakePoint(${lngFloat}, ${latFloat}), 4326)
      WHERE id = ${novoServico.id};
    `;

    await redis.del("servicos:all");

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

export async function GET(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rate = await checkRateLimit(`get_servicos:${ip}`);

    if (!rate.success) {
      return NextResponse.json(
        { success: false, data: null, error: "Limite de requisições excedido. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const raio = searchParams.get("raio");

    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const raioMetros = parseFloat(raio || "10") * 1000;

      const cacheKey = `servicos:geo:${lat}:${lng}:${raio || 10}`;
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        return NextResponse.json(
          { success: true, data: JSON.parse(cachedData), error: null },
          { status: 200 }
        );
      }

      const servicosProximos: any[] = await prisma.$queryRaw`
        SELECT
          s.id, s.titulo, s.descricao, s.preco, s.latitude, s.longitude, s."createdAt",
          ST_Distance(
            s.localizacao::geography,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
          ) / 1000 AS "distanciaKm",
          json_build_object(
            'id', u.id,
            'nome', u.nome,
            'email', u.email,
            'telefone', u.telefone
          ) AS prestador
        FROM "Servico" s
        JOIN "User" u ON s."prestadorId" = u.id
        WHERE ST_DWithin(
          s.localizacao::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          ${raioMetros}
        )
        ORDER BY "distanciaKm" ASC;
      `;

      await redis.set(cacheKey, JSON.stringify(servicosProximos), "EX", 60);

      return NextResponse.json(
        { success: true, data: servicosProximos, error: null },
        { status: 200 }
      );
    }

    const cacheKey = "servicos:all";
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return NextResponse.json(
        { success: true, data: JSON.parse(cachedData), error: null },
        { status: 200 }
      );
    }

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

    await redis.set(cacheKey, JSON.stringify(servicos), "EX", 60);

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

### lib/maps.ts
```typescript
export interface Coordenadas {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
}

export async function geocodeEndereco(endereco: string): Promise<Coordenadas | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&countrycodes=br&limit=1`,
      {
        headers: {
          "User-Agent": "BicoJaApp/1.0 (contato@bicoja.com.br)",
        },
      }
    );

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        formattedAddress: data[0].display_name,
      };
    }

    return null;
  } catch (error) {
    console.error("Erro na geocodificação via Nominatim:", error);
    return null;
  }
}
```

### servicos/[id]/route.ts (GET, PUT e DELETE)
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    await redis.del("servicos:all");
    await redis.del(`servico:${id}`);

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    await redis.del("servicos:all");
    await redis.del(`servico:${id}`);

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

### propostas/route.ts (GET e POST)
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rate = await checkRateLimit(`post_propostas:${ip}`);

    if (!rate.success) {
      return NextResponse.json(
        { success: false, data: null, error: "Limite de requisições excedido." },
        { status: 429 }
      );
    }

    const { valor, mensagem, servicoId, prestadorId } = await req.json();

    if (!valor || !servicoId || !prestadorId) {
      return NextResponse.json(
        { success: false, data: null, error: "Valor, serviço e prestador são obrigatórios." },
        { status: 400 }
      );
    }

    const servico = await prisma.servico.findUnique({
      where: { id: servicoId },
    });

    if (!servico) {
      return NextResponse.json(
        { success: false, data: null, error: "Serviço não encontrado." },
        { status: 404 }
      );
    }

    const prestador = await prisma.user.findUnique({
      where: { id: prestadorId },
    });

    if (!prestador) {
      return NextResponse.json(
        { success: false, data: null, error: "Prestador não encontrado." },
        { status: 404 }
      );
    }

    const novaProposta = await prisma.proposta.create({
      data: {
        valor: parseFloat(valor),
        mensagem,
        servico: { connect: { id: servicoId } },
        prestador: { connect: { id: prestadorId } },
      },
      include: {
        prestador: {
          select: { id: true, nome: true, email: true, telefone: true },
        },
      },
    });

    await redis.del(`servico:${servicoId}`);

    return NextResponse.json(
      { success: true, data: novaProposta, error: null },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, data: null, error: "Erro interno ao enviar proposta." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const servicoId = searchParams.get("servicoId");
    const prestadorId = searchParams.get("prestadorId");

    const propostas = await prisma.proposta.findMany({
      where: {
        ...(servicoId ? { servicoId } : {}),
        ...(prestadorId ? { prestadorId } : {}),
      },
      include: {
        servico: true,
        prestador: {
          select: { id: true, nome: true, email: true, telefone: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { success: true, data: propostas, error: null },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, data: null, error: "Erro interno ao buscar propostas." },
      { status: 500 }
    );
  }
}
```

### propostas/[id]/route.ts (PATCH)
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { sendPushNotification } from "@/lib/web-push";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!status || !["ACEITA", "RECUSADA"].includes(status)) {
      return NextResponse.json(
        { success: false, data: null, error: "Status inválido. Use ACEITA ou RECUSADA." },
        { status: 400 }
      );
    }

    const propostaExistente = await prisma.proposta.findUnique({
      where: { id },
      include: { servico: true },
    });

    if (!propostaExistente) {
      return NextResponse.json(
        { success: false, data: null, error: "Proposta não encontrada." },
        { status: 404 }
      );
    }

    const propostaAtualizada = await prisma.proposta.update({
      where: { id },
      data: { status },
    });

    if (status === "ACEITA") {
      await prisma.servico.update({
        where: { id: propostaExistente.servicoId },
        data: { clienteId: propostaExistente.prestadorId },
      });

      await prisma.proposta.updateMany({
        where: {
          servicoId: propostaExistente.servicoId,
          id: { not: id },
        },
        data: { status: "RECUSADA" },
      });
    }

    await redis.del("servicos:all");
    await redis.del(`servico:${propostaExistente.servicoId}`);

    if ((global as any).io) {
      (global as any).io.to(propostaExistente.prestadorId).emit("status-proposta", {
        propostaId: id,
        status,
      });
    }

    const pushSub = await prisma.pushSubscription.findFirst({
      where: { userId: propostaExistente.prestadorId },
    });

    if (pushSub) {
      await sendPushNotification(
        {
          endpoint: pushSub.endpoint,
          keys: pushSub.keys as any,
        },
        {
          title: `Sua proposta foi ${status.toLowerCase()}!`,
          body: `Sua proposta para o serviço "${propostaExistente.servico.titulo}" foi ${status.toLowerCase()}.`,
          url: `/servicos/${propostaExistente.servicoId}`,
        }
      );
    }

    return NextResponse.json(
      { success: true, data: propostaAtualizada, error: null },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, data: null, error: "Erro interno ao atualizar proposta." },
      { status: 500 }
    );
  }
}
```

### pagamentos/simular/route.ts (POST)
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { checkRateLimit } from "@/lib/rate-limit";
import { processarPagamentoSimulado } from "@/lib/payments";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rate = await checkRateLimit(`post_pagamento:${ip}`);

    if (!rate.success) {
      return NextResponse.json(
        { success: false, data: null, error: "Limite de requisições excedido." },
        { status: 429 }
      );
    }

    const { propostaId, metodoPagamento } = await req.json();

    if (!propostaId) {
      return NextResponse.json(
        { success: false, data: null, error: "O ID da proposta é obrigatório." },
        { status: 400 }
      );
    }

    const proposta = await prisma.proposta.findUnique({
      where: { id: propostaId },
      include: { servico: true },
    });

    if (!proposta) {
      return NextResponse.json(
        { success: false, data: null, error: "Proposta não encontrada." },
        { status: 404 }
      );
    }

    if (proposta.status !== "ACEITA") {
      return NextResponse.json(
        { success: false, data: null, error: "Apenas propostas aceitas podem ser pagas." },
        { status: 400 }
      );
    }

    const resultadoPagamento = await processarPagamentoSimulado({
      propostaId,
      valor: proposta.valor,
      metodoPagamento: metodoPagamento || "PIX_SIMULADO",
    });

    await redis.del("servicos:all");
    await redis.del(`servico:${proposta.servicoId}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          transacaoId: resultadoPagamento.transacaoId,
          statusPagamento: resultadoPagamento.status,
          propostaId: proposta.id,
          valorPago: proposta.valor,
        },
        error: null,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, data: null, error: "Erro interno ao processar pagamento simulado." },
      { status: 500 }
    );
  }
}
```

### notificacoes/route.ts (POST)
```typescript
import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/web-push";

export async function POST(req: Request) {
  try {
    const { userId, title, message, url, subscription } = await req.json();

    if (!userId || !title || !message) {
      return NextResponse.json(
        { success: false, data: null, error: "userId, title e message são obrigatórios." },
        { status: 400 }
      );
    }

    // Se houver uma assinatura Web Push ativa, envia a notificação
    if (subscription) {
      await sendPushNotification(subscription, {
        title,
        body: message,
        url: url || "/",
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          enviado: true,
          destinatarioId: userId,
          mensagem: message,
        },
        error: null,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, data: null, error: "Erro interno ao enviar notificação." },
      { status: 500 }
    );
  }
}
```

### notificacoes/inscrever/route.ts (POST)
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId, subscription } = await req.json();

    if (!userId || !subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { success: false, data: null, error: "userId e dados de subscription são obrigatórios." },
        { status: 400 }
      );
    }

    const pushSub = await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        keys: subscription.keys,
        userId,
      },
      create: {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userId,
      },
    });

    return NextResponse.json(
      { success: true, data: pushSub, error: null },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, data: null, error: "Erro ao salvar assinatura de notificação." },
      { status: 500 }
    );
  }
}
```

### server.js (servidor Next.js e Socket.IO)
```javascript
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/api/socket/io",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join-room", (userId) => {
      if (userId) {
        socket.join(userId);
      }
    });

    socket.on("disconnect", () => {});
  });

  global.io = io;

  httpServer.listen(port, () => {
    console.log(`> Servidor rodando em http://${hostname}:${port}`);
  });
});
```

### app/providers.tsx
```typescript
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io as ClientIO, Socket } from "socket.io-client";
import { SessionProvider, useSession } from "next-auth/react";

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function SocketAndPushProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;

  useEffect(() => {
    const socketInstance = ClientIO(process.env.NEXT_PUBLIC_SITE_URL || "", {
      path: "/api/socket/io",
      addTrailingSlash: false,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
      if (userId) {
        socketInstance.emit("join-room", userId);
      }
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    async function registerPush() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (!publicVapidKey) return;

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
          });
        }

        await fetch("/api/notificacoes/inscrever", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, subscription }),
        });
      } catch (error) {
        console.error("Erro ao registrar Push Notification:", error);
      }
    }

    registerPush();
  }, [userId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SocketAndPushProvider>{children}</SocketAndPushProvider>
    </SessionProvider>
  );
}
```

### public/sw.js
```javascript
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || "Você tem uma nova atualização no BicoJá.",
    icon: "/favicon.ico",
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "BicoJá", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
```

### lib/socket.ts (helper)
```typescript
import { Server as NetServer } from "http";
import { Server as ServerIO } from "socket.io";

export type NextApiResponseServerIO = {
  socket: {
    server: NetServer & {
      io?: ServerIO;
    };
  };
};

export const initSocket = (server: NetServer) => {
  if (!server) return null;

  const io = new ServerIO(server, {
    path: "/api/socket/io",
    addTrailingSlash: false,
  });

  io.on("connection", (socket) => {
    socket.on("join-room", (userId: string) => {
      socket.join(userId);
    });

    socket.on("disconnect", () => {
      // Conexão encerrada
    });
  });

  return io;
};
```

### Web Push (lib/web-push.ts)
```typescript
import webpush from "web-push";

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || "";

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    "mailto:suporte@bicoja.com.br",
    publicVapidKey,
    privateVapidKey
  );
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: PushNotificationPayload
) {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}
```

### Redis e proteção contra excesso de requisições

#### lib/redis.ts
```typescript
import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl);

redis.on("error", (err) => {
  console.error("Erro na conexão com Redis:", err);
});
```

#### lib/rate-limit.ts
```typescript
import { redis } from "./redis";

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
}

export async function checkRateLimit(
  identifier: string,
  limit = 100,
  windowInSeconds = 60
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const currentRequests = await redis.incr(key);

  if (currentRequests === 1) {
    await redis.expire(key, windowInSeconds);
  }

  const remaining = Math.max(0, limit - currentRequests);
  const success = currentRequests <= limit;

  return { success, limit, remaining };
}
```

#### lib/payments.ts
```typescript
export interface PaymentInput {
  propostaId: string;
  valor: number;
  metodoPagamento?: string;
}

export interface PaymentResult {
  sucesso: boolean;
  transacaoId: string;
  status: "APROVADO" | "RECUSADO";
  mensagem: string;
}

export async function processarPagamentoSimulado(
  dados: PaymentInput
): Promise<PaymentResult> {
  const transacaoId = `MOCK_TX_${Date.now()}`;

  return {
    sucesso: true,
    transacaoId,
    status: "APROVADO",
    mensagem: "Pagamento simulado processado com sucesso.",
  };
}
```

---

## 6 Regras de negócio
>[!IMPORTANT]
>Estas diretrizes determinam o funcionamento operacional da plataforma e devem ser respeitadas em todos os novos controllers.

>Geolocalização: A busca de serviços por proximidade deve priorizar os registros dentro do raio de distância informado, utilizando cálculos espaciais via PostGIS[cite: 3].

>Contratação de Serviços: Somente usuários cadastrados com informações obrigatórias completas podem criar solicitações de serviço.

>Rate Limiting: A meta do projeto é limitar chamadas a no máximo 100 requisições por minuto por usuário/IP via Redis. Atualmente, a verificação está aplicada somente às rotas `GET` e `POST /api/servicos`, `POST /api/propostas` e `POST /api/pagamentos/simular`; portanto, ainda não é global. O identificador usado pelos handlers é o IP obtido de `x-forwarded-for`.

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

### Erro (HTTP 400, 404, 429, 500):
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

[x] Geocodificação de endereço via Nominatim em `POST /api/servicos` quando coordenadas não forem enviadas.

[x] Consulta de serviços por proximidade em `GET /api/servicos?lat=...&lng=...&raio=...`, usando PostGIS e distância em quilômetros.

[/] Etapa 5: Rate limiting e cache com Redis — implementados parcialmente.

[x] Rate limiting por IP em `GET` e `POST /api/servicos` e `POST /api/pagamentos/simular`.

[x] Cache Redis de 60 segundos para `GET /api/servicos` e invalidação de chaves em rotas de escrita relacionadas.

[/] Etapa 6: Sistema de propostas e contratação — criação, listagem e atualização de status implementadas.

[/] Etapa 7: Pagamentos — endpoint de simulação implementado; integração com Mercado Pago pendente.

[/] Etapa 8: Notificações via Web Push e Socket.IO — integração aplicada ao ciclo de propostas.

[x] Helper Web Push com configuração VAPID por variáveis de ambiente e rota `POST /api/notificacoes`.

[x] `server.js` inicializa Socket.IO; `app/providers.tsx` conecta o cliente e entra na sala do usuário.

[x] `public/sw.js`, registro da assinatura no cliente, endpoint `POST /api/notificacoes/inscrever` e persistência no model `PushSubscription`.

[x] O PATCH de `app/api/propostas/[id]/route.ts` emite `status-proposta` na sala do prestador e envia Web Push para a assinatura salva.