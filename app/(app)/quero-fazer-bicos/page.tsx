"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check } from "lucide-react";
import { Botao, Campo } from "@/components/ui";
import { BarraProgresso } from "@/components/conta/BarraProgresso";
import { Voltar } from "@/components/conta/Voltar";
import { enviarJson, focarCampo } from "@/lib/cliente/api";
import { CATEGORIAS, type CategoriaId } from "@/lib/categorias";

const RAIOS = [5, 10, 20, 30];
type Erros = Partial<Record<"categorias" | "bairro" | "cidade" | "precoBase" | "bio" | "geral", string>>;

export default function QueroFazerBicos() {
  const router = useRouter();
  const { update } = useSession();
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [categorias, setCategorias] = useState<CategoriaId[]>([]);
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("Belém");
  const [raioKm, setRaioKm] = useState(10);
  const [preco, setPreco] = useState("");
  const [combinar, setCombinar] = useState(false);
  const [bio, setBio] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);

  function alternar(id: CategoriaId) {
    setErros({});
    setCategorias((atual) =>
      atual.includes(id) ? atual.filter((c) => c !== id) : atual.length >= 5 ? atual : [...atual, id]
    );
  }

  function irParaRegiao() {
    if (categorias.length === 0) {
      setErros({ categorias: "Escolha pelo menos um serviço." });
      return;
    }
    setPasso(2);
  }

  function irParaPreco(e: FormEvent) {
    e.preventDefault();
    if (bairro.trim().length < 2) {
      setErros({ bairro: "Escreva seu bairro." });
      focarCampo("bairro");
      return;
    }
    if (cidade.trim().length < 2) {
      setErros({ cidade: "Escreva sua cidade." });
      focarCampo("cidade");
      return;
    }
    setErros({});
    setPasso(3);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const precoBase = combinar || !preco ? undefined : Number(preco.replace(",", "."));
    if (precoBase !== undefined && (Number.isNaN(precoBase) || precoBase < 0)) {
      setErros({ precoBase: "Escreva só o valor, por exemplo 80 ou 80,50." });
      focarCampo("precoBase");
      return;
    }
    setSalvando(true);
    setErros({});
    const r = await enviarJson("/api/contas/prestador", "PUT", {
      categorias,
      bairro,
      cidade,
      raioKm,
      precoBase,
      bio: bio.trim() || undefined,
    });
    if (!r.ok) {
      setSalvando(false);
      const campo = (r.campo as keyof Erros | undefined) ?? "geral";
      setErros({ [campo]: r.erro });
      if (campo === "bairro" || campo === "cidade") setPasso(2);
      focarCampo(campo);
      return;
    }
    await update();
    router.push("/perfil");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {passo === 1 ? <Voltar href="/perfil" /> : <Voltar onClick={() => setPasso((p) => (p - 1) as 1 | 2)} />}
      <BarraProgresso passo={passo} total={3} />

      {passo === 1 && (
        <>
          <h1 className="text-[1.6rem] leading-tight font-black">Que serviços você faz?</h1>
          <p className="text-texto-suave">Escolha até 5. Pode mudar depois.</p>
          <div role="group" aria-label="Serviços" className="flex flex-wrap gap-2">
            {CATEGORIAS.map(({ id, nome, icone: Icone }) => {
              const marcado = categorias.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={marcado}
                  onClick={() => alternar(id)}
                  className={`inline-flex min-h-12 items-center gap-2 rounded-full border-2 px-4 font-extrabold transition-all duration-200 active:scale-[0.97] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco ${
                    marcado ? "border-botao bg-botao text-texto-sobre-marca" : "border-transparent bg-marca-suave text-marca-texto"
                  }`}
                >
                  {marcado ? <Check aria-hidden className="size-5" /> : <Icone aria-hidden className="size-5" />}
                  {nome}
                </button>
              );
            })}
          </div>
          {erros.categorias && <p role="alert" className="font-bold text-urgencia">{erros.categorias}</p>}
          <Botao larguraTotal tamanho="grande" onClick={irParaRegiao}>Continuar</Botao>
        </>
      )}

      {passo === 2 && (
        <form onSubmit={irParaPreco} noValidate className="flex flex-col gap-5">
          <h1 className="text-[1.6rem] leading-tight font-black">Onde você atende?</h1>
          <Campo id="bairro" rotulo="Seu bairro" autoComplete="address-level3" value={bairro} onChange={(e) => setBairro(e.target.value)} erro={erros.bairro} maxLength={60} />
          <Campo id="cidade" rotulo="Cidade" autoComplete="address-level2" value={cidade} onChange={(e) => setCidade(e.target.value)} erro={erros.cidade} maxLength={60} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-bold">Até que distância você vai?</legend>
            <div className="grid grid-cols-4 gap-2">
              {RAIOS.map((km) => (
                <button
                  key={km}
                  type="button"
                  aria-pressed={raioKm === km}
                  onClick={() => setRaioKm(km)}
                  className={`min-h-12 rounded-2xl border-2 font-extrabold transition-all duration-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco ${
                    raioKm === km ? "border-botao bg-marca-suave text-marca-texto" : "border-borda bg-superficie"
                  }`}
                >
                  {km} km
                </button>
              ))}
            </div>
          </fieldset>
          <Botao type="submit" larguraTotal tamanho="grande">Continuar</Botao>
        </form>
      )}

      {passo === 3 && (
        <form onSubmit={salvar} noValidate className="flex flex-col gap-5">
          <h1 className="text-[1.6rem] leading-tight font-black">Quanto você cobra?</h1>
          <p className="text-texto-suave">Um valor inicial ajuda o cliente a decidir. O preço final vocês combinam na conversa.</p>
          {!combinar && (
            <Campo
              id="precoBase"
              rotulo="A partir de (R$)"
              inputMode="decimal"
              placeholder="Ex: 80"
              value={preco}
              onChange={(e) => setPreco(e.target.value.replace(/[^\d,.]/g, ""))}
              erro={erros.precoBase}
              maxLength={9}
            />
          )}
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl bg-superficie-suave px-4 font-bold">
            <input type="checkbox" checked={combinar} onChange={(e) => setCombinar(e.target.checked)} className="size-5 accent-[var(--cor-botao)]" />
            Prefiro combinar o preço na conversa
          </label>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bio" className="font-bold">Conte um pouco sobre você (opcional)</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Ex: Trabalho com pintura há 8 anos, faço textura e grafiato."
              className="rounded-2xl border-2 border-transparent bg-superficie-suave px-4 py-3 text-base text-texto placeholder:text-texto-suave focus:border-foco focus:bg-superficie focus:outline-none"
            />
            <p className="text-right text-sm text-texto-suave">{bio.length}/300</p>
          </div>
          {erros.geral && <p role="alert" className="font-bold text-urgencia">{erros.geral}</p>}
          <Botao type="submit" larguraTotal tamanho="grande" carregando={salvando}>Começar a fazer bicos</Botao>
        </form>
      )}
    </div>
  );
}
