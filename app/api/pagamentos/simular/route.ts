import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error:
        "Esta rota foi removida. Use POST /api/contratos/:id/pagamento para processar pagamentos.",
    },
    { status: 410 }
  );
}
