import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { BarraProgresso } from "@/components/conta/BarraProgresso";
import { CampoCodigo } from "@/components/conta/CampoCodigo";
import { CampoSenha } from "@/components/conta/CampoSenha";
import { CampoTelefone } from "@/components/conta/CampoTelefone";
import { EscolhaModo } from "@/components/conta/EscolhaModo";
import type { Escolha } from "@/lib/contas/esquemas";

describe("BarraProgresso", () => {
  test("informa o passo para leitores de tela e na tela", () => {
    render(<BarraProgresso passo={2} total={4} />);
    const barra = screen.getByRole("progressbar");
    expect(barra).toHaveAttribute("aria-valuenow", "2");
    expect(barra).toHaveAttribute("aria-valuemax", "4");
    expect(screen.getByText("Passo 2 de 4")).toBeInTheDocument();
  });
});

function SenhaControlada() {
  const [valor, setValor] = useState("");
  return <CampoSenha rotulo="Crie uma senha" value={valor} onChange={(e) => setValor(e.target.value)} mostrarRegra />;
}

describe("CampoSenha", () => {
  test("botão mostra e esconde a senha", async () => {
    render(<SenhaControlada />);
    const campo = screen.getByLabelText("Crie uma senha");
    expect(campo).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(campo).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Esconder senha" })).toHaveAttribute("aria-pressed", "true");
  });

  test("regra fica cumprida com 8 caracteres", async () => {
    render(<SenhaControlada />);
    expect(screen.queryByText(/✓/)).toBeNull();
    await userEvent.type(screen.getByLabelText("Crie uma senha"), "abcdefgh");
    expect(screen.getByText(/✓ Pelo menos 8 letras ou números/)).toBeInTheDocument();
  });
});

function TelefoneControlado() {
  const [valor, setValor] = useState("");
  return <CampoTelefone rotulo="Celular (com DDD)" value={valor} onValorChange={setValor} />;
}

describe("CampoTelefone", () => {
  test("coloca a máscara enquanto digita", async () => {
    render(<TelefoneControlado />);
    const campo = screen.getByLabelText("Celular (com DDD)");
    await userEvent.type(campo, "91988887777");
    expect(campo).toHaveValue("(91) 98888-7777");
    expect(campo).toHaveAttribute("inputmode", "tel");
  });
});

describe("CampoCodigo", () => {
  test("colar o código preenche tudo e avisa que completou", async () => {
    const onCompleto = vi.fn();
    render(<CampoCodigo onCompleto={onCompleto} />);
    const caixas = screen.getAllByRole("textbox");
    expect(caixas).toHaveLength(6);
    await userEvent.click(caixas[0]);
    await userEvent.paste("123456");
    expect(onCompleto).toHaveBeenCalledWith("123456");
  });

  test("ignora letras e completa digitando um por um", async () => {
    const onCompleto = vi.fn();
    render(<CampoCodigo onCompleto={onCompleto} />);
    await userEvent.click(screen.getAllByRole("textbox")[0]);
    await userEvent.keyboard("4a8b1c2d3e7");
    expect(onCompleto).toHaveBeenCalledWith("481237");
  });
});

function EscolhaControlada() {
  const [valor, setValor] = useState<Escolha | null>(null);
  return <EscolhaModo valor={valor} onChange={setValor} />;
}

describe("EscolhaModo", () => {
  test("marca a opção escolhida", async () => {
    render(<EscolhaControlada />);
    await userEvent.click(screen.getByRole("radio", { name: /Fazer bicos/ }));
    expect(screen.getByRole("radio", { name: /Fazer bicos/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /^Contratar/ })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Pode mudar depois quando quiser.")).toBeInTheDocument();
  });
});
