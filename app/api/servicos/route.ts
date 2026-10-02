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
        { error: "Todos os campos obrigatórios devem ser enviados." },
        { status: 400 }
      );
    }

    const prestadorExists = await prisma.user.findUnique({
      where: { id: prestadorId },
    });

    if (!prestadorExists) {
      return NextResponse.json(
        { error: "Prestador não encontrado." },
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

    return NextResponse.json(novoServico, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro interno ao cadastrar serviço." },
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

    return NextResponse.json(servicos, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno ao buscar serviços." },
      { status: 500 }
    );
  }
}