import type { ReactNode } from "react";

/**
 * Entrada suave (sobe 8px e aparece), feita só com CSS (@keyframes aparecer em globals.css).
 * O conteúdo já vem visível do servidor, e quem pediu "reduzir movimento" não vê a animação.
 */
export function Aparecer({ children, atraso = 0 }: { children: ReactNode; atraso?: number }) {
  return (
    <div className="animate-aparecer" style={atraso ? { animationDelay: `${atraso}s` } : undefined}>
      {children}
    </div>
  );
}
