import { migrateCategory } from "@/data/seed-items";
import type { Board, ClothingItem, GarmentShape, Outfit } from "@/types";

/**
 * Persistência local do Kcloset.
 *
 * Enquanto não existe backend, tudo que a usuária cria (peças cadastradas,
 * looks montados, coleções e favoritos) vive no localStorage do aparelho.
 * As peças de seed não são gravadas, só o delta.
 */

const KEY = "kcloset:v2";
/** Formato anterior, com seis categorias e sem coleções. */
const LEGACY_KEY = "kcloset:v1";

export type PersistedState = {
  userItems: ClothingItem[];
  looks: Outfit[];
  boards: Board[];
  favItems: string[];
  favLooks: string[];
  /** Peças de demonstração que a usuária apagou. Elas não voltam. */
  removedSeedIds: string[];
};

export type SaveResult = "ok" | "quota" | "unavailable";

export function loadState(): PersistedState | null {
  if (typeof window === "undefined") return null;

  const current = read(KEY);
  if (current) return normalize(current);

  const legacy = read(LEGACY_KEY);
  return legacy ? normalize(legacy, { legacy: true }) : null;
}

export function saveState(state: PersistedState): SaveResult {
  if (typeof window === "undefined") return "unavailable";

  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
    return "ok";
  } catch (error) {
    // As fotos em base64 são o que enche a cota, então vale avisar a usuária.
    return isQuotaError(error) ? "quota" : "unavailable";
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // sem storage disponível, não há o que limpar
  }
}

/* -------------------------------------------------------------------------
   Leitura e migração
   ------------------------------------------------------------------------- */

function read(key: string): Record<string, unknown> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    // JSON corrompido ou storage bloqueado: melhor começar limpo do que quebrar.
    return null;
  }
}

/** Forma do desenho a atribuir a uma peça antiga, pela categoria que ela tinha. */
const SHAPE_FROM_LEGACY: Record<string, GarmentShape> = {
  tops: "blusa",
  vestidos: "vestido",
  calcas: "calca",
  saias: "saia",
  sapatos: "tenis",
  acessorios: "bolsa",
};

function normalize(raw: Record<string, unknown>, options?: { legacy?: boolean }): PersistedState {
  const array = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

  const userItems = array<ClothingItem & { category: string }>(raw.userItems).map((item) => {
    if (!options?.legacy && item.shape) return item as ClothingItem;

    const legacyCategory = String(item.category ?? "tops");
    return {
      ...item,
      category: migrateCategory(legacyCategory),
      shape: item.shape ?? SHAPE_FROM_LEGACY[legacyCategory] ?? "blusa",
      fullBody: item.fullBody ?? legacyCategory === "vestidos",
    } as ClothingItem;
  });

  const looks = array<Outfit>(raw.looks).map((look) => ({
    ...look,
    boardIds: Array.isArray(look.boardIds) ? look.boardIds : [],
    tags: Array.isArray(look.tags) ? look.tags : [],
    wornDates: Array.isArray(look.wornDates) ? look.wornDates : [],
  }));

  return {
    userItems,
    looks,
    boards: array<Board>(raw.boards),
    favItems: array<string>(raw.favItems),
    favLooks: array<string>(raw.favLooks),
    removedSeedIds: array<string>(raw.removedSeedIds),
  };
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22
  );
}
