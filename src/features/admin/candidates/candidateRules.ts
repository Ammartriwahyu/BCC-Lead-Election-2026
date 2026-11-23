/**
 * Committee candidate form (A7 / A8): values, validation and the rules shared with the list and
 * the Open voting dialog. Limits: spec 4.4 where it is stricter than the backend doc.
 */
import * as z from 'zod/mini';

import { CANDIDATE } from '@/config/constants';
import { candidateFormCopy } from '@/content/candidateFormCopy';
import { isApiError } from '@/lib/api/errors';
import type { Candidate, CandidateInput } from '@/lib/api/types';
import '@/lib/api/zodConfig';

import type { PhotoCrop } from './photoCrop';

const errors = candidateFormCopy.form.errors;

/**
 * The photo field: a new file, the saved photo, or nothing. An adjusted file keeps the photo as
 * picked (`source`) and its crop, so Adjust starts from there again without losing quality.
 */
export type PhotoValue =
  | { kind: 'none' }
  | { kind: 'saved'; url: string }
  | {
      kind: 'file';
      file: File;
      url: string;
      width: number;
      height: number;
      source?: { file: File; crop: PhotoCrop };
    };

export interface CandidateFormValues {
  photo: PhotoValue;
  number: string;
  name: string;
  major: string;
  classYear: string;
  vision: string;
  missions: { text: string }[];
}

const photoSchema = z.custom<PhotoValue>((value) => value.kind !== 'none', errors.photoRequired);

export const candidateFormSchema = z.object({
  photo: photoSchema,
  number: z.string().check(z.minLength(1, errors.ballotRequired)),
  name: z
    .string()
    .check(
      z.trim(),
      z.minLength(1, errors.nameRequired),
      z.maxLength(CANDIDATE.nameMax, errors.nameTooLong(CANDIDATE.nameMax)),
    ),
  major: z.string().check(z.minLength(1, errors.studyProgramRequired)),
  classYear: z.string().check(z.minLength(1, errors.classYearRequired)),
  vision: z
    .string()
    .check(
      z.trim(),
      z.minLength(1, errors.visionRequired),
      z.maxLength(CANDIDATE.visionMax, errors.visionTooLong(CANDIDATE.visionMax)),
    ),
  missions: z
    .array(
      z.object({
        text: z
          .string()
          .check(
            z.trim(),
            z.maxLength(CANDIDATE.missionMax, errors.missionTooLong(CANDIDATE.missionMax)),
          ),
      }),
    )
    .check(
      z.refine((points) => points.some((p) => p.text.trim().length > 0), {
        message: errors.missionRequired,
      }),
    ),
});

export function emptyFormValues(): CandidateFormValues {
  return {
    photo: { kind: 'none' },
    number: '',
    name: '',
    major: '',
    classYear: '',
    vision: '',
    missions: [{ text: '' }],
  };
}

export function formValuesFrom(candidate: Candidate): CandidateFormValues {
  return {
    photo: candidate.photoUrl ? { kind: 'saved', url: candidate.photoUrl } : { kind: 'none' },
    number: String(candidate.number),
    name: candidate.name,
    major: candidate.major,
    classYear: String(candidate.classYear),
    vision: candidate.vision,
    missions: candidate.missions.length
      ? candidate.missions.map((text) => ({ text }))
      : [{ text: '' }],
  };
}

/** What is sent to the API: trimmed, empty mission points left out (backend ignores them too). */
export function toCandidateInput(values: CandidateFormValues): CandidateInput {
  return {
    number: Number(values.number),
    name: values.name.trim(),
    major: values.major,
    classYear: Number(values.classYear),
    vision: values.vision.trim(),
    missions: values.missions.map((m) => m.text.trim()).filter(Boolean),
  };
}

/** Ballot numbers 1–3; the ones other candidates hold are disabled. */
export function ballotOptions(candidates: readonly Candidate[], ownId: string | null) {
  return CANDIDATE.ballotNumbers.map((n) => {
    const label = String(n).padStart(2, '0');
    const taken = candidates.some((c) => c.number === n && c.id !== ownId);
    return {
      value: String(n),
      label: taken ? candidateFormCopy.form.ballotTaken(label) : label,
      disabled: taken,
    };
  });
}

/** The first free ballot number, so Add starts on a usable one. */
export function firstFreeBallot(candidates: readonly Candidate[]): string {
  const free = CANDIDATE.ballotNumbers.find((n) => !candidates.some((c) => c.number === n));
  return free === undefined ? '' : String(free);
}

export function studyProgramOptions(current: string) {
  const list: readonly string[] = candidateFormCopy.studyPrograms;
  const values = current && !list.includes(current) ? [...list, current] : list;
  return values.map((value) => ({ value, label: value }));
}

export function classYearOptions(current: string) {
  const years = Array.from(
    { length: CANDIDATE.classYearCount },
    (_, i) => CANDIDATE.classYearLatest - i,
  ).map(String);
  const values = current && !years.includes(current) ? [...years, current] : years;
  return values.map((value) => ({ value, label: value }));
}

type FormField = Exclude<keyof CandidateFormValues, 'missions'> | 'missions';

/** Backend field names (VALIDATION_FAILED `fields`) -> form fields. */
const SERVER_FIELDS: Record<string, FormField> = {
  ballot_number: 'number',
  full_name: 'name',
  study_program: 'major',
  class_year: 'classYear',
  vision: 'vision',
  missions: 'missions',
};

/** Field errors from a failed save, in form terms. Empty when the error is not about fields. */
export function serverFieldErrors(error: unknown): Partial<Record<FormField, string>> {
  if (!isApiError(error)) return {};
  if (error.code === 'BALLOT_NUMBER_TAKEN') return { number: errors.ballotTaken };
  if (error.code === 'PHOTO_TOO_LARGE') return { photo: errors.photoSize };
  if (error.code === 'PHOTO_INVALID') return { photo: errors.photoType };
  const out: Partial<Record<FormField, string>> = {};
  for (const [field, message] of Object.entries(error.fields)) {
    const target = SERVER_FIELDS[field];
    if (target) out[target] = message;
  }
  return out;
}

/** Client-side photo checks before anything is uploaded. */
export function photoProblem(file: File): string | null {
  if (!(CANDIDATE.photoTypes as readonly string[]).includes(file.type)) return errors.photoType;
  if (file.size > CANDIDATE.photoMaxBytes) return errors.photoSize;
  return null;
}
