// Criar conta nova (passo "Seus dados" do cadastro).
import bcrypt from "bcryptjs";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { z } from "zod";
import { escolhaParaPapel, type esquemaCadastro } from "./esquemas";

export type ResultadoCadastro =
  | { ok: true; userId: string }
  | { ok: false; campo: "email" | "telefone"; erro: string };

const ERRO_EMAIL = "Esse email já tem conta. Quer entrar?";
const ERRO_TELEFONE = "Esse celular já tem conta. Quer entrar?";

async function campoRepetido(
  prisma: PrismaClient,
  email: string,
  telefone: string
): Promise<ResultadoCadastro | null> {
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return { ok: false, campo: "email", erro: ERRO_EMAIL };
  }
  if (await prisma.user.findUnique({ where: { telefone }, select: { id: true } })) {
    return { ok: false, campo: "telefone", erro: ERRO_TELEFONE };
  }
  return null;
}

export async function criarConta(
  prisma: PrismaClient,
  dados: z.infer<typeof esquemaCadastro>
): Promise<ResultadoCadastro> {
  const repetido = await campoRepetido(prisma, dados.email, dados.telefone);
  if (repetido) return repetido;

  const senhaHash = await bcrypt.hash(dados.senha, 10);
  const { role, modoAtual } = escolhaParaPapel(dados.escolha);

  try {
    const user = await prisma.user.create({
      data: { nome: dados.nome, email: dados.email, telefone: dados.telefone, senha: senhaHash, role, modoAtual },
      select: { id: true },
    });
    return { ok: true, userId: user.id };
  } catch (erro) {
    // Duas pessoas (ou dois cliques) ao mesmo tempo: o banco barra a segunda
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return (await campoRepetido(prisma, dados.email, dados.telefone)) ?? { ok: false, campo: "email", erro: ERRO_EMAIL };
    }
    throw erro;
  }
}
