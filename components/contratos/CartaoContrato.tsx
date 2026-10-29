import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui";
import { formatarPreco } from "@/lib/formatar";
import { textoQuando } from "@/lib/pedidos/formatar";
import type { listarContratos } from "@/lib/contratos/contratos";

type Item = Awaited<ReturnType<typeof listarContratos>>[number];

const SELO = {
  pagar: { texto: "Escolha como pagar", cor: "bg-marca-suave text-marca-texto" },
  avaliar: { texto: "Falta avaliar", cor: "bg-marca-suave text-marca-texto" },
  COMBINADO: { texto: "Combinado", cor: "bg-superficie-suave text-texto" },
  CONCLUIDO: { texto: "Concluído", cor: "bg-superficie-suave text-sucesso" },
  CANCELADO: { texto: "Cancelado", cor: "bg-superficie-suave text-texto-suave" },
};

/** Um serviço combinado na lista (Pedidos do cliente, Serviços do prestador). */
export function CartaoContrato({ c, falaPrestador = false }: { c: Item; falaPrestador?: boolean }) {
  const selo = SELO[(falaPrestador && c.falta === "pagar" ? null : c.falta) ?? c.status];
  return (
    <Link
      href={`/contratos/${c.id}`}
      className="flex items-center gap-3 rounded-2xl bg-superficie p-4 ring-1 ring-borda transition-colors duration-200 hover:bg-superficie-suave focus-visible:outline-3 focus-visible:outline-foco"
    >
      <Avatar nome={c.outro.nome} fotoUrl={c.outro.foto} tamanho={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-extrabold">{c.outro.nome}</p>
        <p className="text-texto-suave">
          {formatarPreco(c.valor)} · {textoQuando(c.quando)}
        </p>
        <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-sm font-bold ${selo.cor}`}>{selo.texto}</span>
      </div>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-texto-suave" />
    </Link>
  );
}
