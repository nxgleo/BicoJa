const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { getToken } = require("next-auth/jwt");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

/** "a=1; b=2" → { a: "1", b: "2" } */
function lerCookies(cabecalho = "") {
  const cookies = {};
  for (const parte of cabecalho.split(";")) {
    const i = parte.indexOf("=");
    if (i < 0) continue;
    const nome = parte.slice(0, i).trim();
    try {
      cookies[nome] = decodeURIComponent(parte.slice(i + 1).trim());
    } catch {
      // cookie com formato estranho: ignora
    }
  }
  return cookies;
}

/** Só aceita conexões vindas do próprio site (evita outro site usar o login da pessoa). */
function mesmaOrigem(req) {
  const origem = req.headers.origin;
  if (!origem) return true;
  try {
    return new URL(origem).host === req.headers.host;
  } catch {
    return false;
  }
}

app.prepare().then(() => {
  const { PrismaClient } = require("@prisma/client");
  const prisma = global.prisma || new PrismaClient();

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/api/socket/io",
    addTrailingSlash: false,
    allowRequest: (req, callback) => callback(null, mesmaOrigem(req)),
  });

  // Quem conecta é identificado pelo cookie de login (NextAuth), nunca por um id mandado pelo navegador
  io.use(async (socket, proximo) => {
    try {
      const headers = socket.request.headers;
      const token = await getToken({
        req: { headers, cookies: lerCookies(headers.cookie) },
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (!token?.sub) return proximo(new Error("sem login"));
      socket.data.userId = token.sub;
      proximo();
    } catch {
      proximo(new Error("sem login"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    // Cada pessoa só entra na própria sala; as rotas da API mandam os avisos para lá
    socket.join(`user:${userId}`);

    // "digitando...": confere se a pessoa está na conversa e se não há bloqueio
    let ultimoDigitando = 0;
    socket.on("chat:digitando", async (dados) => {
      const conversaId = dados && typeof dados.conversaId === "string" ? dados.conversaId : "";
      const agora = Date.now();
      if (!conversaId || conversaId.length > 64 || agora - ultimoDigitando < 2000) return;
      ultimoDigitando = agora;
      try {
        const c = await prisma.conversa.findFirst({
          where: { id: conversaId, OR: [{ clienteId: userId }, { prestadorId: userId }] },
          select: { clienteId: true, prestadorId: true },
        });
        if (!c) return;
        const outroId = c.clienteId === userId ? c.prestadorId : c.clienteId;
        const bloqueios = await prisma.bloqueio.count({
          where: { OR: [{ autorId: userId, bloqueadoId: outroId }, { autorId: outroId, bloqueadoId: userId }] },
        });
        if (bloqueios === 0) io.to(`user:${outroId}`).emit("chat:digitando", { conversaId });
      } catch {
        // falha ao avisar "digitando" não atrapalha o chat
      }
    });
  });

  global.io = io;

  httpServer.listen(port, () => {
    console.log(`> Servidor rodando em http://${hostname}:${port}`);
  });
});
