import { OutfitCanvas, slotsFromLook } from "@/components/kcloset/ui/OutfitCanvas";
import type { ItemMap, Outfit } from "@/types";

type LookThumbProps = {
  look: Outfit;
  itemMap: ItemMap;
  size?: number;
};

/** O look em miniatura: o mesmo flat lay, reduzido. */
export function LookThumb({ look, itemMap, size = 58 }: LookThumbProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl"
      style={{ width: size, height: size, background: "var(--paper-deep)" }}
    >
      {/* 3/4 é a proporção do flat lay, então a largura sai da altura */}
      <div style={{ width: size * 0.75 }}>
        <OutfitCanvas slots={slotsFromLook(look.itemIds, itemMap)} />
      </div>
    </div>
  );
}
