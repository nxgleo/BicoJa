// Conferir email-ou-celular + senha no login.
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { ehEmail, normalizarTelefone } from "./telefone";

export type UsuarioAutenticado = { id: string; name: string | null; email: string | null; image: string | null };

// Hash qualquer para gastar o mesmo tempo quando a conta não existe
// (assim ninguém descobre quais emails têm conta pelo tempo de resposta).
const HASH_FALSO = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8.Lr6xRGbZwX6q4f1wC2r3r1lE9q0a";

export async function autenticar(
  prisma: PrismaClient,
  identificador: string,
  senha: string
): Promise<UsuarioAutenticado | null> {
  const texto = identificador.trim();
  const telefone = ehEmail(texto) ? null : normalizarTelefone(texto);
  const user = ehEmail(texto)
    ? await prisma.user.findUnique({ where: { email: texto.toLowerCase() } })
    : telefone
      ? await prisma.user.findUnique({ where: { telefone } })
      : null;
  const confere = await bcrypt.compare(senha, user?.senha ?? HASH_FALSO);
  if (!user || !user.senha || !confere) return null;

  return { id: user.id, name: user.nome, email: user.email, image: user.image };
}
