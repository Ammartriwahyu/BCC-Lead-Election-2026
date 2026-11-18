import type { IconProps } from './types';

/** Figma toast check (green circle, white tick). Circle follows `currentColor`. */
export function CheckCircleIcon({ size = 24, title, ...props }: IconProps) {
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
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path
        d="M7.5 12.5L10.5 15.5L16.5 9"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
