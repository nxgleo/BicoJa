import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/web-push";

export async function POST(req: Request) {
  try {
    const { userId, title, message, url } = await req.json();

    if (!userId || !title || !message) {
      return NextResponse.json(
        { success: false, data: null, error: "userId, title e message são obrigatórios." },
        { status: 400 }
      );
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { success: false, data: null, error: "O usuário não possui assinatura de notificações." },
        { status: 404 }
      );
    }

    const results = await Promise.all(
      subscriptions.map(async (subscription) => {
        const result = await sendPushNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys as any,
          },
          { title, body: message, url: url || "/" }
        );

        if (!result.success && (result.statusCode === 404 || result.statusCode === 410)) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } });
        }

        return result;
      })
    );
    const successfulDeliveries = results.filter((result) => result.success).length;

    if (successfulDeliveries === 0) {
      console.error("Nenhuma notificação Push foi entregue:", results);
      return NextResponse.json(
        { success: false, data: null, error: "Não foi possível enviar a notificação Push." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          enviado: true,
          entregas: successfulDeliveries,
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