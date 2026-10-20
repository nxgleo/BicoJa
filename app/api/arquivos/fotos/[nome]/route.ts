import { readFile } from "node:fs/promises";
import { caminhoDaFoto } from "@/lib/contas/foto";

// GET /api/arquivos/fotos/<id>.webp — fotos de perfil (são públicas, aparecem para todos)
export async function GET(_req: Request, { params }: { params: Promise<{ nome: string }> }) {
  const { nome } = await params;
  const caminho = caminhoDaFoto(nome);
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
