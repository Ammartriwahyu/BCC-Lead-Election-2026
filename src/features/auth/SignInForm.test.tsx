import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { DEMO_ACCOUNTS, DEMO_OTP_CODE } from '@/mocks/fixtures';
import { route } from '@/mocks/handlers';
import { server } from '@/mocks/node';
import { applyScenario } from '@/mocks/scenarios';
import { navigation, resetNavigation } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';

import { SignInForm } from './components/SignInForm';

const USERNAME = 'NIM or UB email';

async function fill(username: string, password: string) {
  const user = userEvent.setup();
  await user.clear(screen.getByRole('textbox', { name: USERNAME }));
  if (username) await user.type(screen.getByRole('textbox', { name: USERNAME }), username);
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

  it('signs in with an email or a NIM and goes to the right page for the state', async () => {
    applyScenario('open');
    const { queryClient } = renderWithProviders(<SignInForm />);
    await fill(DEMO_ACCOUNTS.voterNim, 'pilketum2026');
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/candidates');
    });
    expect(queryClient.getQueryData(['voter', 'me'])).toMatchObject({
      email: DEMO_ACCOUNTS.voter,
    });
  });

  it('honours a valid ?next= and ignores an invalid one', async () => {
    applyScenario('open');
    resetNavigation('/sign-in', 'next=%2Fcandidates%2F2');
    renderWithProviders(<SignInForm />);
    await fill(DEMO_ACCOUNTS.voter, 'pilketum2026');
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/candidates/2');
    });
  });

  it('wrong password: banner, password cleared and focused', async () => {
    renderWithProviders(<SignInForm />);
    const { pw } = await fill(DEMO_ACCOUNTS.voter, 'nope');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "That NIM or email and password don't match",
    );
    expect(pw).toHaveValue('');
    await waitFor(() => {
      expect(pw).toHaveFocus();
    });
  });

  it('not on the register: error on the account field and focus there', async () => {
    renderWithProviders(<SignInForm />);
    await fill(DEMO_ACCOUNTS.guest, 'pilketum2026');
    const field = screen.getByRole('textbox', { name: USERNAME });
    await waitFor(() => {
      expect(field).toHaveAccessibleDescription("This account isn't on the voter register.");
    });
    expect(field).toHaveFocus();
  });

  it('validates required fields before calling the API', async () => {
    renderWithProviders(<SignInForm />);
    await fill('', '');
    expect(await screen.findByText('Enter your NIM or UB email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
  });

  it('explains SSO outages, rate limits and unexpected answers', async () => {
    renderWithProviders(<SignInForm />);
    await fill(DEMO_ACCOUNTS.ssoDown, 'pilketum2026');
    expect(await screen.findByRole('alert')).toHaveTextContent("UB sign-in isn't responding");
    await fill(DEMO_ACCOUNTS.ssoBusy, 'pilketum2026');
    expect(await screen.findByRole('alert')).toHaveTextContent('Lots of members are signing in');

    server.use(
      http.post(route('voterSignIn'), () =>
        HttpResponse.json(
          { error: { code: 'RATE_LIMITED' } },
          { status: 429, headers: { 'Retry-After': '30' } },
        ),
      ),
    );
    await fill(DEMO_ACCOUNTS.voter, 'pilketum2026');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Try again in 30 seconds.',
    );

    server.use(http.post(route('voterSignIn'), () => HttpResponse.error()));
    await fill(DEMO_ACCOUNTS.voter, 'pilketum2026');
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't reach the server");

    server.use(
      http.post(route('voterSignIn'), () =>
        HttpResponse.json({ error: { code: 'BAD_REQUEST' } }, { status: 400 }),
      ),
    );
    await fill(DEMO_ACCOUNTS.voter, 'pilketum2026');
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('two-step verification: wrong code, then the right one signs in', async () => {
    applyScenario('open');
    renderWithProviders(<SignInForm />);
    const { user } = await fill(DEMO_ACCOUNTS.otp, 'pilketum2026');
    const code = await screen.findByRole('textbox', { name: /Verification code/ });
    expect(screen.getByRole('heading', { name: 'Enter your verification code' })).toBeVisible();
    // Two devices: the default one is preselected.
    expect(screen.getByRole('combobox', { name: 'Authenticator' })).toHaveValue(
      'dev-authenticator',
    );

    await user.click(screen.getByRole('button', { name: 'Verify' }));
    expect(await screen.findByText('Enter the 6-digit code.')).toBeInTheDocument();

    await user.type(code, '000000');
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => {
      expect(code).toHaveAccessibleDescription("That code isn't right. Try again.");
    });
    expect(code).toHaveValue('');

    await user.type(code, DEMO_OTP_CODE);
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/candidates');
    });
  });

  it('two-step verification: an expired flow goes back to the sign-in form', async () => {
    renderWithProviders(<SignInForm />);
    const { user } = await fill(DEMO_ACCOUNTS.otp, 'pilketum2026');
    await screen.findByRole('textbox', { name: /Verification code/ });
    server.use(
      http.post(route('voterOtp'), () =>
        HttpResponse.json({ error: { code: 'OTP_EXPIRED' } }, { status: 401 }),
      ),
    );
    await user.type(screen.getByRole('textbox', { name: /Verification code/ }), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your sign-in timed out');
    expect(screen.getByRole('textbox', { name: USERNAME })).toHaveValue(DEMO_ACCOUNTS.otp);

    // "Use a different account" from the code step also returns here.
    await fill(DEMO_ACCOUNTS.otp, 'pilketum2026');
    await user.click(await screen.findByRole('button', { name: 'Use a different account' }));
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  it('explains an expired session', () => {
    resetNavigation('/sign-in', 'reason=expired');
    renderWithProviders(<SignInForm />);
    expect(screen.getByRole('status')).toHaveTextContent('Your session ended');
  });
});
