/**
 * Fotos das peças no aparelho, em IndexedDB.
 *
 * O `localStorage` trava perto de 5MB, o que dá espaço para umas 25 peças com
 * foto antes de estourar a cota (o Stylebook mede ~100KB por peça em uso
 * real, então o número bate). IndexedDB guarda o arquivo binário direto, sem
 * o custo de virar texto base64, e tem espaço na casa de centenas de MB,
 * suficiente para um closet de verdade.
 *
 * Desde que existe conta, a casa da foto é o Supabase Storage: isto aqui
 * virou o cache dela, com as mesmas funções de sempre. Baixou uma vez, a
 * próxima abertura resolve local, sem rede.
 *
 * Chave é sempre o id da peça. Uma peça, uma foto.
 */

const DB_NAME = "kloset-photos";
const DB_VERSION = 1;
const STORE = "photos";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB indisponível neste navegador."));
  }

  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Não foi possível abrir o banco de fotos."));
  });

  return dbPromise;
}

/** Grava (ou substitui) a foto de uma peça. */
export async function putPhoto(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Não foi possível salvar a foto."));
  });
}

/** Lê a foto de uma peça. `null` quando a peça não tem foto guardada. */
export async function getPhoto(id: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Não foi possível ler a foto."));
  });
}

/** Apaga a foto de uma peça. Não erra se ela não existir. */
export async function deletePhoto(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Não foi possível apagar a foto."));
  });
}

/**
 * Esvazia o cache inteiro. Chamado ao sair da conta: foto de uma usuária não
 * pode continuar guardada no aparelho depois que outra pessoa entrar.
 */
export async function clearPhotos(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Não foi possível limpar o cache de fotos."));
  });
}
