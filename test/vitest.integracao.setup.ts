import { execSync } from "node:child_process";

// Antes dos testes de banco: aplica as migrações no banco de teste
export default function prepararBancoDeTeste() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("_teste")) throw new Error("Testes de banco só rodam no banco *_teste (confira o .env.test).");
  execSync("npx prisma migrate deploy --schema Prisma/schema.prisma", { stdio: "inherit", env: process.env });
}
