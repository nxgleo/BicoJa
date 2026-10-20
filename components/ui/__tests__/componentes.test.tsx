import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { Search } from "lucide-react";
import { Avatar, Botao, Campo, CartaoServico, Chip, EstadoVazio } from "@/components/ui";

describe("Botao", () => {
  test("tem altura mínima de toque (48px)", () => {
    render(<Botao>Enviar</Botao>);
    expect(screen.getByRole("button", { name: "Enviar" }).className).toContain("min-h-12");
  });

  test("carregando fica ocupado e desabilitado", () => {
    render(<Botao carregando>Enviar</Botao>);
    const botao = screen.getByRole("button", { name: /Enviar/ });
    expect(botao).toHaveAttribute("aria-busy", "true");
    expect(botao).toBeDisabled();
  });

  test("com href vira um link", () => {
    render(<Botao href="/pedidos/novo">Publicar</Botao>);
    expect(screen.getByRole("link", { name: "Publicar" })).toHaveAttribute("href", "/pedidos/novo");
  });

  test("variante urgente usa a cor de urgência", () => {
    render(<Botao variante="urgente">Socorro</Botao>);
    expect(screen.getByRole("button", { name: "Socorro" }).className).toContain("bg-urgencia");
  });
});

describe("Campo", () => {
  test("o rótulo identifica o campo", () => {
    render(<Campo rotulo="Email" type="email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  test("com erro, avisa leitores de tela e liga a mensagem ao campo", () => {
    render(<Campo rotulo="Email" erro="Email inválido" />);
    const campo = screen.getByLabelText("Email");
    expect(campo).toHaveAttribute("aria-invalid", "true");
    const idErro = campo.getAttribute("aria-describedby");
    expect(idErro).toBeTruthy();
    expect(document.getElementById(idErro!.split(" ")[0])).toHaveTextContent("Email inválido");
  });
});

describe("Chip", () => {
  test("botão ativo fica pressionado", () => {
    render(<Chip ativo onClick={() => {}}>Pintura</Chip>);
    expect(screen.getByRole("button", { name: "Pintura" })).toHaveAttribute("aria-pressed", "true");
  });

  test("link ativo marca a página atual", () => {
    render(<Chip ativo href="/buscar?categoria=pintura">Pintura</Chip>);
    expect(screen.getByRole("link", { name: "Pintura" })).toHaveAttribute("aria-current", "page");
  });
});

describe("CartaoServico", () => {
  const base = { titulo: "Conserto de pia", nomePrestador: "João", href: "/servicos/1" };

  test("título longo é cortado em 2 linhas", () => {
    render(<CartaoServico {...base} titulo={"Conserto ".repeat(15)} />);
    expect(screen.getByRole("heading").className).toContain("line-clamp-2");
  });

  test("mostra preço em reais", () => {
    render(<CartaoServico {...base} precoAPartirDe={80} />);
    expect(screen.getByText(/R\$\s*80,00/)).toBeInTheDocument();
  });

  test("preço 0 aparece como 'a combinar'", () => {
    render(<CartaoServico {...base} precoAPartirDe={0} />);
    expect(screen.getByText("Preço a combinar")).toBeInTheDocument();
  });

  test("mostra distância com vírgula", () => {
    render(<CartaoServico {...base} distanciaKm={1.234} />);
    expect(screen.getByText(/1,2 km/)).toBeInTheDocument();
  });

  test("online avisa 'Disponível agora'", () => {
    render(<CartaoServico {...base} online />);
    expect(screen.getAllByText("Disponível agora").length).toBeGreaterThan(0);
  });

  test("sem nota mostra 'Novo'", () => {
    render(<CartaoServico {...base} />);
    expect(screen.getByText("Novo")).toBeInTheDocument();
  });

  test("o cartão inteiro é um link", () => {
    render(<CartaoServico {...base} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/servicos/1");
  });
});

describe("Avatar", () => {
  test("sem foto mostra as iniciais", () => {
    render(<Avatar nome="Maria Silva" />);
    expect(screen.getByText("MS")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Maria Silva" })).toBeInTheDocument();
  });
});

describe("EstadoVazio", () => {
  test("mostra título, texto e ação", () => {
    render(
      <EstadoVazio icone={Search} titulo="Nada por aqui" texto="Tente outra busca" acao={{ rotulo: "Publicar meu pedido", href: "/pedidos/novo" }} />
    );
    expect(screen.getByText("Nada por aqui")).toBeInTheDocument();
    expect(screen.getByText("Tente outra busca")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Publicar meu pedido" })).toHaveAttribute("href", "/pedidos/novo");
  });
});
