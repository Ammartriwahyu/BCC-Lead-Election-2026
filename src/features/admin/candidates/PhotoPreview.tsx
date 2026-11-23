import { coverPlacement, type Rect, type Size } from './photoCrop';

interface PhotoPreviewProps {
  /** Object URL of the picked photo. */
  url: string;
  photo: Size;
  /** The part of the photo the crop keeps. */
  rect: Rect;
  /** Real size of the frame on its page, shown at `scale`. */
  frame: { width: number; height: number; scale: number };
  label: string;
}

/**
 * NEW (DEVIATIONS #88): one live preview in the Adjust photo dialog. Shows the current crop the
 * way a real frame (ballot card, profile) will show the saved photo: filled, top-aligned.
 */
export function PhotoPreview({ url, photo, rect, frame, label }: PhotoPreviewProps) {
  const box = { width: frame.width * frame.scale, height: frame.height * frame.scale };
  const place = coverPlacement(rect, box);
  return (
    <figure className="flex flex-col gap-8">
      <div
        aria-hidden="true"
        style={box}
        className="relative shrink-0 overflow-hidden rounded-md bg-bg-subtle"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, positioned by hand */}
        <img
          src={url}
          alt=""
          draggable={false}
          className="pointer-events-none absolute top-0 left-0 max-w-none"
          style={{
            width: photo.width * place.scale,
            height: photo.height * place.scale,
            transform: `translate(${String(place.x)}px, ${String(place.y)}px)`,
          }}
        />
      </div>
      <figcaption className="text-caption text-text-secondary">{label}</figcaption>
    </figure>
  );
}
