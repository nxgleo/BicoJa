import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { detalheContrato } from "@/lib/contratos/contratos";
import { exigirLogin } from "@/lib/sessao-pagina";
import { TelaContrato } from "@/components/contratos/TelaContrato";

export const dynamic = "force-dynamic";

export default async function Contrato({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await exigirLogin(`/contratos/${id}`);
  const contrato = await detalheContrato(prisma, id, userId);
  if (!contrato) notFound();
  return <TelaContrato key={id} inicial={contrato} />;
}
