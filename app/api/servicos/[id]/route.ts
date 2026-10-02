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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const raio = searchParams.get("raio");

    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const raioKm = raio ? parseFloat(raio) : 10;
      const raioMetros = raioKm * 1000;

      const servicosProximos = await prisma.$queryRaw`
        SELECT 
          s.id, 
          s.titulo, 
          s.descricao, 
          s.preco, 
          s.latitude, 
          s.longitude, 
          s."createdAt",
          s."prestadorId",
          ST_DistanceSphere(
            ST_MakePoint(s.longitude, s.latitude),
            ST_MakePoint(${longitude}, ${latitude})
          ) / 1000 AS distancia_km
        FROM "Servico" s
        WHERE ST_DistanceSphere(
          ST_MakePoint(s.longitude, s.latitude),
          ST_MakePoint(${longitude}, ${latitude})
        ) <= ${raioMetros}
        ORDER BY distancia_km ASC
      `;

      return NextResponse.json(
        { success: true, data: servicosProximos, error: null },
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