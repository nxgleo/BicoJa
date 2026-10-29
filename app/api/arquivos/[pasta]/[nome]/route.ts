import { readFile } from "node:fs/promises";
import { caminhoDaImagem } from "@/lib/imagens";
import { prisma } from "@/lib/prisma";
import { podeVerFotoDoChat } from "@/lib/chat/conversas";
import { idDaSessao } from "@/lib/contas/sessao";

// GET /api/arquivos/<pasta>/<id>.webp — fotos de perfil, de pedidos, de anúncios e do chat.
// Fotos do chat são particulares: só abrem para quem mandou ou para quem está na conversa.
export async function GET(_req: Request, { params }: { params: Promise<{ pasta: string; nome: string }> }) {
  const { pasta, nome } = await params;
  const caminho = caminhoDaImagem(pasta, nome);
  if (!caminho) return new Response("Não encontrado", { status: 404 });

  const doChat = pasta === "chat";
  if (doChat) {
    const userId = await idDaSessao();
    if (!userId || !(await podeVerFotoDoChat(prisma, `/api/arquivos/chat/${nome}`, nome, userId))) {
      return new Response("Não encontrado", { status: 404 });
    }
  }

  try {
    const bytes = await readFile(caminho);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": doChat ? "private, max-age=3600" : "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
}
