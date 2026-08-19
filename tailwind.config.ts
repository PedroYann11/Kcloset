import type { Config } from "tailwindcss";

/**
 * Tokens de design do Kcloset — preto, cinza e rosa pastel.
 * As cores apontam para CSS variables (app/globals.css) em formato de tripla RGB,
 * o que permite usar os modificadores de opacidade do Tailwind (`bg-ink/40`).
 * O globals.css também expõe aliases prontos (`--ink`, `--paper`, ...) para os
 * pontos em que a cor precisa ir num `style` inline ou num atributo de SVG.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--c-ink) / <alpha-value>)", // texto principal / superfícies escuras
        "ink-soft": "rgb(var(--c-ink-soft) / <alpha-value>)", // texto secundário
        paper: "rgb(var(--c-paper) / <alpha-value>)", // fundo base
        "paper-deep": "rgb(var(--c-paper-deep) / <alpha-value>)", // superfícies elevadas
        graphite: "rgb(var(--c-graphite) / <alpha-value>)", // texto de apoio
        mist: "rgb(var(--c-mist) / <alpha-value>)", // bordas
        "mist-strong": "rgb(var(--c-mist-strong) / <alpha-value>)", // bordas em destaque
        blush: "rgb(var(--c-blush) / <alpha-value>)", // acento suave
        "blush-deep": "rgb(var(--c-blush-deep) / <alpha-value>)", // acento principal
        night: "rgb(var(--c-night) / <alpha-value>)", // cena do guarda-roupa
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"], // marca "KCLOSET"
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        shell: "430px", // largura do "aparelho" — o app é mobile-first
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
