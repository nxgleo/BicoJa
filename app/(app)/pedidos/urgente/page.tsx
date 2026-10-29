import { prisma } from "@/lib/prisma";
import { enderecoDoUsuario } from "@/lib/enderecos";
import { exigirLogin } from "@/lib/sessao-pagina";
import { FormPedido } from "@/components/pedidos/FormPedido";

export const dynamic = "force-dynamic";

export default async function PedidoUrgente() {
  const userId = await exigirLogin("/pedidos/urgente");
  return <FormPedido urgente endereco={await enderecoDoUsuario(prisma, userId)} />;
}
