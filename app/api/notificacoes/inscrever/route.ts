import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId, subscription } = await req.json();

    if (!userId || !subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { success: false, data: null, error: "userId e dados de subscription são obrigatórios." },
        { status: 400 }
      );
    }

    const pushSub = await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        keys: subscription.keys,
        userId,
      },
      create: {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userId,
      },
    });

    return NextResponse.json(
      { success: true, data: pushSub, error: null },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, data: null, error: "Erro ao salvar assinatura de notificação." },
      { status: 500 }
    );
  }
}