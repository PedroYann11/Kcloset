import { Camera, Images, Layers, Palette } from "lucide-react";
import { BackHeader } from "@/components/kcloset/ui/BackHeader";

type AddMethodScreenProps = {
  onBack: () => void;
  onFullForm: () => void;
  onQuickAdd: () => void;
  /** Uma peça por foto, várias fotos de uma vez. */
  onBatchPhotos: (files: FileList) => void;
  /** Várias peças deitadas juntas numa foto só, separadas por recorte. */
  onBatchSplit: (file: File) => void;
};

/**
 * Quatro portas para cadastrar peça: o formulário completo (foto ou link,
 * com todos os campos), o catálogo rápido (sem foto, só tipo e cor), e as
 * duas portas de lote, que convergem na grade de revisão depois de recortar
 * o fundo sozinhas, sem tela intermediária de escolha de arquivo.
 */
export function AddMethodScreen({
  onBack,
  onFullForm,
  onQuickAdd,
  onBatchPhotos,
  onBatchSplit,
}: AddMethodScreenProps) {
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
        <MethodCardFile
          icon={<Images size={20} strokeWidth={1.6} color="var(--ink)" />}
          title="Várias fotos"
          description="uma peça por foto, várias de uma vez"
          multiple
          onFiles={onBatchPhotos}
        />
        <MethodCardFile
          icon={<Layers size={20} strokeWidth={1.6} color="var(--ink)" />}
          title="Várias peças, uma foto"
          description="peças deitadas juntas, separadas por recorte"
          onFiles={(files) => onBatchSplit(files[0])}
        />
      </div>
    </div>
  );
}

function MethodCardBody({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <>
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
    </>
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
      <MethodCardBody icon={icon} title={title} description={description} />
    </button>
  );
}

/**
 * Mesmo visual de `MethodCard`, mas a porta em si é um input de arquivo
 * escondido, do mesmo jeito que o campo de foto do formulário completo já
 * funciona hoje. `multiple` decide se a porta abre pra várias fotos de uma
 * vez ou só uma.
 */
function MethodCardFile({
  icon,
  title,
  description,
  multiple,
  onFiles,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  multiple?: boolean;
  onFiles: (files: FileList) => void;
}) {
  return (
    <label
      className="flex cursor-pointer items-center gap-4 rounded-2xl border p-4 text-left"
      style={{ borderColor: "var(--mist)" }}
    >
      <MethodCardBody icon={icon} title={title} description={description} />
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        onChange={(event) => {
          const files = event.target.files;
          if (files && files.length > 0) onFiles(files);
          event.target.value = "";
        }}
      />
    </label>
  );
}
