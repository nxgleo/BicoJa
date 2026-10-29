"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { Botao, Campo } from "@/components/ui";
import { BarraProgresso } from "@/components/conta/BarraProgresso";
import { CampoSenha } from "@/components/conta/CampoSenha";
import { CampoTelefone } from "@/components/conta/CampoTelefone";
import { EscolhaModo } from "@/components/conta/EscolhaModo";
import { Voltar } from "@/components/conta/Voltar";
import { enviarJson, focarCampo } from "@/lib/cliente/api";
import type { Escolha } from "@/lib/contas/esquemas";

type Erros = Partial<Record<"nome" | "email" | "telefone" | "senha" | "geral", string>>;

// Passos 1 (escolha) e 2 (dados). A conta é criada no fim do passo 2;
// os passos 3 (código) e 4 (foto) ficam em telas próprias, para continuar de onde parou.
export function FormCadastro({ confirmarEmail }: { confirmarEmail: boolean }) {
  const router = useRouter();
  const [passo, setPasso] = useState<1 | 2>(1);
  const [escolha, setEscolha] = useState<Escolha | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [carregando, setCarregando] = useState(false);

  async function criar(e: FormEvent) {
    e.preventDefault();
    if (carregando) return;
    setCarregando(true);
    setErros({});

    const r = await enviarJson("/api/contas/cadastro", "POST", { escolha, nome, email, telefone, senha });
    if (!r.ok) {
      setCarregando(false);
      const campo = (r.campo as keyof Erros | undefined) ?? "geral";
      setErros({ [campo]: r.erro });
      focarCampo(campo === "geral" ? undefined : campo);
      return;
    }

    // Conta criada: já entra, para poder continuar o cadastro mesmo se fechar o app
    await signIn("credentials", { identificador: email, senha, redirect: false });
    // Com a confirmação do email desligada, pula direto para a foto
    const confirmado = (await getSession())?.user?.emailVerificado;
    router.push(confirmado ? "/cadastro/foto" : "/cadastro/codigo");
    router.refresh();
  }

  if (passo === 1) {
    return (
      <div className="flex flex-1 flex-col gap-5">
        <Voltar href="/" />
        <BarraProgresso passo={1} total={4} />
        <h1 className="text-[1.6rem] leading-tight font-black">O que você quer fazer no BicoJá?</h1>
        <EscolhaModo valor={escolha} onChange={setEscolha} />
        <Botao larguraTotal tamanho="grande" disabled={!escolha} onClick={() => setPasso(2)} className="mt-auto">
          Continuar
        </Botao>
      </div>
    );
  }

  return (
    <form onSubmit={criar} noValidate className="flex flex-1 flex-col gap-5">
      <Voltar onClick={() => setPasso(1)} />
      <BarraProgresso passo={2} total={4} />
      <h1 className="text-[1.6rem] leading-tight font-black">Seus dados</h1>

      <Campo id="nome" rotulo="Nome completo" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} maxLength={80} />
      <Campo
        id="email"
        rotulo="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        erro={erros.email}
        maxLength={120}
      />
      <CampoTelefone id="telefone" rotulo="Celular (com DDD)" value={telefone} onValorChange={setTelefone} erro={erros.telefone} />
      <CampoSenha
        id="senha"
        rotulo="Crie uma senha"
        autoComplete="new-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        erro={erros.senha}
        mostrarRegra
      />

      {erros.geral && (
        <p role="alert" className="rounded-2xl bg-superficie-suave p-4 font-bold text-urgencia">
          {erros.geral}
        </p>
      )}

      <Botao type="submit" larguraTotal tamanho="grande" carregando={carregando} className="mt-auto">
        Continuar
      </Botao>
      {confirmarEmail && (
        <p className="text-center text-sm text-texto-suave">
          Vamos mandar um código para o seu email para confirmar que é você.
        </p>
      )}
    </form>
  );
}
