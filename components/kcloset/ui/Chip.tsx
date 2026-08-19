export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-mist-strong px-2.5 py-0.5 font-sans text-[10px] uppercase tracking-wide text-graphite">
      {children}
    </span>
  );
}
