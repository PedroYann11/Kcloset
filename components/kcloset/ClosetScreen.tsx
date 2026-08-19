import { useState } from "react";
import { Heart, Info, Plus, RotateCcw, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { ACCESSORY_GROUPS, accessoryGroup } from "@/components/icons/garments";
import { GarmentView } from "@/components/kcloset/ui/GarmentView";
import { OutfitCanvas, slotsFromSelection } from "@/components/kcloset/ui/OutfitCanvas";
import { CATEGORIES } from "@/data/seed-items";
import type { AccessoryGroup, BuilderSelection, CategoryId, DecoratedItem, ItemMap } from "@/types";

type ClosetScreenProps = {
  items: DecoratedItem[];
  itemMap: ItemMap;
  activeCategory: CategoryId;
  onCategoryChange: (category: CategoryId) => void;
  activeAccessoryGroup: AccessoryGroup;
  onAccessoryGroupChange: (group: AccessoryGroup) => void;
  selection: BuilderSelection;
  isChosen: (item: DecoratedItem) => boolean;
  onToggleItem: (item: DecoratedItem) => void;
  onClear: () => void;
  canSave: boolean;
  onSave: () => void;
  isEditing: boolean;
  onCancelEdit: () => void;
  onNewItem: () => void;
  onOpenItem: (item: DecoratedItem) => void;
  onOccasion: () => void;
  favItems: Set<string>;
};

type Filters = {
  colors: string[];
  seasons: string[];
  formalities: string[];
  onlyFavorites: boolean;
};

const NO_FILTERS: Filters = { colors: [], seasons: [], formalities: [], onlyFavorites: false };

/**
 * A aba Closet: acervo e montagem de look no mesmo lugar.
 *
 * O Espelho fica no topo e vai se preenchendo conforme a usuária toca nas
 * peças logo abaixo; tocar de novo tira a peça.
 */
export function ClosetScreen({
  items,
  itemMap,
  activeCategory,
  onCategoryChange,
  activeAccessoryGroup,
  onAccessoryGroupChange,
  selection,
  isChosen,
  onToggleItem,
  onClear,
  canSave,
  onSave,
  isEditing,
  onCancelEdit,
  onNewItem,
  onOpenItem,
  onOccasion,
  favItems,
}: ClosetScreenProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const slots = slotsFromSelection(selection, itemMap);
  const chosenCount =
    Number(Boolean(slots.top)) +
    Number(Boolean(slots.bottom)) +
    Number(Boolean(slots.shoes)) +
    (slots.accs?.length ?? 0);
  const dressOn = Boolean(slots.top?.fullBody);

  /* ---------------- busca e filtro ---------------- */

  const terms = query.trim().toLowerCase();

  const matches = (item: DecoratedItem) => {
    if (terms && !searchable(item).includes(terms)) return false;
    if (filters.colors.length && !filters.colors.includes(item.color)) return false;
    if (filters.seasons.length && !filters.seasons.includes(item.season)) return false;
    if (filters.formalities.length && !filters.formalities.includes(item.formality)) return false;
    if (filters.onlyFavorites && !favItems.has(item.id)) return false;
    return true;
  };

  const found = items.filter(matches);
  const activeFilterCount =
    filters.colors.length +
    filters.seasons.length +
    filters.formalities.length +
    (filters.onlyFavorites ? 1 : 0);
  const filtering = Boolean(terms) || activeFilterCount > 0;

  const inFamily = found.filter((item) => item.category === activeCategory);
  const accessoryGroups = ACCESSORY_GROUPS.filter((group) =>
    items.some((item) => item.category === "acessorios" && accessoryGroup(item.drawing) === group.id),
  );
  const visible =
    activeCategory === "acessorios"
      ? inFamily.filter((item) => accessoryGroup(item.drawing) === activeAccessoryGroup)
      : inFamily;

  const countOf = (category: CategoryId) =>
    found.filter((item) => item.category === category).length;

  const options = (pick: (item: DecoratedItem) => string) =>
    [...new Set(items.map(pick))].filter(Boolean).sort((a, b) => a.localeCompare(b));

  const toggleFilter = (key: "colors" | "seasons" | "formalities", value: string) =>
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((current) => current !== value)
        : [...prev[key], value],
    }));

  return (
    <div className="flex flex-1 flex-col pt-12">
      <div className="flex items-start justify-between px-6">
        <div>
          <h1 className="font-serif text-2xl text-ink">{isEditing ? "Editar look" : "Closet"}</h1>
          <p className="mt-0.5 font-sans text-[11.5px] text-graphite">
            {filtering ? `${found.length} de ${items.length} peças` : `${items.length} peças`}
          </p>
        </div>

        <button
          type="button"
          onClick={isEditing ? onCancelEdit : onNewItem}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3.5 font-sans text-[12px]"
          style={{ border: "1px solid var(--mist)", color: "var(--ink)" }}
        >
          {isEditing ? <X size={14} /> : <Plus size={14} />}
          {isEditing ? "Cancelar" : "Nova peça"}
        </button>
      </div>

      {/* ---------- espelho ---------- */}
      <div className="mt-3 px-6">
        <div
          className="relative overflow-hidden rounded-[24px] px-4 pb-3 pt-2"
          style={{ background: "var(--paper-deep)" }}
        >
          <p className="pt-1 text-center font-sans text-[9.5px] uppercase tracking-[0.24em] text-mist-strong">
            Espelho
          </p>

          {chosenCount === 0 ? (
            <div className="py-8" />
          ) : (
            <div className="mx-auto mt-1" style={{ width: "58%" }}>
              <OutfitCanvas slots={slots} onRemove={onToggleItem} />
            </div>
          )}

          {chosenCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Limpar o espelho"
              className="absolute right-3 top-3 flex min-h-[34px] min-w-[34px] items-center justify-center rounded-full"
              style={{ background: "rgb(var(--c-paper) / 0.9)" }}
            >
              <RotateCcw size={15} color="var(--graphite)" />
            </button>
          )}
        </div>

        <div className="mt-3 flex gap-2.5">
          <button
            type="button"
            disabled={!canSave}
            onClick={onSave}
            className="flex-1 rounded-full py-3 font-sans text-[12.5px] tracking-wide transition-opacity"
            style={{ background: "var(--ink)", color: "var(--paper)", opacity: canSave ? 1 : 0.3 }}
          >
            {isEditing ? "Atualizar look" : "Salvar look"}
          </button>
          <button
            type="button"
            onClick={onOccasion}
            aria-label="Sugestões por ocasião"
            className="flex min-h-[44px] items-center gap-1.5 rounded-full px-4 font-sans text-[12.5px]"
            style={{ border: "1px solid var(--mist)", color: "var(--ink)" }}
          >
            <Sparkles size={14} color="var(--blush-deep)" />
            Sugestões
          </button>
        </div>
      </div>

      {/* ---------- busca e filtro ---------- */}
      <div className="mt-4 flex gap-2 px-6">
        <div
          className="flex min-w-0 flex-1 items-center gap-2 rounded-full px-3.5"
          style={{ border: "1px solid var(--mist)" }}
        >
          <Search size={15} color="var(--mist-strong)" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar peça"
            aria-label="Buscar peça"
            className="min-w-0 flex-1 bg-transparent py-2.5 font-sans text-[12.5px] text-ink placeholder:text-mist-strong focus:outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca">
              <X size={14} color="var(--graphite)" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-label="Filtros"
          className="relative flex min-h-[42px] min-w-[42px] items-center justify-center rounded-full"
          style={{
            border: `1px solid ${activeFilterCount ? "var(--ink)" : "var(--mist)"}`,
            background: activeFilterCount ? "var(--ink)" : "transparent",
          }}
        >
          <SlidersHorizontal
            size={15}
            color={activeFilterCount ? "var(--paper)" : "var(--ink)"}
          />
          {activeFilterCount > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 font-sans text-[9px]"
              style={{ background: "var(--blush-deep)", color: "var(--paper)" }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {filtersOpen && (
        <div className="fade-in mt-3 px-6">
          <FilterRow
            label="Cor"
            options={options((item) => item.color)}
            selected={filters.colors}
            onToggle={(value) => toggleFilter("colors", value)}
          />
          <FilterRow
            label="Estação"
            options={options((item) => item.season)}
            selected={filters.seasons}
            onToggle={(value) => toggleFilter("seasons", value)}
          />
          <FilterRow
            label="Estilo"
            options={options((item) => item.formality)}
            selected={filters.formalities}
            onToggle={(value) => toggleFilter("formalities", value)}
          />

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, onlyFavorites: !prev.onlyFavorites }))}
              aria-pressed={filters.onlyFavorites}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3 font-sans text-[11.5px]"
              style={{
                background: filters.onlyFavorites ? "var(--blush)" : "transparent",
                border: `1px solid ${filters.onlyFavorites ? "var(--blush)" : "var(--mist)"}`,
                color: "var(--ink)",
              }}
            >
              <Heart
                size={12}
                color="var(--blush-deep)"
                fill={filters.onlyFavorites ? "var(--blush-deep)" : "none"}
              />
              Favoritas
            </button>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => setFilters(NO_FILTERS)}
                className="font-sans text-[11.5px] text-graphite underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* ---------- famílias ---------- */}
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-6">
        {CATEGORIES.map((category) => {
          const active = category.id === activeCategory;
          const disabled = category.id === "bottoms" && dressOn;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onCategoryChange(category.id)}
              aria-pressed={active}
              className="shrink-0 rounded-full px-4 py-2 font-sans text-[12px] transition-colors"
              style={{
                background: active ? "var(--ink)" : "transparent",
                color: active ? "var(--paper)" : "var(--graphite)",
                border: `1px solid ${active ? "var(--ink)" : "var(--mist)"}`,
                opacity: disabled ? 0.45 : 1,
              }}
            >
              {category.label}
              <span className="ml-1.5 opacity-60">{countOf(category.id)}</span>
            </button>
          );
        })}
      </div>

      {/* ---------- prateleiras dos acessórios ---------- */}
      {activeCategory === "acessorios" && accessoryGroups.length > 1 && (
        <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto px-6">
          {accessoryGroups.map((group) => {
            const active = group.id === activeAccessoryGroup;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => onAccessoryGroupChange(group.id)}
                aria-pressed={active}
                className="shrink-0 rounded-full px-3 py-1.5 font-sans text-[11.5px] transition-colors"
                style={{
                  background: active ? "var(--blush)" : "var(--paper-deep)",
                  color: active ? "var(--ink)" : "var(--graphite)",
                }}
              >
                {group.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ---------- acervo da família ---------- */}
      <div className="mt-3 grid grid-cols-3 gap-3 px-6 pb-8">
        {visible.length === 0 && (
          <p className="col-span-3 mt-2 font-sans text-[13px] italic text-graphite">
            {filtering ? "Nada encontrado." : "Nenhuma peça aqui ainda."}
          </p>
        )}

        {visible.map((item) => {
          const active = isChosen(item);
          return (
            <div key={item.id} className="relative">
              <button
                type="button"
                onClick={() => onToggleItem(item)}
                aria-pressed={active}
                aria-label={`${active ? "Tirar" : "Colocar"} ${item.name} ${active ? "do" : "no"} look`}
                className="flex w-full flex-col items-center gap-1.5"
              >
                <span
                  className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl p-2.5 transition-all"
                  style={{
                    background: item.cardTone,
                    boxShadow: active
                      ? "0 0 0 2px var(--blush-deep)"
                      : "inset 0 0 0 1px rgba(26,24,22,0.05)",
                    transform: active ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  <GarmentView
                    item={item}
                    className="h-full w-full"
                    photoRounded="rounded-lg"
                    shadow={false}
                  />
                </span>
                <span className="w-full truncate text-center font-sans text-[10px] leading-tight text-graphite">
                  {item.name}
                </span>
              </button>

              {favItems.has(item.id) && (
                <span className="pointer-events-none absolute left-2 top-2">
                  <Heart size={13} color="var(--blush-deep)" fill="var(--blush-deep)" />
                </span>
              )}

              <button
                type="button"
                onClick={() => onOpenItem(item)}
                aria-label={`Detalhes de ${item.name}`}
                className="absolute right-1.5 top-1.5 flex min-h-[26px] min-w-[26px] items-center justify-center rounded-full"
                style={{ background: "rgb(var(--c-paper) / 0.85)" }}
              >
                <Info size={13} color="var(--graphite)" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Filtros
   ------------------------------------------------------------------------- */

function FilterRow({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length < 2) return null;

  return (
    <div className="mb-3">
      <p className="mb-1.5 font-sans text-[9.5px] uppercase tracking-[0.18em] text-graphite">
        {label}
      </p>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              aria-pressed={active}
              className="shrink-0 rounded-full px-3 py-1.5 font-sans text-[11.5px] transition-colors"
              style={{
                background: active ? "var(--ink)" : "transparent",
                color: active ? "var(--paper)" : "var(--graphite)",
                border: `1px solid ${active ? "var(--ink)" : "var(--mist)"}`,
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Texto em que a busca procura: nome, cor, estação e estilo da peça. */
function searchable(item: DecoratedItem): string {
  return [item.name, item.color, item.season, item.formality].join(" ").toLowerCase();
}
