'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { OTP } from '@/config/constants';
import { signInCopy } from '@/content/signInCopy';
import { voterSubmitOtp } from '@/lib/api/endpoints';
import { hasErrorCode, isApiError } from '@/lib/api/errors';
import type { OtpChallenge, VoterSession } from '@/lib/api/types';

import { otpFormSchema, type OtpFormValues } from '../schemas';
import { signInBannerMessage, signInBannerFor, type SignInBanner } from './signInBanner';

const copy = signInCopy.otp;

interface OtpStepProps {
  challenge: OtpChallenge;
  onSignedIn: (session: VoterSession) => void;
  /** Back to the credentials step; `expired` when the one-time flow can't be used anymore. */
  onRestart: (reason?: 'expired') => void;
}

const defaultDevice = (challenge: OtpChallenge) =>
  (challenge.devices.find((d) => d.isDefault) ?? challenge.devices[0])?.id ?? '';

/**
 * Second sign-in step for UB accounts with two-step verification (no Figma frame: built from the
 * sign-in card, logged in DEVIATIONS). A wrong code gives a fresh one-time flow from the backend.
 */
export function OtpStep({ challenge, onSignedIn, onRestart }: OtpStepProps) {
  const [flow, setFlow] = useState(challenge.flow);
  const [banner, setBanner] = useState<SignInBanner | null>(null);

  const { register, handleSubmit, setError, setFocus, setValue, formState, control } =
    useForm<OtpFormValues>({
      resolver: zodResolver(otpFormSchema),
      defaultValues: { code: '', deviceId: defaultDevice(challenge) },
      shouldFocusError: true,
    });

  useEffect(() => {
    setFocus('code');
  }, [setFocus]);

  const mutation = useMutation({
    mutationFn: (values: OtpFormValues) =>
      voterSubmitOtp(flow, values.code, values.deviceId || undefined),
    onSuccess: onSignedIn,
    onError: (error) => {
      setValue('code', '');
      if (hasErrorCode(error, 'OTP_EXPIRED')) {
        onRestart('expired');
        return;
      }
      if (hasErrorCode(error, 'OTP_INVALID')) {
        if (isApiError(error) && error.otp) setFlow(error.otp.flow);
        setBanner(null);
        setError(
          'code',
          { type: 'server', message: copy.errors.codeInvalid },
          { shouldFocus: true },
        );
        return;
      }
      setBanner(signInBannerFor(error));
      setFocus('code');
    },
  });

  const onSubmit = handleSubmit((values) => {
    setBanner(null);
    mutation.mutate(values);
  });

  const deviceId = useWatch({ control, name: 'deviceId' });

  return (
    <form
      noValidate
      onSubmit={(event) => void onSubmit(event)}
      className="flex flex-col gap-16 md:gap-20"
    >
      <div className="flex flex-col gap-4">
        <h2 className="text-heading-5 text-text-primary">{copy.title}</h2>
        <p className="text-body-2 text-text-secondary">{copy.body}</p>
      </div>

      {banner ? (
        <Alert tone="danger" role="alert">
          {signInBannerMessage(banner)}
        </Alert>
      ) : null}

      {challenge.devices.length > 1 ? (
        <SelectField
          label={copy.device}
          options={challenge.devices.map((d) => ({ value: d.id, label: d.name }))}
          value={deviceId}
          {...register('deviceId')}
        />
      ) : null}
      <TextField
        label={copy.code}
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={OTP.codeLength}
        placeholder={copy.codePlaceholder}
        error={formState.errors.code?.message}
        {...register('code')}
      />
      <div className="flex flex-col gap-12">
        <Button type="submit" fullWidth loading={mutation.isPending || mutation.isSuccess}>
          {copy.submit}
        </Button>
        <Button
          type="button"
          variant="secondary"
          fullWidth
          disabled={mutation.isPending}
          onClick={() => {
            onRestart();
          }}
        >
          {copy.back}
        </Button>
      </div>
    </form>
  );
}
