import { Briefcase, MoreHorizontal, Music, Sparkles, Sun, Wine } from "lucide-react";
import type { Board, Category, CategoryId, ClothingItem, Occasion, Outfit } from "@/types";

/* -------------------------------------------------------------------------
   Famílias
   ------------------------------------------------------------------------- */

/**
 * Quatro famílias: é o que o guarda-roupa consegue mostrar de forma
 * plausível e o que a montagem de look precisa (um slot por família).
 */
export const CATEGORIES: Category[] = [
  { id: "tops", label: "Cima", long: "Roupas de cima" },
  { id: "bottoms", label: "Baixo", long: "Roupas de baixo" },
  { id: "calcados", label: "Calçados", long: "Calçados" },
  { id: "acessorios", label: "Acessórios", long: "Acessórios" },
];

export function categoryLong(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.long ?? "";
}

/* -------------------------------------------------------------------------
   Ocasiões
   ------------------------------------------------------------------------- */

export const OCCASIONS: Occasion[] = [
  { id: "praia", label: "Praia", phrase: "a praia", Icon: Sun },
  { id: "jantar", label: "Jantar", phrase: "um jantar hoje", Icon: Wine },
  { id: "trabalho", label: "Trabalho", phrase: "o trabalho", Icon: Briefcase },
  { id: "festa", label: "Festa", phrase: "uma festa", Icon: Sparkles },
  { id: "show", label: "Show", phrase: "um show hoje", Icon: Music },
  { id: "outro", label: "Outro", phrase: "essa ocasião", Icon: MoreHorizontal },
];

/* -------------------------------------------------------------------------
   Vocabulário do cadastro de peça
   ------------------------------------------------------------------------- */

export const SEASONS = ["Todas", "Verão", "Outono", "Inverno", "Primavera"];

export const FORMALITIES = ["Casual", "Social", "Executivo", "Romântico", "Formal", "Todas"];

export const CONDITIONS = ["Nova com etiqueta", "Seminova", "Excelente estado", "Bom estado"];

/** Sugestões de cor que o desenho da peça sabe representar. */
export const COLOR_SUGGESTIONS = [
  "Preto",
  "Grafite",
  "Cinza",
  "Cinza claro",
  "Off-white",
  "Branco",
  "Bege",
  "Nude",
  "Rosa pó",
  "Rosa antigo",
  "Jeans",
  "Jeans escuro",
];

/* -------------------------------------------------------------------------
   Peças de demonstração
   ------------------------------------------------------------------------- */

export const ITEMS: ClothingItem[] = [
  /* ---- cima ---- */
  { id: "t1", name: "Cropped canelado preto", category: "tops", shape: "blusa", color: "Preto", season: "Verão", formality: "Casual", occasions: ["praia", "outro"], note: "Combina bem com peças de cintura alta. Experimente com jeans claro ou calça pantalona.", forBazaar: false },
  { id: "t2", name: "Camisa alfaiataria off-white", category: "tops", shape: "camisa", color: "Off-white", season: "Todas", formality: "Social", occasions: ["trabalho", "jantar"], note: "Boa base para looks de trabalho. Amarre a barra para um ar mais descontraído.", forBazaar: false },
  { id: "t3", name: "Blusa manga bufante rosa pó", category: "tops", shape: "blusa", color: "Rosa pó", season: "Primavera", formality: "Romântico", occasions: ["jantar", "festa"], note: "Peça de destaque. Deixe o restante do look mais neutro.", forBazaar: true, price: "R$ 38", condition: "Excelente estado" },
  { id: "t4", name: "Tricot cinza mescla", category: "tops", shape: "tricot", color: "Cinza", season: "Inverno", formality: "Casual", occasions: ["outro", "trabalho"], note: "Quentinho sem pesar no look. Vai bem por cima de camisa.", forBazaar: false },
  { id: "v1", name: "Vestido midi preto", category: "tops", shape: "vestido", fullBody: true, color: "Preto", season: "Todas", formality: "Formal", occasions: ["jantar", "festa"], note: "Curinga para ocasiões formais. Funciona sozinho ou com uma jaqueta por cima.", forBazaar: false },
  { id: "v2", name: "Vestido linho off-white", category: "tops", shape: "vestido", fullBody: true, color: "Off-white", season: "Verão", formality: "Casual", occasions: ["praia", "outro"], note: "Leve e fresco. Ideal para dias muito quentes.", forBazaar: false },
  { id: "v3", name: "Vestido tubinho cinza chumbo", category: "tops", shape: "vestido", fullBody: true, color: "Grafite", season: "Todas", formality: "Executivo", occasions: ["trabalho"], note: "Silhueta reta e discreta, perfeito para reuniões.", forBazaar: true, price: "R$ 55", condition: "Seminova" },

  /* ---- baixo ---- */
  { id: "c1", name: "Calça pantalona cinza", category: "bottoms", shape: "calca", color: "Cinza claro", season: "Todas", formality: "Social", occasions: ["trabalho", "jantar"], note: "Alonga a silhueta. Combine com um salto discreto.", forBazaar: false },
  { id: "c2", name: "Jeans reto claro", category: "bottoms", shape: "jeans", color: "Jeans", season: "Todas", formality: "Casual", occasions: ["outro", "praia"], note: "A base mais versátil do closet, vai bem com quase tudo.", forBazaar: false },
  { id: "c3", name: "Calça alfaiataria preta", category: "bottoms", shape: "calca", color: "Preto", season: "Todas", formality: "Social", occasions: ["trabalho"], note: "Combine com camisa estruturada para um look de reunião.", forBazaar: false },
  { id: "s1", name: "Saia jeans midi", category: "bottoms", shape: "saia", color: "Jeans", season: "Primavera", formality: "Casual", occasions: ["outro"], note: "Encontro fácil com botas ou tênis branco.", forBazaar: false },
  { id: "s2", name: "Saia plissada rosa pó", category: "bottoms", shape: "saia", color: "Rosa pó", season: "Primavera", formality: "Romântico", occasions: ["jantar", "festa"], note: "O movimento da peça já é o destaque, então mantenha o top simples.", forBazaar: false },
  { id: "s3", name: "Saia lápis preta", category: "bottoms", shape: "saia", color: "Preto", season: "Todas", formality: "Executivo", occasions: ["trabalho"], note: "Clássica. Funciona com quase qualquer blusa estruturada.", forBazaar: true, price: "R$ 32", condition: "Bom estado" },
  { id: "b1", name: "Shorts alfaiataria bege", category: "bottoms", shape: "shorts", color: "Bege", season: "Verão", formality: "Casual", occasions: ["praia", "outro"], note: "Bom para dias quentes sem abrir mão do caimento.", forBazaar: false },

  /* ---- calçados ---- */
  { id: "sp1", name: "Tênis branco minimalista", category: "calcados", shape: "tenis", color: "Branco", season: "Todas", formality: "Casual", occasions: ["praia", "outro"], note: "O par mais usado do closet. Combina com quase tudo.", forBazaar: false },
  { id: "sp2", name: "Sandália salto bloco nude", category: "calcados", shape: "sandalia", color: "Nude", season: "Verão", formality: "Social", occasions: ["jantar", "festa"], note: "Salto confortável para a noite toda em pé.", forBazaar: false },
  { id: "sp3", name: "Mule preto", category: "calcados", shape: "salto", color: "Preto", season: "Todas", formality: "Social", occasions: ["trabalho", "jantar"], note: "Fácil de calçar, elegante o suficiente para o escritório.", forBazaar: false },
  { id: "sp4", name: "Bota cano curto preta", category: "calcados", shape: "bota", color: "Preto", season: "Inverno", formality: "Casual", occasions: ["show", "outro"], note: "Fecha bem look de saia com meia-calça.", forBazaar: false },

  /* ---- acessórios ---- */
  { id: "a1", name: "Bolsa tote couro preta", category: "acessorios", shape: "bolsa", color: "Preto", season: "Todas", formality: "Todas", occasions: ["trabalho", "outro"], note: "Cabe o essencial do dia. Estrutura o look sem esforço.", forBazaar: false },
  { id: "a2", name: "Óculos de sol redondo", category: "acessorios", shape: "oculos", color: "Preto", season: "Verão", formality: "Casual", occasions: ["praia", "outro"], note: "Detalhe rápido que muda a cara de qualquer look básico.", forBazaar: false },
  { id: "a3", name: "Colar fino dourado", category: "acessorios", shape: "colar", color: "Dourado", season: "Todas", formality: "Todas", occasions: ["jantar", "festa", "show"], note: "Discreto no dia a dia, brilha à noite.", forBazaar: true, price: "R$ 22", condition: "Excelente estado" },
  { id: "a4", name: "Chapéu de palha bege", category: "acessorios", shape: "chapeu", color: "Bege", season: "Verão", formality: "Casual", occasions: ["praia"], note: "Sombra garantida sem estragar o look da praia.", forBazaar: false },
];

/* -------------------------------------------------------------------------
   Looks e coleções de demonstração
   ------------------------------------------------------------------------- */

/** Coleções iniciais: as "pastas" da aba Looks, no espírito do Pinterest. */
export const SEED_BOARDS: Board[] = [
  { id: "board-praia", name: "Praia" },
  { id: "board-trabalho", name: "Trabalho" },
];

export const SEED_LOOKS: Outfit[] = [
  {
    id: "look-014",
    name: "Look #014",
    itemIds: ["t1", "s1", "sp1"],
    date: "12 ago",
    suggested: false,
    boardIds: ["board-praia"],
    tags: ["dia", "leve"],
    wornDates: [],
  },
  {
    id: "look-009",
    name: "Look #009",
    itemIds: ["t2", "c1", "sp3", "a1"],
    date: "6 ago",
    suggested: false,
    boardIds: ["board-trabalho"],
    tags: ["reunião"],
    wornDates: [],
  },
];

/** Favoritos iniciais, para a demo não abrir vazia. */
export const SEED_FAV_ITEMS = ["t1", "v2"];
export const SEED_FAV_LOOKS = ["look-014"];

/* -------------------------------------------------------------------------
   Migração de acervo antigo
   ------------------------------------------------------------------------- */

/**
 * O app começou com seis categorias. As peças que a usuária já tinha
 * cadastrado são reencaixadas nas quatro famílias na leitura do storage.
 */
const LEGACY_CATEGORY: Record<string, CategoryId> = {
  tops: "tops",
  vestidos: "tops",
  calcas: "bottoms",
  saias: "bottoms",
  sapatos: "calcados",
  acessorios: "acessorios",
};

export function migrateCategory(raw: string): CategoryId {
  return LEGACY_CATEGORY[raw] ?? "tops";
}
