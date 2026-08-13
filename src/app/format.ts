export function money(value: number): string {
  const n = new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Math.abs(value));
  return '₴' + n;
}

export function moneySigned(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return sign + money(value);
}

export function initials(name: string): string {
  const trimmed = (name || '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

export function shortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function httpError(error: unknown): string {
  const problem = (error as { error?: { errors?: Record<string, string[]>; detail?: string; title?: string } })?.error;
  if (problem?.errors) {
    return Object.values(problem.errors).flat().join(' ');
  }
  return problem?.detail || problem?.title || 'Сталася помилка. Спробуйте ще раз.';
}
