"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Botao } from "@/components/ui";
import { FormEndereco } from "./FormEndereco";
import type { EnderecoCompleto } from "@/lib/enderecos";

/** Seção "Meu endereço" do Perfil. */
export function MeuEndereco({ inicial }: { inicial: EnderecoCompleto | null }) {
  const [endereco, setEndereco] = useState(inicial);
  const [editando, setEditando] = useState(!inicial);
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <section aria-labelledby="titulo-endereco" className="flex flex-col gap-3">
      <h2 id="titulo-endereco" className="text-lg font-black">Meu endereço</h2>
      {aviso && <p role="status" className="font-bold text-sucesso">{aviso}</p>}
      {editando ? (
        <>
          {!endereco && <p className="text-texto-suave">Salve seu endereço para ver quem está perto e publicar pedidos mais rápido.</p>}
          <FormEndereco
            inicial={endereco}
            textoBotao="Salvar endereço"
            onSalvo={(e) => {
              setEndereco(e);
              setEditando(false);
              setAviso("Endereço salvo.");
            }}
            onCancelar={endereco ? () => setEditando(false) : undefined}
          />
        </>
      ) : (
        endereco && (
          <div className="flex flex-col gap-3 rounded-2xl border border-borda p-4">
            <p className="flex items-start gap-2 font-bold break-words">
              <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-marca-texto" />
              <span>
                {endereco.rua}, {endereco.numero}
                {endereco.complemento ? ` · ${endereco.complemento}` : ""}
                <span className="block font-normal text-texto-suave">{endereco.bairro}, {endereco.cidade}</span>
              </span>
            </p>
            <Botao variante="secundario" onClick={() => { setAviso(null); setEditando(true); }}>Mudar endereço</Botao>
          </div>
        )
      )}
    </section>
  );
}
