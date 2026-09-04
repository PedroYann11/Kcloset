import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabase";

/**
 * A porta de entrada do app, com a mesma cara da abertura: fundo escuro, o
 * wordmark, e nada em volta. Uma decisão só na tela, entrar.
 *
 * O retorno do Google cai em "/" com o código na URL, e o próprio cliente do
 * Supabase (`detectSessionInUrl`) fecha o fluxo sozinho, sem rota de callback
 * no Next.
 */
export function AuthGate() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    if (busy) return;

    if (!navigator.onLine) {
      setError("Sem conexão. Tente de novo quando o sinal voltar.");
      return;
    }

    setBusy(true);
    setError(null);

    const { error: failure } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

    if (failure) {
      setError("Não foi possível abrir o login agora.");
      setBusy(false);
    }
  };

  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-between"
      style={{ background: "linear-gradient(180deg, #1E1C1A 0%, #131211 62%, #0D0C0C 100%)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 32%, rgb(var(--c-blush) / 0.14), transparent 62%)" }}
      />

      <header className="relative px-6 pt-24 text-center">
        <h1 className="font-display text-[44px] uppercase leading-none tracking-[0.2em] text-paper">
          Kloset
        </h1>
      </header>

      <div className="relative w-full max-w-[340px] px-6 pb-16">
        {supabaseConfigured ? (
          <button
            type="button"
            onClick={signIn}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-white py-3.5 font-sans text-[13.5px] text-[#1a1816] transition-opacity"
            style={{ opacity: busy ? 0.6 : 1 }}
          >
            {busy ? <Loader2 size={17} className="animate-spin" /> : <GoogleMark />}
            Entrar com Google
          </button>
        ) : (
          <p className="text-center font-sans text-[12px] leading-relaxed text-mist-strong">
            App sem as chaves do Supabase configuradas.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-3 text-center font-sans text-[11.5px] text-blush">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2.1 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z"
      />
      <path
        fill="#34A853"
        d="M24 46c6 0 11-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9h-7.3v5.7C8 41.1 15.4 46 24 46z"
      />
      <path fill="#FBBC05" d="M11.8 28.2a13.2 13.2 0 0 1 0-8.4v-5.7H4.5a22 22 0 0 0 0 19.8l7.3-5.7z" />
      <path
        fill="#EA4335"
        d="M24 9.5c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 2.9 30 1 24 1 15.4 1 8 5.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"
      />
    </svg>
  );
}
