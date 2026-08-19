type ActionButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
};

export function ActionButton({ icon, label, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[44px] min-w-[64px] flex-col items-center gap-1.5"
    >
      {icon}
      <span className="font-sans text-[10px] text-graphite">{label}</span>
    </button>
  );
}
