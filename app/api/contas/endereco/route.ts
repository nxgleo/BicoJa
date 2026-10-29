import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enderecoDoUsuario, salvarEndereco } from "@/lib/enderecos";
import { esquemaEndereco, primeiroErro } from "@/lib/contas/esquemas";
import { ERRO_LIMITE, lerJson, limitar, responderErro } from "@/lib/contas/requisicao";
import { idDaSessao } from "@/lib/contas/sessao";

// GET /api/contas/endereco — o endereço salvo de quem está logado
export async function GET() {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  return NextResponse.json({ ok: true, endereco: await enderecoDoUsuario(prisma, userId) });
}

// PUT /api/contas/endereco — salvar ou trocar "Meu endereço"
export async function PUT(req: Request) {
  const userId = await idDaSessao();
  if (!userId) return responderErro(401, "Entre na sua conta para continuar.");
  if (!(await limitar(`endereco:${userId}`, 10, 600))) return responderErro(429, ERRO_LIMITE);

  const validado = esquemaEndereco.safeParse(await lerJson(req));
  if (!validado.success) {
    const { campo, erro } = primeiroErro(validado.error);
    return responderErro(400, erro, campo);
  }
  const r = await salvarEndereco(prisma, userId, validado.data);
  if (!r.ok) return responderErro(400, r.erro, r.campo);
  return NextResponse.json({ ok: true, endereco: r.endereco });
}
