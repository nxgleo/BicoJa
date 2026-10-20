import { Wallet } from "lucide-react";
import { exigirPrestador } from "@/lib/prestador-pagina";
import { EstadoVazio } from "@/components/ui";

export const dynamic = "force-dynamic";

// Chega na Fase 5 (contratos e pagamentos)
export default async function Pagina() {
  await exigirPrestador("/prestador/ganhos");
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[1.6rem] leading-tight font-black">Meus ganhos</h1>
      <EstadoVazio icone={Wallet} titulo="Em breve" texto="Aqui você vai ver quanto recebeu pelos bicos e o que ainda está guardado para liberar." />
    </div>
  );
}
