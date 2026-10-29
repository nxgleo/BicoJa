"use client";

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

type Props = {
  onCompleto: (codigo: string) => void;
  erro?: string;
  desabilitado?: boolean;
};

const TAMANHO = 6;

/** 6 caixinhas para o código. Aceita colar o código inteiro e pula sozinho para a próxima. */
export function CampoCodigo({ onCompleto, erro, desabilitado = false }: Props) {
  const [digitos, setDigitos] = useState<string[]>(Array(TAMANHO).fill(""));
  const caixas = useRef<(HTMLInputElement | null)[]>([]);

  function atualizar(novos: string[], focar: number) {
    setDigitos(novos);
    caixas.current[Math.min(focar, TAMANHO - 1)]?.focus();
    if (novos.every((d) => d !== "")) onCompleto(novos.join(""));
  }

  function digitar(indice: number, texto: string) {
    const numeros = texto.replace(/\D/g, "");
    if (!numeros) return;
    const novos = [...digitos];
    let i = indice;
    for (const n of numeros) {
      if (i >= TAMANHO) break;
      novos[i++] = n;
    }
    atualizar(novos, i);
  }

  function colar(e: ClipboardEvent<HTMLInputElement>, indice: number) {
    e.preventDefault();
    digitar(indice, e.clipboardData.getData("text"));
  }

  function tecla(e: KeyboardEvent<HTMLInputElement>, indice: number) {
    if (e.key === "Backspace" && !digitos[indice] && indice > 0) {
      const novos = [...digitos];
      novos[indice - 1] = "";
      setDigitos(novos);
      caixas.current[indice - 1]?.focus();
      e.preventDefault();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Código de 6 números" className="flex justify-center gap-2">
        {digitos.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              caixas.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            autoFocus={i === 0}
            aria-label={`Número ${i + 1} de ${TAMANHO}`}
            aria-invalid={erro ? true : undefined}
            maxLength={TAMANHO}
            value={d}
            disabled={desabilitado}
            onChange={(e) => {
              const valor = e.target.value.replace(/\D/g, "");
              if (valor === "") {
                const novos = [...digitos];
                novos[i] = "";
                setDigitos(novos);
                return;
              }
              // Caixa já tinha número e a pessoa digitou outro: fica só o novo
              if (d && valor.length === 2) digitar(i, valor.startsWith(d) ? valor.slice(1) : valor.slice(0, 1));
              else digitar(i, valor); // 1 número, ou o código inteiro (preenchimento automático)
            }}
            onPaste={(e) => colar(e, i)}
            onKeyDown={(e) => tecla(e, i)}
            onFocus={(e) => e.target.select()}
            className={`h-14 w-11 rounded-xl border-2 bg-superficie-suave text-center text-2xl font-black text-texto transition-colors duration-200 focus:border-foco focus:bg-superficie focus:outline-none sm:w-12 ${
              erro ? "border-urgencia" : "border-borda"
            }`}
          />
        ))}
      </div>
      {erro && (
        <p role="alert" className="text-center text-sm font-bold text-urgencia">
          {erro}
        </p>
      )}
    </div>
  );
}
