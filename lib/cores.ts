// Paleta do BicoJá. Os mesmos valores estão em app/globals.css.
// O teste lib/__tests__/cores.test.ts garante contraste AA (WCAG) nos dois temas.

export type NomeToken =
  | "fundo"
  | "superficie"
  | "superficieSuave"
  | "texto"
  | "textoSuave"
  | "marca"
  | "marcaTexto"
  | "marcaSuave"
  | "botao"
  | "textoSobreMarca"
  | "urgencia"
  | "sucesso"
  | "borda"
  | "foco";

export const tokens: { claro: Record<NomeToken, string>; escuro: Record<NomeToken, string> } = {
  claro: {
    fundo: "#FFFFFF",
    superficie: "#FFFFFF",
    superficieSuave: "#F3F4F6",
    texto: "#1F2937",
    textoSuave: "#4B5563",
    marca: "#E8770C",
    marcaTexto: "#9A4A06",
    marcaSuave: "#FFF4E8",
    botao: "#B45309",
    textoSobreMarca: "#FFFFFF",
    urgencia: "#DC2626",
    sucesso: "#16A34A",
    borda: "#E5E7EB",
    foco: "#B45309",
  },
  escuro: {
    fundo: "#14181C",
    superficie: "#1C2228",
    superficieSuave: "#242B33",
    texto: "#F3F4F6",
    textoSuave: "#B6C0CA",
    marca: "#E8770C",
    marcaTexto: "#FFA552",
    marcaSuave: "#3A2614",
    botao: "#B45309",
    textoSobreMarca: "#FFFFFF",
    urgencia: "#DC2626",
    sucesso: "#22C55E",
    borda: "#2E363F",
    foco: "#FFA552",
  },
};

function luminancia(hex: string): number {
  const valor = hex.replace("#", "");
  const canais = [0, 2, 4].map((i) => parseInt(valor.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste WCAG entre duas cores hex (1 a 21). */
export function razaoContraste(corA: string, corB: string): number {
  const [clara, escura] = [luminancia(corA), luminancia(corB)].sort((a, b) => b - a);
  return (clara + 0.05) / (escura + 0.05);
}
