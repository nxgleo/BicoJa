// Ajudante das páginas (Server Components): quem está logado, ou manda para o login.
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function exigirLogin(voltar: string): Promise<string> {
  const sessao = await getServerSession(authOptions);
  if (!sessao?.user?.id) redirect(`/entrar?voltar=${encodeURIComponent(voltar)}`);
  return sessao.user.id;
}
