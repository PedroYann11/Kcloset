import { Camera, Palette } from "lucide-react";
import { BackHeader } from "@/components/kcloset/ui/BackHeader";

type AddMethodScreenProps = {
  onBack: () => void;
  onFullForm: () => void;
  onQuickAdd: () => void;
};

/**
 * Duas portas para cadastrar peça: o formulário completo (foto ou link, com
 * todos os campos) e o catálogo rápido (sem foto, só tipo e cor). É o começo
 * da tela de entrada que o roteiro completo vai crescer depois, com mais
 * portas para cadastro em lote.
 */
export function AddMethodScreen({ onBack, onFullForm, onQuickAdd }: AddMethodScreenProps) {
  return (
    <div className="flex flex-1 flex-col">
      <BackHeader title="Nova peça" onBack={onBack} />

      <div className="flex flex-col gap-3 px-6 pb-6">
        <MethodCard
          icon={<Camera size={20} strokeWidth={1.6} color="var(--ink)" />}
          title="Foto ou link"
          description="cadastro completo, com todos os campos"
          onClick={onFullForm}
        />
        <MethodCard
          icon={<Palette size={20} strokeWidth={1.6} color="var(--ink)" />}
          title="Catálogo rápido"
          description="toque no tipo e na cor, sem foto"
          onClick={onQuickAdd}
        />
      </div>
    </div>
  );
}

function MethodCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 rounded-2xl border p-4 text-left"
      style={{ borderColor: "var(--mist)" }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--paper-deep)" }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-[16px] text-ink">{title}</span>
        <span className="mt-0.5 block font-sans text-[11.5px] text-graphite">{description}</span>
      </span>
    </button>
  );
}
