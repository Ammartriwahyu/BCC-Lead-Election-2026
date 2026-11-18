import type { DisplayPayload } from '@/lib/api/types';

import { FinalResultsScreen } from './FinalResultsScreen';
import { MostVotesScreen } from './MostVotesScreen';
import { OpensSoonScreen } from './OpensSoonScreen';
import { VotingClosedScreen } from './VotingClosedScreen';
import { VotingOpenScreen } from './VotingOpenScreen';
import { WinnerRevealScreen } from './WinnerRevealScreen';

/** One D frame for the payload on air. Each screen only receives the data of its own payload. */
export function DisplayScreen({ payload }: { payload: DisplayPayload }) {
  switch (payload.screen) {
    case 'OPENS_SOON':
      return <OpensSoonScreen candidates={payload.candidates} />;
    case 'VOTING_OPEN':
      return <VotingOpenScreen turnout={payload.turnout} />;
    case 'VOTING_CLOSED':
      return <VotingClosedScreen turnout={payload.turnout} />;
    case 'WINNER_REVEAL':
      return (
        <WinnerRevealScreen turnout={payload.turnout} candidateNumbers={payload.candidateNumbers} />
      );
    case 'FINAL_RESULTS':
      return <FinalResultsScreen turnout={payload.turnout} results={payload.results} />;
    case 'MOST_VOTES':
      return <MostVotesScreen results={payload.results} />;
  }
}
