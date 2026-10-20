// Celular brasileiro com DDD. Guardamos só os dígitos: "91988887777".

/** "(91) 98888-7777", "+55 91 98888 7777"... → "91988887777". Inválido → null. */
export function normalizarTelefone(entrada: string): string | null {
  let digitos = entrada.replace(/\D/g, "");
  // Tira o código do país (55) quando vier junto
  if (digitos.length > 11 && digitos.startsWith("55")) digitos = digitos.slice(2);
  if (digitos.length !== 10 && digitos.length !== 11) return null;
  const ddd = Number(digitos.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;
  return digitos;
}

/** "91988887777" → "(91) 98888-7777". Também formata enquanto a pessoa digita. */
export function formatarTelefone(digitos: string): string {
  const d = digitos.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  // Fixo tem 8 dígitos depois do DDD; celular tem 9
  const corte = d.length === 11 ? 5 : 4;
  if (resto.length <= corte) return `(${ddd}) ${resto}`;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

export function ehEmail(texto: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto.trim());
}
