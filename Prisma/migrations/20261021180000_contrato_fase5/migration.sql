-- CreateEnum
CREATE TYPE "MetodoPagamento" AS ENUM ('PIX', 'CARTAO', 'DIRETO');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'RETIDO', 'LIBERADO', 'ESTORNADO', 'DIRETO');

-- AlterTable
ALTER TABLE "Contrato" ADD COLUMN     "avisoSeisDias" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "avisoTresDias" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canceladoEm" TIMESTAMP(3),
ADD COLUMN     "canceladoPorId" TEXT,
ADD COLUMN     "codigoBloqueadoAte" TIMESTAMP(3),
ADD COLUMN     "codigoCifrado" TEXT,
ADD COLUMN     "concluidoEm" TIMESTAMP(3),
ADD COLUMN     "liberadoEm" TIMESTAMP(3),
ADD COLUMN     "metodoPagamento" "MetodoPagamento",
ADD COLUMN     "motivoCancelamento" TEXT,
ADD COLUMN     "pagoEm" TIMESTAMP(3),
ADD COLUMN     "statusPagamento" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
ADD COLUMN     "taxaPercentual" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "taxaValor" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tentativasCodigo" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Avaliacao" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "avaliadoId" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aviso" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "lido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aviso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Avaliacao_avaliadoId_idx" ON "Avaliacao"("avaliadoId");

-- CreateIndex
CREATE UNIQUE INDEX "Avaliacao_contratoId_autorId_key" ON "Avaliacao"("contratoId", "autorId");

-- CreateIndex
CREATE INDEX "Aviso_userId_lido_idx" ON "Aviso"("userId", "lido");

-- CreateIndex
CREATE INDEX "Contrato_status_idx" ON "Contrato"("status");

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_avaliadoId_fkey" FOREIGN KEY ("avaliadoId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aviso" ADD CONSTRAINT "Aviso_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

