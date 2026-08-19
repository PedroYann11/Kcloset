import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { BackHeader } from "@/components/kcloset/ui/BackHeader";
import { LookThumb } from "@/components/kcloset/ui/LookThumb";
import { OutfitCanvas, slotsFromLook } from "@/components/kcloset/ui/OutfitCanvas";
import { formatDate, todayISO } from "@/lib/date";
import type { ItemMap, Outfit } from "@/types";

type CalendarScreenProps = {
  looks: Outfit[];
  itemMap: ItemMap;
  onBack: () => void;
  onOpenLook: (id: string) => void;
  /** Marca/desmarca o uso de um look numa data. */
  onToggleWear: (lookId: string, date: string) => void;
};

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/**
 * Calendário de uso: cada dia mostra o look que ela vestiu, e tocar num dia
 * deixa registrar (ou desfazer) o uso de um look.
 */
export function CalendarScreen({
  looks,
  itemMap,
  onBack,
  onOpenLook,
  onToggleWear,
}: CalendarScreenProps) {
  const today = todayISO();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)) - 1); // 0-11
  const [selected, setSelected] = useState<string | null>(today);
  const [adding, setAdding] = useState(false);

  // dia -> looks vestidos naquele dia
  const wornByDate = new Map<string, Outfit[]>();
  looks.forEach((look) => {
    (look.wornDates ?? []).forEach((date) => {
      wornByDate.set(date, [...(wornByDate.get(date) ?? []), look]);
    });
  });

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => isoOf(year, month, i + 1)),
  ];

  const step = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setSelected(null);
    setAdding(false);
  };

  const monthWears = [...wornByDate.entries()].filter(([date]) =>
    date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`),
  ).length;

  const selectedLooks = selected ? wornByDate.get(selected) ?? [] : [];

  return (
    <div className="flex flex-1 flex-col">
      <BackHeader title="Calendário" onBack={onBack} />

      <div className="px-6 pb-8">
        {/* ---------- mês ---------- */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Mês anterior"
            className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full"
            style={{ border: "1px solid var(--mist)" }}
          >
            <ChevronLeft size={16} color="var(--ink)" />
          </button>

          <div className="text-center">
            <p className="font-serif text-lg capitalize text-ink">
              {MONTH_NAMES[month]} {year}
            </p>
            <p className="font-sans text-[11px] text-graphite">
              {monthWears === 0
                ? "nenhum registro"
                : `${monthWears} ${monthWears === 1 ? "dia registrado" : "dias registrados"}`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Próximo mês"
            className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full"
            style={{ border: "1px solid var(--mist)" }}
          >
            <ChevronRight size={16} color="var(--ink)" />
          </button>
        </div>

        {/* ---------- grade ---------- */}
        <div className="mt-4 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day, i) => (
            <span
              key={`${day}-${i}`}
              className="pb-1 text-center font-sans text-[10px] uppercase tracking-wide text-mist-strong"
            >
              {day}
            </span>
          ))}

          {cells.map((date, i) => {
            if (!date) return <span key={`empty-${i}`} />;

            const dayLooks = wornByDate.get(date) ?? [];
            const isToday = date === today;
            const isSelected = date === selected;

            return (
              <button
                key={date}
                type="button"
                onClick={() => {
                  setSelected(date);
                  setAdding(false);
                }}
                aria-label={`Dia ${Number(date.slice(8))}, ${
                  dayLooks.length ? dayLooks.map((look) => look.name).join(", ") : "sem registro"
                }`}
                aria-pressed={isSelected}
                className="flex aspect-[3/4] flex-col items-center justify-start overflow-hidden rounded-lg p-0.5"
                style={{
                  background: dayLooks.length ? "var(--paper-deep)" : "transparent",
                  boxShadow: isSelected
                    ? "0 0 0 1.5px var(--blush-deep)"
                    : isToday
                      ? "0 0 0 1px var(--mist-strong)"
                      : "none",
                }}
              >
                <span
                  className="font-sans text-[9.5px] leading-tight"
                  style={{ color: isToday ? "var(--blush-deep)" : "var(--graphite)" }}
                >
                  {Number(date.slice(8))}
                </span>
                {dayLooks[0] && (
                  <span className="mt-0.5 block w-[80%]">
                    <OutfitCanvas slots={slotsFromLook(dayLooks[0].itemIds, itemMap)} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ---------- dia escolhido ---------- */}
        {selected && (
          <section className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg text-ink">
                {formatDate(selected)}
                {selected === today && (
                  <span className="ml-2 font-sans text-[11px] text-blush-deep">hoje</span>
                )}
              </h2>
              <button
                type="button"
                onClick={() => setAdding((value) => !value)}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3 font-sans text-[11.5px]"
                style={{ border: "1px solid var(--mist)", color: "var(--ink)" }}
              >
                {adding ? <X size={13} /> : <Plus size={13} />}
                {adding ? "Fechar" : "Registrar look"}
              </button>
            </div>

            {selectedLooks.length === 0 && !adding && (
              <p className="mt-3 font-sans text-[12.5px] italic text-graphite">
                Sem registro nesse dia.
              </p>
            )}

            <div className="mt-3 flex flex-col gap-2.5">
              {selectedLooks.map((look) => (
                <div
                  key={look.id}
                  className="flex items-center gap-3 rounded-2xl border p-2.5"
                  style={{ borderColor: "var(--mist)" }}
                >
                  <button
                    type="button"
                    onClick={() => onOpenLook(look.id)}
                    aria-label={`Ver ${look.name}`}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <LookThumb look={look} itemMap={itemMap} size={48} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-serif text-[15px] text-ink">
                        {look.name}
                      </span>
                      <span className="font-sans text-[11px] text-graphite">
                        usado {look.wornDates?.length}x no total
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleWear(look.id, selected)}
                    aria-label={`Apagar o registro de ${look.name} em ${formatDate(selected)}`}
                    className="flex min-h-[34px] min-w-[34px] items-center justify-center rounded-full"
                    style={{ background: "var(--paper-deep)" }}
                  >
                    <X size={14} color="var(--graphite)" />
                  </button>
                </div>
              ))}
            </div>

            {adding && (
              <div className="fade-in mt-3">
                <p className="mb-2 font-sans text-[10px] uppercase tracking-[0.18em] text-graphite">
                  Escolha o look
                </p>
                {looks.length === 0 ? (
                  <p className="font-sans text-[12.5px] italic text-graphite">
                    Nenhum look salvo.
                  </p>
                ) : (
                  <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                    {looks.map((look) => (
                      <button
                        key={look.id}
                        type="button"
                        onClick={() => {
                          onToggleWear(look.id, selected);
                          setAdding(false);
                        }}
                        aria-label={`Registrar ${look.name} em ${formatDate(selected)}`}
                        className="w-[66px] shrink-0"
                      >
                        <LookThumb look={look} itemMap={itemMap} size={66} />
                        <span className="mt-1 block truncate font-sans text-[10px] text-graphite">
                          {look.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

const isoOf = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
