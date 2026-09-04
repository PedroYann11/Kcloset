import { migrateCategory } from "@/data/seed-items";
import { getPhoto, putPhoto } from "@/lib/photo-store";
import type { Board, ClothingItem, GarmentShape, Outfit } from "@/types";

/**
 * O que o Kloset guarda no próprio aparelho.
 *
 * Desde que existe conta, a casa do closet é o Supabase (lib/cloud.ts). Este
 * módulo ficou com dois papéis, os dois locais:
 *
 * 1. `loadState` lê o closet que existia neste navegador ANTES das contas
 *    (`kloset:v3` e as chaves legadas). É a fonte da migração de primeira
 *    entrada, e é por isso que a cadeia de formatos antigos continua aqui
 *    inteira: tem closet real salvo nesse formato hoje.
 * 2. `readCache`/`writeCache` guardam uma cópia do que veio da nuvem, por
 *    usuária, pro app abrir instantâneo e ainda mostrar o último closet
 *    conhecido quando a rede falha.
 *
 * O que vai para o JSON nunca carrega o campo `photo`: a foto mora no
 * IndexedDB (lib/photo-store.ts), referenciada pelo `id` da peça.
 */

const KEY = "kloset:v3";
/** Cópia local do que veio da nuvem, uma por usuária. */
const CACHE_PREFIX = "kloset:cache:";
/** Formato anterior: foto ainda embutida no JSON, mas já com 4 famílias. */
const LEGACY_KEY_V2 = "kcloset:v2";
/** Formato mais antigo: seis categorias, sem `shape`. */
const LEGACY_KEY_V1 = "kcloset:v1";

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

/**
 * Lê o estado salvo. Async porque, além do JSON, cada peça com foto precisa
 * ser resolvida no IndexedDB (ou migrada para lá, se ainda vier embutida no
 * próprio JSON, formato de antes desta versão).
 */
export async function loadState(): Promise<PersistedState | null> {
  if (typeof window === "undefined") return null;

  const found = readRaw();
  if (!found) return null;

  const state = normalize(found.data, { legacy: found.legacy });
  state.userItems = await Promise.all(state.userItems.map(resolveItemPhoto));
  return state;
}

/**
 * Cópia local do closet que veio da nuvem. A chave inclui o id da usuária,
 * senão a próxima pessoa a entrar neste mesmo navegador abriria o app vendo
 * o closet da anterior enquanto a nuvem responde.
 *
 * A foto de cada peça é excluída do que vai para o JSON: ela já está no
 * IndexedDB, e guardá-la de novo aqui é o que estourava a cota antes.
 */
export function writeCache(userId: string, state: PersistedState): SaveResult {
  if (typeof window === "undefined") return "unavailable";

  try {
    const forJson: PersistedState = {
      ...state,
      userItems: state.userItems.map(({ photo: _photo, ...item }) => item),
    };
    window.localStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(forJson));
    return "ok";
  } catch (error) {
    return isQuotaError(error) ? "quota" : "unavailable";
  }
}

/** Último closet conhecido desta usuária, com as fotos resolvidas do cache. */
export async function readCache(userId: string): Promise<PersistedState | null> {
  if (typeof window === "undefined") return null;

  const raw = read(CACHE_PREFIX + userId);
  if (!raw) return null;

  const state = normalize(raw);
  state.userItems = await Promise.all(state.userItems.map(resolveItemPhoto));
  return state;
}

export function clearCache(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CACHE_PREFIX + userId);
  } catch {
    // sem storage disponível, não há o que limpar
  }
}

/** Apaga o closet pré-conta deste navegador. Só é chamado quando a usuária
 * apaga a conta inteira, nunca depois de uma migração bem-sucedida: o dado
 * local fica como rede de segurança. */
export function clearState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(LEGACY_KEY_V2);
    window.localStorage.removeItem(LEGACY_KEY_V1);
  } catch {
    // sem storage disponível, não há o que limpar
  }
}

/* -------------------------------------------------------------------------
   Foto: migração do formato antigo (embutida) e resolução via IndexedDB
   ------------------------------------------------------------------------- */

/**
 * Garante que a foto da peça esteja no IndexedDB e devolve a peça com
 * `photo` já resolvido para um object URL pronto para uso, ou sem `photo`
 * nenhum, quando a peça nunca teve foto.
 */
async function resolveItemPhoto(item: ClothingItem): Promise<ClothingItem> {
  // Formato antigo: a foto ainda está embutida no próprio JSON. É o que já
  // está salvo hoje no aparelho de quem usa o app; precisa migrar sem
  // perder a imagem.
  if (item.photo?.startsWith("data:")) {
    try {
      const blob = await dataUrlToBlob(item.photo);
      await putPhoto(item.id, blob);
      const aspect = item.photoAspect ?? (await measureAspect(blob).catch(() => undefined));
      return { ...item, photo: URL.createObjectURL(blob), photoAspect: aspect };
    } catch {
      // Foto corrompida ou navegador sem IndexedDB: perde só a imagem, não a peça.
      return { ...item, photo: undefined };
    }
  }

  const blob = await getPhoto(item.id).catch(() => null);
  if (!blob) return { ...item, photo: undefined };
  return { ...item, photo: URL.createObjectURL(blob) };
}

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((response) => response.blob());
}

function measureAspect(blob: Blob): Promise<number> {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image.naturalWidth / image.naturalHeight);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível medir a foto."));
    };
    image.src = url;
  });
}

/* -------------------------------------------------------------------------
   Leitura e migração de categoria
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

/** Primeira chave, da mais nova para a mais antiga, que tiver algo salvo. */
function readRaw(): { data: Record<string, unknown>; legacy: boolean } | null {
  const v3 = read(KEY);
  if (v3) return { data: v3, legacy: false };

  const v2 = read(LEGACY_KEY_V2);
  if (v2) return { data: v2, legacy: false };

  const v1 = read(LEGACY_KEY_V1);
  return v1 ? { data: v1, legacy: true } : null;
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
