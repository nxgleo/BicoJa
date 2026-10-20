-- CreateEnum
CREATE TYPE "Modo" AS ENUM ('CLIENTE', 'PRESTADOR');

-- CreateEnum
CREATE TYPE "TipoCodigo" AS ENUM ('EMAIL_CADASTRO', 'RECUPERAR_SENHA');

-- DropForeignKey
ALTER TABLE "Proposta" DROP CONSTRAINT "Proposta_prestadorId_fkey";

-- DropForeignKey
ALTER TABLE "Servico" DROP CONSTRAINT "Servico_prestadorId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "modoAtual" "Modo" NOT NULL DEFAULT 'CLIENTE';

-- CreateTable
CREATE TABLE "CodigoVerificacao" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoCodigo" NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "usadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodigoVerificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilPrestador" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categorias" TEXT[],
    "bio" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "raioKm" INTEGER NOT NULL DEFAULT 10,
    "precoBase" DOUBLE PRECISION,
    "disponivel" BOOLEAN NOT NULL DEFAULT false,
    "ultimoSinal" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerfilPrestador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodigoVerificacao_userId_tipo_idx" ON "CodigoVerificacao"("userId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilPrestador_userId_key" ON "PerfilPrestador"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_telefone_key" ON "User"("telefone");

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_prestadorId_fkey" FOREIGN KEY ("prestadorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_prestadorId_fkey" FOREIGN KEY ("prestadorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodigoVerificacao" ADD CONSTRAINT "CodigoVerificacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilPrestador" ADD CONSTRAINT "PerfilPrestador_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

