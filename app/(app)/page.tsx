import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anunciosPerto, listarServicosRecentes, type ServicoResumo } from "@/lib/servicos";
import { enderecoDoUsuario } from "@/lib/enderecos";
import { prestadoresDisponiveis, type PrestadorResumo } from "@/lib/prestadores";
import { Aparecer } from "@/components/ui/Aparecer";
import { BuscaPrincipal } from "@/components/inicio/BuscaPrincipal";
import { BotaoAjudaAgora } from "@/components/inicio/BotaoAjudaAgora";
import { ListaCategorias } from "@/components/inicio/ListaCategorias";
import { SecaoDisponiveis } from "@/components/inicio/SecaoDisponiveis";
import { SecaoAnuncios } from "@/components/inicio/SecaoAnuncios";
import { CartaoPublicarPedido } from "@/components/inicio/CartaoPublicarPedido";
import { CartaoFazerBicos } from "@/components/inicio/CartaoFazerBicos";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const sessao = await getServerSession(authOptions);
  const primeiroNome = sessao?.user?.name?.split(" ")[0];
  // Quem já faz bicos não precisa do convite "Quero fazer bicos"
  const jaEhPrestador = sessao?.user?.id
    ? Boolean(await prisma.perfilPrestador.findUnique({ where: { userId: sessao.user.id }, select: { id: true } }).catch(() => null))
    : false;

  let prestadores: PrestadorResumo[] = [];
  let anuncios: ServicoResumo[] = [];
  let temEndereco = false;
  let erro = false;
  try {
    const endereco = sessao?.user?.id ? await enderecoDoUsuario(prisma, sessao.user.id) : null;
    temEndereco = Boolean(endereco);
    prestadores = await prestadoresDisponiveis(prisma, endereco, 6);
    anuncios = endereco ? await anunciosPerto(endereco, 6) : await listarServicosRecentes(6);
  } catch (e) {
    console.error("Erro ao carregar serviços da tela inicial:", e);
    erro = true;
  }

  return (
    <div className="flex flex-col gap-6">
      <Aparecer>
        <p className="font-semibold break-words text-texto-suave">{primeiroNome ? `Olá, ${primeiroNome}!` : "Olá!"}</p>
        <h1 className="mt-1 mb-4 text-[1.6rem] leading-tight font-black">O que você precisa resolver hoje?</h1>
        <div className="flex flex-col gap-3">
          <BuscaPrincipal />
          <BotaoAjudaAgora />
        </div>
      </Aparecer>

      <Aparecer atraso={0.05}>
        <section aria-labelledby="titulo-categorias">
          <h2 id="titulo-categorias" className="mb-3 text-xl font-black">
            Categorias
          </h2>
          <ListaCategorias />
        </section>
      </Aparecer>

      <Aparecer atraso={0.1}>
        <SecaoDisponiveis prestadores={prestadores} erro={erro} />
      </Aparecer>

      {!erro && (
        <Aparecer atraso={0.12}>
          <SecaoAnuncios titulo={temEndereco ? "Anúncios perto de você" : "Anúncios recentes"} anuncios={anuncios} />
        </Aparecer>
      )}

      <Aparecer atraso={0.15}>
        <div className="flex flex-col gap-4">
          <CartaoPublicarPedido />
          {!jaEhPrestador && <CartaoFazerBicos />}
        </div>
      </Aparecer>
    </div>
  );
}
