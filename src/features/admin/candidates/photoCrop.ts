/**
 * Pure maths for the Adjust photo dialog: which part of the picked photo the 3:4 frame shows.
 * A crop is a zoom (1 = the largest 3:4 area that fits) and the centre of that area, as a
 * fraction of the photo's width and height. Every result stays inside the photo.
 */
import { CANDIDATE } from '@/config/constants';

export interface PhotoCrop {
  zoom: number;
  centerX: number;
  centerY: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

export const INITIAL_CROP: PhotoCrop = { zoom: 1, centerX: 0.5, centerY: 0.5 };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** The part of the photo (in photo pixels) the frame shows. */
export function cropRect(photo: Size, crop: PhotoCrop): Rect {
  const aspect = CANDIDATE.photoAspect;
  const zoom = clamp(crop.zoom, 1, CANDIDATE.photoMaxZoom);
  const wide = photo.width / photo.height > aspect;
  const width = (wide ? photo.height * aspect : photo.width) / zoom;
  const height = width / aspect;
  return {
    x: clamp(crop.centerX * photo.width - width / 2, 0, photo.width - width),
    y: clamp(crop.centerY * photo.height - height / 2, 0, photo.height - height),
    width,
    height,
  };
}

/** The same crop with the zoom in range and the centre pulled back inside the photo. */
export function normalizeCrop(photo: Size, crop: PhotoCrop): PhotoCrop {
  const rect = cropRect(photo, crop);
  return {
    zoom: clamp(crop.zoom, 1, CANDIDATE.photoMaxZoom),
    centerX: (rect.x + rect.width / 2) / photo.width,
    centerY: (rect.y + rect.height / 2) / photo.height,
  };
}

/** Moves the photo by (dx, dy) frame pixels, the way a drag does (right = photo moves right). */
export function moveCrop(
  photo: Size,
  crop: PhotoCrop,
  dx: number,
  dy: number,
  frameWidth: number,
): PhotoCrop {
  const perFramePx = cropRect(photo, crop).width / frameWidth;
  return normalizeCrop(photo, {
    ...crop,
    centerX: crop.centerX - (dx * perFramePx) / photo.width,
    centerY: crop.centerY - (dy * perFramePx) / photo.height,
  });
}

export const zoomCrop = (photo: Size, crop: PhotoCrop, zoom: number): PhotoCrop =>
  normalizeCrop(photo, { ...crop, zoom });

/** Where the photo goes in a frame that shows `rect` of it: its scale and top-left offset. */
export interface Placement {
  scale: number;
  x: number;
  y: number;
}

/**
 * How a frame of another shape shows the saved crop: it fills the frame (object-cover), centred
 * across and top-aligned like CandidateImage, so a wider frame drops the bottom of the photo.
 */
export function coverPlacement(rect: Rect, frame: Size): Placement {
  const scale = Math.max(frame.width / rect.width, frame.height / rect.height);
  return {
    scale,
    x: (frame.width - rect.width * scale) / 2 - rect.x * scale,
    y: -rect.y * scale,
  };
}

/** Size of the saved JPEG: at most photoOutputWidth wide, never larger than the crop itself. */
export function outputSize(rect: Rect): Size {
  const width = Math.max(1, Math.round(Math.min(CANDIDATE.photoOutputWidth, rect.width)));
  return { width, height: Math.round(width / CANDIDATE.photoAspect) };
}

/** "portrait.png" → "portrait.jpg" (the adjusted photo is always a JPEG). */
export const croppedFileName = (name: string): string =>
  `${name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`;
