"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Botao, Campo } from "@/components/ui";
import { CampoSenha } from "@/components/conta/CampoSenha";
import { Voltar } from "@/components/conta/Voltar";
import { enviarJson, focarCampo } from "@/lib/cliente/api";

type Erros = Partial<Record<"email" | "codigo" | "novaSenha", string>>;

export default function EsqueciSenha() {
  const router = useRouter();
  const [passo, setPasso] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [carregando, setCarregando] = useState(false);
  const [espera, setEspera] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function mandarNovoCodigo() {
    setErros({});
    setAviso(null);
    const r = await enviarJson("/api/contas/senha/recuperar", "POST", { email });
    if (!r.ok) {
      setErros({ codigo: r.erro });
      return;
    }
    setEspera(60);
    setCodigo("");
    setAviso("Se a conta existir, mandamos um código novo.");
  }

  async function pedirCodigo(e: FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErros({});
    const r = await enviarJson("/api/contas/senha/recuperar", "POST", { email });
    setCarregando(false);
    if (!r.ok) {
      setErros({ email: r.erro });
      focarCampo("email");
      return;
    }
    setEspera(60);
    setPasso(2);
  }

  async function trocarSenha(e: FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErros({});
    const r = await enviarJson("/api/contas/senha/redefinir", "POST", { email, codigo, novaSenha });
    if (!r.ok) {
      setCarregando(false);
      const campo = (r.campo === "novaSenha" ? "novaSenha" : "codigo") as keyof Erros;
      setErros({ [campo]: r.erro });
      focarCampo(campo);
      return;
    }
    await signIn("credentials", { identificador: email, senha: novaSenha, redirect: false });
    router.push("/");
    router.refresh();
  }

  if (passo === 1) {
    return (
      <form onSubmit={pedirCodigo} noValidate className="flex flex-1 flex-col gap-5">
        <Voltar href="/entrar" />
        <h1 className="text-[1.6rem] leading-tight font-black">Esqueceu a senha?</h1>
        <p className="text-texto-suave">Digite o email da sua conta. Vamos mandar um código para você criar uma senha nova.</p>
        <Campo id="email" rotulo="Email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} erro={erros.email} />
        <Botao type="submit" larguraTotal tamanho="grande" carregando={carregando} className="mt-auto">
          Mandar código
        </Botao>
      </form>
    );
  }

  return (
    <form onSubmit={trocarSenha} noValidate className="flex flex-1 flex-col gap-5">
      <Voltar onClick={() => setPasso(1)} />
      <h1 className="text-[1.6rem] leading-tight font-black">Crie uma senha nova</h1>
      <p className="text-texto-suave">
        Se existir uma conta com <b className="text-texto [overflow-wrap:anywhere]">{email}</b>, mandamos um código de 6 números para lá.
      </p>
      <Campo
        id="codigo"
        rotulo="Código do email"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
        erro={erros.codigo}
      />
      <div className="flex flex-col items-center gap-1">
        {aviso && <p role="status" className="font-bold text-sucesso">{aviso}</p>}
        <Botao variante="fantasma" onClick={mandarNovoCodigo} disabled={espera > 0}>
          {espera > 0 ? `Mandar novo código em ${espera}s` : "Mandar novo código"}
        </Botao>
      </div>
      <CampoSenha id="novaSenha" rotulo="Senha nova" autoComplete="new-password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} erro={erros.novaSenha} mostrarRegra />
      <Botao type="submit" larguraTotal tamanho="grande" carregando={carregando} className="mt-auto">
        Salvar senha nova e entrar
      </Botao>
    </form>
  );
}
