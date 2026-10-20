import { z } from "zod";

/** Taxa da plataforma sobre pagamentos pelo app. Grátis por enquanto (0%). */
export const TAXA_PLATAFORMA_PERCENTUAL = 0;

export const DIAS_PARA_NAO_ACONTECEU = 3;
export const DIAS_PARA_LIBERAR = 7;
export const MAX_TENTATIVAS_CODIGO = 5;
export const MINUTOS_BLOQUEIO_CODIGO = 15;

export const MOTIVOS_CANCELAMENTO = {
  mudei_de_ideia: "Mudei de ideia",
  nao_consegui_ir: "Não consegui ir",
  outro_dia: "Combinamos outro dia",
  outro: "Outro motivo",
} as const;
type Motivo = keyof typeof MOTIVOS_CANCELAMENTO;

export const esquemaPagamento = z.object({
  metodo: z.enum(["PIX", "CARTAO", "DIRETO"], { message: "Escolha como pagar." }),
});

export const esquemaConcluir = z.object({
  codigo: z.string().trim().regex(/^\d{4}$/, "O código tem 4 números."),
});

export const esquemaCancelar = z.object({
  motivo: z.enum(Object.keys(MOTIVOS_CANCELAMENTO) as [Motivo, ...Motivo[]], { message: "Escolha o motivo." }),
});

export const esquemaAvaliacao = z.object({
  nota: z.number({ message: "Escolha de 1 a 5 estrelas." }).int().min(1, "Escolha de 1 a 5 estrelas.").max(5, "Escolha de 1 a 5 estrelas."),
  comentario: z.string().trim().max(500, "Escreva no máximo 500 letras.").optional(),
});
