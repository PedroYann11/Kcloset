export function StylingNote({ text }: { text: string }) {
  return (
    <div className="border-l-2 border-blush py-0.5 pl-3">
      <p className="mb-1 font-sans text-[10px] uppercase tracking-[0.18em] text-blush-deep">
        Nota de estilo
      </p>
      <p className="font-sans text-[13px] italic leading-relaxed text-ink-soft">{text}</p>
    </div>
  );
}
