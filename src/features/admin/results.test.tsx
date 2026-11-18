import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { POLLING } from '@/config/constants';
import { getAdminOverview } from '@/lib/api/endpoints';
import { DEFAULT_OPTIONS, getDb, resetDb, setElectionStatus } from '@/mocks/db';
import { server } from '@/mocks/node';
import { applyScenario } from '@/mocks/scenarios';
import { committeeSignIn } from '@/test/admin';
import { navigation, resetNavigation } from '@/test/navigation';
import { makeTestQueryClient, renderWithProviders } from '@/test/render';

import { ResultsView } from './components/ResultsView';

type Scenario = Parameters<typeof applyScenario>[0];
type Data = Parameters<typeof applyScenario>[1];

/** First lazy import of the Display control card in a test run. */
const LAZY_LOAD_MS = 5_000;

async function renderResults(scenario: Scenario, data?: Data) {
  applyScenario(scenario, data);
  await committeeSignIn();
  resetNavigation('/admin/results');
  const view = renderWithProviders(<ResultsView />);
  return { ...view, user: userEvent.setup() };
}

const resultRows = async () =>
  within(await screen.findByRole('list', { name: 'Results by candidate' })).getAllByRole(
    'listitem',
  );

/** Counts requests for candidate totals without changing the answer. */
function watchResultsRequests() {
  let count = 0;
  server.use(
    http.get('*/api/admin/results', () => {
      count += 1;
      return undefined;
    }),
  );
  return () => count;
}

describe('ResultsView (A4)', () => {
  afterEach(() => {
    // Candidate sets chosen by a test must not leak into the next one.
    resetDb(DEFAULT_OPTIONS);
  });

  it('ranks candidates with votes and shares to one decimal', async () => {
    await renderResults('closed');
    const rows = await resultRows();
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^Candidate 01, Most votesCandidate Name 0162 votes55\.9%$/),
      expect.stringMatching(/^Candidate 02Candidate Name 0233 votes29\.7%$/),
      expect.stringMatching(/^Candidate 03Candidate Name 0316 votes14\.4%$/),
    ]);
    expect(rows[0]).toHaveAttribute('data-leading', 'true');
    expect(rows[1]).not.toHaveAttribute('data-leading');
    expect(within(rows[0] as HTMLElement).getByTestId('meter-fill')).toHaveStyle({
      width: `${(62 / 111) * 100}%`,
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Results' })).toBeInTheDocument();
    expect(screen.getByText('111 votes from 139 registered members.')).toBeInTheDocument();
    expect(screen.getByText(/^Shares are based on 111 valid votes\./)).toBeInTheDocument();
    // Loads lazily (JS budget).
    expect(
      await screen.findByRole('heading', { name: 'Display control' }, { timeout: LAZY_LOAD_MS }),
    ).toBeInTheDocument();
  });

  it('tie: every candidate on the top count is marked, none is singled out', async () => {
    await renderResults('tie');
    const rows = await resultRows();
    const leading = rows.filter((row) => row.hasAttribute('data-leading'));
    expect(leading).toHaveLength(2);
    leading.forEach((row) => {
      expect(row).toHaveTextContent('Tied for most votes');
    });
    expect(rows[2]).not.toHaveTextContent('most votes');
  });

  it('zero votes: 0.0% everywhere and no leader', async () => {
    await renderResults('zero-votes');
    const rows = await resultRows();
    expect(rows).toHaveLength(3);
    rows.forEach((row) => {
      expect(row).toHaveTextContent('0 votes0.0%');
      expect(row).not.toHaveAttribute('data-leading');
    });
    expect(screen.getByText('0 votes from 139 registered members.')).toBeInTheDocument();
  });

  it('handles one candidate and more than three', async () => {
    const one = await renderResults('closed', { candidateSet: 'one' });
    const single = await resultRows();
    expect(single).toHaveLength(1);
    expect(single[0]).toHaveTextContent('100.0%');
    one.unmount();

    await renderResults('closed', { candidateSet: 'six' });
    expect(await resultRows()).toHaveLength(6);
    // Six totals do not fit the thumbnail.
    expect(
      within(screen.getByTestId('display-row-FINAL_RESULTS')).getByText('Results'),
    ).toBeInTheDocument();
  });

  it('reopening from Results stays on the page and keeps counting live', async () => {
    const { user } = await renderResults('closed');
    await resultRows();
    await user.click(screen.getByRole('button', { name: 'Reopen voting' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reopen voting?' });
    await user.click(within(dialog).getByRole('button', { name: 'Reopen voting' }));
    expect(await screen.findByText(/so far from 139 registered members/)).toBeInTheDocument();
    expect(getDb().status).toBe('open');
    expect(navigation.router.replace).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Close voting' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Export results (.xlsx)' }),
    ).not.toBeInTheDocument();
  });

  it('not started: locked, and candidate totals are never requested', async () => {
    const requests = watchResultsRequests();
    const { user } = await renderResults('not-started');
    const dialog = await screen.findByRole('dialog', { name: 'Results are locked' });
    expect(screen.queryByText(/\d+ votes?/)).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'OK' }));
    expect(navigation.router.replace).toHaveBeenCalledWith('/admin');
    expect(requests()).toBe(0);
  });

  it('open: live totals that follow new votes, Close voting instead of Export', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await renderResults('open');
      const before = await resultRows();
      expect(before).toHaveLength(3);
      const votes = getDb().tallies.get(1) ?? 0;
      expect(
        screen.getByText(/votes? so far from 139 registered members\. Updates live\./),
      ).toBeVisible();
      expect(screen.getByText(/^Live count for the committee/)).toBeVisible();
      expect(screen.getByRole('button', { name: 'Close voting' })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Export results (.xlsx)' }),
      ).not.toBeInTheDocument();

      // A member votes for candidate 1 in a booth: the row follows on the next poll.
      getDb().tallies.set(1, votes + 1);
      await vi.advanceTimersByTimeAsync(POLLING.adminLiveResultsMs);
      await waitFor(() => {
        expect(
          within(screen.getAllByRole('listitem')[0] as HTMLElement).getByText(
            `${String(votes + 1)} votes`,
          ),
        ).toBeInTheDocument();
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('open, but the backend keeps totals until closing: explains instead of failing', async () => {
    server.use(
      http.get('*/api/admin/results', () =>
        HttpResponse.json({ error: { code: 'RESULTS_LOCKED' } }, { status: 409 }),
      ),
    );
    await renderResults('open');
    expect(await screen.findByText(/^Live results are not available yet/)).toBeVisible();
    expect(screen.queryByRole('list', { name: 'Results by candidate' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close voting' })).toBeInTheDocument();
  });

  it('follows a reopen made elsewhere: the final totals turn into the live count', async () => {
    applyScenario('closed');
    await committeeSignIn();
    // This tab still believes voting is closed; the backend has already reopened it.
    const queryClient = makeTestQueryClient();
    queryClient.setQueryData(['admin', 'overview'], await getAdminOverview());
    setElectionStatus(getDb(), 'open');
    resetNavigation('/admin/results');
    renderWithProviders(<ResultsView />, { queryClient });
    await resultRows();
    await queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    expect(await screen.findByText(/so far from 139 registered members/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Results are locked' })).not.toBeInTheDocument();
  });

  it('shows an error with retry when the totals cannot be loaded', async () => {
    let fail = true;
    server.use(
      http.get('*/api/admin/results', () => {
        if (!fail) return undefined;
        return HttpResponse.json({ error: { code: 'UNKNOWN' } }, { status: 500 });
      }),
    );
    const { user } = await renderResults('closed');
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load this page");
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await resultRows()).toHaveLength(3);
  });

  it('shows an error with retry when the state cannot be loaded', async () => {
    applyScenario('closed');
    await committeeSignIn();
    server.use(
      http.get(
        '*/api/admin/overview',
        () => HttpResponse.json({ error: { code: 'UNKNOWN' } }, { status: 500 }),
        { once: true },
      ),
    );
    renderWithProviders(<ResultsView />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(await resultRows()).toHaveLength(3);
  });
});

describe('Results: export and integrity', () => {
  it('downloads the Excel file under the backend file name', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:export');
    const revoke = vi.fn();
    URL.revokeObjectURL = revoke;
    const clicks: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(this.download);
    });
    const { user } = await renderResults('closed');
    await user.click(await screen.findByRole('button', { name: 'Export results (.xlsx)' }));
    await waitFor(() => {
      expect(clicks).toEqual(['pilketum-bcc-2026-results.xlsx']);
    });
    expect(revoke).toHaveBeenCalledWith('blob:export');
    click.mockRestore();
  });

  it('says so when the export fails', async () => {
    server.use(
      http.get('*/api/admin/results/export', () =>
        HttpResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 }),
      ),
    );
    const { user } = await renderResults('closed');
    await user.click(await screen.findByRole('button', { name: 'Export results (.xlsx)' }));
    expect(await screen.findByText("We couldn't export the results. Try again.")).toBeVisible();
  });

  it('warns not to announce when ballots and voters do not match', async () => {
    const row = (id: number, votes: number, rank: number) => ({
      id,
      ballot_number: id,
      full_name: `Candidate Name 0${String(id)}`,
      study_program: 'Information Systems',
      class_year: 2023,
      photo_url: null,
      votes,
      share: 0,
      rank,
    });
    server.use(
      http.get('*/api/admin/results', () =>
        HttpResponse.json({
          status: 'closed',
          display_screen: 'voting_closed',
          results: {
            total_votes: 5,
            turnout: { registered: 139, voted: 4, not_voted: 135, percent: 2.9 },
            candidates: [row(1, 3, 1), row(2, 1, 2), row(3, 1, 2)],
            leaders: [1],
            top_tied: false,
            integrity_ok: false,
          },
        }),
      ),
    );
    await renderResults('closed');
    expect(await screen.findByText(/Don't announce the results yet/)).toBeVisible();
  });
});
