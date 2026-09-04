import { SEED_BOARDS, SEED_FAV_ITEMS, SEED_FAV_LOOKS, SEED_LOOKS } from "@/data/seed-items";
import {
  deletePhoto as dropCachedPhoto,
  getPhoto as getCachedPhoto,
  putPhoto as cachePhoto,
} from "@/lib/photo-store";
import { photoPath, supabase } from "@/lib/supabase";
import type { Board, CategoryId, ClothingItem, GarmentShape, OccasionId, Outfit } from "@/types";

/**
 * O closet de cada usuária no Supabase.
 *
 * Uma função por operação, não um "salvar tudo": o `saveState` de antes
 * reescrevia o estado inteiro a cada toque, o que funciona num `localStorage`
 * e não funciona num banco. Cada mutação de `KclosetApp` chama a função
 * correspondente daqui.
 *
 * O id continua sendo texto gerado no cliente, o mesmo de sempre, e a chave
 * primária no banco é (user_id, id). Foto vive no Storage, em
 * `photos/{user_id}/{item_id}.png`; o IndexedDB de `lib/photo-store.ts`
 * continua igual, só que agora como cache dela, não como casa.
 *
 * Nada aqui confia na tela pra separar o dado de uma usuária do da outra:
 * quem faz isso é a Row Level Security, no banco.
 */

export type Profile = {
  displayName: string | null;
  closetName: string;
  removedSeedIds: string[];
};

export type CloudState = {
  profile: Profile;
  userItems: ClothingItem[];
  looks: Outfit[];
  boards: Board[];
  favItems: string[];
  favLooks: string[];
  /** Conta recém-criada, sem nem perfil gravado ainda. */
  empty: boolean;
};

export const DEFAULT_CLOSET_NAME = "Meu closet";

/* -------------------------------------------------------------------------
   Linhas do banco e conversão
   ------------------------------------------------------------------------- */

type ItemRow = {
  id: string;
  name: string;
  category: string;
  shape: string | null;
  full_body: boolean;
  color: string;
  season: string;
  formality: string;
  occasions: string[];
  note: string;
  photo_path: string | null;
  photo_aspect: number | null;
  for_bazaar: boolean;
  price: string | null;
  condition: string | null;
  created_at: string;
};

type LookRow = {
  id: string;
  name: string;
  item_ids: string[];
  date: string | null;
  suggested: boolean;
  board_ids: string[];
  tags: string[];
  worn_dates: string[];
};

type BoardRow = { id: string; name: string; created_at: string };

function itemToRow(userId: string, item: ClothingItem, hasPhoto: boolean) {
  return {
    user_id: userId,
    id: item.id,
    name: item.name,
    category: item.category,
    shape: item.shape ?? null,
    full_body: item.fullBody ?? false,
    color: item.color ?? "",
    season: item.season ?? "",
    formality: item.formality ?? "",
    occasions: item.occasions ?? [],
    note: item.note ?? "",
    photo_path: hasPhoto ? photoPath(userId, item.id) : null,
    photo_aspect: item.photoAspect ?? null,
    for_bazaar: item.forBazaar ?? false,
    price: item.price ?? null,
    condition: item.condition ?? null,
  };
}

/** Sem o campo `photo`: quem resolve a foto é `resolvePhoto`, logo depois. */
function rowToItem(row: ItemRow): ClothingItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category as CategoryId,
    shape: (row.shape ?? undefined) as GarmentShape | undefined,
    fullBody: row.full_body,
    color: row.color,
    season: row.season,
    formality: row.formality,
    occasions: (row.occasions ?? []) as OccasionId[],
    note: row.note,
    forBazaar: row.for_bazaar,
    price: row.price ?? undefined,
    condition: row.condition ?? undefined,
    photoAspect: row.photo_aspect ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function lookToRow(userId: string, look: Outfit) {
  return {
    user_id: userId,
    id: look.id,
    name: look.name,
    item_ids: look.itemIds,
    date: look.date,
    suggested: look.suggested,
    board_ids: look.boardIds ?? [],
    tags: look.tags ?? [],
    worn_dates: look.wornDates ?? [],
  };
}

function rowToLook(row: LookRow): Outfit {
  return {
    id: row.id,
    name: row.name,
    itemIds: row.item_ids ?? [],
    date: row.date,
    suggested: row.suggested,
    boardIds: row.board_ids ?? [],
    tags: row.tags ?? [],
    wornDates: row.worn_dates ?? [],
  };
}

/* -------------------------------------------------------------------------
   Leitura
   ------------------------------------------------------------------------- */

/** Lê tudo de uma vez e resolve a foto de cada peça (cache primeiro). */
export async function loadAll(userId: string): Promise<CloudState> {
  const [profileResult, itemsResult, looksResult, boardsResult, favoritesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, closet_name, removed_seed_ids")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("items").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("looks").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("boards").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("favorites").select("kind, target_id").eq("user_id", userId),
  ]);

  const failure =
    profileResult.error ??
    itemsResult.error ??
    looksResult.error ??
    boardsResult.error ??
    favoritesResult.error;
  if (failure) throw new Error(failure.message);

  const userItems = await Promise.all(((itemsResult.data ?? []) as ItemRow[]).map(resolvePhoto));
  const favorites = (favoritesResult.data ?? []) as { kind: string; target_id: string }[];

  const profileRow = profileResult.data as
    | { display_name: string | null; closet_name: string; removed_seed_ids: string[] }
    | null;

  return {
    profile: {
      displayName: profileRow?.display_name ?? null,
      closetName: profileRow?.closet_name ?? DEFAULT_CLOSET_NAME,
      removedSeedIds: profileRow?.removed_seed_ids ?? [],
    },
    userItems,
    looks: ((looksResult.data ?? []) as LookRow[]).map(rowToLook),
    boards: ((boardsResult.data ?? []) as BoardRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: new Date(row.created_at).getTime(),
    })),
    favItems: favorites.filter((favorite) => favorite.kind === "item").map((favorite) => favorite.target_id),
    favLooks: favorites.filter((favorite) => favorite.kind === "look").map((favorite) => favorite.target_id),
    empty: profileRow === null,
  };
}

/**
 * Object URL da foto da peça. Tenta o cache local antes da rede, porque um
 * closet de tamanho real não pode baixar tudo de novo a cada abertura.
 */
async function resolvePhoto(row: ItemRow): Promise<ClothingItem> {
  const item = rowToItem(row);
  if (!row.photo_path) return item;

  const cached = await getCachedPhoto(row.id).catch(() => null);
  if (cached) return { ...item, photo: URL.createObjectURL(cached) };

  const { data, error } = await supabase.storage.from("photos").download(row.photo_path);
  if (error || !data) return item;

  await cachePhoto(row.id, data).catch(() => {
    // sem IndexedDB a foto só deixa de ficar em cache, a peça continua inteira
  });
  return { ...item, photo: URL.createObjectURL(data) };
}

/* -------------------------------------------------------------------------
   Escrita
   ------------------------------------------------------------------------- */

export async function uploadPhoto(userId: string, itemId: string, blob: Blob): Promise<void> {
  const { error } = await supabase.storage
    .from("photos")
    .upload(photoPath(userId, itemId), blob, { contentType: "image/png", upsert: true });
  if (error) throw new Error(error.message);
}

export async function insertItem(userId: string, item: ClothingItem, photoBlob?: Blob): Promise<void> {
  if (photoBlob) await uploadPhoto(userId, item.id, photoBlob);
  const { error } = await supabase.from("items").upsert(itemToRow(userId, item, Boolean(photoBlob)));
  if (error) throw new Error(error.message);
}

export async function deleteItem(userId: string, itemId: string): Promise<void> {
  const { error } = await supabase.from("items").delete().eq("user_id", userId).eq("id", itemId);
  if (error) throw new Error(error.message);

  await supabase.storage.from("photos").remove([photoPath(userId, itemId)]);
  await dropCachedPhoto(itemId).catch(() => {
    // cache é descartável por definição
  });
}

export async function saveLook(userId: string, look: Outfit): Promise<void> {
  const { error } = await supabase.from("looks").upsert(lookToRow(userId, look));
  if (error) throw new Error(error.message);
}

export async function deleteLook(userId: string, lookId: string): Promise<void> {
  const { error } = await supabase.from("looks").delete().eq("user_id", userId).eq("id", lookId);
  if (error) throw new Error(error.message);
}

export async function saveBoard(userId: string, board: Board): Promise<void> {
  const { error } = await supabase
    .from("boards")
    .upsert({ user_id: userId, id: board.id, name: board.name });
  if (error) throw new Error(error.message);
}

export async function deleteBoard(userId: string, boardId: string): Promise<void> {
  const { error } = await supabase.from("boards").delete().eq("user_id", userId).eq("id", boardId);
  if (error) throw new Error(error.message);
}

export async function setFavorite(
  userId: string,
  kind: "item" | "look",
  targetId: string,
  on: boolean,
): Promise<void> {
  // `ignoreDuplicates` vira ON CONFLICT DO NOTHING: favorito não tem campo
  // nenhum pra atualizar, e assim a tabela não precisa de política de UPDATE.
  const query = on
    ? supabase
        .from("favorites")
        .upsert({ user_id: userId, kind, target_id: targetId }, { ignoreDuplicates: true })
    : supabase.from("favorites").delete().eq("user_id", userId).eq("kind", kind).eq("target_id", targetId);

  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function saveProfile(userId: string, patch: Partial<Profile>): Promise<void> {
  const row: Record<string, unknown> = { id: userId };
  if (patch.displayName !== undefined) row.display_name = patch.displayName;
  if (patch.closetName !== undefined) row.closet_name = patch.closetName;
  if (patch.removedSeedIds !== undefined) row.removed_seed_ids = patch.removedSeedIds;

  const { error } = await supabase.from("profiles").upsert(row);
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------
   Primeira vez na conta
   ------------------------------------------------------------------------- */

/**
 * Conta nova sem nada pra migrar: as coleções, os looks e os favoritos de
 * demonstração viram linhas de verdade, uma vez só. É o mesmo que já
 * acontecia na primeira gravação em `localStorage`, e é o que faz a aba Looks
 * não abrir vazia pra quem acabou de entrar. As peças de demonstração
 * continuam sendo constante do cliente.
 */
export async function seedNewAccount(userId: string, displayName: string | null): Promise<void> {
  await saveProfile(userId, { displayName, closetName: DEFAULT_CLOSET_NAME, removedSeedIds: [] });

  const results = await Promise.all([
    supabase.from("boards").upsert(SEED_BOARDS.map((board) => ({ user_id: userId, id: board.id, name: board.name }))),
    supabase.from("looks").upsert(SEED_LOOKS.map((look) => lookToRow(userId, look))),
    supabase.from("favorites").upsert(
      [
        ...SEED_FAV_ITEMS.map((id) => ({ user_id: userId, kind: "item", target_id: id })),
        ...SEED_FAV_LOOKS.map((id) => ({ user_id: userId, kind: "look", target_id: id })),
      ],
      { ignoreDuplicates: true },
    ),
  ]);

  const failure = results.find((result) => result.error);
  if (failure?.error) throw new Error(failure.error.message);
}

/* -------------------------------------------------------------------------
   Apagar conta
   ------------------------------------------------------------------------- */

/**
 * Apaga as fotos do Storage e depois a conta em si. O `on delete cascade` do
 * schema leva peças, looks, coleções e favoritos junto. Apagar o usuário
 * exige privilégio que o navegador não tem, então essa parte é a Edge
 * Function `delete-account`.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const { data: files } = await supabase.storage.from("photos").list(userId);
  if (files && files.length > 0) {
    await supabase.storage.from("photos").remove(files.map((file) => `${userId}/${file.name}`));
  }

  const { error } = await supabase.functions.invoke("delete-account");
  if (error) throw new Error(error.message);
}
