import { Server as NetServer } from "http";
import { Server as ServerIO } from "socket.io";

export type NextApiResponseServerIO = {
  socket: {
    server: NetServer & {
      io?: ServerIO;
    };
  };
};

export const initSocket = (server: NetServer) => {
  if (!server) return null;

  const io = new ServerIO(server, {
    path: "/api/socket/io",
    addTrailingSlash: false,
  });

  io.on("connection", (socket) => {
    socket.on("join-room", (userId: string) => {
      socket.join(userId);
    });

    socket.on("disconnect", () => {
      // Conexão encerrada
    });
  });

  return io;
};