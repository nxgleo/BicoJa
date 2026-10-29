// Avisos em tempo real pelo Socket.IO (criado no server.js).
// Cada pessoa logada fica na sala "user:<id>" — só o servidor coloca alguém numa sala.
import type { MensagemChat } from "@/lib/chat/conversas";

type Io = { to(sala: string): { emit(evento: string, dados: unknown): void } };

export type EventosChat = {
  "chat:mensagens": { conversaId: string; mensagens: MensagemChat[] };
  "chat:lida": { conversaId: string; em: string };
  "contrato:mudou": { contratoId: string };
  "aviso:novo": Record<string, never>;
};

export function avisar<E extends keyof EventosChat>(userIds: (string | null)[], evento: E, dados: EventosChat[E]) {
  const io = (globalThis as { io?: Io }).io;
  if (!io) return; // nos testes não há socket
  for (const id of new Set(userIds)) if (id) io.to(`user:${id}`).emit(evento, dados);
}

/** Manda pelo socket tudo o que uma ação de contrato mudou (chat, sininho, tela do serviço). */
export function avisarEfeitos(e: {
  chat: { conversaId: string; mensagens: MensagemChat[]; avisar: string[] }[];
  avisados: string[];
  contrato: { id: string; avisar: string[] }[];
}) {
  for (const c of e.chat) avisar(c.avisar, "chat:mensagens", { conversaId: c.conversaId, mensagens: c.mensagens });
  avisar(e.avisados, "aviso:novo", {});
  for (const c of e.contrato) avisar(c.avisar, "contrato:mudou", { contratoId: c.id });
}
