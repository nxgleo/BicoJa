// Chamadas à API a partir das telas (navegador).

export type RespostaApi<T = Record<string, unknown>> =
  | { ok: true; dados: T }
  | { ok: false; status: number; erro: string; campo?: string; extra: Record<string, unknown> };

export async function enviarJson<T = Record<string, unknown>>(
  url: string,
  metodo: "POST" | "PATCH" | "PUT",
  corpo?: unknown
): Promise<RespostaApi<T>> {
  try {
    const resposta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const dados = await resposta.json().catch(() => ({}));
    if (resposta.ok) return { ok: true, dados: dados as T };
    return {
      ok: false,
      status: resposta.status,
      erro: dados.erro ?? "Algo deu errado. Tente de novo.",
      campo: dados.campo,
      extra: dados,
    };
  } catch {
    return { ok: false, status: 0, erro: "Sem conexão. Confira sua internet e tente de novo.", extra: {} };
  }
}

/** Coloca o foco no campo com erro (pelo id), para quem usa teclado ou leitor de tela. */
export function focarCampo(id: string | undefined) {
  if (!id) return;
  requestAnimationFrame(() => document.getElementById(id)?.focus());
}
