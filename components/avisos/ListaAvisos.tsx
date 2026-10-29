"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useChat } from "@/components/chat/ProvedorChat";
import { quandoNaLista } from "@/lib/chat/formatar";

type Aviso = { id: string; texto: string; href: string; lido: boolean; criadoEm: string };

/** Lista do sininho. Ao abrir, marca tudo como lido (os novos continuam destacados nesta visita). */
export function ListaAvisos({ avisos }: { avisos: Aviso[] }) {
  const { recarregarAvisos } = useChat();

  useEffect(() => {
    fetch("/api/avisos/lidos", { method: "POST" })
      .then(recarregarAvisos)
      .catch(() => {});
  }, [recarregarAvisos]);

  return (
    <ul className="flex flex-col gap-2">
      {avisos.map((a) => (
        <li key={a.id}>
          <Link
            href={a.href}
            className={`flex items-center gap-3 rounded-2xl p-4 ring-1 ring-borda transition-colors duration-200 hover:bg-superficie-suave focus-visible:outline-3 focus-visible:outline-foco ${
              a.lido ? "bg-superficie" : "bg-marca-suave"
            }`}
          >
            <div className="min-w-0 flex-1">
              {!a.lido && <span className="text-sm font-black text-marca-texto">Novo · </span>}
              <span className="text-sm text-texto-suave">{quandoNaLista(a.criadoEm)}</span>
              <p className="font-bold break-words">{a.texto}</p>
            </div>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-texto-suave" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
