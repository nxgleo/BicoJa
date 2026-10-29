import { Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { exigirPrestador } from "@/lib/prestador-pagina";
import { listarContratos } from "@/lib/contratos/contratos";
import { EstadoVazio } from "@/components/ui";
import { CartaoContrato } from "@/components/contratos/CartaoContrato";

export const dynamic = "force-dynamic";

export default async function Pagina() {
  const { userId } = await exigirPrestador("/prestador/servicos");
  const contratos = await listarContratos(prisma, userId, "prestador");
  const grupos = [
    { titulo: "Para fazer", itens: contratos.filter((c) => c.status === "COMBINADO") },
    { titulo: "Concluídos", itens: contratos.filter((c) => c.status === "CONCLUIDO") },
    { titulo: "Cancelados", itens: contratos.filter((c) => c.status === "CANCELADO") },
  ].filter((g) => g.itens.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[1.6rem] leading-tight font-black">Meus serviços</h1>
      {grupos.length === 0 ? (
        <EstadoVazio
          icone={Wrench}
          titulo="Nenhum serviço combinado ainda"
          texto="Quando um cliente aceitar sua proposta no chat, o serviço aparece aqui. É aqui que você digita o código no fim."
          acao={{ rotulo: "Ver pedidos perto", href: "/prestador" }}
        />
      ) : (
        grupos.map((g) => (
          <section key={g.titulo} aria-labelledby={`grupo-${g.titulo}`} className="flex flex-col gap-3">
            <h2 id={`grupo-${g.titulo}`} className="text-xl font-black">
              {g.titulo}
            </h2>
            <ul className="flex flex-col gap-2">
              {g.itens.map((c) => (
                <li key={c.id}>
                  <CartaoContrato c={c} falaPrestador />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
