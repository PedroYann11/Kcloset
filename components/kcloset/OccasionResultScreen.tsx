import { ChevronRight } from "lucide-react";
import { BackHeader } from "@/components/kcloset/ui/BackHeader";
import { LookThumb } from "@/components/kcloset/ui/LookThumb";
import type { ItemMap, Occasion, Outfit } from "@/types";

type OccasionResultScreenProps = {
  occasion: Occasion;
  suggestions: Outfit[];
  itemMap: ItemMap;
  onBack: () => void;
  onOpen: (id: string) => void;
};

export function OccasionResultScreen({
  occasion,
  suggestions,
  itemMap,
  onBack,
  onOpen,
}: OccasionResultScreenProps) {
  return (
    <div className="flex flex-1 flex-col">
      <BackHeader title="Sugestões" onBack={onBack} />

      <div className="-mt-1 px-6">
        <p className="mb-5 font-serif text-xl italic text-ink">Para {occasion.phrase}...</p>

        <div className="flex flex-col gap-3 pb-6">
          {suggestions.map((suggestion) => {
            const items = suggestion.itemIds.map((id) => itemMap[id]).filter(Boolean);
            return (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => onOpen(suggestion.id)}
                className="flex items-center gap-4 rounded-2xl border p-3 text-left"
                style={{ borderColor: "var(--mist)" }}
              >
                <LookThumb look={suggestion} itemMap={itemMap} />
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-base text-ink">{suggestion.name}</p>
                  <p className="mt-0.5 truncate font-sans text-[11px] text-graphite">
                    {items.map((item) => item.name.split(" ")[0]).join(" · ")}
                  </p>
                </div>
                <ChevronRight size={16} color="var(--graphite)" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
