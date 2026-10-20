"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useChat } from "@/components/chat/ProvedorChat";

/** Sininho do topo: leva para a lista de avisos e mostra quantos são novos. */
export function Sininho() {
  const { avisosNaoLidos } = useChat();
  return (
    <Link
      href="/avisos"
      className="relative inline-flex min-h-12 items-center gap-2 rounded-2xl px-3 font-extrabold text-texto hover:bg-superficie-suave focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
    >
      <Bell aria-hidden className="size-6" />
      Avisos
      {avisosNaoLidos > 0 && (
        <span className="rounded-full bg-urgencia px-2 text-sm text-white">
          {avisosNaoLidos > 99 ? "99+" : avisosNaoLidos}
          <span className="sr-only"> {avisosNaoLidos === 1 ? "aviso novo" : "avisos novos"}</span>
        </span>
      )}
    </Link>
  );
}
