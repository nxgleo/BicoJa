// Ajudantes das rotas do chat.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { responderErro } from "@/lib/contas/requisicao";
import { prisma } from "@/lib/prisma";
import { enviarPush } from "@/lib/push";

/** Conversar exige conta completa (email confirmado e foto). Devolve o id ou a resposta de erro. */
export async function exigirContaCompleta(): Promise<{ userId: string; nome: string } | { resposta: Response }> {
  const u = (await getServerSession(authOptions))?.user;
  if (!u?.id) return { resposta: responderErro(401, "Entre na sua conta para continuar.") };
  if (!u.emailVerificado || !u.temFoto) {
    return {
      resposta: responderErro(403, "Termine seu cadastro para conversar.", undefined, {
        destino: u.emailVerificado ? "/cadastro/foto" : "/cadastro/codigo",
      }),
    };
  }
  return { userId: u.id, nome: (u.name ?? "Alguém").split(" ")[0] };
}

export function responderFalha(r: { status: number; erro: string; campo?: string }) {
  return responderErro(r.status, r.erro, r.campo);
}

/** Notificação no celular de quem recebeu (sem o texto da mensagem, que pode aparecer na tela bloqueada). */
export function pushParaOutro(avisar: string[], eu: string, conversaId: string, body: string) {
  const outro = avisar.find((id) => id !== eu);
  if (outro) void enviarPush(prisma, outro, { title: "BicoJá", body, url: `/conversas/${conversaId}` });
}
