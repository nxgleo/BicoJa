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