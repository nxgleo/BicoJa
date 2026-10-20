"use client";

import { useEffect, useState } from "react";
import { Moon, Smartphone, Sun, type LucideIcon } from "lucide-react";
import { aplicarTema, lerPreferenciaTema, salvarPreferenciaTema, type PreferenciaTema } from "@/lib/tema";

const OPCOES: { valor: PreferenciaTema; rotulo: string; icone: LucideIcon }[] = [
  { valor: "sistema", rotulo: "Igual ao celular", icone: Smartphone },
  { valor: "claro", rotulo: "Claro", icone: Sun },
  { valor: "escuro", rotulo: "Escuro", icone: Moon },
];

export function SeletorTema() {
  const [atual, setAtual] = useState<PreferenciaTema>("sistema");

  useEffect(() => {
    setAtual(lerPreferenciaTema());
  }, []);

  function escolher(valor: PreferenciaTema) {
    setAtual(valor);
    salvarPreferenciaTema(valor);
    aplicarTema(valor);
  }

  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-2">
      {OPCOES.map(({ valor, rotulo, icone: Icone }) => {
        const marcado = atual === valor;
        return (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={marcado}
            onClick={() => escolher(valor)}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3 text-sm font-bold transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-marca ${
              marcado ? "border-marca bg-marca-suave text-marca-texto" : "border-borda bg-superficie text-texto"
            }`}
          >
            <Icone aria-hidden className="size-6" />
            {rotulo}
          </button>
        );
      })}
    </div>
  );
}
