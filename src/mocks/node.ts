/** msw/node server for Vitest: the same handlers the app uses at runtime. */
import { setupServer } from 'msw/node';

import { handlers } from './handlers';

export const server = setupServer(...handlers);
