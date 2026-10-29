import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Lê o .env.test (banco banco_servicos_teste) para os testes que usam o banco de verdade
function lerEnvTeste(): Record<string, string> {
  const texto = readFileSync(".env.test", "utf8");
  const env: Record<string, string> = {};
  for (const linha of texto.split(/\r?\n/)) {
    const m = linha.match(/^([A-Z_]+)="?(.*?)"?$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const envTeste = lerEnvTeste();
// Também vale para o globalSetup (migrações), que roda fora dos testes
Object.assign(process.env, envTeste);

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["**/*.int.test.ts"],
    exclude: ["node_modules", ".next"],
    env: envTeste,
    globalSetup: ["./vitest.integracao.setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
