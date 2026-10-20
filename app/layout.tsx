import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ScriptTema } from "@/components/layout/ScriptTema";
import { RegistrarServiceWorker } from "@/components/pwa/RegistrarServiceWorker";
import { AvisoSemInternet } from "@/components/pwa/AvisoSemInternet";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "BicoJá",
  description: "Encontre quem resolve seu problema perto de você, ou ganhe dinheiro fazendo bicos.",
  icons: { apple: "/icones/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "BicoJá", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#14181C" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <ScriptTema />
      </head>
      <body className={`${nunito.variable} min-h-screen bg-fundo text-texto antialiased`}>
        <AvisoSemInternet />
        <Providers>{children}</Providers>
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
