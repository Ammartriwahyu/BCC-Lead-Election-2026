import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { getAdminMe } from '@/lib/api/endpoints';
import { server } from '@/mocks/node';
import { applyScenario } from '@/mocks/scenarios';
import { committeeSignIn } from '@/test/admin';
import { navigation, resetNavigation } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';

import { AdminShell } from './components/AdminShell';
import { AdminSignInForm } from './components/AdminSignInForm';

async function fill(username: string, password: string) {
  const user = userEvent.setup();
  if (username) await user.type(screen.getByRole('textbox', { name: 'Username' }), username);
  const pw = screen.getByLabelText(/^Password/, { selector: 'input' });
  if (password) await user.type(pw, password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  return { user, pw };
}

describe('AdminSignInForm (A0)', () => {
  beforeEach(() => {
    resetNavigation('/admin/sign-in');
  });

  it('signs the committee in and opens the overview', async () => {
    const { queryClient } = renderWithProviders(<AdminSignInForm />);
    await fill('committee', 'committee2026');
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/admin');
    });
    expect(queryClient.getQueryData(['admin', 'me'])).toEqual({ username: 'committee' });
  });

  it('returns to the page that asked for sign-in, but never outside the panel', async () => {
    resetNavigation('/admin/sign-in', 'next=%2Fadmin%2Fvoters%3Fq%3Dabc');
    renderWithProviders(<AdminSignInForm />);
    await fill('committee', 'committee2026');
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/admin/voters?q=abc');
    });
  });

  it('wrong password: banner, password cleared and focused', async () => {
    renderWithProviders(<AdminSignInForm />);
    const { pw } = await fill('committee', 'nope');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "That username and password don't match",
    );
    expect(pw).toHaveValue('');
    await waitFor(() => {
      expect(pw).toHaveFocus();
    });
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it('a voter account cannot sign in as committee', async () => {
    renderWithProviders(<AdminSignInForm />);
    await fill('voter@bcc.test', 'pilketum2026');
    expect(await screen.findByRole('alert')).toHaveTextContent("don't match");
  });

  it('shows a connection message when the server cannot be reached', async () => {
    server.use(http.post('*/api/admin/auth/login', () => HttpResponse.error()));
    renderWithProviders(<AdminSignInForm />);
    await fill('committee', 'committee2026');
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't reach the server");
  });

  it('shows a generic message for an unexpected answer', async () => {
    server.use(
      http.post('*/api/admin/auth/login', () =>
        HttpResponse.json({ error: { code: 'BAD_REQUEST' } }, { status: 400 }),
      ),
    );
    renderWithProviders(<AdminSignInForm />);
    await fill('committee', 'committee2026');
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('validates empty fields before calling the server', async () => {
    renderWithProviders(<AdminSignInForm />);
    await fill('', '');
    expect(await screen.findByText('Enter your username.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
  });

  it('explains an expired session', () => {
    resetNavigation('/admin/sign-in', 'reason=expired');
    renderWithProviders(<AdminSignInForm />);
    expect(screen.getByRole('status')).toHaveTextContent('Your session ended');
  });
});

describe('AdminShell', () => {
  const shell = (
    <AdminShell>
      <p>page content</p>
    </AdminShell>
  );

  it('shows the panel frame for a signed-in committee member', async () => {
    applyScenario('closed');
    await committeeSignIn();
    resetNavigation('/admin/voters');
    renderWithProviders(shell);
    expect(await screen.findByText('page content')).toBeInTheDocument();
    // The API gives the committee account a username only.
    expect(screen.getByText('committee')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent(
      'Election/Voter list',
    );
    const menu = screen.getByRole('navigation', { name: 'Committee menu' });
    expect(within(menu).getByRole('link', { name: 'Candidates' })).toHaveAttribute(
      'href',
      '/admin/candidates',
    );
    expect(within(menu).getByRole('link', { name: 'Voter list' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // Voting is closed, so Results is a normal link.
    expect(await within(menu).findByRole('link', { name: 'Results' })).toHaveAttribute(
      'href',
      '/admin/results',
    );
  });

  it('keeps Results locked until voting closes and explains why', async () => {
    applyScenario('open');
    await committeeSignIn();
    resetNavigation('/admin');
    renderWithProviders(shell);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /^Results, locked/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Results are locked' });
    expect(dialog).toHaveTextContent('Candidate totals unlock after voting closes.');
    await user.click(within(dialog).getByRole('button', { name: 'OK' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it('sends an expired session to committee sign-in', async () => {
    resetNavigation('/admin/results');
    const { queryClient } = renderWithProviders(shell);
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith(
        '/admin/sign-in?reason=expired&next=%2Fadmin%2Fresults',
      );
    });
    expect(screen.queryByText('page content')).not.toBeInTheDocument();
    expect(queryClient.getQueryData(['admin', 'me'])).toBeUndefined();
    expect(queryClient.getQueryData(['admin', 'overview'])).toBeUndefined();
  });

  it('offers a retry when the session cannot be checked', async () => {
    await committeeSignIn();
    let fail = true;
    server.use(
      http.get('*/api/admin/me', () => {
        if (!fail) return undefined;
        return HttpResponse.json({ error: { code: 'UNKNOWN' } }, { status: 500 });
      }),
    );
    resetNavigation('/admin');
    renderWithProviders(shell);
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load this page");
    fail = false;
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('page content')).toBeInTheDocument();
  });

  it('signs out to a clean committee sign-in page', async () => {
    await committeeSignIn();
    resetNavigation('/admin');
    const { queryClient } = renderWithProviders(shell);
    await screen.findByText('page content');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/admin/sign-in?reason=signed-out');
    });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    await expect(getAdminMe()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('still signs out locally when the server call fails', async () => {
    await committeeSignIn();
    server.use(http.post('*/api/admin/auth/sign-out', () => HttpResponse.error()));
    resetNavigation('/admin');
    renderWithProviders(shell);
    await screen.findByText('page content');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/admin/sign-in?reason=signed-out');
    });
  });
});
