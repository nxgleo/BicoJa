// Chaves de configuração do cadastro (lidas do .env).

/** Confirmar o email com código? Desligado com CONFIRMAR_EMAIL=nao (para testar sem email). */
export function confirmarEmailLigado(): boolean {
  return process.env.CONFIRMAR_EMAIL !== "nao";
}
