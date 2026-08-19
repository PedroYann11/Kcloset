import { Home, Layers, Shirt, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NavScreenId, ScreenId } from "@/types";

/** Quatro abas: Favoritos virou parte de Looks. */
const NAV_ITEMS: { id: NavScreenId; label: string; Icon: LucideIcon }[] = [
  { id: "home", label: "Home", Icon: Home },
  { id: "closet", label: "Closet", Icon: Shirt },
  { id: "looks", label: "Looks", Icon: Layers },
  { id: "bazaar", label: "Bazar", Icon: Tag },
];

type BottomNavProps = {
  screen: ScreenId;
  onNavigate: (screen: NavScreenId) => void;
};

export function BottomNav({ screen, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-1/2 w-full max-w-shell -translate-x-1/2 px-3"
      style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
      aria-label="Navegação principal"
    >
      <div
        className="mx-1 mb-2 flex items-center justify-between rounded-3xl px-2 py-2"
        style={{ background: "rgba(26,24,22,0.94)", backdropFilter: "blur(14px)" }}
      >
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = screen === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className="flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl transition-colors"
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                size={19}
                strokeWidth={1.6}
                color={active ? "var(--blush)" : "rgba(251,249,247,0.55)"}
              />
              <span
                className="font-sans text-[9px] tracking-wide"
                style={{ color: active ? "var(--blush)" : "rgba(251,249,247,0.55)" }}
              >
                {label}
              </span>
              {active && <span className="h-1 w-1 rounded-full" style={{ background: "var(--blush)" }} />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
