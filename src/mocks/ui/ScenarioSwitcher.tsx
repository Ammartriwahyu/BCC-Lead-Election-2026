'use client';

/**
 * Dev/demo-only scenario switcher. Compiled out of builds without NEXT_PUBLIC_API_MOCKING=enabled.
 * Strings live here (not in content/copy.ts) because this panel never ships to production.
 */
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useState } from 'react';

import { applyMockScenario, getMockState, resetMockData, type MockState } from '../client';
import {
  CANDIDATE_SET_NAMES,
  SCENARIOS,
  scenarioSchema,
  VOTER_COUNT_OPTIONS,
  type ScenarioName,
} from '../scenario-names';

const COPY = {
  toggle: 'Mock',
  title: 'Scenario switcher (mock API)',
  scenario: 'Scenario',
  candidates: 'Candidates',
  voters: 'Registered voters',
  apply: 'Apply',
  reset: 'Reset demo data',
  close: 'Close',
  state: (s: MockState) =>
    `State ${s.status} · screen ${s.displayScreen} · ${s.votesReceived}/${s.registeredVoters} voted · ${s.voteRequests} vote requests`,
} as const;

const PARAM = { scenario: 'scenario', candidates: 'candidates', voters: 'voters' } as const;

type CandidateSetName = (typeof CANDIDATE_SET_NAMES)[number];

function parseCandidateSet(value: string | null): CandidateSetName | undefined {
  return CANDIDATE_SET_NAMES.find((name) => name === value);
}

export function ScenarioSwitcher() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [scenario, setScenario] = useState<ScenarioName>('open');
  const [candidateSet, setCandidateSet] = useState<CandidateSetName>('default');
  const [voterCount, setVoterCount] = useState<number>(VOTER_COUNT_OPTIONS[0]);
  const [state, setState] = useState<MockState | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshState = useCallback(async () => {
    setState(await getMockState().catch(() => null));
  }, []);

  const afterChange = useCallback(async () => {
    await queryClient.invalidateQueries();
    router.refresh();
    await refreshState();
  }, [queryClient, refreshState, router]);

  // ?scenario=…&candidates=…&voters=… applies a preset once, then removes the params.
  useEffect(() => {
    const url = new URL(window.location.href);
    const parsed = scenarioSchema.safeParse(url.searchParams.get(PARAM.scenario));
    if (!parsed.success) return;
    const set = parseCandidateSet(url.searchParams.get(PARAM.candidates));
    const voters = Number(url.searchParams.get(PARAM.voters)) || undefined;
    Object.values(PARAM).forEach((key) => {
      url.searchParams.delete(key);
    });
    void applyMockScenario(parsed.data, {
      ...(set ? { candidateSet: set } : {}),
      ...(voters ? { voterCount: voters } : {}),
    }).then(() => {
      window.history.replaceState(null, '', `${url.pathname}${url.search}`);
      return afterChange();
    });
  }, [afterChange]);

  if (pathname.startsWith('/display')) return null;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await afterChange();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void refreshState();
        }}
        className="fixed bottom-12 left-12 z-[1000] min-h-44 min-w-44 rounded-full bg-slate-900 px-12 text-caption-semibold text-text-on-dark shadow-modal"
      >
        {COPY.toggle}
      </button>
    );
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="fixed bottom-12 left-12 z-[1000] w-288 rounded-xl border border-border-default bg-surface-card p-16 text-body-2 text-text-primary shadow-modal"
    >
      <h2 id={`${id}-title`} className="mb-12 text-body-2-semibold">
        {COPY.title}
      </h2>
      <label className="mb-8 block">
        <span className="mb-4 block text-caption">{COPY.scenario}</span>
        <select
          className="min-h-44 w-full rounded-md border border-border-default px-8"
          value={scenario}
          onChange={(e) => {
            setScenario(scenarioSchema.parse(e.target.value));
          }}
        >
          {SCENARIOS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="mb-8 block">
        <span className="mb-4 block text-caption">{COPY.candidates}</span>
        <select
          className="min-h-44 w-full rounded-md border border-border-default px-8"
          value={candidateSet}
          onChange={(e) => {
            setCandidateSet(parseCandidateSet(e.target.value) ?? 'default');
          }}
        >
          {CANDIDATE_SET_NAMES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="mb-12 block">
        <span className="mb-4 block text-caption">{COPY.voters}</span>
        <select
          className="min-h-44 w-full rounded-md border border-border-default px-8"
          value={voterCount}
          onChange={(e) => {
            setVoterCount(Number(e.target.value));
          }}
        >
          {VOTER_COUNT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      {state ? <p className="mb-12 text-caption">{COPY.state(state)}</p> : null}
      <div className="flex flex-wrap gap-8">
        <button
          type="button"
          disabled={busy}
          className="min-h-44 rounded-md bg-action-primary px-12 text-text-on-dark disabled:opacity-50"
          onClick={() => void run(() => applyMockScenario(scenario, { candidateSet, voterCount }))}
        >
          {COPY.apply}
        </button>
        <button
          type="button"
          disabled={busy}
          className="min-h-44 rounded-md border border-border-brand px-12 text-text-brand disabled:opacity-50"
          onClick={() => void run(resetMockData)}
        >
          {COPY.reset}
        </button>
        <button
          type="button"
          className="min-h-44 rounded-md px-12 underline"
          onClick={() => {
            setOpen(false);
          }}
        >
          {COPY.close}
        </button>
      </div>
    </section>
  );
}
