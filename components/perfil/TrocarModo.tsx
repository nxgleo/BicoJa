"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { HandHelping, Search, type LucideIcon } from "lucide-react";
import { enviarJson } from "@/lib/cliente/api";

type Modo = "CLIENTE" | "PRESTADOR";

const OPCOES: { modo: Modo; rotulo: string; texto: string; icone: LucideIcon }[] = [
  { modo: "CLIENTE", rotulo: "Modo cliente", texto: "Contratar serviços", icone: Search },
  { modo: "PRESTADOR", rotulo: "Modo prestador", texto: "Fazer bicos", icone: HandHelping },
];

export function TrocarModo({ modoAtual }: { modoAtual: Modo }) {
  const router = useRouter();
  const { update } = useSession();
  const [trocando, setTrocando] = useState<Modo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function trocar(modo: Modo) {
    if (modo === modoAtual || trocando) return;
    setTrocando(modo);
    setErro(null);
    const r = await enviarJson("/api/contas/modo", "PATCH", { modo });
    if (!r.ok) {
      setTrocando(null);
      if (r.extra.precisaVirarPrestador) {
        router.push("/quero-fazer-bicos");
        return;
      }
      setErro(r.erro);
      return;
    }
    await update();
    setTrocando(null);
    router.push(modo === "PRESTADOR" ? "/prestador" : "/");
    router.refresh();
  }

  return (
    <section aria-labelledby="titulo-modo" className="flex flex-col gap-3">
      <h2 id="titulo-modo" className="text-lg font-black">
        Como você quer usar o BicoJá agora?
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {OPCOES.map(({ modo, rotulo, texto, icone: Icone }) => {
          const ativo = modo === modoAtual;
          return (
            <button
              key={modo}
              type="button"
              aria-pressed={ativo}
              onClick={() => trocar(modo)}
              disabled={trocando !== null}
              className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 p-3 text-center transition-all duration-200 active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:opacity-70 ${
                ativo ? "border-botao bg-marca-suave" : "border-borda bg-superficie hover:border-marca"
              }`}
            >
              <Icone aria-hidden className={`size-7 ${ativo ? "text-marca-texto" : "text-texto-suave"}`} />
              <span className="font-black">{rotulo}</span>
              <span className="text-sm text-texto-suave">{trocando === modo ? "Trocando…" : texto}</span>
            </button>
          );
        })}
      </div>
      {erro && (
        <p role="alert" className="font-bold text-urgencia">
          {erro}
        </p>
      )}
    </section>
  );
}
