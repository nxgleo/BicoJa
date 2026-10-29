import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { idDaSessao } from "@/lib/contas/sessao";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";

// Corrigido na Fase 6: antes o userId vinha do corpo (dava para inscrever o celular de outra pessoa).
// Agora a inscrição é sempre da conta logada.
const esquema = z.object({
  subscription: z.object({
    endpoint: z.string().url().startsWith("https://").max(600),
    keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  }),
});

// POST /api/notificacoes/inscrever — liga as notificações deste celular para a conta logada
export async function POST(req: Request) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para ativar as notificações.");
  if (!(await limitar(`push-inscrever:${userId}`, 20, 3600))) return responderErro(429, ERRO_LIMITE);
  const validado = esquema.safeParse(await lerJson(req));
  if (!validado.success) return responderErro(400, "Não deu para ativar as notificações neste celular.");

  const { endpoint, keys } = validado.data.subscription;
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { keys, userId },
    create: { endpoint, keys, userId },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE /api/notificacoes/inscrever — desliga (ao sair da conta ou no botão "Desativar")
export async function DELETE(req: Request) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  const corpo = z.object({ endpoint: z.string().max(600) }).safeParse(await lerJson(req));
  if (!corpo.success) return responderErro(400, "Dados inválidos.");
  await prisma.pushSubscription.deleteMany({ where: { endpoint: corpo.data.endpoint, userId } });
  return NextResponse.json({ ok: true });
}
