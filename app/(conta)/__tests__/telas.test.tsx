import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
const update = vi.fn().mockResolvedValue(null);
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { email: "ana@teste.test" } }, update }),
  signIn: vi.fn(),
}));

import EsqueciSenha from "@/app/(conta)/esqueci-senha/page";
import ConfirmarEmail from "@/app/(conta)/cadastro/codigo/page";

function respostaJson(dados: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(dados), { status, headers: { "content-type": "application/json" } }));
}

let chamadas: string[] = [];
beforeEach(() => {
  chamadas = [];
  push.mockReset();
  update.mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Esqueci minha senha", () => {
  test("no passo do código dá para pedir um código novo", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      chamadas.push(url);
      return respostaJson({ ok: true });
    }));
    render(<EsqueciSenha />);
    await userEvent.type(screen.getByLabelText("Email"), "ana@teste.test");
    await userEvent.click(screen.getByRole("button", { name: "Mandar código" }));
    const botao = await screen.findByRole("button", { name: /Mandar novo código/ });
    expect(botao).toBeDisabled(); // espera 60 segundos antes de liberar
    expect(chamadas.filter((u) => u.includes("/senha/recuperar"))).toHaveLength(1);
  });
});

describe("Confirmar email", () => {
  test("se o email já estava confirmado, atualiza a sessão e segue para a foto", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal("fetch", vi.fn(() => respostaJson({ ok: true, jaConfirmado: true })));
    render(<ConfirmarEmail />);
    for (let s = 0; s < 61; s++) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
    }
    await userEvent.click(await screen.findByRole("button", { name: "Mandar de novo" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/cadastro/foto"));
    expect(update).toHaveBeenCalled();
  });
});
