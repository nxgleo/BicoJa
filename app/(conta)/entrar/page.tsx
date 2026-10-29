"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { Botao, Campo } from "@/components/ui";
import { CampoSenha } from "@/components/conta/CampoSenha";
import { caminhoSeguro, etapaDoCadastro } from "@/lib/contas/etapa";
import { focarCampo } from "@/lib/cliente/api";

function FormularioEntrar() {
  const router = useRouter();
  const voltar = caminhoSeguro(useSearchParams().get("voltar"));
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (!identificador.trim() || !senha) {
      setErro("Digite seu email ou celular e sua senha.");
      focarCampo(!identificador.trim() ? "identificador" : "senha");
      return;
    }
    setCarregando(true);
    setErro(null);
    const r = await signIn("credentials", { identificador, senha, redirect: false });
    setCarregando(false);
    if (!r || r.error) {
      setErro("Email/celular ou senha não conferem. Confira e tente de novo.");
      focarCampo("identificador");
      return;
    }
    // Cadastro pela metade: continua do passo que falta
    const usuario = (await getSession())?.user;
    const etapa = usuario ? etapaDoCadastro(usuario) : "completo";
    router.push(etapa === "codigo" ? "/cadastro/codigo" : voltar);
    router.refresh();
  }

  return (
    <form onSubmit={entrar} noValidate className="flex flex-1 flex-col gap-5">
      <h1 className="text-[1.6rem] leading-tight font-black">Entrar na sua conta</h1>

      <Campo
        id="identificador"
        rotulo="Email ou celular"
        autoComplete="username"
        value={identificador}
        onChange={(e) => setIdentificador(e.target.value)}
        maxLength={120}
      />
      <div className="flex flex-col gap-2">
        <CampoSenha
          id="senha"
          rotulo="Senha"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <Link
          href="/esqueci-senha"
          className="self-end rounded-lg px-1 py-2 font-extrabold text-marca-texto hover:underline focus-visible:outline-3 focus-visible:outline-foco"
        >
          Esqueci minha senha
        </Link>
      </div>

      {erro && (
        <p role="alert" className="rounded-2xl bg-superficie-suave p-4 font-bold text-urgencia">
          {erro}
        </p>
      )}

      <Botao type="submit" larguraTotal tamanho="grande" carregando={carregando}>
        Entrar
      </Botao>

      <div className="mt-auto flex flex-col gap-3 pt-6 text-center">
        <p className="text-texto-suave">Ainda não tem conta?</p>
        <Botao href="/cadastro" variante="secundario" larguraTotal>
          Criar conta grátis
        </Botao>
      </div>
    </form>
  );
}

export default function Entrar() {
  return (
    <Suspense>
      <FormularioEntrar />
    </Suspense>
  );
}
