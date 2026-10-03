export interface PaymentInput {
  propostaId: string;
  valor: number;
  metodoPagamento?: string;
}

export interface PaymentResult {
  sucesso: boolean;
  transacaoId: string;
  status: "APROVADO" | "RECUSADO";
  mensagem: string;
}

export async function processarPagamentoSimulado(
  dados: PaymentInput
): Promise<PaymentResult> {
  const transacaoId = `MOCK_TX_${Date.now()}`;

  return {
    sucesso: true,
    transacaoId,
    status: "APROVADO",
    mensagem: "Pagamento simulado processado com sucesso.",
  };
}