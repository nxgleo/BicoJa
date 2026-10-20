import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { BotaoTentarDeNovo } from "@/components/pwa/BotaoTentarDeNovo";

export const metadata: Metadata = { title: "Sem internet · BicoJá" };
// Página fixa: o service worker guarda ela para mostrar quando não houver internet
export const dynamic = "force-static";

export default function SemInternet() {
  return (
    <main id="conteudo" className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-marca-suave">
        <WifiOff aria-hidden className="size-8 text-marca-texto" />
      </div>
      <h1 className="text-[1.6rem] leading-tight font-black">Você está sem internet</h1>
      <p className="text-texto-suave">
        Confira o Wi-Fi ou os dados móveis do celular. As páginas que você abriu antes ainda podem aparecer, mas mensagens e pagamentos precisam de internet.
      </p>
      <BotaoTentarDeNovo />
    </main>
  );
}
