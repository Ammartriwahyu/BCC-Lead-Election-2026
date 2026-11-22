/**
 * Draws the chosen part of a photo onto a canvas and returns it as a JPEG file, all in the
 * browser: the backend receives an ordinary photo upload (no crop data in the API).
 */
import { CANDIDATE } from '@/config/constants';

import { croppedFileName, outputSize, type Rect } from './photoCrop';

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error('image failed to load'));
    };
    image.src = url;
  });
}

/** Null when the browser cannot draw or encode it (the dialog then says so). */
export async function exportCroppedPhoto(
  url: string,
  rect: Rect,
  name: string,
): Promise<File | null> {
  try {
    const image = await loadImage(url);
    const size = outputSize(rect);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    // Transparent PNG areas would turn black in a JPEG.
    context.fillStyle = 'white';
    context.fillRect(0, 0, size.width, size.height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      0,
      0,
      size.width,
      size.height,
    );
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', CANDIDATE.photoJpegQuality);
    });
    if (!blob || blob.size > CANDIDATE.photoMaxBytes) return null;
    return new File([blob], croppedFileName(name), { type: 'image/jpeg' });
  } catch {
    return null;
  }
}
