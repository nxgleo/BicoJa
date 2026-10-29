"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useChat } from "@/components/chat/ProvedorChat";
import { ClipboardList, Home, MessageCircle, User, Wallet, Wrench, type LucideIcon } from "lucide-react";

export type Modo = "cliente" | "prestador";

type Item = { rotulo: string; href: string; icone: LucideIcon };

const ITENS: Record<Modo, Item[]> = {
  cliente: [
    { rotulo: "Início", href: "/", icone: Home },
    { rotulo: "Pedidos", href: "/pedidos", icone: ClipboardList },
    { rotulo: "Conversas", href: "/conversas", icone: MessageCircle },
    { rotulo: "Perfil", href: "/perfil", icone: User },
  ],
  prestador: [
    { rotulo: "Início", href: "/prestador", icone: Home },
    { rotulo: "Serviços", href: "/prestador/servicos", icone: Wrench },
    { rotulo: "Conversas", href: "/conversas", icone: MessageCircle },
    { rotulo: "Ganhos", href: "/prestador/ganhos", icone: Wallet },
    { rotulo: "Perfil", href: "/perfil", icone: User },
  ],
};

// A página inicial de cada modo só fica ativa no endereço exato;
// as outras também ficam ativas nas subpáginas (ex.: /pedidos/123).
function estaAtivo(href: string, caminho: string, ehInicio: boolean): boolean {
  if (ehInicio) return caminho === href;
  return caminho === href || caminho.startsWith(`${href}/`);
}

export function MenuInferior({ modo }: { modo: Modo }) {
  const caminho = usePathname() ?? "/";
  const itens = ITENS[modo];
  const { naoLidas } = useChat();

  return (
    <nav
      aria-label="Menu principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-borda bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:sticky md:top-0 md:bottom-auto md:border-t-0 md:border-b"
    >
      <ul className="mx-auto flex max-w-3xl justify-around">
        {itens.map(({ rotulo, href, icone: Icone }, indice) => {
          const ativo = estaAtivo(href, caminho, indice === 0);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-sm font-bold transition-colors duration-200 focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-foco md:flex-row md:gap-2 ${
                  ativo ? "text-marca-texto" : "text-texto-suave hover:text-texto"
                }`}
              >
                <Icone aria-hidden className={`size-6 transition-transform duration-200 ${ativo ? "scale-110" : ""}`} strokeWidth={ativo ? 2.5 : 2} />
                <span className="relative">
                  {rotulo}
                  {href === "/conversas" && naoLidas > 0 && (
                    <span className="absolute -top-7 left-[calc(50%+0.4rem)] min-w-5 rounded-full bg-urgencia px-1.5 text-center text-xs leading-5 text-white md:static md:ml-1.5 md:inline-block">
                      {naoLidas > 99 ? "99+" : naoLidas}
                      <span className="sr-only"> {naoLidas === 1 ? "mensagem nova" : "mensagens novas"}</span>
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
