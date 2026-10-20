import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarServicosRecentes, type ServicoResumo } from "@/lib/servicos";
import { Aparecer } from "@/components/ui/Aparecer";
import { BuscaPrincipal } from "@/components/inicio/BuscaPrincipal";
import { BotaoAjudaAgora } from "@/components/inicio/BotaoAjudaAgora";
import { ListaCategorias } from "@/components/inicio/ListaCategorias";
import { SecaoDisponiveis } from "@/components/inicio/SecaoDisponiveis";
import { CartaoPublicarPedido } from "@/components/inicio/CartaoPublicarPedido";
import { CartaoFazerBicos } from "@/components/inicio/CartaoFazerBicos";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const sessao = await getServerSession(authOptions);
  const primeiroNome = sessao?.user?.name?.split(" ")[0];

  let servicos: ServicoResumo[] = [];
  let erro = false;
  try {
    servicos = await listarServicosRecentes(6);
  } catch (e) {
    console.error("Erro ao carregar serviços da tela inicial:", e);
    erro = true;
  }

  return (
    <div className="flex flex-col gap-6">
      <Aparecer>
        <p className="font-semibold text-texto-suave">{primeiroNome ? `Olá, ${primeiroNome}!` : "Olá!"}</p>
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
        <SecaoDisponiveis servicos={servicos} erro={erro} />
      </Aparecer>

      <Aparecer atraso={0.15}>
        <div className="flex flex-col gap-4">
          <CartaoPublicarPedido />
          <CartaoFazerBicos />
        </div>
      </Aparecer>
    </div>
  );
}
