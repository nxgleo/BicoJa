"use client";

import { HandHelping, Search, Users, type LucideIcon } from "lucide-react";
import type { Escolha } from "@/lib/contas/esquemas";

const OPCOES: { valor: Escolha; titulo: string; texto: string; icone: LucideIcon }[] = [
  { valor: "CONTRATAR", titulo: "Contratar", texto: "Achar quem resolva meu problema", icone: Search },
  { valor: "FAZER_BICOS", titulo: "Fazer bicos", texto: "Ganhar dinheiro com meus serviços", icone: HandHelping },
  { valor: "OS_DOIS", titulo: "Os dois", texto: "Contratar e também trabalhar", icone: Users },
];

export function EscolhaModo({ valor, onChange }: { valor: Escolha | null; onChange: (v: Escolha) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-texto-suave">Pode mudar depois quando quiser.</p>
      <div role="radiogroup" aria-label="O que você quer fazer no BicoJá?" className="flex flex-col gap-3">
        {OPCOES.map(({ valor: v, titulo, texto, icone: Icone }) => {
          const marcado = valor === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={marcado}
              onClick={() => onChange(v)}
              className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200 active:scale-[0.99] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco ${
                marcado ? "border-botao bg-marca-suave" : "border-borda bg-superficie hover:border-marca"
              }`}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-marca-suave">
                <Icone aria-hidden className="size-6 text-marca-texto" />
              </span>
              <span className="flex-1">
                <span className="block text-lg font-black">{titulo}</span>
                <span className="block text-texto-suave">{texto}</span>
              </span>
              <span
                aria-hidden
                className={`size-6 shrink-0 rounded-full border-2 ${marcado ? "border-[7px] border-botao" : "border-borda"}`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
