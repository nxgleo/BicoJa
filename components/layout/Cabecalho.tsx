import Image from "next/image";
import Link from "next/link";
import { LogIn } from "lucide-react";

/** Barra do topo com o logo. Quem não entrou na conta vê o botão "Entrar". */
export function Cabecalho({ logado = true }: { logado?: boolean }) {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-4">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
      >
        <Image src="/logo.png" alt="" width={40} height={40} className="rounded-xl" priority />
        <span className="text-xl font-black tracking-tight">
          Bico<span className="text-marca-texto">Já</span>
        </span>
      </Link>
      {!logado && (
        <Link
          href="/entrar"
          className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-marca-suave px-4 font-extrabold text-marca-texto transition-all duration-200 active:scale-[0.97] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          <LogIn aria-hidden className="size-5" />
          Entrar
        </Link>
      )}
    </header>
  );
}
