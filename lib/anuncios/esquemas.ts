import { z } from "zod";
import { CATEGORIAS, type CategoriaId } from "@/lib/categorias";

const idsCategorias = CATEGORIAS.map((c) => c.id) as [CategoriaId, ...CategoriaId[]];

export const esquemaAnuncio = z.object({
  titulo: z.string().trim().min(5, "Escreva um título (pelo menos 5 letras).").max(80, "Título muito comprido."),
  categoria: z.enum(idsCategorias, { message: "Escolha a categoria." }),
  descricao: z.string().trim().min(10, "Conte um pouco mais (pelo menos 10 letras).").max(800, "Escreva no máximo 800 letras."),
  preco: z.number().min(0).max(100000, "Valor alto demais.").optional(),
  fotos: z.array(z.string()).max(5, "Você pode mandar até 5 fotos."),
});

export const esquemaEditarAnuncio = z.union([z.object({ ativo: z.boolean() }).strict(), esquemaAnuncio]);

export type DadosAnuncio = z.infer<typeof esquemaAnuncio>;
