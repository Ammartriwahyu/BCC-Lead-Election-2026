import type { IconProps } from './types';

/** Figma: Icon / openmoji:information (rendered as a filled circle in the notes). Colour follows `currentColor`. */
export function InfoIcon({ size = 20, title, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="10" cy="10" r="7.78" fill="currentColor" />
    </svg>
  );
}
