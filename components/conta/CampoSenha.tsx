"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { SENHA_MINIMO } from "@/lib/contas/senha";

type Props = {
  rotulo: string;
  erro?: string;
  /** Mostra "Pelo menos 8 letras ou números", que fica verde quando cumprida (no cadastro). */
  mostrarRegra?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function CampoSenha({ rotulo, erro, mostrarRegra = false, id, value, ...resto }: Props) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const [visivel, setVisivel] = useState(false);
  const cumpriu = String(value ?? "").length >= SENHA_MINIMO;
  const descricao = [erro && `${idCampo}-erro`, mostrarRegra && `${idCampo}-regra`].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idCampo} className="font-bold">
        {rotulo}
      </label>
      <div className="relative">
        <input
          id={idCampo}
          type={visivel ? "text" : "password"}
          value={value}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descricao}
          maxLength={72}
          className={`min-h-12 w-full rounded-2xl border-2 bg-superficie-suave py-3 pr-28 pl-4 text-base text-texto transition-colors duration-200 focus:border-foco focus:bg-superficie focus:outline-none ${
            erro ? "border-urgencia" : "border-transparent"
          }`}
          {...resto}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-pressed={visivel}
          aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
          className="absolute top-1/2 right-1 flex min-h-11 -translate-y-1/2 items-center gap-1.5 rounded-xl px-3 font-extrabold text-marca-texto focus-visible:outline-3 focus-visible:outline-foco"
        >
          {visivel ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
          <span aria-hidden>{visivel ? "Esconder" : "Mostrar"}</span>
        </button>
      </div>
      {mostrarRegra && (
        <p id={`${idCampo}-regra`} className={`text-sm font-bold ${cumpriu ? "text-sucesso" : "text-texto-suave"}`}>
          {cumpriu ? "✓ " : ""}Pelo menos {SENHA_MINIMO} letras ou números
        </p>
      )}
      {erro && (
        <p id={`${idCampo}-erro`} role="alert" className="text-sm font-bold text-urgencia">
          {erro}
        </p>
      )}
    </div>
  );
}
