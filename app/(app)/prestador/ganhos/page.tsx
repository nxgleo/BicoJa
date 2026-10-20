import { prisma } from "@/lib/prisma";
import { exigirPrestador } from "@/lib/prestador-pagina";
import { ganhosDo } from "@/lib/contratos/contratos";
import { TAXA_PLATAFORMA_PERCENTUAL } from "@/lib/contratos/esquemas";
import { formatarPreco } from "@/lib/formatar";

export const dynamic = "force-dynamic";

export default async function Pagina() {
  const { userId } = await exigirPrestador("/prestador/ganhos");
  const g = await ganhosDo(prisma, userId);
  const blocos = [
    { titulo: "Recebido pelo app", ...g.recebido, texto: "Serviços concluídos e pagos pelo app.", destaque: true },
    { titulo: "Guardado", ...g.guardado, texto: "O cliente já pagou. Libera quando você digitar o código.", destaque: false },
    { titulo: "Pago direto", ...g.direto, texto: "Combinados para o cliente pagar direto para você.", destaque: false },
  ];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[1.6rem] leading-tight font-black">Meus ganhos</h1>
      <ul className="flex flex-col gap-3">
        {blocos.map((b) => (
          <li key={b.titulo} className={`rounded-2xl p-4 ${b.destaque ? "border-2 border-sucesso bg-superficie" : "bg-superficie-suave"}`}>
            <p className="font-bold text-texto-suave">{b.titulo}</p>
            <p className="text-3xl font-black">{formatarPreco(b.valor)}</p>
            <p className="text-texto-suave">
              {b.quantidade === 1 ? "1 serviço" : `${b.quantidade} serviços`} · {b.texto}
            </p>
          </li>
        ))}
      </ul>
      <p className="rounded-2xl border-2 border-dashed border-marca bg-marca-suave p-4">
        <b>Pagamentos de teste:</b> ainda não tem dinheiro de verdade no BicoJá. O BicoJá é grátis
        {TAXA_PLATAFORMA_PERCENTUAL === 0 ? " — não cobramos taxa." : ` — taxa de ${TAXA_PLATAFORMA_PERCENTUAL}% nos pagamentos pelo app.`}
      </p>
    </div>
  );
}
