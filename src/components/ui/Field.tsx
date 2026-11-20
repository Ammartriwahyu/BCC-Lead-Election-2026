import { useId, type ReactNode } from 'react';

import { commonCopy } from '@/content/commonCopy';
import { cx } from '@/lib/utils/cx';

export interface FieldControlProps {
  id: string;
  'aria-invalid': boolean | undefined;
  'aria-describedby': string | undefined;
  'aria-required': boolean | undefined;
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string | undefined;
  hint?: string;
  className?: string;
  /** Receives the ids and aria attributes the control must spread. */
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * Figma "Input / …" (BCC Form): Semi Bold 16 label with " *", 4px gap, error text below.
 * Error colour uses semantic/text/danger (Figma file uses an off-token #CC0000; see DEVIATIONS).
 */
export function Field({ label, required, error, hint, className, children }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('flex w-full flex-col gap-4', className)}>
      <label
        htmlFor={id}
        className={cx('text-body-1-semibold', error ? 'text-text-danger' : 'text-text-primary')}
      >
        {label}
        {required ? <span aria-hidden="true">{` ${commonCopy.field.requiredMark}`}</span> : null}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        'aria-required': required || undefined,
      })}
      {hint ? (
        <p id={hintId} className="text-body-2 text-text-secondary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-body-2 text-text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Shared box styles for text inputs (radius 12, padding 12/16, Body 2). */
export function inputBoxClassName(invalid: boolean): string {
  return cx(
    'flex min-h-48 w-full items-center gap-12 rounded-lg border px-16 py-12 text-body-2 text-text-primary transition-colors',
    // The inner <input> drops its own outline; the box shows the 2px focus ring instead.
    'focus-within:border-border-brand focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-action-primary has-[button:focus-visible]:outline-0',
    invalid ? 'border-text-danger bg-neutral-100' : 'border-border-default bg-surface-card',
  );
}
