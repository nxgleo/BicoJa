"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Siren } from "lucide-react";
import { Botao } from "@/components/ui";
import { Voltar } from "@/components/conta/Voltar";
import { FormEndereco } from "@/components/endereco/FormEndereco";
import { SeletorCategoria } from "./SeletorCategoria";
import { SeletorQuando } from "./SeletorQuando";
import { EnviarImagens } from "./EnviarImagens";
import { enviarJson, focarCampo } from "@/lib/cliente/api";
import type { CategoriaId } from "@/lib/categorias";
import type { EnderecoCompleto } from "@/lib/enderecos";
import type { Quando } from "@/lib/pedidos/esquemas";

type Erros = Partial<Record<"categoria" | "descricao" | "fotos" | "geral", string>> & {
  quando?: Partial<Record<"dataInicio" | "dataFim" | "horaInicio" | "horaFim", string>>;
};

type Props = { urgente: boolean; endereco: EnderecoCompleto | null; categoriaInicial?: CategoriaId | null };

/** Publicar pedido (normal) ou "Preciso de ajuda agora" (urgente). */
export function FormPedido({ urgente, endereco: enderecoInicial, categoriaInicial = null }: Props) {
  const router = useRouter();
  const [endereco, setEndereco] = useState(enderecoInicial);
  const [mudandoEndereco, setMudandoEndereco] = useState(!enderecoInicial);
  const [categoria, setCategoria] = useState<CategoriaId | null>(categoriaInicial);
  const [descricao, setDescricao] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [quando, setQuando] = useState<Quando>({ tipo: "QUALQUER_DIA" });
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);

  async function publicar(e: FormEvent) {
    e.preventDefault();
    if (!categoria) {
      setErros({ categoria: "Escolha o tipo de serviço." });
      return;
    }
    setEnviando(true);
    setErros({});
    const r = await enviarJson<{ id: string }>("/api/pedidos", "POST", { categoria, descricao, fotos, urgente, quando });
    if (!r.ok) {
      setEnviando(false);
      const campo = r.campo ?? "geral";
      if (campo.startsWith("quando.")) {
        const sub = campo.slice("quando.".length);
        setErros({ quando: { [sub]: r.erro } });
        focarCampo(`quando-${sub}`);
      } else if (campo === "endereco") {
        setMudandoEndereco(true);
        setErros({ geral: r.erro });
      } else {
        setErros({ [campo]: r.erro });
        focarCampo(campo === "descricao" ? "descricao" : undefined);
      }
      return;
    }
    router.push(`/pedidos/${r.dados.id}?novo=1`);
    router.refresh();
  }

  if (mudandoEndereco) {
    return (
      <div className="flex flex-col gap-5">
        <Voltar href={enderecoInicial ? undefined : "/"} onClick={enderecoInicial ? () => setMudandoEndereco(false) : undefined} />
        <h1 className="text-[1.6rem] leading-tight font-black">Onde vai ser o serviço?</h1>
        <p className="text-texto-suave">Vamos guardar no seu perfil para os próximos pedidos.</p>
        {erros.geral && <p role="alert" className="font-bold text-urgencia">{erros.geral}</p>}
        <FormEndereco
          inicial={endereco}
          textoBotao="Continuar"
          onSalvo={(novo) => {
            setEndereco(novo);
            setMudandoEndereco(false);
            setErros({});
          }}
        />
      </div>
    );
  }

  return (
    <form onSubmit={publicar} noValidate className="flex flex-col gap-6">
      <Voltar href="/" />
      {urgente ? (
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-urgencia/15">
            <Siren aria-hidden className="size-7 text-urgencia" />
          </span>
          <div>
            <h1 className="text-[1.6rem] leading-tight font-black">Preciso de ajuda agora</h1>
            <p className="text-texto-suave">Avisamos quem está disponível perto. Fica nos urgentes por 3 horas.</p>
          </div>
        </div>
      ) : (
        <h1 className="text-[1.6rem] leading-tight font-black">Publicar meu pedido</h1>
      )}

      <SeletorCategoria valor={categoria} onChange={(c) => { setCategoria(c); setErros({}); }} erro={erros.categoria} rotulo={urgente ? "Qual o problema?" : "Que tipo de serviço?"} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="descricao" className="font-bold">{urgente ? "Conte rapidinho" : "O que está acontecendo?"}</label>
        <textarea
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          maxLength={500}
          rows={urgente ? 3 : 4}
          placeholder={urgente ? "Ex: Cano estourou, está alagando a cozinha." : "Ex: A pia da cozinha está vazando embaixo, perto do cano."}
          aria-invalid={erros.descricao ? true : undefined}
          aria-describedby={erros.descricao ? "descricao-erro" : undefined}
          className={`rounded-2xl border-2 bg-superficie-suave px-4 py-3 text-base text-texto placeholder:text-texto-suave focus:border-foco focus:bg-superficie focus:outline-none ${
            erros.descricao ? "border-urgencia" : "border-transparent"
          }`}
        />
        <div className="flex justify-between text-sm">
          {erros.descricao ? <p id="descricao-erro" role="alert" className="font-bold text-urgencia">{erros.descricao}</p> : <span />}
          <span className="text-texto-suave">{descricao.length}/500</span>
        </div>
      </div>

      <EnviarImagens pasta="pedidos" maximo={urgente ? 1 : 3} valor={fotos} onChange={setFotos} rotulo={urgente ? "Foto" : "Fotos do problema"} erro={erros.fotos} />

      {!urgente && <SeletorQuando valor={quando} onChange={setQuando} erros={erros.quando} />}

      {endereco && (
        <div className="flex flex-col gap-2">
          <p className="font-bold">Endereço</p>
          <div className="flex items-start gap-3 rounded-2xl bg-superficie-suave p-4">
            <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-marca-texto" />
            <p className="flex-1 break-words">
              {endereco.rua}, {endereco.numero} · {endereco.bairro}
              <span className="block text-sm text-texto-suave">🔒 Prestadores só veem o bairro até vocês combinarem.</span>
            </p>
            <button type="button" onClick={() => setMudandoEndereco(true)} aria-label="Mudar endereço" className="flex size-12 items-center justify-center rounded-xl text-marca-texto focus-visible:outline-3 focus-visible:outline-foco">
              <Pencil aria-hidden className="size-5" />
            </button>
          </div>
        </div>
      )}

      {erros.geral && <p role="alert" className="font-bold text-urgencia">{erros.geral}</p>}

      <Botao type="submit" larguraTotal tamanho="grande" variante={urgente ? "urgente" : "principal"} carregando={enviando}>
        {urgente ? "Pedir ajuda agora" : "Publicar pedido"}
      </Botao>
    </form>
  );
}
