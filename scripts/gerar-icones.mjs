// Gera os ícones do app (PWA) a partir do logo. Uso: node scripts/gerar-icones.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const LOGO = "public/logo.png";
const PASTA = "public/icones";
const LARANJA = { r: 232, g: 119, b: 12, alpha: 1 }; // #E8770C

await mkdir(PASTA, { recursive: true });

for (const tamanho of [192, 512]) {
  await sharp(LOGO).resize(tamanho, tamanho).png().toFile(`${PASTA}/icone-${tamanho}.png`);
}

// "Maskable": o celular pode cortar as bordas em círculo, então o logo fica a 80% com margem laranja
const miolo = Math.round(512 * 0.8);
await sharp(LOGO)
  .resize(miolo, miolo)
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: LARANJA })
  .resize(512, 512)
  .png()
  .toFile(`${PASTA}/icone-maskable-512.png`);

await sharp(LOGO).resize(180, 180).png().toFile(`${PASTA}/apple-touch-icon.png`);
console.log("Ícones gerados em", PASTA);
