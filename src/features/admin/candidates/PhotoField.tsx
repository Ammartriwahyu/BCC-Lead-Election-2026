'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';

import { UploadIcon } from '@/components/icons/UploadIcon';
import { CandidateImage } from '@/components/ui/CandidateImage';
import { Field } from '@/components/ui/Field';
import { CANDIDATE } from '@/config/constants';
import { candidateFormCopy } from '@/content/candidateFormCopy';
import { commonCopy } from '@/content/commonCopy';
import { cx } from '@/lib/utils/cx';
import { formatFileSize } from '@/lib/utils/format';

import { photoProblem, type PhotoValue } from './candidateRules';

const copy = candidateFormCopy.form;

interface PhotoFieldProps {
  value: PhotoValue;
  onChange: (value: PhotoValue) => void;
  /** Client-side problem with a picked file (type, size). */
  onReject: (message: string) => void;
  error: string | undefined;
  candidateName: string;
  /** Lets the form focus the field when it is the first error. */
  zoneRef: (element: HTMLButtonElement | null) => void;
}

function readDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

/**
 * Figma "Pilketum / Photo upload" (149:3851): dashed drop zone with upload icon; once a photo is
 * chosen, a 4:5 thumbnail (cropped to the centre), file name, size and dimensions, Replace / Remove.
 * The file is uploaded on Save (its own endpoint), so nothing leaves the browser before that.
 */
export function PhotoField({
  value,
  onChange,
  onReject,
  error,
  candidateName,
  zoneRef,
}: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Object URLs of picked files are freed when the photo changes or the form closes.
  const fileUrl = value.kind === 'file' ? value.url : null;
  useEffect(
    () => () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    },
    [fileUrl],
  );

  const pick = () => inputRef.current?.click();

  const accept = async (file: File | undefined) => {
    if (!file) return;
    const problem = photoProblem(file);
    if (problem) {
      onReject(problem);
      return;
    }
    const url = URL.createObjectURL(file);
    const { width, height } = await readDimensions(url);
    onChange({ kind: 'file', file, url, width, height });
  };

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(false);
    void accept(event.dataTransfer.files[0]);
  };

  const hidden = (
    <input
      ref={inputRef}
      type="file"
      accept={CANDIDATE.photoTypes.join(',')}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(event) => {
        void accept(event.target.files?.[0]);
        event.target.value = '';
      }}
    />
  );

  return (
    <Field label={copy.photo} required error={error}>
      {(control) =>
        value.kind === 'none' ? (
          <>
            <button
              ref={zoneRef}
              type="button"
              id={control.id}
              aria-describedby={control['aria-describedby']}
              onClick={pick}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => {
                setDragging(false);
              }}
              onDrop={onDrop}
              className={cx(
                'flex w-full items-center gap-20 rounded-lg border-[1.5px] border-dashed bg-bg-subtle p-20 text-left',
                error ? 'border-red-600' : 'border-border-card',
                dragging && 'border-border-brand bg-primary-100',
              )}
            >
              <span className="flex size-56 shrink-0 items-center justify-center rounded-full bg-surface-card text-text-brand">
                <UploadIcon size={28} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-4">
                <span className="flex flex-wrap gap-x-4 text-body-1-medium text-text-primary">
                  {copy.photoPrompt}
                  <span className="text-body-1-semibold text-text-brand">{copy.photoBrowse}</span>
                </span>
                <span className="text-body-2 text-text-secondary">{copy.photoHint}</span>
              </span>
            </button>
            {hidden}
          </>
        ) : (
          <div
            className={cx(
              'flex w-full items-center gap-20 rounded-lg border bg-surface-card p-20',
              error ? 'border-red-600' : 'border-border-default',
            )}
          >
            <span className="relative flex h-120 w-96 shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg-subtle">
              <CandidateImage
                src={value.url}
                alt={commonCopy.candidatePhotoAlt(candidateName || copy.previewName)}
                sizes="96px"
              />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <p className="truncate text-body-1-semibold text-text-primary">
                {value.kind === 'file' ? value.file.name : copy.photoSaved}
              </p>
              {value.kind === 'file' ? (
                <p className="text-body-2 text-text-secondary">
                  {value.width > 0
                    ? copy.photoMeta(formatFileSize(value.file.size), value.width, value.height)
                    : copy.photoMetaSize(formatFileSize(value.file.size))}
                </p>
              ) : null}
              <div className="flex gap-8 pt-4">
                <button
                  ref={zoneRef}
                  type="button"
                  id={control.id}
                  aria-describedby={control['aria-describedby']}
                  onClick={pick}
                  className="min-h-44 pr-8 text-body-2-semibold text-text-brand"
                >
                  {copy.replace}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ kind: 'none' });
                  }}
                  className="min-h-44 px-8 text-body-2-semibold text-red-700"
                >
                  {copy.remove}
                </button>
              </div>
            </div>
            {hidden}
          </div>
        )
      }
    </Field>
  );
}
