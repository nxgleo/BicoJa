import { HandCoins } from "lucide-react";
import { Botao } from "@/components/ui";

/** Convite para quem quer virar prestador. */
export function CartaoFazerBicos() {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border-2 border-marca bg-marca-suave p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-marca">
          <HandCoins aria-hidden className="size-7 text-white" />
        </span>
        <h2 className="text-lg leading-tight font-black">Quer ganhar dinheiro fazendo bicos?</h2>
      </div>
      <p className="text-texto">Anuncie o que você sabe fazer e receba pedidos de quem mora perto.</p>
      <Botao href="/quero-fazer-bicos" larguraTotal>
        Quero fazer bicos
      </Botao>
    </section>
  );
}
