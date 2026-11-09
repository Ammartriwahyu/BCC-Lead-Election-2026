import type { IconProps } from './types';

/**
 * NEW (not in Figma): "hide password" state of solar:eye-linear, same stroke with a slash.
 * Logged in docs/DEVIATIONS.md.
 */
export function EyeOffIcon({ size = 22, title, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 21.5 17.5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M2.025 12.046C1.175 10.942 0.75 10.389 0.75 8.75C0.75 7.11 1.175 6.559 2.025 5.454C3.722 3.25 6.568 0.75 10.75 0.75C14.932 0.75 17.778 3.25 19.475 5.454C20.325 6.56 20.75 7.111 20.75 8.75C20.75 10.39 20.325 10.941 19.475 12.046C17.778 14.25 14.932 16.75 10.75 16.75C6.568 16.75 3.722 14.25 2.025 12.046Z"
        strokeWidth="1.5"
        stroke="currentColor"
      />
      <path
        d="M13.75 8.75C13.75 10.4069 12.4069 11.75 10.75 11.75C9.09315 11.75 7.75 10.4069 7.75 8.75C7.75 7.09315 9.09315 5.75 10.75 5.75C12.4069 5.75 13.75 7.09315 13.75 8.75Z"
        strokeWidth="1.5"
        stroke="currentColor"
      />
      <path
        d="M2.75 0.75L18.75 16.75"
        strokeWidth="1.5"
        strokeLinecap="round"
        stroke="currentColor"
      />
    </svg>
  );
}
