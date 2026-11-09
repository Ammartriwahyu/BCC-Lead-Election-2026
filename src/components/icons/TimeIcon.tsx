import type { IconProps } from './types';

/** Figma: Icon / icon-park-outline:time. Colour follows `currentColor`. */
export function TimeIcon({ size = 20, title, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-0.83 -0.83 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M9.16667 17.5C13.7692 17.5 17.5 13.7692 17.5 9.16667C17.5 4.56417 13.7692 0.833333 9.16667 0.833333C4.56417 0.833333 0.833333 4.56417 0.833333 9.16667C0.833333 13.7692 4.56417 17.5 9.16667 17.5Z"
        strokeWidth="1.66667"
        strokeLinejoin="round"
        stroke="currentColor"
      />
      <path
        d="M9.17 4.16667V9.17083L12.7029 12.7042"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke="currentColor"
      />
    </svg>
  );
}
