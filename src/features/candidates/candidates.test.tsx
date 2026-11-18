import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { voterSignIn } from '@/lib/api/endpoints';
import { applyScenario } from '@/mocks/scenarios';
import { navigation, resetNavigation } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';

import { CandidateDetailView } from './components/CandidateDetailView';

beforeEach(async () => {
  resetNavigation('/candidates/1');
  await voterSignIn('voter@bcc.test', 'pilketum2026');
});

describe('CandidateDetailView', () => {
  it('shows vision and missions with the not-open note before voting opens', async () => {
    renderWithProviders(<CandidateDetailView id="1" />, { voting: true });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Candidate Name 01' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Candidate 01')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Vision' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(
      screen.getAllByText('You can vote once the committee opens voting.').length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Select this candidate' })).not.toBeInTheDocument();
  });

  it('selects the candidate and returns to the list while open', async () => {
    applyScenario('open');
    await voterSignIn('voter@bcc.test', 'pilketum2026');
    renderWithProviders(<CandidateDetailView id="2" />, { voting: true });
    const user = userEvent.setup();
    const [select] = await screen.findAllByRole('button', { name: 'Select this candidate' });
    if (!select) throw new Error('missing button');
    await user.click(select);
    expect(navigation.router.replace).toHaveBeenCalledWith('/candidates');
    expect(
      await screen.findAllByRole('button', { name: 'Selected Candidate Name 02' }),
    ).not.toHaveLength(0);
  });

  it('goes back to the list', async () => {
    renderWithProviders(<CandidateDetailView id="1" />, { voting: true });
    await userEvent.setup().click(await screen.findByRole('button', { name: /Back/ }));
    expect(navigation.router.replace).toHaveBeenCalledWith('/candidates');
  });

  it('shows the BCC 404 for an unknown id', async () => {
    renderWithProviders(<CandidateDetailView id="nope" />, { voting: true });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Back to candidates' })).toHaveAttribute(
      'href',
      '/candidates',
    );
  });
});
