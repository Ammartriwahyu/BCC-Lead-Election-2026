'use client';

import { getImageProps } from 'next/image';
import { useCallback } from 'react';

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
 * changed (≈ 3 DOM nodes per voter in tests/load). The sources are set once the image is on the
 * page (ref callback), never on an image React builds and drops: see PlainImage for the Chromium
 * listener that would keep it alive (no `src` in the server HTML either, so React preloads
 * nothing). A picked file (`blob:`) is shown as it is.
 */
export function CandidateImage({ src, alt, sizes, className }: CandidateImageProps) {
  const { props } = getImageProps({
    src,
    alt,
    fill: true,
    sizes,
    unoptimized: src.startsWith('blob:'),
  });
  const { style: _style, src: url, srcSet, sizes: srcSizes, ...imgProps } = props;
  const setSources = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) return;
      // sizes and srcset before src, so the browser picks from the set and loads one file.
      if (srcSizes) img.sizes = srcSizes;
      if (srcSet) img.srcset = srcSet;
      img.src = url;
    },
    [url, srcSet, srcSizes],
  );
  return (
    // eslint-disable-next-line @next/next/no-img-element -- next/image props on a plain img, see above
    <img
      {...imgProps}
      ref={setSources}
      alt={alt}
      className={cx('absolute inset-0 size-full object-cover object-top', className)}
    />
  );
}
