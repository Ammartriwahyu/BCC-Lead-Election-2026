import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

import { buttonClassName, type ButtonVariant } from './buttonStyles';

type ButtonLinkProps<R extends string> = LinkProps<R> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps<R>> & {
    variant?: ButtonVariant;
    fullWidth?: boolean;
    icon?: ReactNode;
  };

/** A link that looks like a BCC Button (navigation, not an action). */
export function ButtonLink<R extends string>({
  variant = 'primary',
  fullWidth,
  icon,
  className,
  children,
  ...props
}: ButtonLinkProps<R>) {
  return (
    <Link
      className={buttonClassName(variant, {
        fullWidth: fullWidth ?? false,
        className: className ?? '',
      })}
      {...props}
    >
      {icon}
      {children}
    </Link>
  );
}
