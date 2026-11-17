import type { IconProps } from './types';

/** Figma: Icon / material-symbols:delete-outline. Colour follows `currentColor`. */
export function DeleteIcon({ size = 22, title, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M6.41667 19.25C5.9125 19.25 5.48106 19.0706 5.12233 18.7119C4.76361 18.3532 4.58394 17.9214 4.58333 17.4167V5.5H3.66667V3.66667H8.25V2.75H13.75V3.66667H18.3333V5.5H17.4167V17.4167C17.4167 17.9208 17.2373 18.3526 16.8786 18.7119C16.5199 19.0713 16.0881 19.2506 15.5833 19.25H6.41667ZM15.5833 5.5H6.41667V17.4167H15.5833V5.5ZM8.25 15.5833H10.0833V7.33333H8.25V15.5833ZM11.9167 15.5833H13.75V7.33333H11.9167V15.5833Z"
        fill="currentColor"
      />
    </svg>
  );
}
