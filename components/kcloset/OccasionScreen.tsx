import { BackHeader } from "@/components/kcloset/ui/BackHeader";
import { OCCASIONS } from "@/data/seed-items";
import type { Occasion } from "@/types";

type OccasionScreenProps = {
  onBack: () => void;
  onChoose: (occasion: Occasion) => void;
};

export function OccasionScreen({ onBack, onChoose }: OccasionScreenProps) {
  return (
    <div className="flex flex-1 flex-col">
      <BackHeader title="Para onde você vai?" onBack={onBack} />

      <div className="mt-3 grid grid-cols-2 gap-3 px-6 pb-6">
        {OCCASIONS.map((occasion) => (
          <button
            key={occasion.id}
            type="button"
            onClick={() => onChoose(occasion)}
            className="flex flex-col items-center gap-2.5 rounded-2xl border p-5"
            style={{ borderColor: "var(--mist)" }}
          >
            <occasion.Icon size={22} strokeWidth={1.5} color="var(--ink)" />
            <span className="font-sans text-[13px] text-ink">{occasion.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
