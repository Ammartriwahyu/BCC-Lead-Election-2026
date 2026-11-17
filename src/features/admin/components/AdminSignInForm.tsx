'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { PasswordField } from '@/components/ui/PasswordField';
import { TextField } from '@/components/ui/TextField';
import { adminCopy } from '@/content/adminCopy';
import { signInCopy } from '@/content/signInCopy';
import {
  signInBannerFor,
  signInBannerMessage,
  type SignInBanner,
} from '@/features/auth/components/signInBanner';
import { clearSessionEnding } from '@/features/auth/sessionEnding';
import { adminSignIn } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query/keys';

import { resolveAdminNextPath } from '../adminRouting';
import { adminSignInFormSchema, type AdminSignInFormValues } from '../schemas';

const copy = signInCopy;

function bannerMessage(banner: SignInBanner): string {
  return banner.kind === 'invalid'
    ? adminCopy.signIn.invalidCredentials
    : signInBannerMessage(banner);
}

/**
 * Committee sign-in form (A0, 42:2231), by username (backend). Errors reuse the voter sign-in
 * styles and copy (V0d):
 * the password is cleared, focus returns to it and the message is announced.
 */
export function AdminSignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [banner, setBanner] = useState<SignInBanner | null>(null);
  const sessionExpired = searchParams.get('reason') === 'expired';

  // Sign-out is complete once this page shows. From here on a 401 (e.g. Back restoring the
  // panel from the router cache) is a missing session again and must return here.
  useEffect(() => {
    clearSessionEnding();
  }, []);

  const { register, handleSubmit, setFocus, setValue, formState } = useForm<AdminSignInFormValues>({
    resolver: zodResolver(adminSignInFormSchema),
    defaultValues: { username: '', password: '' },
    shouldFocusError: true,
  });

  const mutation = useMutation({
    mutationFn: (values: AdminSignInFormValues) => adminSignIn(values.username, values.password),
    onSuccess: (admin) => {
      clearSessionEnding();
      queryClient.setQueryData(queryKeys.admin.me, admin);
      router.replace(resolveAdminNextPath(searchParams.get('next')));
    },
    onError: (error) => {
      setValue('password', '');
      setBanner(signInBannerFor(error));
      setFocus('password');
    },
  });

  const onSubmit = handleSubmit((values) => {
    setBanner(null);
    mutation.mutate(values);
  });

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-20">
      {sessionExpired && !banner ? (
        <Alert tone="info" role="status">
          {copy.sessionExpired}
        </Alert>
      ) : null}
      {banner ? (
        <Alert tone="danger" role="alert">
          {bannerMessage(banner)}
        </Alert>
      ) : null}
      <TextField
        label={adminCopy.signIn.username}
        type="text"
        required
        placeholder={adminCopy.signIn.usernamePlaceholder}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        error={formState.errors.username?.message}
        {...register('username')}
      />
      <PasswordField
        label={copy.password}
        required
        placeholder={copy.passwordPlaceholder}
        autoComplete="current-password"
        error={formState.errors.password?.message}
        {...register('password')}
      />
      <Button
        type="submit"
        variant="dark"
        fullWidth
        loading={mutation.isPending || mutation.isSuccess}
      >
        {copy.submit}
      </Button>
    </form>
  );
}
