'use client';

import { forwardRef, useState } from 'react';

import { EyeIcon } from '@/components/icons/EyeIcon';
import { EyeOffIcon } from '@/components/icons/EyeOffIcon';
import { content } from '@/content/copy';

import { Field, inputBoxClassName } from './Field';
import type { TextFieldProps } from './TextField';

const EYE_SIZE = 24;

/** Figma "Input / Password" (BCC Password) with the solar:eye-linear toggle. */
export const PasswordField = forwardRef<HTMLInputElement, Omit<TextFieldProps, 'type'>>(
  function PasswordField({ label, error, hint, required, className, ...inputProps }, ref) {
    const [visible, setVisible] = useState(false);
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
              type={visible ? 'text' : 'password'}
              required={required}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-secondary"
              {...inputProps}
            />
            <button
              type="button"
              aria-pressed={visible}
              aria-label={visible ? content.field.hidePassword : content.field.showPassword}
              onClick={() => {
                setVisible((v) => !v);
              }}
              className="-m-10 flex size-44 shrink-0 items-center justify-center rounded-md text-text-secondary hover:text-text-primary"
            >
              {visible ? <EyeOffIcon size={EYE_SIZE} /> : <EyeIcon size={EYE_SIZE} />}
            </button>
          </div>
        )}
      </Field>
    );
  },
);
