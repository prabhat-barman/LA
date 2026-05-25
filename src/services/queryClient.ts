import { QueryClient } from '@tanstack/react-query';

// Singleton TanStack Query client used by the QueryClientProvider in
// App.tsx. Defaults are chosen to favour stale-while-revalidate behaviour
// (instant UI on revisit, refetch in the background) while keeping
// retries on flaky mobile networks reasonable.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Treat data as fresh for 30s after a successful fetch — most
      // dashboard / catalog screens get revisited in well under that.
      staleTime: 30 * 1000,
      // Keep cached data around for 5 minutes after the last screen
      // unmounts so navigating away and back is instant.
      gcTime: 5 * 60 * 1000,
      // Two retries with exponential backoff (capped) is enough for
      // typical mobile flakiness without dragging out genuine errors.
      retry: 2,
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 8000),
      // RN doesn't have a "window focus" event the way the web does;
      // disable to avoid surprising fetches.
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
