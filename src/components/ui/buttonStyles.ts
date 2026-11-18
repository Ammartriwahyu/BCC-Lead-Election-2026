import { cx } from '@/lib/utils/cx';

/**
 * BCC Button (Figma 1:2692): height 48, radius 12, padding 12/20, Inter Medium 16.
 * Variants map to the "Tombol / …" instances used across Pilketum v2:
 * - primary:   Select, Sign in, Review and submit, Submit vote (semantic/action/primary for AA)
 * - secondary: Vision & mission, Cancel, Next (outline, brand)
 * - dark:      Selected, committee Sign in (semantic/action/primary-dark)
 * - on-dark:   Sign out, Select this candidate (white on navy)
 * - outline-on-dark: Back to candidates (slate/300 border on navy)
 * - danger-outline: Delete candidate (A8, red/700 outline)
 * Hover/pressed for primary and secondary follow the Figma variants; the others are NEW (DEVIATIONS).
 * Every variant eases its colours and sinks slightly while pressed (motion-press, DEVIATIONS #84).
 */
export type ButtonVariant =
  'primary' | 'secondary' | 'dark' | 'on-dark' | 'outline-on-dark' | 'danger-outline';

const base =
  'inline-flex min-h-48 items-center justify-center gap-8 rounded-lg px-20 py-12 text-body-1-medium whitespace-nowrap select-none motion-press disabled:cursor-not-allowed aria-disabled:cursor-not-allowed';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-action-primary text-text-on-dark hover:bg-primary-700 active:bg-primary-800 disabled:bg-neutral-500 aria-disabled:bg-neutral-500',
  secondary:
    'border border-border-brand bg-action-secondary text-text-brand hover:border-primary-600 hover:bg-primary-50 hover:text-primary-600 active:border-primary-700 active:bg-primary-100 active:text-primary-700 disabled:border-neutral-200 disabled:bg-action-secondary disabled:text-text-secondary aria-disabled:border-neutral-200 aria-disabled:text-text-secondary',
  dark: 'bg-action-primary-dark text-text-on-dark hover:bg-primary-700 active:bg-primary-900 disabled:bg-neutral-500',
  'on-dark':
    'bg-action-secondary text-primary-800 hover:bg-primary-50 active:bg-primary-100 disabled:bg-neutral-200',
  'outline-on-dark':
    'border border-slate-300 text-text-on-dark hover:bg-primary-700 active:bg-primary-900',
  'danger-outline':
    'border border-red-700 bg-action-secondary text-red-700 hover:bg-red-50 active:bg-red-100 disabled:border-neutral-200 disabled:text-text-secondary',
};

export function buttonClassName(
  variant: ButtonVariant = 'primary',
  options: { fullWidth?: boolean; className?: string } = {},
): string {
  return cx(base, variants[variant], options.fullWidth && 'w-full', options.className);
}
