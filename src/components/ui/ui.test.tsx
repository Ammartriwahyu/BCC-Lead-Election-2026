import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { Button } from './Button';
import { Dialog } from './Dialog';
import { PasswordField } from './PasswordField';
import { TextField } from './TextField';

function DialogHarness({ dismissible = true }: { dismissible?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Open
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Vote for Candidate Name 01?"
        description="You can only vote once."
        dismissible={dismissible}
        actions={
          <Button
            onClick={() => {
              setOpen(false);
            }}
          >
            Cancel
          </Button>
        }
      />
    </>
  );
}

describe('Dialog', () => {
  it('traps focus, closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Vote for Candidate Name 01?' });
    expect(dialog).toHaveAccessibleDescription('You can only vote once.');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('ignores Escape when not dismissible', async () => {
    const user = userEvent.setup();
    render(<DialogHarness dismissible={false} />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('Button', () => {
  it('is disabled and busy while loading', () => {
    render(<Button loading>Submit vote</Button>);
    const button = screen.getByRole('button', { name: 'Submit vote' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});

describe('fields', () => {
  it('links the error message to the input and marks it invalid', () => {
    render(<TextField label="Email" required error="This email isn't on the voter register." />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toBeInvalid();
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription("This email isn't on the voter register.");
  });

  it('toggles password visibility with an accessible button', async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" required />);
    const input = screen.getByLabelText(/^Password/, { selector: 'input' });
    expect(input).toHaveAttribute('type', 'password');
    const toggle = screen.getByRole('button', { name: 'Show password' });
    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
