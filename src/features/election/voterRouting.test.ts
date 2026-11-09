import { isVoterPathAllowed, resolveNextPath, voterHome } from './voterRouting';

describe('voterHome', () => {
  it('sends voters to the right page for each state', () => {
    expect(voterHome({ status: 'NOT_VOTED', state: 'NOT_STARTED' })).toBe('/candidates');
    expect(voterHome({ status: 'NOT_VOTED', state: 'OPEN' })).toBe('/candidates');
    expect(voterHome({ status: 'NOT_VOTED', state: 'CLOSED' })).toBe('/closed');
    expect(voterHome({ status: 'VOTED', state: 'OPEN' })).toBe('/already-voted');
    expect(voterHome({ status: 'VOTED', state: 'CLOSED', justSubmitted: true })).toBe(
      '/vote/submitted',
    );
  });
});

describe('isVoterPathAllowed', () => {
  const open = { status: 'NOT_VOTED', state: 'OPEN' } as const;

  it('allows candidates and detail pages while not voted and not closed', () => {
    expect(isVoterPathAllowed('/candidates', open)).toBe(true);
    expect(isVoterPathAllowed('/candidates/cand-01', open)).toBe(true);
    expect(isVoterPathAllowed('/candidates', { ...open, state: 'NOT_STARTED' })).toBe(true);
    expect(isVoterPathAllowed('/candidatesx', open)).toBe(false);
  });

  it('allows the vote error page only while open', () => {
    expect(isVoterPathAllowed('/vote/error', open)).toBe(true);
    expect(isVoterPathAllowed('/vote/error', { ...open, state: 'NOT_STARTED' })).toBe(false);
  });

  it('keeps closed voters on /closed and sends them back on reopen', () => {
    const closed = { status: 'NOT_VOTED', state: 'CLOSED' } as const;
    expect(isVoterPathAllowed('/closed', closed)).toBe(true);
    expect(isVoterPathAllowed('/candidates', closed)).toBe(false);
    expect(isVoterPathAllowed('/closed', open)).toBe(false);
  });

  it('never shows the vote form again after voting', () => {
    const voted = { status: 'VOTED', state: 'OPEN' } as const;
    expect(isVoterPathAllowed('/candidates', voted)).toBe(false);
    expect(isVoterPathAllowed('/vote/error', voted)).toBe(false);
    expect(isVoterPathAllowed('/vote/submitted', voted)).toBe(true);
    expect(isVoterPathAllowed('/already-voted', voted)).toBe(true);
  });
});

describe('resolveNextPath', () => {
  const open = { status: 'NOT_VOTED', state: 'OPEN' } as const;

  it('keeps a valid destination', () => {
    expect(resolveNextPath('/candidates/cand-02', open)).toBe('/candidates/cand-02');
  });

  it('ignores missing, external and protocol-relative destinations', () => {
    expect(resolveNextPath(null, open)).toBe('/candidates');
    expect(resolveNextPath('https://evil.test/x', open)).toBe('/candidates');
    expect(resolveNextPath('//evil.test', open)).toBe('/candidates');
    expect(resolveNextPath('/\\evil.test', open)).toBe('/candidates');
  });

  it('drops destinations that are not valid for the current state', () => {
    expect(resolveNextPath('/candidates', { status: 'VOTED', state: 'OPEN' })).toBe(
      '/already-voted',
    );
    expect(resolveNextPath('/candidates', { status: 'NOT_VOTED', state: 'CLOSED' })).toBe(
      '/closed',
    );
    expect(resolveNextPath('/admin', open)).toBe('/candidates');
  });

  it('never resumes into the error or submitted pages', () => {
    expect(resolveNextPath('/vote/error', open)).toBe('/candidates');
    expect(resolveNextPath('/vote/submitted', { status: 'VOTED', state: 'OPEN' })).toBe(
      '/already-voted',
    );
  });
});
