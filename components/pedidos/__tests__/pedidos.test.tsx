import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SeletorQuando } from "@/components/pedidos/SeletorQuando";
import { EnviarImagens } from "@/components/pedidos/EnviarImagens";
import { CartaoPedido } from "@/components/pedidos/CartaoPedido";
import { textoQuando } from "@/lib/pedidos/formatar";
import type { Quando } from "@/lib/pedidos/esquemas";

function QuandoControlado() {
  const [valor, setValor] = useState<Quando>({ tipo: "QUALQUER_DIA" });
  return <SeletorQuando valor={valor} onChange={setValor} />;
}

describe("SeletorQuando", () => {
  test("'Entre dias' mostra os campos De e Até", async () => {
    render(<QuandoControlado />);
    expect(screen.queryByLabelText("De")).toBeNull();
    await userEvent.click(screen.getByRole("radio", { name: "Entre dias" }));
    expect(screen.getByRole("radio", { name: "Entre dias" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("De")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("Até")).toHaveAttribute("type", "date");
  });

  test("'Dia certo' mostra um campo de data só", async () => {
    render(<QuandoControlado />);
    await userEvent.click(screen.getByRole("radio", { name: "Dia certo" }));
    expect(screen.getByLabelText("Dia")).toBeInTheDocument();
    expect(screen.queryByLabelText("Até")).toBeNull();
  });
});

describe("EnviarImagens", () => {
  test("no limite esconde 'Adicionar foto' e mostra os botões de remover", () => {
    const fotos = ["/api/arquivos/pedidos/1.webp", "/api/arquivos/pedidos/2.webp", "/api/arquivos/pedidos/3.webp"];
    render(<EnviarImagens pasta="pedidos" maximo={3} valor={fotos} onChange={() => {}} />);
    expect(screen.queryByRole("button", { name: /Adicionar foto/ })).toBeNull();
    expect(screen.getAllByRole("button", { name: /Remover foto/ })).toHaveLength(3);
  });

  test("abaixo do limite mostra 'Adicionar foto'", () => {
    render(<EnviarImagens pasta="pedidos" maximo={3} valor={[]} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Adicionar foto/ })).toBeInTheDocument();
  });
});

describe("CartaoPedido", () => {
  test("urgente mostra o selo vermelho", () => {
    render(<CartaoPedido href="/pedidos/1" categoria="encanamento" descricao="Cano estourou" selo="URGENTE" bairro="Marco" quando="Agora" />);
    expect(screen.getByText("Urgente").className).toContain("bg-urgencia");
    expect(screen.getByRole("link")).toHaveAttribute("href", "/pedidos/1");
  });
});

describe("textoQuando", () => {
  test("escreve o quando em português simples", () => {
    expect(textoQuando({ quandoTipo: "QUALQUER_DIA" })).toBe("Qualquer dia");
    expect(textoQuando({ quandoTipo: "DIA_CERTO", dataInicio: "2026-10-20" })).toBe("Dia 20/10");
    expect(textoQuando({ quandoTipo: "ENTRE_DIAS", dataInicio: "2026-10-20", dataFim: "2026-10-23", horaInicio: "08:00", horaFim: "18:00" })).toBe(
      "De 20/10 a 23/10 · das 08:00 às 18:00"
    );
    expect(textoQuando({ quandoTipo: "QUALQUER_DIA", horaInicio: "14:00" })).toBe("Qualquer dia · a partir das 14:00");
  });
});
