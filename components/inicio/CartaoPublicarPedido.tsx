import { Botao } from "@/components/ui";

export function CartaoPublicarPedido() {
  return (
    <section className="rounded-2xl bg-superficie-suave p-5">
      <h2 className="text-lg font-black">Não achou o que precisa?</h2>
      <p className="mt-1 mb-4 text-texto-suave">Conte seu problema e os prestadores mandam propostas.</p>
      <Botao href="/pedidos/novo" larguraTotal>
        Publicar meu pedido
      </Botao>
    </section>
  );
}
