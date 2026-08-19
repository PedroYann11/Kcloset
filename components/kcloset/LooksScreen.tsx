import { useState } from "react";
import { BarChart3, CalendarDays, ChevronRight, FolderPlus, Plus } from "lucide-react";
import { ClickableRow } from "@/components/kcloset/ui/ClickableRow";
import { HeartButton } from "@/components/kcloset/ui/HeartButton";
import { LookThumb } from "@/components/kcloset/ui/LookThumb";
import { OutfitCanvas, slotsFromLook } from "@/components/kcloset/ui/OutfitCanvas";
import type { Board, ItemMap, Outfit } from "@/types";

export type LooksTab = "colecoes" | "todos" | "favoritos";

type LooksScreenProps = {
  looks: Outfit[];
  boards: Board[];
  itemMap: ItemMap;
  favLooks: Set<string>;
  tab: LooksTab;
  onTabChange: (tab: LooksTab) => void;
  onOpenBoard: (id: string) => void;
  onOpenLook: (id: string) => void;
  onToggleFav: (id: string) => void;
  onCreateBoard: (name: string) => void;
  onNewLook: () => void;
  onStats: () => void;
  onCalendar: () => void;
};

const TABS: { id: LooksTab; label: string }[] = [
  { id: "colecoes", label: "Coleções" },
  { id: "todos", label: "Todos" },
  { id: "favoritos", label: "Favoritos" },
];

/**
 * A aba Looks guarda só looks; as peças moram no Closet.
 * Os looks salvos ficam em coleções no espírito do Pinterest ("Praia",
 * "Trabalho"), e o coração marca os preferidos.
 */
export function LooksScreen({
  looks,
  boards,
  itemMap,
  favLooks,
  tab,
  onTabChange,
  onOpenBoard,
  onOpenLook,
  onToggleFav,
  onCreateBoard,
  onNewLook,
  onStats,
  onCalendar,
}: LooksScreenProps) {
  const [creating, setCreating] = useState(false);
  const [boardName, setBoardName] = useState("");

  const looksOfBoard = (boardId: string) =>
    looks.filter((look) => look.boardIds?.includes(boardId));

  const listed = tab === "favoritos" ? looks.filter((look) => favLooks.has(look.id)) : looks;

  const submitBoard = (event: React.FormEvent) => {
    event.preventDefault();
    const name = boardName.trim();
    if (!name) return;
    onCreateBoard(name);
    setBoardName("");
    setCreating(false);
  };

  return (
    <div className="flex-1 px-6 pt-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl text-ink">Looks</h1>
          <p className="mt-0.5 font-sans text-[11.5px] text-graphite">
            {looks.length} looks salvos · {boards.length} coleções
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCalendar}
            aria-label="Ver calendário de uso"
            className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full"
            style={{ border: "1px solid var(--mist)" }}
          >
            <CalendarDays size={16} color="var(--ink)" />
          </button>
          <button
            type="button"
            onClick={onStats}
            aria-label="Ver estatísticas do closet"
            className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full"
            style={{ border: "1px solid var(--mist)" }}
          >
            <BarChart3 size={16} color="var(--ink)" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onNewLook}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-3 font-sans text-[12.5px]"
        style={{ background: "var(--ink)", color: "var(--paper)" }}
      >
        <Plus size={14} /> Montar novo look
      </button>

      <div className="mt-4 inline-flex rounded-full p-1" style={{ background: "var(--paper-deep)" }}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            aria-pressed={tab === item.id}
            className="rounded-full px-3.5 py-1.5 font-sans text-[12px] transition-colors"
            style={{
              background: tab === item.id ? "var(--ink)" : "transparent",
              color: tab === item.id ? "var(--paper)" : "var(--graphite)",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ---------- coleções ---------- */}
      {tab === "colecoes" && (
        <div className="mt-5 grid grid-cols-2 gap-3 pb-8">
          {boards.map((board) => {
            const boardLooks = looksOfBoard(board.id);
            return (
              <button
                key={board.id}
                type="button"
                onClick={() => onOpenBoard(board.id)}
                className="text-left"
              >
                <BoardCover looks={boardLooks} itemMap={itemMap} />
                <p className="mt-2 truncate font-serif text-[15px] text-ink">{board.name}</p>
                <p className="font-sans text-[11px] text-graphite">
                  {boardLooks.length} {boardLooks.length === 1 ? "look" : "looks"}
                </p>
              </button>
            );
          })}

          {creating ? (
            <form onSubmit={submitBoard} className="flex flex-col justify-center gap-2">
              <input
                autoFocus
                value={boardName}
                onChange={(event) => setBoardName(event.target.value)}
                placeholder="Ex.: Praia"
                aria-label="Nome da coleção"
                className="w-full rounded-xl border bg-transparent px-3 py-2.5 font-sans text-[12.5px] text-ink placeholder:text-mist-strong"
                style={{ borderColor: "var(--mist)" }}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-full py-2 font-sans text-[11.5px]"
                  style={{ background: "var(--ink)", color: "var(--paper)" }}
                >
                  Criar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setBoardName("");
                  }}
                  className="flex-1 rounded-full py-2 font-sans text-[11.5px]"
                  style={{ border: "1px solid var(--mist)", color: "var(--graphite)" }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl"
              style={{ border: "1px dashed var(--mist-strong)" }}
            >
              <FolderPlus size={20} color="var(--graphite)" />
              <span className="font-sans text-[11.5px] text-graphite">Nova coleção</span>
            </button>
          )}
        </div>
      )}

      {/* ---------- lista de looks ---------- */}
      {tab !== "colecoes" && (
        <div className="mt-5 flex flex-col gap-3 pb-8">
          {listed.length === 0 && (
            <p className="mt-2 font-sans text-[13px] italic text-graphite">
              {tab === "favoritos" ? "Nenhum look favoritado." : "Nenhum look salvo."}
            </p>
          )}

          {listed.map((look) => (
            <ClickableRow
              key={look.id}
              onClick={() => onOpenLook(look.id)}
              ariaLabel={`Ver ${look.name}`}
              className="flex items-center gap-4 rounded-2xl border p-3 text-left"
              style={{ borderColor: "var(--mist)" }}
            >
              <LookThumb look={look} itemMap={itemMap} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-base text-ink">{look.name}</p>
                <p className="mt-0.5 font-sans text-[11px] text-graphite">
                  {look.itemIds.length} peças
                  {look.date ? ` · ${look.date}` : ""}
                  {look.wornDates?.length ? ` · usado ${look.wornDates.length}x` : ""}
                </p>
                {Boolean(look.tags?.length) && (
                  <p className="mt-1 truncate font-sans text-[10px] uppercase tracking-wide text-mist-strong">
                    {look.tags?.map((tag) => `#${tag}`).join(" ")}
                  </p>
                )}
              </div>
              <HeartButton
                active={favLooks.has(look.id)}
                onClick={() => onToggleFav(look.id)}
                size={16}
                ariaLabel={
                  favLooks.has(look.id)
                    ? `Remover ${look.name} dos favoritos`
                    : `Adicionar ${look.name} aos favoritos`
                }
              />
              <ChevronRight size={16} color="var(--mist-strong)" />
            </ClickableRow>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Capa da coleção: mosaico com os primeiros looks
   ------------------------------------------------------------------------- */

function BoardCover({ looks, itemMap }: { looks: Outfit[]; itemMap: ItemMap }) {
  const cover = looks.slice(0, 3);

  return (
    <div
      className="grid aspect-square grid-cols-2 grid-rows-2 gap-[3px] overflow-hidden rounded-2xl p-[3px]"
      style={{ background: "var(--paper-deep)" }}
    >
      {cover.length === 0 && (
        <span className="col-span-2 row-span-2 flex items-center justify-center font-sans text-[11px] italic text-mist-strong">
          coleção vazia
        </span>
      )}

      {cover.map((look, i) => (
        <span
          key={look.id}
          className={`flex items-center justify-center overflow-hidden rounded-lg bg-paper ${
            i === 0 && cover.length > 1 ? "row-span-2" : ""
          } ${cover.length === 1 ? "col-span-2 row-span-2" : ""}`}
        >
          <span className="block w-[74%]">
            <OutfitCanvas slots={slotsFromLook(look.itemIds, itemMap)} />
          </span>
        </span>
      ))}
    </div>
  );
}
