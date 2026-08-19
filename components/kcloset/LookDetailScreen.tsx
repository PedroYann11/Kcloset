import { useState } from "react";
import { CalendarCheck, Check, Heart, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/kcloset/ui/ActionButton";
import { BackHeader } from "@/components/kcloset/ui/BackHeader";
import { OutfitCanvas, slotsFromLook } from "@/components/kcloset/ui/OutfitCanvas";
import { formatDate, todayISO } from "@/lib/date";
import type { Board, ItemMap, Outfit } from "@/types";

type LookDetailScreenProps = {
  look: Outfit;
  itemMap: ItemMap;
  boards: Board[];
  isFav: boolean;
  onToggleFav: () => void;
  onToggleBoard: (boardId: string) => void;
  onCreateBoard: (name: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onWearToday: () => void;
  onBack: () => void;
  onEdit: () => void;
  onShare: () => void;
  onSaveSuggestion: () => void;
  onDelete: () => void;
  confirmDelete: boolean;
  setConfirmDelete: (value: boolean) => void;
};

export function LookDetailScreen({
  look,
  itemMap,
  boards,
  isFav,
  onToggleFav,
  onToggleBoard,
  onCreateBoard,
  onAddTag,
  onRemoveTag,
  onWearToday,
  onBack,
  onEdit,
  onShare,
  onSaveSuggestion,
  onDelete,
  confirmDelete,
  setConfirmDelete,
}: LookDetailScreenProps) {
  const [newBoard, setNewBoard] = useState("");
  const [newTag, setNewTag] = useState("");

  const items = look.itemIds.map((id) => itemMap[id]).filter(Boolean);
  const worn = look.wornDates ?? [];
  const wornToday = worn.includes(todayISO());

  return (
    <div className="flex flex-1 flex-col">
      <BackHeader title={look.suggested ? "Sugestão de look" : "Look"} onBack={onBack} />

      <div className="px-6 pb-8">
        <div
          className="flex items-center justify-center rounded-[28px] p-5"
          style={{ background: "var(--paper-deep)" }}
        >
          <div className="w-[64%]">
            <OutfitCanvas slots={slotsFromLook(look.itemIds, itemMap)} />
          </div>
        </div>

        <h1 className="mt-5 text-center font-serif text-2xl text-ink">{look.name}</h1>
        <p className="mt-1.5 text-center font-sans text-[12px] text-graphite">
          {items.map((item) => item.name).join(" · ")}
        </p>
        {look.date && (
          <p className="mt-2 text-center font-sans text-[10px] uppercase tracking-wide text-mist-strong">
            salvo em {look.date}
            {worn.length > 0 && ` · usado ${worn.length}x · última vez ${formatDate(worn[0])}`}
          </p>
        )}

        <div
          className="mt-6 flex items-center justify-around"
          style={{ borderTop: "1px solid var(--mist)", paddingTop: 18 }}
        >
          {look.suggested ? (
            <>
              <ActionButton
                icon={<Check size={18} strokeWidth={1.6} color="var(--ink)" />}
                label="Salvar look"
                onClick={onSaveSuggestion}
              />
              <ActionButton
                icon={<Share2 size={18} strokeWidth={1.6} color="var(--ink)" />}
                label="Compartilhar"
                onClick={onShare}
              />
            </>
          ) : (
            <>
              <ActionButton
                icon={
                  <Heart
                    size={18}
                    strokeWidth={1.6}
                    color={isFav ? "var(--blush-deep)" : "var(--ink)"}
                    fill={isFav ? "var(--blush-deep)" : "none"}
                  />
                }
                label="Favoritar"
                onClick={onToggleFav}
              />
              <ActionButton
                icon={
                  <CalendarCheck
                    size={18}
                    strokeWidth={1.6}
                    color={wornToday ? "var(--blush-deep)" : "var(--ink)"}
                  />
                }
                label={wornToday ? "Usado hoje" : "Vesti hoje"}
                onClick={onWearToday}
              />
              <ActionButton
                icon={<Pencil size={18} strokeWidth={1.6} color="var(--ink)" />}
                label="Editar"
                onClick={onEdit}
              />
              <ActionButton
                icon={
                  <Trash2
                    size={18}
                    strokeWidth={1.6}
                    color={confirmDelete ? "var(--blush-deep)" : "var(--ink)"}
                  />
                }
                label={confirmDelete ? "Confirmar" : "Remover"}
                onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
              />
            </>
          )}
        </div>

        {!look.suggested && (
          <>
            {/* ---------- coleções ---------- */}
            <section className="mt-7">
              <p className="mb-2.5 font-sans text-[10px] uppercase tracking-[0.18em] text-graphite">
                Coleções
              </p>
              <div className="flex flex-wrap gap-2">
                {boards.map((board) => {
                  const active = look.boardIds?.includes(board.id) ?? false;
                  return (
                    <button
                      key={board.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onToggleBoard(board.id)}
                      className="min-h-[36px] rounded-full px-3.5 font-sans text-[12px] transition-colors"
                      style={{
                        background: active ? "var(--ink)" : "transparent",
                        color: active ? "var(--paper)" : "var(--graphite)",
                        border: `1px solid ${active ? "var(--ink)" : "var(--mist)"}`,
                      }}
                    >
                      {board.name}
                    </button>
                  );
                })}
              </div>

              <form
                className="mt-2.5 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = newBoard.trim();
                  if (!name) return;
                  onCreateBoard(name);
                  setNewBoard("");
                }}
              >
                <input
                  value={newBoard}
                  onChange={(event) => setNewBoard(event.target.value)}
                  placeholder="Nova coleção"
                  aria-label="Nome da nova coleção"
                  className="min-w-0 flex-1 rounded-full border bg-transparent px-3.5 py-2 font-sans text-[12px] text-ink placeholder:text-mist-strong"
                  style={{ borderColor: "var(--mist)" }}
                />
                <button
                  type="submit"
                  aria-label="Criar coleção e salvar o look nela"
                  className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full"
                  style={{ background: "var(--ink)" }}
                >
                  <Plus size={15} color="var(--paper)" />
                </button>
              </form>
            </section>

            {/* ---------- etiquetas ---------- */}
            <section className="mt-6">
              <p className="mb-2.5 font-sans text-[10px] uppercase tracking-[0.18em] text-graphite">
                Etiquetas
              </p>
              <div className="flex flex-wrap gap-2">
                {(look.tags ?? []).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onRemoveTag(tag)}
                    aria-label={`Remover etiqueta ${tag}`}
                    className="min-h-[32px] rounded-full px-3 font-sans text-[11.5px]"
                    style={{ background: "var(--blush)", color: "var(--ink)" }}
                  >
                    #{tag} ×
                  </button>
                ))}
              </div>

              <form
                className="mt-2.5 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const tag = newTag.trim().replace(/^#/, "");
                  if (!tag) return;
                  onAddTag(tag);
                  setNewTag("");
                }}
              >
                <input
                  value={newTag}
                  onChange={(event) => setNewTag(event.target.value)}
                  placeholder="Ex.: verão"
                  aria-label="Nova etiqueta"
                  className="min-w-0 flex-1 rounded-full border bg-transparent px-3.5 py-2 font-sans text-[12px] text-ink placeholder:text-mist-strong"
                  style={{ borderColor: "var(--mist)" }}
                />
                <button
                  type="submit"
                  aria-label="Adicionar etiqueta"
                  className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full"
                  style={{ background: "var(--ink)" }}
                >
                  <Plus size={15} color="var(--paper)" />
                </button>
              </form>
            </section>

            <button
              type="button"
              onClick={onShare}
              className="mt-6 w-full rounded-full py-3 font-sans text-[12.5px]"
              style={{ border: "1px solid var(--mist)", color: "var(--ink)" }}
            >
              Compartilhar look
            </button>
          </>
        )}
      </div>
    </div>
  );
}
