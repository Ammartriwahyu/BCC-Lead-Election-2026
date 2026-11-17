import { cx } from '@/lib/utils/cx';

interface MeterBarProps {
  /** 0..1 */
  ratio: number;
  /** lg: Turnout card (16 px). md: result rows (12 px). */
  size?: 'md' | 'lg';
  /** strong: action/primary (turnout, leading candidate). soft: primary/300 (other candidates). */
  tone?: 'strong' | 'soft';
  className?: string;
}

const PERCENT = 100;

/**
 * "Bar track" + "Bar fill" of A2 Turnout (42:2389) and Pilketum / Result row (37:1126).
 * Decorative: the number it shows is always written next to it.
 */
export function MeterBar({ ratio, size = 'md', tone = 'strong', className }: MeterBarProps) {
  const percent = Math.min(Math.max(Number.isFinite(ratio) ? ratio : 0, 0), 1) * PERCENT;
  return (
    <div
      aria-hidden="true"
      className={cx(
        'w-full overflow-hidden rounded-full bg-neutral-100',
        size === 'lg' ? 'h-16' : 'h-12',
        className,
      )}
    >
      <div
        data-testid="meter-fill"
        className={cx(
          'h-full rounded-full transition-[width] duration-300',
          tone === 'strong' ? 'bg-action-primary' : 'bg-primary-300',
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
