/**
 * Tema do Kcloset.
 *
 * Uma receita de quatro cores (fundo, texto, destaque, tom do guarda-roupa)
 * gera o jogo inteiro de variáveis CSS que o app usa (`--c-ink`, `--c-paper`,
 * `--case-face` e as demais). A usuária define uma receita Geral e pode,
 * página por página, optar por uma receita própria que substitui a Geral só
 * naquela aba.
 */

export type ThemeScopeId = "global" | "home" | "closet" | "looks" | "bazaar";

export type ThemeRecipe = {
  paper: string;
  ink: string;
  accent: string;
  wardrobe: string;
};

export type ThemeState = {
  global: ThemeRecipe;
  overrides: Partial<Record<Exclude<ThemeScopeId, "global">, ThemeRecipe>>;
};

export const DEFAULT_RECIPE: ThemeRecipe = {
  paper: "#FBF9F7",
  ink: "#1A1816",
  accent: "#C58E8E",
  wardrobe: "#F1EEE9",
};

export const DEFAULT_THEME_STATE: ThemeState = {
  global: DEFAULT_RECIPE,
  overrides: {},
};

export const THEME_SCOPES: { id: ThemeScopeId; label: string }[] = [
  { id: "global", label: "Geral" },
  { id: "home", label: "Guarda-roupa" },
  { id: "closet", label: "Closet" },
  { id: "looks", label: "Looks" },
  { id: "bazaar", label: "Bazar" },
];

/** Combinações prontas, um ponto de partida para depois ajustar à vontade. */
export const THEME_PRESETS: { name: string; recipe: ThemeRecipe }[] = [
  { name: "Rosa clássico", recipe: DEFAULT_RECIPE },
  {
    name: "Lavanda",
    recipe: { paper: "#F8F6FB", ink: "#241F2E", accent: "#9B84C4", wardrobe: "#EEEAF6" },
  },
  {
    name: "Verde sálvia",
    recipe: { paper: "#F5F7F2", ink: "#1E241C", accent: "#7F9A72", wardrobe: "#EAEFE4" },
  },
  {
    name: "Terracota",
    recipe: { paper: "#FBF4EC", ink: "#2B1B13", accent: "#C97B4F", wardrobe: "#F1E3D3" },
  },
  {
    name: "Céu",
    recipe: { paper: "#F3F7FA", ink: "#1B242C", accent: "#6E93B0", wardrobe: "#E5ECF1" },
  },
  {
    name: "Noturno",
    recipe: { paper: "#221E22", ink: "#F2ECEC", accent: "#D9A0A8", wardrobe: "#2E2825" },
  },
];

/** A receita em uso num escopo: a própria, se a usuária tiver optado por
 * cores próprias ali, senão a Geral. */
export function recipeFor(state: ThemeState, scope: ThemeScopeId): ThemeRecipe {
  if (scope === "global") return state.global;
  return state.overrides[scope] ?? state.global;
}

export function hasOverride(state: ThemeState, scope: Exclude<ThemeScopeId, "global">): boolean {
  return Boolean(state.overrides[scope]);
}

/* -------------------------------------------------------------------------
   Derivação de cor
   ------------------------------------------------------------------------- */

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16) || 0;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const toChannel = (v: number) => Math.round(clamp(v, 0, 255));

const toHex = (rgb: RGB) =>
  `#${rgb.map((c) => toChannel(c).toString(16).padStart(2, "0")).join("")}`;

const toTriple = (rgb: RGB) => rgb.map(toChannel).join(" ");

/** Mistura linear entre duas cores; t=0 devolve `a`, t=1 devolve `b`. */
function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Escurece uma cor, preservando o matiz. */
function darken(rgb: RGB, factor: number): RGB {
  return rgb.map((c) => c * factor) as RGB;
}

export type CssVars = Record<string, string>;

/**
 * Deriva o jogo inteiro de variáveis CSS a partir da receita de 4 cores.
 * As proporções de mistura reproduzem a relação entre os tons do tema
 * original, então uma receita nova mantém o mesmo contraste e a mesma
 * sensação de profundidade do design de base.
 */
export function deriveVars(recipe: ThemeRecipe): CssVars {
  const ink = hexToRgb(recipe.ink);
  const paper = hexToRgb(recipe.paper);
  const accent = hexToRgb(recipe.accent);
  const wardrobe = hexToRgb(recipe.wardrobe);

  const inkSoft = mix(ink, paper, 0.09);
  const paperDeep = mix(paper, ink, 0.04);
  const graphite = mix(ink, paper, 0.37);
  const mist = mix(ink, paper, 0.86);
  const mistStrong = mix(ink, paper, 0.65);
  const blush = mix(accent, paper, 0.62);

  const caseFace2 = darken(wardrobe, 0.93);
  const caseEdge = darken(wardrobe, 0.86);
  const caseInner = darken(wardrobe, 0.955);
  const caseInnerDeep = darken(wardrobe, 0.83);
  const caseLine = darken(wardrobe, 0.74);

  return {
    "--c-ink": toTriple(ink),
    "--c-ink-soft": toTriple(inkSoft),
    "--c-paper": toTriple(paper),
    "--c-paper-deep": toTriple(paperDeep),
    "--c-graphite": toTriple(graphite),
    "--c-mist": toTriple(mist),
    "--c-mist-strong": toTriple(mistStrong),
    "--c-blush": toTriple(blush),
    "--c-blush-deep": toTriple(accent),
    "--case-face": toHex(wardrobe),
    "--case-face-2": toHex(caseFace2),
    "--case-edge": toHex(caseEdge),
    "--case-inner": toHex(caseInner),
    "--case-inner-deep": toHex(caseInnerDeep),
    "--case-line": toHex(caseLine),
  };
}

/* -------------------------------------------------------------------------
   Persistência
   ------------------------------------------------------------------------- */

const THEME_KEY = "kcloset:theme:v1";

export function loadThemeState(): ThemeState {
  if (typeof window === "undefined") return DEFAULT_THEME_STATE;

  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    if (!raw) return DEFAULT_THEME_STATE;

    const parsed = JSON.parse(raw) as Partial<ThemeState>;
    return {
      global: { ...DEFAULT_RECIPE, ...(parsed.global ?? {}) },
      overrides: parsed.overrides && typeof parsed.overrides === "object" ? parsed.overrides : {},
    };
  } catch {
    return DEFAULT_THEME_STATE;
  }
}

export function saveThemeState(state: ThemeState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_KEY, JSON.stringify(state));
  } catch {
    // sem cota ou storage bloqueado: a personalização simplesmente não persiste
  }
}
