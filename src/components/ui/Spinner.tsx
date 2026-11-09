import { cx } from '@/lib/utils/cx';

interface SpinnerProps {
  /** px. Figma: 48 (desktop Submitting card), 40 (mobile sheet), 20 inside buttons. */
  size?: number;
  className?: string;
  /** Track/progress colours for dark buttons. */
  tone?: 'brand' | 'on-dark';
}

/** Figma "Spinner" (40:2381). Decorative; pair it with visible or aria-live text. */
export function Spinner({ size = 48, className, tone = 'brand' }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cx('shrink-0', className)}
    >
      <path
        d="M48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24ZM4.8 24C4.8 34.6039 13.3961 43.2 24 43.2C34.6039 43.2 43.2 34.6039 43.2 24C43.2 13.3961 34.6039 4.8 24 4.8C13.3961 4.8 4.8 13.3961 4.8 24Z"
        className={tone === 'brand' ? 'fill-bg-subtle' : 'fill-text-on-dark/30'}
      />
      <g className="origin-center animate-spin [transform-box:fill-box]">
        <path
          d="M24 0C28.7467 0 33.3869 1.40758 37.3337 4.04473C41.2805 6.68188 44.3566 10.4302 46.1731 14.8156C47.9896 19.201 48.4649 24.0266 47.5388 28.6822C46.6128 33.3377 44.327 37.6141 40.9706 40.9706C37.6141 44.327 33.3377 46.6128 28.6822 47.5388C24.0266 48.4649 19.201 47.9896 14.8156 46.1731C10.4302 44.3566 6.68188 41.2805 4.04473 37.3337C1.40757 33.3869 0 28.7467 0 24H4.8C4.8 27.7974 5.92606 31.5095 8.03578 34.6669C10.1455 37.8244 13.1441 40.2853 16.6525 41.7385C20.1608 43.1917 24.0213 43.5719 27.7457 42.8311C31.4702 42.0902 34.8913 40.2616 37.5765 37.5765C40.2616 34.8913 42.0902 31.4702 42.8311 27.7457C43.5719 24.0213 43.1917 20.1608 41.7385 16.6525C40.2853 13.1441 37.8244 10.1455 34.667 8.03578C31.5095 5.92606 27.7974 4.8 24 4.8L24 0Z"
          className={tone === 'brand' ? 'fill-action-primary' : 'fill-text-on-dark'}
        />
      </g>
    </svg>
  );
}
