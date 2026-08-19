/** Datas curtas em pt-BR, no formato que o app grava (`YYYY-MM-DD`). */

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function todayISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** "2026-08-19" -> "19 ago" */
export function formatDate(iso: string): string {
  const [, month, day] = iso.split("-");
  const index = Number(month) - 1;
  return MONTHS[index] ? `${Number(day)} ${MONTHS[index]}` : iso;
}

/** Mês corrente no formato `YYYY-MM`, para filtrar registros de uso. */
export function currentMonth(): string {
  return todayISO().slice(0, 7);
}
