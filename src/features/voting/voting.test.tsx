import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { VoteErrorView } from '@/app/(voter)/(session)/vote/error/VoteErrorView';
import { CandidatesView } from '@/features/candidates/components/CandidatesView';
import { voterSignIn } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import type { ErrorCode } from '@/lib/api/types';
import { getDb } from '@/mocks/db';
import { server } from '@/mocks/node';
import { applyScenario } from '@/mocks/scenarios';
import { navigation, resetNavigation } from '@/test/navigation';
import { makeTestQueryClient, renderWithProviders } from '@/test/render';

import { classifySubmitError } from './submitOutcome';
import { useVoting } from './VotingProvider';

async function signedIn() {
  await voterSignIn('voter@bcc.test', 'pilketum2026');
}

function Both() {
  // Candidates page and the V4 page share one VotingProvider, as in the session layout.
  const { pendingVote } = useVoting();
  return pendingVote && navigation.pathname === '/vote/error' ? (
    <VoteErrorView />
  ) : (
    <CandidatesView />
  );
}

async function pickAndReview(name: string) {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: `Select ${name}` }));
  await user.click(screen.getByRole('button', { name: 'Review and submit' }));
  const dialog = await screen.findByRole('dialog', { name: `Vote for ${name}?` });
  return { user, dialog };
}

describe('voting flow', () => {
  beforeEach(() => {
    resetNavigation('/candidates');
  });

  it('shows locked cards before voting opens', async () => {
    await signedIn();
    renderWithProviders(<CandidatesView />, { voting: true });
    expect(
      await screen.findByRole('heading', { name: "Voting hasn't opened yet" }),
    ).toBeInTheDocument();
    expect(await screen.findAllByRole('link', { name: /^Vision & mission of/ })).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /^Select / })).not.toBeInTheDocument();
  });

  it('selects, toggles, reviews and submits one vote', async () => {
    applyScenario('open');
    await signedIn();
    const { queryClient } = renderWithProviders(<CandidatesView />, { voting: true });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Select Candidate Name 02' }));
    expect(screen.getByText('Candidate Name 02 (Candidate 02)')).toBeInTheDocument();
    expect(screen.getByTestId('announcer-polite')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Selected Candidate Name 02' }));
    expect(screen.getByText('No candidate selected yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review and submit' })).toBeDisabled();

    const { dialog } = await pickAndReview('Candidate Name 01');
    expect(
      within(dialog).getByText('Candidate 01 · Information Systems, class of 2023'),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Submit vote' }));

    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/vote/submitted');
    });
    expect(queryClient.getQueryData(['voter', 'me'])).toMatchObject({ status: 'VOTED' });
    expect(getDb().voteRequests).toBe(1);
  });

  it('cancel closes the dialog without voting', async () => {
    applyScenario('open');
    await signedIn();
    renderWithProviders(<CandidatesView />, { voting: true });
    const { user, dialog } = await pickAndReview('Candidate Name 03');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getDb().voteRequests).toBe(0);
  });

  it('transient failure -> V4 -> Try again reuses the Idempotency-Key', async () => {
    applyScenario('submit-fails');
    await signedIn();
    const keys: string[] = [];
    server.events.on('request:start', ({ request }) => {
      if (request.url.endsWith('/api/votes'))
        keys.push(request.headers.get('Idempotency-Key') ?? '');
    });
    navigation.router.replace.mockImplementation((to: string) => {
      navigation.pathname = to;
    });
    const view = renderWithProviders(<Both />, { voting: true });
    const { user, dialog } = await pickAndReview('Candidate Name 02');
    await user.click(within(dialog).getByRole('button', { name: 'Submit vote' }));
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/vote/error');
    });
    view.rerender(<Both />);
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenLastCalledWith('/vote/submitted');
    });
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
    server.events.removeAllListeners();
  });

  it('lost response: Try again finds the stored vote and does not resend', async () => {
    applyScenario('submit-lost-response');
    await signedIn();
    navigation.router.replace.mockImplementation((to: string) => {
      navigation.pathname = to;
    });
    const view = renderWithProviders(<Both />, { voting: true });
    const { user, dialog } = await pickAndReview('Candidate Name 01');
    await user.click(within(dialog).getByRole('button', { name: 'Submit vote' }));
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/vote/error');
    });
    view.rerender(<Both />);
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenLastCalledWith('/vote/submitted');
    });
    expect(getDb().voteRequests).toBe(1);
  });

  it('voting closed mid-submit goes to /closed', async () => {
    applyScenario('closed-mid-vote');
    await signedIn();
    renderWithProviders(<CandidatesView />, { voting: true });
    const { user, dialog } = await pickAndReview('Candidate Name 01');
    await user.click(within(dialog).getByRole('button', { name: 'Submit vote' }));
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/closed');
    });
  });

  it('already voted on another device goes to /already-voted', async () => {
    applyScenario('open');
    await signedIn();
    server.use(
      http.post('*/api/votes', () =>
        HttpResponse.json({ error: { code: 'ALREADY_VOTED' } }, { status: 409 }),
      ),
    );
    renderWithProviders(<CandidatesView />, { voting: true });
    const { user, dialog } = await pickAndReview('Candidate Name 01');
    await user.click(within(dialog).getByRole('button', { name: 'Submit vote' }));
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/already-voted');
    });
  });

  it('an outdated candidate drops the pick and stays on the page', async () => {
    applyScenario('open');
    await signedIn();
    server.use(
      http.post('*/api/votes', () =>
        HttpResponse.json({ error: { code: 'VALIDATION' } }, { status: 422 }),
      ),
    );
    renderWithProviders(<CandidatesView />, { voting: true });
    const { user, dialog } = await pickAndReview('Candidate Name 01');
    await user.click(within(dialog).getByRole('button', { name: 'Submit vote' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByText('No candidate selected yet')).toBeInTheDocument();
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it('V4 without a failed vote in memory returns to the candidates', async () => {
    applyScenario('open');
    await signedIn();
    renderWithProviders(<VoteErrorView />, { voting: true });
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/candidates');
    });
  });

  it('candidate list errors offer a retry', async () => {
    applyScenario('open');
    await signedIn();
    server.use(
      http.get('*/api/candidates', () =>
        HttpResponse.json({ error: { code: 'UNKNOWN' } }, { status: 500 }),
      ),
    );
    const queryClient = makeTestQueryClient();
    renderWithProviders(<CandidatesView />, { voting: true, queryClient });
    expect(
      await screen.findByText("We couldn't load the candidates. Try again."),
    ).toBeInTheDocument();
    server.resetHandlers();
    await act(async () => {
      await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    });
    expect(
      await screen.findByRole('button', { name: 'Select Candidate Name 01' }),
    ).toBeInTheDocument();
  });
});

describe('classifySubmitError', () => {
  it('maps every error code to a UI action', () => {
    const api = (code: ErrorCode) => new ApiError(code);
    expect(classifySubmitError(new Error('x'))).toEqual({
      kind: 'navigate',
      to: '/vote/error',
      refetch: null,
    });
    expect(classifySubmitError(api('ALREADY_VOTED'))).toMatchObject({
      to: '/already-voted',
      refetch: 'me',
    });
    expect(classifySubmitError(api('VOTING_CLOSED'))).toMatchObject({ to: '/closed' });
    expect(classifySubmitError(api('VOTING_NOT_OPEN'))).toEqual({
      kind: 'stay',
      refetch: 'election',
    });
    expect(classifySubmitError(api('NOT_FOUND'))).toEqual({ kind: 'stay', refetch: 'candidates' });
    expect(classifySubmitError(api('UNAUTHORIZED'))).toEqual({ kind: 'session' });
    expect(classifySubmitError(api('TIMEOUT'))).toMatchObject({ to: '/vote/error', refetch: null });
  });
});
