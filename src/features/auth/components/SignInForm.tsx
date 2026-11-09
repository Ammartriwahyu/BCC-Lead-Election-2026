'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { PasswordField } from '@/components/ui/PasswordField';
import { TextField } from '@/components/ui/TextField';
import { publicEnv } from '@/config/env';
import { content } from '@/content/copy';
import { resolveNextPath } from '@/features/election/voterRouting';
import { voterSignIn } from '@/lib/api/endpoints';
import { hasErrorCode, isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query/keys';

import { signInFormSchema, type SignInFormValues } from '../schemas';
import { clearSessionEnding } from '../sessionEnding';

const copy = content.signIn;

type Banner = 'invalid' | 'network' | 'unknown' | null;

function bannerMessage(banner: Exclude<Banner, null>): string {
  if (banner === 'invalid') return copy.errors.invalidCredentials;
  if (banner === 'network') return copy.errors.network;
  return copy.errors.unknown;
}

/**
 * Voter sign-in (V0a–d / MV0a–d). On failure the password is cleared, focus moves to the field
 * that needs fixing and the message is announced (spec §4.2).
 */
export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [banner, setBanner] = useState<Banner>(null);
  const sessionExpired = searchParams.get('reason') === 'expired';

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: { email: '', password: '' },
    shouldFocusError: true,
  });
  const { register, handleSubmit, setError, setFocus, setValue, formState } = form;

  const mutation = useMutation({
    mutationFn: (values: SignInFormValues) => voterSignIn(values.email, values.password),
    onSuccess: (session) => {
      clearSessionEnding();
      queryClient.setQueryData(queryKeys.voter.me, session.voter);
      queryClient.setQueryData(queryKeys.election, session.election);
      const destination = resolveNextPath(searchParams.get('next'), {
        status: session.voter.status,
        state: session.election.state,
      });
      router.replace(destination);
    },
    onError: (error) => {
      setValue('password', '');
      if (hasErrorCode(error, 'NOT_A_VOTER')) {
        setBanner(null);
        setError(
          'email',
          { type: 'server', message: copy.errors.notAVoter },
          { shouldFocus: true },
        );
        return;
      }
      if (hasErrorCode(error, 'INVALID_CREDENTIALS')) setBanner('invalid');
      else if (isApiError(error) && error.isTransient) setBanner('network');
      else setBanner('unknown');
      setFocus('password');
    },
  });

  const onSubmit = handleSubmit((values) => {
    setBanner(null);
    mutation.mutate(values);
  });

  const busy = mutation.isPending || mutation.isSuccess;

  return (
    <form
      noValidate
      onSubmit={(event) => void onSubmit(event)}
      className="flex flex-col gap-16 md:gap-20"
    >
      <div className="flex flex-col gap-4">
        <h2 className="text-heading-5 text-text-primary">{copy.cardTitle}</h2>
        <p className="text-body-2 text-text-secondary">{copy.cardSubtitle}</p>
      </div>

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
        label={copy.email}
        type="email"
        inputMode="email"
        required
        placeholder={copy.emailPlaceholder}
        autoComplete={publicEnv.boothMode ? 'off' : 'email'}
        autoCapitalize="none"
        spellCheck={false}
        error={formState.errors.email?.message}
        {...register('email')}
      />
      <PasswordField
        label={copy.password}
        required
        placeholder={copy.passwordPlaceholder}
        autoComplete={publicEnv.boothMode ? 'new-password' : 'current-password'}
        error={formState.errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" fullWidth loading={busy}>
        {copy.submit}
      </Button>
    </form>
  );
}
