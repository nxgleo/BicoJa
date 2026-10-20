"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Pencil } from "lucide-react";
import { Botao, Campo } from "@/components/ui";
import { CampoTelefone } from "@/components/conta/CampoTelefone";
import { EnviarFoto } from "@/components/conta/EnviarFoto";
import { enviarJson, focarCampo } from "@/lib/cliente/api";
import { formatarTelefone } from "@/lib/contas/telefone";

type Props = { nome: string; email: string; telefone: string; foto: string | null };

export function EditarDados({ nome: nomeInicial, email, telefone: telefoneInicial, foto }: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [editando, setEditando] = useState<"dados" | "foto" | null>(null);
  const [nome, setNome] = useState(nomeInicial);
  const [telefone, setTelefone] = useState(formatarTelefone(telefoneInicial));
  const [erros, setErros] = useState<{ nome?: string; telefone?: string }>({});
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErros({});
    const r = await enviarJson("/api/contas/perfil", "PATCH", { nome, telefone });
    setSalvando(false);
    if (!r.ok) {
      const campo = r.campo === "telefone" ? "telefone" : "nome";
      setErros({ [campo]: r.erro });
      focarCampo(campo);
      return;
    }
    await update();
    setEditando(null);
    setAviso("Dados salvos.");
    router.refresh();
  }

  return (
    <section aria-labelledby="titulo-dados" className="flex flex-col gap-3">
      <h2 id="titulo-dados" className="text-lg font-black">
        Meus dados
      </h2>
      {aviso && <p role="status" className="font-bold text-sucesso">{aviso}</p>}

      {editando === "dados" ? (
        <form onSubmit={salvar} noValidate className="flex flex-col gap-4 rounded-2xl bg-superficie-suave p-4">
          <Campo id="nome" rotulo="Nome completo" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} maxLength={80} />
          <CampoTelefone id="telefone" rotulo="Celular (com DDD)" value={telefone} onValorChange={setTelefone} erro={erros.telefone} />
          <Botao type="submit" larguraTotal carregando={salvando}>Salvar</Botao>
          <Botao variante="fantasma" onClick={() => setEditando(null)}>Cancelar</Botao>
        </form>
      ) : editando === "foto" ? (
        <div className="rounded-2xl bg-superficie-suave p-4">
          <EnviarFoto
            fotoAtual={foto}
            textoConfirmar="Salvar foto nova"
            onEnviada={async () => {
              await update();
              setEditando(null);
              setAviso("Foto trocada.");
              router.refresh();
            }}
          />
          <Botao variante="fantasma" larguraTotal onClick={() => setEditando(null)} className="mt-2">Cancelar</Botao>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <dl className="flex flex-col gap-3 rounded-2xl border border-borda p-4">
            <div>
              <dt className="text-sm font-bold text-texto-suave">Nome</dt>
              <dd className="font-bold break-words">{nomeInicial}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-texto-suave">Celular</dt>
              <dd className="font-bold">{formatarTelefone(telefoneInicial) || "Não informado"}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-texto-suave">Email</dt>
              <dd className="font-bold [overflow-wrap:anywhere]">{email}</dd>
            </div>
          </dl>
          <div className="grid grid-cols-2 gap-3">
            <Botao variante="secundario" icone={Pencil} onClick={() => { setAviso(null); setEditando("dados"); }}>
              Editar dados
            </Botao>
            <Botao variante="secundario" onClick={() => { setAviso(null); setEditando("foto"); }}>
              Trocar foto
            </Botao>
          </div>
        </div>
      )}
    </section>
  );
}
