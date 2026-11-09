import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

import { AnnouncerProvider } from '@/components/ui/Announcer';
import { ToastProvider } from '@/components/ui/Toaster';
import { VotingProvider } from '@/features/voting/VotingProvider';

export function makeTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
}

interface Options {
  queryClient?: QueryClient;
  /** Wrap in VotingProvider (signed-in voter area). */
  voting?: boolean;
}

/** Renders with the same providers as the app (query client, announcer, toasts, optional voting). */
export function renderWithProviders(
  ui: ReactElement,
  { queryClient = makeTestQueryClient(), voting = false }: Options = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AnnouncerProvider>
          <ToastProvider>
            {voting ? <VotingProvider>{children}</VotingProvider> : children}
          </ToastProvider>
        </AnnouncerProvider>
      </QueryClientProvider>
    );
  }
  return { ...render(ui, { wrapper: Wrapper }), queryClient };
}
