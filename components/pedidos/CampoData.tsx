"use client";

import { useState } from "react";
import { Campo } from "@/components/ui";

type Props = {
  id: string;
  rotulo: string;
  /** Data no formato do servidor: "2026-10-20" */
  valor?: string;
  onChange: (iso: string | undefined) => void;
  erro?: string;
};

/** "2026-10-20" → "20/10/2026" */
export function isoParaTexto(iso?: string): string {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/** Vai pondo as barras enquanto a pessoa digita: "20102026" → "20/10/2026". */
export function mascararData(digitado: string): string {
  const n = digitado.replace(/\D/g, "").slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

/** "20/10/2026" → "2026-10-20" (ou nada, se ainda não terminou de digitar). */
export function textoParaIso(texto: string): string | undefined {
  const n = texto.replace(/\D/g, "");
  if (n.length !== 8) return undefined;
  return `${n.slice(4)}-${n.slice(2, 4)}-${n.slice(0, 2)}`;
}

/**
 * Data no jeito brasileiro (dia/mês/ano), igual em qualquer celular.
 * O campo de data do navegador muda de ordem conforme a língua do aparelho, por isso usamos texto.
 */
export function CampoData({ id, rotulo, valor, onChange, erro }: Props) {
  const [texto, setTexto] = useState(() => isoParaTexto(valor));

  return (
    <Campo
      id={id}
      rotulo={rotulo}
      inputMode="numeric"
      autoComplete="off"
      placeholder="dd/mm/aaaa"
      maxLength={10}
      value={texto}
      onChange={(e) => {
        const novo = mascararData(e.target.value);
        setTexto(novo);
        onChange(textoParaIso(novo));
      }}
      erro={erro}
      ajuda={erro ? undefined : "Dia, mês e ano. Ex.: 25/12/2026"}
    />
  );
}
