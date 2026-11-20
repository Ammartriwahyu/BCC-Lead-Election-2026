import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { notFound } from 'next/navigation';
import * as z from 'zod/mini';

import { CANDIDATE } from '@/config/constants';
import type * as Endpoints from '@/lib/api/endpoints';
import { getDb, storePhoto } from '@/mocks/db';
import { route } from '@/mocks/handlers';
import { server } from '@/mocks/node';
import { applyScenario } from '@/mocks/scenarios';
import { committeeSignIn } from '@/test/admin';
import { navigation, resetNavigation } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';

import { CandidateFormView } from './CandidateFormView';
import {
  ballotOptions,
  candidateFormSchema,
  classYearOptions,
  emptyFormValues,
  studyProgramOptions,
} from './candidateRules';
import { CandidatesView } from './CandidatesView';
import { openVotingBlocker } from './openVoting';
import { ElectionActionDialog } from '../components/ElectionActionDialog';

/**
 * Photo upload goes through FormData, which jsdom cannot hand to Node's fetch. The upload is
 * replaced by a stand-in that stores a photo in the mock backend (the browser e2e suite covers
 * the real request).
 */
vi.mock('@/lib/api/endpoints', async (importOriginal) => {
  const actual = await importOriginal<typeof Endpoints>();
  return {
    ...actual,
    uploadCandidatePhoto: vi.fn(async (id: string) => {
      const { getDb: db, storePhoto: store } = await import('@/mocks/db');
      const record = db().candidates.find((c) => String(c.id) === id);
      if (record) record.photo = store(db(), new Uint8Array([0x89, 0x50]), 'image/png');
      return actual.getAdminCandidate(id);
    }),
  };
});

/** jsdom never loads images: report a 4:5 photo at once. */
class LoadedImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 800;
  naturalHeight = 1000;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

type Scenario = Parameters<typeof applyScenario>[0];
type Data = Parameters<typeof applyScenario>[1];

async function signedIn(scenario: Scenario = 'not-started', data?: Data) {
  applyScenario(scenario, data);
  await committeeSignIn();
}

const pngFile = () =>
  new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'candidate-03.png', { type: 'image/png' });

beforeEach(() => {
  vi.stubGlobal('Image', LoadedImage);
  URL.createObjectURL = vi.fn(() => 'blob:photo');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('candidate rules', () => {
  it('offers free ballot numbers, programs and years, keeping saved values', () => {
    const list = [
      { id: '1', number: 1 },
      { id: '2', number: 2 },
    ] as never[];
    expect(ballotOptions(list, '2').map((o) => [o.value, o.disabled])).toEqual([
      ['1', true],
      ['2', false],
      ['3', false],
    ]);
    expect(studyProgramOptions('Sistem Informasi').at(-1)?.value).toBe('Sistem Informasi');
    expect(classYearOptions('2015').at(-1)?.value).toBe('2015');
    expect(classYearOptions('')[0]?.value).toBe('2026');
  });

  it('explains why voting cannot open', () => {
    const complete = { photoUrl: '/p.png', number: 1 };
    expect(openVotingBlocker([complete, complete] as never[])).toMatch(/needs 3 candidates/);
    expect(openVotingBlocker([complete, complete, { photoUrl: null, number: 3 }] as never[])).toBe(
      'Add a photo for Candidate 03 before opening voting.',
    );
    expect(openVotingBlocker([complete, complete, complete] as never[])).toBeNull();
  });

  it('accepts mission points up to the backend limit of 200 characters', () => {
    const missionErrors = (text: string) => {
      const parsed = z.safeParse(candidateFormSchema, {
        ...emptyFormValues(),
        missions: [{ text }],
      });
      return parsed.success ? [] : parsed.error.issues.filter((i) => i.path[0] === 'missions');
    };
    expect(CANDIDATE.missionMax).toBe(200);
    expect(missionErrors('a'.repeat(200))).toEqual([]);
    expect(missionErrors('a'.repeat(201))[0]?.message).toBe('Keep each point to 200 characters.');
  });
});

describe('CandidatesView (A6)', () => {
  it('not started: rows with completeness and Edit; Add is disabled once 1–3 are used', async () => {
    await signedIn();
    resetNavigation('/admin/candidates');
    renderWithProviders(<CandidatesView />);
    const list = await screen.findByRole('list', { name: 'Candidates' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Candidate Name 01');
    expect(rows[0]).toHaveTextContent('Information Systems · Class of 2023');
    expect(rows[0]).toHaveTextContent('Complete');
    expect(rows[0]).toHaveTextContent('3 mission points');
    expect(
      within(rows[0] as HTMLElement).getByRole('link', { name: 'Edit Candidate Name 01' }),
    ).toHaveAttribute('href', '/admin/candidates/1/edit');
    expect(screen.getByRole('button', { name: 'Add candidate' })).toBeDisabled();
    expect(screen.getByText(/All ballot numbers are taken/)).toBeInTheDocument();
  });

  it('marks a candidate without a photo and lets the committee add one more', async () => {
    await signedIn('not-started', { candidateSet: 'one' });
    renderWithProviders(<CandidatesView />);
    expect(await screen.findByRole('link', { name: 'Add candidate' })).toHaveAttribute(
      'href',
      '/admin/candidates/new',
    );
  });

  it('shows "Needs a photo" for an incomplete candidate', async () => {
    await signedIn('not-started', { candidateSet: 'missing-photo' });
    renderWithProviders(<CandidatesView />);
    const rows = within(await screen.findByRole('list', { name: 'Candidates' })).getAllByRole(
      'listitem',
    );
    expect(rows[2]).toHaveTextContent('Needs a photo');
  });

  it('empty: Brace "Hello" and Add candidate', async () => {
    await signedIn('not-started', { candidateSet: 'none' });
    renderWithProviders(<CandidatesView />);
    expect(await screen.findByRole('heading', { name: 'No candidates yet' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Add candidate' })).toBeVisible();
  });

  it('open and closed: read-only with the lock note', async () => {
    await signedIn('open');
    const { unmount } = renderWithProviders(<CandidatesView />);
    expect(await screen.findByText(/locked while voting is open/)).toBeVisible();
    expect(screen.queryByRole('link', { name: /^Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add candidate' })).not.toBeInTheDocument();
    unmount();
    applyScenario('closed');
    await committeeSignIn();
    renderWithProviders(<CandidatesView />);
    expect(await screen.findByText(/Reopening voting keeps them locked/)).toBeVisible();
  });

  it('shows an error with retry when the list cannot be loaded', async () => {
    await signedIn();
    server.use(
      http.get(route('getAdminCandidates'), () =>
        HttpResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 }),
      ),
    );
    renderWithProviders(<CandidatesView />);
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load this page");
  });
});

describe('CandidateForm: add (A7)', () => {
  it('lists every problem, focuses the first one, and saves a complete candidate', async () => {
    await signedIn('not-started', { candidateSet: 'one' });
    resetNavigation('/admin/candidates/new');
    renderWithProviders(<CandidateFormView id={null} />);
    const user = userEvent.setup();
    await screen.findByRole('heading', { level: 1, name: 'Add candidate' });
    // The first free ballot number is preselected.
    expect(screen.getByRole('combobox', { name: /Ballot number/ })).toHaveValue('2');

    await user.click(screen.getByRole('button', { name: 'Save candidate' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '6 fields need your attention before you can save.',
    );
    expect(screen.getByText('Add a photo of the candidate.')).toBeInTheDocument();
    expect(screen.getByText('Write at least one mission point.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Photo/ })).toHaveFocus();
    });

    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('no file input');
    await user.upload(input, pngFile());
    expect(await screen.findByText('candidate-03.png')).toBeInTheDocument();
    expect(screen.getByText(/· 800 × 1000 px/)).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: /Full name/ }), 'Candidate Name 02');
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Study program/ }),
      'Computer Engineering',
    );
    await user.selectOptions(screen.getByRole('combobox', { name: /Class year/ }), '2024');
    await user.type(screen.getByRole('textbox', { name: /Vision/ }), 'A clear learning path.');
    expect(screen.getByText('22 / 280')).toBeInTheDocument();
    await user.type(
      screen.getByRole('textbox', { name: 'Mission point 1' }),
      'Write a curriculum.',
    );
    await user.click(screen.getByRole('button', { name: '+ Add mission point' }));
    await user.type(screen.getByRole('textbox', { name: 'Mission point 2' }), 'Mentor juniors.');

    // The live preview uses the voter card.
    const preview = screen.getByRole('complementary', { name: 'Preview' });
    expect(preview).toHaveTextContent('Candidate 02');
    expect(preview).toHaveTextContent('Computer Engineering, class of 2024');

    await user.click(screen.getByRole('button', { name: 'Save candidate' }));
    await waitFor(() => {
      expect(navigation.router.push).toHaveBeenCalledWith('/admin/candidates');
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Candidate added');
    const saved = getDb().candidates.find((c) => c.fullName === 'Candidate Name 02');
    expect(saved).toMatchObject({
      ballotNumber: 2,
      studyProgram: 'Computer Engineering',
      classYear: 2024,
      missions: ['Write a curriculum.', 'Mentor juniors.'],
    });
    expect(saved?.photo).not.toBeNull();
  });

  it('rejects a photo that is not JPG/PNG or larger than 2 MB before uploading', async () => {
    await signedIn('not-started', { candidateSet: 'one' });
    renderWithProviders(<CandidateFormView id={null} />);
    const user = userEvent.setup({ applyAccept: false });
    await screen.findByRole('heading', { level: 1, name: 'Add candidate' });
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('no file input');
    await user.upload(input, new File(['GIF'], 'a.gif', { type: 'image/gif' }));
    expect(await screen.findByText('Use a JPG or PNG file.')).toBeInTheDocument();
    await user.upload(
      input,
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' }),
    );
    expect(await screen.findByText(/larger than 2 MB/)).toBeInTheDocument();
  });

  it('keeps 1 to 5 mission points', async () => {
    await signedIn('not-started', { candidateSet: 'one' });
    renderWithProviders(<CandidateFormView id={null} />);
    const user = userEvent.setup();
    await screen.findByRole('heading', { level: 1, name: 'Add candidate' });
    expect(screen.getByRole('button', { name: 'Remove mission point 1' })).toBeDisabled();
    const add = screen.getByRole('button', { name: '+ Add mission point' });
    for (let i = 0; i < 4; i += 1) await user.click(add);
    expect(screen.getAllByRole('textbox', { name: /^Mission point/ })).toHaveLength(5);
    expect(add).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Remove mission point 5' }));
    expect(add).toBeEnabled();
  });

  it('asks before leaving a filled form', async () => {
    await signedIn('not-started', { candidateSet: 'one' });
    renderWithProviders(<CandidateFormView id={null} />);
    const user = userEvent.setup();
    await user.type(await screen.findByRole('textbox', { name: /Full name/ }), 'Half done');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    const dialog = await screen.findByRole('dialog', { name: 'Discard this candidate?' });
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(navigation.router.push).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Back to candidates' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard' }),
    );
    expect(navigation.router.push).toHaveBeenCalledWith('/admin/candidates');
  });

  it('shows the backend field errors and a taken ballot number', async () => {
    await signedIn('not-started', { candidateSet: 'one' });
    server.use(
      http.post(route('createCandidate'), () =>
        HttpResponse.json(
          { error: { code: 'BALLOT_NUMBER_TAKEN', message: 'taken' } },
          { status: 409 },
        ),
      ),
    );
    renderWithProviders(<CandidateFormView id={null} />);
    const user = userEvent.setup();
    await screen.findByRole('heading', { level: 1, name: 'Add candidate' });
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('no file input');
    await user.upload(input, pngFile());
    await user.type(screen.getByRole('textbox', { name: /Full name/ }), 'Someone');
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Study program/ }),
      'Information Systems',
    );
    await user.selectOptions(screen.getByRole('combobox', { name: /Class year/ }), '2023');
    await user.type(screen.getByRole('textbox', { name: /Vision/ }), 'Vision.');
    await user.type(screen.getByRole('textbox', { name: 'Mission point 1' }), 'Mission.');
    await user.click(screen.getByRole('button', { name: 'Save candidate' }));
    const ballot = screen.getByRole('combobox', { name: /Ballot number/ });
    await waitFor(() => {
      expect(ballot).toHaveAccessibleDescription(/Another candidate already has this number/);
    });
    expect(ballot).toHaveFocus();
  });
});

describe('CandidateForm: edit (A8)', () => {
  it('saves changes and returns to the list', async () => {
    await signedIn();
    resetNavigation('/admin/candidates/1/edit');
    renderWithProviders(<CandidateFormView id="1" />);
    const user = userEvent.setup();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit Candidate Name 01' }),
    ).toBeVisible();
    expect(screen.getByText('Current photo')).toBeInTheDocument();
    const name = screen.getByRole('textbox', { name: /Full name/ });
    await user.clear(name);
    await user.type(name, 'Renamed Candidate');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => {
      expect(navigation.router.push).toHaveBeenCalledWith('/admin/candidates');
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Changes saved');
    expect(getDb().candidates[0]?.fullName).toBe('Renamed Candidate');
  });

  it('removing the photo makes the photo required again', async () => {
    await signedIn();
    renderWithProviders(<CandidateFormView id="1" />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Add a photo of the candidate.')).toBeInTheDocument();
  });

  it('deletes after confirmation', async () => {
    await signedIn();
    renderWithProviders(<CandidateFormView id="3" />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Delete candidate' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Candidate Name 03?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete candidate' }));
    await waitFor(() => {
      expect(navigation.router.push).toHaveBeenCalledWith('/admin/candidates');
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Candidate removed');
    expect(getDb().candidates.map((c) => c.id)).toEqual([1, 2]);
  });

  it('an unknown candidate is a 404, and a locked ballot sends the form back to the list', async () => {
    await signedIn();
    renderWithProviders(<CandidateFormView id="99" />);
    await waitFor(() => {
      expect(notFound).toHaveBeenCalled();
    });
    applyScenario('open');
    await committeeSignIn();
    resetNavigation('/admin/candidates/1/edit');
    renderWithProviders(<CandidateFormView id="1" />);
    await waitFor(() => {
      expect(navigation.router.replace).toHaveBeenCalledWith('/admin/candidates');
    });
  });
});

describe('Open voting dialog', () => {
  it('explains why voting cannot open and links to the candidates', async () => {
    await signedIn('not-started', { candidateSet: 'missing-photo' });
    renderWithProviders(
      <ElectionActionDialog
        action="open"
        open
        onOpenChange={() => undefined}
        turnout={{ registeredVoters: 0, votesReceived: 0, notVoted: 0, ratio: 0 }}
      />,
    );
    const dialog = await screen.findByRole('dialog', { name: 'Open voting now?' });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Add a photo for Candidate 03 before opening voting.',
    );
    expect(within(dialog).getByRole('link', { name: 'Go to candidates' })).toHaveAttribute(
      'href',
      '/admin/candidates',
    );
    expect(within(dialog).queryByRole('button', { name: 'Open voting' })).not.toBeInTheDocument();
  });

  it('refetches the reason when the backend refuses (CANDIDATES_INCOMPLETE)', async () => {
    await signedIn();
    renderWithProviders(
      <ElectionActionDialog
        action="open"
        open
        onOpenChange={() => undefined}
        turnout={{ registeredVoters: 0, votesReceived: 0, notVoted: 0, ratio: 0 }}
      />,
    );
    const user = userEvent.setup();
    const dialog = await screen.findByRole('dialog', { name: 'Open voting now?' });
    // Another committee member removed the third candidate's photo meanwhile.
    const third = getDb().candidates[2];
    if (third) third.photo = null;
    await user.click(await within(dialog).findByRole('button', { name: 'Open voting' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Add a photo for Candidate 03',
    );
  });
});

describe('storePhoto', () => {
  it('keeps uploaded bytes for the mock photo URL', () => {
    const photo = storePhoto(getDb(), new Uint8Array([1]), 'image/jpeg');
    expect(photo.file).toMatch(/\.jpg$/);
  });
});
