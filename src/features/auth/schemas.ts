import * as z from 'zod/mini';

import { OTP } from '@/config/constants';
import { signInCopy } from '@/content/signInCopy';
import '@/lib/api/zodConfig';

const { errors } = signInCopy;

/** Shared with the committee form (features/admin/schemas.ts). */
export const passwordField = z.string().check(z.minLength(1, errors.passwordRequired));

/** Voter sign-in: NIM or UB email (UB SSO decides which), plus password. */
export const signInFormSchema = z.object({
  username: z.string().check(z.trim(), z.minLength(1, errors.usernameRequired)),
  password: passwordField,
});

export const otpFormSchema = z.object({
  code: z
    .string()
    .check(
      z.trim(),
      z.regex(new RegExp(`^\\d{${OTP.codeLength}}$`), signInCopy.otp.errors.codeRequired),
    ),
  deviceId: z.string(),
});

export type SignInFormValues = z.infer<typeof signInFormSchema>;
export type OtpFormValues = z.infer<typeof otpFormSchema>;
