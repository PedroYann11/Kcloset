import { GarmentView } from "@/components/kcloset/ui/GarmentView";
import type { DecoratedItem } from "@/types";

type ItemThumbProps = {
  item: DecoratedItem;
  size?: number;
  rounded?: string;
  className?: string;
};

/** Peça em miniatura, sobre o tom pastel do seu tecido. */
export function ItemThumb({ item, size = 56, rounded = "rounded-xl", className = "" }: ItemThumbProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden ${rounded} ${className}`}
      style={{ width: size, height: size, background: item.cardTone, padding: item.photo ? 0 : size * 0.14 }}
    >
      <GarmentView item={item} className="h-full w-full" photoRounded="rounded-none" shadow={false} />
    </div>
  );
}
