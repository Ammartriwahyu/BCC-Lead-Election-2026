import { forwardRef, type SelectHTMLAttributes } from 'react';

import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';
import { cx } from '@/lib/utils/cx';

import { Field, inputBoxClassName } from './Field';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'id' | 'className' | 'children'
> {
  label: string;
  options: readonly SelectOption[];
  /** Shown while nothing is chosen (value ""). */
  placeholder?: string;
  error?: string | undefined;
  hint?: string;
  className?: string;
}

/**
 * Figma "Input / Dropdown" (BCC Form): the text-field box with a chevron. A native <select>, so
 * keyboard, screen readers and phones get the platform picker.
 */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, options, placeholder, error, hint, required, className, value, ...selectProps },
  ref,
) {
  const empty = value === '' || value === undefined;
  return (
    <Field
      label={label}
      error={error}
      required={required ?? false}
      className={className ?? ''}
      {...(hint ? { hint } : {})}
    >
      {(control) => (
        <div className={cx(inputBoxClassName(Boolean(error)), 'relative')}>
          <select
            ref={ref}
            {...control}
            required={required}
            value={value}
            className={cx(
              'min-w-0 flex-1 appearance-none bg-transparent pr-32 outline-none',
              !empty && 'text-text-primary',
              // Placeholder text: on the grey error box secondary text is below 4.5:1.
              empty && (error ? 'text-slate-600' : 'text-text-secondary'),
            )}
            {...selectProps}
          >
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="text-text-primary"
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            className="pointer-events-none absolute right-16 shrink-0 text-border-default"
            size={24}
          />
        </div>
      )}
    </Field>
  );
});
