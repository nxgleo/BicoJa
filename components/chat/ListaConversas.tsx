"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { useChat } from "@/components/chat/ProvedorChat";
import { quandoNaLista } from "@/lib/chat/formatar";

type Item = {
  id: string;
  outro: { id: string; nome: string; foto: string | null };
  previa: string;
  ultimaEm: string;
  naoLidas: number;
};

/** Lista de conversas; atualiza sozinha quando chega mensagem. */
export function ListaConversas({ conversas }: { conversas: Item[] }) {
  const router = useRouter();
  const { socket } = useChat();

  useEffect(() => {
    if (!socket) return;
    const atualizar = () => router.refresh();
    socket.on("chat:mensagens", atualizar);
    return () => {
      socket.off("chat:mensagens", atualizar);
    };
  }, [socket, router]);

  return (
    <ul className="flex flex-col gap-2">
      {conversas.map((c) => (
        <li key={c.id}>
          <Link
            href={`/conversas/${c.id}`}
            className="flex min-h-20 items-center gap-3 rounded-2xl bg-superficie p-3 ring-1 ring-borda transition-colors duration-200 hover:bg-superficie-suave focus-visible:outline-3 focus-visible:outline-foco"
          >
            <Avatar nome={c.outro.nome} fotoUrl={c.outro.foto} tamanho={52} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-lg font-extrabold">{c.outro.nome}</p>
                <p className="shrink-0 text-sm text-texto-suave">{quandoNaLista(c.ultimaEm)}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className={`truncate ${c.naoLidas > 0 ? "font-bold text-texto" : "text-texto-suave"}`}>{c.previa}</p>
                {c.naoLidas > 0 && (
                  <span className="shrink-0 rounded-full bg-urgencia px-2 text-sm font-bold text-white">
                    {c.naoLidas}
                    <span className="sr-only"> {c.naoLidas === 1 ? "mensagem nova" : "mensagens novas"}</span>
                  </span>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
