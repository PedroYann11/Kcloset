import { ArrowLeft } from "lucide-react";

export function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 px-6 pb-2 pt-14">
      <button
        type="button"
        onClick={onBack}
        aria-label="Voltar"
        className="-ml-2 flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full transition-colors active:bg-paper-deep"
      >
        <ArrowLeft size={20} color="var(--ink)" strokeWidth={1.6} />
      </button>
      <h1 className="font-serif text-xl text-ink">{title}</h1>
    </div>
  );
}
