// Regras do formulário de pedido (o "quando" flexível, fotos, descrição).
import { z } from "zod";
import { CATEGORIAS, type CategoriaId } from "@/lib/categorias";

const idsCategorias = CATEGORIAS.map((c) => c.id) as [CategoriaId, ...CategoriaId[]];
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_JANELA_DIAS = 60;

/** "2026-10-20" → número de dias desde 1970 (só a data, sem fuso). */
function diaDe(texto: string): number {
  const [a, m, d] = texto.split("-").map(Number);
  return Date.UTC(a, m - 1, d) / 86_400_000;
}

// "Hoje" sempre no horário do Brasil, não no do servidor (que costuma estar em UTC)
const DIA_NO_BRASIL = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

function diaDeHoje(hoje: Date): number {
  return diaDe(DIA_NO_BRASIL.format(hoje)); // "2026-10-20"
}

const esquemaQuando = z.object({
  tipo: z.enum(["DIA_CERTO", "ENTRE_DIAS", "QUALQUER_DIA"]),
  dataInicio: z.string().regex(DATA, "Escolha uma data.").optional(),
  dataFim: z.string().regex(DATA, "Escolha uma data.").optional(),
  horaInicio: z.string().regex(HORA, "Escolha um horário válido.").optional(),
  horaFim: z.string().regex(HORA, "Escolha um horário válido.").optional(),
});

export type Quando = z.infer<typeof esquemaQuando>;

/** O esquema recebe "hoje" para dar para testar datas sem depender do relógio. */
export function criarEsquemaPedido(hoje: Date = new Date()) {
  return z
    .object({
      categoria: z.enum(idsCategorias, { message: "Escolha o tipo de serviço." }),
      descricao: z
        .string()
        .trim()
        .min(10, "Conte um pouco mais (pelo menos 10 letras).")
        .max(500, "Escreva no máximo 500 letras."),
      fotos: z.array(z.string()).max(3, "Você pode mandar até 3 fotos."),
      urgente: z.boolean(),
      quando: esquemaQuando,
    })
    .transform((dados) =>
      // Pedido urgente é "agora": não tem data marcada
      dados.urgente ? { ...dados, quando: { tipo: "QUALQUER_DIA" as const } } : dados
    )
    .superRefine((dados, ctx) => {
      const q = dados.quando;
      const erro = (campo: keyof Quando, message: string) =>
        ctx.addIssue({ code: "custom", path: ["quando", campo], message });

      if (q.tipo !== "QUALQUER_DIA") {
        if (!q.dataInicio) return erro("dataInicio", "Escolha uma data.");
        if (diaDe(q.dataInicio) < diaDeHoje(hoje)) return erro("dataInicio", "Escolha hoje ou um dia depois.");
      }
      if (q.tipo === "ENTRE_DIAS") {
        if (!q.dataFim) return erro("dataFim", "Escolha a data final.");
        if (diaDe(q.dataFim) < diaDe(q.dataInicio!)) return erro("dataFim", "A data final vem depois da inicial.");
        if (diaDe(q.dataFim) - diaDe(q.dataInicio!) > MAX_JANELA_DIAS) {
          return erro("dataFim", `Escolha um período de até ${MAX_JANELA_DIAS} dias.`);
        }
      }
      if (q.horaInicio && q.horaFim && q.horaFim <= q.horaInicio) {
        erro("horaFim", "O horário final vem depois do inicial.");
      }
    });
}

export type DadosPedido = z.infer<ReturnType<typeof criarEsquemaPedido>>;
