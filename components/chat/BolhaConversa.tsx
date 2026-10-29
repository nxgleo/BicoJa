"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { useChat } from "@/components/chat/ProvedorChat";

/** Atalho flutuante para voltar à última conversa (aparece fora da tela do chat). Pode ser fechado. */
export function BolhaConversa() {
  const caminho = usePathname() ?? "/";
  const { ultima, naoLidas, bolhaDispensada, dispensarBolha } = useChat();
  if (!ultima || bolhaDispensada || caminho.startsWith("/conversas")) return null;

  const primeiroNome = ultima.nome.split(" ")[0];
  return (
    <div className="animate-aparecer fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-1 rounded-full bg-superficie p-1 shadow-lg ring-1 ring-borda md:bottom-6">
      <Link
        href={`/conversas/${ultima.id}`}
        className="relative flex min-h-12 items-center gap-2 rounded-full bg-botao py-2 pr-4 pl-3 font-extrabold text-texto-sobre-marca focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
      >
        <MessageCircle aria-hidden className="size-6" />
        <span>Conversa com {primeiroNome}</span>
        {naoLidas > 0 && (
          <span className="ml-1 rounded-full bg-urgencia px-2 text-sm text-white">
            {naoLidas}
            <span className="sr-only"> {naoLidas === 1 ? "mensagem nova" : "mensagens novas"}</span>
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={dispensarBolha}
        className="flex size-12 items-center justify-center rounded-full text-texto-suave hover:bg-superficie-suave focus-visible:outline-3 focus-visible:outline-foco"
      >
        <X aria-hidden className="size-5" />
        <span className="sr-only">Fechar atalho da conversa</span>
      </button>
    </div>
  );
}
