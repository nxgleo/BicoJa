/** Fotos lado a lado, que a pessoa arrasta para o lado. */
export function GaleriaFotos({ fotos, titulo }: { fotos: string[]; titulo: string }) {
  if (fotos.length === 0) return null;
  return (
    <ul aria-label={`Fotos de ${titulo}`} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
      {fotos.map((url, i) => (
        <li key={url} className="shrink-0 snap-start">
          <a href={url} target="_blank" rel="noopener" className="block rounded-2xl focus-visible:outline-3 focus-visible:outline-foco">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Foto ${i + 1} de ${titulo}`} className="h-48 w-auto max-w-[80vw] rounded-2xl object-cover" />
          </a>
        </li>
      ))}
    </ul>
  );
}
