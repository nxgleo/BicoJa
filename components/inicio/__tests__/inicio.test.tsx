import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { BotaoAjudaAgora } from "@/components/inicio/BotaoAjudaAgora";
import { BuscaPrincipal } from "@/components/inicio/BuscaPrincipal";
import { CartaoFazerBicos } from "@/components/inicio/CartaoFazerBicos";
import { ListaCategorias } from "@/components/inicio/ListaCategorias";
import { SecaoDisponiveis } from "@/components/inicio/SecaoDisponiveis";

describe("SecaoDisponiveis", () => {
  test("sem serviços mostra convite para publicar pedido", () => {
    render(<SecaoDisponiveis servicos={[]} />);
    expect(screen.getByRole("link", { name: "Publicar meu pedido" })).toHaveAttribute("href", "/pedidos/novo");
  });

  test("com erro avisa e oferece tentar de novo", () => {
    render(<SecaoDisponiveis servicos={[]} erro />);
    expect(screen.getByText("Não conseguimos carregar agora.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tentar de novo" })).toBeInTheDocument();
  });

  test("mostra os serviços como cartões", () => {
    render(
      <SecaoDisponiveis
        servicos={[{ id: "1", titulo: "Conserto de pia", descricao: "", preco: 80, prestador: { id: "p", nome: "João" } }]}
      />
    );
    expect(screen.getByRole("link", { name: /Conserto de pia/ })).toHaveAttribute("href", "/servicos/1");
  });
});

describe("BotaoAjudaAgora", () => {
  test("leva ao pedido urgente e é vermelho", () => {
    render(<BotaoAjudaAgora />);
    const link = screen.getByRole("link", { name: /Preciso de ajuda agora/ });
    expect(link).toHaveAttribute("href", "/pedidos/urgente");
    expect(link.className).toContain("bg-urgencia");
  });
});

describe("BuscaPrincipal", () => {
  test("campo tem rótulo, limite de 100 letras e envia para /buscar", () => {
    render(<BuscaPrincipal />);
    const campo = screen.getByRole("searchbox", { name: "O que você precisa?" });
    expect(campo).toHaveAttribute("maxLength", "100");
    expect(campo).toHaveAttribute("name", "q");
    expect(campo.closest("form")).toHaveAttribute("action", "/buscar");
  });
});

describe("ListaCategorias", () => {
  test("cada categoria é um link para a busca", () => {
    render(<ListaCategorias />);
    expect(screen.getByRole("link", { name: "Encanamento" })).toHaveAttribute("href", "/buscar?categoria=encanamento");
  });
});

describe("CartaoFazerBicos", () => {
  test("usa a frase combinada", () => {
    render(<CartaoFazerBicos />);
    expect(screen.getByText("Quer ganhar dinheiro fazendo bicos?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Quero fazer bicos" })).toHaveAttribute("href", "/quero-fazer-bicos");
  });
});
