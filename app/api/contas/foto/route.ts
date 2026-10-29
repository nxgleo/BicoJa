import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processarFoto, salvarFotoPerfil, TAMANHO_MAXIMO_FOTO } from "@/lib/contas/foto";
import { ERRO_LIMITE, limitar, responderErro } from "@/lib/contas/requisicao";
import { idDaSessao } from "@/lib/contas/sessao";

// POST /api/contas/foto — recebe a foto de perfil (campo "foto" de um formulário)
export async function POST(req: Request) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  if (!(await limitar(`foto:${userId}`, 10, 600))) return responderErro(429, ERRO_LIMITE);

  // Recusa cedo pelo tamanho declarado, antes de ler tudo
  const tamanho = Number(req.headers.get("content-length") ?? 0);
  if (tamanho > TAMANHO_MAXIMO_FOTO + 64 * 1024) {
    return responderErro(413, "A foto é muito grande. Escolha uma de até 5 MB.", "foto");
  }

  let arquivo: FormDataEntryValue | null = null;
  try {
    arquivo = (await req.formData()).get("foto");
  } catch {
    return responderErro(400, "Não recebemos a foto. Tente de novo.", "foto");
  }
  if (!(arquivo instanceof Blob)) return responderErro(400, "Escolha uma foto.", "foto");

  const resultado = await processarFoto(Buffer.from(await arquivo.arrayBuffer()));
  if (!resultado.ok) return responderErro(400, resultado.erro, "foto");

  const url = await salvarFotoPerfil(prisma, userId, resultado.webp);
  return NextResponse.json({ ok: true, url });
}
