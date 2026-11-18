import { screen } from '@testing-library/react';
import { http } from 'msw';

import { POLLING } from '@/config/constants';
import { server } from '@/mocks/node';
import { applyScenario } from '@/mocks/scenarios';
import { renderWithProviders } from '@/test/render';

import { ElectionStatusStrip } from './components/ElectionStatusStrip';
import { electionTransition } from './electionTransition';

describe('electionTransition', () => {
  it('names the transitions voters hear about', () => {
    expect(electionTransition(undefined, 'OPEN')).toBeNull();
    expect(electionTransition('OPEN', 'OPEN')).toBeNull();
    expect(electionTransition('NOT_STARTED', 'OPEN')).toBe('opened');
    expect(electionTransition('OPEN', 'CLOSED')).toBe('closed');
    expect(electionTransition('CLOSED', 'OPEN')).toBe('reopened');
    expect(electionTransition('OPEN', 'NOT_STARTED')).toBeNull();
  });
});

describe('ElectionStatusStrip', () => {
  it.each([
    ['not-started', 'Not started', 'The committee will open voting during the event.'],
    ['open', 'Open', 'Voting is open now.'],
    ['closed', 'Closed', 'The committee has closed voting.'],
  ] as const)('shows the %s state', async (scenario, badge, text) => {
    applyScenario(scenario);
    renderWithProviders(<ElectionStatusStrip />);
    const strip = await screen.findByTestId('election-status');
    expect(strip).toHaveTextContent(badge);
    expect(strip).toHaveTextContent(text);
  });

  it('reads the state once instead of polling it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let requests = 0;
      server.use(
        http.get('*/api/election', () => {
          requests += 1;
          return undefined;
        }),
      );
      applyScenario('open');
      renderWithProviders(<ElectionStatusStrip />);
      await screen.findByTestId('election-status');
      await vi.advanceTimersByTimeAsync(POLLING.electionStateMs * 3);
      expect(requests).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
