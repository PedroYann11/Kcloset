import { useState } from "react";
import { Tag, Trash2 } from "lucide-react";
import { BackHeader } from "@/components/kcloset/ui/BackHeader";
import { Chip } from "@/components/kcloset/ui/Chip";
import { GarmentView } from "@/components/kcloset/ui/GarmentView";
import { HeartButton } from "@/components/kcloset/ui/HeartButton";
import { StylingNote } from "@/components/kcloset/ui/StylingNote";
import { categoryLong } from "@/data/seed-items";
import type { DecoratedItem } from "@/types";

type ItemDetailScreenProps = {
  item: DecoratedItem;
  isFav: boolean;
  onToggleFav: () => void;
  onBack: () => void;
  onUseInLook: () => void;
  inLook: boolean;
  onDelete: () => void;
  /** Em quantos looks salvos a peça aparece, para o aviso antes de apagar. */
  usedInLooks: number;
};

export function ItemDetailScreen({
  item,
  isFav,
  onToggleFav,
  onBack,
  onUseInLook,
  inLook,
  onDelete,
  usedInLooks,
}: ItemDetailScreenProps) {
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="flex flex-1 flex-col">
      <BackHeader title="Peça" onBack={onBack} />

      <div className="px-6">
        <div
          className="relative flex items-center justify-center overflow-hidden rounded-[28px] p-8"
          style={{ background: item.cardTone, aspectRatio: "3 / 4" }}
        >
          <GarmentView item={item} className="h-full w-full" photoRounded="rounded-2xl" />

          <div className="absolute right-3 top-3">
            <HeartButton active={isFav} onClick={onToggleFav} />
          </div>
          <div className="absolute bottom-3 left-3">
            <Chip>{item.formality}</Chip>
          </div>
        </div>

        <h1 className="mt-5 font-serif text-xl italic text-ink">{item.name}</h1>
        <p className="mt-1 font-sans text-[11px] uppercase tracking-wide text-graphite">
          {categoryLong(item.category)} · {item.color} · {item.season}
        </p>

        {item.note.trim() && (
          <div className="mt-4">
            <StylingNote text={item.note} />
          </div>
        )}

        {item.forBazaar && (
          <div
            className="mt-4 flex items-center gap-2 rounded-2xl border p-3.5"
            style={{ borderColor: "var(--mist)" }}
          >
            <Tag size={15} color="var(--blush-deep)" />
            <p className="font-sans text-[12px] text-ink-soft">
              No K Bazar por <strong className="font-semibold">{item.price}</strong> · {item.condition}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onUseInLook}
          className="mt-5 w-full rounded-full py-3.5 font-sans text-[13px]"
          style={{ background: "var(--ink)", color: "var(--paper)" }}
        >
          {inLook ? "Tirar do espelho" : "Colocar no espelho"}
        </button>

        <button
          type="button"
          onClick={() => (confirm ? onDelete() : setConfirm(true))}
          className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 font-sans text-[12.5px]"
          style={{
            border: `1px solid ${confirm ? "var(--blush-deep)" : "var(--mist)"}`,
            color: confirm ? "var(--blush-deep)" : "var(--graphite)",
          }}
        >
          <Trash2 size={14} />
          {confirm ? "Confirmar exclusão" : "Excluir peça"}
        </button>

        {confirm && usedInLooks > 0 && (
          <p className="fade-in mb-8 mt-2 text-center font-sans text-[11.5px] text-graphite">
            {`Sai de ${usedInLooks} ${usedInLooks === 1 ? "look" : "looks"} também.`}
          </p>
        )}
        {!(confirm && usedInLooks > 0) && <div className="mb-8" />}
      </div>
    </div>
  );
}
