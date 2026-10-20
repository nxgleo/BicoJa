"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Botao } from "@/components/ui";

type Estado = "verificando" | "desligado" | "ligado" | "bloqueado" | "sem-suporte";

function chaveParaBytes(base64: string) {
  const preenchimento = "=".repeat((4 - (base64.length % 4)) % 4);
  const bruto = window.atob((base64 + preenchimento).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
}

const suporta = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function inscricaoAtual() {
  const registro = await navigator.serviceWorker.getRegistration();
  return (await registro?.pushManager.getSubscription()) ?? null;
}

/** Ligar/desligar notificações no celular (mensagem, proposta, pagamento, pedido urgente perto). */
export function BotaoNotificacoes() {
  const [estado, setEstado] = useState<Estado>("verificando");
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!suporta()) return setEstado("sem-suporte");
    if (Notification.permission === "denied") return setEstado("bloqueado");
    inscricaoAtual()
      .then(async (inscricao) => {
        if (!inscricao) return setEstado("desligado");
        // Garante que este celular está ligado à conta que está logada agora
        await fetch("/api/notificacoes/inscrever", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: inscricao }),
        });
        setEstado("ligado");
      })
      .catch(() => setEstado("desligado"));
  }, []);

  async function ligar() {
    setSalvando(true);
    setMensagem("");
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "bloqueado" : "desligado");
        return;
      }
      const chave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!chave) throw new Error("As notificações ainda não foram configuradas no servidor.");
      const registro = await navigator.serviceWorker.ready;
      const inscricao =
        (await registro.pushManager.getSubscription()) ??
        (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chave) }));
      const r = await fetch("/api/notificacoes/inscrever", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: inscricao }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erro ?? "Não deu para ativar. Tente de novo.");
      setEstado("ligado");
      setMensagem("Pronto! Você vai receber avisos neste celular.");
    } catch (e) {
      setMensagem(e instanceof Error ? e.message : "Não deu para ativar. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function desligar() {
    setSalvando(true);
    await desligarNotificacoes();
    setSalvando(false);
    setEstado("desligado");
    setMensagem("Notificações desligadas neste celular.");
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-texto-suave">Receba um aviso no celular quando chegar mensagem, proposta, pagamento ou pedido urgente perto.</p>
      {estado === "ligado" ? (
        <Botao variante="secundario" icone={BellOff} larguraTotal carregando={salvando} onClick={desligar}>
          Desligar notificações
        </Botao>
      ) : (
        <Botao
          variante="secundario"
          icone={Bell}
          larguraTotal
          carregando={salvando}
          disabled={estado !== "desligado"}
          onClick={ligar}
        >
          Ligar notificações
        </Botao>
      )}
      <p className="min-h-5 text-sm text-texto-suave" aria-live="polite">
        {mensagem ||
          (estado === "bloqueado"
            ? "As notificações estão bloqueadas. Libere nas configurações do navegador."
            : estado === "sem-suporte"
              ? "Este navegador não tem notificações. No iPhone, adicione o BicoJá à tela de início primeiro."
              : "")}
      </p>
    </div>
  );
}

/** Desliga as notificações deste celular (usado também ao sair da conta). */
export async function desligarNotificacoes() {
  try {
    if (!suporta()) return;
    const inscricao = await inscricaoAtual();
    if (!inscricao) return;
    await fetch("/api/notificacoes/inscrever", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: inscricao.endpoint }),
    }).catch(() => {});
    await inscricao.unsubscribe();
  } catch {
    // sem suporte ou sem internet: nada a fazer
  }
}
