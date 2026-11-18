/** Test helpers for the committee panel. Demo accounts exist only in the mock fixtures. */
import { adminSignIn } from '@/lib/api/endpoints';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/mocks/fixtures';

/** Signs the demo committee account in through the mock API (cookie kept by the test cookie jar). */
export async function committeeSignIn(): Promise<void> {
  await adminSignIn(DEMO_ACCOUNTS.committee, DEMO_PASSWORD.committee);
}
