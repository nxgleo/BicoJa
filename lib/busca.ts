// Busca "inteligente" sem IA: transforma o que a pessoa escreveu
// ("minha pia tá vazando") em categorias ("encanamento"), usando o dicionário de lib/categorias.ts.
import { CATEGORIAS, type CategoriaId } from "./categorias";

const TAMANHO_MAXIMO = 100;

// Palavras comuns que não ajudam a achar a categoria
const IGNORAR = new Set([
  "a", "o", "as", "os", "um", "uma", "de", "da", "do", "das", "dos", "em", "na", "no", "nas", "nos",
  "e", "ou", "com", "pra", "para", "por", "que", "minha", "meu", "minhas", "meus", "ta", "esta", "estou",
  "preciso", "quero", "alguem", "urgente", "ajudar", "casa", "muito", "nao", "sim", "ja",
]);

/** Minúsculas, sem acento, só letras/números/espaços (sem limite de tamanho). */
export function simplificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Como simplificar, mas no máximo 100 caracteres: usado no que a pessoa digita. */
export function normalizar(texto: string): string {
  return simplificar(texto).slice(0, TAMANHO_MAXIMO).trim();
}

/** Palavras úteis do que a pessoa digitou (sem "a", "de", "minha"...). */
export function palavrasDaBusca(texto: string): string[] {
  const limpo = normalizar(texto);
  return limpo ? limpo.split(" ").filter((p) => p.length >= 2 && !IGNORAR.has(p)) : [];
}

/** Quantas letras precisam mudar para uma palavra virar a outra (distância de Levenshtein). */
function distancia(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2; // só nos interessa saber se é 0 ou 1
  const anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = anterior[0];
    anterior[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardado = anterior[j];
      anterior[j] = Math.min(anterior[j] + 1, anterior[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = guardado;
    }
  }
  return anterior[b.length];
}

/**
 * Pontos de uma palavra digitada contra uma palavra do dicionário:
 * igual = 3; começa com a palavra do dicionário (4+ letras) = 2; um erro de digitação (5+ letras) = 1.
 */
export function pontuar(digitada: string, doDicionario: string): number {
  if (digitada === doDicionario) return 3;
  if (doDicionario.length >= 4 && digitada.startsWith(doDicionario)) return 2;
  if (digitada.length >= 5 && distancia(digitada, doDicionario) <= 1) return 1;
  return 0;
}

/** Categorias que combinam com o texto, da mais provável para a menos. Texto vazio → []. */
export function interpretarBusca(texto: string): CategoriaId[] {
  const limpo = normalizar(texto);
  if (!limpo) return [];

  const palavras = palavrasDaBusca(limpo);

  const resultado = CATEGORIAS.map((categoria, ordem) => {
    let pontos = 0;
    for (const termo of categoria.palavras) {
      if (termo.includes(" ")) {
        // Expressões com espaço ("caixa dagua") contam se aparecerem inteiras
        if (limpo.includes(termo)) pontos += 3;
        continue;
      }
      for (const palavra of palavras) pontos += pontuar(palavra, termo);
    }
    return { id: categoria.id, pontos, ordem };
  });

  return resultado
    .filter((r) => r.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.ordem - b.ordem)
    .map((r) => r.id);
}
