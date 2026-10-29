// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { geocodeEndereco } from "@/lib/maps";

afterEach(() => vi.unstubAllGlobals());

describe("geocodeEndereco", () => {
  test("se o serviço de mapas não responder, desiste e devolve null", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: string, opcoes: { signal?: AbortSignal }) =>
      new Promise((_resolver, rejeitar) => opcoes.signal?.addEventListener("abort", () => rejeitar(new Error("cancelado"))))
    ));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await geocodeEndereco("Marco, Belém", 50)).toBeNull();
  });

  test("resposta de erro do serviço devolve null", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("erro", { status: 503 })));
    expect(await geocodeEndereco("Marco, Belém")).toBeNull();
  });
});
