import { useState } from "react";
import { Trash2 } from "lucide-react";
import { BackHeader } from "@/components/kcloset/ui/BackHeader";
import { HeartButton } from "@/components/kcloset/ui/HeartButton";
import { OutfitCanvas, slotsFromLook } from "@/components/kcloset/ui/OutfitCanvas";
import type { Board, ItemMap, Outfit } from "@/types";

type BoardScreenProps = {
  board: Board;
  looks: Outfit[];
  itemMap: ItemMap;
  favLooks: Set<string>;
  onBack: () => void;
  onOpenLook: (id: string) => void;
  onToggleFav: (id: string) => void;
  onDeleteBoard: () => void;
};

/** Uma coleção aberta: os looks salvos nela, em grade. */
export function BoardScreen({
  board,
  looks,
  itemMap,
  favLooks,
  onBack,
  onOpenLook,
  onToggleFav,
  onDeleteBoard,
}: BoardScreenProps) {
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="flex flex-1 flex-col">
      <BackHeader title={board.name} onBack={onBack} />

      <div className="-mt-1 flex items-center justify-between px-6">
        <p className="font-sans text-[11.5px] text-graphite">
          {looks.length} {looks.length === 1 ? "look" : "looks"} nesta coleção
        </p>
        <button
          type="button"
          onClick={() => (confirm ? onDeleteBoard() : setConfirm(true))}
          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3 font-sans text-[11.5px]"
          style={{
            border: `1px solid ${confirm ? "var(--blush-deep)" : "var(--mist)"}`,
            color: confirm ? "var(--blush-deep)" : "var(--graphite)",
          }}
        >
          <Trash2 size={13} />
          {confirm ? "Confirmar" : "Apagar coleção"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 px-6 pb-8">
        {looks.length === 0 && (
          <p className="col-span-2 font-sans text-[13px] italic text-graphite">
            Coleção vazia.
          </p>
        )}

        {looks.map((look) => (
          <div key={look.id} className="relative">
            <button
              type="button"
              onClick={() => onOpenLook(look.id)}
              aria-label={`Ver ${look.name}`}
              className="w-full text-left"
            >
              <span
                className="flex items-center justify-center overflow-hidden rounded-2xl p-2"
                style={{ background: "var(--paper-deep)" }}
              >
                <span className="block w-[78%]">
                  <OutfitCanvas slots={slotsFromLook(look.itemIds, itemMap)} />
                </span>
              </span>
              <span className="mt-1.5 block truncate font-serif text-[14px] text-ink">
                {look.name}
              </span>
            </button>

            <span className="absolute right-2 top-2">
              <HeartButton
                active={favLooks.has(look.id)}
                onClick={() => onToggleFav(look.id)}
                size={15}
                ariaLabel={`Favoritar ${look.name}`}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
