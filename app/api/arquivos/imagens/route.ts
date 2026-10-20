import { NextResponse } from "next/server";
import { processarImagem, salvarImagem, TAMANHO_MAXIMO_IMAGEM } from "@/lib/imagens";
import { ERRO_LIMITE, limitar, responderErro } from "@/lib/contas/requisicao";
import { idDaSessao } from "@/lib/contas/sessao";

// POST /api/arquivos/imagens?pasta=pedidos|anuncios — envia uma foto (campo "imagem")
export async function POST(req: Request) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  if (!(await limitar(`imagens:${userId}`, 30, 600))) return responderErro(429, ERRO_LIMITE);

  const pasta = new URL(req.url).searchParams.get("pasta");
  if (pasta !== "pedidos" && pasta !== "anuncios") return responderErro(400, "Tipo de foto inválido.");

  if (Number(req.headers.get("content-length") ?? 0) > TAMANHO_MAXIMO_IMAGEM + 64 * 1024) {
    return responderErro(413, "A foto é muito grande. Escolha uma de até 5 MB.", "imagem");
  }

  let arquivo: FormDataEntryValue | null = null;
  try {
    arquivo = (await req.formData()).get("imagem");
  } catch {
    return responderErro(400, "Não recebemos a foto. Tente de novo.", "imagem");
  }
  if (!(arquivo instanceof Blob)) return responderErro(400, "Escolha uma foto.", "imagem");

  const r = await processarImagem(Buffer.from(await arquivo.arrayBuffer()), "galeria");
  if (!r.ok) return responderErro(400, r.erro, "imagem");
  return NextResponse.json({ ok: true, url: await salvarImagem(pasta, r.webp, userId) });
}
