type ClickableRowProps = {
  onClick: () => void;
  ariaLabel: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/**
 * Linha clicável que ainda aceita botões dentro (o coração de favoritar).
 * Não pode ser um <button>, porque botão dentro de botão é HTML inválido,
 * então carrega role, tabIndex e teclado na mão.
 */
export function ClickableRow({ onClick, ariaLabel, className, style, children }: ClickableRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={className}
      style={style}
    >
      {children}
    </div>
  );
}
