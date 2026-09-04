import { createClient } from "@supabase/supabase-js";

/**
 * Cliente do Supabase no navegador.
 *
 * Projeto próprio do Kloset, sem nada em comum com o Livo. Não existe
 * `@supabase/ssr`, middleware nem rota de callback aqui: o app inteiro é uma
 * árvore client-side abaixo de `KclosetApp`, então a sessão vive no
 * `localStorage` do próprio cliente e `detectSessionInUrl` fecha sozinho o
 * fluxo PKCE quando o Google devolve a usuária pra "/".
 *
 * As duas chaves são públicas por natureza (vão pro navegador de qualquer
 * jeito). Quem protege o dado de cada usuária é a Row Level Security no
 * banco, não o sigilo da chave.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Sem as variáveis de ambiente, o app abre e explica em vez de quebrar. */
export const supabaseConfigured = Boolean(url && key);

export const supabase = createClient(url ?? "https://nao-configurado.supabase.co", key ?? "sem-chave", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

/** Caminho da foto de uma peça no Storage. Uma pasta por usuária. */
export function photoPath(userId: string, itemId: string): string {
  return `${userId}/${itemId}.png`;
}
