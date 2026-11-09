import { forwardRef, type InputHTMLAttributes } from 'react';

import { Field, inputBoxClassName } from './Field';

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'className'
> {
  label: string;
  error?: string | undefined;
  hint?: string;
  className?: string;
}

/** Figma "Input / Email" (BCC Form). */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, required, className, ...inputProps },
  ref,
) {
  return (
    <Field
      label={label}
      error={error}
      required={required ?? false}
      className={className ?? ''}
      {...(hint ? { hint } : {})}
    >
      {(control) => (
        <div className={inputBoxClassName(Boolean(error))}>
          <input
            ref={ref}
            {...control}
            required={required}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-secondary"
            {...inputProps}
          />
        </div>
      )}
    </Field>
  );
});
