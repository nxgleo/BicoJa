"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Socket } from "socket.io-client";
import { conectarChat } from "@/lib/cliente/socket";
import { BolhaConversa } from "@/components/chat/BolhaConversa";

export type ConversaAtiva = { id: string; nome: string };

type Contexto = {
  socket: Socket | null;
  naoLidas: number;
  recarregarNaoLidas: () => void;
  /** Avisos do sininho ainda não lidos */
  avisosNaoLidos: number;
  recarregarAvisos: () => void;
  /** A tela do chat avisa qual conversa está aberta (ou null ao sair). */
  definirAberta: (c: ConversaAtiva | null) => void;
  ultima: ConversaAtiva | null;
  bolhaDispensada: boolean;
  dispensarBolha: () => void;
};

const ContextoChat = createContext<Contexto>({
  socket: null,
  naoLidas: 0,
  recarregarNaoLidas: () => {},
  avisosNaoLidos: 0,
  recarregarAvisos: () => {},
  definirAberta: () => {},
  ultima: null,
  bolhaDispensada: false,
  dispensarBolha: () => {},
});

export const useChat = () => useContext(ContextoChat);

const CHAVE_ULTIMA = "bicoja-ultima-conversa";

function lerUltima(): ConversaAtiva | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(CHAVE_ULTIMA) ?? "null");
    return v && typeof v.id === "string" && typeof v.nome === "string" ? v : null;
  } catch {
    return null;
  }
}

/** Liga o chat em tempo real para quem está logado: não lidas no menu e a bolha flutuante. */
export function ProvedorChat({ logado, children }: { logado: boolean; children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [naoLidas, setNaoLidas] = useState(0);
  const [avisosNaoLidos, setAvisosNaoLidos] = useState(0);
  const [ultima, setUltima] = useState<ConversaAtiva | null>(null);
  const [bolhaDispensada, setBolhaDispensada] = useState(false);
  const aberta = useRef<string | null>(null);

  const recarregarNaoLidas = useCallback(async () => {
    try {
      const r = await fetch("/api/conversas/nao-lidas");
      const dados = await r.json();
      if (typeof dados.total === "number") setNaoLidas(dados.total);
    } catch {
      // sem internet: mantém o número que já estava
    }
  }, []);

  const recarregarAvisos = useCallback(async () => {
    try {
      const dados = await (await fetch("/api/avisos?contar=1")).json();
      if (typeof dados.naoLidos === "number") setAvisosNaoLidos(dados.naoLidos);
    } catch {
      // sem internet: mantém o número que já estava
    }
  }, []);

  useEffect(() => {
    if (!logado) return;
    setUltima(lerUltima());
    const s = conectarChat();
    setSocket(s);
    recarregarNaoLidas();
    recarregarAvisos();
    const aoChegar = (dados: { conversaId: string }) => {
      if (dados.conversaId !== aberta.current) {
        recarregarNaoLidas();
        setBolhaDispensada(false);
      }
    };
    const aoConectar = () => {
      recarregarNaoLidas();
      recarregarAvisos();
    };
    s.on("chat:mensagens", aoChegar);
    s.on("aviso:novo", recarregarAvisos);
    s.on("connect", aoConectar);
    return () => {
      s.off("chat:mensagens", aoChegar);
      s.off("aviso:novo", recarregarAvisos);
      s.off("connect", aoConectar);
    };
  }, [logado, recarregarNaoLidas, recarregarAvisos]);

  const definirAberta = useCallback(
    (c: ConversaAtiva | null) => {
      aberta.current = c?.id ?? null;
      if (!c) return;
      setUltima(c);
      setBolhaDispensada(false);
      try {
        sessionStorage.setItem(CHAVE_ULTIMA, JSON.stringify(c));
      } catch {
        // navegador sem armazenamento: a bolha só não lembra depois de recarregar
      }
      recarregarNaoLidas();
    },
    [recarregarNaoLidas]
  );

  return (
    <ContextoChat.Provider
      value={{ socket, naoLidas, recarregarNaoLidas, avisosNaoLidos, recarregarAvisos, definirAberta, ultima, bolhaDispensada, dispensarBolha: () => setBolhaDispensada(true) }}
    >
      {children}
      {logado && <BolhaConversa />}
    </ContextoChat.Provider>
  );
}
