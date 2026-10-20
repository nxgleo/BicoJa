"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, CheckCheck, Check, HandCoins, Loader2, MapPin, Phone, Send, ShieldCheck } from "lucide-react";
import { Avatar, Botao } from "@/components/ui";
import { useChat } from "@/components/chat/ProvedorChat";
import { CartaoProposta } from "@/components/chat/CartaoProposta";
import { FormProposta } from "@/components/chat/FormProposta";
import { MenuConversa } from "@/components/chat/MenuConversa";
import { enviarJson } from "@/lib/cliente/api";
import { formatarTelefone } from "@/lib/contas/telefone";
import { horaCurta, rotuloDoDia } from "@/lib/chat/formatar";
import type { ConversaAberta, MensagemChat } from "@/lib/chat/conversas";

type Props = { inicial: ConversaAberta; eu: string };

/** Junta mensagens novas/atualizadas com as que já estão na tela (pelo id), em ordem de envio. */
function juntar(atuais: MensagemChat[], novas: MensagemChat[]): MensagemChat[] {
  const porId = new Map(atuais.map((m) => [m.id, m]));
  for (const m of novas) porId.set(m.id, m);
  return [...porId.values()].sort((a, b) => a.criadaEm.localeCompare(b.criadaEm));
}

export function TelaChat({ inicial, eu }: Props) {
  const { socket, definirAberta, recarregarNaoLidas } = useChat();
  const [conversa, setConversa] = useState(inicial);
  const [mensagens, setMensagens] = useState(inicial.mensagens);
  const [temMais, setTemMais] = useState(inicial.temMais);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [proposta, setProposta] = useState<{ aberta: boolean; base: MensagemChat | null }>({ aberta: false, base: null });
  const [digitando, setDigitando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const entradaFoto = useRef<HTMLInputElement>(null);
  const ultimoDigitando = useRef(0);
  const marcarDepois = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { id, outro } = conversa;
  const primeiroNome = outro.nome.split(" ")[0];

  const recarregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/conversas/${id}`);
      const dados = await r.json();
      if (!dados.ok) return;
      setConversa(dados.conversa);
      setMensagens((atuais) => juntar(atuais, dados.conversa.mensagens));
    } catch {
      // sem internet: tenta de novo quando o socket reconectar
    }
  }, [id]);

  const marcarLida = useCallback(() => {
    if (marcarDepois.current) clearTimeout(marcarDepois.current);
    marcarDepois.current = setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      fetch(`/api/conversas/${id}/lida`, { method: "POST" })
        .then(recarregarNaoLidas)
        .catch(() => {});
    }, 400);
  }, [id, recarregarNaoLidas]);

  // Avisa a bolha/menu que esta conversa está aberta e marca como lida
  useEffect(() => {
    definirAberta({ id, nome: outro.nome });
    marcarLida();
    const aoVoltar = () => document.visibilityState === "visible" && marcarLida();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      definirAberta(null);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [id, outro.nome, definirAberta, marcarLida]);

  // Tempo real
  useEffect(() => {
    if (!socket) return;
    let pararDigitando: ReturnType<typeof setTimeout> | undefined;
    const aoChegar = (d: { conversaId: string; mensagens: MensagemChat[] }) => {
      if (d.conversaId !== id) return;
      setMensagens((atuais) => juntar(atuais, d.mensagens));
      if (d.mensagens.some((m) => m.autorId !== eu)) {
        setDigitando(false);
        marcarLida();
      }
      // "Combinado": busca o contato que acabou de liberar
      if (d.mensagens.some((m) => m.proposta?.status === "ACEITA")) recarregar();
    };
    const aoLer = (d: { conversaId: string; em: string }) => {
      if (d.conversaId === id) setConversa((c) => ({ ...c, lidaPeloOutroEm: d.em }));
    };
    const aoDigitar = (d: { conversaId: string }) => {
      if (d.conversaId !== id) return;
      setDigitando(true);
      clearTimeout(pararDigitando);
      pararDigitando = setTimeout(() => setDigitando(false), 4000);
    };
    socket.on("chat:mensagens", aoChegar);
    socket.on("chat:lida", aoLer);
    socket.on("chat:digitando", aoDigitar);
    socket.on("connect", recarregar); // voltou a internet: pega o que perdeu
    return () => {
      clearTimeout(pararDigitando);
      socket.off("chat:mensagens", aoChegar);
      socket.off("chat:lida", aoLer);
      socket.off("chat:digitando", aoDigitar);
      socket.off("connect", recarregar);
    };
  }, [socket, id, eu, marcarLida, recarregar]);

  // Desce até a última mensagem quando chega uma nova
  const ultimaId = mensagens.at(-1)?.id;
  useEffect(() => {
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fim.current?.scrollIntoView({ behavior: reduzir ? "auto" : "smooth", block: "end" });
  }, [ultimaId]);

  async function verAnteriores() {
    const primeira = mensagens[0];
    if (!primeira) return;
    try {
      const r = await fetch(`/api/conversas/${id}?antes=${encodeURIComponent(primeira.criadaEm)}`);
      const dados = await r.json();
      if (!dados.ok) return;
      setMensagens((atuais) => juntar(atuais, dados.conversa.mensagens));
      setTemMais(dados.conversa.temMais);
    } catch {
      setErro("Sem conexão. Confira sua internet e tente de novo.");
    }
  }

  async function mandar(dados: { texto?: string; fotoUrl?: string }) {
    const r = await enviarJson<{ mensagens: MensagemChat[] }>(`/api/conversas/${id}/mensagens`, "POST", dados);
    if (!r.ok) {
      setErro(r.erro);
      return false;
    }
    setMensagens((atuais) => juntar(atuais, r.dados.mensagens));
    return true;
  }

  async function enviarTexto(e: FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setErro(null);
    if (await mandar({ texto: t })) setTexto("");
    setEnviando(false);
  }

  async function enviarFoto(arquivos: FileList | null) {
    const arquivo = arquivos?.[0];
    if (entradaFoto.current) entradaFoto.current.value = "";
    if (!arquivo) return;
    if (arquivo.size > 5 * 1024 * 1024) return setErro("A foto é muito grande. Escolha uma de até 5 MB.");
    setEnviandoFoto(true);
    setErro(null);
    try {
      const corpo = new FormData();
      corpo.append("imagem", arquivo);
      const r = await fetch("/api/arquivos/imagens?pasta=chat", { method: "POST", body: corpo });
      const dados = await r.json().catch(() => ({}));
      if (!r.ok || !dados.url) setErro(dados.erro ?? "Não deu para enviar a foto. Tente de novo.");
      else await mandar({ fotoUrl: dados.url });
    } catch {
      setErro("Sem conexão. Confira sua internet e tente de novo.");
    }
    setEnviandoFoto(false);
  }

  function aoEscrever(valor: string) {
    setTexto(valor);
    const agora = Date.now();
    if (socket && valor && agora - ultimoDigitando.current > 2000) {
      ultimoDigitando.current = agora;
      socket.emit("chat:digitando", { conversaId: id });
    }
  }

  async function responder(mensagemId: string, acao: "aceitar" | "recusar") {
    setErro(null);
    const r = await enviarJson<{ mensagens: MensagemChat[] }>(`/api/conversas/${id}/propostas/${mensagemId}`, "POST", { acao });
    if (!r.ok) {
      setErro(r.erro);
      recarregar();
      return;
    }
    setMensagens((atuais) => juntar(atuais, r.dados.mensagens));
    if (acao === "aceitar") recarregar();
  }

  // "Visto" / "Enviada" só embaixo da minha última mensagem
  const minhaUltima = [...mensagens].reverse().find((m) => m.autorId === eu);
  const vista = Boolean(minhaUltima && conversa.lidaPeloOutroEm && conversa.lidaPeloOutroEm >= minhaUltima.criadaEm);

  return (
    <div className="flex flex-col gap-4">
      {/* Topo: voltar, quem é e opções */}
      <div className="flex items-center gap-2">
        <Link
          href="/conversas"
          className="flex min-h-12 items-center gap-1 rounded-xl px-2 font-extrabold text-marca-texto focus-visible:outline-3 focus-visible:outline-foco"
        >
          <ArrowLeft aria-hidden className="size-5" />
          Conversas
        </Link>
        <div className="ml-auto">
          <MenuConversa
            conversaId={id}
            nomeOutro={outro.nome}
            bloqueadoPorMim={conversa.bloqueadoPorMim}
            onBloqueioMudou={(b) => setConversa((c) => ({ ...c, bloqueadoPorMim: b, podeEnviar: !b }))}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Avatar nome={outro.nome} fotoUrl={outro.foto} tamanho={56} />
        <div className="min-w-0">
          <h1 className="text-xl leading-tight font-black break-words">{outro.nome}</h1>
          {conversa.perfilDoOutro && (
            <Link href={conversa.perfilDoOutro} className="font-bold text-marca-texto underline-offset-4 hover:underline">
              Ver perfil
            </Link>
          )}
        </div>
      </div>

      {conversa.origem && (
        <Link
          href={conversa.origem.href}
          className="rounded-2xl bg-superficie-suave px-4 py-3 focus-visible:outline-3 focus-visible:outline-foco"
        >
          <span className="text-sm font-bold text-texto-suave">{conversa.origem.tipo === "pedido" ? "Sobre o pedido" : "Sobre o anúncio"}</span>
          <span className="block truncate font-extrabold">{conversa.origem.titulo}</span>
        </Link>
      )}

      {conversa.contato && (
        <section aria-labelledby="titulo-contato" className="flex flex-col gap-2 rounded-2xl border-2 border-sucesso bg-superficie p-4">
          <h2 id="titulo-contato" className="flex items-center gap-2 font-black text-sucesso">
            <ShieldCheck aria-hidden className="size-6" /> Combinado — contato de {primeiroNome}
          </h2>
          {conversa.contato.telefone && (
            <a
              href={`tel:+55${conversa.contato.telefone}`}
              className="flex min-h-12 items-center gap-2 font-extrabold text-marca-texto underline-offset-4 hover:underline"
            >
              <Phone aria-hidden className="size-5" /> Ligar: {formatarTelefone(conversa.contato.telefone)}
            </a>
          )}
          {conversa.contato.email && <p className="font-bold break-words">Email: {conversa.contato.email}</p>}
          {conversa.contato.endereco && (
            <p className="flex gap-2 font-bold">
              <MapPin aria-hidden className="mt-0.5 size-5 shrink-0" /> {conversa.contato.endereco}
            </p>
          )}
        </section>
      )}

      {/* Mensagens */}
      <section aria-label={`Mensagens com ${primeiroNome}`} className="flex flex-col gap-2">
        {temMais && (
          <Botao variante="fantasma" onClick={verAnteriores} className="self-center">
            Ver mensagens anteriores
          </Botao>
        )}
        {mensagens.length === 0 && (
          <p className="rounded-2xl bg-superficie-suave p-4 text-center text-texto-suave">
            Diga oi para {primeiroNome}! Conte o que você precisa ou faça uma proposta.
          </p>
        )}
        <ol className="flex flex-col gap-2">
          {mensagens.map((m, i) => {
            const dia = rotuloDoDia(m.criadaEm);
            const mostraDia = i === 0 || rotuloDoDia(mensagens[i - 1].criadaEm) !== dia;
            const minha = m.autorId === eu;
            return (
              <Fragment key={m.id}>
                {mostraDia && (
                  <li className="my-2 self-center rounded-full bg-superficie-suave px-3 py-1 text-sm font-bold text-texto-suave">{dia}</li>
                )}
                <li className={`flex flex-col ${m.tipo === "SISTEMA" ? "items-center" : minha ? "items-end" : "items-start"}`}>
                  {m.tipo === "SISTEMA" ? (
                    <p className="max-w-sm rounded-2xl bg-marca-suave px-4 py-2 text-center font-bold text-marca-texto">{m.texto}</p>
                  ) : m.tipo === "PROPOSTA" ? (
                    <CartaoProposta
                      mensagem={m}
                      minha={minha}
                      nomeOutro={outro.nome}
                      podeResponder={conversa.podeEnviar}
                      onResponder={responder}
                      onNegociar={(base) => setProposta({ aberta: true, base })}
                    />
                  ) : (
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2 ${minha ? "rounded-br-md bg-botao text-texto-sobre-marca" : "rounded-bl-md bg-superficie-suave"}`}
                    >
                      <span className="sr-only">{minha ? "Você disse:" : `${primeiroNome} disse:`}</span>
                      {m.fotoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.fotoUrl} alt={minha ? "Foto que você mandou" : `Foto que ${primeiroNome} mandou`} className="my-1 max-h-72 rounded-xl object-cover" />
                      )}
                      {m.texto && <p className="break-words whitespace-pre-wrap">{m.texto}</p>}
                    </div>
                  )}
                  {m.tipo !== "SISTEMA" && <span className="mt-0.5 px-1 text-sm text-texto-suave">{horaCurta(m.criadaEm)}</span>}
                  {m.id === minhaUltima?.id && (
                    <span className="flex items-center gap-1 px-1 text-sm font-bold text-texto-suave">
                      {vista ? <CheckCheck aria-hidden className="size-4 text-sucesso" /> : <Check aria-hidden className="size-4" />}
                      {vista ? "Visto" : "Enviada"}
                    </span>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
        <p aria-live="polite" className="min-h-6 px-1 text-sm font-bold text-texto-suave">
          {digitando ? `${primeiroNome} está digitando…` : ""}
        </p>
        <div ref={fim} />
      </section>

      {/* Escrever */}
      {!conversa.podeEnviar ? (
        <p role="status" className="rounded-2xl bg-superficie-suave p-4 text-center font-bold">
          {conversa.bloqueadoPorMim
            ? `Você bloqueou ${primeiroNome}. Para conversar de novo, toque em Opções e depois em Desbloquear.`
            : "Não é possível mandar mensagem nessa conversa."}
        </p>
      ) : proposta.aberta ? (
        <FormProposta
          conversaId={id}
          base={proposta.base}
          onCancelar={() => setProposta({ aberta: false, base: null })}
          onEnviada={(novas) => {
            setMensagens((atuais) => juntar(atuais, novas));
            setProposta({ aberta: false, base: null });
          }}
        />
      ) : (
        <form
          onSubmit={enviarTexto}
          className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] flex flex-col gap-2 rounded-2xl bg-superficie p-2 shadow-lg ring-1 ring-borda md:bottom-2"
        >
          <div className="grid grid-cols-2 gap-2">
            <Botao variante="secundario" icone={enviandoFoto ? Loader2 : Camera} disabled={enviandoFoto} onClick={() => entradaFoto.current?.click()}>
              {enviandoFoto ? "Enviando…" : "Foto"}
            </Botao>
            <Botao variante="secundario" icone={HandCoins} onClick={() => setProposta({ aberta: true, base: null })}>
              Proposta
            </Botao>
          </div>
          <input ref={entradaFoto} type="file" accept="image/*" className="hidden" onChange={(e) => enviarFoto(e.target.files)} aria-hidden tabIndex={-1} />
          <label htmlFor="texto-mensagem" className="px-1 text-sm font-bold text-texto-suave">
            Escreva sua mensagem
          </label>
          <div className="flex items-end gap-2">
            <textarea
              id="texto-mensagem"
              value={texto}
              onChange={(e) => aoEscrever(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={2000}
              className="max-h-40 min-h-12 flex-1 resize-none rounded-2xl border-2 border-borda bg-superficie px-4 py-2.5 focus-visible:border-foco focus-visible:outline-none"
            />
            <Botao type="submit" icone={Send} carregando={enviando} disabled={!texto.trim()}>
              Enviar
            </Botao>
          </div>
        </form>
      )}
      {erro && (
        <p role="alert" className="rounded-2xl bg-superficie-suave p-3 font-bold text-urgencia">
          {erro}
        </p>
      )}
    </div>
  );
}
