import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Italiana, Manrope } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

/** Marca: só o "KLOSET" da abertura usa. */
const display = Italiana({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

/** Display editorial: títulos, nomes de peças e de looks. */
const serif = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

/** Corpo de texto, rótulos e navegação. */
const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kloset · seu guarda-roupa virtual",
  description:
    "Guarda-roupa virtual pessoal: organize suas peças, monte looks, salve em coleções e anuncie no K Bazar.",
  applicationName: "Kloset",
  // Instalado no iPhone, abre em tela cheia como app. A barra de status fica
  // no estilo claro porque quase todas as telas do app têm fundo claro.
  appleWebApp: {
    capable: true,
    title: "Kloset",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    // O Next já emite o `mobile-web-app-capable` padrão, que o iOS entende a
    // partir do 15.4. Esta é a versão antiga, para iPhone mais velho abrir em
    // tela cheia em vez de dentro do Safari.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#131211",
  width: "device-width",
  initialScale: 1,
  // Impede o zoom por duplo toque, que num app instalado parece defeito.
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${serif.variable} ${sans.variable}`}>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
