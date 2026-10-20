"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Botao, Campo } from "@/components/ui";
import { Voltar } from "@/components/conta/Voltar";
import { SeletorCategoria } from "@/components/pedidos/SeletorCategoria";
import { EnviarImagens } from "@/components/pedidos/EnviarImagens";
import { enviarJson, focarCampo } from "@/lib/cliente/api";
import type { CategoriaId } from "@/lib/categorias";

type Inicial = { id: string; titulo: string; categoria: string; descricao: string; preco: number; fotos: string[] };
type Erros = Partial<Record<"titulo" | "categoria" | "descricao" | "preco" | "fotos" | "geral", string>>;

/** Criar ou editar anúncio. Categorias limitadas às do perfil do prestador. */
export function FormAnuncio({ categoriasDoPerfil, inicial }: { categoriasDoPerfil: string[]; inicial?: Inicial }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [categoria, setCategoria] = useState<CategoriaId | null>(
    (inicial?.categoria as CategoriaId) ?? (categoriasDoPerfil.length === 1 ? (categoriasDoPerfil[0] as CategoriaId) : null)
  );
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [preco, setPreco] = useState(inicial && inicial.preco > 0 ? String(inicial.preco).replace(".", ",") : "");
  const [combinar, setCombinar] = useState(inicial ? inicial.preco === 0 : false);
  const [fotos, setFotos] = useState<string[]>(inicial?.fotos ?? []);
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!categoria) {
      setErros({ categoria: "Escolha a categoria." });
      return;
    }
    const valor = combinar || !preco ? undefined : Number(preco.replace(",", "."));
    if (valor !== undefined && (Number.isNaN(valor) || valor < 0)) {
      setErros({ preco: "Escreva só o valor, por exemplo 80 ou 80,50." });
      focarCampo("preco");
      return;
    }
    setSalvando(true);
    setErros({});
    const corpo = { titulo, categoria, descricao, preco: valor, fotos };
    const r = inicial
      ? await enviarJson(`/api/anuncios/${inicial.id}`, "PATCH", corpo)
      : await enviarJson("/api/anuncios", "POST", corpo);
    if (!r.ok) {
      setSalvando(false);
      const campo = (r.campo as keyof Erros | undefined) ?? "geral";
      setErros({ [campo]: r.erro });
      focarCampo(campo === "titulo" || campo === "preco" ? campo : campo === "descricao" ? "descricao-anuncio" : undefined);
      return;
    }
    router.push("/prestador/anuncios");
    router.refresh();
  }

  return (
    <form onSubmit={salvar} noValidate className="flex flex-col gap-6">
      <Voltar href="/prestador/anuncios" />
      <h1 className="text-[1.6rem] leading-tight font-black">{inicial ? "Editar anúncio" : "Novo anúncio"}</h1>

      <Campo id="titulo" rotulo="Título" placeholder="Ex: Conserto de vazamentos e torneiras" value={titulo} onChange={(e) => setTitulo(e.target.value)} erro={erros.titulo} maxLength={80} />

      <SeletorCategoria valor={categoria} onChange={setCategoria} erro={erros.categoria} apenas={categoriasDoPerfil} rotulo="Categoria" />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="descricao-anuncio" className="font-bold">Descrição</label>
        <textarea
          id="descricao-anuncio"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          maxLength={800}
          rows={5}
          placeholder="Conte o que você faz, há quanto tempo e o que está incluído."
          aria-invalid={erros.descricao ? true : undefined}
          className={`rounded-2xl border-2 bg-superficie-suave px-4 py-3 text-base text-texto placeholder:text-texto-suave focus:border-foco focus:bg-superficie focus:outline-none ${
            erros.descricao ? "border-urgencia" : "border-transparent"
          }`}
        />
        <div className="flex justify-between text-sm">
          {erros.descricao ? <p role="alert" className="font-bold text-urgencia">{erros.descricao}</p> : <span />}
          <span className="text-texto-suave">{descricao.length}/800</span>
        </div>
      </div>

      <EnviarImagens pasta="anuncios" maximo={5} valor={fotos} onChange={setFotos} rotulo="Fotos de trabalhos que você fez" erro={erros.fotos} />

      <div className="flex flex-col gap-3">
        {!combinar && (
          <Campo id="preco" rotulo="Preço inicial (R$)" inputMode="decimal" placeholder="Ex: 80" value={preco} onChange={(e) => setPreco(e.target.value.replace(/[^\d,.]/g, ""))} erro={erros.preco} maxLength={9} />
        )}
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl bg-superficie-suave px-4 font-bold">
          <input type="checkbox" checked={combinar} onChange={(e) => setCombinar(e.target.checked)} className="size-5 accent-[var(--cor-botao)]" />
          Prefiro combinar o preço na conversa
        </label>
      </div>

      {erros.geral && <p role="alert" className="font-bold text-urgencia">{erros.geral}</p>}
      <Botao type="submit" larguraTotal tamanho="grande" carregando={salvando}>
        {inicial ? "Salvar mudanças" : "Publicar anúncio"}
      </Botao>
    </form>
  );
}
