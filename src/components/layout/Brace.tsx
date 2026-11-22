import glory from '@/assets/brace/glory.png';
import hello from '@/assets/brace/hello.png';
import woah from '@/assets/brace/woah.png';
import { PlainImage } from '@/components/ui/PlainImage';
import { cx } from '@/lib/utils/cx';

/**
 * Figma "Pilketum / Brace" (36:2887): the BCC fox mascot.
 * Hello = welcome / sign in, Woah = waiting or something went wrong, Glory = celebration and results.
 * Always decorative (alt=""). Scale by width, never stretch.
 */
const POSES = { hello, woah, glory } as const;

export type BracePose = keyof typeof POSES;

interface BraceProps {
  pose: BracePose;
  /** Rendered width in px; height follows the sticker's aspect ratio. */
  width: number;
  className?: string;
  /**
   * Load at once (above the fold). Deliberately not `priority`: most screens render a mobile and a
   * desktop Brace and hide one with CSS, and a preload for the hidden one is wasted (and warned about).
   */
  eager?: boolean;
}

export function Brace({ pose, width, className, eager = false }: BraceProps) {
  const image = POSES[pose];
  return (
    <PlainImage
      src={image}
      alt=""
      aria-hidden="true"
      data-brace={pose}
      width={width}
      height={Math.round((width * image.height) / image.width)}
      loading={eager ? 'eager' : 'lazy'}
      className={cx('pointer-events-none shrink-0 select-none', className)}
    />
  );
}
