"use client";

import { Campo } from "@/components/ui";
import type { Quando } from "@/lib/pedidos/esquemas";

type Erros = Partial<Record<"dataInicio" | "dataFim" | "horaInicio" | "horaFim", string>>;
type Props = { valor: Quando; onChange: (q: Quando) => void; erros?: Erros };

const TIPOS: { tipo: Quando["tipo"]; rotulo: string }[] = [
  { tipo: "DIA_CERTO", rotulo: "Dia certo" },
  { tipo: "ENTRE_DIAS", rotulo: "Entre dias" },
  { tipo: "QUALQUER_DIA", rotulo: "Qualquer dia" },
];

function hojeTexto(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "Quando pode ser?": dia certo, um período de dias, ou qualquer dia — com horário opcional. */
export function SeletorQuando({ valor, onChange, erros = {} }: Props) {
  const hoje = hojeTexto();
  const mudar = (parcial: Partial<Quando>) => onChange({ ...valor, ...parcial });
  // Campo vazio vira "sem valor" (não manda texto vazio para o servidor)
  const campo = (nome: keyof Erros) => (e: { target: { value: string } }) => mudar({ [nome]: e.target.value || undefined });

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 font-bold">Quando pode ser?</legend>
      <div role="radiogroup" aria-label="Quando pode ser?" className="grid grid-cols-3 gap-1 rounded-2xl bg-superficie-suave p-1">
        {TIPOS.map(({ tipo, rotulo }) => {
          const marcado = valor.tipo === tipo;
          return (
            <button
              key={tipo}
              type="button"
              role="radio"
              aria-checked={marcado}
              onClick={() => onChange({ tipo, horaInicio: valor.horaInicio, horaFim: valor.horaFim })}
              className={`min-h-12 rounded-xl px-1 text-sm font-extrabold transition-all duration-200 focus-visible:outline-3 focus-visible:outline-foco ${
                marcado ? "bg-superficie text-texto shadow-sm" : "text-texto-suave"
              }`}
            >
              {rotulo}
            </button>
          );
        })}
      </div>

      {valor.tipo === "DIA_CERTO" && (
        <Campo id="quando-dataInicio" rotulo="Dia" type="date" min={hoje} value={valor.dataInicio ?? ""} onChange={campo("dataInicio")} erro={erros.dataInicio} />
      )}
      {valor.tipo === "ENTRE_DIAS" && (
        <div className="grid grid-cols-2 gap-3">
          <Campo id="quando-dataInicio" rotulo="De" type="date" min={hoje} value={valor.dataInicio ?? ""} onChange={campo("dataInicio")} erro={erros.dataInicio} />
          <Campo id="quando-dataFim" rotulo="Até" type="date" min={valor.dataInicio ?? hoje} value={valor.dataFim ?? ""} onChange={campo("dataFim")} erro={erros.dataFim} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Campo id="quando-horaInicio" rotulo="Das (opcional)" type="time" value={valor.horaInicio ?? ""} onChange={campo("horaInicio")} erro={erros.horaInicio} />
        <Campo id="quando-horaFim" rotulo="Até as (opcional)" type="time" value={valor.horaFim ?? ""} onChange={campo("horaFim")} erro={erros.horaFim} />
      </div>
    </fieldset>
  );
}
