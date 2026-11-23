'use client';

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { CANDIDATE } from '@/config/constants';
import { candidateFormCopy } from '@/content/candidateFormCopy';

import {
  cropRect,
  INITIAL_CROP,
  moveCrop,
  outputSize,
  zoomCrop,
  type PhotoCrop,
  type Size,
} from './photoCrop';
import { exportCroppedPhoto } from './photoExport';

const copy = candidateFormCopy.form.adjustDialog;
const FRAME_WIDTH = CANDIDATE.photoFrameWidth;
const FRAME_HEIGHT = Math.round(FRAME_WIDTH / CANDIDATE.photoAspect);
const HINT_ID = 'photo-adjust-hint';
const ZOOM_ID = 'photo-adjust-zoom';
/** + / − on the keyboard zoom by this many slider steps. */
const KEY_ZOOM_STEPS = 2;
const ZOOM_KEYS: Partial<Record<string, number>> = { '+': 1, '=': 1, '-': -1, '−': -1 };
const ARROWS: Partial<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export interface PhotoAdjustResult {
  file: File;
  crop: PhotoCrop;
  size: Size;
}

interface PhotoAdjustDialogProps {
  /** The photo as the committee picked it (never a cropped copy, so nothing is lost). */
  source: File;
  /** Where the previous adjustment left it. */
  initialCrop: PhotoCrop;
  onApply: (result: PhotoAdjustResult) => void;
  onClose: () => void;
}

/**
 * NEW (not in Figma, DEVIATIONS #88): frames a picked photo at 4:5 before it is saved. Drag (mouse
 * or touch), arrow keys or the zoom slider; "Use this crop" draws that part onto a canvas and the
 * form uploads the result as an ordinary JPEG, so the backend needs nothing new.
 * Mounted only while open; the object URL of the source is freed when it closes.
 */
export function PhotoAdjustDialog({
  source,
  initialCrop,
  onApply,
  onClose,
}: PhotoAdjustDialogProps) {
  const [url] = useState(() => URL.createObjectURL(source));
  const [photo, setPhoto] = useState<Size | null>(null);
  const [crop, setCrop] = useState(initialCrop);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const busyRef = useRef(false);

  const close = () => {
    if (busyRef.current) return;
    URL.revokeObjectURL(url);
    onClose();
  };

  const move = (dx: number, dy: number) => {
    if (photo) setCrop((current) => moveCrop(photo, current, dx, dy, FRAME_WIDTH));
  };
  const zoomTo = (zoom: number) => {
    if (photo) setCrop((current) => zoomCrop(photo, current, zoom));
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const last = drag.current;
    if (last?.id !== event.pointerId) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    move(event.clientX - last.x, event.clientY - last.y);
  };
  const endDrag = () => {
    drag.current = null;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const arrow = ARROWS[event.key];
    const zoom = ZOOM_KEYS[event.key];
    if (arrow) {
      const step = event.shiftKey ? CANDIDATE.photoNudgeLargePx : CANDIDATE.photoNudgePx;
      move(arrow[0] * step, arrow[1] * step);
    } else if (zoom) {
      zoomTo(crop.zoom + zoom * CANDIDATE.photoZoomStep * KEY_ZOOM_STEPS);
    } else {
      return;
    }
    event.preventDefault();
  };

  const apply = async () => {
    if (!photo || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setFailed(false);
    const rect = cropRect(photo, crop);
    const file = await exportCroppedPhoto(url, rect, source.name);
    busyRef.current = false;
    setBusy(false);
    if (!file) {
      setFailed(true);
      return;
    }
    URL.revokeObjectURL(url);
    onApply({ file, crop, size: outputSize(rect) });
  };

  const rect = photo ? cropRect(photo, crop) : null;
  const scale = rect ? FRAME_WIDTH / rect.width : 1;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={copy.title}
      description={copy.body}
      actions={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            {copy.cancel}
          </Button>
          <Button onClick={() => void apply()} loading={busy} disabled={!photo}>
            {copy.apply}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-16">
        {/* A button so it is focusable and announced; arrow keys and dragging move the photo. */}
        <button
          type="button"
          aria-label={copy.frame}
          aria-describedby={HINT_ID}
          data-testid="photo-adjust-frame"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }}
          className="relative shrink-0 cursor-grab touch-none overflow-hidden rounded-md bg-bg-subtle select-none active:cursor-grabbing"
        >
          {rect ? null : <Skeleton className="absolute inset-0" />}
          {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, positioned by hand */}
          <img
            src={url}
            alt=""
            draggable={false}
            onLoad={(event) => {
              const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
              if (width > 0 && height > 0) setPhoto({ width, height });
              else setFailed(true);
            }}
            onError={() => {
              setFailed(true);
            }}
            className="pointer-events-none absolute top-0 left-0 max-w-none"
            style={
              rect && photo
                ? {
                    width: photo.width * scale,
                    height: photo.height * scale,
                    transform: `translate(${String(-rect.x * scale)}px, ${String(-rect.y * scale)}px)`,
                  }
                : { opacity: 0 }
            }
          />
        </button>
        <p id={HINT_ID} className="text-center text-body-2 text-text-secondary">
          {copy.frameHint}
        </p>
        <div className="flex w-full items-center gap-16">
          <label htmlFor={ZOOM_ID} className="text-body-2-medium text-text-primary">
            {copy.zoom}
          </label>
          <input
            id={ZOOM_ID}
            type="range"
            min={1}
            max={CANDIDATE.photoMaxZoom}
            step={CANDIDATE.photoZoomStep}
            value={crop.zoom}
            disabled={!photo}
            onChange={(event) => {
              zoomTo(Number(event.target.value));
            }}
            className="h-44 min-w-0 flex-1 accent-primary-600"
          />
          <button
            type="button"
            onClick={() => {
              setCrop(INITIAL_CROP);
            }}
            disabled={!photo}
            className="min-h-44 px-8 text-body-2-semibold text-text-brand disabled:text-text-secondary"
          >
            {copy.reset}
          </button>
        </div>
        {failed ? (
          <Alert tone="danger" role="alert">
            {copy.failed}
          </Alert>
        ) : null}
      </div>
    </Dialog>
  );
}
