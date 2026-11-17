import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { ADMIN } from '@/config/constants';
import { server } from '@/mocks/node';
import { applyScenario } from '@/mocks/scenarios';
import { committeeSignIn } from '@/test/admin';
import { navigation, resetNavigation } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';

import { VotersView } from './components/VotersView';

async function renderVoters(scenario: Parameters<typeof applyScenario>[0], search = '') {
  applyScenario(scenario);
  await committeeSignIn();
  resetNavigation('/admin/voters', search);
  const view = renderWithProviders(<VotersView />);
  await screen.findByRole('heading', { level: 1, name: 'Voter list' });
  return { ...view, user: userEvent.setup() };
}

const searchBox = () => screen.getByRole('searchbox', { name: 'Search voters by name or email' });

describe('VotersView (A5)', () => {
  it('lists the first page with voted / not voted only', async () => {
    await renderVoters('open');
    expect(screen.getByText('1 of 139 members have voted.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1–6 of 139');
    const table = screen.getByRole('table', { name: 'Voter register' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Member name', 'Email', 'Status']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(ADMIN.votersPageSize);
    expect(rows[0]).toHaveTextContent('Demo Voted');
    expect(rows[0]).toHaveTextContent('voted@bcc.test');
    expect(within(rows[0] as HTMLElement).getByText('Voted')).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText('Not voted')).toBeInTheDocument();
    // Privacy: nothing about candidates anywhere in the table.
    expect(table).not.toHaveTextContent(/candidate/i);

    expect(screen.getByText('Page 1 of 24')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Next' })).toHaveAttribute('aria-disabled', 'false');
  });

  it.each([
    ['not-started', '139 members can vote when voting opens.'],
    ['closed', 'Final list. 111 of 139 members voted.'],
  ] as const)('uses the %s subtitle', async (scenario, subtitle) => {
    await renderVoters(scenario);
    expect(screen.getByText(subtitle)).toBeInTheDocument();
  });

  it('Next and Previous change the page in the URL', async () => {
    const { user } = await renderVoters('open', 'q=member&page=2');
    expect(await screen.findByText(/^Showing 7–12 of/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(navigation.router.push).toHaveBeenCalledWith('/admin/voters?q=member&page=3');
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(navigation.router.push).toHaveBeenCalledWith('/admin/voters?q=member');
  });

  it('last page: Next is disabled and does nothing', async () => {
    const { user } = await renderVoters('open', 'page=24');
    expect(await screen.findByText('Showing 139–139 of 139')).toBeInTheDocument();
    const next = screen.getByRole('button', { name: 'Next' });
    expect(next).toHaveAttribute('aria-disabled', 'true');
    next.focus();
    await user.keyboard('{Enter}');
    expect(navigation.router.push).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Previous' })).toHaveAttribute(
      'aria-disabled',
      'false',
    );
  });

  it('a page beyond the end is corrected in the URL', async () => {
    await renderVoters('open', 'page=999');
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/admin/voters?page=24');
    });
    expect(screen.getByText('Page 24 of 24')).toBeInTheDocument();
  });

  it('search is debounced into one URL change and resets the page', async () => {
    const { user } = await renderVoters('open', 'page=3');
    await user.type(searchBox(), 'member001');
    expect(navigation.router.replace).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/admin/voters?q=member001');
    });
    expect(navigation.router.replace).toHaveBeenCalledTimes(1);
  });

  it('shows matches for the query in the URL', async () => {
    await renderVoters('open', 'q=member001');
    expect(searchBox()).toHaveValue('member001');
    expect(await screen.findByText('Showing 1–1 of 1')).toBeInTheDocument();
    expect(screen.getByText('member001@student.ub.ac.id')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });

  it('no results: empty state, and Clear search starts over', async () => {
    const { user } = await renderVoters('open', 'q=member999');
    expect(
      await screen.findByRole('heading', { name: 'No member matches "member999"' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('0 results');
    expect(screen.getByText('Check the spelling, or search by email instead.')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Voter list pages' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(navigation.router.replace).toHaveBeenCalledWith('/admin/voters');
    expect(searchBox()).toHaveValue('');
  });

  it('follows a search that changed from outside (sidebar link, Back)', async () => {
    const { rerender } = await renderVoters('open', 'q=member001');
    expect(searchBox()).toHaveValue('member001');
    act(() => {
      navigation.search = new URLSearchParams('');
    });
    rerender(<VotersView />);
    expect(searchBox()).toHaveValue('');
    expect(await screen.findByText('Showing 1–6 of 139')).toBeInTheDocument();
  });

  it('shows an error with retry when the list cannot be loaded', async () => {
    applyScenario('open');
    await committeeSignIn();
    let fail = true;
    server.use(
      http.get('*/api/admin/voters', () => {
        if (!fail) return undefined;
        return HttpResponse.json({ error: { code: 'UNKNOWN' } }, { status: 500 });
      }),
    );
    resetNavigation('/admin/voters');
    renderWithProviders(<VotersView />);
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load this page");
    fail = false;
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });
});
