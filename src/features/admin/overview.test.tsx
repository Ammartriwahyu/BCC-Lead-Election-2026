import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { getDb, setElectionStatus } from '@/mocks/db';
import { server } from '@/mocks/node';
import { applyScenario } from '@/mocks/scenarios';
import { committeeSignIn } from '@/test/admin';
import { resetNavigation } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';

import { OverviewView } from './components/OverviewView';

async function renderOverview(scenario: Parameters<typeof applyScenario>[0]) {
  applyScenario(scenario);
  await committeeSignIn();
  resetNavigation('/admin');
  const view = renderWithProviders(<OverviewView />);
  await screen.findByRole('heading', { level: 1, name: 'Overview' });
  return { ...view, user: userEvent.setup() };
}

const row = (screen_: string) => screen.getByTestId(`display-row-${screen_}`);

describe('OverviewView', () => {
  it('A1 not started: three stat cards with notes and "Open voting now"', async () => {
    await renderOverview('not-started');
    expect(screen.getByText('Not started', { selector: 'h1 + span' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Members can sign in and read the candidates. Nobody can vote until you open voting.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('On the voter register')).toBeInTheDocument();
    expect(screen.getByText('Vision and mission published')).toBeInTheDocument();
    expect(screen.getByText('Voting has not started')).toBeInTheDocument();
    expect(screen.getByText('139')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    // No live turnout card and no "Not voted yet" before voting opens.
    expect(screen.queryByText('Not voted yet')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Turnout' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open voting now' })).toBeInTheDocument();
    expect(within(row('OPENS_SOON')).getByText('On screen')).toBeInTheDocument();
    expect(screen.getByText('Not started', { selector: 'li span' })).toBeInTheDocument();
    expect(screen.getByText('Now')).toBeInTheDocument();
  });

  it('opens voting after confirmation and follows the new state', async () => {
    const { user } = await renderOverview('not-started');
    await user.click(screen.getByRole('button', { name: 'Open voting now' }));
    const dialog = await screen.findByRole('dialog', { name: 'Open voting now?' });
    expect(dialog).toHaveTextContent('Members can start voting right away.');
    await user.click(within(dialog).getByRole('button', { name: 'Open voting' }));

    expect(await screen.findByRole('button', { name: 'Close voting' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getDb().status).toBe('open');
    expect(screen.getByText('Members can vote until you close voting.')).toBeInTheDocument();
    expect(within(row('VOTING_OPEN')).getByText('On screen')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('announcer-polite')).toHaveTextContent('Voting is now open.');
    });
  });

  it('A2 open: live turnout, and closing shows who has not voted yet', async () => {
    const { user } = await renderOverview('open');
    expect(screen.getByText('Not voted yet')).toBeInTheDocument();
    expect(screen.getByText('138')).toBeInTheDocument();
    expect(screen.getByText('1 of 139 members')).toBeInTheDocument();
    expect(
      screen.getByText(/Candidate totals stay hidden until voting closes\./),
    ).toBeInTheDocument();
    // Turnout thumbnail, never candidate totals.
    expect(within(row('VOTING_OPEN')).getByText('0.7%')).toBeInTheDocument();
    expect(within(row('FINAL_RESULTS')).getByText('Results')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close voting' }));
    const dialog = await screen.findByRole('dialog', { name: 'Close voting now?' });
    expect(dialog).toHaveTextContent('1 of 139 members have voted');
    expect(dialog).toHaveTextContent('138 members have not voted');
    await user.click(within(dialog).getByRole('button', { name: 'Close voting' }));

    expect(await screen.findByRole('link', { name: 'View results' })).toHaveAttribute(
      'href',
      '/admin/results',
    );
    expect(getDb().status).toBe('closed');
    expect(within(row('VOTING_CLOSED')).getByText('On screen')).toBeInTheDocument();
  });

  it('A3 closed: final numbers, and reopening keeps the votes', async () => {
    const { user } = await renderOverview('closed');
    expect(screen.getByText('Did not vote')).toBeInTheDocument();
    expect(screen.getByText('Final turnout')).toBeInTheDocument();
    expect(screen.getAllByText('79.9%').length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: 'Turnout' })).not.toBeInTheDocument();
    // Totals are available after closing, so the thumbnail lists them.
    expect(await within(row('FINAL_RESULTS')).findByText('62 · 33 · 16')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reopen voting' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reopen voting?' });
    expect(dialog).toHaveTextContent('The 111 votes already submitted are kept');
    expect(dialog).toHaveTextContent("28 members haven't voted yet");
    await user.click(within(dialog).getByRole('button', { name: 'Reopen voting' }));

    expect(await screen.findByRole('button', { name: 'Close voting' })).toBeInTheDocument();
    expect(getDb().status).toBe('open');
    expect(screen.getByText('111 of 139 members')).toBeInTheDocument();
    // Totals are locked again: the thumbnail no longer shows them.
    expect(within(row('FINAL_RESULTS')).getByText('Results')).toBeInTheDocument();
  });

  it('a double click on confirm sends one request', async () => {
    const { user } = await renderOverview('not-started');
    let requests = 0;
    server.use(
      http.post('*/api/admin/election/open', () => {
        requests += 1;
        return undefined;
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Open voting now' }));
    const dialog = await screen.findByRole('dialog');
    await user.dblClick(within(dialog).getByRole('button', { name: 'Open voting' }));
    expect(await screen.findByRole('button', { name: 'Close voting' })).toBeInTheDocument();
    expect(requests).toBe(1);
    expect(screen.queryByText('Someone else changed the voting state')).not.toBeInTheDocument();
  });

  it('Cancel leaves the state alone', async () => {
    const { user } = await renderOverview('open');
    await user.click(screen.getByRole('button', { name: 'Close voting' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(getDb().status).toBe('open');
  });

  it('conflict: another committee member acted first, so nothing is changed twice', async () => {
    const { user } = await renderOverview('not-started');
    await user.click(screen.getByRole('button', { name: 'Open voting now' }));
    const dialog = await screen.findByRole('dialog');
    // Second committee member opens and closes voting while this dialog is open.
    setElectionStatus(getDb(), 'open');
    setElectionStatus(getDb(), 'closed');
    await user.click(within(dialog).getByRole('button', { name: 'Open voting' }));

    expect(await screen.findByText('Someone else changed the voting state')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(await screen.findByRole('button', { name: 'Reopen voting' })).toBeInTheDocument();
    expect(getDb().status).toBe('closed');
  });

  it('a failed request keeps the dialog open so the committee can retry', async () => {
    const { user } = await renderOverview('not-started');
    server.use(http.post('*/api/admin/election/open', () => HttpResponse.error(), { once: true }));
    await user.click(screen.getByRole('button', { name: 'Open voting now' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Open voting' }));
    expect(await screen.findByText("That didn't go through")).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(getDb().status).toBe('not_started');

    await user.click(within(dialog).getByRole('button', { name: 'Open voting' }));
    expect(await screen.findByRole('button', { name: 'Close voting' })).toBeInTheDocument();
  });

  it('shows an error with retry when the overview cannot be loaded', async () => {
    applyScenario('open');
    await committeeSignIn();
    let fail = true;
    server.use(
      http.get('*/api/admin/overview', () => {
        if (!fail) return undefined;
        return HttpResponse.json({ error: { code: 'UNKNOWN' } }, { status: 500 });
      }),
    );
    renderWithProviders(<OverviewView />);
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load this page");
    fail = false;
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
  });
});

describe('DisplayControlCard', () => {
  it('rows that are not allowed in this state explain why and offer no action', async () => {
    await renderOverview('open');
    expect(within(row('OPENS_SOON')).getByText('Only before voting opens')).toBeInTheDocument();
    expect(within(row('WINNER_REVEAL')).getByText('Available after voting closes')).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Show on display/ })).not.toBeInTheDocument();
    const preview = within(row('VOTING_OPEN')).getByRole('link', {
      name: 'Preview Voting open in a new tab',
    });
    expect(preview).toHaveAttribute('href', '/display');
    expect(preview).toHaveAttribute('target', '_blank');
  });

  it('shows a result screen only after "Show on display"', async () => {
    const { user } = await renderOverview('closed');
    expect(getDb().displayScreen).toBe('voting_closed');
    await user.click(screen.getByRole('button', { name: 'Show on display: Final results' }));
    expect(await within(row('FINAL_RESULTS')).findByText('On screen')).toBeInTheDocument();
    await waitFor(() => {
      expect(getDb().displayScreen).toBe('final_results');
    });
    // The previous screen can be put back.
    expect(
      await screen.findByRole('button', { name: 'Show on display: Voting closed' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('announcer-polite')).toHaveTextContent(
        'The display now shows Final results.',
      );
    });
  });

  it('a double click on "Show on display" sends one request', async () => {
    const { user } = await renderOverview('closed');
    let requests = 0;
    server.use(
      http.put('*/api/admin/display', () => {
        requests += 1;
        return undefined;
      }),
    );
    await user.dblClick(screen.getByRole('button', { name: 'Show on display: Most votes' }));
    await waitFor(() => {
      expect(getDb().displayScreen).toBe('most_votes');
    });
    expect(requests).toBe(1);
    expect(screen.queryByText('The display changed in the meantime')).not.toBeInTheDocument();
  });

  it('rolls back when voting was reopened elsewhere before the click', async () => {
    const { user } = await renderOverview('closed');
    // Another committee member reopened voting: result screens are refused (RESULTS_LOCKED).
    setElectionStatus(getDb(), 'open');
    await user.click(screen.getByRole('button', { name: 'Show on display: Most votes' }));

    expect(await screen.findByText('The display changed in the meantime')).toBeInTheDocument();
    expect(await within(row('VOTING_OPEN')).findByText('On screen')).toBeInTheDocument();
    expect(within(row('MOST_VOTES')).queryByText('On screen')).not.toBeInTheDocument();
    expect(getDb().displayScreen).toBe('voting_open');
  });

  it('rolls back when the request fails', async () => {
    const { user } = await renderOverview('closed');
    server.use(http.put('*/api/admin/display', () => HttpResponse.error(), { once: true }));
    await user.click(screen.getByRole('button', { name: 'Show on display: The winner is…' }));
    expect(await screen.findByText("That didn't go through")).toBeInTheDocument();
    await waitFor(() => {
      expect(within(row('VOTING_CLOSED')).getByText('On screen')).toBeInTheDocument();
    });
    expect(within(row('WINNER_REVEAL')).queryByText('On screen')).not.toBeInTheDocument();
    expect(getDb().displayScreen).toBe('voting_closed');
  });
});
