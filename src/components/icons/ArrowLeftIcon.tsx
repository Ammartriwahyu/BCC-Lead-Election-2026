import type { IconProps } from './types';

/** Figma: Icon / mdi-light:arrow-left. Colour follows `currentColor`. */
export function ArrowLeftIcon({ size = 24, title, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M19 13H6.75L12 18.25L11.34 19L4.84 12.5L11.34 6L12 6.75L6.75 12H19V13Z"
        fill="currentColor"
      />
    </svg>
  );
}
