import type { SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /** Rendered width and height in px. */
  size?: number;
  /** Accessible name. Omit for decorative icons (default: aria-hidden). */
  title?: string;
}
