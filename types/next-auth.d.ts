// O que a sessão do BicoJá carrega além do padrão do NextAuth.
import type { DefaultSession } from "next-auth";

type Modo = "CLIENTE" | "PRESTADOR";
type Papel = "CONTRATANTE" | "PRESTADOR" | "AMBOS";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      emailVerificado: boolean;
      temFoto: boolean;
      modoAtual: Modo;
      role: Papel;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    emailVerificado?: boolean;
    temFoto?: boolean;
    modoAtual?: Modo;
    role?: Papel;
  }
}
