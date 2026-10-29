"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MailCheck } from "lucide-react";
import { Botao, Campo } from "@/components/ui";
import { BarraProgresso } from "@/components/conta/BarraProgresso";
import { CampoCodigo } from "@/components/conta/CampoCodigo";
import { enviarJson } from "@/lib/cliente/api";

const ESPERA_SEGUNDOS = 60;

export default function ConfirmarEmail() {
  const router = useRouter();
  const { data: sessao, update } = useSession();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [conferindo, setConferindo] = useState(false);
  const [espera, setEspera] = useState(ESPERA_SEGUNDOS);
  const [chave, setChave] = useState(0); // recria as caixinhas depois de erro
  const [corrigindo, setCorrigindo] = useState(false);
  const [novoEmail, setNovoEmail] = useState("");

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function conferir(codigo: string) {
    setConferindo(true);
    setErro(null);
    const r = await enviarJson("/api/contas/codigo/confirmar", "POST", { codigo });
    if (!r.ok) {
      setConferindo(false);
      setErro(r.erro);
      setChave((c) => c + 1);
      return;
    }
    await update();
    router.push("/cadastro/foto");
    router.refresh();
  }

  async function mandarDeNovo() {
    setErro(null);
    setAviso(null);
    const r = await enviarJson("/api/contas/codigo/enviar", "POST");
    if (!r.ok) {
      const esperar = Number(r.extra.esperarSegundos);
      if (esperar > 0) setEspera(esperar);
      setErro(r.erro);
      return;
    }
    // O email já tinha sido confirmado (ex.: em outro aparelho): atualiza a sessão e segue
    if (r.dados.jaConfirmado) {
      await update();
      router.push("/cadastro/foto");
      router.refresh();
      return;
    }
    setChave((c) => c + 1);
    setEspera(ESPERA_SEGUNDOS);
    setAviso("Mandamos um código novo.");
  }

  async function corrigirEmail(e: FormEvent) {
    e.preventDefault();
    const r = await enviarJson("/api/contas/email", "PATCH", { email: novoEmail });
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    await update();
    setCorrigindo(false);
    setErro(null);
    setEspera(ESPERA_SEGUNDOS);
    setChave((c) => c + 1);
    setAviso("Email corrigido. Mandamos o código para o novo endereço.");
  }

  const minutos = Math.floor(espera / 60);
  const segundos = String(espera % 60).padStart(2, "0");

  return (
    <div className="flex flex-1 flex-col gap-5">
      <BarraProgresso passo={3} total={4} />
      <span className="flex size-14 items-center justify-center rounded-2xl bg-marca-suave">
        <MailCheck aria-hidden className="size-7 text-marca-texto" />
      </span>
      <h1 className="text-[1.6rem] leading-tight font-black">Confira seu email</h1>
      <p className="text-texto-suave">
        Mandamos um código de 6 números para <b className="text-texto [overflow-wrap:anywhere]">{sessao?.user?.email ?? "seu email"}</b>.
      </p>

      {corrigindo ? (
        <form onSubmit={corrigirEmail} noValidate className="flex flex-col gap-3">
          <Campo id="email" rotulo="Email certo" type="email" inputMode="email" autoComplete="email" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} erro={erro ?? undefined} />
          <Botao type="submit" larguraTotal>Salvar e mandar código</Botao>
          <Botao variante="fantasma" onClick={() => setCorrigindo(false)}>Cancelar</Botao>
        </form>
      ) : (
        <>
          <CampoCodigo key={chave} onCompleto={conferir} erro={erro ?? undefined} desabilitado={conferindo} />
          {aviso && <p role="status" className="text-center font-bold text-sucesso">{aviso}</p>}
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-texto-suave">Não chegou? Olhe também o lixo eletrônico (spam).</p>
            {espera > 0 ? (
              <p className="font-bold text-marca-texto">
                Mandar de novo em {minutos}:{segundos}
              </p>
            ) : (
              <Botao variante="fantasma" onClick={mandarDeNovo}>Mandar de novo</Botao>
            )}
            <Botao variante="fantasma" onClick={() => { setErro(null); setCorrigindo(true); }}>
              Corrigir o email
            </Botao>
          </div>
        </>
      )}
    </div>
  );
}
