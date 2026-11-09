import { z } from 'zod';

import { content } from '@/content/copy';

const { errors } = content.signIn;

/** Shared by the voter and committee sign-in forms. */
export const signInFormSchema = z.object({
  email: z.string().trim().min(1, errors.emailRequired).pipe(z.email(errors.emailInvalid)),
  password: z.string().min(1, errors.passwordRequired),
});

export type SignInFormValues = z.infer<typeof signInFormSchema>;
