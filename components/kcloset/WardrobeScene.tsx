import { useMemo } from "react";
import { Garment, GARMENT_BOX, Hanger } from "@/components/icons/garments";
import { categoryLong } from "@/data/seed-items";
import type { CategoryId, DecoratedItem } from "@/types";

/* -------------------------------------------------------------------------
   Geometria do móvel, tudo em unidades do viewBox abaixo.

   O móvel é laqueado claro, como o da referência: duas hastes na bay da
   esquerda (roupas de cima em cima, roupas de baixo embaixo), calçados no
   chão e uma coluna à direita com prateleiras, acessórios e gavetas.

   A carcaça é SVG; as peças que dão para tocar são <button> de HTML
   posicionados por cima em porcentagem, então cada peça é um elemento focável
   de verdade, com aria-label.
   ------------------------------------------------------------------------- */

const VB = { w: 320, h: 420 };

const CASE = { x: 12, y: 16, w: 296, h: 356 };
const INTERIOR = { x: 26, y: 30, w: 268, h: 322 }; // 30..352
const LEFT = { x: 26, w: 160 }; // 26..186
const RIGHT = { x: 194, w: 100 }; // 194..294
const FLOOR_Y = 344;

/** Haste de cima (roupas de cima) e haste de baixo (roupas de baixo). */
const RAIL_TOP = { y: 60, x: 32, w: 148 };
const RAIL_BOTTOM = { y: 176, x: 32, w: 148 };

const HANG = { width: 40, hangerH: 20 };

/** Inclinação de cada cabide, porque roupa pendurada nunca fica reta. */
const TILT = [-2.6, 1.8, -1.4, 2.4, -2];

const SHOE = { width: 46, pitch: 50, boxHeight: 40 };

/** Prateleiras da coluna direita: y da tábua em que a peça se apoia. */
const SHELVES = [104, 168];
const DRAWERS = { x: 200, y: 226, w: 88, h: 74 };

type WardrobeSceneProps = {
  open: boolean;
  onToggle: () => void;
  onCategory: (category: CategoryId) => void;
  items: DecoratedItem[];
};

export function WardrobeScene({ open, onToggle, onCategory, items }: WardrobeSceneProps) {
  const { tops, bottoms, shoes, accessories, folded } = useMemo(() => pickDisplay(items), [items]);

  return (
    <div className="relative w-full" style={{ aspectRatio: `${VB.w} / ${VB.h}` }}>
      {/* ---------- móvel: carcaça, hastes, prateleiras, gavetas ---------- */}
      <svg
        viewBox={`0 0 ${VB.w} ${VB.h}`}
        className="absolute inset-0 z-0 h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        <SceneDefs />

        {/* sombra de chão */}
        <ellipse cx="160" cy="392" rx="136" ry="12" fill="#000" opacity="0.5" filter="url(#kc-blur-lg)" />

        {/* pés */}
        <rect x="30" y="372" width="26" height="10" rx="2" fill="var(--case-line)" />
        <rect x="264" y="372" width="26" height="10" rx="2" fill="var(--case-line)" />

        {/* carcaça */}
        <rect
          x={CASE.x}
          y={CASE.y}
          width={CASE.w}
          height={CASE.h}
          rx="6"
          fill="url(#kc-case)"
          stroke="var(--case-line)"
          strokeWidth="1.1"
        />

        {/* fundo do interior */}
        <rect x={INTERIOR.x} y={INTERIOR.y} width={INTERIOR.w} height={INTERIOR.h} fill="url(#kc-inner)" />

        {/* luz acesa lá dentro, só quando as portas abrem */}
        <g style={{ opacity: open ? 1 : 0, transition: "opacity 520ms ease 280ms" }}>
          <rect x={INTERIOR.x} y={INTERIOR.y} width={INTERIOR.w} height="180" fill="url(#kc-light)" />
          <ellipse cx="106" cy={FLOOR_Y - 4} rx="78" ry="16" fill="url(#kc-pool)" />
        </g>

        {/* montante entre a bay de pendurar e a coluna lateral */}
        <rect x="186" y={INTERIOR.y} width="8" height={INTERIOR.h} fill="url(#kc-panel)" />
        <line x1="186.5" y1={INTERIOR.y} x2="186.5" y2={INTERIOR.y + INTERIOR.h} stroke="#0000001f" strokeWidth="1" />

        {/* hastes */}
        <Rail rail={RAIL_TOP} />
        <Rail rail={RAIL_BOTTOM} />

        {/* tábua de apoio dos calçados */}
        <rect x={LEFT.x} y={FLOOR_Y} width={LEFT.w} height="8" fill="url(#kc-shelf)" />
        <line x1={LEFT.x} y1={FLOOR_Y} x2={LEFT.x + LEFT.w} y2={FLOOR_Y} stroke="var(--case-line)" strokeWidth="0.8" />

        {/* prateleiras da coluna direita */}
        {SHELVES.map((y) => (
          <g key={y}>
            <rect x={RIGHT.x} y={y} width={RIGHT.w} height="6" rx="1.5" fill="url(#kc-shelf)" />
            <rect x={RIGHT.x} y={y + 6} width={RIGHT.w} height="3" fill="#00000018" />
          </g>
        ))}

        {/* gavetas */}
        <g>
          <rect x={DRAWERS.x} y={DRAWERS.y} width={DRAWERS.w} height={DRAWERS.h / 2 - 2} rx="3" fill="url(#kc-drawer)" stroke="var(--case-line)" strokeWidth="0.8" />
          <rect x={DRAWERS.x} y={DRAWERS.y + DRAWERS.h / 2 + 2} width={DRAWERS.w} height={DRAWERS.h / 2 - 2} rx="3" fill="url(#kc-drawer)" stroke="var(--case-line)" strokeWidth="0.8" />
          <rect x={DRAWERS.x + 26} y={DRAWERS.y + 15} width="36" height="3.4" rx="1.7" fill="url(#kc-metal)" />
          <rect x={DRAWERS.x + 26} y={DRAWERS.y + DRAWERS.h / 2 + 17} width="36" height="3.4" rx="1.7" fill="url(#kc-metal)" />
        </g>

        {/* rodapé interno da coluna direita */}
        <rect x={RIGHT.x} y={FLOOR_Y} width={RIGHT.w} height="8" fill="url(#kc-shelf)" />

        {/* vinheta interna, para o fundo não ficar chapado */}
        <rect
          x={INTERIOR.x}
          y={INTERIOR.y}
          width={INTERIOR.w}
          height={INTERIOR.h}
          fill="url(#kc-vignette)"
          style={{ mixBlendMode: "multiply" }}
        />
      </svg>

      {/* ---------- alvo grande para abrir/fechar ---------- */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? "Fechar guarda-roupa" : "Abrir guarda-roupa"}
        className="absolute inset-0 z-10 rounded-[10px] transition-transform active:scale-[0.99]"
      />

      {/* ---------- roupas ---------- */}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transition: open
            ? "opacity 460ms ease 260ms, visibility 0s linear 260ms"
            : "opacity 200ms ease, visibility 0s linear 200ms",
        }}
      >
        {tops.map((item, i) => (
          <Hanging
            key={item.id}
            item={item}
            rail={RAIL_TOP}
            index={i}
            total={tops.length}
            onClick={() => onCategory("tops")}
          />
        ))}

        {bottoms.map((item, i) => (
          <Hanging
            key={item.id}
            item={item}
            rail={RAIL_BOTTOM}
            index={i}
            total={bottoms.length}
            onClick={() => onCategory("bottoms")}
          />
        ))}

        {shoes.map((item, i) => (
          <OnFloor
            key={item.id}
            item={item}
            index={i}
            total={shoes.length}
            onClick={() => onCategory("calcados")}
          />
        ))}

        {accessories.map((item, i) => (
          <OnShelf key={item.id} item={item} shelfY={SHELVES[i]} onClick={() => onCategory("acessorios")} />
        ))}

        {folded.length > 0 && (
          <FoldedStack items={folded} onClick={() => onCategory("bottoms")} />
        )}
      </div>

      {/* ---------- portas ---------- */}
      <svg
        viewBox={`0 0 ${VB.w} ${VB.h}`}
        className="pointer-events-none absolute inset-0 z-30 h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        <g clipPath="url(#kc-carcass)">
          <Door side="left" open={open} />
          <Door side="right" open={open} />

          {/* fresta entre as portas fechadas */}
          <g
            className={open ? undefined : "seam-breath"}
            style={{ opacity: open ? 0 : 1, transition: "opacity 300ms ease" }}
          >
            <rect x="152" y="20" width="16" height="348" fill="url(#kc-seam)" filter="url(#kc-blur-sm)" />
            <rect x="159.4" y="24" width="1.2" height="340" fill="#fff" opacity="0.75" />
          </g>
        </g>

        {/* moldura frontal, com as portas correndo por trás dela */}
        <rect
          x={CASE.x + 0.6}
          y={CASE.y + 0.6}
          width={CASE.w - 1.2}
          height={CASE.h - 1.2}
          rx="6"
          fill="none"
          stroke="var(--case-line)"
          strokeWidth="1.2"
        />
        <path
          d={`M${CASE.x} ${CASE.y} H${CASE.x + CASE.w} V${INTERIOR.y} H${CASE.x} Z
              M${CASE.x} ${INTERIOR.y + INTERIOR.h} H${CASE.x + CASE.w} V${CASE.y + CASE.h} H${CASE.x} Z
              M${CASE.x} ${CASE.y} H${INTERIOR.x} V${CASE.y + CASE.h} H${CASE.x} Z
              M${INTERIOR.x + INTERIOR.w} ${CASE.y} H${CASE.x + CASE.w} V${CASE.y + CASE.h} H${INTERIOR.x + INTERIOR.w} Z`}
          fill="url(#kc-frame)"
        />
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Haste
   ------------------------------------------------------------------------- */

function Rail({ rail }: { rail: { x: number; y: number; w: number } }) {
  return (
    <g>
      <rect x={rail.x - 4} y={rail.y - 7} width="6" height="14" rx="2" fill="url(#kc-metal)" />
      <rect x={rail.x + rail.w - 2} y={rail.y - 7} width="6" height="14" rx="2" fill="url(#kc-metal)" />
      <rect x={rail.x} y={rail.y - 1.6} width={rail.w} height="3.2" rx="1.6" fill="url(#kc-metal)" />
      <rect x={rail.x} y={rail.y - 1.4} width={rail.w} height="0.9" rx="0.45" fill="#fff" opacity="0.5" />
    </g>
  );
}

/* -------------------------------------------------------------------------
   Peça pendurada
   ------------------------------------------------------------------------- */

type HangingProps = {
  item: DecoratedItem;
  rail: { x: number; y: number; w: number };
  index: number;
  total: number;
  onClick: () => void;
};

function Hanging({ item, rail, index, total, onClick }: HangingProps) {
  const pitch = total > 1 ? (rail.w - HANG.width) / (total - 1) : 0;
  const x = rail.x + index * pitch;

  const box = GARMENT_BOX[item.drawing] ?? GARMENT_BOX.blusa;
  // Peça com foto usa caixa retrato fixa; sem foto, a altura vem da proporção
  // real do desenho, que é o que faz a calça descer mais que o top.
  const bodyH = item.photo ? HANG.width * 1.3 : (HANG.width * box.h) / box.w;
  const totalH = HANG.hangerH + bodyH;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver ${categoryLong(item.category)}, ${item.name}`}
      className="pointer-events-auto absolute flex flex-col items-center transition-transform duration-300 ease-soft hover:-translate-y-[2px]"
      style={{
        left: pct(x, VB.w),
        top: pct(rail.y - HANG.hangerH + 6, VB.h),
        width: pct(HANG.width, VB.w),
        height: pct(totalH, VB.h),
        transform: `rotate(${TILT[index % TILT.length]}deg)`,
        transformOrigin: "50% 8%",
      }}
    >
      <span
        className="flex w-full items-end justify-center"
        style={{ height: `${(HANG.hangerH / totalH) * 100}%` }}
      >
        <Hanger className="w-[72%]" color="var(--metal-deep)" strokeWidth={2.6} />
      </span>

      <span className="relative block w-full" style={{ height: `${(bodyH / totalH) * 100}%` }}>
        {item.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL do localStorage
          <img
            src={item.photo}
            alt=""
            className="h-full w-full rounded-[4px] object-cover shadow-[0_8px_16px_rgba(0,0,0,0.28)]"
          />
        ) : (
          <Garment
            shape={item.drawing}
            colors={{ fabric: item.fabric, shade: item.fabricShade, line: item.fabricLine }}
            className="h-full w-full drop-shadow-[0_5px_8px_rgba(0,0,0,0.25)]"
          />
        )}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------
   Calçado no chão do móvel
   ------------------------------------------------------------------------- */

function OnFloor({
  item,
  index,
  total,
  onClick,
}: {
  item: DecoratedItem;
  index: number;
  total: number;
  onClick: () => void;
}) {
  const span = SHOE.width + (total - 1) * SHOE.pitch;
  const x = LEFT.x + (LEFT.w - span) / 2 + index * SHOE.pitch;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver Calçados, ${item.name}`}
      className="pointer-events-auto absolute flex flex-col justify-end transition-transform duration-300 ease-soft hover:-translate-y-[2px]"
      style={{
        left: pct(x, VB.w),
        top: pct(FLOOR_Y - SHOE.boxHeight, VB.h),
        width: pct(SHOE.width, VB.w),
        height: pct(SHOE.boxHeight, VB.h),
        transform: `rotate(${index % 2 === 0 ? -1.4 : 1.2}deg)`,
      }}
    >
      {item.photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL do localStorage
        <img src={item.photo} alt="" className="h-[74%] w-full rounded-[4px] object-cover" />
      ) : (
        <Garment
          shape={item.drawing}
          colors={{ fabric: item.fabric, shade: item.fabricShade, line: item.fabricLine }}
          className="w-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)]"
          style={{ height: "auto" }}
        />
      )}
      <span
        aria-hidden="true"
        className="mt-[4%] block h-[7%] w-[84%] self-center rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(0,0,0,0.35), transparent 72%)" }}
      />
    </button>
  );
}

/* -------------------------------------------------------------------------
   Acessório na prateleira
   ------------------------------------------------------------------------- */

function OnShelf({
  item,
  shelfY,
  onClick,
}: {
  item: DecoratedItem;
  shelfY: number;
  onClick: () => void;
}) {
  const box = GARMENT_BOX[item.drawing] ?? GARMENT_BOX.bolsa;
  const width = 54;
  const height = item.photo ? width * 1.1 : (width * box.h) / box.w;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver Acessórios, ${item.name}`}
      className="pointer-events-auto absolute transition-transform duration-300 ease-soft hover:-translate-y-[2px]"
      style={{
        left: pct(RIGHT.x + (RIGHT.w - width) / 2, VB.w),
        top: pct(shelfY - height, VB.h),
        width: pct(width, VB.w),
        height: pct(height, VB.h),
      }}
    >
      {item.photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL do localStorage
        <img src={item.photo} alt="" className="h-full w-full rounded-[4px] object-cover" />
      ) : (
        <Garment
          shape={item.drawing}
          colors={{ fabric: item.fabric, shade: item.fabricShade, line: item.fabricLine }}
          className="h-full w-full drop-shadow-[0_4px_7px_rgba(0,0,0,0.25)]"
        />
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------
   Pilha de roupa dobrada, em cima das gavetas
   ------------------------------------------------------------------------- */

function FoldedStack({ items, onClick }: { items: DecoratedItem[]; onClick: () => void }) {
  const width = 72;
  const layerH = 9;
  const height = items.length * layerH;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ver Roupas de baixo, peças dobradas"
      className="pointer-events-auto absolute flex flex-col justify-end transition-transform duration-300 ease-soft hover:-translate-y-[2px]"
      style={{
        left: pct(RIGHT.x + (RIGHT.w - width) / 2, VB.w),
        top: pct(DRAWERS.y - height - 4, VB.h),
        width: pct(width, VB.w),
        height: pct(height, VB.h),
      }}
    >
      {items.map((item, i) => (
        <span
          key={item.id}
          className="block w-full rounded-[3px]"
          style={{
            height: `${100 / items.length}%`,
            background: item.fabric,
            borderTop: `1px solid ${item.fabricLine}33`,
            boxShadow: i === 0 ? "0 -2px 5px rgba(0,0,0,0.14)" : undefined,
            transform: `translateX(${(i % 2 === 0 ? -1 : 1) * 1.5}px)`,
          }}
        />
      ))}
    </button>
  );
}

/* -------------------------------------------------------------------------
   Portas
   ------------------------------------------------------------------------- */

function Door({ side, open }: { side: "left" | "right"; open: boolean }) {
  const isLeft = side === "left";
  const x = isLeft ? 13 : 160;
  const panelX = isLeft ? 26 : 173;
  const handleX = isLeft ? 150 : 165;

  return (
    <g
      style={{
        transform: `translateX(${open ? (isLeft ? -150 : 150) : 0}px)`,
        transition: "transform 660ms cubic-bezier(.65,0,.35,1)",
      }}
    >
      <rect x={x} y="17" width="147" height="354" rx="5" fill={`url(#kc-door-${side})`} />

      {/* almofadas rasas, no espírito do móvel laqueado */}
      <DoorPanel x={panelX} y={34} w={121} h={186} />
      <DoorPanel x={panelX} y={232} w={121} h={122} />

      {/* puxador vertical de metal escovado */}
      <rect x={handleX} y="176" width="4.4" height="60" rx="2.2" fill="url(#kc-metal)" />
      <rect x={handleX + 0.9} y="180" width="1.1" height="52" rx="0.55" fill="#fff" opacity="0.55" />

      <rect x={x} y="17" width="147" height="354" rx="5" fill="url(#kc-sheen)" />
    </g>
  );
}

function DoorPanel({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx="3" fill="#00000010" />
      <rect
        x={x + 3}
        y={y + 3}
        width={w - 6}
        height={h - 6}
        rx="2.5"
        fill="url(#kc-door-panel)"
        stroke="#00000018"
        strokeWidth="0.8"
      />
      <path
        d={`M${x + 3} ${y + h - 3} V${y + 3} H${x + w - 3}`}
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.55"
        strokeWidth="0.9"
      />
    </>
  );
}

/* -------------------------------------------------------------------------
   Gradientes e filtros
   ------------------------------------------------------------------------- */

function SceneDefs() {
  return (
    <defs>
      <linearGradient id="kc-case" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--case-face)" />
        <stop offset="100%" stopColor="var(--case-face-2)" />
      </linearGradient>
      <linearGradient id="kc-door-left" x1="0" y1="0" x2="1" y2="0.6">
        <stop offset="0%" stopColor="#f6f3ef" />
        <stop offset="70%" stopColor="var(--case-face)" />
        <stop offset="100%" stopColor="var(--case-face-2)" />
      </linearGradient>
      <linearGradient id="kc-door-right" x1="1" y1="0" x2="0" y2="0.6">
        <stop offset="0%" stopColor="#f6f3ef" />
        <stop offset="70%" stopColor="var(--case-face)" />
        <stop offset="100%" stopColor="var(--case-face-2)" />
      </linearGradient>
      <linearGradient id="kc-door-panel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--case-face)" />
        <stop offset="100%" stopColor="var(--case-face-2)" />
      </linearGradient>
      <linearGradient id="kc-frame" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--case-face)" />
        <stop offset="100%" stopColor="var(--case-edge)" />
      </linearGradient>
      <linearGradient id="kc-panel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="var(--case-edge)" />
        <stop offset="100%" stopColor="var(--case-face-2)" />
      </linearGradient>
      <linearGradient id="kc-shelf" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--case-face)" />
        <stop offset="100%" stopColor="var(--case-edge)" />
      </linearGradient>
      <linearGradient id="kc-drawer" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--case-face)" />
        <stop offset="100%" stopColor="var(--case-face-2)" />
      </linearGradient>
      <linearGradient id="kc-inner" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--case-inner)" />
        <stop offset="70%" stopColor="var(--case-inner-deep)" />
        <stop offset="100%" stopColor="#c2b9ae" />
      </linearGradient>
      <linearGradient id="kc-light" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="55%" stopColor="#ffffff" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="kc-sheen" x1="0" y1="0" x2="1" y2="0.4">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
        <stop offset="45%" stopColor="#ffffff" stopOpacity="0.05" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
      </linearGradient>
      <linearGradient id="kc-seam" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="kc-metal" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="var(--metal-deep)" />
        <stop offset="45%" stopColor="#e6e3df" />
        <stop offset="70%" stopColor="var(--metal)" />
        <stop offset="100%" stopColor="var(--metal-deep)" />
      </linearGradient>

      <radialGradient id="kc-pool">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="kc-vignette" cx="0.5" cy="0.3" r="0.85">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="62%" stopColor="#efeae4" />
        <stop offset="100%" stopColor="#c9c1b7" />
      </radialGradient>

      <filter id="kc-blur-sm" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.4" />
      </filter>
      <filter id="kc-blur-lg" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="8" />
      </filter>

      <clipPath id="kc-carcass">
        <rect x={CASE.x + 1} y={CASE.y + 1} width={CASE.w - 2} height={CASE.h - 2} rx="5" />
      </clipPath>
    </defs>
  );
}

/* -------------------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------------------- */

const pct = (value: number, total: number) => `${(value / total) * 100}%`;

/**
 * Escolhe o que aparece no móvel.
 * Quando existe peça com foto, ela ganha o lugar: o guarda-roupa passa a
 * mostrar a roupa de verdade da usuária em vez do desenho.
 */
function pickDisplay(items: DecoratedItem[]) {
  const withPhotoFirst = (list: DecoratedItem[]) =>
    [...list].sort((a, b) => Number(Boolean(b.photo)) - Number(Boolean(a.photo)));

  const family = (category: CategoryId) =>
    withPhotoFirst(items.filter((item) => item.category === category));

  const bottoms = family("bottoms");

  return {
    tops: family("tops").slice(0, 4),
    bottoms: bottoms.slice(0, 4),
    shoes: family("calcados").slice(0, 3),
    accessories: family("acessorios").slice(0, SHELVES.length),
    // as peças que sobraram viram a pilha dobrada em cima das gavetas
    folded: bottoms.slice(4, 8),
  };
}
