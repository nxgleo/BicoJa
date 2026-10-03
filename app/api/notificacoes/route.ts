import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/web-push";

export async function POST(req: Request) {
  try {
    const { userId, title, message, url, subscription } = await req.json();

    if (!userId || !title || !message) {
      return NextResponse.json(
        { success: false, data: null, error: "userId, title e message são obrigatórios." },
        { status: 400 }
      );
    }

    // Se houver uma assinatura Web Push ativa, envia a notificação
    if (subscription) {
      await sendPushNotification(subscription, {
        title,
        body: message,
        url: url || "/",
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          enviado: true,
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