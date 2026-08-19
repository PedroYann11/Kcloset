import { GarmentView, garmentAspect } from "@/components/kcloset/ui/GarmentView";
import type { BuilderSelection, DecoratedItem, ItemMap, SlotKey } from "@/types";

/** As peças do look já separadas por espaço. Acessórios são vários. */
export type OutfitSlots = {
  top?: DecoratedItem | null;
  bottom?: DecoratedItem | null;
  shoes?: DecoratedItem | null;
  accs?: DecoratedItem[];
};

type OutfitCanvasProps = {
  slots: OutfitSlots;
  /** Chamado ao tocar numa peça já escolhida (para tirar do look). */
  onRemove?: (item: DecoratedItem) => void;
  className?: string;
};

/** Onde cada acessório se acomoda, na ordem em que foram escolhidos. */
const ACC_SPOTS = [
  { left: 68, top: 60, width: 26 },
  { left: 70, top: 82, width: 22 },
  { left: 4, top: 52, width: 22 },
  { left: 6, top: 30, width: 18 },
];

/**
 * O look montado, como um flat lay.
 *
 * Cada espaço tem um lugar fixo na tela (peça de cima em cima, de baixo
 * embaixo, calçado no pé, acessórios ao lado) e a altura de cada peça vem da
 * proporção real do desenho. É o que dá a leitura de "roupa montada" em vez
 * de "quatro miniaturas em grade".
 */
export function OutfitCanvas({ slots, onRemove, className = "" }: OutfitCanvasProps) {
  const { top = null, bottom = null, shoes = null, accs = [] } = slots;
  const fullBody = Boolean(top?.fullBody);

  const placed: { item: DecoratedItem; left: number; top: number; width: number }[] = [];

  if (top) {
    placed.push({ item: top, left: fullBody ? 26 : 27, top: 4, width: fullBody ? 48 : 46 });
  }
  if (bottom && !fullBody) {
    placed.push({ item: bottom, left: 30, top: 40, width: 40 });
  }
  if (shoes) {
    placed.push({ item: shoes, left: 4, top: fullBody ? 78 : 80, width: 32 });
  }
  accs.slice(0, ACC_SPOTS.length).forEach((item, i) => {
    const spot = ACC_SPOTS[i];
    placed.push({ item, left: spot.left, top: spot.top, width: spot.width });
  });

  return (
    <div className={`relative w-full ${className}`} style={{ aspectRatio: "3 / 4" }}>
      {placed.map(({ item, left, top: y, width }) => {
        const aspect = garmentAspect(item);
        const Wrapper = onRemove ? "button" : "div";
        return (
          <Wrapper
            key={item.id}
            {...(onRemove
              ? {
                  type: "button" as const,
                  onClick: () => onRemove(item),
                  "aria-label": `Tirar ${item.name} do look`,
                }
              : {})}
            className="fade-in absolute"
            style={{ left: `${left}%`, top: `${y}%`, width: `${width}%` }}
          >
            <span className="block w-full" style={{ aspectRatio: `${aspect}` }}>
              <GarmentView item={item} className="h-full w-full" photoRounded="rounded-md" />
            </span>
          </Wrapper>
        );
      })}
    </div>
  );
}

/** Atalho para montar os espaços a partir da seleção do closet. */
export function slotsFromSelection(selection: BuilderSelection, itemMap: ItemMap): OutfitSlots {
  return {
    top: selection.top ? itemMap[selection.top] : null,
    bottom: selection.bottom ? itemMap[selection.bottom] : null,
    shoes: selection.shoes ? itemMap[selection.shoes] : null,
    accs: selection.accs.map((id) => itemMap[id]).filter(Boolean),
  };
}

/** Atalho para montar os espaços a partir de um look salvo. */
export function slotsFromLook(itemIds: string[], itemMap: ItemMap): OutfitSlots {
  const slots: OutfitSlots = { accs: [] };
  const slotOf: Record<string, SlotKey> = {
    tops: "top",
    bottoms: "bottom",
    calcados: "shoes",
    acessorios: "acc",
  };

  itemIds.forEach((id) => {
    const item = itemMap[id];
    if (!item) return;

    const slot = slotOf[item.category] ?? "acc";
    if (slot === "acc") slots.accs!.push(item);
    else if (!slots[slot]) slots[slot] = item;
  });

  return slots;
}
