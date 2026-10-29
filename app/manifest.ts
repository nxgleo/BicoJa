import type { MetadataRoute } from "next";

// Dados que o celular usa para "instalar" o BicoJá como app
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BicoJá",
    short_name: "BicoJá",
    description: "Encontre quem resolve seu problema perto de você, ou ganhe dinheiro fazendo bicos.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#E8770C",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icones/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
