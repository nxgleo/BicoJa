-- CreateEnum
CREATE TYPE "TipoMensagem" AS ENUM ('TEXTO', 'PROPOSTA', 'SISTEMA');

-- CreateEnum
CREATE TYPE "StatusPropostaChat" AS ENUM ('PENDENTE', 'ACEITA', 'RECUSADA', 'SUBSTITUIDA');

-- CreateEnum
CREATE TYPE "StatusContrato" AS ENUM ('COMBINADO', 'CONCLUIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Conversa" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "prestadorId" TEXT NOT NULL,
    "servicoId" TEXT,
    "pedidoId" TEXT,
    "lidaClienteEm" TIMESTAMP(3),
    "lidaPrestadorEm" TIMESTAMP(3),
    "ultimaMensagemEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensagem" (
    "id" TEXT NOT NULL,
    "conversaId" TEXT NOT NULL,
    "autorId" TEXT,
    "tipo" "TipoMensagem" NOT NULL DEFAULT 'TEXTO',
    "texto" TEXT,
    "fotoUrl" TEXT,
    "valor" DOUBLE PRECISION,
    "quandoTipo" "TipoQuando",
    "dataInicio" DATE,
    "dataFim" DATE,
    "horaInicio" TEXT,
    "horaFim" TEXT,
    "pedidoId" TEXT,
    "statusProposta" "StatusPropostaChat",
    "propostaAnteriorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "conversaId" TEXT NOT NULL,
    "propostaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "prestadorId" TEXT NOT NULL,
    "pedidoId" TEXT,
    "servicoId" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,
    "quandoTipo" "TipoQuando" NOT NULL,
    "dataInicio" DATE,
    "dataFim" DATE,
    "horaInicio" TEXT,
    "horaFim" TEXT,
    "status" "StatusContrato" NOT NULL DEFAULT 'COMBINADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bloqueio" (
    "autorId" TEXT NOT NULL,
    "bloqueadoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bloqueio_pkey" PRIMARY KEY ("autorId","bloqueadoId")
);

-- CreateTable
CREATE TABLE "Denuncia" (
    "id" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "denunciadoId" TEXT NOT NULL,
    "conversaId" TEXT,
    "motivo" TEXT NOT NULL,
    "detalhe" TEXT,
    "revisada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Denuncia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversa_prestadorId_idx" ON "Conversa"("prestadorId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversa_clienteId_prestadorId_key" ON "Conversa"("clienteId", "prestadorId");

-- CreateIndex
CREATE INDEX "Mensagem_conversaId_createdAt_idx" ON "Mensagem"("conversaId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_propostaId_key" ON "Contrato"("propostaId");

-- AddForeignKey
ALTER TABLE "Conversa" ADD CONSTRAINT "Conversa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversa" ADD CONSTRAINT "Conversa_prestadorId_fkey" FOREIGN KEY ("prestadorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversa" ADD CONSTRAINT "Conversa_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "Conversa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "Conversa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "Mensagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_prestadorId_fkey" FOREIGN KEY ("prestadorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bloqueio" ADD CONSTRAINT "Bloqueio_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bloqueio" ADD CONSTRAINT "Bloqueio_bloqueadoId_fkey" FOREIGN KEY ("bloqueadoId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_denunciadoId_fkey" FOREIGN KEY ("denunciadoId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

