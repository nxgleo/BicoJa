import { describe, expect, test } from "vitest";
import { cabecalhosSeguranca } from "@/lib/seguranca";

function valor(nome: string) {
  return cabecalhosSeguranca.find((c) => c.key === nome)?.value ?? "";
}

describe("cabeçalhos de segurança", () => {
  test("impede o site de ser aberto dentro de outro (clickjacking)", () => {
    expect(valor("X-Frame-Options")).toBe("DENY");
  });

  test("o navegador não 'adivinha' tipo de arquivo", () => {
    expect(valor("X-Content-Type-Options")).toBe("nosniff");
  });

  test("não vaza o endereço completo para outros sites", () => {
    expect(valor("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  test("só pede câmera e localização no próprio site, nunca microfone", () => {
    const p = valor("Permissions-Policy");
    expect(p).toContain("camera=(self)");
    expect(p).toContain("geolocation=(self)");
    expect(p).toContain("microphone=()");
  });

  test("política de conteúdo restringe origens", () => {
    const csp = valor("Content-Security-Policy");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain("ws: wss:");
    expect(csp).toContain("img-src 'self' data: blob:");
  });
});
