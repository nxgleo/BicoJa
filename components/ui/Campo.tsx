import { useId, type InputHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

type CampoProps = {
  rotulo: string;
  erro?: string;
  ajuda?: string;
  icone?: LucideIcon;
} & InputHTMLAttributes<HTMLInputElement>;

export function Campo({ rotulo, erro, ajuda, icone: Icone, id, className = "", ...resto }: CampoProps) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const idErro = `${idCampo}-erro`;
  const idAjuda = `${idCampo}-ajuda`;
  const descricao = [erro && idErro, ajuda && idAjuda].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={idCampo} className="font-bold text-texto">
        {rotulo}
      </label>
      <div className="relative">
        {Icone && <Icone aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-texto-suave" />}
        <input
          id={idCampo}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descricao}
          className={`min-h-12 w-full rounded-2xl border-2 bg-superficie-suave px-4 py-3 text-base text-texto placeholder:text-texto-suave transition-colors duration-200 focus:border-marca focus:bg-superficie focus:outline-none ${
            Icone ? "pl-12" : ""
          } ${erro ? "border-urgencia" : "border-transparent"}`}
          {...resto}
        />
      </div>
      {erro && (
        <p id={idErro} className="text-sm font-bold text-urgencia" role="alert">
          {erro}
        </p>
      )}
      {ajuda && (
        <p id={idAjuda} className="text-sm text-texto-suave">
          {ajuda}
        </p>
      )}
    </div>
  );
}
