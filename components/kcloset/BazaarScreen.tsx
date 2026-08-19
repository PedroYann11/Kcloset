import { Chip } from "@/components/kcloset/ui/Chip";
import { ItemThumb } from "@/components/kcloset/ui/ItemThumb";
import type { DecoratedItem } from "@/types";

type BazaarScreenProps = {
  items: DecoratedItem[];
  expanded: string | null;
  onExpandedChange: (id: string | null) => void;
  onInterest: () => void;
  onAnnounce: () => void;
};

export function BazaarScreen({
  items,
  expanded,
  onExpandedChange,
  onInterest,
  onAnnounce,
}: BazaarScreenProps) {
  const bazaarItems = items.filter((item) => item.forBazaar);

  return (
    <div className="flex-1 px-6 pt-14">
      <h1 className="font-serif text-2xl text-ink">K Bazar</h1>
      <p className="mb-5 mt-1.5 font-sans text-[12px] italic text-graphite">
        peças à procura de uma nova dona
      </p>

      <div className="flex flex-col gap-3">
        {bazaarItems.length === 0 && (
          <p className="font-sans text-[13px] italic text-graphite">
            Nenhuma peça no bazar ainda.
          </p>
        )}

        {bazaarItems.map((item) => {
          const isOpen = expanded === item.id;
          return (
            <div key={item.id} className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--mist)" }}>
              <button
                type="button"
                onClick={() => onExpandedChange(isOpen ? null : item.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 p-2.5 text-left"
              >
                <ItemThumb item={item} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-[15px] text-ink">{item.name}</p>
                  <p className="mt-0.5 font-sans text-[11px] text-graphite">{item.condition}</p>
                </div>
                <span className="shrink-0 font-serif text-[13px] text-ink">{item.price}</span>
              </button>

              {isOpen && (
                <div className="fade-in px-4 pb-4">
                  {item.note.trim() && (
                    <p className="mb-3 font-sans text-[12px] italic leading-relaxed text-ink-soft">
                      {item.note}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <Chip>Disponível</Chip>
                    <button
                      type="button"
                      onClick={onInterest}
                      className="rounded-full px-4 py-2 font-sans text-[11px]"
                      style={{ background: "var(--ink)", color: "var(--paper)" }}
                    >
                      Tenho interesse
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAnnounce}
        className="mb-8 mt-6 w-full rounded-full py-3.5 font-sans text-[13px]"
        style={{ border: "1px solid var(--ink)", color: "var(--ink)" }}
      >
        Anunciar uma peça
      </button>
    </div>
  );
}
