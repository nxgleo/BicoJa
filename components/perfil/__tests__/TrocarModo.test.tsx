import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ update: vi.fn() }) }));

import { TrocarModo } from "@/components/perfil/TrocarModo";

describe("TrocarModo", () => {
  test("mostra o modo atual pressionado", () => {
    render(<TrocarModo modoAtual="CLIENTE" />);
    expect(screen.getByRole("button", { name: /Modo cliente/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Modo prestador/ })).toHaveAttribute("aria-pressed", "false");
  });
});
