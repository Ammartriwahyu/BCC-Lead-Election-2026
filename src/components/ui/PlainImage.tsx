import { getImageProps, type ImageProps } from 'next/image';

/**
 * next/image sizing, srcset and lazy loading on a plain `<img>`, without the `<Image>` component.
 *
 * `<Image>` attaches a load listener that keeps its element (and the React tree around it) alive
 * until the image has loaded. A lazy image the page left before it loaded never does, so on a
 * booth that serves voter after voter without a reload, every page visit leaked its offscreen
 * decorations (tests/load/booths.spec.ts). Same reason as CandidateImage.
 *
 * One URL (the 2× size), no `srcset`. Chromium gives an image with a `srcset` a viewport listener
 * on the document, and never removes it if the image is never put on the page: React sometimes
 * builds a page and drops it (a navigation overtaken by the next), and that whole page then stayed
 * in memory through its logo (tests/load/booths.spec.ts). These images have a fixed size, so the 2×
 * file costs little.
 *
 * Inside `<picture>` so React does not preload eager images on its own: screens render a mobile
 * and a desktop Brace and hide one with CSS (see Brace).
 */
export function PlainImage({ alt, ...rest }: ImageProps) {
  const { props } = getImageProps({ alt, ...rest });
  const { srcSet: _srcSet, ...imgProps } = props;
  return (
    <picture className="contents">
      <img {...imgProps} alt={alt} />
    </picture>
  );
}
