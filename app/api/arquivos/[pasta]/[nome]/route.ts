import { readFile } from "node:fs/promises";
import { caminhoDaImagem } from "@/lib/imagens";

// GET /api/arquivos/<pasta>/<id>.webp — fotos de perfil, de pedidos e de anúncios
export async function GET(_req: Request, { params }: { params: Promise<{ pasta: string; nome: string }> }) {
  const { pasta, nome } = await params;
  const caminho = caminhoDaImagem(pasta, nome);
  if (!caminho) return new Response("Não encontrado", { status: 404 });

  try {
    const bytes = await readFile(caminho);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
}
