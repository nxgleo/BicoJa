"use client";

import { Campo } from "@/components/ui";
import { formatarTelefone } from "@/lib/contas/telefone";
import type { InputHTMLAttributes } from "react";

type Props = {
  rotulo: string;
  erro?: string;
  value: string;
  onValorChange: (valor: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">;

/** Campo de celular que coloca a máscara "(91) 98888-7777" enquanto a pessoa digita. */
export function CampoTelefone({ rotulo, erro, value, onValorChange, ...resto }: Props) {
  return (
    <Campo
      rotulo={rotulo}
      erro={erro}
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      placeholder="(91) 98888-7777"
      value={value}
      onChange={(e) => onValorChange(formatarTelefone(e.target.value))}
      maxLength={15}
      {...resto}
    />
  );
}
