// Revisão automática de acessibilidade (axe) nas telas novas do chat e do serviço combinado.
// Confere rótulos, papéis, nomes de botões, ordem de títulos etc. (contraste é testado em lib/__tests__/cores.test.ts).
import { describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import axe from "axe-core";
import type { ReactElement } from "react";
import { CartaoProposta } from "@/components/chat/CartaoProposta";
import { FormProposta } from "@/components/chat/FormProposta";
import { MenuConversa } from "@/components/chat/MenuConversa";
import { ListaConversas } from "@/components/chat/ListaConversas";
import { TelaContrato } from "@/components/contratos/TelaContrato";
import { BotaoConversar } from "@/components/publico/BotaoConversar";
import type { MensagemChat } from "@/lib/chat/conversas";
import type { DetalheContrato } from "@/lib/contratos/contratos";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

async function semProblemas(tela: ReactElement | HTMLElement) {
  if (!(tela instanceof HTMLElement)) cleanup(); // uma tela por vez (senão o axe vê dois <main>)
  const container = tela instanceof HTMLElement ? tela : render(<main>{tela}</main>).container;
  const r = await axe.run(container, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
  const problemas = r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(problemas).toEqual([]);
}

const proposta: MensagemChat = {
  id: "m1",
  tipo: "PROPOSTA",
  autorId: "joao",
  texto: null,
  fotoUrl: null,
  criadaEm: "2026-10-20T12:00:00Z",
  proposta: { valor: 120, quandoTipo: "DIA_CERTO", dataInicio: "2026-10-25", dataFim: null, horaInicio: "08:00", horaFim: null, status: "PENDENTE" },
};

const contrato = (extra: Partial<DetalheContrato> = {}): DetalheContrato => ({
  id: "c1",
  papel: "cliente",
  conversaId: "conv1",
  outro: { id: "joao", nome: "João Silva", foto: null },
  valor: 150,
  quando: { quandoTipo: "QUALQUER_DIA", dataInicio: null, dataFim: null, horaInicio: null, horaFim: null },
  status: "COMBINADO",
  metodoPagamento: null,
  statusPagamento: "PENDENTE",
  taxaValor: 0,
  motivoCancelamento: null,
  canceladoPorMim: false,
  codigo: null,
  podeNaoAconteceu: false,
  naoAconteceuEm: "2026-10-23T03:00:00Z",
  liberaEm: null,
  minhaAvaliacao: null,
  ...extra,
});

describe("acessibilidade (axe)", () => {
  test("cartão de proposta (quem recebe e quem mandou)", async () => {
    await semProblemas(<CartaoProposta mensagem={proposta} minha={false} nomeOutro="João" podeResponder onResponder={vi.fn()} onNegociar={vi.fn()} />);
    await semProblemas(<CartaoProposta mensagem={proposta} minha nomeOutro="Maria" podeResponder onResponder={vi.fn()} onNegociar={vi.fn()} />);
  });

  test("formulário de proposta", async () => {
    await semProblemas(<FormProposta conversaId="c" base={proposta} onEnviada={vi.fn()} onCancelar={vi.fn()} />);
  });

  test("opções da conversa abertas (bloquear e denunciar)", async () => {
    const { container, getByRole } = render(
      <main>
        <MenuConversa conversaId="c" nomeOutro="João" bloqueadoPorMim={false} onBloqueioMudou={vi.fn()} />
      </main>
    );
    fireEvent.click(getByRole("button", { name: "Opções" }));
    await semProblemas(container);
    fireEvent.click(getByRole("button", { name: "Denunciar" }));
    await semProblemas(container);
  });

  test("lista de conversas e botão conversar", async () => {
    await semProblemas(
      <ListaConversas conversas={[{ id: "1", outro: { id: "j", nome: "João", foto: null }, previa: "Oi", ultimaEm: "2026-10-20T12:00:00Z", naoLidas: 2 }]} />
    );
    await semProblemas(<BotaoConversar origem={{ prestadorId: "j" }} texto="Conversar com João" />);
  });

  test("serviço combinado: pagar, código, digitar código, avaliar e cancelado", async () => {
    const { container, getByRole } = render(
      <main>
        <TelaContrato inicial={contrato()} />
      </main>
    );
    await semProblemas(container);
    fireEvent.click(getByRole("radio", { name: /PIX pelo app/ }));
    await semProblemas(container);

    await semProblemas(<TelaContrato inicial={contrato({ statusPagamento: "RETIDO", metodoPagamento: "PIX", codigo: "1234", liberaEm: "2026-10-27T03:00:00Z" })} />);
    await semProblemas(<TelaContrato inicial={contrato({ papel: "prestador", statusPagamento: "DIRETO", metodoPagamento: "DIRETO" })} />);
    await semProblemas(<TelaContrato inicial={contrato({ status: "CONCLUIDO", statusPagamento: "LIBERADO" })} />);
    await semProblemas(<TelaContrato inicial={contrato({ status: "CANCELADO", motivoCancelamento: "Mudei de ideia" })} />);
  });
});
