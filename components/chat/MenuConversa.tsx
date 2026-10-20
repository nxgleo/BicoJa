"use client";

import { useState, type FormEvent } from "react";
import { Ban, Flag, MoreVertical } from "lucide-react";
import { Botao } from "@/components/ui";
import { enviarJson } from "@/lib/cliente/api";
import { MOTIVOS_DENUNCIA } from "@/lib/chat/esquemas";

type Props = {
  conversaId: string;
  nomeOutro: string;
  bloqueadoPorMim: boolean;
  onBloqueioMudou: (bloqueado: boolean) => void;
};

type Tela = "fechado" | "opcoes" | "bloquear" | "denunciar" | "denunciado";

/** "Opções" da conversa: bloquear/desbloquear e denunciar. */
export function MenuConversa({ conversaId, nomeOutro, bloqueadoPorMim, onBloqueioMudou }: Props) {
  const [tela, setTela] = useState<Tela>("fechado");
  const [motivo, setMotivo] = useState<string>("");
  const [detalhe, setDetalhe] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const primeiroNome = nomeOutro.split(" ")[0];

  async function mudarBloqueio(bloquear: boolean) {
    setEnviando(true);
    setErro(null);
    const r = await fetch(`/api/conversas/${conversaId}/bloqueio`, { method: bloquear ? "POST" : "DELETE" }).catch(() => null);
    setEnviando(false);
    if (!r?.ok) return setErro("Não deu certo. Tente de novo.");
    onBloqueioMudou(bloquear);
    setTela("fechado");
  }

  async function enviarDenuncia(e: FormEvent) {
    e.preventDefault();
    if (!motivo) return setErro("Escolha o motivo.");
    setEnviando(true);
    setErro(null);
    const r = await enviarJson(`/api/conversas/${conversaId}/denuncia`, "POST", { motivo, detalhe: detalhe || undefined });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    setTela("denunciado");
  }

  return (
    <div className="relative">
      <Botao
        variante="fantasma"
        icone={MoreVertical}
        aria-expanded={tela !== "fechado"}
        aria-controls="opcoes-conversa"
        onClick={() => setTela(tela === "fechado" ? "opcoes" : "fechado")}
      >
        Opções
      </Botao>

      {tela !== "fechado" && (
        <div
          id="opcoes-conversa"
          className="animate-aparecer absolute top-full right-0 z-20 mt-2 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-3 rounded-2xl bg-superficie p-4 shadow-lg ring-1 ring-borda"
        >
          {tela === "opcoes" && (
            <>
              {bloqueadoPorMim ? (
                <Botao variante="secundario" icone={Ban} larguraTotal carregando={enviando} onClick={() => mudarBloqueio(false)}>
                  Desbloquear {primeiroNome}
                </Botao>
              ) : (
                <Botao variante="secundario" icone={Ban} larguraTotal onClick={() => setTela("bloquear")}>
                  Bloquear {primeiroNome}
                </Botao>
              )}
              <Botao variante="secundario" icone={Flag} larguraTotal onClick={() => setTela("denunciar")}>
                Denunciar
              </Botao>
            </>
          )}

          {tela === "bloquear" && (
            <>
              <p className="font-bold">Bloquear {primeiroNome}?</p>
              <p className="text-texto-suave">Vocês não vão mais poder mandar mensagens um para o outro. Dá para desbloquear depois.</p>
              <Botao variante="urgente" larguraTotal carregando={enviando} onClick={() => mudarBloqueio(true)}>
                Sim, bloquear
              </Botao>
              <Botao variante="secundario" larguraTotal onClick={() => setTela("opcoes")}>
                Voltar
              </Botao>
            </>
          )}

          {tela === "denunciar" && (
            <form onSubmit={enviarDenuncia} noValidate className="flex flex-col gap-3">
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 font-bold">O que aconteceu?</legend>
                {Object.entries(MOTIVOS_DENUNCIA).map(([id, rotulo]) => (
                  <label key={id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-superficie-suave px-3 font-bold">
                    <input type="radio" name="motivo" value={id} checked={motivo === id} onChange={() => setMotivo(id)} className="size-5 accent-botao" />
                    {rotulo}
                  </label>
                ))}
              </fieldset>
              <label htmlFor="detalhe-denuncia" className="font-bold">
                Conte mais (opcional)
              </label>
              <textarea
                id="detalhe-denuncia"
                value={detalhe}
                onChange={(e) => setDetalhe(e.target.value)}
                maxLength={500}
                rows={3}
                className="rounded-2xl border-2 border-borda bg-superficie p-3 focus-visible:border-foco focus-visible:outline-none"
              />
              <Botao type="submit" variante="urgente" larguraTotal carregando={enviando}>
                Enviar denúncia
              </Botao>
              <Botao variante="secundario" larguraTotal onClick={() => setTela("opcoes")}>
                Voltar
              </Botao>
            </form>
          )}

          {tela === "denunciado" && (
            <>
              <p role="status" className="font-bold">
                Recebemos sua denúncia. Obrigado por avisar.
              </p>
              {!bloqueadoPorMim && (
                <Botao variante="secundario" icone={Ban} larguraTotal onClick={() => setTela("bloquear")}>
                  Bloquear {primeiroNome} também
                </Botao>
              )}
              <Botao variante="fantasma" larguraTotal onClick={() => setTela("fechado")}>
                Fechar
              </Botao>
            </>
          )}

          {erro && (
            <p role="alert" className="font-bold text-urgencia">
              {erro}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
