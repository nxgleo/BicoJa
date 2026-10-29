import Link from "next/link";
import { ChevronRight, Megaphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { pedidosParaPrestador } from "@/lib/pedidos/pedidos";
import { estaDisponivel } from "@/lib/prestadores";
import { exigirPrestador } from "@/lib/prestador-pagina";
import { InterruptorDisponivel } from "@/components/prestador/InterruptorDisponivel";
import { AbasPedidos } from "@/components/prestador/AbasPedidos";

export const dynamic = "force-dynamic";

export default async function InicioPrestador() {
  const { userId, perfil } = await exigirPrestador("/prestador");
  const agora = new Date();
  const [user, urgentes, pedidos, anunciosAtivos] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { nome: true } }),
    pedidosParaPrestador(prisma, userId, "urgentes", agora),
    pedidosParaPrestador(prisma, userId, "pedidos", agora),
    prisma.servico.count({ where: { prestadorId: userId, ativo: true } }),
  ]);
  const ligado = estaDisponivel(perfil, agora);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-semibold text-texto-suave">Olá, {user?.nome?.split(" ")[0] ?? "prestador"}!</p>
        <h1 className="text-[1.6rem] leading-tight font-black">Pedidos perto de você</h1>
      </div>

      <InterruptorDisponivel ligado={ligado} ate={ligado ? perfil.disponivelAte!.toISOString() : null} />

      <AbasPedidos urgentes={urgentes} pedidos={pedidos} />

      <Link
        href="/prestador/anuncios"
        className="flex items-center gap-3 rounded-2xl bg-marca-suave p-4 transition-all duration-200 active:scale-[0.99] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
      >
        <Megaphone aria-hidden className="size-7 text-marca-texto" />
        <span className="flex-1">
          <span className="block font-black">Meus anúncios</span>
          <span className="block text-sm text-texto-suave">
            {anunciosAtivos === 0 ? "Crie seu primeiro anúncio" : `${anunciosAtivos} ${anunciosAtivos === 1 ? "ativo" : "ativos"} · Criar novo`}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-6 text-marca-texto" />
      </Link>
    </div>
  );
}
