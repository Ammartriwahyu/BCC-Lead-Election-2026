import { Brace } from '@/components/layout/Brace';
import { Decoration } from '@/components/layout/Decoration';
import { content } from '@/content/copy';
import { ElectionBadge } from '@/features/election/components/ElectionBadge';

const copy = content.candidates;

/**
 * Navy hero of V1 (not started: Brace "Woah") and V2 (open: Brace "Hello"),
 * mobile MV1/MV2: Heading 5, Brace 96 wide, no decoration.
 */
export function CandidatesHero({ open }: { open: boolean }) {
  return (
    <section
      data-surface="dark"
      aria-labelledby="candidates-hero-title"
      className="relative isolate flex items-end gap-8 overflow-hidden bg-bg-navy page-gutter pt-24 md:gap-48 md:pt-48"
    >
      <Decoration corner="top-right" className="absolute -top-56 -right-112 -z-10 hidden lg:grid" />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-10 pb-24 md:gap-16 md:pb-48">
        <ElectionBadge state={open ? 'OPEN' : 'NOT_STARTED'} />
        <h1
          id="candidates-hero-title"
          className="text-heading-5 text-text-on-dark md:text-heading-2"
        >
          {open ? copy.heroOpen.title : copy.heroNotStarted.title}
        </h1>
        <p className="text-body-2 text-text-on-dark-muted md:max-w-640 md:text-body-1">
          {open ? (
            <>
              <span className="md:hidden">{copy.heroOpen.bodyMobile}</span>
              <span className="hidden md:inline">{copy.heroOpen.body}</span>
            </>
          ) : (
            copy.heroNotStarted.body
          )}
        </p>
      </div>
      <Brace pose={open ? 'hello' : 'woah'} width={96} eager className="md:hidden" />
      <Brace pose={open ? 'hello' : 'woah'} width={220} eager className="hidden md:block" />
    </section>
  );
}
