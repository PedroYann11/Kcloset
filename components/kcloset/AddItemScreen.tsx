import { useRef, useState } from "react";
import { Camera, Link2, Loader2, Trash2 } from "lucide-react";
import { BackHeader } from "@/components/kcloset/ui/BackHeader";
import { CATEGORY_SHAPE, Garment, SHAPE_OPTIONS } from "@/components/icons/garments";
import {
  CATEGORIES,
  COLOR_SUGGESTIONS,
  CONDITIONS,
  FORMALITIES,
  OCCASIONS,
  SEASONS,
} from "@/data/seed-items";
import { compressImage } from "@/lib/image";
import { decorateItems } from "@/lib/palette";
import type { CategoryId, GarmentShape, NewItemDraft, OccasionId } from "@/types";

type AddItemScreenProps = {
  onBack: () => void;
  onSave: (draft: NewItemDraft) => void;
};

export function AddItemScreen({ onBack, onSave }: AddItemScreenProps) {
  const [photo, setPhoto] = useState<string | undefined>();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<CategoryId>("tops");
  const [shape, setShape] = useState<GarmentShape>(CATEGORY_SHAPE.tops);
  const [color, setColor] = useState("");
  const [season, setSeason] = useState(SEASONS[0]);
  const [formality, setFormality] = useState(FORMALITIES[0]);
  const [occasions, setOccasions] = useState<OccasionId[]>([]);
  const [note, setNote] = useState("");

  const [forBazaar, setForBazaar] = useState(false);
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState(CONDITIONS[1]);

  const [link, setLink] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);

  const fileInput = useRef<HTMLInputElement>(null);

  const canSave = name.trim().length > 0 && (!forBazaar || price.trim().length > 0);

  /**
   * Baixa a foto pela nossa própria origem e passa pelo mesmo compressor das
   * fotos de câmera. Buscar direto do CDN da loja não funciona por CORS.
   */
  const usePhotoFrom = async (src: string) => {
    const response = await fetch(`/api/import/image?url=${encodeURIComponent(src)}`);
    if (!response.ok) throw new Error("Não foi possível baixar essa foto.");

    const blob = await response.blob();
    const file = new File([blob], "peca.jpg", { type: blob.type || "image/jpeg" });
    setPhoto(await compressImage(file));
  };

  const importFromLink = async () => {
    const url = link.trim();
    if (!url || linkBusy) return;

    setLinkBusy(true);
    setLinkError(null);
    setCandidates([]);

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();

      if (!response.ok) {
        setLinkError(LINK_ERRORS[data?.reason as string] ?? LINK_ERRORS.unreachable);
        return;
      }

      const images: string[] = data.images ?? [];
      if (images.length === 0) {
        setLinkError(LINK_ERRORS.blocked);
        return;
      }

      setCandidates(images);
      if (data.title && !name.trim()) setName(String(data.title).slice(0, 60));

      // A IA escolhe a foto e preenche os campos. Se não estiver configurada,
      // fica a primeira foto e ela ajusta o resto na mão.
      const enriched = await enrich(images, data.title);
      await usePhotoFrom(images[enriched?.bestImage ?? 0] ?? images[0]);

      if (enriched) applyEnriched(enriched);
    } catch {
      setLinkError(LINK_ERRORS.unreachable);
    } finally {
      setLinkBusy(false);
    }
  };

  const applyEnriched = (enriched: Enriched) => {
    if (enriched.name) setName(enriched.name);
    if (enriched.category) {
      setCategory(enriched.category);
      setShape(enriched.shape ?? CATEGORY_SHAPE[enriched.category]);
    } else if (enriched.shape) {
      setShape(enriched.shape);
    }
    if (enriched.color) setColor(enriched.color);
    if (enriched.season) setSeason(enriched.season);
    if (enriched.formality) setFormality(enriched.formality);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      setPhoto(await compressImage(file));
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Não foi possível usar essa imagem.");
    } finally {
      setPhotoBusy(false);
      // Permite escolher o mesmo arquivo de novo depois de remover.
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;

    onSave({
      name: name.trim(),
      category,
      shape,
      // vestido e macacão ocupam o look inteiro, dispensam a peça de baixo
      fullBody: shape === "vestido",
      color: color.trim() || "Sem cor",
      season,
      formality,
      occasions,
      note: note.trim(),
      photo,
      forBazaar,
      price: forBazaar ? normalizePrice(price) : undefined,
      condition: forBazaar ? condition : undefined,
    });
  };

  // Pré-visualização com o tecido que a cor escrita produz.
  const preview = decorateItems([
    {
      id: "preview",
      name,
      category,
      shape,
      color,
      season,
      formality,
      occasions,
      note,
      forBazaar: false,
    },
  ])[0];

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
      <BackHeader title="Nova peça" onBack={onBack} />

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* ---------- link da loja ---------- */}
        <Field label="Link do produto ou da foto" hint="opcional">
          <div className="flex gap-2">
            <div
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3"
              style={{ border: "1px solid var(--mist)" }}
            >
              <Link2 size={15} color="var(--mist-strong)" />
              <input
                value={link}
                onChange={(event) => setLink(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void importFromLink();
                  }
                }}
                inputMode="url"
                placeholder="Cole o link da loja"
                aria-label="Link do produto"
                className="min-w-0 flex-1 bg-transparent py-3 font-sans text-[13px] text-ink placeholder:text-mist-strong focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void importFromLink()}
              disabled={linkBusy || !link.trim()}
              className="min-h-[44px] shrink-0 rounded-xl px-4 font-sans text-[12.5px] transition-opacity"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                opacity: linkBusy || !link.trim() ? 0.35 : 1,
              }}
            >
              {linkBusy ? <Loader2 size={15} className="animate-spin" /> : "Buscar"}
            </button>
          </div>

          {linkError && (
            <p role="alert" className="mt-2 font-sans text-[11.5px] leading-snug text-blush-deep">
              {linkError}
            </p>
          )}

          {candidates.length > 1 && (
            <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto">
              {candidates.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => void usePhotoFrom(src)}
                  aria-label="Usar esta foto"
                  className="h-16 w-12 shrink-0 overflow-hidden rounded-lg"
                  style={{ border: "1px solid var(--mist)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- foto remota da loja, servida pela nossa origem */}
                  <img
                    src={`/api/import/image?url=${encodeURIComponent(src)}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </Field>

        {/* ---------- foto ---------- */}
        <Field label="Foto da peça" hint="opcional">
          <div className="flex items-start gap-3">
            <div
              className="relative flex h-[132px] w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border"
              style={{ background: "var(--paper-deep)", borderColor: "var(--mist)" }}
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL gerada no próprio navegador
                <img src={photo} alt="Pré-visualização da peça" className="h-full w-full object-cover" />
              ) : (
                <Garment
                  shape={shape}
                  colors={{
                    fabric: preview.fabric,
                    shade: preview.fabricShade,
                    line: preview.fabricLine,
                  }}
                  className="h-[76%] w-[76%]"
                />
              )}

              {photoBusy && (
                <div className="absolute inset-0 flex items-center justify-center bg-paper/70">
                  <Loader2 size={20} className="animate-spin" color="var(--graphite)" />
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-2">
              <label
                className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full px-4 font-sans text-[12px]"
                style={{ background: "var(--ink)", color: "var(--paper)" }}
              >
                <Camera size={15} strokeWidth={1.7} />
                {photo ? "Trocar foto" : "Escolher foto"}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
              </label>

              {photo && (
                <button
                  type="button"
                  onClick={() => setPhoto(undefined)}
                  className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full px-4 font-sans text-[12px]"
                  style={{ border: "1px solid var(--mist)", color: "var(--graphite)" }}
                >
                  <Trash2 size={14} strokeWidth={1.7} /> Remover
                </button>
              )}


              {photoError && (
                <p role="alert" className="font-sans text-[11px] text-blush-deep">
                  {photoError}
                </p>
              )}
            </div>
          </div>
        </Field>

        {/* ---------- identificação ---------- */}
        <Field label="Nome" htmlFor="item-name">
          <input
            id="item-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Camisa de linho branca"
            required
            className="w-full rounded-xl border bg-transparent px-3.5 py-3 font-sans text-[13px] text-ink placeholder:text-mist-strong"
            style={{ borderColor: "var(--mist)" }}
          />
        </Field>

        <Field label="Família">
          <ChipGroup
            options={CATEGORIES.map((c) => ({ value: c.id, label: c.long }))}
            value={category}
            onChange={(value) => {
              const next = value as CategoryId;
              setCategory(next);
              setShape(CATEGORY_SHAPE[next]);
            }}
          />
        </Field>

        <Field label="Tipo de peça">
          <ChipGroup
            options={SHAPE_OPTIONS[category]}
            value={shape}
            onChange={(value) => setShape(value as GarmentShape)}
          />
        </Field>

        <Field label="Cor" htmlFor="item-color">
          <input
            id="item-color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            placeholder="Ex.: Off-white"
            className="w-full rounded-xl border bg-transparent px-3.5 py-3 font-sans text-[13px] text-ink placeholder:text-mist-strong"
            style={{ borderColor: "var(--mist)" }}
          />
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
            {COLOR_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setColor(suggestion)}
                className="shrink-0 rounded-full px-3 py-1.5 font-sans text-[11px]"
                style={{
                  border: `1px solid ${color === suggestion ? "var(--ink)" : "var(--mist)"}`,
                  color: color === suggestion ? "var(--ink)" : "var(--graphite)",
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Estação">
          <ChipGroup
            options={SEASONS.map((s) => ({ value: s, label: s }))}
            value={season}
            onChange={setSeason}
          />
        </Field>

        <Field label="Formalidade / estilo">
          <ChipGroup
            options={FORMALITIES.map((f) => ({ value: f, label: f }))}
            value={formality}
            onChange={setFormality}
          />
        </Field>

        <Field label="Ocasiões" hint="opcional">
          <ChipGroup
            multiple
            options={OCCASIONS.map((o) => ({ value: o.id, label: o.label }))}
            values={occasions}
            onToggle={(value) =>
              setOccasions((prev) =>
                prev.includes(value as OccasionId)
                  ? prev.filter((id) => id !== value)
                  : [...prev, value as OccasionId],
              )
            }
          />
        </Field>

        <Field label="Nota de estilo" hint="opcional" htmlFor="item-note">
          <textarea
            id="item-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Como você gosta de usar essa peça?"
            className="w-full resize-none rounded-xl border bg-transparent px-3.5 py-3 font-sans text-[13px] leading-relaxed text-ink placeholder:text-mist-strong"
            style={{ borderColor: "var(--mist)" }}
          />
        </Field>

        {/* ---------- K Bazar ---------- */}
        <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: "var(--mist)" }}>
          <button
            type="button"
            role="switch"
            aria-checked={forBazaar}
            onClick={() => setForBazaar((value) => !value)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="font-serif text-[15px] text-ink">Disponível pro K Bazar</span>
            <span
              className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
              style={{ background: forBazaar ? "var(--ink)" : "var(--mist)" }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
                style={{ left: forBazaar ? 22 : 2 }}
              />
            </span>
          </button>

          {forBazaar && (
            <div className="fade-in mt-4 flex flex-col gap-4">
              <Field label="Preço" htmlFor="item-price" compact>
                <input
                  id="item-price"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  inputMode="decimal"
                  placeholder="Ex.: 45"
                  className="w-full rounded-xl border bg-transparent px-3.5 py-3 font-sans text-[13px] text-ink placeholder:text-mist-strong"
                  style={{ borderColor: "var(--mist)" }}
                />
              </Field>

              <Field label="Condição" compact>
                <ChipGroup
                  options={CONDITIONS.map((c) => ({ value: c, label: c }))}
                  value={condition}
                  onChange={setCondition}
                />
              </Field>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-4" style={{ borderTop: "1px solid var(--mist)" }}>
        <button
          type="submit"
          disabled={!canSave}
          className="w-full rounded-full py-3.5 font-sans text-[13px] tracking-wide transition-opacity"
          style={{ background: "var(--ink)", color: "var(--paper)", opacity: canSave ? 1 : 0.35 }}
        >
          Salvar peça
        </button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------
   Campos do formulário
   ------------------------------------------------------------------------- */

function Field({
  label,
  hint,
  htmlFor,
  compact,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  const Label = htmlFor ? "label" : "span";

  return (
    <div className={compact ? "" : "mt-6 first:mt-4"}>
      <Label
        htmlFor={htmlFor}
        className="mb-2 block font-sans text-[10px] uppercase tracking-[0.18em] text-graphite"
      >
        {label}
      </Label>
      {hint && <p className="-mt-1 mb-2 font-sans text-[11px] italic text-mist-strong">{hint}</p>}
      {children}
    </div>
  );
}

type Option = { value: string; label: string };

type ChipGroupProps =
  | { options: Option[]; value: string; onChange: (value: string) => void; multiple?: false; values?: never; onToggle?: never }
  | { options: Option[]; multiple: true; values: string[]; onToggle: (value: string) => void; value?: never; onChange?: never };

function ChipGroup(props: ChipGroupProps) {
  const isSelected = (value: string) =>
    props.multiple ? props.values.includes(value) : props.value === value;

  return (
    <div className="flex flex-wrap gap-2">
      {props.options.map((option) => {
        const active = isSelected(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() =>
              props.multiple ? props.onToggle(option.value) : props.onChange(option.value)
            }
            className="min-h-[38px] rounded-full px-3.5 font-sans text-[12px] transition-colors"
            style={{
              background: active ? "var(--ink)" : "transparent",
              color: active ? "var(--paper)" : "var(--graphite)",
              border: `1px solid ${active ? "var(--ink)" : "var(--mist)"}`,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Importação por link
   ------------------------------------------------------------------------- */

type Enriched = {
  bestImage: number;
  name?: string;
  category?: CategoryId;
  shape?: GarmentShape;
  color?: string;
  season?: string;
  formality?: string;
};

const LINK_ERRORS: Record<string, string> = {
  "invalid-url": "Link inválido.",
  unreachable: "Não consegui abrir esse link.",
  blocked: "Essa loja não abre por link. Segure a foto do produto, copie o endereço da imagem e cole aqui.",
};

/**
 * Pede à IA a melhor foto e os campos da peça. Falha silenciosa de propósito:
 * sem chave configurada ou com a API fora do ar, o cadastro segue manual.
 */
async function enrich(images: string[], title?: string): Promise<Enriched | null> {
  try {
    const response = await fetch("/api/import/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images, title }),
    });
    return response.ok ? ((await response.json()) as Enriched) : null;
  } catch {
    return null;
  }
}

/** Aceita "45", "45,90" ou "R$ 45" e devolve sempre no formato do app. */
function normalizePrice(raw: string): string {
  const trimmed = raw.trim();
  return /^r\$/i.test(trimmed) ? trimmed.replace(/^r\$\s*/i, "R$ ") : `R$ ${trimmed}`;
}
