import { useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  DEFAULT_RECIPE,
  THEME_PRESETS,
  THEME_SCOPES,
  deriveVars,
  hasOverride,
  recipeFor,
  type ThemeRecipe,
  type ThemeScopeId,
  type ThemeState,
} from "@/lib/theme";

type ThemeScreenProps = {
  state: ThemeState;
  onChange: (next: ThemeState) => void;
};

const FIELDS: { key: keyof ThemeRecipe; label: string }[] = [
  { key: "paper", label: "Fundo" },
  { key: "ink", label: "Texto" },
  { key: "accent", label: "Destaque" },
  { key: "wardrobe", label: "Guarda-roupa" },
];

/**
 * Personalização do tema, aba por aba.
 *
 * Cada escopo edita uma receita de 4 cores (fundo, texto, destaque, tom do
 * guarda-roupa); o resto da paleta é derivado automaticamente a partir dela.
 * O Geral vale para o app inteiro; uma página com cores próprias substitui o
 * Geral só ali.
 */
export function ThemeScreen({ state, onChange }: ThemeScreenProps) {
  const [scope, setScope] = useState<ThemeScopeId>("global");

  const overriding = scope !== "global" && hasOverride(state, scope);
  const editable = scope === "global" || overriding;
  const recipe = recipeFor(state, scope);

  const setRecipe = (next: ThemeRecipe) => {
    if (scope === "global") onChange({ ...state, global: next });
    else onChange({ ...state, overrides: { ...state.overrides, [scope]: next } });
  };

  const setField = (key: keyof ThemeRecipe, value: string) => setRecipe({ ...recipe, ...{ [key]: value } });

  const toggleOverride = () => {
    if (scope === "global") return;
    if (overriding) {
      const nextOverrides = { ...state.overrides };
      delete nextOverrides[scope];
      onChange({ ...state, overrides: nextOverrides });
    } else {
      onChange({ ...state, overrides: { ...state.overrides, [scope]: { ...state.global } } });
    }
  };

  const resetAll = () => onChange({ global: DEFAULT_RECIPE, overrides: {} });

  return (
    <div className="flex-1 px-6 pt-12 pb-8">
      <h1 className="font-serif text-2xl text-ink">Tema</h1>
      <p className="mt-0.5 font-sans text-[11.5px] text-graphite">personalize as cores do app</p>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        {THEME_SCOPES.map((item) => {
          const active = item.id === scope;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setScope(item.id)}
              aria-pressed={active}
              className="shrink-0 rounded-full px-3.5 py-2 font-sans text-[12px] transition-colors"
              style={{
                background: active ? "var(--ink)" : "transparent",
                color: active ? "var(--paper)" : "var(--graphite)",
                border: `1px solid ${active ? "var(--ink)" : "var(--mist)"}`,
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {scope !== "global" && (
        <button
          type="button"
          role="switch"
          aria-checked={overriding}
          onClick={toggleOverride}
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left"
          style={{ borderColor: "var(--mist)" }}
        >
          <span className="font-serif text-[15px] text-ink">Cores próprias nesta página</span>
          <span
            className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
            style={{ background: overriding ? "var(--ink)" : "var(--mist)" }}
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
              style={{ left: overriding ? 22 : 2 }}
            />
          </span>
        </button>
      )}

      {!editable && (
        <p className="mt-3 font-sans text-[12px] italic text-graphite">Segue o tema Geral.</p>
      )}

      {editable && (
        <div className="fade-in">
          <Preview recipe={recipe} />

          <div className="mt-5 grid grid-cols-2 gap-3">
            {FIELDS.map((field) => (
              <label
                key={field.key}
                className="flex items-center gap-3 rounded-2xl border p-3"
                style={{ borderColor: "var(--mist)" }}
              >
                <span
                  className="h-9 w-9 shrink-0 rounded-full"
                  style={{ background: recipe[field.key], boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)" }}
                />
                <span className="min-w-0 flex-1 font-sans text-[12px] text-ink">{field.label}</span>
                <input
                  type="color"
                  value={recipe[field.key]}
                  onChange={(event) => setField(field.key, event.target.value)}
                  aria-label={field.label}
                  className="sr-only"
                />
              </label>
            ))}
          </div>

          <p className="mb-2.5 mt-6 font-sans text-[10px] uppercase tracking-[0.18em] text-graphite">
            Combinações prontas
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => setRecipe(preset.recipe)}
                className="flex flex-col items-center gap-1.5 rounded-2xl border p-2.5"
                style={{ borderColor: "var(--mist)" }}
              >
                <span className="flex overflow-hidden rounded-full" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.08)" }}>
                  <span className="h-6 w-6" style={{ background: preset.recipe.paper }} />
                  <span className="h-6 w-6" style={{ background: preset.recipe.accent }} />
                  <span className="h-6 w-6" style={{ background: preset.recipe.ink }} />
                </span>
                <span className="text-center font-sans text-[10.5px] leading-tight text-graphite">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>

          {scope === "global" && (
            <button
              type="button"
              onClick={resetAll}
              className="mt-6 inline-flex items-center gap-1.5 font-sans text-[12px] text-graphite underline"
            >
              <RotateCcw size={13} />
              Restaurar tudo ao padrão
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Amostra viva da receita em edição, isolada num escopo próprio de cores. */
function Preview({ recipe }: { recipe: ThemeRecipe }) {
  const vars = deriveVars(recipe);

  return (
    <div
      className="mt-4 overflow-hidden rounded-[24px] border p-4"
      style={{ ...vars, background: "var(--paper)", borderColor: "var(--mist)" }}
    >
      <div className="flex items-center gap-3">
        <span
          className="h-14 w-11 shrink-0 rounded-lg"
          style={{ background: "linear-gradient(135deg, var(--case-face), var(--case-edge))" }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-[15px] text-ink">Vestido midi preto</p>
          <p className="font-sans text-[11px] text-graphite">Formal · Todas</p>
        </div>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--blush)" }}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--blush-deep)" }} />
        </span>
      </div>
      <button
        type="button"
        tabIndex={-1}
        className="mt-3 w-full rounded-full py-2.5 font-sans text-[12px]"
        style={{ background: "var(--ink)", color: "var(--paper)" }}
      >
        Salvar look
      </button>
    </div>
  );
}
