// Regras do que chega nas rotas do chat.
import { z } from "zod";
import { conferirQuando, esquemaQuando } from "@/lib/pedidos/esquemas";

const id = z.string().uuid();

export const MAX_TEXTO_MENSAGEM = 2000;
export const MAX_VALOR_PROPOSTA = 100_000;

/** De onde a conversa começa: um anúncio, um pedido ou o perfil do prestador (só um deles). */
export const esquemaIniciarConversa = z.union([
  z.object({ servicoId: id }).strict(),
  z.object({ pedidoId: id }).strict(),
  z.object({ prestadorId: id }).strict(),
]);
export type OrigemConversa = z.infer<typeof esquemaIniciarConversa>;

export const esquemaMensagem = z
  .object({
    texto: z.string().trim().max(MAX_TEXTO_MENSAGEM, `Escreva no máximo ${MAX_TEXTO_MENSAGEM} letras.`).optional(),
    fotoUrl: z.string().max(300).optional(),
  })
  .refine((m) => Boolean(m.texto) || Boolean(m.fotoUrl), { message: "Escreva uma mensagem ou mande uma foto.", path: ["texto"] });
export type DadosMensagem = z.infer<typeof esquemaMensagem>;

export function criarEsquemaProposta(hoje: Date = new Date()) {
  return z
    .object({
      valor: z
        .number({ message: "Digite o valor." })
        .min(1, "Digite o valor.")
        .max(MAX_VALOR_PROPOSTA, "Valor muito alto. Confira o número."),
      quando: esquemaQuando,
    })
    .superRefine((dados, ctx) =>
      conferirQuando(dados.quando, hoje, (campo, message) =>
        ctx.addIssue({ code: "custom", path: ["quando", campo], message })
      )
    );
}
export type DadosProposta = z.infer<ReturnType<typeof criarEsquemaProposta>>;

export const esquemaResposta = z.object({ acao: z.enum(["aceitar", "recusar"]) });

export const MOTIVOS_DENUNCIA = {
  golpe: "Tentativa de golpe",
  ofensa: "Ofensa ou ameaça",
  assedio: "Assédio",
  outro: "Outro motivo",
} as const;

export const esquemaDenuncia = z.object({
  motivo: z.enum(Object.keys(MOTIVOS_DENUNCIA) as [keyof typeof MOTIVOS_DENUNCIA, ...(keyof typeof MOTIVOS_DENUNCIA)[]], {
    message: "Escolha o motivo.",
  }),
  detalhe: z.string().trim().max(500, "Escreva no máximo 500 letras.").optional(),
});
