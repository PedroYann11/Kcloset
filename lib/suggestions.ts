import { accessoryGroup } from "@/components/icons/garments";
import type { CategoryId, DecoratedItem, OccasionId, Outfit, SlotKey } from "@/types";

/** Em que espaço do look a família se encaixa: um para um, com quatro famílias. */
const SLOT_OF: Record<CategoryId, SlotKey> = {
  tops: "top",
  bottoms: "bottom",
  calcados: "shoes",
  acessorios: "acc",
};

export function slotForCategory(category: CategoryId): SlotKey {
  return SLOT_OF[category] ?? "acc";
}

/**
 * Monta uma sugestão para a ocasião.
 *
 * Prioriza peças marcadas para aquela ocasião; se não houver nenhuma na
 * família, cai no acervo inteiro para nunca devolver um look vazio.
 * `seedIndex` desloca a escolha dentro de cada pool, e é o que faz três
 * chamadas seguidas produzirem sugestões diferentes.
 */
export function buildSuggestion(
  items: DecoratedItem[],
  occasionId: OccasionId,
  seedIndex: number,
): Outfit {
  const inFamily = (category: CategoryId) => items.filter((item) => item.category === category);

  const pick = (category: CategoryId, index: number) => {
    const all = inFamily(category);
    const preferred = all.filter((item) => item.occasions.includes(occasionId));
    const pool = preferred.length ? preferred : all;
    return pool.length ? pool[index % pool.length] : null;
  };

  const top = pick("tops", seedIndex);
  const bottom = top?.fullBody ? null : pick("bottoms", seedIndex + 1);
  const shoes = pick("calcados", seedIndex);

  // Dois acessórios, de prateleiras diferentes: bolsa com óculos, por exemplo.
  const firstAcc = pick("acessorios", seedIndex + 1);
  const otherGroup = items.filter(
    (item) =>
      item.category === "acessorios" &&
      item.id !== firstAcc?.id &&
      (!firstAcc || accessoryGroup(item.drawing) !== accessoryGroup(firstAcc.drawing)),
  );
  const preferredOther = otherGroup.filter((item) => item.occasions.includes(occasionId));
  const secondPool = preferredOther.length ? preferredOther : otherGroup;
  const secondAcc = secondPool.length ? secondPool[seedIndex % secondPool.length] : null;

  const itemIds = [top, bottom, shoes, firstAcc, secondAcc]
    .filter((item): item is DecoratedItem => Boolean(item))
    .map((item) => item.id);

  return {
    id: `sug-${occasionId}-${seedIndex}`,
    name: `Sugestão ${seedIndex + 1}`,
    itemIds,
    date: null,
    suggested: true,
    boardIds: [],
    tags: [],
    wornDates: [],
  };
}

/** Gera `count` sugestões e descarta as que ficaram idênticas. */
export function buildSuggestions(
  items: DecoratedItem[],
  occasionId: OccasionId,
  count = 3,
): Outfit[] {
  const seen = new Set<string>();

  return Array.from({ length: count }, (_, i) => buildSuggestion(items, occasionId, i)).filter(
    (suggestion) => {
      const key = suggestion.itemIds.join(",");
      if (seen.has(key) || suggestion.itemIds.length === 0) return false;
      seen.add(key);
      return true;
    },
  );
}
