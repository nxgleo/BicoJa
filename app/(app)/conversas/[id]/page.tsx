import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { abrirConversa } from "@/lib/chat/conversas";
import { exigirLogin } from "@/lib/sessao-pagina";
import { TelaChat } from "@/components/chat/TelaChat";

export const dynamic = "force-dynamic";

export default async function Conversa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await exigirLogin(`/conversas/${id}`);
  const conversa = await abrirConversa(prisma, id, userId);
  if (!conversa) notFound();
  return <TelaChat key={id} inicial={conversa} eu={userId} />;
}
