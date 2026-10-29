import { afterAll, expect, test } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { POST } from "@/app/api/contas/cadastro/route";

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

test("erros de digitação no cadastro não bloqueiam a pessoa", async () => {
  const ip = `teste-${randomUUID()}`;
  const corpo = JSON.stringify({ escolha: "CONTRATAR", nome: "Ana", email: "ana@teste.test", telefone: "91988887777", senha: "12345678" });
  let ultimo = 0;
  for (let i = 0; i < 8; i++) {
    const resposta = await POST(new Request("http://localhost/api/contas/cadastro", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: corpo,
    }));
    ultimo = resposta.status;
  }
  expect(ultimo).toBe(400); // senha fraca: erro de validação, não "muitas tentativas"
});
