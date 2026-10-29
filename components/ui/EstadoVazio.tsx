import type { LucideIcon } from "lucide-react";
import { Botao } from "./Botao";

type EstadoVazioProps = {
  icone: LucideIcon;
  titulo: string;
  texto: string;
  acao?: { rotulo: string; href: string };
};

export function EstadoVazio({ icone: Icone, titulo, texto, acao }: EstadoVazioProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-superficie-suave px-5 py-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-marca-suave">
        <Icone aria-hidden className="size-7 text-marca-texto" />
      </div>
      <p className="text-lg font-extrabold text-texto">{titulo}</p>
      <p className="max-w-xs text-texto-suave">{texto}</p>
      {acao && (
        <Botao href={acao.href} className="mt-1">
          {acao.rotulo}
        </Botao>
      )}
    </div>
  );
}
