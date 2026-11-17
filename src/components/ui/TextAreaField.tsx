import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cx } from '@/lib/utils/cx';

import { Field, inputBoxClassName } from './Field';

export interface TextAreaFieldProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'id' | 'className'
> {
  label: string;
  error?: string | undefined;
  hint?: string;
  className?: string;
}

/** Figma "Input / Text area" (BCC Form): the text-field box, 153 tall, text from the top. */
export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField({ label, error, hint, required, className, ...areaProps }, ref) {
    return (
      <Field
        label={label}
        error={error}
        required={required ?? false}
        className={className ?? ''}
        {...(hint ? { hint } : {})}
      >
        {(control) => (
          <div className={cx(inputBoxClassName(Boolean(error)), 'items-start')}>
            <textarea
              ref={ref}
              {...control}
              required={required}
              className="min-h-127 min-w-0 flex-1 resize-y bg-transparent outline-none placeholder:text-text-secondary"
              {...areaProps}
            />
          </div>
        )}
      </Field>
    );
  },
);
