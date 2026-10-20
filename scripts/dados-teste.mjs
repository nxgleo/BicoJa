// Cria dados de exemplo no banco LOCAL para ver as telas. Uso: node --env-file=.env scripts/dados-teste.mjs
//
// Contas de teste (só existem no banco local):
//   Maria (cliente e prestadora de pintura) — email maria.teste@exemplo.test · celular (91) 90000-0001
//     · senha nova-senha-verde-7 (criada pelas telas do cadastro)
//   João Encanador (prestador de exemplo)  — email joao.encanador@exemplo.test · senha joao-teste-encanador-1
//   Os outros prestadores de exemplo não têm senha (não dá para entrar com eles).
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// [nome, título, descrição, preço, categoria, latitude] — todos perto do Marco, em Belém
const exemplos = [
  ["João Encanador", "Consertos de encanamento e hidráulica", "Detecção de vazamentos, troca de torneiras e reparo em descargas.", 80, "encanamento", -1.4365],
  ["Ana Pinturas", "Pintura residencial e comercial", "Pintura de salas, fachadas, portões e textura. 8 anos de experiência.", 150, "pintura", -1.4410],
  ["Carlos Eletricista", "Instalação elétrica e troca de chuveiro", "Tomadas, disjuntores, chuveiros e iluminação com segurança.", 90, "eletrica", -1.4290],
  ["Roberto Montagens", "Montagem de móveis e guarda-roupas", "Monto armários, camas, racks e instalo suportes de TV.", 70, "montagem", -1.4480],
];

const LONGITUDE = -48.4702;

/** Foto de perfil de exemplo (um quadrado colorido) — sem foto não dá para conversar. */
async function fotoDeExemplo(cor) {
  const pasta = path.join(process.cwd(), "uploads", "fotos");
  await mkdir(pasta, { recursive: true });
  const nome = `${randomUUID()}.webp`;
  const webp = await sharp({ create: { width: 256, height: 256, channels: 3, background: cor } }).webp().toBuffer();
  await writeFile(path.join(pasta, nome), webp);
  return `/api/arquivos/fotos/${nome}`;
}
const CORES = ["#E8770C", "#16A34A", "#2563EB", "#9333EA"];
const oitoHoras = () => new Date(Date.now() + 8 * 3600_000);

for (const [i, [nome, titulo, descricao, preco, categoria, latitude]] of exemplos.entries()) {
  const email = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, ".") + "@exemplo.test";
  const senha = nome === "João Encanador" ? await bcrypt.hash("joao-teste-encanador-1", 10) : undefined;
  const user = await prisma.user.upsert({
    where: { email },
    update: { ...(senha && { senha }), emailVerified: new Date(), modoAtual: "PRESTADOR", role: "PRESTADOR" },
    create: { nome, email, role: "PRESTADOR", modoAtual: "PRESTADOR", emailVerified: new Date(), ...(senha && { senha }) },
  });

  if (!user.image) await prisma.user.update({ where: { id: user.id }, data: { image: await fotoDeExemplo(CORES[i]) } });

  const perfil = { categorias: [categoria], bairro: "Marco", cidade: "Belém", latitude, longitude: LONGITUDE, raioKm: 15, precoBase: preco, disponivel: true, disponivelAte: oitoHoras() };
  await prisma.perfilPrestador.upsert({ where: { userId: user.id }, update: perfil, create: { userId: user.id, ...perfil } });

  const existe = await prisma.servico.findFirst({ where: { titulo, prestadorId: user.id } });
  if (existe) {
    await prisma.servico.update({ where: { id: existe.id }, data: { categoria, ativo: true, latitude, longitude: LONGITUDE } });
  } else {
    await prisma.servico.create({ data: { titulo, descricao, preco, categoria, latitude, longitude: LONGITUDE, prestadorId: user.id } });
  }
}
console.log("Dados de teste prontos (prestadores disponíveis por 8 horas).");
await prisma.$disconnect();
