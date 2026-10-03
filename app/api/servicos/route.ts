import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { checkRateLimit } from "@/lib/rate-limit";
import { geocodeEndereco } from "@/lib/maps";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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

    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json(
        { success: false, data: null, error: "Não autorizado." },
        { status: 401 }
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

    if (prestadorId !== (session.user as any).id && clienteId !== (session.user as any).id) {
      return NextResponse.json(
        { success: false, data: null, error: "Acesso negado." },
        { status: 403 }
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

    const novoServico = await prisma.$transaction(async (tx) => {
      const servico = await tx.servico.create({
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

      await tx.$executeRaw`
        UPDATE "Servico"
        SET localizacao = ST_SetSRID(ST_MakePoint(${lngFloat}, ${latFloat}), 4326)
        WHERE id = ${servico.id};
      `;
      
      return servico;
    });

    await redis.del("servicos:all");
    const geoKeys = await redis.keys("servicos:geo:*");
    if (geoKeys.length > 0) {
      await redis.del(geoKeys);
    }

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

      const latArredondada = latitude.toFixed(3);
      const lngArredondada = longitude.toFixed(3);
      const cacheKey = `servicos:geo:${latArredondada}:${lngArredondada}:${raio || 10}`;
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
    console.error(error);
    return NextResponse.json(
      { success: false, data: null, error: "Erro interno ao buscar serviços." },
      { status: 500 }
    );
  }
}