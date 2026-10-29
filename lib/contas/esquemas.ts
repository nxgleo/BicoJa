// Validação dos formulários de conta (usada no navegador e, valendo de verdade, no servidor).
import { z } from "zod";
import type { Modo, Role } from "@prisma/client";
import { CATEGORIAS, type CategoriaId } from "@/lib/categorias";
import { problemaNaSenha } from "./senha";
import { normalizarTelefone } from "./telefone";

export type Escolha = "CONTRATAR" | "FAZER_BICOS" | "OS_DOIS";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(120, "Email muito comprido.")
  .email("Email inválido. Confira se digitou certo.");

const telefone = z.string().transform((valor, ctx) => {
  const normalizado = normalizarTelefone(valor);
  if (!normalizado) {
    ctx.addIssue({ code: "custom", message: "Celular inválido. Use DDD + número." });
    return z.NEVER;
  }
  return normalizado;
});

const nome = z
  .string()
  .trim()
  .min(2, "Escreva seu nome completo.")
  .max(80, "Nome muito comprido.");

export const esquemaCadastro = z
  .object({
    escolha: z.enum(["CONTRATAR", "FAZER_BICOS", "OS_DOIS"]),
    nome,
    email,
    telefone,
    senha: z.string(),
  })
  .superRefine((dados, ctx) => {
    const problema = problemaNaSenha(dados.senha, { nome: dados.nome, email: dados.email });
    if (problema) ctx.addIssue({ code: "custom", path: ["senha"], message: problema });
  });

export const esquemaEntrar = z.object({
  identificador: z.string().trim().min(1, "Digite seu email ou celular.").max(120),
  senha: z.string().min(1, "Digite sua senha.").max(200),
});

export const esquemaCodigo = z.object({
  codigo: z.string().regex(/^\d{6}$/, "O código tem 6 números."),
});

export const esquemaRecuperar = z.object({ email });

export const esquemaRedefinirSenha = z
  .object({ email, codigo: z.string().regex(/^\d{6}$/, "O código tem 6 números."), novaSenha: z.string() })
  .superRefine((dados, ctx) => {
    const problema = problemaNaSenha(dados.novaSenha, { email: dados.email });
    if (problema) ctx.addIssue({ code: "custom", path: ["novaSenha"], message: problema });
  });

export const esquemaTrocarEmail = z.object({ email });

export const esquemaPerfil = z.object({
  nome: nome.optional(),
  telefone: telefone.optional(),
});

const idsCategorias = CATEGORIAS.map((c) => c.id) as [CategoriaId, ...CategoriaId[]];

export const esquemaPrestador = z.object({
  categorias: z
    .array(z.enum(idsCategorias))
    .min(1, "Escolha pelo menos um serviço.")
    .max(5, "Escolha no máximo 5 serviços."),
  bairro: z.string().trim().min(2, "Escreva seu bairro.").max(60),
  cidade: z.string().trim().min(2, "Escreva sua cidade.").max(60),
  raioKm: z.number().int().min(1).max(50),
  precoBase: z.number().min(0).max(100000).optional(),
  bio: z.string().trim().max(300, "Escreva no máximo 300 letras.").optional(),
});

export const esquemaModo = z.object({ modo: z.enum(["CLIENTE", "PRESTADOR"]) });

// O modo prestador só liga depois do "Quero fazer bicos" (precisa de PerfilPrestador).
export function escolhaParaPapel(escolha: Escolha): { role: Role; modoAtual: Modo } {
  if (escolha === "FAZER_BICOS") return { role: "PRESTADOR", modoAtual: "CLIENTE" };
  if (escolha === "OS_DOIS") return { role: "AMBOS", modoAtual: "CLIENTE" };
  return { role: "CONTRATANTE", modoAtual: "CLIENTE" };
}

/** Primeiro erro do zod no formato que as telas usam: { campo, erro }. */
export function primeiroErro(erro: z.ZodError): { campo?: string; erro: string } {
  const issue = erro.issues[0];
  return { campo: issue?.path[0]?.toString(), erro: issue?.message ?? "Confira os dados." };
}

export const esquemaEndereco = z.object({
  rua: z.string().trim().min(2, "Escreva o nome da rua.").max(100),
  numero: z.string().trim().min(1, "Escreva o número (ou S/N).").max(10),
  complemento: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => v || undefined),
  bairro: z.string().trim().min(2, "Escreva seu bairro.").max(60),
  cidade: z.string().trim().min(2, "Escreva sua cidade.").max(60),
});
