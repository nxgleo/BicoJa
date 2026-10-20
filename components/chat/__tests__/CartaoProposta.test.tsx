import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CartaoProposta } from "@/components/chat/CartaoProposta";
import type { MensagemChat } from "@/lib/chat/conversas";

const mensagem = (status: "PENDENTE" | "ACEITA" = "PENDENTE"): MensagemChat => ({
  id: "m1",
  tipo: "PROPOSTA",
  autorId: "joao",
  texto: null,
  fotoUrl: null,
  criadaEm: "2026-10-20T12:00:00Z",
  proposta: { valor: 120, quandoTipo: "QUALQUER_DIA", dataInicio: null, dataFim: null, horaInicio: null, horaFim: null, status },
});

describe("CartaoProposta", () => {
  test("quem recebe confirma antes de aceitar", () => {
    const onResponder = vi.fn().mockResolvedValue(undefined);
    render(<CartaoProposta mensagem={mensagem()} minha={false} nomeOutro="João Silva" podeResponder onResponder={onResponder} onNegociar={vi.fn()} />);
    expect(screen.getByText("R$ 120,00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aceitar" }));
    expect(onResponder).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sim, aceitar" }));
    expect(onResponder).toHaveBeenCalledWith("m1", "aceitar");
  });

  test("quem mandou só espera (e pode mudar); aceita mostra Combinado", () => {
    const { rerender } = render(
      <CartaoProposta mensagem={mensagem()} minha nomeOutro="Maria" podeResponder onResponder={vi.fn()} onNegociar={vi.fn()} />
    );
    expect(screen.queryByRole("button", { name: "Aceitar" })).toBeNull();
    expect(screen.getByText("Esperando a resposta de Maria.")).toBeInTheDocument();
    rerender(<CartaoProposta mensagem={mensagem("ACEITA")} minha nomeOutro="Maria" podeResponder onResponder={vi.fn()} onNegociar={vi.fn()} />);
    expect(screen.getByText("Combinado")).toBeInTheDocument();
  });
});
