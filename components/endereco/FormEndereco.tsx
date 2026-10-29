"use client";

import { useState, type FormEvent } from "react";
import { Botao, Campo } from "@/components/ui";
import { enviarJson, focarCampo } from "@/lib/cliente/api";
import type { EnderecoCompleto } from "@/lib/enderecos";

type Campos = "rua" | "numero" | "complemento" | "bairro" | "cidade";
type Props = {
  inicial?: Partial<EnderecoCompleto> | null;
  textoBotao: string;
  onSalvo: (endereco: EnderecoCompleto) => void;
  onCancelar?: () => void;
};

export function FormEndereco({ inicial, textoBotao, onSalvo, onCancelar }: Props) {
  const [valores, setValores] = useState<Record<Campos, string>>({
    rua: inicial?.rua ?? "",
    numero: inicial?.numero ?? "",
    complemento: inicial?.complemento ?? "",
    bairro: inicial?.bairro ?? "",
    cidade: inicial?.cidade ?? "Belém",
  });
  const [erros, setErros] = useState<Partial<Record<Campos | "geral", string>>>({});
  const [salvando, setSalvando] = useState(false);

  const mudar = (campo: Campos) => (e: { target: { value: string } }) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErros({});
    const r = await enviarJson<{ endereco: EnderecoCompleto }>("/api/contas/endereco", "PUT", valores);
    setSalvando(false);
    if (!r.ok) {
      const campo = (r.campo as Campos | undefined) ?? "geral";
      setErros({ [campo]: r.erro });
      focarCampo(campo === "geral" ? undefined : `endereco-${campo}`);
      return;
    }
    onSalvo(r.dados.endereco);
  }

  return (
    <form onSubmit={salvar} noValidate className="flex flex-col gap-4">
      <Campo id="endereco-rua" rotulo="Rua" autoComplete="address-line1" value={valores.rua} onChange={mudar("rua")} erro={erros.rua} maxLength={100} />
      <div className="grid grid-cols-[7rem_1fr] gap-3">
        <Campo id="endereco-numero" rotulo="Número" inputMode="numeric" value={valores.numero} onChange={mudar("numero")} erro={erros.numero} maxLength={10} />
        <Campo id="endereco-complemento" rotulo="Complemento (opcional)" autoComplete="address-line2" value={valores.complemento} onChange={mudar("complemento")} erro={erros.complemento} maxLength={60} />
      </div>
      <Campo id="endereco-bairro" rotulo="Bairro" autoComplete="address-level3" value={valores.bairro} onChange={mudar("bairro")} erro={erros.bairro} maxLength={60} />
      <Campo id="endereco-cidade" rotulo="Cidade" autoComplete="address-level2" value={valores.cidade} onChange={mudar("cidade")} erro={erros.cidade} maxLength={60} />
      <p className="text-sm text-texto-suave">🔒 Os prestadores só veem seu bairro até vocês combinarem o serviço.</p>
      {erros.geral && <p role="alert" className="font-bold text-urgencia">{erros.geral}</p>}
      <Botao type="submit" larguraTotal carregando={salvando}>{textoBotao}</Botao>
      {onCancelar && <Botao variante="fantasma" onClick={onCancelar}>Cancelar</Botao>}
    </form>
  );
}
