import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2, type LucideIcon } from "lucide-react";

type Variante = "principal" | "secundario" | "urgente" | "fantasma";
type Tamanho = "normal" | "grande";

type BotaoProps = {
  variante?: Variante;
  tamanho?: Tamanho;
  icone?: LucideIcon;
  carregando?: boolean;
  larguraTotal?: boolean;
  href?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const estilosVariante: Record<Variante, string> = {
  principal: "bg-botao text-texto-sobre-marca hover:brightness-110",
  secundario: "bg-superficie-suave text-texto hover:bg-borda",
  urgente: "bg-urgencia text-white hover:brightness-110",
  fantasma: "bg-transparent text-marca-texto hover:bg-marca-suave",
};

const estilosTamanho: Record<Tamanho, string> = {
  normal: "px-5 text-base",
  grande: "px-6 py-3 text-lg",
};

export function Botao({
  variante = "principal",
  tamanho = "normal",
  icone: Icone,
  carregando = false,
  larguraTotal = false,
  href,
  children,
  className = "",
  disabled,
  ...resto
}: BotaoProps) {
  const classes = [
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl font-extrabold",
    "transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100",
    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco",
    estilosVariante[variante],
    estilosTamanho[tamanho],
    larguraTotal ? "w-full" : "",
    className,
  ].join(" ");

  const conteudo = (
    <>
      {carregando ? (
        <Loader2 aria-hidden className="size-5 animate-spin" />
      ) : (
        Icone && <Icone aria-hidden className="size-5" />
      )}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {conteudo}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {conteudo}
    </button>
  );
}
