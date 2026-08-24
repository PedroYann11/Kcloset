import { WardrobeScene } from "@/components/kcloset/WardrobeScene";
import type { CategoryId, DecoratedItem } from "@/types";

type HomeScreenProps = {
  closetOpen: boolean;
  onToggle: () => void;
  onCategory: (category: CategoryId) => void;
  items: DecoratedItem[];
};

/**
 * Abertura do app: só a marca e o móvel.
 * Nada de rótulos ou atalhos em volta: o guarda-roupa é o único alvo, e cada
 * peça dentro dele leva para a sua família no Closet.
 */
export function HomeScreen({ closetOpen, onToggle, onCategory, items }: HomeScreenProps) {
  return (
    <div
      className="relative flex min-h-screen flex-1 flex-col overflow-hidden"
      style={{ background: "linear-gradient(180deg, #1E1C1A 0%, #131211 62%, #0D0C0C 100%)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 32%, rgb(var(--c-blush) / 0.14), transparent 62%)",
        }}
      />

      <header className="relative px-6 pt-14 text-center">
        <h1 className="font-display text-[44px] uppercase leading-none tracking-[0.2em] text-paper">
          Kloset
        </h1>
      </header>

      <div className="relative flex flex-1 items-center justify-center px-4 py-4">
        <div className="w-full max-w-[380px]">
          <WardrobeScene open={closetOpen} onToggle={onToggle} onCategory={onCategory} items={items} />
        </div>
      </div>

      <p
        aria-hidden={closetOpen}
        className="relative pb-10 text-center font-sans text-[10px] uppercase tracking-[0.28em] text-mist-strong"
        style={{
          // some na hora de abrir, mas continua ocupando o lugar para o
          // móvel não pular quando as portas se abrem
          visibility: closetOpen ? "hidden" : "visible",
          animation: "pulseSoft 2.4s ease-in-out infinite",
        }}
      >
        toque para abrir
      </p>
    </div>
  );
}
