import Image from 'next/image';

import logo from '@/assets/brand/logo-bcc-white.png';
import { commonCopy } from '@/content/commonCopy';
import { cx } from '@/lib/utils/cx';

/** Figma "BCC Logo - White" sizes: voter navbar 101, mobile navbar 80, admin sidebar / A0 122, display 146 (px wide). */
const WIDTHS = { navbar: 101, mobile: 80, sidebar: 122, display: 146 } as const;

interface LogoProps {
  size: keyof typeof WIDTHS;
  className?: string;
  /** Set when the logo is the only content of a link (it then names the link). */
  decorative?: boolean;
}

export function Logo({ size, className, decorative = false }: LogoProps) {
  const width = WIDTHS[size];
  return (
    <Image
      src={logo}
      alt={decorative ? '' : commonCopy.brand.logoAlt}
      width={width}
      height={Math.round((width * logo.height) / logo.width)}
      // Eager, not `priority`: navbars render a mobile and a desktop logo and hide one with CSS.
      loading="eager"
      className={cx('shrink-0', className)}
    />
  );
}
