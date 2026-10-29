// Datas e horas do chat sempre no horário do Brasil (igual no servidor e no celular).
const FUSO = "America/Sao_Paulo";
const HORA = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
const DIA = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO });
const DIA_MES = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" });

/** "14:05" */
export function horaCurta(iso: string): string {
  return HORA.format(new Date(iso));
}

/** "Hoje", "Ontem" ou "18/10" — para separar as mensagens por dia. */
export function rotuloDoDia(iso: string, agora = new Date()): string {
  const dia = DIA.format(new Date(iso));
  if (dia === DIA.format(agora)) return "Hoje";
  if (dia === DIA.format(new Date(agora.getTime() - 86_400_000))) return "Ontem";
  return DIA_MES.format(new Date(iso));
}

/** Na lista de conversas: hora se for hoje, senão o dia. */
export function quandoNaLista(iso: string, agora = new Date()): string {
  const rotulo = rotuloDoDia(iso, agora);
  return rotulo === "Hoje" ? horaCurta(iso) : rotulo;
}

/** "120,50" ou "120" → 120.5; texto inválido → NaN */
export function lerValor(texto: string): number {
  const limpo = texto.replace(/[R$\s.]/g, "").replace(",", ".");
  return limpo ? Number(limpo) : Number.NaN;
}
