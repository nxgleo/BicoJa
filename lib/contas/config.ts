// Chaves de configuração do cadastro (lidas do .env).

/** Confirmar o email com código? Desligado com CONFIRMAR_EMAIL=nao (para testar sem email). */
export function confirmarEmailLigado(): boolean {
  return process.env.CONFIRMAR_EMAIL !== "nao";
}

/**
 * Sem servidor de email (SMTP_HOST vazio) e fora da produção, o código aparece na própria tela,
 * para dar para testar "Esqueci minha senha". Em produção isso nunca liga.
 */
export function mostrarCodigoNaTela(): boolean {
  return !process.env.SMTP_HOST && process.env.NODE_ENV !== "production";
}
