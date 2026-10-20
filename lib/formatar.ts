const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 80 → "R$ 80,00" */
export function formatarPreco(valor: number): string {
  return reais.format(valor);
}

/** 1.234 → "1,2 km"; 0.35 → "350 m" */
export function formatarDistancia(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}
