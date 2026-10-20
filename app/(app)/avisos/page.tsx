import { Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { listarAvisos } from "@/lib/avisos";
import { exigirLogin } from "@/lib/sessao-pagina";
import { EstadoVazio } from "@/components/ui";
import { ListaAvisos } from "@/components/avisos/ListaAvisos";

export const dynamic = "force-dynamic";

export default async function Avisos() {
  const userId = await exigirLogin("/avisos");
  const avisos = await listarAvisos(prisma, userId);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[1.6rem] leading-tight font-black">Avisos</h1>
      {avisos.length === 0 ? (
        <EstadoVazio icone={Bell} titulo="Nenhum aviso" texto="Aqui aparecem pagamentos, serviços concluídos e prazos." />
      ) : (
        <ListaAvisos avisos={avisos} />
      )}
    </div>
  );
}
