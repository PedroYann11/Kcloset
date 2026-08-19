import { useState } from "react";
import { Heart } from "lucide-react";

type HeartButtonProps = {
  active: boolean;
  onClick: () => void;
  size?: number;
  ariaLabel?: string;
};

export function HeartButton({ active, onClick, size = 18, ariaLabel }: HeartButtonProps) {
  const [pop, setPop] = useState(false);

  return (
    <button
      type="button"
      aria-label={ariaLabel ?? (active ? "Remover dos favoritos" : "Adicionar aos favoritos")}
      aria-pressed={active}
      onClick={(event) => {
        // O coração costuma viver dentro de uma linha clicável, e o clique é dele.
        event.stopPropagation();
        setPop(true);
        setTimeout(() => setPop(false), 260);
        onClick();
      }}
      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/75 backdrop-blur-sm transition-transform active:scale-90"
      style={{
        transform: pop ? "scale(1.22)" : "scale(1)",
        transition: "transform 220ms cubic-bezier(.34,1.56,.64,1)",
      }}
    >
      <Heart
        size={size}
        strokeWidth={1.6}
        color={active ? "var(--blush-deep)" : "var(--ink)"}
        fill={active ? "var(--blush-deep)" : "none"}
      />
    </button>
  );
}
