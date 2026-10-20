import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { marcarLida } from "@/lib/chat/conversas";
import { avisar } from "@/lib/chat/tempo-real";
import { idDaSessao } from "@/lib/contas/sessao";
import { responderErro } from "@/lib/contas/requisicao";

// POST /api/conversas/:id/lida — "li tudo até agora" (zera não lidas e mostra "visto" para o outro)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  const { id } = await params;
  const r = await marcarLida(prisma, id, userId);
  if (!r) return responderErro(404, "Conversa não encontrada.");
  avisar([r.outroId], "chat:lida", { conversaId: id, em: r.em });
  return NextResponse.json({ ok: true });
}
