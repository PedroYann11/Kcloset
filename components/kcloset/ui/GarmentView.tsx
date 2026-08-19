import { Garment, GARMENT_BOX } from "@/components/icons/garments";
import type { DecoratedItem } from "@/types";

type GarmentViewProps = {
  item: DecoratedItem;
  className?: string;
  /** Arredondamento aplicado só quando a peça tem foto. */
  photoRounded?: string;
  /** Sombra sob o desenho, desligada nas miniaturas muito pequenas. */
  shadow?: boolean;
};

/**
 * A peça, do jeito que ela aparece em todo lugar: foto real quando existe,
 * senão o desenho preenchido com o tom do tecido.
 */
export function GarmentView({
  item,
  className = "h-full w-full",
  photoRounded = "rounded-lg",
  shadow = true,
}: GarmentViewProps) {
  if (item.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URL do localStorage, sem otimização possível
      <img src={item.photo} alt="" className={`${className} ${photoRounded} object-cover`} />
    );
  }

  return (
    <Garment
      shape={item.drawing}
      colors={{ fabric: item.fabric, shade: item.fabricShade, line: item.fabricLine }}
      className={`${className} ${shadow ? "drop-shadow-[0_4px_7px_rgba(26,24,22,0.18)]" : ""}`}
    />
  );
}

/** Proporção largura/altura do desenho da peça, usada para reservar espaço. */
export function garmentAspect(item: DecoratedItem): number {
  if (item.photo) return 3 / 4;
  const box = GARMENT_BOX[item.drawing] ?? GARMENT_BOX.blusa;
  return box.w / box.h;
}
