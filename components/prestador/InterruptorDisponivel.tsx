"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enviarJson } from "@/lib/cliente/api";

const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** "Estou disponível agora": liga por 8 horas e desliga sozinho. */
export function InterruptorDisponivel({ ligado: inicial, ate: ateInicial }: { ligado: boolean; ate: string | null }) {
  const router = useRouter();
  const [ligado, setLigado] = useState(inicial);
  const [ate, setAte] = useState(ateInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternar() {
    setSalvando(true);
    setErro(null);
    const r = await enviarJson<{ disponivelAte: string | null }>("/api/prestador/disponivel", "PATCH", { ligado: !ligado });
    setSalvando(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setLigado(!ligado);
    setAte(r.dados.disponivelAte);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={ligado}
        onClick={alternar}
        disabled={salvando}
        className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:opacity-70 ${
          ligado ? "border-sucesso bg-sucesso/10" : "border-borda bg-superficie"
        }`}
      >
        <span
          aria-hidden
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200 ${ligado ? "bg-sucesso" : "bg-borda"}`}
        >
          <span
            className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all duration-200 ${ligado ? "left-7" : "left-1"}`}
          />
        </span>
        <span className="flex-1">
          <span className="block font-black">Estou disponível agora</span>
          <span className="block text-sm text-texto-suave">
            {ligado && ate
              ? `Desliga sozinho às ${hora.format(new Date(ate))}`
              : "Ligue e você aparece para os clientes por 8 horas."}
          </span>
        </span>
      </button>
      {erro && <p role="alert" className="text-sm font-bold text-urgencia">{erro}</p>}
    </div>
  );
}
