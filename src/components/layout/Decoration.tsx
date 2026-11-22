import { PlainImage } from '@/components/ui/PlainImage';
import { cx } from '@/lib/utils/cx';

/**
 * Figma "Pilketum / Dekorasi BCC" (36:2883): half-circle pattern, 4 columns × 6 rows of 112×56 tiles.
 * Tile maps copied from the two variants (tile number = exported SVG in public/decoration, 0 = empty).
 * Decorative only: aria-hidden and never above text.
 */
const TILE_W = 112;
const TILE_H = 56;
const COLUMNS = 4;

const LAYOUTS = {
  'top-right': [0, 0, 3, 4, 0, 6, 7, 3, 9, 6, 4, 12, 13, 3, 12, 13, 0, 18, 7, 3, 0, 0, 6, 24],
  'bottom-left': [4, 12, 0, 0, 5, 13, 8, 0, 7, 6, 5, 7, 6, 24, 12, 16, 5, 13, 12, 0, 24, 5, 0, 0],
} as const;

export type DecorationCorner = keyof typeof LAYOUTS;

interface DecorationProps {
  corner: DecorationCorner;
  className?: string;
  /** Uniform scale for smaller breakpoints (1 = Figma size, 448×336). */
  scale?: number;
}

export function Decoration({ corner, className, scale = 1 }: DecorationProps) {
  const tiles = LAYOUTS[corner];
  const w = TILE_W * scale;
  const h = TILE_H * scale;
  return (
    <div
      aria-hidden="true"
      className={cx('pointer-events-none grid select-none', className)}
      style={{ gridTemplateColumns: `repeat(${COLUMNS}, ${w}px)`, gridAutoRows: `${h}px` }}
    >
      {tiles.map((tile, index) =>
        tile === 0 ? (
          <span key={index} />
        ) : (
          <PlainImage
            key={index}
            src={`/decoration/tile-${tile}.svg`}
            alt=""
            width={w}
            height={h}
            unoptimized
            className="block"
          />
        ),
      )}
    </div>
  );
}
