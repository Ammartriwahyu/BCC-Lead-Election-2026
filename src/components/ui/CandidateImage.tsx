import { getImageProps } from 'next/image';

import { cx } from '@/lib/utils/cx';

interface CandidateImageProps {
  src: string;
  alt: string;
  /** `sizes` for the responsive srcset (the image fills its positioned parent). */
  sizes: string;
  className?: string;
}

/**
 * A candidate photo that fills its (relative) parent, resized by Next's image optimizer. Top-aligned:
 * a portrait in a wider frame (the ballot card on large screens) loses its bottom, never the head
 * (DEVIATIONS #88; the Adjust photo previews use the same rule).
 *
 * Plain `<img>` with `getImageProps` instead of the `<Image>` component: on a booth the ballot is
 * shown to every voter without a reload, and each `<Image>` kept its element alive after the page
 * changed (≈ 3 DOM nodes per voter in tests/load). A picked file (`blob:`) is shown as it is.
 */
export function CandidateImage({ src, alt, sizes, className }: CandidateImageProps) {
  const { props } = getImageProps({
    src,
    alt,
    fill: true,
    sizes,
    unoptimized: src.startsWith('blob:'),
  });
  const { style: _style, ...imgProps } = props;
  return (
    <picture className="contents">
      <img
        {...imgProps}
        alt={alt}
        className={cx('absolute inset-0 size-full object-cover object-top', className)}
      />
    </picture>
  );
}
