import { expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/servicos", () => ({ buscarServicos: vi.fn().mockResolvedValue([]) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/buscar" }));

import Buscar from "@/app/(app)/buscar/page";

test("busca muito longa sem espaços quebra a linha em vez de rolar para o lado", async () => {
  const pagina = await Buscar({ searchParams: Promise.resolve({ q: "a".repeat(100) }) });
  render(pagina);
  expect(screen.getByRole("heading", { level: 1 }).className).toMatch(/break-words|overflow-wrap:anywhere/);
});
