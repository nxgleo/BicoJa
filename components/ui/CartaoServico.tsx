import Link from "next/link";
import { Star } from "lucide-react";
import { Avatar } from "./Avatar";
import { formatarDistancia, formatarPreco } from "@/lib/formatar";

type CartaoServicoProps = {
  titulo: string;
  nomePrestador: string;
  fotoUrl?: string | null;
  nota?: number | null;
  totalAvaliacoes?: number;
  distanciaKm?: number | null;
  precoAPartirDe?: number | null;
  online?: boolean;
  href: string;
};

export function CartaoServico({
  titulo,
  nomePrestador,
  fotoUrl,
  nota,
  totalAvaliacoes = 0,
  distanciaKm,
  precoAPartirDe,
  online = false,
  href,
}: CartaoServicoProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-borda bg-superficie p-3 transition-all duration-200 hover:border-marca active:scale-[0.99] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
    >
      <Avatar nome={nomePrestador} fotoUrl={fotoUrl} online={online} />
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 font-extrabold leading-snug break-words text-texto">{titulo}</h3>
        <p className="truncate text-sm text-texto-suave">{nomePrestador}</p>
        <p className="flex items-center gap-1 text-sm text-texto-suave">
          {nota != null ? (
            <>
              <Star aria-hidden className="size-4 fill-marca text-marca" />
              <span>
                {nota.toFixed(1).replace(".", ",")} ({totalAvaliacoes})
              </span>
            </>
          ) : (
            <span className="font-bold text-marca-texto">Novo</span>
          )}
          {distanciaKm != null && <span>· {formatarDistancia(distanciaKm)}</span>}
        </p>
      </div>
      {precoAPartirDe != null && (
        <div className="shrink-0 text-right">
          <p className="text-sm text-texto-suave">a partir de</p>
          <p className="font-black text-texto">{formatarPreco(precoAPartirDe)}</p>
        </div>
      )}
    </Link>
  );
}
