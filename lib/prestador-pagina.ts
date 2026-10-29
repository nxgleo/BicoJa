// Páginas do modo prestador: exigem login e o "Quero fazer bicos" feito.
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirLogin } from "@/lib/sessao-pagina";

export async function exigirPrestador(voltar: string) {
  const userId = await exigirLogin(voltar);
  const perfil = await prisma.perfilPrestador.findUnique({ where: { userId } });
  if (!perfil) redirect("/quero-fazer-bicos");
  return { userId, perfil };
}
