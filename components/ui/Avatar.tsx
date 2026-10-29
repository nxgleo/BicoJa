type AvatarProps = {
  nome: string;
  fotoUrl?: string | null;
  tamanho?: number;
  online?: boolean;
};

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function Avatar({ nome, fotoUrl, tamanho = 52, online = false }: AvatarProps) {
  return (
    <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }}>
      {fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fotoUrl} alt={nome} className="size-full rounded-full object-cover" />
      ) : (
        <div
          role="img"
          aria-label={nome}
          className="flex size-full items-center justify-center rounded-full bg-marca-suave font-extrabold text-marca-texto"
          style={{ fontSize: tamanho * 0.36 }}
        >
          <span aria-hidden>{iniciais(nome)}</span>
        </div>
      )}
      {online && (
        <span className="absolute right-0 bottom-0.5 size-3.5 rounded-full border-2 border-superficie bg-sucesso">
          <span className="sr-only">Disponível agora</span>
        </span>
      )}
    </div>
  );
}
