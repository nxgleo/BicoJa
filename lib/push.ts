// Notificações push no celular. Roda só no servidor e nunca atrapalha a ação principal (erros são ignorados).
// O texto da notificação nunca leva o conteúdo da mensagem (pode aparecer na tela bloqueada).
import type { PrismaClient } from "@prisma/client";
import { sendPushNotification, type PushNotificationPayload } from "@/lib/web-push";

export async function enviarPush(prisma: PrismaClient, userId: string, dados: PushNotificationPayload): Promise<number> {
  try {
    const inscricoes = await prisma.pushSubscription.findMany({ where: { userId } });
    let entregues = 0;
    for (const s of inscricoes) {
      const r = await sendPushNotification({ endpoint: s.endpoint, keys: s.keys as { p256dh: string; auth: string } }, dados);
      if (r.success) entregues++;
      // Celular desinstalou ou bloqueou: apaga a inscrição
      else if (r.statusCode === 404 || r.statusCode === 410) await prisma.pushSubscription.deleteMany({ where: { id: s.id } });
    }
    return entregues;
  } catch {
    return 0;
  }
}

/** Manda por push o aviso mais recente do sininho de cada pessoa. */
export async function pushDosAvisos(prisma: PrismaClient, userIds: string[]) {
  for (const userId of new Set(userIds)) {
    const aviso = await prisma.aviso.findFirst({ where: { userId, lido: false }, orderBy: { createdAt: "desc" } }).catch(() => null);
    if (aviso) void enviarPush(prisma, userId, { title: "BicoJá", body: aviso.texto, url: aviso.href });
  }
}
