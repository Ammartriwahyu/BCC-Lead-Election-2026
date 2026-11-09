import { render, screen } from '@testing-library/react';

import { AdminTopbar, initialsOf } from './AdminTopbar';
import { VoterNavbar } from './VoterNavbar';

describe('initialsOf', () => {
  it('takes the first letter of the first two words', () => {
    expect(initialsOf('Election Committee')).toBe('EC');
    expect(initialsOf('  ada  ')).toBe('A');
    expect(initialsOf('Election Committee Two')).toBe('EC');
  });
});

describe('AdminTopbar', () => {
  it('renders the breadcrumb with the current page marked', () => {
    render(<AdminTopbar page="Voter list" accountName="Election Committee" />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent(
      'Election/Voter list',
    );
    expect(screen.getByText('Voter list')).toHaveAttribute('aria-current', 'page');
  });
});

describe('VoterNavbar', () => {
  it('shows the election name when signed out', () => {
    render(<VoterNavbar />);
    expect(screen.getByText('Chairperson Election 2026')).toBeInTheDocument();
    expect(screen.queryByText('Signed in as')).not.toBeInTheDocument();
  });

  it('shows the voter and the sign-out slot when signed in', () => {
    render(
      <VoterNavbar voterName="Member name" signOutSlot={<button type="button">Sign out</button>} />,
    );
    expect(screen.getByText('Member name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});
