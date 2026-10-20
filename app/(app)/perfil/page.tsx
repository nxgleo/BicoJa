import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui";
import { CartaoFazerBicos } from "@/components/inicio/CartaoFazerBicos";
import { SeletorTema } from "@/components/layout/SeletorTema";
import { BotaoNotificacoes } from "@/components/notificacoes/BotaoNotificacoes";
import { BotaoSair } from "@/components/perfil/BotaoSair";
import { EditarDados } from "@/components/perfil/EditarDados";
import { TrocarModo } from "@/components/perfil/TrocarModo";
import { CATEGORIAS } from "@/lib/categorias";

export const dynamic = "force-dynamic";

const mesAno = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

export default async function Perfil() {
  const sessao = await getServerSession(authOptions);
  if (!sessao?.user?.id) redirect("/entrar?voltar=%2Fperfil");

  const user = await prisma.user.findUnique({
    where: { id: sessao.user.id },
    select: { nome: true, email: true, telefone: true, image: true, createdAt: true, modoAtual: true, perfilPrestador: true },
  });
  if (!user) redirect("/entrar");

  const prestador = user.perfilPrestador;
  const nomesCategorias = prestador?.categorias
    .map((id) => CATEGORIAS.find((c) => c.id === id)?.nome)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-2 text-center">
        <Avatar nome={user.nome ?? "Você"} fotoUrl={user.image} tamanho={112} />
        <h1 className="text-2xl font-black break-words">{user.nome}</h1>
        <p className="text-texto-suave">Membro desde {mesAno.format(user.createdAt)}</p>
        {user.modoAtual === "PRESTADOR" && (
          <p className="rounded-full bg-marca-suave px-4 py-1 text-sm font-extrabold text-marca-texto">Modo prestador ligado</p>
        )}
      </header>

      <TrocarModo modoAtual={user.modoAtual} />

      {prestador ? (
        <section aria-labelledby="titulo-bicos" className="flex flex-col gap-2 rounded-2xl border border-borda p-4">
          <h2 id="titulo-bicos" className="text-lg font-black">Meus bicos</h2>
          <p><b>Serviços:</b> {nomesCategorias}</p>
          <p><b>Região:</b> {prestador.bairro}, {prestador.cidade} (até {prestador.raioKm} km)</p>
          <Link href="/quero-fazer-bicos" className="self-start rounded-lg py-2 font-extrabold text-marca-texto hover:underline focus-visible:outline-3 focus-visible:outline-foco">
            Mudar o que eu faço
          </Link>
        </section>
      ) : (
        <CartaoFazerBicos />
      )}

      <EditarDados nome={user.nome ?? ""} email={user.email ?? ""} telefone={user.telefone ?? ""} foto={user.image} />

      <section aria-labelledby="titulo-aparencia" className="flex flex-col gap-3">
        <h2 id="titulo-aparencia" className="text-lg font-black">Aparência</h2>
        <SeletorTema />
      </section>

      <section aria-labelledby="titulo-avisos" className="flex flex-col gap-3">
        <h2 id="titulo-avisos" className="text-lg font-black">Avisos no celular</h2>
        <BotaoNotificacoes />
      </section>

      <BotaoSair />
    </div>
  );
}
