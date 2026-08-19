import type { LucideIcon } from "lucide-react";

/* -------------------------------------------------------------------------
   Domínio
   ------------------------------------------------------------------------- */

/**
 * Quatro famílias, não mais seis. É o que permite desenhar um guarda-roupa
 * plausível (haste de cima, haste de baixo, chão de calçados, coluna de
 * acessórios) e o que mantém a montagem de look com um slot por família.
 */
export type CategoryId = "tops" | "bottoms" | "calcados" | "acessorios";

export type Category = {
  id: CategoryId;
  /** Rótulo curto, usado nas abas e no móvel. */
  label: string;
  /** Rótulo longo, usado em títulos e vazios. */
  long: string;
};

export type OccasionId = "praia" | "jantar" | "trabalho" | "festa" | "show" | "outro";

export type Occasion = {
  id: OccasionId;
  label: string;
  /** Usado na frase "Para {phrase}..." na tela de sugestões. */
  phrase: string;
  Icon: LucideIcon;
};

/**
 * Desenho da peça. A família diz onde a peça mora no móvel; a forma diz como
 * ela é desenhada, e é o que faz um vestido descer até o chão e um shorts não.
 */
export type GarmentShape =
  | "blusa"
  | "camisa"
  | "tricot"
  | "vestido"
  | "calca"
  | "jeans"
  | "saia"
  | "shorts"
  | "tenis"
  | "salto"
  | "bota"
  | "sandalia"
  | "bolsa"
  | "oculos"
  | "colar"
  | "chapeu";

export type ClothingItem = {
  id: string;
  name: string;
  category: CategoryId;
  /** Desenho da peça; quando ausente, cai no padrão da família. */
  shape?: GarmentShape;
  /**
   * Ocupa o corpo inteiro (vestido, macacão). Mora em `tops` e dispensa a
   * peça de baixo na montagem do look.
   */
  fullBody?: boolean;
  color: string;
  season: string;
  formality: string;
  occasions: OccasionId[];
  note: string;
  /** Peça anunciada no K Bazar. */
  forBazaar: boolean;
  price?: string;
  condition?: string;
  /**
   * Foto da peça em base64 (data URL), já redimensionada e comprimida por
   * lib/image.ts. Ausente nas peças de seed, que caem no desenho.
   */
  photo?: string;
  /** Presente apenas nas peças cadastradas pela usuária. */
  createdAt?: number;
};

/** Peça com as cores de exibição já resolvidas. */
export type DecoratedItem = ClothingItem & {
  /** Fundo do card / da miniatura. */
  cardTone: string;
  /** Cor do tecido no desenho da peça. */
  fabric: string;
  /** Sombra do tecido, para o desenho não ficar chapado. */
  fabricShade: string;
  /** Traço do contorno. */
  fabricLine: string;
  /** Forma resolvida (nunca undefined). */
  drawing: GarmentShape;
};

export type ItemMap = Record<string, DecoratedItem>;

export type Outfit = {
  id: string;
  name: string;
  itemIds: string[];
  /** `null` em sugestões, que não são salvas. */
  date: string | null;
  suggested: boolean;
  /** Coleções (estilo Pinterest) em que o look está salvo. */
  boardIds?: string[];
  /** Etiquetas livres da usuária. */
  tags?: string[];
  /** Datas em que o look foi usado (ISO `YYYY-MM-DD`), do mais novo ao mais antigo. */
  wornDates?: string[];
};

/** Coleção de looks: a "pasta" da aba Looks. */
export type Board = {
  id: string;
  name: string;
  createdAt?: number;
};

/* -------------------------------------------------------------------------
   Montagem de look
   ------------------------------------------------------------------------- */

export type SlotKey = "top" | "bottom" | "shoes" | "acc";

/**
 * O look em montagem. Os três primeiros espaços aceitam uma peça cada; os
 * acessórios são vários, dá para usar bolsa, óculos e joia no mesmo look.
 */
export type BuilderSelection = {
  top: string | null;
  bottom: string | null;
  shoes: string | null;
  accs: string[];
};

/**
 * Subdivisão dos acessórios, só para a aba Closet. A família continua sendo
 * uma só (é assim que o guarda-roupa mostra), mas na hora de escolher a peça
 * vale separar bolsa de óculos e de joia.
 */
export type AccessoryGroup = "bolsa" | "oculos" | "joias" | "outros";

/* -------------------------------------------------------------------------
   Navegação
   ------------------------------------------------------------------------- */

export type ScreenId =
  | "home"
  | "closet"
  | "itemDetail"
  | "looks"
  | "board"
  | "lookDetail"
  | "stats"
  | "calendar"
  | "occasion"
  | "occasionResult"
  | "bazaar"
  | "addItem";

/** Telas que aparecem na barra inferior. */
export type NavScreenId = Extract<ScreenId, "home" | "closet" | "looks" | "bazaar">;

/** Payload do formulário de cadastro de peça (sem id nem createdAt). */
export type NewItemDraft = Omit<ClothingItem, "id" | "createdAt">;
