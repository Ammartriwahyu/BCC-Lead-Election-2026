import { FORMAT } from '@/config/constants';

const numberFormatter = new Intl.NumberFormat(FORMAT.locale);

const percentFormatter = new Intl.NumberFormat(FORMAT.locale, {
  style: 'percent',
  minimumFractionDigits: FORMAT.percentDigits,
  maximumFractionDigits: FORMAT.percentDigits,
});

const timeFormatter = new Intl.DateTimeFormat(FORMAT.locale, {
  timeZone: FORMAT.timeZone,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat(FORMAT.locale, {
  timeZone: FORMAT.timeZone,
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** 1234 -> "1,234" */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** 0.55 -> "55.0%". Ratio in 0..1. */
export function formatPercent(ratio: number): string {
  return percentFormatter.format(Number.isFinite(ratio) ? ratio : 0);
}

/** Time in WIB, e.g. "09:41 WIB". */
export function formatTimeWib(date: Date): string {
  return `${timeFormatter.format(date)} WIB`;
}

/** Date in WIB, e.g. "Nov 9, 2026" (Figma V5: "Submitted Nov 9, 2026 at 10:24 WIB"). */
export function formatDateWib(date: Date): string {
  return dateFormatter.format(date);
}

/** 1 -> "01". Candidate numbers are shown two-digit in the design. */
export function formatCandidateNumber(value: number): string {
  return String(value).padStart(2, '0');
}
