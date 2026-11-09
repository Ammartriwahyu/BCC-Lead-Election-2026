import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { buttonClassName, type ButtonVariant } from './buttonStyles';
import { Spinner } from './Spinner';

const SPINNER_SIZE = 20;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  /** Shows a spinner, disables the button and sets aria-busy. Keep the label visible. */
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  fullWidth,
  loading = false,
  disabled,
  icon,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={buttonClassName(variant, {
        fullWidth: fullWidth ?? false,
        className: className ?? '',
      })}
      {...props}
    >
      {loading ? (
        <Spinner
          size={SPINNER_SIZE}
          tone={variant === 'secondary' || variant === 'on-dark' ? 'brand' : 'on-dark'}
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
