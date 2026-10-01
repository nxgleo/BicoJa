import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { nome, email, senha, telefone, role } = await req.json();

    if (!email || !senha || !nome) {
      return NextResponse.json(
        { error: "Nome, email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return NextResponse.json({ error: "Email já registado" }, { status: 400 });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const user = await prisma.user.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        telefone,
        role: role || "CONTRATANTE",
      },
    });

    return NextResponse.json(
      { message: "Utilizador criado com sucesso", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar utilizador" }, { status: 500 });
  }
}