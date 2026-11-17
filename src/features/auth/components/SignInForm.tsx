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
import { signInCopy } from '@/content/signInCopy';
import { resolveNextPath } from '@/features/election/voterRouting';
import { voterSignIn } from '@/lib/api/endpoints';
import { hasErrorCode } from '@/lib/api/errors';
import type { OtpChallenge, VoterSession } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';

import { signInFormSchema, type SignInFormValues } from '../schemas';
import { clearSessionEnding } from '../sessionEnding';
import { OtpStep } from './OtpStep';
import { signInBannerFor, signInBannerMessage, type SignInBanner } from './signInBanner';

const copy = signInCopy;

/**
 * Voter sign-in (V0a–d / MV0a–d) through UB SSO: NIM or UB email plus password, then a code for
 * accounts with two-step verification. On failure the password is cleared, focus moves to the
 * field that needs fixing and the message is announced (spec §4.2).
 */
export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [banner, setBanner] = useState<SignInBanner | null>(null);
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const sessionExpired = searchParams.get('reason') === 'expired';

  const { register, handleSubmit, setError, setFocus, setValue, formState } =
    useForm<SignInFormValues>({
      resolver: zodResolver(signInFormSchema),
      defaultValues: { username: '', password: '' },
      shouldFocusError: true,
    });

  const onSignedIn = (session: VoterSession) => {
    clearSessionEnding();
    queryClient.setQueryData(queryKeys.voter.me, session.voter);
    queryClient.setQueryData(queryKeys.election, session.election);
    const destination = resolveNextPath(searchParams.get('next'), {
      status: session.voter.status,
      state: session.election.state,
    });
    router.replace(destination);
  };

  const mutation = useMutation({
    mutationFn: (values: SignInFormValues) => voterSignIn(values.username, values.password),
    onSuccess: (result) => {
      setValue('password', '');
      if (result.kind === 'otp') {
        setChallenge(result.challenge);
        return;
      }
      onSignedIn(result.session);
    },
    onError: (error) => {
      setValue('password', '');
      if (hasErrorCode(error, 'NOT_A_VOTER')) {
        setBanner(null);
        setError(
          'username',
          { type: 'server', message: copy.errors.notAVoter },
          { shouldFocus: true },
        );
        return;
      }
      setBanner(signInBannerFor(error));
      setFocus('password');
    },
  });

  if (challenge) {
    return (
      <OtpStep
        challenge={challenge}
        onSignedIn={onSignedIn}
        onRestart={(reason) => {
          setChallenge(null);
          mutation.reset();
          setBanner(reason === 'expired' ? { kind: 'expired' } : null);
        }}
      />
    );
  }

  const onSubmit = handleSubmit((values) => {
    setBanner(null);
    mutation.mutate(values);
  });

  const busy = mutation.isPending || (mutation.isSuccess && mutation.data.kind === 'signed-in');

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
          {signInBannerMessage(banner)}
        </Alert>
      ) : null}

      <TextField
        label={copy.username}
        type="text"
        required
        placeholder={copy.usernamePlaceholder}
        autoComplete={publicEnv.boothMode ? 'off' : 'username'}
        autoCapitalize="none"
        spellCheck={false}
        error={formState.errors.username?.message}
        {...register('username')}
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
