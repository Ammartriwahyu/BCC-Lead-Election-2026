'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useForm, useWatch, type FieldErrors } from 'react-hook-form';

import { ArrowLeftIcon } from '@/components/icons/ArrowLeftIcon';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField } from '@/components/ui/SelectField';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toaster';
import { ADMIN, CANDIDATE, ROUTES } from '@/config/constants';
import { adminCopy } from '@/content/adminCopy';
import { candidateFormCopy } from '@/content/candidateFormCopy';
import { CandidateCard } from '@/features/candidates/components/CandidateCard';
import { hasErrorCode } from '@/lib/api/errors';
import type { Candidate } from '@/lib/api/types';

import {
  ballotOptions,
  candidateFormSchema,
  classYearOptions,
  emptyFormValues,
  firstFreeBallot,
  formValuesFrom,
  serverFieldErrors,
  studyProgramOptions,
  type CandidateFormValues,
} from './candidateRules';
import { MissionsField } from './MissionsField';
import { PhotoField } from './PhotoField';
import { useDeleteCandidate, useSaveCandidate } from './useCandidateMutations';
import { useLeaveGuard } from './useLeaveGuard';

const copy = candidateFormCopy;
const form = copy.form;

/** Order of the fields on screen: the first one with an error gets focus. */
const FIELD_ORDER = [
  'photo',
  'number',
  'name',
  'major',
  'classYear',
  'vision',
  'missions',
] as const;

const cardClass = 'flex flex-col gap-20 rounded-xl border border-border-card bg-surface-card p-24';

interface CandidateFormProps {
  /** null = Add candidate (A7), otherwise Edit (A8). */
  candidate: Candidate | null;
  /** Every candidate, for the ballot numbers already in use. */
  candidates: readonly Candidate[];
}

/**
 * A7 · Add candidate (152:4568, errors 152:4704, filled 152:4850) and A8 · Edit (152:5007):
 * form on the left, live preview with the voter's Candidate card on the right.
 */
export function CandidateForm({ candidate, candidates }: CandidateFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const editing = candidate !== null;
  const save = useSaveCandidate(candidate?.id ?? null);
  const remove = useDeleteCandidate();
  const [serverError, setServerError] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const photoRef = useRef<HTMLButtonElement | null>(null);
  const saving = useRef(false);
  const deleting = useRef(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    setFocus,
    formState: { errors, isDirty, isSubmitted },
  } = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues: candidate
      ? formValuesFrom(candidate)
      : { ...emptyFormValues(), number: firstFreeBallot(candidates) },
    shouldFocusError: false,
  });
  const guard = useLeaveGuard(isDirty && !save.isSuccess && !remove.isSuccess);

  const [photo, number, name, major, classYear, vision] = useWatch({
    control,
    name: ['photo', 'number', 'name', 'major', 'classYear', 'vision'],
  });
  const values = { photo, number, name, major, classYear, vision };
  const errorCount = Object.keys(errors).length;

  const focusFirst = (fieldErrors: FieldErrors<CandidateFormValues>) => {
    const first = FIELD_ORDER.find((field) => field in fieldErrors);
    if (first === 'photo') photoRef.current?.focus();
    else if (first === 'missions') setFocus('missions.0.text');
    else if (first) setFocus(first);
  };

  const onValid = (submitted: CandidateFormValues) => {
    if (saving.current) return;
    saving.current = true;
    setServerError(false);
    save.mutate(submitted, {
      onSettled: () => {
        saving.current = false;
      },
      onSuccess: ({ candidate: saved, photoError }) => {
        guard.allowLeave();
        if (photoError) {
          toast({ title: copy.toast.photoFailed, tone: 'danger' });
          router.replace(ROUTES.adminCandidateEdit(saved.id));
          return;
        }
        toast({
          title: editing ? copy.toast.saved : copy.toast.added,
          tone: 'success',
          durationMs: ADMIN.candidateToastMs,
        });
        router.push(ROUTES.adminCandidates);
      },
      onError: (error) => {
        if (hasErrorCode(error, 'UNAUTHORIZED')) return;
        if (hasErrorCode(error, 'CANDIDATES_LOCKED')) {
          guard.allowLeave();
          toast({ title: copy.toast.locked, tone: 'info' });
          router.replace(ROUTES.adminCandidates);
          return;
        }
        const fieldErrors = serverFieldErrors(error);
        const fields = Object.entries(fieldErrors);
        if (fields.length === 0) {
          setServerError(true);
          return;
        }
        for (const [field, message] of fields) {
          setError(field as keyof CandidateFormValues, { type: 'server', message });
        }
        focusFirst(fieldErrors as FieldErrors<CandidateFormValues>);
      },
    });
  };

  const confirmDelete = () => {
    if (!candidate || deleting.current) return;
    deleting.current = true;
    remove.mutate(candidate.id, {
      onSettled: () => {
        deleting.current = false;
      },
      onSuccess: () => {
        guard.allowLeave();
        setDeleteOpen(false);
        toast({ title: copy.toast.removed, tone: 'success', durationMs: ADMIN.candidateToastMs });
        router.push(ROUTES.adminCandidates);
      },
      onError: (error) => {
        setDeleteOpen(false);
        if (hasErrorCode(error, 'UNAUTHORIZED')) return;
        toast({
          title: adminCopy.feedback.failedTitle,
          description: adminCopy.feedback.failedBody,
          tone: 'danger',
        });
      },
    });
  };

  const preview: Candidate = {
    id: candidate?.id ?? 'preview',
    number: Number(values.number) || 0,
    name: values.name.trim() || form.previewName,
    major: values.major,
    classYear: Number(values.classYear),
    photoUrl: values.photo.kind === 'none' ? null : values.photo.url,
    vision: values.vision,
    missions: [],
  };
  const previewDetails =
    values.major && values.classYear
      ? undefined
      : form.previewDetails(
          values.major || form.previewProgram,
          values.classYear || form.previewYear,
        );

  const busy = save.isPending || save.isSuccess;

  return (
    <div className="flex flex-col gap-24">
      <div>
        <button
          type="button"
          onClick={() => {
            guard.requestLeave(ROUTES.adminCandidates);
          }}
          className="inline-flex min-h-44 items-center gap-8 rounded-lg border border-border-brand py-10 pr-16 pl-12 text-body-1-medium text-text-brand hover:bg-primary-50"
        >
          <ArrowLeftIcon size={24} />
          {form.back}
        </button>
      </div>

      <div className="flex flex-col gap-8">
        <h1 className="text-heading-3 wrap-anywhere text-text-primary">
          {candidate ? form.editTitle(candidate.name) : form.addTitle}
        </h1>
        <p className="text-body-1 text-text-secondary">
          {editing ? form.editSubtitle : form.addSubtitle}
        </p>
      </div>

      {isSubmitted && errorCount > 0 ? (
        <Alert tone="danger" role="alert">
          {form.errorSummary(errorCount)}
        </Alert>
      ) : null}
      {serverError ? (
        <Alert tone="danger" role="alert">
          {form.errors.server}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-32 xl:flex-row xl:items-start">
        <form
          noValidate
          onSubmit={(event) => void handleSubmit(onValid, focusFirst)(event)}
          className="flex min-w-0 flex-1 flex-col gap-24"
        >
          <section aria-labelledby="details-title" className={cardClass}>
            <h2 id="details-title" className="text-heading-6 text-text-primary">
              {form.details}
            </h2>
            <PhotoField
              value={values.photo}
              onChange={(photo) => {
                setValue('photo', photo, { shouldDirty: true, shouldValidate: isSubmitted });
                if (photo.kind !== 'none') clearErrors('photo');
              }}
              onReject={(message) => {
                setError('photo', { type: 'client', message });
              }}
              error={errors.photo?.message}
              candidateName={values.name}
              zoneRef={(element) => {
                photoRef.current = element;
              }}
            />
            <SelectField
              label={form.ballot}
              required
              hint={form.ballotHint}
              placeholder={form.ballotPlaceholder}
              options={ballotOptions(candidates, candidate?.id ?? null)}
              value={values.number}
              error={errors.number?.message}
              {...register('number')}
            />
            <TextField
              label={form.name}
              required
              placeholder={form.namePlaceholder}
              maxLength={CANDIDATE.nameMax}
              autoComplete="off"
              error={errors.name?.message}
              {...register('name')}
            />
            <div className="flex flex-col gap-16 md:flex-row">
              <SelectField
                label={form.studyProgram}
                required
                placeholder={form.studyProgramPlaceholder}
                options={studyProgramOptions(candidate?.major ?? '')}
                value={values.major}
                error={errors.major?.message}
                {...register('major')}
              />
              <SelectField
                label={form.classYear}
                required
                placeholder={form.classYearPlaceholder}
                options={classYearOptions(candidate ? String(candidate.classYear) : '')}
                value={values.classYear}
                error={errors.classYear?.message}
                {...register('classYear')}
              />
            </div>
          </section>

          <section aria-labelledby="vision-title" className={cardClass}>
            <div className="flex flex-col gap-4">
              <h2 id="vision-title" className="text-heading-6 text-text-primary">
                {form.visionMission}
              </h2>
              <p className="text-body-2 text-text-secondary">{form.visionMissionIntro}</p>
            </div>
            <div className="flex flex-col gap-4">
              <TextAreaField
                label={form.vision}
                required
                rows={5}
                maxLength={CANDIDATE.visionMax}
                placeholder={form.visionPlaceholder}
                error={errors.vision?.message}
                {...register('vision')}
              />
              <p className="text-caption text-text-secondary" aria-live="polite">
                {form.counter(values.vision.length, CANDIDATE.visionMax)}
              </p>
            </div>
            <MissionsField control={control} register={register} errors={errors} />
          </section>

          {candidate ? (
            <section
              aria-labelledby="delete-title"
              className="flex flex-col gap-16 rounded-xl border border-red-200 bg-surface-card p-24 md:flex-row md:items-center"
            >
              <div className="flex flex-1 flex-col gap-4">
                <h2 id="delete-title" className="text-heading-6 text-text-primary">
                  {form.deleteTitle}
                </h2>
                <p className="text-body-2 text-text-secondary">{form.deleteBody}</p>
              </div>
              <Button
                type="button"
                variant="danger-outline"
                onClick={() => {
                  setDeleteOpen(true);
                }}
              >
                {form.deleteAction}
              </Button>
            </section>
          ) : null}

          <div className="flex flex-wrap justify-end gap-16">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                guard.requestLeave(ROUTES.adminCandidates);
              }}
            >
              {form.cancel}
            </Button>
            <Button type="submit" loading={busy}>
              {editing ? form.saveEdit : form.saveNew}
            </Button>
          </div>
        </form>

        <aside aria-labelledby="preview-title" className="flex w-full flex-col gap-12 xl:w-400">
          <div className="flex flex-col">
            <h2 id="preview-title" className="text-heading-6 text-text-primary">
              {form.preview}
            </h2>
            <p className="text-body-2 text-text-secondary">{form.previewIntro}</p>
          </div>
          <CandidateCard
            candidate={preview}
            status="default"
            preview
            {...(previewDetails ? { details: previewDetails } : {})}
            onToggle={() => undefined}
            onOpenDetails={() => undefined}
          />
        </aside>
      </div>

      <Dialog
        open={guard.pendingHref !== null}
        onOpenChange={(open) => {
          if (!open) guard.cancelLeave();
        }}
        title={copy.dialogs.discardTitle}
        description={copy.dialogs.discardBody}
        actions={
          <>
            <Button variant="secondary" onClick={guard.cancelLeave}>
              {copy.dialogs.keepEditing}
            </Button>
            <Button onClick={guard.confirmLeave}>{copy.dialogs.discardConfirm}</Button>
          </>
        }
      />

      {candidate ? (
        <Dialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          dismissible={!remove.isPending}
          title={copy.dialogs.deleteTitle(candidate.name)}
          description={copy.dialogs.deleteBody}
          actions={
            <>
              <Button
                variant="secondary"
                disabled={remove.isPending}
                onClick={() => {
                  setDeleteOpen(false);
                }}
              >
                {copy.dialogs.cancel}
              </Button>
              <Button loading={remove.isPending} onClick={confirmDelete}>
                {copy.dialogs.deleteConfirm}
              </Button>
            </>
          }
        />
      ) : null}
    </div>
  );
}
