// Depois de uma ação no serviço combinado: avisa em tempo real (socket) e por push no celular.
import { prisma } from "@/lib/prisma";
import { avisarEfeitos } from "@/lib/chat/tempo-real";
import { pushDosAvisos } from "@/lib/push";
import type { Efeitos } from "@/lib/contratos/contratos";

export function entregarEfeitos(e: Efeitos) {
  avisarEfeitos(e);
  void pushDosAvisos(prisma, e.avisados);
}
