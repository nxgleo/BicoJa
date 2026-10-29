import { beforeEach, describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeletorTema } from "@/components/layout/SeletorTema";
import { lerPreferenciaTema } from "@/lib/tema";

describe("SeletorTema", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("escuro");
  });

  test("mostra as três opções com texto visível", () => {
    render(<SeletorTema />);
    expect(screen.getByRole("radiogroup", { name: "Tema" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Igual ao celular" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Claro" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Escuro" })).toBeInTheDocument();
  });

  test("escolher Escuro liga o tema escuro e salva a escolha", async () => {
    render(<SeletorTema />);
    await userEvent.click(screen.getByRole("radio", { name: "Escuro" }));
    expect(document.documentElement.classList.contains("escuro")).toBe(true);
    expect(lerPreferenciaTema()).toBe("escuro");
    expect(screen.getByRole("radio", { name: "Escuro" })).toHaveAttribute("aria-checked", "true");
  });

  test("escolher Claro desliga o tema escuro", async () => {
    document.documentElement.classList.add("escuro");
    render(<SeletorTema />);
    await userEvent.click(screen.getByRole("radio", { name: "Claro" }));
    expect(document.documentElement.classList.contains("escuro")).toBe(false);
    expect(lerPreferenciaTema()).toBe("claro");
  });
});
