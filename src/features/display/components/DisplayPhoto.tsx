import { PersonIcon } from '@/components/icons/PersonIcon';
import { CandidateImage } from '@/components/ui/CandidateImage';
import { content } from '@/content/copy';
import { cx } from '@/lib/utils/cx';

interface DisplayPhotoProps {
  name: string;
  photoUrl: string | null;
  /** Rendered size in px (square). Figma: 96 (D1), 104 / 128 (D3), 72 (ranked list). */
  size: number;
  /** highlight: orange/300 with a navy icon (leading candidate). default: primary/700, primary/300 icon. */
  tone?: 'default' | 'highlight';
}

/** Ratio of icon to circle in the D frames (40 / 96, 44 / 104, 52 / 128). */
const ICON_RATIO = 0.42;

/** Round candidate portrait on navy, or the people icon while a candidate has no photo. */
export function DisplayPhoto({ name, photoUrl, size, tone = 'default' }: DisplayPhotoProps) {
  return (
    <div
      className={cx(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        tone === 'highlight' ? 'bg-orange-300 text-primary-800' : 'bg-primary-700 text-primary-300',
      )}
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        <CandidateImage
          src={photoUrl}
          alt={content.candidates.photoAlt(name)}
          sizes={`${size}px`}
        />
      ) : (
        <PersonIcon size={Math.round(size * ICON_RATIO)} />
      )}
    </div>
  );
}
