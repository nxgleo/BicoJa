import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirPrestador } from "@/lib/prestador-pagina";
import { FormAnuncio } from "@/components/prestador/FormAnuncio";

export const dynamic = "force-dynamic";

export default async function EditarAnuncio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, perfil } = await exigirPrestador(`/prestador/anuncios/${id}`);
  const anuncio = await prisma.servico.findFirst({
    where: { id, prestadorId: userId },
    select: { id: true, titulo: true, categoria: true, descricao: true, preco: true, fotos: true },
  });
  if (!anuncio) notFound();
  return <FormAnuncio categoriasDoPerfil={perfil.categorias} inicial={anuncio} />;
}
