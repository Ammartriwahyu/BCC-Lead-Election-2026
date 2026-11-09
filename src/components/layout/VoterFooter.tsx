import { content } from '@/content/copy';

/**
 * Desktop: Figma "Pilketum / Voter footer" (36:2922).
 * Mobile: the MV "Footer" frame (79:3404), one centred Caption line.
 */
export function VoterFooter() {
  return (
    <footer data-surface="dark" className="bg-bg-navy">
      <p className="px-16 pt-16 pb-24 text-center text-caption text-text-on-dark-muted md:hidden">
        {content.voterFooter.copyrightShort}
      </p>
      <div className="hidden items-center justify-between border-t border-slate-700 page-gutter py-24 text-body-2 text-text-on-dark-muted md:flex">
        <p>{content.voterFooter.copyright}</p>
        <p>{content.voterFooter.organizer}</p>
      </div>
    </footer>
  );
}
