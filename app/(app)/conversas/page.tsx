import { MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { listarConversas } from "@/lib/chat/conversas";
import { exigirLogin } from "@/lib/sessao-pagina";
import { EstadoVazio } from "@/components/ui";
import { ListaConversas } from "@/components/chat/ListaConversas";

export const dynamic = "force-dynamic";

export default async function Conversas() {
  const userId = await exigirLogin("/conversas");
  const conversas = await listarConversas(prisma, userId);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[1.6rem] leading-tight font-black">Conversas</h1>
      {conversas.length === 0 ? (
        <EstadoVazio
          icone={MessageCircle}
          titulo="Nenhuma conversa ainda"
          texto="Toque em Conversar no anúncio ou no perfil de um prestador para começar."
          acao={{ rotulo: "Procurar serviços", href: "/" }}
        />
      ) : (
        <ListaConversas conversas={conversas} />
      )}
    </div>
  );
}
