import Link from "next/link";
import { ChevronRight, Siren } from "lucide-react";

export function BotaoAjudaAgora() {
  return (
    <Link
      href="/pedidos/urgente"
      className="flex items-center gap-3 rounded-2xl bg-urgencia px-4 py-3 text-white shadow-lg shadow-urgencia/25 transition-all duration-200 hover:brightness-110 active:scale-[0.99] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-urgencia"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
        <Siren aria-hidden className="size-6" />
      </span>
      <span className="flex-1">
        <span className="block font-black">Preciso de ajuda agora</span>
        <span className="block text-sm font-semibold">Avisamos quem está perto de você</span>
      </span>
      <ChevronRight aria-hidden className="size-6" />
    </Link>
  );
}
