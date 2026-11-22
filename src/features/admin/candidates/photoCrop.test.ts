import { CANDIDATE } from '@/config/constants';

import {
  croppedFileName,
  cropRect,
  INITIAL_CROP,
  moveCrop,
  normalizeCrop,
  outputSize,
  zoomCrop,
} from './photoCrop';

const LANDSCAPE = { width: 2000, height: 1000 };
const PORTRAIT = { width: 800, height: 2000 };
const FRAME = 240;

describe('photo crop', () => {
  it('starts with the largest centred 4:5 area of the photo', () => {
    expect(cropRect(LANDSCAPE, INITIAL_CROP)).toEqual({ x: 600, y: 0, width: 800, height: 1000 });
    expect(cropRect(PORTRAIT, INITIAL_CROP)).toEqual({ x: 0, y: 500, width: 800, height: 1000 });
  });

  it('zooms around the centre and keeps the zoom in range', () => {
    expect(cropRect(LANDSCAPE, zoomCrop(LANDSCAPE, INITIAL_CROP, 2))).toEqual({
      x: 800,
      y: 250,
      width: 400,
      height: 500,
    });
    expect(zoomCrop(LANDSCAPE, INITIAL_CROP, 10).zoom).toBe(CANDIDATE.photoMaxZoom);
    expect(zoomCrop(LANDSCAPE, INITIAL_CROP, 0.2).zoom).toBe(1);
  });

  it('moves the photo with the drag and never past its edges', () => {
    // Dragging right shows more of the left side: the area moves left.
    const right = moveCrop(LANDSCAPE, INITIAL_CROP, 60, 0, FRAME);
    expect(cropRect(LANDSCAPE, right).x).toBe(400); // 60 frame px × (800 / 240)
    const far = moveCrop(LANDSCAPE, INITIAL_CROP, 10_000, 10_000, FRAME);
    expect(cropRect(LANDSCAPE, far)).toEqual({ x: 0, y: 0, width: 800, height: 1000 });
    // Back from the edge right away (the overshoot is not remembered).
    expect(cropRect(LANDSCAPE, moveCrop(LANDSCAPE, far, -30, 0, FRAME)).x).toBe(100);
  });

  it('pulls an out-of-range crop back inside the photo', () => {
    expect(normalizeCrop(PORTRAIT, { zoom: 1, centerX: 0, centerY: 1 })).toEqual({
      zoom: 1,
      centerX: 0.5,
      centerY: 0.75,
    });
  });

  it('saves at most 800 × 1000 and never upscales a small crop', () => {
    expect(outputSize({ x: 0, y: 0, width: 1600, height: 2000 })).toEqual({
      width: 800,
      height: 1000,
    });
    expect(outputSize({ x: 0, y: 0, width: 400, height: 500 })).toEqual({
      width: 400,
      height: 500,
    });
  });

  it('names the adjusted photo as a JPEG', () => {
    expect(croppedFileName('portrait.png')).toBe('portrait.jpg');
    expect(croppedFileName('my.photo.jpeg')).toBe('my.photo.jpg');
    expect(croppedFileName('.png')).toBe('photo.jpg');
  });
});
