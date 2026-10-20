// Regra de senha "simples e segura": fácil de entender, mas bloqueia o óbvio.
import { simplificar } from "@/lib/busca";

export const SENHA_MINIMO = 8;
export const SENHA_MAXIMO = 72; // limite do bcrypt

const OBVIAS = new Set([
  "12345678", "123456789", "1234567890", "87654321", "11111111", "00000000", "12341234", "11223344",
  "senha123", "senha1234", "senha12345", "minhasenha", "qwerty123", "qwertyui", "abc12345", "abcd1234",
  "password", "password1", "bicoja123", "bicoja2026", "brasil123", "mudar123", "teste123", "admin123",
  "iloveyou", "asdfghjk", "aaaaaaaa", "12121212", "102030405060", "amor1234",
]);

function simples(texto: string): string {
  return simplificar(texto).replace(/\s/g, "");
}

/** Devolve o problema da senha em português, ou null se estiver boa. */
export function problemaNaSenha(senha: string, contexto: { nome?: string; email?: string }): string | null {
  if (senha.length < SENHA_MINIMO) return `A senha precisa ter pelo menos ${SENHA_MINIMO} letras ou números.`;
  if (senha.length > SENHA_MAXIMO) return `A senha pode ter no máximo ${SENHA_MAXIMO} caracteres.`;

  const s = simples(senha);
  if (OBVIAS.has(s) || /^(.)\1+$/.test(s)) return "Essa senha é muito fácil de adivinhar. Tente outra.";

  const primeiroNome = simples(contexto.nome?.trim().split(/\s+/)[0] ?? "");
  if (primeiroNome.length >= 3 && s.includes(primeiroNome)) return "Não use seu nome na senha.";

  const usuarioEmail = simples(contexto.email?.split("@")[0] ?? "");
  if (usuarioEmail.length >= 4 && s.includes(usuarioEmail)) return "Não use seu email na senha.";

  return null;
}
