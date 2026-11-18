import * as z from 'zod/mini';

import { adminCopy } from '@/content/adminCopy';
import { passwordField } from '@/features/auth/schemas';

/** Committee sign-in: username plus password. */
export const adminSignInFormSchema = z.object({
  username: z.string().check(z.trim(), z.minLength(1, adminCopy.signIn.usernameRequired)),
  password: passwordField,
});

export type AdminSignInFormValues = z.infer<typeof adminSignInFormSchema>;
