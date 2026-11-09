import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { server } from '@/mocks/node';
import { applyScenario } from '@/mocks/scenarios';
import { navigation, resetNavigation } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';

import { SignInForm } from './components/SignInForm';

async function fill(email: string, password: string) {
  const user = userEvent.setup();
  await user.clear(screen.getByRole('textbox', { name: 'Email' }));
  if (email) await user.type(screen.getByRole('textbox', { name: 'Email' }), email);
  const pw = screen.getByLabelText(/^Password/, { selector: 'input' });
  await user.clear(pw);
  if (password) await user.type(pw, password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  return { user, pw };
}

describe('SignInForm', () => {
  beforeEach(() => {
    resetNavigation('/sign-in');
  });

  it('signs in and goes to the right page for the state', async () => {
    applyScenario('open');
    const { queryClient } = renderWithProviders(<SignInForm />);
    await fill('voter@bcc.test', 'pilketum2026');
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/candidates');
    });
    expect(queryClient.getQueryData(['voter', 'me'])).toMatchObject({ email: 'voter@bcc.test' });
  });

  it('honours a valid ?next= and ignores an invalid one', async () => {
    applyScenario('open');
    resetNavigation('/sign-in', 'next=%2Fcandidates%2Fcand-02');
    renderWithProviders(<SignInForm />);
    await fill('voter@bcc.test', 'pilketum2026');
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/candidates/cand-02');
    });
  });

  it('wrong password: banner, password cleared and focused', async () => {
    renderWithProviders(<SignInForm />);
    const { pw } = await fill('voter@bcc.test', 'nope');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "That email and password don't match",
    );
    expect(pw).toHaveValue('');
    await waitFor(() => {
      expect(pw).toHaveFocus();
    });
  });

  it('not a voter: error on the email field and focus there', async () => {
    renderWithProviders(<SignInForm />);
    await fill('guest@bcc.test', 'pilketum2026');
    const email = screen.getByRole('textbox', { name: 'Email' });
    await waitFor(() => {
      expect(email).toHaveAccessibleDescription("This email isn't on the voter register.");
    });
    expect(email).toHaveFocus();
  });

  it('validates required fields and email format before calling the API', async () => {
    renderWithProviders(<SignInForm />);
    await fill('', '');
    expect(await screen.findByText('Enter your email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    await fill('not-an-email', 'x');
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
  });

  it('shows a connection error and an unknown error', async () => {
    server.use(http.post('*/api/auth/voter/sign-in', () => HttpResponse.error()));
    renderWithProviders(<SignInForm />);
    await fill('voter@bcc.test', 'pilketum2026');
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't reach the server");

    server.use(
      http.post('*/api/auth/voter/sign-in', () =>
        HttpResponse.json({ error: { code: 'VALIDATION' } }, { status: 422 }),
      ),
    );
    await fill('voter@bcc.test', 'pilketum2026');
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('explains an expired session', () => {
    resetNavigation('/sign-in', 'reason=expired');
    renderWithProviders(<SignInForm />);
    expect(screen.getByRole('status')).toHaveTextContent('Your session ended');
  });
});
