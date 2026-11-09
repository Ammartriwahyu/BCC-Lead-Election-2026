import Image from 'next/image';

import { PersonIcon } from '@/components/icons/PersonIcon';
import { content } from '@/content/copy';
import { cx } from '@/lib/utils/cx';

interface CandidatePhotoProps {
  name: string;
  photoUrl: string | null;
  /** card: light card frame. hero: navy profile frame (V3). */
  tone: 'card' | 'card-selected' | 'hero';
  className: string;
  iconClassName: string;
  /** Show the "Candidate photo" caption under the placeholder icon. */
  showCaption: boolean;
  sizes: string;
}

/**
 * Candidate portrait or the Figma placeholder (people icon + "Candidate photo").
 * Photos come from data; the placeholder is used while a candidate has none.
 */
export function CandidatePhoto({
  name,
  photoUrl,
  tone,
  className,
  iconClassName,
  showCaption,
  sizes,
}: CandidatePhotoProps) {
  return (
    <div
      className={cx(
        'relative flex shrink-0 flex-col items-center justify-center gap-8 overflow-hidden',
        tone === 'card' && 'bg-bg-subtle',
        tone === 'card-selected' && 'bg-surface-card',
        tone === 'hero' && 'border-2 border-primary-500 bg-primary-700',
        className,
      )}
    >
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={content.candidates.photoAlt(name)}
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <>
          <PersonIcon className={cx('text-primary-300', iconClassName)} />
          {showCaption ? (
            <span
              className={cx(
                'text-body-2-medium',
                tone === 'hero' ? 'text-primary-200' : 'text-text-brand',
              )}
            >
              {content.candidates.photo}
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}
