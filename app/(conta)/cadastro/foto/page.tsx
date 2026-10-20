"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BarraProgresso } from "@/components/conta/BarraProgresso";
import { EnviarFoto } from "@/components/conta/EnviarFoto";

export default function FotoDoCadastro() {
  const router = useRouter();
  const { update } = useSession();

  return (
    <div className="flex flex-1 flex-col gap-5">
      <BarraProgresso passo={4} total={4} />
      <h1 className="text-[1.6rem] leading-tight font-black">Sua foto de perfil</h1>
      <p className="text-texto-suave">
        Ela aparece no seu perfil e nas conversas, para a outra pessoa saber quem vai encontrar.
      </p>
      <EnviarFoto
        onEnviada={async () => {
          await update();
          router.push("/cadastro/pronto");
          router.refresh();
        }}
      />
    </div>
  );
}
