import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Id de quem está logado, ou null. */
export async function idDaSessao(): Promise<string | null> {
  const sessao = await getServerSession(authOptions);
  return sessao?.user?.id ?? null;
}
