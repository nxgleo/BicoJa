-- CreateEnum
CREATE TYPE "TipoQuando" AS ENUM ('DIA_CERTO', 'ENTRE_DIAS', 'QUALQUER_DIA');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('ABERTO', 'FECHADO', 'CANCELADO');

-- AlterTable
ALTER TABLE "PerfilPrestador" ADD COLUMN     "disponivelAte" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Servico" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "categoria" TEXT NOT NULL DEFAULT 'outros',
ADD COLUMN     "fotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "EnderecoUsuario" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rua" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnderecoUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "fotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "urgente" BOOLEAN NOT NULL DEFAULT false,
    "urgenteAte" TIMESTAMP(3),
    "quandoTipo" "TipoQuando" NOT NULL,
    "dataInicio" DATE,
    "dataFim" DATE,
    "horaInicio" TEXT,
    "horaFim" TEXT,
    "rua" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "StatusPedido" NOT NULL DEFAULT 'ABERTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnderecoUsuario_userId_key" ON "EnderecoUsuario"("userId");

-- CreateIndex
CREATE INDEX "Pedido_status_categoria_idx" ON "Pedido"("status", "categoria");

-- AddForeignKey
ALTER TABLE "EnderecoUsuario" ADD CONSTRAINT "EnderecoUsuario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

