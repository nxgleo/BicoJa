import { prisma } from "@/lib/prisma";
import { enderecoDoUsuario } from "@/lib/enderecos";
import { exigirLogin } from "@/lib/sessao-pagina";
import { CATEGORIAS, type CategoriaId } from "@/lib/categorias";
import { FormPedido } from "@/components/pedidos/FormPedido";

export const dynamic = "force-dynamic";

export default async function NovoPedido({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  const userId = await exigirLogin("/pedidos/novo");
  const { categoria } = await searchParams;
  const valida = CATEGORIAS.some((c) => c.id === categoria) ? (categoria as CategoriaId) : null;
  return <FormPedido urgente={false} endereco={await enderecoDoUsuario(prisma, userId)} categoriaInicial={valida} />;
}
