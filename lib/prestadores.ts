// Prestadores: "Estou disponível agora" e o que aparece para os clientes.
/** Disponível de verdade = ligado e ainda dentro das 8 horas. */
export function estaDisponivel(p: { disponivel: boolean; disponivelAte: Date | null }, agora = new Date()): boolean {
  return p.disponivel && Boolean(p.disponivelAte && p.disponivelAte > agora);
}
