import { useState } from "react";
import { LogOut, Trash2 } from "lucide-react";
import { BackHeader } from "@/components/kcloset/ui/BackHeader";

type AccountScreenProps = {
  email: string | null;
  closetName: string;
  busy: boolean;
  onBack: () => void;
  onRenameCloset: (name: string) => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
};

/**
 * Conta: quem está logada, o nome do closet, sair e apagar.
 *
 * O nome do closet nasce aqui porque é ele que vai identificar a peça no
 * bazar compartilhado, quando o bazar existir.
 */
export function AccountScreen({
  email,
  closetName,
  busy,
  onBack,
  onRenameCloset,
  onSignOut,
  onDeleteAccount,
}: AccountScreenProps) {
  const [name, setName] = useState(closetName);
  const [confirm, setConfirm] = useState(false);

  const dirty = name.trim().length > 0 && name.trim() !== closetName;

  return (
    <div className="flex flex-1 flex-col">
      <BackHeader title="Conta" onBack={onBack} />

      <div className="flex-1 px-6 pb-8">
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-graphite">Entrou como</p>
        <p className="mt-1 font-serif text-[15px] text-ink">{email ?? "conta sem e-mail"}</p>

        <div className="mt-7">
          <label
            htmlFor="closet-name"
            className="mb-2 block font-sans text-[10px] uppercase tracking-[0.18em] text-graphite"
          >
            Nome do closet
          </label>
          <input
            id="closet-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            placeholder="Meu closet"
            className="w-full rounded-xl border bg-transparent px-3.5 py-3 font-sans text-[13px] text-ink placeholder:text-mist-strong"
            style={{ borderColor: "var(--mist)" }}
          />
          <button
            type="button"
            onClick={() => onRenameCloset(name.trim())}
            disabled={!dirty || busy}
            className="mt-2.5 w-full rounded-full py-3 font-sans text-[12.5px] transition-opacity"
            style={{
              background: "var(--ink)",
              color: "var(--paper)",
              opacity: !dirty || busy ? 0.35 : 1,
            }}
          >
            Salvar nome
          </button>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          disabled={busy}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 font-sans text-[12.5px]"
          style={{ border: "1px solid var(--mist)", color: "var(--graphite)" }}
        >
          <LogOut size={14} strokeWidth={1.7} />
          Sair da conta
        </button>

        <button
          type="button"
          onClick={() => (confirm ? onDeleteAccount() : setConfirm(true))}
          disabled={busy}
          className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 font-sans text-[12.5px]"
          style={{
            border: `1px solid ${confirm ? "var(--blush-deep)" : "var(--mist)"}`,
            color: confirm ? "var(--blush-deep)" : "var(--graphite)",
          }}
        >
          <Trash2 size={14} strokeWidth={1.7} />
          {confirm ? "Confirmar exclusão da conta" : "Apagar minha conta"}
        </button>

        {confirm && (
          <p className="fade-in mt-2 text-center font-sans text-[11.5px] leading-relaxed text-graphite">
            Some tudo: peças, fotos, looks e coleções. Não dá para voltar atrás.
          </p>
        )}
      </div>
    </div>
  );
}
