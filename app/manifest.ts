import type { MetadataRoute } from "next";

/**
 * Manifesto do PWA.
 *
 * É o que faz o Kloset virar ícone na tela de início e abrir em tela cheia,
 * sem barra de navegador. O fundo escuro combina com a tela de abertura, então
 * a splash do Android não pisca branco antes do guarda-roupa aparecer.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kloset",
    short_name: "Kloset",
    description: "Seu guarda-roupa virtual: organize as peças, monte looks e salve em coleções.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#131211",
    theme_color: "#131211",
    categories: ["lifestyle", "shopping"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // O Android recorta o ícone no formato do sistema, então essa versão vem
      // com o móvel menor para não perder as bordas no corte.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
