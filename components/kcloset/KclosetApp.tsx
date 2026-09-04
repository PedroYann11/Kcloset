"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { AccountScreen } from "@/components/kcloset/AccountScreen";
import { AddItemScreen } from "@/components/kcloset/AddItemScreen";
import { AddMethodScreen } from "@/components/kcloset/AddMethodScreen";
import { AuthGate } from "@/components/kcloset/AuthGate";
import { BatchReviewScreen, type BatchInput } from "@/components/kcloset/BatchReviewScreen";
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
import { QuickAddScreen } from "@/components/kcloset/QuickAddScreen";
import { StatsScreen } from "@/components/kcloset/StatsScreen";
import { ThemeScreen } from "@/components/kcloset/ThemeScreen";
import { Toast } from "@/components/kcloset/ui/Toast";
import { ITEMS } from "@/data/seed-items";
import * as cloud from "@/lib/cloud";
import { formatDate, todayISO } from "@/lib/date";
import { migrateLocalCloset, releaseClaim } from "@/lib/migrate-local";
import { decorateItems } from "@/lib/palette";
import { clearPhotos, putPhoto } from "@/lib/photo-store";
import { clearCache, clearState, readCache, writeCache } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
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

const EMPTY_PROFILE: cloud.Profile = {
  displayName: null,
  closetName: cloud.DEFAULT_CLOSET_NAME,
  removedSeedIds: [],
};

/** Da sessão pronta até o closet na tela: ler o cache, migrar o que existia
 *  no aparelho, buscar da nuvem. Enquanto não termina, o app fica coberto. */
type BootState =
  | { kind: "loading" }
  | { kind: "migrating"; done: number; total: number }
  | { kind: "ready" }
  | { kind: "error"; message: string };

const NAV_SCREENS: ScreenId[] = ["home", "closet", "looks", "bazaar", "theme"];

/** A que página o tema de cada tela pertence, para as cores próprias de uma
 * página valerem também nas telas que se abrem a partir dela. */
const SCREEN_SCOPE: Record<ScreenId, ThemeScopeId> = {
  home: "home",
  closet: "closet",
  itemDetail: "closet",
  addMethod: "closet",
  addItem: "closet",
  quickAdd: "closet",
  batchReview: "closet",
  account: "global",
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

  /* ---------------- conta ---------------- */
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [boot, setBoot] = useState<BootState>({ kind: "loading" });
  const [bootAttempt, setBootAttempt] = useState(0);
  const [accountBusy, setAccountBusy] = useState(false);
  const userId = session?.user.id ?? null;

  /* ---------------- acervo ---------------- */
  const [userItems, setUserItems] = useState<ClothingItem[]>([]);
  const [profile, setProfile] = useState<cloud.Profile>(EMPTY_PROFILE);
  const [looks, setLooks] = useState<Outfit[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [favItems, setFavItems] = useState<Set<string>>(() => new Set());
  const [favLooks, setFavLooks] = useState<Set<string>>(() => new Set());

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
  const [batchInput, setBatchInput] = useState<BatchInput | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const quotaWarned = useRef(false);

  /* ---------------- tema ---------------- */
  const [themeState, setThemeState] = useState<ThemeState>(DEFAULT_THEME_STATE);
  const [themeReady, setThemeReady] = useState(false);

  /* ---------------- sessão ---------------- */

  // Uma leitura no começo (pra não piscar a tela de login pra quem já está
  // logada) e uma assinatura pro resto: entrar, sair, token renovado.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setThemeState(loadThemeState());
    setThemeReady(true);
  }, []);

  /* ---------------- carregar o closet da conta ---------------- */

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      setBoot({ kind: "loading" });

      // O cache primeiro: o app abre mostrando o último closet conhecido em
      // vez de tela vazia enquanto a nuvem responde.
      const cached = await readCache(userId).catch(() => null);
      if (!cancelled && cached) {
        setUserItems(cached.userItems);
        setLooks(cached.looks);
        setBoards(cached.boards);
        setFavItems(new Set(cached.favItems));
        setFavLooks(new Set(cached.favLooks));
        setProfile((prev) => ({ ...prev, removedSeedIds: cached.removedSeedIds }));
      }

      try {
        await migrateLocalCloset(userId, (progress) => {
          if (!cancelled) setBoot({ kind: "migrating", ...progress });
        });

        const name = (session?.user.user_metadata?.name as string | undefined) ?? null;

        let state = await cloud.loadAll(userId);
        // Conta nova de verdade: nasce com as coleções e os looks de
        // demonstração, do mesmo jeito que nascia antes no aparelho.
        if (state.empty) {
          await cloud.seedNewAccount(userId, name);
          state = await cloud.loadAll(userId);
        } else if (!state.profile.displayName && name) {
          // Conta que veio da migração ainda não tinha nome: o Google traz.
          await cloud.saveProfile(userId, { displayName: name });
          state = { ...state, profile: { ...state.profile, displayName: name } };
        }

        if (cancelled) return;
        setUserItems(state.userItems);
        setLooks(state.looks);
        setBoards(state.boards);
        setFavItems(new Set(state.favItems));
        setFavLooks(new Set(state.favLooks));
        setProfile(state.profile);
        setBoot({ kind: "ready" });
      } catch (error) {
        if (cancelled) return;
        // Sem rede, o cache já está na tela: dá pra olhar o closet, só não
        // dá pra mexer nele.
        setBoot({
          kind: "error",
          message: error instanceof Error ? error.message : "Não foi possível abrir seu closet.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roda por conta, e de novo só quando a usuária pede
  }, [userId, bootAttempt]);

  // Cópia local do que está na tela, pra próxima abertura ser instantânea.
  useEffect(() => {
    if (boot.kind !== "ready" || !userId) return;

    const result = writeCache(userId, {
      userItems,
      looks,
      boards,
      favItems: [...favItems],
      favLooks: [...favLooks],
      removedSeedIds: profile.removedSeedIds,
    });

    if (result === "quota" && !quotaWarned.current) {
      quotaWarned.current = true;
      setToast("Armazenamento cheio. Apague alguma peça com foto");
    }
  }, [boot.kind, userId, userItems, looks, boards, favItems, favLooks, profile.removedSeedIds]);

  useEffect(() => {
    if (!themeReady) return;
    saveThemeState(themeState);
  }, [themeReady, themeState]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ---------------- acervo derivado ---------------- */

  const items = useMemo(
    () =>
      decorateItems([
        ...ITEMS.filter((item) => !profile.removedSeedIds.includes(item.id)),
        ...userItems,
      ]),
    [userItems, profile.removedSeedIds],
  );

  const itemMap = useMemo<ItemMap>(
    () => Object.fromEntries(items.map((item) => [item.id, item])),
    [items],
  );

  /* ---------------- ações gerais ---------------- */

  const showToast = (message: string) => setToast(message);

  /**
   * Escrita na nuvem em segundo plano: a tela responde na hora e a gravação
   * segue atrás. Se falhar, a usuária fica sabendo, em vez de achar que
   * salvou e descobrir na próxima abertura que não.
   */
  const push = (work: Promise<unknown>) => {
    work.catch(() => showToast("Não foi possível salvar. Verifique a conexão"));
  };

  const goTo = (next: ScreenId) => {
    setScreen(next);
    setConfirmDelete(false);
  };

  const enterCategory = (category: CategoryId) => {
    setActiveCategory(category);
    goTo("closet");
  };

  const toggleFavItem = (id: string) => {
    if (!userId) return;
    const on = !favItems.has(id);
    setFavItems((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
    push(cloud.setFavorite(userId, "item", id, on));
  };

  const toggleFavLook = (id: string) => {
    if (!userId) return;
    const on = !favLooks.has(id);
    setFavLooks((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
    push(cloud.setFavorite(userId, "look", id, on));
  };

  const findLook = (id: string) =>
    looks.find((look) => look.id === id) ?? suggestions.find((s) => s.id === id) ?? null;

  /** Um lugar só pra alterar look: etiqueta, coleção, uso e edição passam
   *  por aqui, então a gravação na nuvem também. */
  const updateLook = (id: string, change: (look: Outfit) => Outfit) => {
    const current = looks.find((look) => look.id === id);
    if (!current || !userId) return;

    const next = change(current);
    setLooks((prev) => prev.map((look) => (look.id === id ? next : look)));
    push(cloud.saveLook(userId, next));
  };

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
      if (userId) push(cloud.saveLook(userId, newLook));
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
    if (userId) push(cloud.saveLook(userId, newLook));
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
    if (userId) {
      push(cloud.deleteLook(userId, id));
      if (favLooks.has(id)) push(cloud.setFavorite(userId, "look", id, false));
    }
    showToast("Look removido");
    goTo("looks");
  };

  /* ---------------- coleções, etiquetas e uso ---------------- */

  const createBoard = (name: string, attachToLookId?: string) => {
    const board: Board = { id: `board-${Date.now()}`, name, createdAt: Date.now() };
    setBoards((prev) => [...prev, board]);
    if (userId) push(cloud.saveBoard(userId, board));
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

    // Look que estava na coleção precisa ser regravado sem ela.
    const nextLooks = looks.map((look) => {
      if (!(look.boardIds ?? []).includes(boardId)) return look;
      const next = { ...look, boardIds: (look.boardIds ?? []).filter((id) => id !== boardId) };
      if (userId) push(cloud.saveLook(userId, next));
      return next;
    });
    setLooks(nextLooks);

    if (userId) push(cloud.deleteBoard(userId, boardId));
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
    if (!userId) return;

    const isSeed = ITEMS.some((item) => item.id === itemId);
    if (isSeed) {
      // Peça de demonstração não é linha no banco: o que fica registrado é
      // que esta usuária apagou ela, no perfil.
      const removedSeedIds = [...profile.removedSeedIds, itemId];
      setProfile((prev) => ({ ...prev, removedSeedIds }));
      push(cloud.saveProfile(userId, { removedSeedIds }));
    } else {
      setUserItems((prev) => prev.filter((item) => item.id !== itemId));
      // A foto some com a peça: libera o object URL, apaga do Storage e do
      // cache local.
      const photo = itemMap[itemId]?.photo;
      if (photo) URL.revokeObjectURL(photo);
      push(cloud.deleteItem(userId, itemId));
    }

    if (favItems.has(itemId)) push(cloud.setFavorite(userId, "item", itemId, false));
    setFavItems((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });

    // Look que perde a peça é regravado; look que fica sem nenhuma peça sai.
    const nextLooks: Outfit[] = [];
    looks.forEach((look) => {
      if (!look.itemIds.includes(itemId)) {
        nextLooks.push(look);
        return;
      }
      const itemIds = look.itemIds.filter((id) => id !== itemId);
      if (itemIds.length === 0) {
        push(cloud.deleteLook(userId, look.id));
        return;
      }
      const next = { ...look, itemIds };
      push(cloud.saveLook(userId, next));
      nextLooks.push(next);
    });
    setLooks(nextLooks);

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

  /**
   * Grava a foto (se houver) e devolve a peça já com id e `photo` resolvidos.
   * Não mexe em navegação nem toast: isso é papel de quem chama, porque o
   * cadastro rápido chama isto várias vezes seguidas sem sair da tela.
   */
  const createItem = async (draft: NewItemDraft, photoBlob?: Blob): Promise<ClothingItem> => {
    const id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Cache local primeiro: a foto aparece na tela sem esperar a rede.
    if (photoBlob) await putPhoto(id, photoBlob);

    const item: ClothingItem = {
      ...draft,
      id,
      createdAt: Date.now(),
      photo: photoBlob ? URL.createObjectURL(photoBlob) : undefined,
    };

    if (userId) push(cloud.insertItem(userId, item, photoBlob));
    return item;
  };

  const addItem = async (draft: NewItemDraft, photoBlob?: Blob) => {
    const newItem = await createItem(draft, photoBlob);
    setUserItems((prev) => [...prev, newItem]);
    setActiveCategory(newItem.category);
    showToast("Peça cadastrada");
    goTo("closet");
  };

  /**
   * Cadastro rápido: adiciona sem navegar nem avisar a cada toque, para dar
   * para encadear várias peças seguidas sem sair da tela do catálogo.
   */
  const quickAddItem = async (draft: NewItemDraft) => {
    const newItem = await createItem(draft);
    setUserItems((prev) => [...prev, newItem]);
  };

  /** Uma peça por foto, várias fotos de uma vez: guarda os arquivos e manda
   * pra grade de revisão, que faz o recorte sozinha. */
  const startBatchPhotos = (files: FileList) => {
    setBatchInput({ mode: "photos", files: Array.from(files) });
    goTo("batchReview");
  };

  /** Várias peças deitadas juntas numa foto só: mesma ideia, mas a grade de
   * revisão separa as peças por componente conectado antes de mostrar. */
  const startBatchSplit = (file: File) => {
    setBatchInput({ mode: "split", file });
    goTo("batchReview");
  };

  /**
   * Cadastro em lote: grava cada peça marcada na grade de revisão, um
   * `createItem` por peça, como `addItem` e `quickAddItem` já fazem, mas
   * com um `setUserItems` só no final, não um por peça.
   */
  const addManyItems = async (items: { draft: NewItemDraft; photoBlob?: Blob }[]) => {
    const newItems = await Promise.all(items.map(({ draft, photoBlob }) => createItem(draft, photoBlob)));
    setUserItems((prev) => [...prev, ...newItems]);
    showToast(`${newItems.length} ${newItems.length === 1 ? "peça cadastrada" : "peças cadastradas"}`);
    goTo("closet");
  };

  /* ---------------- conta ---------------- */

  const renameCloset = (closetName: string) => {
    if (!userId || !closetName) return;
    setProfile((prev) => ({ ...prev, closetName }));
    push(cloud.saveProfile(userId, { closetName }));
    showToast("Nome do closet salvo");
  };

  /** Sair leva junto o que ficou guardado no aparelho: closet de uma pessoa
   *  não pode continuar em cache pra próxima que entrar neste navegador. */
  const forgetLocal = async (id: string) => {
    clearCache(id);
    await clearPhotos().catch(() => {
      // sem IndexedDB não há cache pra limpar
    });
    setUserItems([]);
    setLooks([]);
    setBoards([]);
    setFavItems(new Set());
    setFavLooks(new Set());
    setProfile(EMPTY_PROFILE);
    setSelection(EMPTY_SELECTION);
    setScreen("home");
    setClosetOpen(false);
  };

  const signOut = async () => {
    if (!userId || accountBusy) return;
    setAccountBusy(true);
    const id = userId;
    await supabase.auth.signOut();
    await forgetLocal(id);
    setAccountBusy(false);
  };

  const deleteAccount = async () => {
    if (!userId || accountBusy) return;
    setAccountBusy(true);
    const id = userId;

    try {
      await cloud.deleteAccount(id);
      // Apagou a conta: some também o closet pré-conta que ficou no aparelho,
      // e a marca de quem tinha adotado ele.
      clearState();
      releaseClaim();
      await supabase.auth.signOut();
      await forgetLocal(id);
    } catch {
      showToast("Não foi possível apagar a conta agora");
    } finally {
      setAccountBusy(false);
    }
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

  // Sem sessão não existe app: o closet é de alguém. Enquanto a sessão está
  // sendo lida a tela fica escura e vazia, pra quem já está logada não ver a
  // tela de login piscar.
  if (!authReady || !session) {
    return (
      <div className="flex min-h-screen w-full items-start justify-center bg-night">
        <div className="relative flex min-h-screen w-full max-w-shell flex-col">
          {authReady && <AuthGate />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-night">
      <div
        className="relative flex min-h-screen w-full max-w-shell flex-col bg-paper"
        style={themeVars as React.CSSProperties}
      >
        <div
          className="flex flex-1 flex-col overflow-x-hidden"
          style={{ paddingBottom: showNav ? 88 : 0 }}
          inert={boot.kind !== "ready"}
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
              onNewItem={() => goTo("addMethod")}
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

          {screen === "addMethod" && (
            <AddMethodScreen
              onBack={() => goTo("closet")}
              onFullForm={() => goTo("addItem")}
              onQuickAdd={() => goTo("quickAdd")}
              onBatchPhotos={startBatchPhotos}
              onBatchSplit={startBatchSplit}
            />
          )}

          {screen === "addItem" && <AddItemScreen onBack={() => goTo("closet")} onSave={addItem} />}

          {screen === "quickAdd" && (
            <QuickAddScreen onBack={() => goTo("closet")} onAdd={quickAddItem} />
          )}

          {screen === "batchReview" && batchInput && (
            <BatchReviewScreen
              input={batchInput}
              onBack={() => goTo("addMethod")}
              onSaveAll={addManyItems}
            />
          )}

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

          {screen === "theme" && (
            <ThemeScreen
              state={themeState}
              onChange={setThemeState}
              onAccount={() => goTo("account")}
            />
          )}

          {screen === "account" && (
            <AccountScreen
              email={session.user.email ?? null}
              closetName={profile.closetName}
              busy={accountBusy}
              onBack={() => goTo("theme")}
              onRenameCloset={renameCloset}
              onSignOut={() => void signOut()}
              onDeleteAccount={() => void deleteAccount()}
            />
          )}
        </div>

        {boot.kind !== "ready" && (
          <BootOverlay boot={boot} onRetry={() => setBootAttempt((attempt) => attempt + 1)} />
        )}

        {showNav && <BottomNav screen={screen} onNavigate={(id: NavScreenId) => goTo(id)} />}

        <Toast message={toast} />
      </div>
    </div>
  );
}

/**
 * Cobre o app enquanto o closet da conta não está na tela. Migração é a
 * única espera longa que a usuária vai ver, então ela conta o progresso em
 * vez de só girar.
 */
function BootOverlay({ boot, onRetry }: { boot: BootState; onRetry: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-paper px-8 text-center">
      {boot.kind === "error" ? (
        <>
          <p className="font-sans text-[13px] leading-relaxed text-blush-deep">
            Não consegui abrir seu closet agora.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 rounded-full px-5 py-2.5 font-sans text-[12.5px]"
            style={{ border: "1px solid var(--mist)", color: "var(--graphite)" }}
          >
            Tentar de novo
          </button>
        </>
      ) : (
        <>
          <Loader2 size={22} className="animate-spin" color="var(--graphite)" />
          <p className="font-sans text-[12px] text-graphite">
            {boot.kind === "migrating"
              ? `Subindo suas peças, ${boot.done} de ${boot.total}`
              : "Abrindo seu closet"}
          </p>
        </>
      )}
    </div>
  );
}
