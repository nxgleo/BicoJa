// Conexão em tempo real do chat (navegador). O servidor sabe quem é pelo cookie de login.
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function conectarChat(): Socket {
  if (!socket) socket = io({ path: "/api/socket/io", withCredentials: true });
  return socket;
}

export function desconectarChat() {
  socket?.disconnect();
  socket = null;
}
