"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

const classes =
  "inline-flex min-h-12 items-center gap-1 self-start rounded-xl pr-3 font-extrabold text-texto-suave hover:text-texto focus-visible:outline-3 focus-visible:outline-foco";

/** "← Voltar": vai para um endereço (href) ou executa uma ação (onClick). */
export function Voltar({ href, onClick }: { href?: string; onClick?: () => void }) {
  const conteudo = (
    <>
      <ChevronLeft aria-hidden className="size-6" />
      Voltar
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
    <button type="button" onClick={onClick} className={classes}>
      {conteudo}
    </button>
  );
}
