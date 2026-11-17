'use client';

import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';

import { DeleteIcon } from '@/components/icons/DeleteIcon';
import { Button } from '@/components/ui/Button';
import { inputBoxClassName } from '@/components/ui/Field';
import { CANDIDATE } from '@/config/constants';
import { candidateFormCopy } from '@/content/candidateFormCopy';
import { cx } from '@/lib/utils/cx';

import type { CandidateFormValues } from './candidateRules';

const copy = candidateFormCopy.form;

interface MissionsFieldProps {
  control: Control<CandidateFormValues>;
  register: UseFormRegister<CandidateFormValues>;
  errors: FieldErrors<CandidateFormValues>;
}

/**
 * "Mission field" (A7): 1–5 numbered points, a delete button per point (disabled when one is
 * left) and "+ Add mission point" (disabled at five).
 */
export function MissionsField({ control, register, errors }: MissionsFieldProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'missions' });
  // The "at least one point" rule is on the array; per-point length errors sit on each item.
  const listError = errors.missions?.root?.message ?? errors.missions?.message;
  const invalid = Boolean(errors.missions);

  return (
    <fieldset className="flex flex-col gap-12" aria-describedby="missions-intro">
      <legend className="contents">
        <span
          className={cx('text-body-1-semibold', invalid ? 'text-red-700' : 'text-text-primary')}
        >
          {copy.mission}
          <span aria-hidden="true"> *</span>
        </span>
      </legend>
      <p id="missions-intro" className="-mt-12 text-body-2 text-text-secondary">
        {copy.missionIntro}
      </p>
      <ol className="flex flex-col gap-12">
        {fields.map((field, index) => {
          const itemError = errors.missions?.[index]?.text?.message;
          const message = itemError ?? (index === 0 ? listError : undefined);
          const errorId = `mission-${field.id}-error`;
          return (
            <li key={field.id} className="flex flex-col gap-4">
              <div className="flex items-center gap-12">
                <span aria-hidden="true" className="w-16 text-body-1-semibold text-text-brand">
                  {index + 1}.
                </span>
                <div className={cx(inputBoxClassName(Boolean(message)), 'flex-1')}>
                  <input
                    type="text"
                    aria-label={copy.missionLabel(index + 1)}
                    aria-invalid={message ? true : undefined}
                    aria-describedby={message ? errorId : undefined}
                    placeholder={copy.missionPlaceholder}
                    maxLength={CANDIDATE.missionMax}
                    className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-secondary"
                    {...register(`missions.${index}.text`)}
                  />
                </div>
                <button
                  type="button"
                  aria-label={copy.removeMission(index + 1)}
                  disabled={fields.length <= CANDIDATE.missionsMin}
                  onClick={() => {
                    remove(index);
                  }}
                  className="flex size-44 shrink-0 items-center justify-center rounded-md border border-border-default text-red-700 disabled:cursor-not-allowed disabled:text-border-default"
                >
                  <DeleteIcon size={22} />
                </button>
              </div>
              {message ? (
                <p id={errorId} className="pl-28 text-body-2 text-text-danger">
                  {message}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <div>
        <Button
          type="button"
          variant="secondary"
          disabled={fields.length >= CANDIDATE.missionsMax}
          onClick={() => {
            append({ text: '' });
          }}
        >
          {copy.addMission}
        </Button>
      </div>
    </fieldset>
  );
}
