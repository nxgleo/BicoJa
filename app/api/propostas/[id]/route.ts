import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { sendPushNotification } from "@/lib/web-push";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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

    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json(
        { success: false, data: null, error: "Não autorizado." },
        { status: 401 }
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

    if (propostaExistente.servico.prestadorId !== (session.user as any).id) {
      return NextResponse.json(
        { success: false, data: null, error: "Acesso negado. Apenas o criador do serviço pode alterar o status da proposta." },
        { status: 403 }
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

    const pushSubscriptions = await prisma.pushSubscription.findMany({
      where: { userId: propostaExistente.prestadorId },
    });

    const pushResults = await Promise.all(
      pushSubscriptions.map(async (subscription) => {
        const result = await sendPushNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys as any,
          },
          {
            title: `Sua proposta foi ${status.toLowerCase()}!`,
            body: `Sua proposta para o serviço "${propostaExistente.servico.titulo}" foi ${status.toLowerCase()}.`,
            url: `/servicos/${propostaExistente.servicoId}`,
          }
        );

        if (!result.success) {
          console.error("Falha ao enviar Web Push:", result.error);
          if (result.statusCode === 404 || result.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: subscription.id } });
          }
        }

        return result;
      })
    );

    if (pushSubscriptions.length > 0 && !pushResults.some((result) => result.success)) {
      console.error("Nenhuma assinatura Push recebeu a atualização da proposta.");
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