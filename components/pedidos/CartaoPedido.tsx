import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { nomeDaCategoria } from "@/lib/pedidos/formatar";

export type Selo = "URGENTE" | "ABERTO" | "FECHADO" | "CANCELADO";

const SELOS: Record<Selo, { texto: string; classe: string }> = {
  URGENTE: { texto: "Urgente", classe: "bg-urgencia text-white" },
  ABERTO: { texto: "Aberto", classe: "bg-marca-suave text-marca-texto" },
  FECHADO: { texto: "Fechado", classe: "bg-sucesso/15 text-texto" },
  CANCELADO: { texto: "Cancelado", classe: "bg-superficie-suave text-texto-suave" },
};

type Props = {
  href: string;
  categoria: string;
  descricao: string;
  selo: Selo;
  bairro: string;
  quando: string;
  extra?: string; // ex.: "1,2 km · há 5 minutos"
};

export function CartaoPedido({ href, categoria, descricao, selo, bairro, quando, extra }: Props) {
  const { texto, classe } = SELOS[selo];
  return (
    <Link
      href={href}
      className={`flex flex-col gap-2 rounded-2xl border p-4 transition-all duration-200 active:scale-[0.99] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco ${
        selo === "URGENTE" ? "border-urgencia/40 bg-urgencia/5" : "border-borda bg-superficie hover:border-marca"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-black">{nomeDaCategoria(categoria)}</span>
        <span className={`rounded-full px-3 py-0.5 text-sm font-extrabold ${classe}`}>{texto}</span>
      </div>
      <p className="line-clamp-2 break-words text-texto">{descricao}</p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-texto-suave">
        <span className="inline-flex items-center gap-1"><MapPin aria-hidden className="size-4" />{bairro}</span>
        <span className="inline-flex items-center gap-1"><CalendarDays aria-hidden className="size-4" />{quando}</span>
        {extra && <span>{extra}</span>}
      </p>
    </Link>
  );
}
