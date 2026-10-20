import Image from "next/image";
import Link from "next/link";

/** Barra do topo com o logo. Aparece em todas as telas do app. */
export function Cabecalho() {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center px-4 pt-4">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
      >
        <Image src="/logo.png" alt="" width={40} height={40} className="rounded-xl" priority />
        <span className="text-xl font-black tracking-tight">
          Bico<span className="text-marca-texto">Já</span>
        </span>
      </Link>
    </header>
  );
}
