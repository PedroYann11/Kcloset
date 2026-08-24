import { useEffect, useRef, useState } from "react";
import { Check, Eraser, RotateCcw, Shirt } from "lucide-react";
import { BackHeader } from "@/components/kcloset/ui/BackHeader";
import {
  boundingBox,
  compositeAlpha,
  computeAlphaMask,
  DEFAULT_TOLERANCE,
  eraseCircle,
  freshManualErase,
  sampleBackground,
  withAlpha,
  type RGB,
} from "@/lib/cutout";

type CutoutEditorProps = {
  sourceBlob: Blob;
  onConfirm: (blob: Blob, aspect: number) => void;
  onUseDrawing: () => void;
  onCancel: () => void;
};

/** Fundo quadriculado por trás de um recorte com transparência. Módulo, não
 * `useMemo`, porque o valor nunca muda; `BatchReviewScreen` reaproveita para
 * os cards da grade de revisão, mesmo visual do editor de recorte. */
export const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundImage: [
    "linear-gradient(45deg, var(--mist) 25%, transparent 25%)",
    "linear-gradient(-45deg, var(--mist) 25%, transparent 25%)",
    "linear-gradient(45deg, transparent 75%, var(--mist) 75%)",
    "linear-gradient(-45deg, transparent 75%, var(--mist) 75%)",
  ].join(", "),
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
  backgroundColor: "var(--paper-deep)",
};

/**
 * Recortar o fundo de uma foto: régua de tolerância, apagador manual, e três
 * saídas. É um passo de edição, não uma tela do app; fica pronto para a
 * grade de revisão do cadastro em lote reaproveitar a mesma peça depois.
 */
export function CutoutEditor({ sourceBlob, onConfirm, onUseDrawing, onCancel }: CutoutEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceDataRef = useRef<ImageData | null>(null);
  const backgroundRef = useRef<RGB | null>(null);
  const manualEraseRef = useRef<Uint8ClampedArray | null>(null);
  const lastAlphaRef = useRef<Uint8ClampedArray | null>(null);
  const erasingRef = useRef(false);

  const [tolerance, setTolerance] = useState(DEFAULT_TOLERANCE);
  const [eraserOn, setEraserOn] = useState(false);
  const [ready, setReady] = useState(false);
  const [emptyResult, setEmptyResult] = useState(false);

  // Carrega a foto uma vez, mede o fundo e prepara o primeiro recorte.
  useEffect(() => {
    let cancelled = false;
    const url = URL.createObjectURL(sourceBlob);
    const image = new Image();

    image.onload = () => {
      if (cancelled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(image, 0, 0);

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      sourceDataRef.current = data;
      backgroundRef.current = sampleBackground(data);
      manualEraseRef.current = freshManualErase(data.width * data.height);

      URL.revokeObjectURL(url);
      setReady(true);
    };
    image.src = url;

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [sourceBlob]);

  const redraw = () => {
    const canvas = canvasRef.current;
    const source = sourceDataRef.current;
    const background = backgroundRef.current;
    const manualErase = manualEraseRef.current;
    if (!canvas || !source || !background || !manualErase) return;

    const mask = computeAlphaMask(source, background, tolerance);
    const alpha = compositeAlpha(mask, manualErase);
    lastAlphaRef.current = alpha;

    const ctx = canvas.getContext("2d");
    ctx?.putImageData(withAlpha(source, alpha), 0, 0);

    setEmptyResult(boundingBox(alpha, source.width, source.height) === null);
  };

  // Redesenha sempre que a régua muda, e uma vez quando a foto termina de carregar.
  useEffect(() => {
    if (ready) redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redraw lê de refs, não precisa entrar na lista
  }, [ready, tolerance]);

  const brushRadius = () => {
    const source = sourceDataRef.current;
    if (!source) return 20;
    return Math.max(6, Math.round(Math.max(source.width, source.height) * 0.03));
  };

  const eraseAt = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const manualErase = manualEraseRef.current;
    const source = sourceDataRef.current;
    if (!canvas || !manualErase || !source) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

    eraseCircle(manualErase, source.width, source.height, x, y, brushRadius());
    redraw();
  };

  const clearManualErase = () => {
    const source = sourceDataRef.current;
    if (!source) return;
    manualEraseRef.current = freshManualErase(source.width * source.height);
    redraw();
  };

  const handleConfirm = () => {
    const source = sourceDataRef.current;
    const alpha = lastAlphaRef.current;
    if (!source || !alpha) return;

    const box = boundingBox(alpha, source.width, source.height);
    if (!box) return;

    const composited = withAlpha(source, alpha);
    const cropped = document.createElement("canvas");
    cropped.width = box.width;
    cropped.height = box.height;
    const ctx = cropped.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(composited, -box.x, -box.y);

    cropped.toBlob((blob) => {
      if (blob) onConfirm(blob, box.width / box.height);
    }, "image/png");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      <BackHeader title="Recortar fundo" onBack={onCancel} />

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{ ...CHECKERBOARD_STYLE, aspectRatio: "3 / 4" }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            style={{ touchAction: "none", cursor: eraserOn ? "crosshair" : "default" }}
            onPointerDown={(event) => {
              if (!eraserOn) return;
              erasingRef.current = true;
              eraseAt(event);
            }}
            onPointerMove={(event) => {
              if (!eraserOn || !erasingRef.current) return;
              eraseAt(event);
            }}
            onPointerUp={() => {
              erasingRef.current = false;
            }}
            onPointerLeave={() => {
              erasingRef.current = false;
            }}
          />
        </div>

        {emptyResult && (
          <p className="mt-2 font-sans text-[11.5px] italic text-blush-deep">
            Recorte vazio. Diminua a tolerância ou limpe o apagador.
          </p>
        )}

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-graphite">
              Tolerância
            </span>
            <span className="font-sans text-[11px] text-graphite">{tolerance}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={tolerance}
            onChange={(event) => setTolerance(Number(event.target.value))}
            className="mt-1.5 w-full"
            style={{ accentColor: "var(--blush-deep)" }}
            aria-label="Tolerância do recorte"
          />
        </div>

        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={() => setEraserOn((value) => !value)}
            aria-pressed={eraserOn}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 font-sans text-[12px] transition-colors"
            style={{
              background: eraserOn ? "var(--ink)" : "transparent",
              color: eraserOn ? "var(--paper)" : "var(--graphite)",
              border: `1px solid ${eraserOn ? "var(--ink)" : "var(--mist)"}`,
            }}
          >
            <Eraser size={14} strokeWidth={1.7} />
            Apagador
          </button>
          <button
            type="button"
            onClick={clearManualErase}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 font-sans text-[12px]"
            style={{ border: "1px solid var(--mist)", color: "var(--graphite)" }}
          >
            <RotateCcw size={14} strokeWidth={1.7} />
            Limpar apagador
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-6 py-4" style={{ borderTop: "1px solid var(--mist)" }}>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!ready || emptyResult}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 font-sans text-[13px] tracking-wide transition-opacity"
          style={{
            background: "var(--ink)",
            color: "var(--paper)",
            opacity: !ready || emptyResult ? 0.35 : 1,
          }}
        >
          <Check size={16} strokeWidth={1.8} />
          Usar recorte
        </button>
        <button
          type="button"
          onClick={onUseDrawing}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3 font-sans text-[12.5px]"
          style={{ color: "var(--graphite)" }}
        >
          <Shirt size={14} strokeWidth={1.7} />
          Usar desenho no lugar
        </button>
      </div>
    </div>
  );
}
