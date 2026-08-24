import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Shirt } from "lucide-react";
import { AddItemScreen } from "@/components/kcloset/AddItemScreen";
import { BackHeader } from "@/components/kcloset/ui/BackHeader";
import { CHECKERBOARD_STYLE } from "@/components/kcloset/ui/CutoutEditor";
import { CATEGORY_SHAPE, SHAPE_OPTIONS } from "@/components/icons/garments";
import { COLOR_SUGGESTIONS, FORMALITIES, SEASONS } from "@/data/seed-items";
import {
  boundingBox,
  computeAlphaMask,
  cropImageData,
  DEFAULT_TOLERANCE,
  findIslands,
  sampleBackground,
  withAlpha,
  type Box,
} from "@/lib/cutout";
import { compressImage } from "@/lib/image";
import type { CategoryId, GarmentShape, NewItemDraft } from "@/types";

/** O que veio da porta escolhida em `AddMethodScreen`. */
export type BatchInput = { mode: "photos"; files: File[] } | { mode: "split"; file: File };

type Candidate = {
  photoBlob: Blob | null;
  photoAspect: number;
  previewUrl: string | null;
  lowConfidence: boolean;
  included: boolean;
  /** Depois que a usuária edita uma peça na mão, a classificação em lote
   *  (que pode terminar depois) não pode mais sobrescrever o que ela fez. */
  edited: boolean;
  draft: Partial<NewItemDraft>;
};

type BatchReviewScreenProps = {
  input: BatchInput;
  onBack: () => void;
  onSaveAll: (items: { draft: NewItemDraft; photoBlob?: Blob }[]) => void;
};

/** Teto de peças por lote, tanto pra separar peças de uma foto quanto pra
 * classificar pela IA. Acima disso a tela avisa em vez de descartar sem dizer nada. */
const MAX_CANDIDATES = 10;

/**
 * Grade de revisão do cadastro em lote. Autocontida como `AddItemScreen`
 * já é hoje: recebe só a entrada da porta escolhida (fotos, ou a foto única
 * a separar) e o `onSaveAll` final, e resolve sozinha o recorte, a
 * classificação pela IA e a edição de cada candidato, sem `KclosetApp`
 * precisar saber de nada disso.
 */
export function BatchReviewScreen({ input, onBack, onSaveAll }: BatchReviewScreenProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [building, setBuilding] = useState(true);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [trimmed, setTrimmed] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const candidatesRef = useRef(candidates);
  candidatesRef.current = candidates;

  // Processa a entrada uma vez, na montagem, e dispara a classificação em
  // lote assim que os candidatos existem.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result =
          input.mode === "photos"
            ? await buildCandidatesFromPhotos(input.files)
            : await buildCandidatesFromSplit(input.file);

        if (cancelled) return;

        if (result.candidates.length === 0) {
          setBuildError(
            "Não encontrei nenhuma peça nessa foto. Tente com mais contraste entre a peça e o fundo.",
          );
          setBuilding(false);
          return;
        }

        setCandidates(result.candidates);
        setTrimmed(result.trimmed);
        setBuilding(false);
        setClassifying(true);

        const classified = await classifyBatch(
          result.candidates.map((candidate) => candidate.photoBlob).filter((blob): blob is Blob => blob !== null),
        );
        if (cancelled) return;

        if (classified) {
          setCandidates((prev) =>
            prev.map((candidate, index) =>
              candidate.edited ? candidate : { ...candidate, draft: toDraft(classified[index]) },
            ),
          );
        }
        setClassifying(false);
      } catch {
        if (!cancelled) {
          setBuildError("Não foi possível processar essa foto.");
          setBuilding(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roda uma vez só, a partir da entrada recebida na montagem
  }, []);

  // Libera todas as pré-visualizações ao sair da tela.
  useEffect(() => {
    return () => {
      candidatesRef.current.forEach((candidate) => {
        if (candidate.previewUrl) URL.revokeObjectURL(candidate.previewUrl);
      });
    };
  }, []);

  const toggleIncluded = (index: number) => {
    setCandidates((prev) =>
      prev.map((candidate, i) => (i === index ? { ...candidate, included: !candidate.included } : candidate)),
    );
  };

  const handleCandidateSave = (index: number, draft: NewItemDraft, photoBlob?: Blob) => {
    setCandidates((prev) =>
      prev.map((candidate, i) => {
        if (i !== index) return candidate;

        const nextBlob = photoBlob ?? null;
        if (nextBlob === candidate.photoBlob) {
          return { ...candidate, draft, edited: true };
        }

        if (candidate.previewUrl) URL.revokeObjectURL(candidate.previewUrl);
        return {
          ...candidate,
          draft,
          edited: true,
          photoBlob: nextBlob,
          photoAspect: draft.photoAspect ?? candidate.photoAspect,
          previewUrl: nextBlob ? URL.createObjectURL(nextBlob) : null,
          lowConfidence: false,
        };
      }),
    );
    setEditingIndex(null);
  };

  const handleSaveAll = () => {
    const items = candidates
      .filter((candidate) => candidate.included)
      .map((candidate) => ({
        draft: finalizeDraft(candidate),
        photoBlob: candidate.photoBlob ?? undefined,
      }));
    onSaveAll(items);
  };

  const includedCount = candidates.filter((candidate) => candidate.included).length;
  const editing = editingIndex !== null ? candidates[editingIndex] : null;

  return (
    <>
      <div className="flex flex-1 flex-col" inert={editingIndex !== null}>
        <BackHeader title="Revisar peças" onBack={onBack} />

        {building && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
            <Loader2 size={22} className="animate-spin" color="var(--graphite)" />
            <p className="font-sans text-[12px] text-graphite">Separando as peças da foto</p>
          </div>
        )}

        {!building && buildError && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="font-sans text-[13px] text-blush-deep">{buildError}</p>
            <button type="button" onClick={onBack} className="font-sans text-[12.5px] text-graphite underline">
              Voltar
            </button>
          </div>
        )}

        {!building && !buildError && (
          <>
            <div className="flex-1 overflow-y-auto pb-4">
              {trimmed && (
                <p className="px-6 pb-1 pt-4 font-sans text-[11px] italic text-mist-strong">
                  Só as primeiras {MAX_CANDIDATES} peças entraram nesse lote.
                </p>
              )}
              <p className="px-6 pb-3 pt-4 font-sans text-[10px] uppercase tracking-[0.18em] text-graphite">
                {candidates.length} {candidates.length === 1 ? "peça encontrada" : "peças encontradas"}
              </p>

              <div className="grid grid-cols-2 gap-3 px-6">
                {candidates.map((candidate, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingIndex(index)}
                      aria-label="Editar peça"
                      className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl"
                      style={{
                        ...CHECKERBOARD_STYLE,
                        outline: candidate.lowConfidence ? "2px solid var(--blush-deep)" : "none",
                        outlineOffset: -2,
                      }}
                    >
                      {candidate.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- object URL gerada no próprio navegador
                        <img src={candidate.previewUrl} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Shirt size={26} strokeWidth={1.5} color="var(--mist-strong)" />
                        </div>
                      )}

                      {classifying && !candidate.draft.name && (
                        <div className="absolute inset-0 flex items-center justify-center bg-paper/60">
                          <Loader2 size={18} className="animate-spin" color="var(--graphite)" />
                        </div>
                      )}
                    </button>

                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={candidate.included}
                        aria-label="Incluir no lote"
                        onClick={() => toggleIncluded(index)}
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                        style={{
                          borderColor: candidate.included ? "var(--ink)" : "var(--mist)",
                          background: candidate.included ? "var(--ink)" : "transparent",
                        }}
                      >
                        {candidate.included && <Check size={12} color="var(--paper)" strokeWidth={2.4} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingIndex(index)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate font-sans text-[12px] text-ink">
                          {candidate.draft.name || "Toque para nomear"}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4" style={{ borderTop: "1px solid var(--mist)" }}>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={includedCount === 0}
                className="w-full rounded-full py-3.5 font-sans text-[13px] tracking-wide transition-opacity"
                style={{
                  background: "var(--ink)",
                  color: "var(--paper)",
                  opacity: includedCount === 0 ? 0.35 : 1,
                }}
              >
                Adicionar {includedCount} {includedCount === 1 ? "peça" : "peças"}
              </button>
            </div>
          </>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex flex-col bg-paper">
          <AddItemScreen
            key={editingIndex}
            initialDraft={editing.draft}
            initialPhoto={
              editing.photoBlob ? { blob: editing.photoBlob, aspect: editing.photoAspect } : undefined
            }
            onBack={() => setEditingIndex(null)}
            onSave={(draft, photoBlob) => handleCandidateSave(editingIndex as number, draft, photoBlob)}
          />
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------
   Processamento de imagem
   ------------------------------------------------------------------------- */

/** Proporção mínima de pixel visível dentro da própria caixa pra um recorte
 * contar como confiável. Abaixo disso, provavelmente sobrou ruído em vez de
 * peça (sombra, dobra do tecido, ou a peça ficou cortada). */
const MIN_FILL_RATIO = 0.22;

async function buildCandidatesFromPhotos(files: File[]): Promise<{ candidates: Candidate[]; trimmed: boolean }> {
  const trimmed = files.length > MAX_CANDIDATES;
  const limited = files.slice(0, MAX_CANDIDATES);

  const candidates: Candidate[] = [];
  for (const file of limited) {
    try {
      const compressed = await compressImage(file);
      const data = await toImageData(compressed.blob);
      const background = sampleBackground(data);
      const mask = computeAlphaMask(data, background, DEFAULT_TOLERANCE);
      const box = boundingBox(mask, data.width, data.height);
      if (!box) continue;

      const boxAlpha = cropMask(mask, data.width, box);
      const finalData = withAlpha(cropImageData(data, box), boxAlpha);
      const photoBlob = await imageDataToBlob(finalData);

      candidates.push({
        photoBlob,
        photoAspect: box.width / box.height,
        previewUrl: URL.createObjectURL(photoBlob),
        lowConfidence: isLowConfidence(boxAlpha, box, data.width, data.height),
        included: true,
        edited: false,
        draft: {},
      });
    } catch {
      // uma foto ruim não derruba o lote inteiro, só fica de fora
    }
  }

  return { candidates, trimmed };
}

async function buildCandidatesFromSplit(file: File): Promise<{ candidates: Candidate[]; trimmed: boolean }> {
  const compressed = await compressImage(file);
  const data = await toImageData(compressed.blob);
  const background = sampleBackground(data);
  const islands = findIslands(data, background, DEFAULT_TOLERANCE);

  const trimmed = islands.length > MAX_CANDIDATES;
  const limited = islands.slice(0, MAX_CANDIDATES);

  const candidates: Candidate[] = [];
  for (const island of limited) {
    const finalData = withAlpha(cropImageData(data, island.box), island.alpha);
    const photoBlob = await imageDataToBlob(finalData);

    candidates.push({
      photoBlob,
      photoAspect: island.box.width / island.box.height,
      previewUrl: URL.createObjectURL(photoBlob),
      lowConfidence: isLowConfidence(island.alpha, island.box, data.width, data.height),
      included: true,
      edited: false,
      draft: {},
    });
  }

  return { candidates, trimmed };
}

/** Caixa encostando na borda da foto original (peça cortada) ou pixel
 * visível de menos dentro da própria caixa (recorte esvaziado ou ruído). */
function isLowConfidence(boxAlpha: Uint8ClampedArray, box: Box, sourceWidth: number, sourceHeight: number): boolean {
  const touchesEdge =
    box.x <= 0 || box.y <= 0 || box.x + box.width >= sourceWidth || box.y + box.height >= sourceHeight;

  let opaque = 0;
  for (let i = 0; i < boxAlpha.length; i++) if (boxAlpha[i] > 16) opaque++;
  const fillRatio = boxAlpha.length > 0 ? opaque / boxAlpha.length : 0;

  return touchesEdge || fillRatio < MIN_FILL_RATIO;
}

/** Recorta uma máscara (array do tamanho da imagem inteira) pela mesma
 * caixa que `cropImageData` usa, pra combinar os dois com `withAlpha`. */
function cropMask(mask: Uint8ClampedArray, width: number, box: Box): Uint8ClampedArray {
  const out = new Uint8ClampedArray(box.width * box.height);
  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      out[y * box.width + x] = mask[(box.y + y) * width + (box.x + x)];
    }
  }
  return out;
}

function toImageData(blob: Blob): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);

      if (!ctx) {
        reject(new Error("Sem contexto de canvas neste navegador."));
        return;
      }
      ctx.drawImage(image, 0, 0);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível abrir essa foto."));
    };
    image.src = url;
  });
}

function imageDataToBlob(data: ImageData): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = data.width;
    canvas.height = data.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Sem contexto de canvas neste navegador."));
      return;
    }
    ctx.putImageData(data, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Não foi possível gerar a imagem."));
    }, "image/png");
  });
}

/* -------------------------------------------------------------------------
   Classificação em lote
   ------------------------------------------------------------------------- */

type Classified = {
  name?: string;
  category?: CategoryId;
  shape?: GarmentShape;
  fullBody?: boolean;
  color?: string;
  season?: string;
  formality?: string;
};

/**
 * Pede à IA nome e família de cada peça já recortada, na mesma ordem.
 * Falha silenciosa de propósito: sem chave configurada ou com a API fora do
 * ar, a grade continua funcionando, só sem sugestão nenhuma.
 */
async function classifyBatch(blobs: Blob[]): Promise<Classified[] | null> {
  if (blobs.length === 0) return null;
  try {
    const images = await Promise.all(blobs.map(blobToDataUrl));
    const response = await fetch("/api/import/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    });
    return response.ok ? ((await response.json()) as Classified[]) : null;
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(blob);
  });
}

function toDraft(classified: Classified | undefined): Partial<NewItemDraft> {
  if (!classified) return {};
  return {
    name: classified.name,
    category: classified.category,
    shape: classified.shape,
    fullBody: classified.fullBody,
    color: classified.color,
    season: classified.season,
    formality: classified.formality,
  };
}

/* -------------------------------------------------------------------------
   Rascunho final
   ------------------------------------------------------------------------- */

/**
 * Preenche todo campo obrigatório que a classificação (ou a usuária) deixou
 * de fora, com os mesmos padrões que o resto do app já usa. Sem nome
 * nenhum, o nome nasce do tipo mais a cor, igual ao catálogo rápido já faz.
 */
function finalizeDraft(candidate: Candidate): NewItemDraft {
  const category = candidate.draft.category ?? "tops";
  const shape = candidate.draft.shape ?? CATEGORY_SHAPE[category];
  const color = candidate.draft.color?.trim() || COLOR_SUGGESTIONS[0];
  const shapeLabel = SHAPE_OPTIONS[category].find((option) => option.value === shape)?.label.split(" / ")[0];

  return {
    name: candidate.draft.name?.trim() || `${shapeLabel ?? "Peça"} · ${color}`,
    category,
    shape,
    fullBody: candidate.draft.fullBody ?? shape === "vestido",
    color,
    season: candidate.draft.season ?? SEASONS[0],
    formality: candidate.draft.formality ?? FORMALITIES[0],
    occasions: candidate.draft.occasions ?? [],
    note: candidate.draft.note ?? "",
    photoAspect: candidate.photoAspect,
    forBazaar: candidate.draft.forBazaar ?? false,
    price: candidate.draft.price,
    condition: candidate.draft.condition,
  };
}
