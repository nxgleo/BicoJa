"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Botao, Campo } from "@/components/ui";
import { SeletorQuando } from "@/components/pedidos/SeletorQuando";
import { enviarJson, focarCampo } from "@/lib/cliente/api";
import { lerValor } from "@/lib/chat/formatar";
import type { MensagemChat } from "@/lib/chat/conversas";
import type { Quando } from "@/lib/pedidos/esquemas";

type Props = {
  conversaId: string;
  /** Proposta que está sendo negociada (o formulário já vem com os valores dela). */
  base: MensagemChat | null;
  onEnviada: (mensagens: MensagemChat[]) => void;
  onCancelar: () => void;
};

function quandoInicial(base: MensagemChat | null): Quando {
  const p = base?.proposta;
  if (!p) return { tipo: "QUALQUER_DIA" };
  return {
    tipo: p.quandoTipo,
    dataInicio: p.dataInicio ?? undefined,
    dataFim: p.dataFim ?? undefined,
    horaInicio: p.horaInicio ?? undefined,
    horaFim: p.horaFim ?? undefined,
  };
}

/** "Fazer proposta" / "Negociar": valor e quando. */
export function FormProposta({ conversaId, base, onEnviada, onCancelar }: Props) {
  const [valor, setValor] = useState(base?.proposta ? String(base.proposta.valor).replace(".", ",") : "");
  const [quando, setQuando] = useState<Quando>(() => quandoInicial(base));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => focarCampo("valor-proposta"), []);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const numero = lerValor(valor);
    if (!Number.isFinite(numero) || numero < 1) {
      setErros({ valor: "Digite o valor, por exemplo 120 ou 120,50." });
      focarCampo("valor-proposta");
      return;
    }
    setEnviando(true);
    setErros({});
    const r = await enviarJson<{ mensagens: MensagemChat[] }>(`/api/conversas/${conversaId}/propostas`, "POST", { valor: numero, quando });
    setEnviando(false);
    if (r.ok) return onEnviada(r.dados.mensagens);
    const campo = r.campo?.startsWith("quando.") ? r.campo.slice(7) : r.campo === "valor" ? "valor" : "geral";
    setErros({ [campo]: r.erro });
    if (campo === "valor") focarCampo("valor-proposta");
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4 rounded-2xl border-2 border-marca bg-superficie p-4" aria-labelledby="titulo-proposta">
      <h2 id="titulo-proposta" className="text-xl font-black">
        {base ? "Negociar proposta" : "Fazer proposta"}
      </h2>
      <Campo
        id="valor-proposta"
        rotulo="Valor (R$)"
        inputMode="decimal"
        autoComplete="off"
        placeholder="Ex.: 120"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        maxLength={12}
        erro={erros.valor}
      />
      <SeletorQuando valor={quando} onChange={setQuando} erros={erros} />
      {erros.geral && (
        <p role="alert" className="rounded-2xl bg-superficie-suave p-3 font-bold text-urgencia">
          {erros.geral}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Botao variante="secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Botao>
        <Botao type="submit" carregando={enviando}>
          Enviar proposta
        </Botao>
      </div>
    </form>
  );
}
