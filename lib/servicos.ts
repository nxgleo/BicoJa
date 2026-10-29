// Leitura de anúncios (modelo Servico) para as telas. Roda só no servidor.
// Nunca devolve email ou telefone do prestador: isso só aparece depois de fechar negócio.
import { prisma } from "@/lib/prisma";
import { interpretarBusca, palavrasDaBusca, pontuar, simplificar } from "@/lib/busca";
import { CATEGORIAS, type CategoriaId } from "@/lib/categorias";
import { distanciaKm } from "@/lib/distancia";

export type ServicoResumo = {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  fotos: string[];
  preco: number;
  distanciaKm: number | null;
  prestador: { id: string; nome: string | null };
};

type Ponto = { latitude: number; longitude: number };

const CAMPOS = {
  id: true,
  titulo: true,
  descricao: true,
  categoria: true,
  fotos: true,
  preco: true,
  latitude: true,
  longitude: true,
  prestador: { select: { id: true, nome: true } },
} as const;

// Filtramos no servidor os mais recentes, para a busca por texto ignorar acentos.
const CANDIDATOS = 300;
// "Perto de você": anúncios até essa distância
const RAIO_PERTO_KM = 30;

type Linha = Omit<ServicoResumo, "distanciaKm"> & Ponto;

function resumo({ latitude, longitude, ...s }: Linha, perto?: Ponto | null): ServicoResumo {
  return { ...s, distanciaKm: perto ? distanciaKm(perto, { latitude, longitude }) : null };
}

export async function listarServicosRecentes(limite: number): Promise<ServicoResumo[]> {
  const linhas = await prisma.servico.findMany({
    where: { ativo: true },
    take: limite,
    orderBy: { createdAt: "desc" },
    select: CAMPOS,
  });
  return linhas.map((s) => resumo(s));
}

export async function buscarServicos(
  filtro: { texto?: string; categoria?: CategoriaId; perto?: Ponto | null },
  limite: number
): Promise<ServicoResumo[]> {
  const texto = filtro.texto ?? "";
  const perto = filtro.perto ?? null;
  const candidatos = await prisma.servico.findMany({
    where: { ativo: true, ...(filtro.categoria && { categoria: filtro.categoria }) },
    take: CANDIDATOS,
    orderBy: { createdAt: "desc" },
    select: CAMPOS,
  });

  // Categorias que o texto sugere ("pia vazando" → encanamento) e as palavras delas
  const categorias = filtro.categoria ? [filtro.categoria] : interpretarBusca(texto);
  const termos = [
    ...palavrasDaBusca(texto),
    ...CATEGORIAS.filter((c) => categorias.includes(c.id)).flatMap((c) => c.palavras.filter((p) => !p.includes(" "))),
  ];

  let resultado = candidatos.map((s) => ({ s, pontos: 0 }));
  if (texto && termos.length > 0) {
    resultado = resultado
      .map(({ s }) => {
        const palavras = simplificar(`${s.titulo} ${s.descricao}`).split(" ");
        const pontosTexto = termos.reduce(
          (total, termo) => total + Math.max(0, ...palavras.map((palavra) => pontuar(palavra, termo))),
          0
        );
        // A categoria salva no anúncio vale mais que palavras soltas
        const pontosCategoria = categorias.includes(s.categoria as CategoriaId) ? 10 : 0;
        return { s, pontos: pontosTexto + pontosCategoria };
      })
      .filter((r) => r.pontos > 0);
  }

  const lista = resultado.map(({ s, pontos }) => ({ servico: resumo(s, perto), pontos }));
  lista.sort((a, b) => b.pontos - a.pontos || (a.servico.distanciaKm ?? 0) - (b.servico.distanciaKm ?? 0));
  return lista.slice(0, limite).map((r) => r.servico);
}

/** Anúncios até 30 km do cliente, do mais perto para o mais longe. */
export async function anunciosPerto(perto: Ponto, limite: number): Promise<ServicoResumo[]> {
  const todos = await buscarServicos({ perto }, CANDIDATOS);
  return todos.filter((s) => (s.distanciaKm ?? Infinity) <= RAIO_PERTO_KM).slice(0, limite);
}
