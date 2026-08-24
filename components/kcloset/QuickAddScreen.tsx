import { useMemo, useState } from "react";
import { Garment, SHAPE_OPTIONS } from "@/components/icons/garments";
import { BackHeader } from "@/components/kcloset/ui/BackHeader";
import { CATEGORIES, COLOR_SUGGESTIONS, FORMALITIES, SEASONS } from "@/data/seed-items";
import { decorateItems } from "@/lib/palette";
import type { CategoryId, GarmentShape, NewItemDraft } from "@/types";

type QuickAddScreenProps = {
  onBack: () => void;
  onAdd: (draft: NewItemDraft) => void;
};

/** Molde só para tirar cor → tecido de `decorateItems`; os outros campos não
 * importam aqui, servem só para o tipo bater. */
const blank = {
  name: "",
  shape: "blusa" as GarmentShape,
  season: SEASONS[0],
  formality: FORMALITIES[0],
  occasions: [],
  note: "",
  forBazaar: false,
};

/**
 * Catálogo rápido: toque na cor, toque no tipo, a peça já entra no closet.
 * Sem foto, sem formulário, pensado para cadastrar o guarda-roupa inteiro em
 * poucos minutos, com os mesmos desenhos que aparecem no resto do app.
 */
export function QuickAddScreen({ onBack, onAdd }: QuickAddScreenProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("tops");
  const [currentColor, setCurrentColor] = useState(COLOR_SUGGESTIONS[0]);
  const [addedCount, setAddedCount] = useState(0);

  // Uma passada só, calcula o tecido de cada cor da lista.
  const swatches = useMemo(
    () =>
      decorateItems(
        COLOR_SUGGESTIONS.map((color) => ({ ...blank, id: color, category: "tops", color })),
      ),
    [],
  );
  const currentSwatch = swatches.find((s) => s.color === currentColor) ?? swatches[0];

  const handlePick = (shapeValue: GarmentShape, shapeLabel: string) => {
    const cleanName = shapeLabel.split(" / ")[0];
    onAdd({
      ...blank,
      name: `${cleanName} · ${currentColor}`,
      category: activeCategory,
      shape: shapeValue,
      fullBody: shapeValue === "vestido",
      color: currentColor,
    });
    setAddedCount((count) => count + 1);
  };

  return (
    <div className="flex flex-1 flex-col">
      <BackHeader title="Catálogo rápido" onBack={onBack} />

      <p className="-mt-1 px-6 font-sans text-[11.5px] text-graphite">
        {addedCount === 0
          ? "toque na cor, depois no tipo"
          : `${addedCount} ${addedCount === 1 ? "peça adicionada" : "peças adicionadas"}`}
      </p>

      {/* ---------- cor atual ---------- */}
      <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto px-6">
        {swatches.map((swatch) => {
          const active = swatch.color === currentColor;
          return (
            <button
              key={swatch.color}
              type="button"
              onClick={() => setCurrentColor(swatch.color)}
              aria-pressed={active}
              aria-label={`Cor ${swatch.color}`}
              className="flex shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className="h-9 w-9 rounded-full transition-transform"
                style={{
                  background: swatch.fabric,
                  boxShadow: active
                    ? "0 0 0 2px var(--paper), 0 0 0 4px var(--blush-deep)"
                    : "0 0 0 1px rgba(26,24,22,0.12)",
                  transform: active ? "scale(1.06)" : "scale(1)",
                }}
              />
              <span className="whitespace-nowrap font-sans text-[9.5px] text-graphite">
                {swatch.color}
              </span>
            </button>
          );
        })}
      </div>

      {/* ---------- família ---------- */}
      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto px-6">
        {CATEGORIES.map((category) => {
          const active = category.id === activeCategory;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              aria-pressed={active}
              className="shrink-0 rounded-full px-4 py-2 font-sans text-[12px] transition-colors"
              style={{
                background: active ? "var(--ink)" : "transparent",
                color: active ? "var(--paper)" : "var(--graphite)",
                border: `1px solid ${active ? "var(--ink)" : "var(--mist)"}`,
              }}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      {/* ---------- tipos, na cor escolhida ---------- */}
      <div className="mt-4 grid grid-cols-3 gap-3 overflow-y-auto px-6 pb-8">
        {SHAPE_OPTIONS[activeCategory].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handlePick(option.value, option.label)}
            aria-label={`Adicionar ${option.label.split(" / ")[0]} ${currentColor}`}
            className="flex flex-col items-center gap-1.5 transition-transform active:scale-95"
          >
            <span
              className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl p-3"
              style={{ background: currentSwatch.cardTone }}
            >
              <Garment
                shape={option.value}
                colors={{
                  fabric: currentSwatch.fabric,
                  shade: currentSwatch.fabricShade,
                  line: currentSwatch.fabricLine,
                }}
                className="h-full w-full drop-shadow-[0_4px_7px_rgba(26,24,22,0.18)]"
              />
            </span>
            <span className="font-sans text-[11px] text-graphite">
              {option.label.split(" / ")[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
