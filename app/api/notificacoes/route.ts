import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enviarPush } from "@/lib/push";
import { temChaveInterna } from "@/lib/chave-interna";

// Corrigido na Fase 6: antes qualquer pessoa podia mandar notificação para qualquer usuário.
// Agora é uma rota interna (só o próprio servidor, com a chave x-chave-interna "push").
// O app manda as notificações por dentro (lib/push.ts), sem passar por aqui.
const esquema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(80),
  message: z.string().min(1).max(200),
  url: z.string().startsWith("/").max(200).optional(),
});

export async function POST(req: Request) {
  if (!temChaveInterna(req, "push")) return new Response("Não encontrado", { status: 404 });
  const validado = esquema.safeParse(await req.json().catch(() => null));
  if (!validado.success) return NextResponse.json({ ok: false, erro: "Dados inválidos." }, { status: 400 });
  const { userId, title, message, url } = validado.data;
  const entregas = await enviarPush(prisma, userId, { title, body: message, url: url ?? "/" });
  return NextResponse.json({ ok: true, entregas });
}
