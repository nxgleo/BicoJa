import { getServerSession } from "next-auth";
import { CircleCheck } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Botao } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CadastroPronto() {
  const sessao = await getServerSession(authOptions);
  const primeiroNome = sessao?.user?.name?.split(" ")[0] ?? "";
  const querFazerBicos = sessao?.user?.role === "PRESTADOR" || sessao?.user?.role === "AMBOS";
  const jaEhPrestador = sessao?.user?.id
    ? Boolean(await prisma.perfilPrestador.findUnique({ where: { userId: sessao.user.id }, select: { id: true } }))
    : false;
  const configurarBicos = querFazerBicos && !jaEhPrestador;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="my-auto flex flex-col items-center gap-4 text-center">
        <span className="flex size-24 items-center justify-center rounded-full bg-sucesso/15">
          <CircleCheck aria-hidden className="size-14 text-sucesso" />
        </span>
        <h1 className="text-[1.6rem] leading-tight font-black break-words">Tudo pronto{primeiroNome ? `, ${primeiroNome}` : ""}!</h1>
        <p className="text-texto-suave">Sua conta está criada.</p>
        {configurarBicos && (
          <p className="text-texto">Agora falta contar o que você faz, para os clientes acharem você.</p>
        )}
      </div>
      {configurarBicos ? (
        <>
          <Botao href="/quero-fazer-bicos" larguraTotal tamanho="grande">Contar o que eu faço</Botao>
          <Botao href="/" variante="secundario" larguraTotal>Fazer isso depois</Botao>
        </>
      ) : (
        <Botao href="/" larguraTotal tamanho="grande">Começar a usar</Botao>
      )}
    </div>
  );
}
