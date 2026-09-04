import * as cloud from "@/lib/cloud";
import { getPhoto } from "@/lib/photo-store";
import { loadState } from "@/lib/storage";

/**
 * Sobe pra conta o closet que já existia neste navegador.
 *
 * É a parte mais delicada da fase, porque do outro lado tem closet real: o
 * app rodou meses guardando tudo só no aparelho. Três regras que vêm disso:
 *
 * 1. Toda escrita é upsert, então repetir a migração não duplica nada. Se
 *    falhar no meio (rede caiu no upload da décima foto), a próxima abertura
 *    recomeça e passa por cima do que já subiu.
 * 2. A marca de "já migrei" só é gravada no fim, com tudo no lugar.
 * 3. O dado local nunca é apagado automaticamente. Fica como rede de
 *    segurança, mesmo depois de tudo dar certo.
 */

/**
 * Quem adotou o closet deste aparelho. É uma chave só, não uma por usuária,
 * de propósito: o closet pré-conta tem um dono, a primeira pessoa que entrar.
 * Sem isso, a segunda pessoa a usar este navegador receberia o closet da
 * primeira dentro da conta dela.
 */
const CLAIM_KEY = "kloset:local-claim";

export type MigrationProgress = { done: number; total: number };

export function localClaim(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CLAIM_KEY);
  } catch {
    return null;
  }
}

/** Solta a posse do closet local. Chamado só quando a usuária apaga a
 *  conta, junto com o próprio closet local. */
export function releaseClaim(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CLAIM_KEY);
  } catch {
    // sem storage não há marca pra soltar
  }
}

function claim(userId: string): void {
  try {
    window.localStorage.setItem(CLAIM_KEY, userId);
  } catch {
    // sem storage a migração tentaria de novo na próxima abertura; o upsert
    // faz ela ser inofensiva
  }
}

/**
 * Devolve quantas peças subiram, ou `null` quando não havia nada local pra
 * migrar (conta nova em navegador novo, o caso da amiga).
 */
export async function migrateLocalCloset(
  userId: string,
  onProgress: (progress: MigrationProgress) => void,
): Promise<number | null> {
  // Já migrado (por esta conta ou por outra): não há nada a fazer.
  if (localClaim() !== null) return null;

  const local = await loadState();
  if (!local) return null;

  const hasSomething =
    local.userItems.length > 0 ||
    local.looks.length > 0 ||
    local.boards.length > 0 ||
    local.favItems.length > 0 ||
    local.favLooks.length > 0;
  if (!hasSomething) {
    // Navegador sem closet pré-conta: marca assim mesmo, pra não ficar
    // relendo o storage a cada abertura.
    claim(userId);
    return null;
  }

  const total = local.userItems.length;
  onProgress({ done: 0, total });

  for (const [index, item] of local.userItems.entries()) {
    const blob = await getPhoto(item.id).catch(() => null);
    await cloud.insertItem(userId, item, blob ?? undefined);
    onProgress({ done: index + 1, total });
  }

  for (const board of local.boards) await cloud.saveBoard(userId, board);
  for (const look of local.looks) await cloud.saveLook(userId, look);
  for (const id of local.favItems) await cloud.setFavorite(userId, "item", id, true);
  for (const id of local.favLooks) await cloud.setFavorite(userId, "look", id, true);

  await cloud.saveProfile(userId, { removedSeedIds: local.removedSeedIds });

  // As pré-visualizações que `loadState` criou não servem mais: o app vai
  // reler tudo da nuvem logo em seguida.
  local.userItems.forEach((item) => {
    if (item.photo?.startsWith("blob:")) URL.revokeObjectURL(item.photo);
  });

  claim(userId);
  return total;
}
