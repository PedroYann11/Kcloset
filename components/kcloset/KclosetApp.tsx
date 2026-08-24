"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AddItemScreen } from "@/components/kcloset/AddItemScreen";
import { BazaarScreen } from "@/components/kcloset/BazaarScreen";
import { BoardScreen } from "@/components/kcloset/BoardScreen";
import { BottomNav } from "@/components/kcloset/BottomNav";
import { CalendarScreen } from "@/components/kcloset/CalendarScreen";
import { ClosetScreen } from "@/components/kcloset/ClosetScreen";
import { HomeScreen } from "@/components/kcloset/HomeScreen";
import { ItemDetailScreen } from "@/components/kcloset/ItemDetailScreen";
import { LookDetailScreen } from "@/components/kcloset/LookDetailScreen";
import { LooksScreen, type LooksTab } from "@/components/kcloset/LooksScreen";
import { OccasionResultScreen } from "@/components/kcloset/OccasionResultScreen";
import { OccasionScreen } from "@/components/kcloset/OccasionScreen";
import { StatsScreen } from "@/components/kcloset/StatsScreen";
import { ThemeScreen } from "@/components/kcloset/ThemeScreen";
import { Toast } from "@/components/kcloset/ui/Toast";
import {
  ITEMS,
  SEED_BOARDS,
  SEED_FAV_ITEMS,
  SEED_FAV_LOOKS,
  SEED_LOOKS,
} from "@/data/seed-items";
import { formatDate, todayISO } from "@/lib/date";
import { decorateItems } from "@/lib/palette";
import { deletePhoto, putPhoto } from "@/lib/photo-store";
import { loadState, saveState } from "@/lib/storage";
import { buildSuggestions, slotForCategory } from "@/lib/suggestions";
import {
  DEFAULT_THEME_STATE,
  deriveVars,
  loadThemeState,
  recipeFor,
  saveThemeState,
  type ThemeScopeId,
  type ThemeState,
} from "@/lib/theme";
import type {
  AccessoryGroup,
  Board,
  BuilderSelection,
  CategoryId,
  ClothingItem,
  DecoratedItem,
  ItemMap,
  NavScreenId,
  NewItemDraft,
  Occasion,
  Outfit,
  ScreenId,
} from "@/types";

const EMPTY_SELECTION: BuilderSelection = { top: null, bottom: null, shoes: null, accs: [] };

const NAV_SCREENS: ScreenId[] = ["home", "closet", "looks", "bazaar", "theme"];

/** A que página o tema de cada tela pertence, para as cores próprias de uma
 * página valerem também nas telas que se abrem a partir dela. */
const SCREEN_SCOPE: Record<ScreenId, ThemeScopeId> = {
  home: "home",
  closet: "closet",
  itemDetail: "closet",
  addItem: "closet",
  occasion: "closet",
  occasionResult: "closet",
  looks: "looks",
  board: "looks",
  lookDetail: "looks",
  calendar: "looks",
  stats: "looks",
  bazaar: "bazaar",
  theme: "global",
};

/**
 * Orquestrador do Kloset.
 *
 * Concentra o roteador de telas e todo o estado compartilhado (acervo,
 * favoritos, looks, coleções, montagem e sugestões). As telas em si são
 * componentes de apresentação: recebem dados e callbacks.
 */
export function KclosetApp() {
  /* ---------------- navegação ---------------- */
  const [screen, setScreen] = useState<ScreenId>("home");
  const [closetOpen, setClosetOpen] = useState(false);

  /* ---------------- acervo e persistência ---------------- */
  const [userItems, setUserItems] = useState<ClothingItem[]>([]);
  const [removedSeedIds, setRemovedSeedIds] = useState<string[]>([]);
  const [looks, setLooks] = useState<Outfit[]>(SEED_LOOKS);
  const [boards, setBoards] = useState<Board[]>(SEED_BOARDS);
  const [favItems, setFavItems] = useState<Set<string>>(() => new Set(SEED_FAV_ITEMS));
  const [favLooks, setFavLooks] = useState<Set<string>>(() => new Set(SEED_FAV_LOOKS));
  const [hydrated, setHydrated] = useState(false);

  /* ---------------- estado de cada tela ---------------- */
  const [activeCategory, setActiveCategory] = useState<CategoryId>("tops");
  const [accessoryGroup, setAccessoryGroup] = useState<AccessoryGroup>("bolsa");
  const [selection, setSelection] = useState<BuilderSelection>(EMPTY_SELECTION);
  const [editingLookId, setEditingLookId] = useState<string | null>(null);

  const [viewingLookId, setViewingLookId] = useState<string | null>(null);
  const [viewingItemId, setViewingItemId] = useState<string | null>(null);
  const [viewingBoardId, setViewingBoardId] = useState<string | null>(null);

  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [suggestions, setSuggestions] = useState<Outfit[]>([]);

  const [looksTab, setLooksTab] = useState<LooksTab>("colecoes");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expandedBazaar, setExpandedBazaar] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const quotaWarned = useRef(false);

  /* ---------------- tema ---------------- */
  const [themeState, setThemeState] = useState<ThemeState>(DEFAULT_THEME_STATE);

  /* ---------------- persistência ---------------- */

  // Só depois de ler o localStorage é que passamos a gravar. Senão o primeiro
  // render sobrescreveria o que a usuária já tinha salvo. A leitura é async
  // porque cada foto é resolvida (ou migrada) a partir do IndexedDB.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const saved = await loadState();
      if (cancelled) return;

      if (saved) {
        setUserItems(saved.userItems);
        setLooks(saved.looks);
        setBoards(saved.boards.length ? saved.boards : SEED_BOARDS);
        setRemovedSeedIds(saved.removedSeedIds);
        setFavItems(new Set(saved.favItems));
        setFavLooks(new Set(saved.favLooks));
      }
      setThemeState(loadThemeState());
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const result = saveState({
      userItems,
      looks,
      boards,
      favItems: [...favItems],
      favLooks: [...favLooks],
      removedSeedIds,
    });

    if (result === "quota" && !quotaWarned.current) {
      quotaWarned.current = true;
      setToast("Armazenamento cheio. Apague alguma peça com foto");
    }
  }, [hydrated, userItems, looks, boards, favItems, favLooks, removedSeedIds]);

  useEffect(() => {
    if (!hydrated) return;
    saveThemeState(themeState);
  }, [hydrated, themeState]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ---------------- acervo derivado ---------------- */

  const items = useMemo(
    () =>
      decorateItems([
        ...ITEMS.filter((item) => !removedSeedIds.includes(item.id)),
        ...userItems,
      ]),
    [userItems, removedSeedIds],
  );

  const itemMap = useMemo<ItemMap>(
    () => Object.fromEntries(items.map((item) => [item.id, item])),
    [items],
  );

  /* ---------------- ações gerais ---------------- */

  const showToast = (message: string) => setToast(message);

  const goTo = (next: ScreenId) => {
    setScreen(next);
    setConfirmDelete(false);
  };

  const enterCategory = (category: CategoryId) => {
    setActiveCategory(category);
    goTo("closet");
  };

  const toggleFavItem = (id: string) =>
    setFavItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleFavLook = (id: string) =>
    setFavLooks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const findLook = (id: string) =>
    looks.find((look) => look.id === id) ?? suggestions.find((s) => s.id === id) ?? null;

  const updateLook = (id: string, change: (look: Outfit) => Outfit) =>
    setLooks((prev) => prev.map((look) => (look.id === id ? change(look) : look)));

  /* ---------------- montagem de look (aba Closet) ---------------- */

  const isChosen = (item: DecoratedItem) =>
    item.category === "acessorios"
      ? selection.accs.includes(item.id)
      : selection[slotForCategory(item.category) as "top" | "bottom" | "shoes"] === item.id;

  const toggleItem = (item: DecoratedItem) => {
    setSelection((prev) => {
      // Acessório é o único espaço que aceita mais de uma peça.
      if (item.category === "acessorios") {
        const on = prev.accs.includes(item.id);
        return {
          ...prev,
          accs: on ? prev.accs.filter((id) => id !== item.id) : [...prev.accs, item.id],
        };
      }

      const slot = slotForCategory(item.category) as "top" | "bottom" | "shoes";
      const alreadyOn = prev[slot] === item.id;
      const next: BuilderSelection = { ...prev, [slot]: alreadyOn ? null : item.id };
      // Vestido/macacão ocupa o look inteiro, então a peça de baixo sai fora.
      if (!alreadyOn && slot === "top" && item.fullBody) next.bottom = null;
      return next;
    });
  };

  const clearSelection = () => setSelection(EMPTY_SELECTION);

  const selectedTop = selection.top ? itemMap[selection.top] : null;
  const canSaveLook = Boolean(selection.top && (selectedTop?.fullBody || selection.bottom));

  const startEditLook = (look: Outfit) => {
    const next: BuilderSelection = { ...EMPTY_SELECTION, accs: [] };
    look.itemIds.forEach((id) => {
      const item = itemMap[id];
      if (!item) return;
      if (item.category === "acessorios") next.accs = [...next.accs, id];
      else next[slotForCategory(item.category) as "top" | "bottom" | "shoes"] = id;
    });
    setSelection(next);
    setEditingLookId(look.id);
    setActiveCategory("tops");
    goTo("closet");
  };

  const cancelEdit = () => {
    setEditingLookId(null);
    clearSelection();
  };

  const nextLookName = () => `Look #${String(looks.length + 1).padStart(3, "0")}`;

  const saveLook = () => {
    const itemIds = [
      selection.top,
      selectedTop?.fullBody ? null : selection.bottom,
      selection.shoes,
      ...selection.accs,
    ].filter((id): id is string => Boolean(id));

    if (editingLookId) {
      updateLook(editingLookId, (look) => ({ ...look, itemIds }));
      setViewingLookId(editingLookId);
      setEditingLookId(null);
      showToast("Look atualizado");
    } else {
      const newLook: Outfit = {
        id: `look-${Date.now()}`,
        name: nextLookName(),
        itemIds,
        date: formatDate(todayISO()),
        suggested: false,
        boardIds: [],
        tags: [],
        wornDates: [],
      };
      setLooks((prev) => [newLook, ...prev]);
      setViewingLookId(newLook.id);
      showToast("Look salvo");
    }

    clearSelection();
    goTo("lookDetail");
  };

  const saveSuggestion = (suggestion: Outfit) => {
    const newLook: Outfit = {
      ...suggestion,
      id: `look-${Date.now()}`,
      name: nextLookName(),
      date: formatDate(todayISO()),
      suggested: false,
      boardIds: [],
      tags: [],
      wornDates: [],
    };
    setLooks((prev) => [newLook, ...prev]);
    setViewingLookId(newLook.id);
    showToast("Look salvo em Looks");
    goTo("lookDetail");
  };

  const deleteLook = (id: string) => {
    setLooks((prev) => prev.filter((look) => look.id !== id));
    setFavLooks((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    showToast("Look removido");
    goTo("looks");
  };

  /* ---------------- coleções, etiquetas e uso ---------------- */

  const createBoard = (name: string, attachToLookId?: string) => {
    const board: Board = { id: `board-${Date.now()}`, name, createdAt: Date.now() };
    setBoards((prev) => [...prev, board]);
    if (attachToLookId) {
      updateLook(attachToLookId, (look) => ({
        ...look,
        boardIds: [...(look.boardIds ?? []), board.id],
      }));
    }
    showToast(`Coleção "${name}" criada`);
  };

  const toggleBoardOnLook = (lookId: string, boardId: string) =>
    updateLook(lookId, (look) => {
      const current = look.boardIds ?? [];
      const inBoard = current.includes(boardId);
      return {
        ...look,
        boardIds: inBoard ? current.filter((id) => id !== boardId) : [...current, boardId],
      };
    });

  const deleteBoard = (boardId: string) => {
    setBoards((prev) => prev.filter((board) => board.id !== boardId));
    setLooks((prev) =>
      prev.map((look) => ({
        ...look,
        boardIds: (look.boardIds ?? []).filter((id) => id !== boardId),
      })),
    );
    showToast("Coleção apagada");
    goTo("looks");
  };

  const addTag = (lookId: string, tag: string) =>
    updateLook(lookId, (look) =>
      (look.tags ?? []).includes(tag) ? look : { ...look, tags: [...(look.tags ?? []), tag] },
    );

  const removeTag = (lookId: string, tag: string) =>
    updateLook(lookId, (look) => ({
      ...look,
      tags: (look.tags ?? []).filter((current) => current !== tag),
    }));

  /** Marca (ou desmarca) o uso de um look numa data. */
  const toggleWear = (lookId: string, date: string) => {
    const look = looks.find((item) => item.id === lookId);
    const already = look?.wornDates?.includes(date) ?? false;

    updateLook(lookId, (current) => ({
      ...current,
      wornDates: already
        ? (current.wornDates ?? []).filter((worn) => worn !== date)
        : [date, ...(current.wornDates ?? [])].sort((a, b) => b.localeCompare(a)),
    }));

    const isToday = date === todayISO();
    if (already) showToast("Registro apagado");
    else showToast(isToday ? "Registrado: você usou esse look hoje" : `Registrado em ${formatDate(date)}`);
  };

  /* ---------------- exclusão de peça ---------------- */

  const looksWithItem = (itemId: string) => looks.filter((look) => look.itemIds.includes(itemId));

  /**
   * Apaga a peça do closet e limpa todos os rastros dela: favoritos, o look em
   * montagem e os looks salvos. Look que fica sem nenhuma peça é removido.
   */
  const deleteItem = (itemId: string) => {
    const isSeed = ITEMS.some((item) => item.id === itemId);
    if (isSeed) {
      setRemovedSeedIds((prev) => [...prev, itemId]);
    } else {
      setUserItems((prev) => prev.filter((item) => item.id !== itemId));
      // A foto some com a peça: libera o object URL e apaga do IndexedDB.
      const photo = itemMap[itemId]?.photo;
      if (photo) URL.revokeObjectURL(photo);
      deletePhoto(itemId).catch(() => {
        // sem IndexedDB disponível, não há o que apagar
      });
    }

    setFavItems((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });

    setLooks((prev) =>
      prev
        .map((look) => ({ ...look, itemIds: look.itemIds.filter((id) => id !== itemId) }))
        .filter((look) => look.itemIds.length > 0),
    );

    setSelection((prev) => ({
      top: prev.top === itemId ? null : prev.top,
      bottom: prev.bottom === itemId ? null : prev.bottom,
      shoes: prev.shoes === itemId ? null : prev.shoes,
      accs: prev.accs.filter((id) => id !== itemId),
    }));

    setViewingItemId(null);
    showToast("Peça excluída do closet");
    goTo("closet");
  };

  /* ---------------- sugestões por ocasião ---------------- */

  const chooseOccasion = (chosen: Occasion) => {
    setOccasion(chosen);
    setSuggestions(buildSuggestions(items, chosen.id));
    goTo("occasionResult");
  };

  /* ---------------- cadastro de peça ---------------- */

  const addItem = async (draft: NewItemDraft, photoBlob?: Blob) => {
    const id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Grava a foto no IndexedDB antes de a peça entrar no estado, para o
    // object URL já ter o que mostrar assim que a tela renderiza.
    if (photoBlob) await putPhoto(id, photoBlob);

    const newItem: ClothingItem = {
      ...draft,
      id,
      createdAt: Date.now(),
      photo: photoBlob ? URL.createObjectURL(photoBlob) : undefined,
    };

    setUserItems((prev) => [...prev, newItem]);
    setActiveCategory(newItem.category);
    showToast("Peça cadastrada");
    goTo("closet");
  };

  /* ---------------- render ---------------- */

  const viewingLook = viewingLookId ? findLook(viewingLookId) : null;
  const viewingItem = viewingItemId ? itemMap[viewingItemId] : null;
  const viewingBoard = viewingBoardId
    ? boards.find((board) => board.id === viewingBoardId) ?? null
    : null;

  // A barra só aparece depois que a porta do guarda-roupa é aberta.
  const showNav = NAV_SCREENS.includes(screen) && (screen !== "home" || closetOpen);

  // O tema em uso na tela atual: a página pode ter cores próprias, senão
  // segue o Geral. As variáveis CSS aplicadas aqui cascateiam para tudo
  // dentro do aparelho, então nenhuma outra tela precisa saber que o tema
  // existe.
  const themeVars = useMemo(
    () => deriveVars(recipeFor(themeState, SCREEN_SCOPE[screen])),
    [themeState, screen],
  );

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-night">
      <div
        className="relative flex min-h-screen w-full max-w-shell flex-col bg-paper"
        style={themeVars as React.CSSProperties}
      >
        <div
          className="flex flex-1 flex-col overflow-x-hidden"
          style={{ paddingBottom: showNav ? 88 : 0 }}
        >
          {screen === "home" && (
            <HomeScreen
              closetOpen={closetOpen}
              onToggle={() => setClosetOpen((open) => !open)}
              onCategory={enterCategory}
              items={items}
            />
          )}

          {screen === "closet" && (
            <ClosetScreen
              items={items}
              itemMap={itemMap}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              activeAccessoryGroup={accessoryGroup}
              onAccessoryGroupChange={setAccessoryGroup}
              selection={selection}
              isChosen={isChosen}
              onToggleItem={toggleItem}
              onClear={clearSelection}
              canSave={canSaveLook}
              onSave={saveLook}
              isEditing={Boolean(editingLookId)}
              onCancelEdit={cancelEdit}
              onNewItem={() => goTo("addItem")}
              onOpenItem={(item) => {
                setViewingItemId(item.id);
                goTo("itemDetail");
              }}
              onOccasion={() => goTo("occasion")}
              favItems={favItems}
            />
          )}

          {screen === "itemDetail" && viewingItem && (
            <ItemDetailScreen
              item={viewingItem}
              isFav={favItems.has(viewingItem.id)}
              onToggleFav={() => toggleFavItem(viewingItem.id)}
              onBack={() => goTo("closet")}
              inLook={isChosen(viewingItem)}
              onUseInLook={() => {
                toggleItem(viewingItem);
                goTo("closet");
              }}
              onDelete={() => deleteItem(viewingItem.id)}
              usedInLooks={looksWithItem(viewingItem.id).length}
            />
          )}

          {screen === "addItem" && <AddItemScreen onBack={() => goTo("closet")} onSave={addItem} />}

          {screen === "looks" && (
            <LooksScreen
              looks={looks}
              boards={boards}
              itemMap={itemMap}
              favLooks={favLooks}
              tab={looksTab}
              onTabChange={setLooksTab}
              onOpenBoard={(id) => {
                setViewingBoardId(id);
                goTo("board");
              }}
              onOpenLook={(id) => {
                setViewingLookId(id);
                goTo("lookDetail");
              }}
              onToggleFav={toggleFavLook}
              onCreateBoard={(name) => createBoard(name)}
              onNewLook={() => {
                cancelEdit();
                goTo("closet");
              }}
              onStats={() => goTo("stats")}
              onCalendar={() => goTo("calendar")}
            />
          )}

          {screen === "board" && viewingBoard && (
            <BoardScreen
              board={viewingBoard}
              looks={looks.filter((look) => look.boardIds?.includes(viewingBoard.id))}
              itemMap={itemMap}
              favLooks={favLooks}
              onBack={() => goTo("looks")}
              onOpenLook={(id) => {
                setViewingLookId(id);
                goTo("lookDetail");
              }}
              onToggleFav={toggleFavLook}
              onDeleteBoard={() => deleteBoard(viewingBoard.id)}
            />
          )}

          {screen === "lookDetail" && viewingLook && (
            <LookDetailScreen
              look={viewingLook}
              itemMap={itemMap}
              boards={boards}
              isFav={favLooks.has(viewingLook.id)}
              onToggleFav={() => toggleFavLook(viewingLook.id)}
              onToggleBoard={(boardId) => toggleBoardOnLook(viewingLook.id, boardId)}
              onCreateBoard={(name) => createBoard(name, viewingLook.id)}
              onAddTag={(tag) => addTag(viewingLook.id, tag)}
              onRemoveTag={(tag) => removeTag(viewingLook.id, tag)}
              onWearToday={() => toggleWear(viewingLook.id, todayISO())}
              onBack={() => goTo(viewingLook.suggested ? "occasionResult" : "looks")}
              onEdit={() => startEditLook(viewingLook)}
              onShare={() => showToast("Compartilhamento em breve")}
              onSaveSuggestion={() => saveSuggestion(viewingLook)}
              onDelete={() => deleteLook(viewingLook.id)}
              confirmDelete={confirmDelete}
              setConfirmDelete={setConfirmDelete}
            />
          )}

          {screen === "calendar" && (
            <CalendarScreen
              looks={looks}
              itemMap={itemMap}
              onBack={() => goTo("looks")}
              onOpenLook={(id) => {
                setViewingLookId(id);
                goTo("lookDetail");
              }}
              onToggleWear={toggleWear}
            />
          )}

          {screen === "stats" && (
            <StatsScreen
              items={items}
              itemMap={itemMap}
              looks={looks}
              boards={boards}
              onBack={() => goTo("looks")}
              onOpenLook={(id) => {
                setViewingLookId(id);
                goTo("lookDetail");
              }}
            />
          )}

          {screen === "occasion" && (
            <OccasionScreen onBack={() => goTo("closet")} onChoose={chooseOccasion} />
          )}

          {screen === "occasionResult" && occasion && (
            <OccasionResultScreen
              occasion={occasion}
              suggestions={suggestions}
              itemMap={itemMap}
              onBack={() => goTo("occasion")}
              onOpen={(id) => {
                setViewingLookId(id);
                goTo("lookDetail");
              }}
            />
          )}

          {screen === "bazaar" && (
            <BazaarScreen
              items={items}
              expanded={expandedBazaar}
              onExpandedChange={setExpandedBazaar}
              onInterest={() => showToast("Em breve você poderá manifestar interesse por aqui")}
              onAnnounce={() => goTo("addItem")}
            />
          )}

          {screen === "theme" && <ThemeScreen state={themeState} onChange={setThemeState} />}
        </div>

        {showNav && <BottomNav screen={screen} onNavigate={(id: NavScreenId) => goTo(id)} />}

        <Toast message={toast} />
      </div>
    </div>
  );
}
