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