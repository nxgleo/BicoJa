// Leitura de serviços (anúncios) para as telas. Roda só no servidor.
// Nunca devolve email ou telefone do prestador: isso só aparece depois de fechar negócio.
import { prisma } from "@/lib/prisma";
import { interpretarBusca, palavrasDaBusca, pontuar, simplificar } from "@/lib/busca";
import { CATEGORIAS, type CategoriaId } from "@/lib/categorias";

export type ServicoResumo = {
  id: string;
  titulo: string;
  descricao: string;
  preco: number;
  prestador: { id: string; nome: string | null };
};

const CAMPOS = {
  id: true,
  titulo: true,
  descricao: true,
  preco: true,
  prestador: { select: { id: true, nome: true } },
} as const;

// Fase 1: filtramos no servidor os mais recentes, para a busca ignorar acentos.
// Na Fase 3 (com categoria salva no banco) a busca passa a ser feita direto no banco.
const CANDIDATOS = 300;

export async function listarServicosRecentes(limite: number): Promise<ServicoResumo[]> {
  return prisma.servico.findMany({ take: limite, orderBy: { createdAt: "desc" }, select: CAMPOS });
}

export async function buscarServicos(
  filtro: { texto?: string; categoria?: CategoriaId },
  limite: number
): Promise<ServicoResumo[]> {
  const texto = filtro.texto ?? "";
  const categorias = filtro.categoria ? [filtro.categoria] : interpretarBusca(texto);
  const termos = [
    ...palavrasDaBusca(texto),
    ...CATEGORIAS.filter((c) => categorias.includes(c.id)).flatMap((c) => c.palavras.filter((p) => !p.includes(" "))),
  ];

  const candidatos: ServicoResumo[] = await prisma.servico.findMany({
    take: CANDIDATOS,
    orderBy: { createdAt: "desc" },
    select: CAMPOS,
  });

  if (termos.length === 0) return candidatos.slice(0, limite);

  return candidatos
    .map((servico) => {
      const palavras = simplificar(`${servico.titulo} ${servico.descricao}`).split(" ");
      const pontos = termos.reduce(
        (total, termo) => total + Math.max(0, ...palavras.map((palavra) => pontuar(palavra, termo))),
        0
      );
      return { servico, pontos };
    })
    .filter((r) => r.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, limite)
    .map((r) => r.servico);
}
