import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { checkRateLimit } from "@/lib/rate-limit";

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

    const parsedLat = parseFloat(latitude);
    const parsedLng = parseFloat(longitude);

    const novoServico = await prisma.servico.create({
      data: {
        titulo,
        descricao,
        preco: parseFloat(preco),
        latitude: parsedLat,
        longitude: parsedLng,
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

    // Popula a coluna de geometria Point do PostGIS (SRID 4326: lon, lat)
    await prisma.$executeRaw`
      UPDATE "Servico"
      SET localizacao = ST_SetSRID(ST_MakePoint(${parsedLng}, ${parsedLat}), 4326)
      WHERE id = ${novoServico.id}
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
    const raioKm = searchParams.get("raio");

    // Se os parâmetros de geolocalização foram fornecidos
    if (lat && lng && raioKm) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      const raioMetros = parseFloat(raioKm) * 1000;

      const cacheKey = `servicos:geo:${parsedLat}:${parsedLng}:${raioKm}`;
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        return NextResponse.json(
          { success: true, data: JSON.parse(cachedData), error: null },
          { status: 200 }
        );
      }

      // Consulta espacial via PostGIS
      const servicosProximos = await prisma.$queryRaw`
        SELECT 
          s.id, 
          s.titulo, 
          s.descricao, 
          s.preco, 
          s.latitude, 
          s.longitude, 
          s."createdAt",
          ST_Distance(
            s.localizacao::geography, 
            ST_SetSRID(ST_MakePoint(${parsedLng}, ${parsedLat}), 4326)::geography
          ) / 1000 AS distancia_km,
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
          ST_SetSRID(ST_MakePoint(${parsedLng}, ${parsedLat}), 4326)::geography,
          ${raioMetros}
        )
        ORDER BY distancia_km ASC;
      `;

      await redis.set(cacheKey, JSON.stringify(servicosProximos), "EX", 60);

      return NextResponse.json(
        { success: true, data: servicosProximos, error: null },
        { status: 200 }
      );
    }

    // Caso não forneça lat/lng/raio, retorna a listagem padrão
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