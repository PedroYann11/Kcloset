import type { CategoryId, ClothingItem, DecoratedItem, GarmentShape } from "@/types";

/**
 * Cores de exibição das peças.
 *
 * O tema do app é preto, cinza e rosa pastel, então o tecido desenhado sai
 * sempre dessa faixa. A cor escrita no cadastro ("Preto", "Rosa pó", "Jeans")
 * é traduzida para um tom concreto; o que não é reconhecido cai num cinza
 * claro neutro, nunca num tom fora do tema.
 */

type Fabric = {
  /** Preenchimento principal. */
  fill: string;
  /** Dobra/sombra: sempre o mesmo tom, mais fechado. */
  shade: string;
  /** Contorno. */
  line: string;
};

const FABRICS: Record<string, Fabric> = {
  preto: { fill: "#2B2724", shade: "#1B1815", line: "#100E0C" },
  grafite: { fill: "#454039", shade: "#332F29", line: "#221F1B" },
  cinza: { fill: "#A8A29A", shade: "#8D877F", line: "#6B655E" },
  "cinza-claro": { fill: "#CFC9C1", shade: "#B6AFA6", line: "#8A847C" },
  branco: { fill: "#F7F4F0", shade: "#E4DED6", line: "#B3ABA1" },
  "off-white": { fill: "#F1EBE3", shade: "#DDD4C9", line: "#AEA69B" },
  bege: { fill: "#E3D6C6", shade: "#CDBCA7", line: "#A2937F" },
  nude: { fill: "#E6CFBD", shade: "#D0B49E", line: "#A78C77" },
  rosa: { fill: "#EFCBCB", shade: "#DEAFAF", line: "#B58585" },
  "rosa-escuro": { fill: "#D3A0A0", shade: "#BC8686", line: "#966767" },
  jeans: { fill: "#B9C4CF", shade: "#9CA9B7", line: "#77828F" },
  "jeans-escuro": { fill: "#8592A1", shade: "#6C7A89", line: "#525E6B" },
};

const NEUTRAL = FABRICS["cinza-claro"];

/** Palavras-chave da cor escrita → tecido. Ordem importa: a primeira que casa vence. */
const COLOR_HINTS: [RegExp, Fabric][] = [
  [/preto|black|onix|ônix/i, FABRICS.preto],
  [/grafite|chumbo|carvão|carvao/i, FABRICS.grafite],
  [/cinza\s*(claro|perola|pérola)/i, FABRICS["cinza-claro"]],
  [/cinza|prata|mescla/i, FABRICS.cinza],
  [/off.?white|cru|marfim|creme/i, FABRICS["off-white"]],
  [/branco|white/i, FABRICS.branco],
  [/bege|areia|camel|caqui/i, FABRICS.bege],
  [/nude|amêndoa|amendoa|terracota/i, FABRICS.nude],
  [/rosa\s*(escuro|antigo|queimado)|blush\s*escuro/i, FABRICS["rosa-escuro"]],
  [/rosa|blush|pink|pó|po\b|salmão|salmao/i, FABRICS.rosa],
  [/jeans\s*(escuro|indigo|índigo)|azul\s*escuro|marinho/i, FABRICS["jeans-escuro"]],
  [/jeans|denim|azul/i, FABRICS.jeans],
  [/dourado|ouro|prateado|metal/i, FABRICS.cinza],
];

function fabricForColor(color: string): Fabric {
  return COLOR_HINTS.find(([pattern]) => pattern.test(color))?.[1] ?? NEUTRAL;
}

/** Fundo do card da peça: pastel bem claro, puxado para o tom do tecido. */
const CARD_TONES: Record<string, string> = {
  "#2B2724": "#E9E6E2",
  "#454039": "#E9E7E3",
  "#A8A29A": "#EDEAE6",
  "#CFC9C1": "#F1EFEB",
  "#F7F4F0": "#F0EEEA",
  "#F1EBE3": "#F2EEE8",
  "#E3D6C6": "#F3EDE5",
  "#E6CFBD": "#F5EDE6",
  "#EFCBCB": "#F8EDED",
  "#D3A0A0": "#F5E7E7",
  "#B9C4CF": "#EDF0F3",
  "#8592A1": "#EBEEF1",
};

/** Forma padrão de cada família, quando a peça não traz uma. */
const DEFAULT_SHAPE: Record<CategoryId, GarmentShape> = {
  tops: "blusa",
  bottoms: "calca",
  calcados: "tenis",
  acessorios: "bolsa",
};

export function shapeForItem(item: ClothingItem): GarmentShape {
  if (item.shape) return item.shape;
  if (item.category === "tops" && item.fullBody) return "vestido";
  return DEFAULT_SHAPE[item.category] ?? "blusa";
}

/** Resolve cores e forma de cada peça uma única vez, na entrada do app. */
export function decorateItems(items: ClothingItem[]): DecoratedItem[] {
  return items.map((item) => {
    const fabric = fabricForColor(item.color);
    return {
      ...item,
      fabric: fabric.fill,
      fabricShade: fabric.shade,
      fabricLine: fabric.line,
      cardTone: CARD_TONES[fabric.fill] ?? "#F1EFEB",
      drawing: shapeForItem(item),
    };
  });
}
