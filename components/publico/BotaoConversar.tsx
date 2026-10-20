import { MessageCircle } from "lucide-react";

/** O chat chega na Fase 4: por enquanto o botão aparece desabilitado com "em breve". */
export function BotaoConversar({ texto = "Conversar" }: { texto?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        disabled
        aria-describedby="conversar-em-breve"
        className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-botao px-6 text-lg font-extrabold text-texto-sobre-marca opacity-60"
      >
        <MessageCircle aria-hidden className="size-6" />
        {texto}
      </button>
      <p id="conversar-em-breve" className="text-sm text-texto-suave">As conversas chegam em breve.</p>
    </div>
  );
}
