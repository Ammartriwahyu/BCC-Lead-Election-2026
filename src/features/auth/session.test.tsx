import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { getMe, voterSignIn } from '@/lib/api/endpoints';
import { server } from '@/mocks/node';
import { applyScenario } from '@/mocks/scenarios';
import { navigation, resetNavigation } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';

import { SessionExpiryListener } from './components/SessionExpiryListener';
import { SignedInNavbar } from './components/SignedInNavbar';
import { VoterSessionGate } from './components/VoterSessionGate';
import { isSessionEnding } from './sessionEnding';

describe('VoterSessionGate', () => {
  it('renders the page when it is valid for the voter and state', async () => {
    applyScenario('open');
    await voterSignIn('voter@bcc.test', 'pilketum2026');
    resetNavigation('/candidates');
    renderWithProviders(
      <VoterSessionGate>
        <p>page</p>
      </VoterSessionGate>,
      { voting: true },
    );
    expect(await screen.findByText('page')).toBeInTheDocument();
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it('redirects to the valid page (closed voting -> /closed)', async () => {
    applyScenario('closed');
    await voterSignIn('voter@bcc.test', 'pilketum2026');
    resetNavigation('/candidates');
    renderWithProviders(
      <VoterSessionGate>
        <p>page</p>
      </VoterSessionGate>,
      { voting: true },
    );
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/closed');
    });
    expect(screen.queryByText('page')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });
});

describe('SessionExpiryListener', () => {
  it('clears caches and sends the voter to sign-in on a 401', async () => {
    resetNavigation('/candidates');
    const { queryClient } = renderWithProviders(<SessionExpiryListener />);
    queryClient.setQueryData(['voter', 'me'], { id: 'x' });
    await getMe().catch(() => undefined);
    expect(navigation.router.replace).toHaveBeenCalledWith(
      '/sign-in?reason=expired&next=%2Fcandidates',
    );
    expect(queryClient.getQueryData(['voter', 'me'])).toBeUndefined();
    expect(isSessionEnding()).toBe(true);
  });
});

describe('SignedInNavbar + sign out', () => {
  it('shows the voter and signs out to a clean sign-in page', async () => {
    applyScenario('open');
    await voterSignIn('voter@bcc.test', 'pilketum2026');
    const { queryClient } = renderWithProviders(<SignedInNavbar />);
    expect(await screen.findByText('Demo Voter')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/sign-in?reason=signed-out');
    });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    await expect(getMe()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('still signs out locally when the server call fails', async () => {
    server.use(http.post('*/api/auth/sign-out', () => HttpResponse.error()));
    renderWithProviders(<SignedInNavbar />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/sign-in?reason=signed-out');
    });
  });
});
