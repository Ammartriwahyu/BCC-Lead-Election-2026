import Image from 'next/image';

import glory from '@/assets/brace/glory.png';
import hello from '@/assets/brace/hello.png';
import woah from '@/assets/brace/woah.png';
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
  priority?: boolean;
}

export function Brace({ pose, width, className, priority = false }: BraceProps) {
  const image = POSES[pose];
  return (
    <Image
      src={image}
      alt=""
      aria-hidden="true"
      width={width}
      height={Math.round((width * image.height) / image.width)}
      priority={priority}
      className={cx('pointer-events-none shrink-0 select-none', className)}
    />
  );
}
