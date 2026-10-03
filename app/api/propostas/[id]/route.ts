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