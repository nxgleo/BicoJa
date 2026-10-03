import webpush from "web-push";

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || "";

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    "mailto:suporte@bicoja.com.br",
    publicVapidKey,
    privateVapidKey
  );
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
}

export type PushNotificationResult =
  | { success: true }
  | { success: false; error: string; statusCode?: number };

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: PushNotificationPayload
): Promise<PushNotificationResult> {
  if (!publicVapidKey || !privateVapidKey) {
    return {
      success: false,
      error: "As chaves VAPID não estão configuradas.",
    };
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
    return { success: true };
  } catch (error) {
    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : undefined;

    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao enviar notificação Push.",
      ...(statusCode ? { statusCode } : {}),
    };
  }
}