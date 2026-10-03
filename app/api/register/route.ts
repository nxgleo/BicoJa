import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { nome, email, senha, telefone, role } = await req.json();

    if (!email || !senha || !nome) {
      return NextResponse.json(
        { success: false, data: null, error: "Nome, email e senha são obrigatórios" },
        { status: 400 }
      );
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
      { success: true, data: { userId: user.id }, error: null },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, data: null, error: "Email já cadastrado" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, data: null, error: "Erro interno ao criar utilizador" },
      { status: 500 }
    );
  }
}