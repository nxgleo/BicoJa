import { afterEach, expect, test, vi } from "vitest";
import { enviarEmail } from "@/lib/email";

afterEach(() => vi.restoreAllMocks());

test("sem servidor de email configurado, mostra o email no terminal", async () => {
  vi.stubEnv("SMTP_HOST", "");
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  await expect(enviarEmail("a@b.test", "Assunto", "Seu código é 123456")).resolves.toBeUndefined();
  const impresso = log.mock.calls.map((c) => c.join(" ")).join("\n");
  expect(impresso).toContain("a@b.test");
  expect(impresso).toContain("123456");
});
