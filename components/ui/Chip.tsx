import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type ChipProps = {
  ativo?: boolean;
  icone?: LucideIcon;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
};

export function Chip({ ativo = false, icone: Icone, children, href, onClick }: ChipProps) {
  const classes = `inline-flex min-h-12 shrink-0 snap-start items-center gap-2 rounded-full px-4 font-extrabold whitespace-nowrap transition-all duration-200 active:scale-[0.97] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco ${
    ativo ? "bg-botao text-texto-sobre-marca" : "bg-marca-suave text-marca-texto"
  }`;
  const conteudo = (
    <>
      {Icone && <Icone aria-hidden className="size-5" />}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-current={ativo ? "page" : undefined}>
        {conteudo}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} aria-pressed={ativo} onClick={onClick}>
      {conteudo}
    </button>
  );
}
