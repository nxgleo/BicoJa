import { Star } from "lucide-react";

/** "★ 4,8 · 12 avaliações" (ou "Ainda sem avaliações"). */
export function NotaEstrelas({ media, total, pequena = false }: { media: number | null; total: number; pequena?: boolean }) {
  if (!media || total === 0) return <p className={`text-texto-suave ${pequena ? "text-sm" : ""}`}>Ainda sem avaliações</p>;
  return (
    <p className={`flex items-center gap-1 font-bold ${pequena ? "text-sm" : ""}`}>
      <Star aria-hidden className="size-5 fill-marca text-marca" />
      <span>
        {media.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
        <span className="font-normal text-texto-suave"> · {total === 1 ? "1 avaliação" : `${total} avaliações`}</span>
      </span>
    </p>
  );
}

/** Estrelas só para mostrar uma nota (ex.: numa avaliação da lista). */
export function EstrelasFixas({ nota }: { nota: number }) {
  return (
    <span role="img" aria-label={`${nota} de 5 estrelas`} className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={`size-4 ${n <= nota ? "fill-marca text-marca" : "text-borda"}`} />
      ))}
    </span>
  );
}
