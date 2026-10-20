import { describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MenuInferior } from "@/components/layout/MenuInferior";

const caminho = vi.hoisted(() => ({ atual: "/conversas" }));
vi.mock("next/navigation", () => ({ usePathname: () => caminho.atual }));

describe("MenuInferior", () => {
  test("marca a página atual", () => {
    render(<MenuInferior modo="cliente" />);
    expect(screen.getByRole("link", { name: "Conversas" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Início" })).not.toHaveAttribute("aria-current");
  });

  test("modo cliente tem 4 itens com texto", () => {
    render(<MenuInferior modo="cliente" />);
    const menu = screen.getByRole("navigation", { name: "Menu principal" });
    const links = within(menu).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Início", "Pedidos", "Conversas", "Perfil"]);
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/", "/pedidos", "/conversas", "/perfil"]);
  });

  test("modo prestador tem 5 itens", () => {
    render(<MenuInferior modo="prestador" />);
    const links = within(screen.getByRole("navigation", { name: "Menu principal" })).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Início", "Serviços", "Conversas", "Ganhos", "Perfil"]);
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/prestador",
      "/prestador/servicos",
      "/conversas",
      "/prestador/ganhos",
      "/perfil",
    ]);
  });

  test("Início só fica ativo na página inicial exata", () => {
    caminho.atual = "/";
    render(<MenuInferior modo="cliente" />);
    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Pedidos" })).not.toHaveAttribute("aria-current");
  });
});
