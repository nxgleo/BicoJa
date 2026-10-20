// Cria dados de exemplo no banco LOCAL para ver as telas. Uso: node --env-file=.env scripts/dados-teste.mjs
//
// Conta de teste criada pelas telas durante o desenvolvimento (só existe no banco local):
//   email maria.teste@exemplo.test · celular (91) 90000-0001 · senha nova-senha-verde-7 (trocada pelo "Esqueci minha senha")
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const exemplos = [
  ["João Encanador", "Consertos de encanamento e hidráulica", "Detecção de vazamentos, troca de torneiras e reparo em descargas.", 80],
  ["Ana Pinturas", "Pintura residencial e comercial", "Pintura de salas, fachadas, portões e textura. 8 anos de experiência.", 150],
  ["Carlos Eletricista", "Instalação elétrica e troca de chuveiro", "Tomadas, disjuntores, chuveiros e iluminação com segurança.", 90],
  ["Roberto Montagens", "Montagem de móveis e guarda-roupas", "Monto armários, camas, racks e instalo suportes de TV.", 70],
];

for (const [nome, titulo, descricao, preco] of exemplos) {
  const email = nome.toLowerCase().replace(/\s+/g, ".") + "@exemplo.test";
  const user = await prisma.user.upsert({ where: { email }, update: {}, create: { nome, email, role: "PRESTADOR" } });
  const existe = await prisma.servico.findFirst({ where: { titulo, prestadorId: user.id } });
  if (!existe) {
    await prisma.servico.create({ data: { titulo, descricao, preco, latitude: -1.4558, longitude: -48.4902, prestadorId: user.id } });
  }
}
console.log("Dados de teste prontos.");
await prisma.$disconnect();
