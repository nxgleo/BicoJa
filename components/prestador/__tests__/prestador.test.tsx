import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { InterruptorDisponivel } from "@/components/prestador/InterruptorDisponivel";
import { AbasPedidos } from "@/components/prestador/AbasPedidos";
import type { PedidoParaPrestador } from "@/lib/pedidos/pedidos";

function pedido(id: string, urgente: boolean, descricao: string): PedidoParaPrestador {
  return {
    id, categoria: "encanamento", descricao, fotos: [], urgente, quandoTipo: "QUALQUER_DIA",
    dataInicio: null, dataFim: null, horaInicio: null, horaFim: null, bairro: "Marco", cidade: "Belém",
    distanciaKm: 1.2, createdAt: new Date(), cliente: { nome: "Maria", foto: null },
  };
}

describe("InterruptorDisponivel", () => {
  test("ligado mostra até quando", () => {
    const ate = new Date(2026, 9, 20, 18, 40).toISOString();
    render(<InterruptorDisponivel ligado ate={ate} />);
    expect(screen.getByRole("switch", { name: /Estou disponível agora/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Desliga sozinho às 18:40")).toBeInTheDocument();
  });

  test("desligado explica o que acontece ao ligar", () => {
    render(<InterruptorDisponivel ligado={false} ate={null} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/aparece para os clientes por 8 horas/)).toBeInTheDocument();
  });
});

describe("AbasPedidos", () => {
  test("começa nos urgentes quando há algum, com contador", async () => {
    render(<AbasPedidos urgentes={[pedido("u1", true, "Cano estourou"), pedido("u2", true, "Sem água")]} pedidos={[pedido("n1", false, "Trocar torneira")]} />);
    const abaUrgentes = screen.getByRole("tab", { name: /Urgentes/ });
    expect(abaUrgentes).toHaveAttribute("aria-selected", "true");
    expect(abaUrgentes).toHaveTextContent("2");
    expect(screen.getByText("Cano estourou")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /Pedidos/ }));
    expect(screen.getByText("Trocar torneira")).toBeInTheDocument();
    expect(screen.queryByText("Cano estourou")).toBeNull();
  });

  test("sem urgentes começa na aba Pedidos", () => {
    render(<AbasPedidos urgentes={[]} pedidos={[pedido("n1", false, "Trocar torneira")]} />);
    expect(screen.getByRole("tab", { name: /Pedidos/ })).toHaveAttribute("aria-selected", "true");
  });
});
