"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, ImageIcon, UserRound } from "lucide-react";
import { Botao } from "@/components/ui";

type Props = {
  /** Foto atual (para o "Trocar foto" do perfil). */
  fotoAtual?: string | null;
  textoConfirmar?: string;
  onEnviada: (url: string) => void | Promise<void>;
};

/** Tirar foto com a câmera ou escolher da galeria, ver a prévia e enviar. */
export function EnviarFoto({ fotoAtual = null, textoConfirmar = "Usar esta foto", onEnviada }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previa) URL.revokeObjectURL(previa);
    };
  }, [previa]);

  function escolher(lista: FileList | null) {
    const escolhido = lista?.[0];
    if (!escolhido) return;
    setErro(null);
    if (escolhido.size > 5 * 1024 * 1024) {
      setErro("A foto é muito grande. Escolha uma de até 5 MB.");
      return;
    }
    setArquivo(escolhido);
    setPrevia(URL.createObjectURL(escolhido));
  }

  async function enviar() {
    if (!arquivo) return;
    setEnviando(true);
    setErro(null);
    try {
      const corpo = new FormData();
      corpo.append("foto", arquivo);
      const resposta = await fetch("/api/contas/foto", { method: "POST", body: corpo });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não conseguimos enviar a foto. Tente de novo.");
        return;
      }
      await onEnviada(dados.url);
    } catch {
      setErro("Sem conexão. Confira sua internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  const imagem = previa ?? fotoAtual;

  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto flex size-36 items-center justify-center overflow-hidden rounded-full border-4 border-dashed border-marca bg-marca-suave">
        {imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagem} alt="Prévia da sua foto" className="size-full object-cover" />
        ) : (
          <UserRound aria-hidden className="size-16 text-marca-texto" />
        )}
      </div>

      {!previa && (
        <ul className="flex flex-col gap-1 rounded-2xl bg-superficie-suave p-4 text-texto">
          <li className="flex items-center gap-2"><Check aria-hidden className="size-5 text-sucesso" />Rosto inteiro aparecendo</li>
          <li className="flex items-center gap-2"><Check aria-hidden className="size-5 text-sucesso" />Lugar com boa luz</li>
          <li className="flex items-center gap-2"><Check aria-hidden className="size-5 text-sucesso" />Sem óculos escuros ou boné</li>
        </ul>
      )}

      {erro && (
        <p role="alert" className="text-center font-bold text-urgencia">
          {erro}
        </p>
      )}

      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => escolher(e.target.files)}
      />
      <input
        ref={galeria}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => escolher(e.target.files)}
      />

      {previa ? (
        <>
          <Botao larguraTotal tamanho="grande" onClick={enviar} carregando={enviando}>
            {textoConfirmar}
          </Botao>
          <Botao larguraTotal variante="secundario" onClick={() => galeria.current?.click()} disabled={enviando}>
            Escolher outra
          </Botao>
        </>
      ) : (
        <>
          <Botao larguraTotal tamanho="grande" icone={Camera} onClick={() => camera.current?.click()}>
            Tirar foto agora
          </Botao>
          <Botao larguraTotal variante="secundario" icone={ImageIcon} onClick={() => galeria.current?.click()}>
            Escolher da galeria
          </Botao>
        </>
      )}
    </div>
  );
}
