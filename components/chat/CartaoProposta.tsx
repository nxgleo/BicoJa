"use client";

import { useState } from "react";
import { CheckCircle2, HandCoins } from "lucide-react";
import { Botao } from "@/components/ui";
import { formatarPreco } from "@/lib/formatar";
import { textoQuando } from "@/lib/pedidos/formatar";
import type { MensagemChat } from "@/lib/chat/conversas";

type Props = {
  mensagem: MensagemChat;
  minha: boolean;
  nomeOutro: string;
  podeResponder: boolean;
  onResponder: (id: string, acao: "aceitar" | "recusar") => Promise<void>;
  onNegociar: (m: MensagemChat) => void;
};

/** Cartão de proposta dentro do chat: valor + quando, com Aceitar / Negociar / Recusar. */
export function CartaoProposta({ mensagem, minha, nomeOutro, podeResponder, onResponder, onNegociar }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState<"aceitar" | "recusar" | null>(null);
  const p = mensagem.proposta;
  if (!p) return null;
  const primeiroNome = nomeOutro.split(" ")[0];
  const valor = formatarPreco(p.valor);
  const quando = textoQuando(p);

  async function responder(acao: "aceitar" | "recusar") {
    setEnviando(acao);
    await onResponder(mensagem.id, acao);
    setEnviando(null);
    setConfirmando(false);
  }

  const apagada = p.status === "SUBSTITUIDA" || p.status === "RECUSADA";

  return (
    <article
      aria-label={`Proposta de ${minha ? "você" : primeiroNome}: ${valor}`}
      className={`w-full max-w-sm rounded-2xl border-2 p-4 ${minha ? "self-end" : "self-start"} ${
        p.status === "ACEITA" ? "border-sucesso bg-superficie" : apagada ? "border-borda bg-superficie-suave opacity-75" : "border-marca bg-superficie"
      }`}
    >
      <p className="flex items-center gap-2 text-sm font-bold text-texto-suave">
        <HandCoins aria-hidden className="size-5 text-marca-texto" />
        Proposta de {minha ? "você" : primeiroNome}
      </p>
      <p className={`mt-1 text-2xl font-black ${apagada ? "line-through" : ""}`}>{valor}</p>
      <p className="font-bold">{quando}</p>

      {p.status === "ACEITA" && (
        <p className="mt-3 flex items-center gap-2 text-lg font-extrabold text-sucesso">
          <CheckCircle2 aria-hidden className="size-6" /> Combinado
        </p>
      )}
      {p.status === "RECUSADA" && <p className="mt-3 font-bold text-texto-suave">Recusada</p>}
      {p.status === "SUBSTITUIDA" && <p className="mt-3 font-bold text-texto-suave">Trocada por outra proposta</p>}

      {p.status === "PENDENTE" && minha && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-texto-suave">Esperando a resposta de {primeiroNome}.</p>
          {podeResponder && (
            <Botao variante="secundario" onClick={() => onNegociar(mensagem)}>
              Mudar proposta
            </Botao>
          )}
        </div>
      )}

      {p.status === "PENDENTE" && !minha && podeResponder && !confirmando && (
        <div className="mt-3 grid gap-2">
          <Botao larguraTotal onClick={() => setConfirmando(true)}>
            Aceitar
          </Botao>
          <div className="grid grid-cols-2 gap-2">
            <Botao variante="secundario" onClick={() => onNegociar(mensagem)}>
              Negociar
            </Botao>
            <Botao variante="fantasma" carregando={enviando === "recusar"} disabled={enviando !== null} onClick={() => responder("recusar")}>
              Recusar
            </Botao>
          </div>
        </div>
      )}

      {p.status === "PENDENTE" && !minha && podeResponder && confirmando && (
        <div className="mt-3 flex flex-col gap-2 rounded-xl bg-marca-suave p-3" role="group" aria-label="Confirmar proposta">
          <p className="font-bold">
            Aceitar {valor} ({quando.toLowerCase()})?
          </p>
          <Botao larguraTotal carregando={enviando === "aceitar"} disabled={enviando !== null} onClick={() => responder("aceitar")}>
            Sim, aceitar
          </Botao>
          <Botao variante="secundario" larguraTotal disabled={enviando !== null} onClick={() => setConfirmando(false)}>
            Voltar
          </Botao>
        </div>
      )}
    </article>
  );
}
