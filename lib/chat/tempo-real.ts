// Avisos em tempo real pelo Socket.IO (criado no server.js).
// Cada pessoa logada fica na sala "user:<id>" — só o servidor coloca alguém numa sala.
import type { MensagemChat } from "@/lib/chat/conversas";

type Io = { to(sala: string): { emit(evento: string, dados: unknown): void } };

export type EventosChat = {
  "chat:mensagens": { conversaId: string; mensagens: MensagemChat[] };
  "chat:lida": { conversaId: string; em: string };
};

export function avisar<E extends keyof EventosChat>(userIds: (string | null)[], evento: E, dados: EventosChat[E]) {
  const io = (globalThis as { io?: Io }).io;
  if (!io) return; // nos testes não há socket
  for (const id of new Set(userIds)) if (id) io.to(`user:${id}`).emit(evento, dados);
}
