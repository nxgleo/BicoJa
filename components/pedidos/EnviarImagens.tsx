"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

type Props = {
  pasta: "pedidos" | "anuncios";
  maximo: number;
  valor: string[];
  onChange: (fotos: string[]) => void;
  rotulo?: string;
  erro?: string;
};

/** Fotos de pedido ou anúncio: escolhe, envia uma por uma e mostra as miniaturas. */
export function EnviarImagens({ pasta, maximo, valor, onChange, rotulo = "Fotos", erro }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [problema, setProblema] = useState<string | null>(null);

  async function enviar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setProblema(null);
    setEnviando(true);
    const novas = [...valor];
    for (const arquivo of Array.from(arquivos).slice(0, maximo - valor.length)) {
      if (arquivo.size > 5 * 1024 * 1024) {
        setProblema("Uma foto é muito grande. Escolha fotos de até 5 MB.");
        continue;
      }
      try {
        const corpo = new FormData();
        corpo.append("imagem", arquivo);
        const resposta = await fetch(`/api/arquivos/imagens?pasta=${pasta}`, { method: "POST", body: corpo });
        const dados = await resposta.json().catch(() => ({}));
        if (resposta.ok) novas.push(dados.url);
        else setProblema(dados.erro ?? "Não conseguimos enviar uma das fotos.");
      } catch {
        setProblema("Sem conexão. Confira sua internet e tente de novo.");
      }
    }
    onChange(novas);
    setEnviando(false);
    if (entrada.current) entrada.current.value = "";
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-bold">
        {rotulo} <span className="font-normal text-texto-suave">(até {maximo}, opcional)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {valor.map((url, i) => (
          <div key={url} className="relative size-20 overflow-hidden rounded-xl bg-superficie-suave">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              aria-label={`Remover foto ${i + 1}`}
              onClick={() => onChange(valor.filter((f) => f !== url))}
              className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-black/70 text-white focus-visible:outline-3 focus-visible:outline-foco"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        ))}
        {valor.length < maximo && (
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            disabled={enviando}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-marca bg-marca-suave text-xs font-extrabold text-marca-texto focus-visible:outline-3 focus-visible:outline-foco disabled:opacity-70"
          >
            {enviando ? <Loader2 aria-hidden className="size-6 animate-spin" /> : <ImagePlus aria-hidden className="size-6" />}
            {enviando ? "Enviando" : "Adicionar foto"}
          </button>
        )}
      </div>
      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => enviar(e.target.files)}
      />
      {(problema || erro) && <p role="alert" className="text-sm font-bold text-urgencia">{problema ?? erro}</p>}
    </fieldset>
  );
}
