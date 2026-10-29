"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Banknote, CheckCircle2, Copy, CreditCard, MessageCircle, QrCode, ShieldCheck, Star, XCircle } from "lucide-react";
import { Avatar, Botao, Campo } from "@/components/ui";
import { useChat } from "@/components/chat/ProvedorChat";
import { enviarJson, focarCampo } from "@/lib/cliente/api";
import { formatarPreco } from "@/lib/formatar";
import { textoQuando } from "@/lib/pedidos/formatar";
import { MOTIVOS_CANCELAMENTO } from "@/lib/contratos/esquemas";
import type { DetalheContrato } from "@/lib/contratos/contratos";

const DIA_MES = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
// Código de exemplo: o PIX ainda é de teste (o Mercado Pago entra depois)
const PIX_DE_TESTE = "00020126BR.GOV.BCB.PIX-TESTE-BICOJA-NAO-PAGUE";

function Aviso({ children, tom = "neutro" }: { children: React.ReactNode; tom?: "neutro" | "sucesso" | "teste" }) {
  const cores = { neutro: "bg-superficie-suave", sucesso: "border-2 border-sucesso bg-superficie", teste: "border-2 border-dashed border-marca bg-marca-suave" };
  return <div className={`flex flex-col gap-2 rounded-2xl p-4 ${cores[tom]}`}>{children}</div>;
}

function Erro({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="font-bold text-urgencia">
      {texto}
    </p>
  );
}

/** Cliente escolhe: PIX, cartão (ambos de teste, com valor guardado) ou pagar direto. */
function EscolherPagamento({ c, onPronto }: { c: DetalheContrato; onPronto: () => void }) {
  const [escolha, setEscolha] = useState<"PIX" | "CARTAO" | "DIRETO" | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const nome = c.outro.nome.split(" ")[0];
  const valor = formatarPreco(c.valor);

  async function confirmar() {
    if (!escolha) return;
    setEnviando(true);
    setErro(null);
    const r = await enviarJson(`/api/contratos/${c.id}/pagamento`, "POST", { metodo: escolha });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    onPronto();
  }

  const opcoes = [
    { id: "PIX" as const, icone: QrCode, titulo: "PIX pelo app", texto: "Pagamento protegido: o valor fica guardado e só vai para o prestador quando o serviço terminar." },
    { id: "CARTAO" as const, icone: CreditCard, titulo: "Cartão pelo app", texto: "Pagamento protegido: se o serviço for cancelado, o valor volta para você." },
    { id: "DIRETO" as const, icone: Banknote, titulo: "Vou pagar direto", texto: `Dinheiro ou PIX direto para ${nome}. O app só anota.` },
  ];

  return (
    <section aria-labelledby="titulo-pagar" className="flex flex-col gap-3">
      <h2 id="titulo-pagar" className="text-xl font-black">
        Como você quer pagar {valor}?
      </h2>
      <div role="radiogroup" aria-labelledby="titulo-pagar" className="flex flex-col gap-2">
        {opcoes.map(({ id, icone: Icone, titulo, texto }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={escolha === id}
            onClick={() => setEscolha(id)}
            className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-foco ${
              escolha === id ? "border-marca bg-marca-suave" : "border-borda bg-superficie"
            }`}
          >
            <Icone aria-hidden className="mt-0.5 size-6 shrink-0 text-marca-texto" />
            <span>
              <span className="block font-extrabold">{titulo}</span>
              <span className="text-texto-suave">{texto}</span>
            </span>
          </button>
        ))}
      </div>

      {escolha === "PIX" && (
        <Aviso tom="teste">
          <p className="font-black">Pagamento de teste</p>
          <p>Ainda não tem dinheiro de verdade no BicoJá. Este código é só um exemplo — não pague nada com ele.</p>
          <code className="rounded-xl bg-superficie p-3 text-sm break-all">{PIX_DE_TESTE}</code>
          <Botao
            variante="secundario"
            icone={Copy}
            onClick={() => {
              navigator.clipboard?.writeText(PIX_DE_TESTE).then(() => setCopiado(true), () => {});
            }}
          >
            {copiado ? "Copiado" : "Copiar código"}
          </Botao>
          <Botao larguraTotal carregando={enviando} onClick={confirmar}>
            Já paguei (teste)
          </Botao>
        </Aviso>
      )}
      {escolha === "CARTAO" && (
        <Aviso tom="teste">
          <p className="font-black">Pagamento de teste</p>
          <p>Ainda não tem dinheiro de verdade no BicoJá, então não pedimos os dados do seu cartão.</p>
          <Botao larguraTotal carregando={enviando} onClick={confirmar}>
            Pagar {valor} (teste)
          </Botao>
        </Aviso>
      )}
      {escolha === "DIRETO" && (
        <Aviso>
          <p>Você combina o pagamento direto com {nome}. Se der problema, o BicoJá não consegue devolver o dinheiro.</p>
          <Botao larguraTotal carregando={enviando} onClick={confirmar}>
            Confirmar: vou pagar direto
          </Botao>
        </Aviso>
      )}
      <Erro texto={erro} />
    </section>
  );
}

/** Prestador digita o código que o cliente mostrou. */
function DigitarCodigo({ c, onPronto }: { c: DetalheContrato; onPronto: () => void }) {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function concluir(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(codigo)) {
      setErro("O código tem 4 números.");
      return focarCampo("codigo-conclusao");
    }
    setEnviando(true);
    setErro(null);
    const r = await enviarJson(`/api/contratos/${c.id}/concluir`, "POST", { codigo });
    setEnviando(false);
    if (!r.ok) {
      setErro(r.erro);
      return focarCampo("codigo-conclusao");
    }
    onPronto();
  }

  return (
    <form onSubmit={concluir} noValidate className="flex flex-col gap-3 rounded-2xl border-2 border-marca bg-superficie p-4">
      <h2 className="text-xl font-black">Terminou o serviço?</h2>
      <p className="text-texto-suave">Peça para {c.outro.nome.split(" ")[0]} mostrar o código no celular e digite aqui.</p>
      <Campo
        id="codigo-conclusao"
        rotulo="Código do cliente (4 números)"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={4}
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
        erro={erro ?? undefined}
      />
      <Botao type="submit" tamanho="grande" larguraTotal carregando={enviando} icone={CheckCircle2}>
        Concluir serviço
      </Botao>
    </form>
  );
}

/** Cancelar (com motivo) ou "Não aconteceu". */
function Cancelar({ c, onPronto }: { c: DetalheContrato; onPronto: () => void }) {
  const [aberto, setAberto] = useState<"cancelar" | "nao_aconteceu" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const devolve = c.statusPagamento === "RETIDO";

  async function enviar(m: string) {
    if (!m) return setErro("Escolha o motivo.");
    setEnviando(true);
    setErro(null);
    const r = await enviarJson(`/api/contratos/${c.id}/cancelar`, "POST", { motivo: m });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    onPronto();
  }

  if (!aberto) {
    return (
      <div className="flex flex-col gap-2">
        {c.podeNaoAconteceu && (
          <Botao variante="urgente" larguraTotal onClick={() => setAberto("nao_aconteceu")}>
            Não aconteceu
          </Botao>
        )}
        <Botao variante="fantasma" icone={XCircle} larguraTotal onClick={() => setAberto("cancelar")}>
          Cancelar serviço
        </Botao>
      </div>
    );
  }

  return (
    <Aviso>
      {aberto === "nao_aconteceu" ? (
        <>
          <p className="font-black">O serviço não aconteceu?</p>
          <p>O serviço será cancelado{devolve ? " e o valor volta para você" : ""}.</p>
          <Botao variante="urgente" larguraTotal carregando={enviando} onClick={() => enviar("nao_aconteceu")}>
            Sim, não aconteceu
          </Botao>
        </>
      ) : (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-black">Por que cancelar?</legend>
          {Object.entries(MOTIVOS_CANCELAMENTO).map(([id, rotulo]) => (
            <label key={id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-superficie px-3 font-bold">
              <input type="radio" name="motivo-cancelar" value={id} checked={motivo === id} onChange={() => setMotivo(id)} className="size-5 accent-botao" />
              {rotulo}
            </label>
          ))}
          {devolve && <p className="text-texto-suave">O valor de {formatarPreco(c.valor)} volta para o cliente.</p>}
          <Botao variante="urgente" larguraTotal carregando={enviando} onClick={() => enviar(motivo)}>
            Cancelar serviço
          </Botao>
        </fieldset>
      )}
      <Botao variante="secundario" larguraTotal disabled={enviando} onClick={() => setAberto(null)}>
        Voltar
      </Botao>
      <Erro texto={erro} />
    </Aviso>
  );
}

/** Estrelas de 1 a 5 + comentário. */
function Avaliar({ c, onPronto }: { c: DetalheContrato; onPronto: () => void }) {
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const nome = c.outro.nome.split(" ")[0];
  const rotulos = ["", "Muito ruim", "Ruim", "Mais ou menos", "Bom", "Ótimo"];

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nota) return setErro("Escolha de 1 a 5 estrelas.");
    setEnviando(true);
    setErro(null);
    const r = await enviarJson(`/api/contratos/${c.id}/avaliacao`, "POST", { nota, comentario: comentario || undefined });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    onPronto();
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-3 rounded-2xl border-2 border-marca bg-superficie p-4">
      <fieldset>
        <legend className="mb-2 text-xl font-black">Como foi com {nome}?</legend>
        <div role="radiogroup" aria-label={`Nota para ${nome}`} className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={nota === n}
              aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}: ${rotulos[n]}`}
              onClick={() => setNota(n)}
              className="flex size-12 items-center justify-center rounded-xl focus-visible:outline-3 focus-visible:outline-foco"
            >
              <Star aria-hidden className={`size-9 transition-transform duration-200 ${n <= nota ? "scale-110 fill-marca text-marca" : "text-texto-suave"}`} />
            </button>
          ))}
        </div>
        <p aria-live="polite" className="mt-1 min-h-6 font-bold">
          {rotulos[nota]}
        </p>
      </fieldset>
      <label htmlFor="comentario-avaliacao" className="font-bold">
        Quer contar mais? (opcional)
      </label>
      <textarea
        id="comentario-avaliacao"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        maxLength={500}
        rows={3}
        className="rounded-2xl border-2 border-borda bg-superficie p-3 focus-visible:border-foco focus-visible:outline-none"
      />
      <Botao type="submit" larguraTotal carregando={enviando}>
        Enviar avaliação
      </Botao>
      <Erro texto={erro} />
    </form>
  );
}

const TITULO_STATUS = { COMBINADO: "Combinado", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" } as const;

export function TelaContrato({ inicial }: { inicial: DetalheContrato }) {
  const { socket } = useChat();
  const [c, setC] = useState(inicial);

  const recarregar = useCallback(async () => {
    try {
      const dados = await (await fetch(`/api/contratos/${inicial.id}`)).json();
      if (dados.ok) setC(dados.contrato);
    } catch {
      // sem internet: mantém o que está na tela
    }
  }, [inicial.id]);

  useEffect(() => {
    if (!socket) return;
    const aoMudar = (d: { contratoId: string }) => d.contratoId === inicial.id && recarregar();
    socket.on("contrato:mudou", aoMudar);
    socket.on("connect", recarregar);
    return () => {
      socket.off("contrato:mudou", aoMudar);
      socket.off("connect", recarregar);
    };
  }, [socket, inicial.id, recarregar]);

  const nome = c.outro.nome.split(" ")[0];
  const combinado = c.status === "COMBINADO";
  const pendente = c.statusPagamento === "PENDENTE";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-3">
        <Avatar nome={c.outro.nome} fotoUrl={c.outro.foto} tamanho={60} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-texto-suave">{c.papel === "cliente" ? "Serviço com" : "Serviço para"}</p>
          <h1 className="text-[1.5rem] leading-tight font-black break-words">{c.outro.nome}</h1>
        </div>
      </header>

      <div className="flex flex-col gap-1 rounded-2xl bg-superficie-suave p-4">
        <p className="text-3xl font-black">{formatarPreco(c.valor)}</p>
        <p className="font-bold">{textoQuando(c.quando)}</p>
        <p
          className={`mt-1 flex items-center gap-2 font-extrabold ${
            c.status === "CONCLUIDO" ? "text-sucesso" : c.status === "CANCELADO" ? "text-urgencia" : "text-marca-texto"
          }`}
        >
          {c.status === "CONCLUIDO" ? <CheckCircle2 aria-hidden className="size-5" /> : c.status === "CANCELADO" ? <XCircle aria-hidden className="size-5" /> : null}
          {TITULO_STATUS[c.status]}
        </p>
      </div>

      {/* Pagamento */}
      {combinado && c.papel === "cliente" && pendente && <EscolherPagamento c={c} onPronto={recarregar} />}
      {combinado && c.papel === "prestador" && pendente && <Aviso>Esperando {nome} escolher como pagar. Depois disso aparece o código.</Aviso>}
      {!pendente && (
        <Aviso tom={c.statusPagamento === "RETIDO" || c.statusPagamento === "LIBERADO" ? "sucesso" : "neutro"}>
          <p className="flex items-center gap-2 font-bold">
            <ShieldCheck aria-hidden className="size-5 shrink-0" />
            {c.statusPagamento === "RETIDO" && `Pagamento protegido: ${formatarPreco(c.valor)} guardado pelo app até o serviço terminar.`}
            {c.statusPagamento === "LIBERADO" && `${formatarPreco(c.valor - c.taxaValor)} liberado para ${c.papel === "prestador" ? "você" : nome}.`}
            {c.statusPagamento === "ESTORNADO" && `${formatarPreco(c.valor)} devolvido para ${c.papel === "cliente" ? "você" : nome}.`}
            {c.statusPagamento === "DIRETO" && `Pagamento combinado direto entre vocês.`}
          </p>
          {(c.metodoPagamento === "PIX" || c.metodoPagamento === "CARTAO") && <p className="text-sm text-texto-suave">Pagamento de teste — nenhum dinheiro de verdade.</p>}
        </Aviso>
      )}

      {/* Código */}
      {combinado && c.papel === "cliente" && c.codigo && (
        <section aria-labelledby="titulo-codigo" className="flex flex-col items-center gap-2 rounded-2xl border-2 border-marca bg-superficie p-5 text-center">
          <h2 id="titulo-codigo" className="font-black">
            Seu código de conclusão
          </h2>
          <p className="text-5xl font-black tracking-[0.3em]" aria-label={`Código ${c.codigo.split("").join(" ")}`}>
            {c.codigo}
          </p>
          <p className="text-texto-suave">Mostre para {nome} só quando o serviço terminar.</p>
        </section>
      )}
      {combinado && c.papel === "prestador" && !pendente && <DigitarCodigo c={c} onPronto={recarregar} />}

      {combinado && c.liberaEm && (
        <p className="text-sm text-texto-suave">
          Se ninguém fizer nada, o serviço é dado como concluído em {DIA_MES.format(new Date(c.liberaEm))}.
        </p>
      )}
      {combinado && <Cancelar c={c} onPronto={recarregar} />}

      {c.status === "CANCELADO" && c.motivoCancelamento && (
        <Aviso>
          {c.canceladoPorMim ? "Você cancelou" : `${nome} cancelou`}. Motivo: {c.motivoCancelamento}.
        </Aviso>
      )}

      {/* Avaliação */}
      {c.status === "CONCLUIDO" && !c.minhaAvaliacao && <Avaliar c={c} onPronto={recarregar} />}
      {c.minhaAvaliacao && (
        <Aviso tom="sucesso">
          <p className="font-bold">Obrigado! Você deu {c.minhaAvaliacao.nota} {c.minhaAvaliacao.nota === 1 ? "estrela" : "estrelas"} para {nome}.</p>
        </Aviso>
      )}

      <Link
        href={`/conversas/${c.conversaId}`}
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-superficie-suave font-extrabold focus-visible:outline-3 focus-visible:outline-foco"
      >
        <MessageCircle aria-hidden className="size-5" />
        Abrir conversa com {nome}
      </Link>
    </div>
  );
}
