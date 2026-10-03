"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type PushStatus = "checking" | "idle" | "enabled" | "denied" | "unsupported" | "error";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function PushNotificationButton() {
  const { data: session, status: sessionStatus } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const [pushStatus, setPushStatus] = useState<PushStatus>("checking");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!userId) {
      setPushStatus("idle");
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushStatus("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setPushStatus("denied");
      return;
    }

    let isCurrent = true;

    async function syncExistingSubscription() {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();

        if (!isCurrent) return;
        if (!subscription) {
          setPushStatus("idle");
          return;
        }

        const response = await fetch("/api/notificacoes/inscrever", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, subscription }),
        });

        if (!response.ok) {
          throw new Error("Não foi possível sincronizar a assinatura de notificações.");
        }

        if (isCurrent) setPushStatus("enabled");
      } catch (error) {
        if (!isCurrent) return;
        setPushStatus("error");
        setMessage(error instanceof Error ? error.message : "Falha ao verificar notificações.");
      }
    }

    syncExistingSubscription();
    return () => {
      isCurrent = false;
    };
  }, [sessionStatus, userId]);

  async function enableNotifications() {
    if (!userId) {
      setMessage("Entre na sua conta para ativar as notificações.");
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushStatus("unsupported");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus(permission === "denied" ? "denied" : "idle");
        setMessage("A permissão para notificações não foi concedida.");
        return;
      }

      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        throw new Error("A chave pública VAPID não está configurada.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
        });
      }

      const response = await fetch("/api/notificacoes/inscrever", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, subscription }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Não foi possível salvar a assinatura.");
      }

      setPushStatus("enabled");
      setMessage("Notificações ativadas.");
    } catch (error) {
      setPushStatus("error");
      setMessage(error instanceof Error ? error.message : "Falha ao ativar notificações.");
    } finally {
      setIsSaving(false);
    }
  }

  const buttonLabel = pushStatus === "enabled" ? "Notificações ativadas" : "Ativar notificações";

  return (
    <div className="flex flex-col items-center gap-2 sm:items-start">
      <button
        type="button"
        onClick={enableNotifications}
        disabled={isSaving || pushStatus === "checking" || pushStatus === "enabled" || !userId}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {isSaving ? "Ativando..." : !userId && sessionStatus !== "loading" ? "Entre para ativar notificações" : buttonLabel}
      </button>
      <p className="min-h-5 text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
        {message || (pushStatus === "denied" ? "Permissão bloqueada nas configurações do navegador." : "")}
      </p>
    </div>
  );
}