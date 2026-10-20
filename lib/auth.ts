// Configuração do login (NextAuth). Fica aqui porque arquivos de rota do Next
// só podem exportar GET/POST/etc.
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { autenticar } from "@/lib/contas/entrar";
import { esquemaEntrar } from "@/lib/contas/esquemas";
import { checkRateLimit } from "@/lib/rate-limit";

/** Lê do banco o que a sessão precisa saber (etapa do cadastro, modo, foto). */
async function dadosDaSessao(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { nome: true, email: true, image: true, emailVerified: true, modoAtual: true, role: true },
  });
  if (!user) return null;
  return {
    name: user.nome,
    email: user.email,
    picture: user.image,
    emailVerificado: Boolean(user.emailVerified),
    temFoto: Boolean(user.image),
    modoAtual: user.modoAtual,
    role: user.role,
  };
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma) as AuthOptions["adapter"],
  session: { strategy: "jwt" },
  pages: { signIn: "/entrar" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identificador: { label: "Email ou celular", type: "text" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials, req) {
        const validado = esquemaEntrar.safeParse(credentials);
        if (!validado.success) return null;
        const { identificador, senha } = validado.data;

        const encaminhado = req?.headers?.["x-forwarded-for"];
        const ip = (Array.isArray(encaminhado) ? encaminhado[0] : encaminhado)?.split(",")[0]?.trim() || "local";
        const limite = await checkRateLimit(`entrar:${ip}:${identificador.toLowerCase()}`, 10, 600);
        if (!limite.success) {
          console.warn("Login bloqueado por excesso de tentativas:", ip);
          return null;
        }

        return autenticar(prisma, identificador, senha);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // No login, e quando a tela pede "update()" (ex.: depois de confirmar o código ou mandar a foto)
      if (user || trigger === "update") {
        const id = (user?.id ?? token.sub) as string | undefined;
        const dados = id ? await dadosDaSessao(id) : null;
        if (dados) Object.assign(token, dados);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.name = token.name ?? null;
        session.user.email = token.email ?? null;
        session.user.image = token.picture ?? null;
        session.user.emailVerificado = token.emailVerificado ?? false;
        session.user.temFoto = token.temFoto ?? false;
        session.user.modoAtual = token.modoAtual ?? "CLIENTE";
        session.user.role = token.role ?? "CONTRATANTE";
      }
      return session;
    },
  },
};
