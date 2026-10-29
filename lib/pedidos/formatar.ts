// Textos curtos para mostrar pedidos nas telas.
import { CATEGORIAS } from "@/lib/categorias";

type DataOuTexto = Date | string | null | undefined;

/** "2026-10-20" ou Date (do banco, meia-noite UTC) → "20/10/2026" (dia, mês e ano, como no Brasil). */
function diaMes(d: DataOuTexto): string {
  if (!d) return "";
  const texto = typeof d === "string" ? d : d.toISOString().slice(0, 10);
  const [ano, mes, dia] = texto.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function textoQuando(p: {
  quandoTipo: "DIA_CERTO" | "ENTRE_DIAS" | "QUALQUER_DIA";
  dataInicio?: DataOuTexto;
  dataFim?: DataOuTexto;
  horaInicio?: string | null;
  horaFim?: string | null;
}): string {
  const dia =
    p.quandoTipo === "DIA_CERTO"
      ? `Dia ${diaMes(p.dataInicio)}`
      : p.quandoTipo === "ENTRE_DIAS"
        ? `De ${diaMes(p.dataInicio)} a ${diaMes(p.dataFim)}`
        : "Qualquer dia";
  let hora = "";
  if (p.horaInicio && p.horaFim) hora = ` · das ${p.horaInicio} às ${p.horaFim}`;
  else if (p.horaInicio) hora = ` · a partir das ${p.horaInicio}`;
  else if (p.horaFim) hora = ` · até as ${p.horaFim}`;
  return dia + hora;
}

export function nomeDaCategoria(id: string): string {
  return CATEGORIAS.find((c) => c.id === id)?.nome ?? "Outros";
}

const tempo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

/** "há 5 minutos", "há 2 horas", "ontem"... */
export function haQuantoTempo(data: Date, agora = new Date()): string {
  const minutos = Math.round((data.getTime() - agora.getTime()) / 60_000);
  if (Math.abs(minutos) < 60) return tempo.format(minutos, "minute");
  const horas = Math.round(minutos / 60);
  if (Math.abs(horas) < 24) return tempo.format(horas, "hour");
  return tempo.format(Math.round(horas / 24), "day");
}
