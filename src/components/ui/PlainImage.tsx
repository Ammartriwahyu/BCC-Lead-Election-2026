import { getImageProps, type ImageProps } from 'next/image';

/**
 * next/image sizing, srcset and lazy loading on a plain `<img>`, without the `<Image>` component.
 *
 * `<Image>` attaches a load listener that keeps its element (and the React tree around it) alive
 * until the image has loaded. A lazy image the page left before it loaded never does, so on a
 * booth that serves voter after voter without a reload, every page visit leaked its offscreen
 * decorations (tests/load/booths.spec.ts). Same reason as CandidateImage.
 */
export function PlainImage({ alt, ...rest }: ImageProps) {
  const { props } = getImageProps({ alt, ...rest });
  return (
    <picture className="contents">
      <img {...props} alt={alt} />
    </picture>
  );
}
