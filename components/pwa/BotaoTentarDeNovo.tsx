"use client";

import { RotateCw } from "lucide-react";
import { Botao } from "@/components/ui";

export function BotaoTentarDeNovo() {
  return (
    <Botao icone={RotateCw} tamanho="grande" onClick={() => location.reload()}>
      Tentar de novo
    </Botao>
  );
}
