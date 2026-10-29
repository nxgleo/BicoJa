/** Bloco cinza pulsando no lugar do conteúdo enquanto ele carrega. */
export function Esqueleto({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-2xl bg-superficie-suave ${className}`} />;
}
