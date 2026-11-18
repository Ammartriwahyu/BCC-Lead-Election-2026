import { render, screen, within } from '@testing-library/react';

import { getAdminOverview, getDisplay, setDisplayScreen } from '@/lib/api/endpoints';
import type { DisplayPayload, DisplayScreen as Screen } from '@/lib/api/types';
import { DEFAULT_OPTIONS, resetDb } from '@/mocks/db';
import { applyScenario } from '@/mocks/scenarios';
import { committeeSignIn } from '@/test/admin';

import { DisplayScreen } from './components/DisplayScreen';

type Scenario = Parameters<typeof applyScenario>[0];
type Data = Parameters<typeof applyScenario>[1];

/** The payload /display would get for this scenario and screen, through the real mock API. */
async function payloadFor(scenario: Scenario, screenOnAir?: Screen, data?: Data) {
  applyScenario(scenario, data);
  if (screenOnAir) {
    await committeeSignIn();
    const { display } = await getAdminOverview();
    if (display.activeScreen !== screenOnAir) await setDisplayScreen(screenOnAir);
  }
  return getDisplay();
}

function show(payload: DisplayPayload) {
  return render(<DisplayScreen payload={payload} />);
}

const heading = () => screen.getByRole('heading', { level: 1 });

afterEach(() => {
  resetDb(DEFAULT_OPTIONS);
});

describe('D1 Voting opens soon', () => {
  it('shows the message and the lineup in number order', async () => {
    show(await payloadFor('not-started'));
    expect(heading()).toHaveTextContent('Voting opens soon');
    expect(screen.getByText('Get ready to vote')).toBeInTheDocument();
    const lineup = within(screen.getByRole('list'));
    expect(lineup.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Candidate 01Candidate Name 01',
      'Candidate 02Candidate Name 02',
      'Candidate 03Candidate Name 03',
    ]);
    expect(screen.getByText('Chairperson Election 2026')).toBeInTheDocument();
  });
});

describe('D2 Voting open', () => {
  it('shows turnout only, with one decimal', async () => {
    show(await payloadFor('open'));
    expect(heading()).toHaveTextContent('0.7%turnout');
    expect(screen.getByText('1 of 139 members have voted')).toBeInTheDocument();
    expect(screen.getByText('Voting is open')).toBeInTheDocument();
    expect(screen.getByTestId('turnout-fill')).toHaveStyle({ width: `${(1 / 139) * 100}%` });
    expect(screen.queryByText(/Candidate Name/)).not.toBeInTheDocument();
  });
});

describe('D5 Voting closed', () => {
  it('shows the totals', async () => {
    show(await payloadFor('closed'));
    expect(heading()).toHaveTextContent('Voting is closed');
    expect(screen.getByText('111')).toBeInTheDocument();
    expect(screen.getByText('members voted')).toBeInTheDocument();
    expect(screen.getByText('79.9%')).toBeInTheDocument();
    expect(screen.queryByText(/Candidate Name/)).not.toBeInTheDocument();
  });
});

describe('D6 The winner is…', () => {
  it('hides every candidate behind a question mark', async () => {
    show(await payloadFor('closed', 'WINNER_REVEAL'));
    expect(heading()).toHaveTextContent('The most votes go to…');
    expect(screen.getAllByText('?')).toHaveLength(3);
    expect(screen.getByText('Candidate 02')).toBeInTheDocument();
    expect(screen.getByText('111 votes counted. Result coming up.')).toBeInTheDocument();
    expect(screen.queryByText(/Candidate Name|%/)).not.toBeInTheDocument();
  });

  it('uses the singular for one vote', async () => {
    const payload = await payloadFor('zero-votes', 'WINNER_REVEAL');
    if (payload.screen !== 'WINNER_REVEAL') throw new Error(payload.screen);
    show({ ...payload, turnout: { ...payload.turnout, votesReceived: 1 } });
    expect(screen.getByText('1 vote counted. Result coming up.')).toBeInTheDocument();
  });
});

describe('D3 Final results', () => {
  it('podium: second, first, third with bars scaled to the leader', async () => {
    show(await payloadFor('closed', 'FINAL_RESULTS'));
    expect(heading()).toHaveTextContent('Final results');
    const columns = screen.getAllByRole('listitem');
    expect(columns.map((c) => c.textContent)).toEqual([
      expect.stringMatching(/^Candidate Name 0233votes29\.7%$/),
      expect.stringMatching(/^Candidate Name 01, Most votes62votes55\.9%$/),
      expect.stringMatching(/^Candidate Name 0316votes14\.4%$/),
    ]);
    expect(columns[1]).toHaveAttribute('data-leading', 'true');
    const bars = screen.getAllByTestId('podium-bar');
    expect(bars.map((bar) => bar.style.height)).toEqual(['213px', '400px', '103px']);
    expect(screen.getByText('registered members')).toBeInTheDocument();
  });

  it('tie: both leaders highlighted', async () => {
    show(await payloadFor('tie', 'FINAL_RESULTS'));
    const leaders = screen.getAllByRole('listitem').filter((li) => li.dataset.leading);
    expect(leaders).toHaveLength(2);
    leaders.forEach((li) => {
      expect(li).toHaveTextContent('Tied for most votes');
    });
  });

  it('zero votes: number order, no leader, 0.0%', async () => {
    show(await payloadFor('zero-votes', 'FINAL_RESULTS', { candidateSet: 'long' }));
    const columns = screen.getAllByRole('listitem');
    expect(columns[0]).toHaveTextContent('Muhammad Rizky');
    expect(columns.filter((li) => li.dataset.leading)).toHaveLength(0);
    expect(screen.getAllByText('0.0%')).toHaveLength(4); // three bars + turnout
  });

  it('one candidate stands alone; six become a ranked list', async () => {
    const one = show(await payloadFor('closed', 'FINAL_RESULTS', { candidateSet: 'one' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('100.0%')).toBeInTheDocument();
    one.unmount();

    show(await payloadFor('closed', 'FINAL_RESULTS', { candidateSet: 'six' }));
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(6);
    expect(rows[0]).toHaveTextContent(/^Candidate Name 01, Most votes\d+ votes/);
    expect(screen.queryByTestId('podium-bar')).not.toBeInTheDocument();
  });
});

describe('D4 Most votes', () => {
  it('spotlights the single leader', async () => {
    show(await payloadFor('closed', 'MOST_VOTES'));
    expect(heading()).toHaveTextContent('Candidate Name 01');
    expect(screen.getByText('Most votes')).toBeInTheDocument();
    expect(
      screen.getByText('Candidate 01 · Information Systems, class of 2023'),
    ).toBeInTheDocument();
    expect(screen.getByText('of 111 votes')).toBeInTheDocument();
    expect(screen.getByText('55.9%')).toBeInTheDocument();
    expect(screen.getByText('Thank you to every member who voted.')).toBeInTheDocument();
    expect(screen.queryByText('Candidate Name 02')).not.toBeInTheDocument();
  });

  it('tie: shows every leader and says so', async () => {
    show(await payloadFor('tie', 'MOST_VOTES'));
    expect(heading()).toHaveTextContent('Tied for most votes');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(
      screen.getByText('The committee will announce how the tie is settled.'),
    ).toBeInTheDocument();
  });

  it('zero votes: no leader is named', async () => {
    show(await payloadFor('zero-votes', 'MOST_VOTES'));
    expect(heading()).toHaveTextContent('No votes were cast');
    expect(screen.queryByText(/Candidate Name/)).not.toBeInTheDocument();
  });
});
