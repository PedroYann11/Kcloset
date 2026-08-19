import { BackHeader } from "@/components/kcloset/ui/BackHeader";
import { ItemThumb } from "@/components/kcloset/ui/ItemThumb";
import { LookThumb } from "@/components/kcloset/ui/LookThumb";
import { CATEGORIES, categoryLong } from "@/data/seed-items";
import { currentMonth, formatDate } from "@/lib/date";
import type { Board, DecoratedItem, ItemMap, Outfit } from "@/types";

type StatsScreenProps = {
  items: DecoratedItem[];
  itemMap: ItemMap;
  looks: Outfit[];
  boards: Board[];
  onBack: () => void;
  onOpenLook: (id: string) => void;
};

/**
 * Retrato do closet, no espírito do Style Stats do Stylebook: o que existe,
 * o que sai de casa e o que está parado no cabide.
 */
export function StatsScreen({ items, itemMap, looks, boards, onBack, onOpenLook }: StatsScreenProps) {
  const wearsThisMonth = looks.reduce(
    (total, look) =>
      total + (look.wornDates ?? []).filter((date) => date.startsWith(currentMonth())).length,
    0,
  );

  const mostWorn = [...looks]
    .filter((look) => (look.wornDates ?? []).length > 0)
    .sort((a, b) => (b.wornDates?.length ?? 0) - (a.wornDates?.length ?? 0))[0];

  // Quantas vezes cada peça saiu de casa: soma dos usos dos looks em que ela está.
  const wearsByItem = new Map<string, number>();
  looks.forEach((look) => {
    const wears = (look.wornDates ?? []).length;
    look.itemIds.forEach((id) => wearsByItem.set(id, (wearsByItem.get(id) ?? 0) + wears));
  });

  const usedInLooks = new Set(looks.flatMap((look) => look.itemIds));
  const neverUsed = items.filter((item) => !usedInLooks.has(item.id));

  const topItems = [...items]
    .filter((item) => (wearsByItem.get(item.id) ?? 0) > 0)
    .sort((a, b) => (wearsByItem.get(b.id) ?? 0) - (wearsByItem.get(a.id) ?? 0))
    .slice(0, 4);

  const byColor = countBy(items, (item) => item.color);
  const colorSwatch = new Map(items.map((item) => [item.color, item.fabric]));

  return (
    <div className="flex flex-1 flex-col">
      <BackHeader title="Estatísticas" onBack={onBack} />

      <div className="px-6 pb-8">
        <div className="grid grid-cols-3 gap-2.5">
          <Stat value={items.length} label="peças" />
          <Stat value={looks.length} label="looks" />
          <Stat value={boards.length} label="coleções" />
          <Stat value={wearsThisMonth} label="usos no mês" />
          <Stat value={neverUsed.length} label="nunca usadas" />
          <Stat value={items.filter((item) => item.forBazaar).length} label="no bazar" />
        </div>

        {/* ---------- famílias ---------- */}
        <Section title="Por família">
          <div className="flex flex-col gap-2.5">
            {CATEGORIES.map((category) => {
              const count = items.filter((item) => item.category === category.id).length;
              const share = items.length ? (count / items.length) * 100 : 0;
              return (
                <div key={category.id}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="font-sans text-[12px] text-ink">{category.long}</span>
                    <span className="font-sans text-[11px] text-graphite">{count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--paper-deep)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${share}%`, background: "var(--blush-deep)" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ---------- cores ---------- */}
        <Section title="Cores do closet">
          <div className="flex flex-col gap-2">
            {byColor.slice(0, 6).map(([color, count]) => (
              <div key={color} className="flex items-center gap-2.5">
                <span
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{
                    background: colorSwatch.get(color) ?? "var(--mist)",
                    boxShadow: "inset 0 0 0 1px rgba(26,24,22,0.12)",
                  }}
                />
                <span className="flex-1 truncate font-sans text-[12px] text-ink">{color}</span>
                <span className="font-sans text-[11px] text-graphite">{count}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ---------- mais usados ---------- */}
        {mostWorn && (
          <Section title="Look mais usado">
            <button
              type="button"
              onClick={() => onOpenLook(mostWorn.id)}
              className="flex w-full items-center gap-4 rounded-2xl border p-3 text-left"
              style={{ borderColor: "var(--mist)" }}
            >
              <LookThumb look={mostWorn} itemMap={itemMap} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-base text-ink">{mostWorn.name}</span>
                <span className="mt-0.5 block font-sans text-[11px] text-graphite">
                  {mostWorn.wornDates?.length}x · última vez {formatDate(mostWorn.wornDates![0])}
                </span>
              </span>
            </button>
          </Section>
        )}

        {topItems.length > 0 && (
          <Section title="Peças que mais saem de casa">
            <div className="flex gap-3">
              {topItems.map((item) => (
                <div key={item.id} className="w-[68px]">
                  <ItemThumb item={item} size={68} />
                  <p className="mt-1 truncate font-sans text-[10px] text-graphite">{item.name}</p>
                  <p className="font-sans text-[10px] text-mist-strong">
                    {wearsByItem.get(item.id)}x
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ---------- paradas ---------- */}
        {neverUsed.length > 0 && (
          <Section title="Ainda não entraram em nenhum look">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {neverUsed.slice(0, 8).map((item) => (
                <div key={item.id} className="w-[68px] shrink-0">
                  <ItemThumb item={item} size={68} />
                  <p className="mt-1 truncate font-sans text-[10px] text-graphite">{item.name}</p>
                  <p className="truncate font-sans text-[10px] text-mist-strong">
                    {categoryLong(item.category)}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl p-3 text-center" style={{ background: "var(--paper-deep)" }}>
      <p className="font-serif text-2xl text-ink">{value}</p>
      <p className="mt-0.5 font-sans text-[10px] uppercase tracking-wide text-graphite">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 font-sans text-[10px] uppercase tracking-[0.18em] text-graphite">{title}</h2>
      {children}
    </section>
  );
}

/** Contagem por chave, já ordenada da mais frequente para a menos. */
function countBy<T>(list: T[], key: (item: T) => string): [string, number][] {
  const counts = new Map<string, number>();
  list.forEach((item) => {
    const value = key(item);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
