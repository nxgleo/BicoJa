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