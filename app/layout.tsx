import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Italiana, Manrope } from "next/font/google";
import "./globals.css";

/** Marca: só o "KCLOSET" da abertura usa. */
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
  title: "Kcloset · seu guarda-roupa virtual",
  description:
    "Guarda-roupa virtual pessoal: organize suas peças, monte looks, salve em coleções e anuncie no K Bazar.",
};

export const viewport: Viewport = {
  themeColor: "#111010",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
