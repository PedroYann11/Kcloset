import type { CSSProperties, JSX } from "react";
import type { AccessoryGroup, CategoryId, GarmentShape } from "@/types";

/**
 * Desenho das peças.
 *
 * Não são ícones de contorno: cada peça é uma silhueta preenchida com o tom do
 * tecido, uma dobra mais fechada e um fio de contorno. É o que faz o
 * guarda-roupa parecer cheio de roupa de verdade em vez de cheio de ícones.
 *
 * Cada forma tem sua própria caixa de desenho, e a proporção dessa caixa é o
 * que dá comprimentos diferentes na haste: a calça desce, o top não.
 */

export type GarmentColors = {
  fabric: string;
  shade: string;
  line: string;
};

export type GarmentProps = {
  shape: GarmentShape;
  colors: GarmentColors;
  className?: string;
  style?: CSSProperties;
};

/** Caixa de desenho de cada forma, em unidades do próprio viewBox. */
export const GARMENT_BOX: Record<GarmentShape, { w: number; h: number }> = {
  blusa: { w: 100, h: 106 },
  camisa: { w: 100, h: 118 },
  tricot: { w: 104, h: 112 },
  vestido: { w: 104, h: 150 },
  calca: { w: 86, h: 142 },
  jeans: { w: 86, h: 142 },
  saia: { w: 96, h: 100 },
  shorts: { w: 92, h: 80 },
  tenis: { w: 124, h: 64 },
  salto: { w: 112, h: 76 },
  bota: { w: 92, h: 96 },
  sandalia: { w: 112, h: 68 },
  bolsa: { w: 92, h: 104 },
  oculos: { w: 120, h: 50 },
  colar: { w: 84, h: 96 },
  chapeu: { w: 112, h: 68 },
};

/** Forma padrão de cada família, usada em placeholders de formulário. */
export const CATEGORY_SHAPE: Record<CategoryId, GarmentShape> = {
  tops: "blusa",
  bottoms: "calca",
  calcados: "tenis",
  acessorios: "bolsa",
};

/** Formas oferecidas no cadastro, agrupadas por família. */
export const SHAPE_OPTIONS: Record<CategoryId, { value: GarmentShape; label: string }[]> = {
  tops: [
    { value: "blusa", label: "Blusa / top" },
    { value: "camisa", label: "Camisa" },
    { value: "tricot", label: "Tricot / moletom" },
    { value: "vestido", label: "Vestido / macacão" },
  ],
  bottoms: [
    { value: "calca", label: "Calça" },
    { value: "jeans", label: "Jeans" },
    { value: "saia", label: "Saia" },
    { value: "shorts", label: "Shorts" },
  ],
  calcados: [
    { value: "tenis", label: "Tênis" },
    { value: "salto", label: "Salto" },
    { value: "bota", label: "Bota" },
    { value: "sandalia", label: "Sandália" },
  ],
  acessorios: [
    { value: "bolsa", label: "Bolsa" },
    { value: "oculos", label: "Óculos" },
    { value: "colar", label: "Joia" },
    { value: "chapeu", label: "Chapéu" },
  ],
};

/** Em que prateleira dos acessórios a peça aparece na aba Closet. */
const ACCESSORY_GROUP_OF: Partial<Record<GarmentShape, AccessoryGroup>> = {
  bolsa: "bolsa",
  oculos: "oculos",
  colar: "joias",
};

export function accessoryGroup(shape: GarmentShape): AccessoryGroup {
  return ACCESSORY_GROUP_OF[shape] ?? "outros";
}

export const ACCESSORY_GROUPS: { id: AccessoryGroup; label: string }[] = [
  { id: "bolsa", label: "Bolsas" },
  { id: "oculos", label: "Óculos" },
  { id: "joias", label: "Joias" },
  { id: "outros", label: "Outros" },
];

/* -------------------------------------------------------------------------
   Componente
   ------------------------------------------------------------------------- */

export function Garment({ shape, colors, className = "", style }: GarmentProps) {
  const box = GARMENT_BOX[shape] ?? GARMENT_BOX.blusa;
  const Draw = DRAWINGS[shape] ?? Blusa;

  return (
    <svg
      viewBox={`0 0 ${box.w} ${box.h}`}
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill={colors.fabric}
        stroke={colors.line}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <Draw {...colors} />
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------
   Formas
   ------------------------------------------------------------------------- */

type DrawProps = GarmentColors;

/** Dobra/sombra: mesma cor do tecido, mais fechada, sem contorno. */
function Fold({ d, shade, opacity = 0.85 }: { d: string; shade: string; opacity?: number }) {
  return <path d={d} fill={shade} stroke="none" opacity={opacity} />;
}

function Blusa({ shade, line }: DrawProps) {
  return (
    <>
      <path d="M34 7 L20 12 L5 33 L19 48 L27 39 V96 Q27 102 33 102 H67 Q73 102 73 96 V39 L81 48 L95 33 L80 12 L66 7 Q50 20 34 7 Z" />
      <Fold d="M50 15 L73 41 V96 Q73 102 67 102 H50 Z" shade={shade} opacity={0.5} />
      <path d="M34 7 Q50 20 66 7" fill="none" stroke={line} strokeWidth={1.6} />
      <path d="M27 39 L19 48" fill="none" stroke={line} strokeWidth={1.2} opacity={0.6} />
      <path d="M73 39 L81 48" fill="none" stroke={line} strokeWidth={1.2} opacity={0.6} />
    </>
  );
}

function Camisa({ shade, line }: DrawProps) {
  return (
    <>
      <path d="M36 9 L20 15 L7 58 L21 64 L25 45 V107 Q25 113 31 113 H69 Q75 113 75 107 V45 L79 64 L93 58 L80 15 L64 9 L50 26 Z" />
      <Fold d="M50 26 L75 45 V107 Q75 113 69 113 H50 Z" shade={shade} opacity={0.42} />
      <path d="M36 9 L50 26 L64 9" fill="none" stroke={line} strokeWidth={1.6} />
      <path d="M50 26 V113" fill="none" stroke={line} strokeWidth={1.4} opacity={0.75} />
      {[42, 60, 78, 96].map((cy) => (
        <circle key={cy} cx="50" cy={cy} r="1.9" fill={line} stroke="none" opacity={0.65} />
      ))}
    </>
  );
}

function Tricot({ shade, line }: DrawProps) {
  return (
    <>
      <path d="M38 9 Q52 19 66 9 L84 16 L97 52 L82 60 L77 46 V94 H27 V46 L22 60 L7 52 L20 16 Z" />
      <Fold d="M52 19 L77 46 V94 H52 Z" shade={shade} opacity={0.42} />
      <path d="M38 9 Q52 19 66 9" fill="none" stroke={line} strokeWidth={1.6} />
      <path d="M27 94 H77 V104 Q77 108 73 108 H31 Q27 108 27 104 Z" fill={shade} />
      {[35, 43, 51, 59, 67].map((x) => (
        <path key={x} d={`M${x} 95 V107`} stroke={line} strokeWidth={1} opacity={0.35} fill="none" />
      ))}
    </>
  );
}

function Vestido({ shade, line }: DrawProps) {
  return (
    <>
      <path d="M36 8 L23 13 L9 35 L22 49 L30 40 V60 Q14 98 12 138 Q11 145 19 145 H85 Q93 145 92 138 Q90 98 74 60 V40 L82 49 L95 35 L81 13 L68 8 Q52 20 36 8 Z" />
      <Fold d="M52 18 L74 60 Q90 98 92 138 Q93 145 85 145 H52 Z" shade={shade} opacity={0.45} />
      <path d="M36 8 Q52 20 68 8" fill="none" stroke={line} strokeWidth={1.6} />
      <path d="M30 60 Q52 68 74 60" fill="none" stroke={line} strokeWidth={1.5} opacity={0.8} />
      {[30, 52, 74].map((x, i) => (
        <path
          key={x}
          d={`M${x} ${68 + i * 2} Q${x - 4 + i * 4} 105 ${x - 8 + i * 8} 141`}
          fill="none"
          stroke={line}
          strokeWidth={1}
          opacity={0.28}
        />
      ))}
    </>
  );
}

function Trousers({ shade, line, denim }: DrawProps & { denim?: boolean }) {
  return (
    <>
      <path d="M11 9 H75 L78 32 L72 133 Q72 138 67 138 H55 Q50 138 50 133 L43 70 L36 133 Q36 138 31 138 H19 Q14 138 14 133 L8 32 Z" />
      <Fold d="M43 70 L50 133 Q50 138 55 138 H67 Q72 138 72 133 L78 32 L60 32 Z" shade={shade} opacity={0.4} />
      <path d="M9 9 H77 L78 24 H8 Z" fill={shade} />
      <path d="M43 24 V70" fill="none" stroke={line} strokeWidth={1.2} opacity={0.5} />
      {denim && (
        <>
          <path d="M20 26 Q30 40 43 38" fill="none" stroke={line} strokeWidth={1.1} opacity={0.45} />
          <path d="M66 26 Q56 40 43 38" fill="none" stroke={line} strokeWidth={1.1} opacity={0.45} />
          <circle cx="43" cy="17" r="2" fill={line} stroke="none" opacity={0.6} />
        </>
      )}
    </>
  );
}

function Saia({ shade, line }: DrawProps) {
  return (
    <>
      <path d="M22 8 H74 L92 86 Q94 95 85 95 H11 Q2 95 4 86 Z" />
      <Fold d="M48 8 H74 L92 86 Q94 95 85 95 H48 Z" shade={shade} opacity={0.4} />
      <path d="M22 8 H74 L75 22 H21 Z" fill={shade} />
      {[34, 48, 62].map((x, i) => (
        <path
          key={x}
          d={`M${x} 24 L${x + (i - 1) * 10} 93`}
          fill="none"
          stroke={line}
          strokeWidth={1.1}
          opacity={0.32}
        />
      ))}
    </>
  );
}

function Shorts({ shade, line }: DrawProps) {
  return (
    <>
      <path d="M12 8 H80 L83 30 L80 70 Q80 75 75 75 H60 Q55 75 55 70 L46 48 L37 70 Q37 75 32 75 H17 Q12 75 12 70 L9 30 Z" />
      <Fold d="M46 48 L55 70 Q55 75 60 75 H75 Q80 75 80 70 L83 30 L64 30 Z" shade={shade} opacity={0.4} />
      <path d="M10 8 H82 L83 23 H9 Z" fill={shade} />
      <path d="M46 23 V48" fill="none" stroke={line} strokeWidth={1.2} opacity={0.5} />
    </>
  );
}

function Tenis({ shade, line }: DrawProps) {
  return (
    <>
      <path d="M16 46 Q13 22 32 15 Q46 10 56 19 L74 33 Q84 39 101 41 Q113 43 114 49 H16 Z" />
      <Fold d="M74 33 Q84 39 101 41 Q113 43 114 49 H70 Z" shade={shade} opacity={0.5} />
      <path d="M8 44 H114 Q119 44 119 50 Q119 57 111 57 H15 Q8 57 8 50 Z" fill={shade} />
      <path d="M8 50 H119" fill="none" stroke={line} strokeWidth={1.1} opacity={0.5} />
      {["M30 22 L44 27", "M28 30 L44 34", "M28 38 L45 41"].map((d) => (
        <path key={d} d={d} fill="none" stroke={line} strokeWidth={1.3} opacity={0.55} />
      ))}
    </>
  );
}

function Salto({ shade, line }: DrawProps) {
  return (
    <>
      <path d="M14 48 Q11 24 30 19 Q52 14 68 29 L94 47 Q99 50 94 54 H21 Q14 54 14 48 Z" />
      <Fold d="M68 29 L94 47 Q99 50 94 54 H62 Z" shade={shade} opacity={0.5} />
      <path d="M85 52 H95 L99 70 Q99 73 96 73 H92 Q89 73 88 70 Z" fill={shade} />
      <path d="M14 54 H94" fill="none" stroke={line} strokeWidth={1.2} opacity={0.55} />
      <path d="M30 19 Q40 30 34 44" fill="none" stroke={line} strokeWidth={1.1} opacity={0.4} />
    </>
  );
}

function Bota({ shade, line }: DrawProps) {
  return (
    <>
      <path d="M27 8 H60 Q65 8 65 14 L64 56 Q64 64 72 68 L81 73 Q87 76 87 82 V86 H23 Q17 86 17 80 L20 16 Q20 8 27 8 Z" />
      <Fold
        d="M46 8 H60 Q65 8 65 14 L64 56 Q64 64 72 68 L81 73 Q87 76 87 82 V86 H46 Z"
        shade={shade}
        opacity={0.42}
      />
      <path d="M17 86 H87 V90 Q87 93 83 93 H21 Q17 93 17 89 Z" fill={shade} />
      <path d="M20 22 H65" fill="none" stroke={line} strokeWidth={1.2} opacity={0.45} />
    </>
  );
}

function Sandalia({ shade, line }: DrawProps) {
  return (
    <>
      <path d="M10 44 Q10 38 18 37 L92 33 Q101 33 101 40 Q101 47 93 48 L18 52 Q10 52 10 44 Z" />
      <Fold d="M60 35 L92 33 Q101 33 101 40 Q101 47 93 48 L60 50 Z" shade={shade} opacity={0.45} />
      <path d="M22 38 Q34 20 52 24" fill="none" stroke={line} strokeWidth={3.4} />
      <path d="M46 36 Q62 22 80 30" fill="none" stroke={line} strokeWidth={3.4} />
      <path d="M84 48 H99 L99 62 Q99 65 95 65 H88 Q84 65 84 62 Z" fill={shade} />
    </>
  );
}

function Bolsa({ shade, line }: DrawProps) {
  return (
    <>
      <path d="M31 42 V30 Q31 11 46 11 Q61 11 61 30 V42" fill="none" stroke={line} strokeWidth={3.2} />
      <path d="M13 39 H79 L73 95 Q72 100 67 100 H25 Q20 100 19 95 Z" />
      <Fold d="M46 39 H79 L73 95 Q72 100 67 100 H46 Z" shade={shade} opacity={0.42} />
      <path d="M13 39 H79 L78 49 H14 Z" fill={shade} opacity={0.7} />
      <circle cx="46" cy="66" r="3.4" fill={line} stroke="none" opacity={0.55} />
    </>
  );
}

function Oculos({ shade, line }: DrawProps) {
  return (
    <>
      <path d="M14 30 Q14 15 30 15 Q46 15 46 30 Q46 44 30 44 Q14 44 14 30 Z" />
      <path d="M74 30 Q74 15 90 15 Q106 15 106 30 Q106 44 90 44 Q74 44 74 30 Z" />
      <path d="M46 26 Q60 21 74 26" fill="none" stroke={line} strokeWidth={3} />
      <path d="M14 26 L4 19" fill="none" stroke={line} strokeWidth={3} />
      <path d="M106 26 L116 19" fill="none" stroke={line} strokeWidth={3} />
      <Fold d="M30 15 Q46 15 46 30 Q46 44 30 44 Z" shade={shade} opacity={0.35} />
      <Fold d="M90 15 Q106 15 106 30 Q106 44 90 44 Z" shade={shade} opacity={0.35} />
    </>
  );
}

function Colar({ shade, line }: DrawProps) {
  return (
    <>
      <path
        d="M14 10 Q14 62 42 62 Q70 62 70 10"
        fill="none"
        stroke={line}
        strokeWidth={2.6}
        strokeDasharray="1 5"
        strokeLinecap="round"
      />
      <path d="M14 10 Q14 60 42 60 Q70 60 70 10" fill="none" stroke={line} strokeWidth={1.4} opacity={0.5} />
      <path d="M42 60 L50 74 L42 88 L34 74 Z" />
      <Fold d="M42 60 L50 74 L42 88 Z" shade={shade} opacity={0.5} />
    </>
  );
}

function Chapeu({ shade, line }: DrawProps) {
  return (
    <>
      <path d="M6 50 Q6 40 24 38 L88 38 Q106 40 106 50 Q106 60 88 61 H24 Q6 60 6 50 Z" />
      <path d="M30 40 Q30 8 56 8 Q82 8 82 40 Z" />
      <Fold d="M56 8 Q82 8 82 40 H56 Z" shade={shade} opacity={0.4} />
      <path d="M28 34 H84" fill="none" stroke={line} strokeWidth={3.4} opacity={0.75} />
      <Fold d="M56 38 L88 38 Q106 40 106 50 Q106 60 88 61 H56 Z" shade={shade} opacity={0.3} />
    </>
  );
}

const DRAWINGS: Record<GarmentShape, (props: DrawProps) => JSX.Element> = {
  blusa: Blusa,
  camisa: Camisa,
  tricot: Tricot,
  vestido: Vestido,
  calca: Trousers,
  jeans: (props) => <Trousers {...props} denim />,
  saia: Saia,
  shorts: Shorts,
  tenis: Tenis,
  salto: Salto,
  bota: Bota,
  sandalia: Sandalia,
  bolsa: Bolsa,
  oculos: Oculos,
  colar: Colar,
  chapeu: Chapeu,
};

/* -------------------------------------------------------------------------
   Cabide, usado só na cena do guarda-roupa
   ------------------------------------------------------------------------- */

export function Hanger({
  className = "",
  color = "currentColor",
  strokeWidth = 2.2,
}: {
  className?: string;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 26"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M32 13 V8 Q32 2.5 27 2.5 Q22.5 2.5 22.8 7" />
      <path d="M32 13 L7 21.5 Q4 22.8 6.6 23.5 H57.4 Q60 22.8 57 21.5 Z" />
    </svg>
  );
}
