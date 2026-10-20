import { Wrench } from "lucide-react";
import { exigirPrestador } from "@/lib/prestador-pagina";
import { EstadoVazio } from "@/components/ui";

export const dynamic = "force-dynamic";

// Chega na Fase 5 (contratos e pagamentos)
export default async function Pagina() {
  await exigirPrestador("/prestador/servicos");
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[1.6rem] leading-tight font-black">Meus serviços</h1>
      <EstadoVazio icone={Wrench} titulo="Em breve" texto="Aqui vão aparecer os serviços que você combinou com os clientes: os de hoje, os próximos e os já feitos." />
    </div>
  );
}
