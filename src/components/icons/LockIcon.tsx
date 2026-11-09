import type { IconProps } from './types';

/** Figma: Icon / boxicons:lock. Colour follows `currentColor`. */
export function LockIcon({ size = 20, title, ...props }: IconProps) {
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
      <path
        d="M5 18.3333H15C15.9167 18.3333 16.6667 17.5833 16.6667 16.6667V9.16667C16.6667 8.25 15.9167 7.5 15 7.5H14.1667V5.83333C14.1667 3.53333 12.3 1.66667 10 1.66667C7.7 1.66667 5.83333 3.53333 5.83333 5.83333V7.5H5C4.08333 7.5 3.33333 8.25 3.33333 9.16667V16.6667C3.33333 17.5833 4.08333 18.3333 5 18.3333ZM7.5 5.83333C7.5 4.45833 8.625 3.33333 10 3.33333C11.375 3.33333 12.5 4.45833 12.5 5.83333V7.5H7.5V5.83333ZM5 9.16667H15V16.6667H5V9.16667Z"
        fill="currentColor"
      />
    </svg>
  );
}
