import { CANDIDATE } from '@/config/constants';

import {
  coverPlacement,
  croppedFileName,
  cropRect,
  INITIAL_CROP,
  moveCrop,
  normalizeCrop,
  outputSize,
  zoomCrop,
} from './photoCrop';

const LANDSCAPE = { width: 2000, height: 1000 };
const PORTRAIT = { width: 900, height: 2000 };
const FRAME = 240;

describe('photo crop', () => {
  it('starts with the largest centred 3:4 area of the photo', () => {
    expect(cropRect(LANDSCAPE, INITIAL_CROP)).toEqual({ x: 625, y: 0, width: 750, height: 1000 });
    expect(cropRect(PORTRAIT, INITIAL_CROP)).toEqual({ x: 0, y: 400, width: 900, height: 1200 });
    // A 3:4 photo is kept whole.
    expect(cropRect({ width: 900, height: 1200 }, INITIAL_CROP)).toEqual({
      x: 0,
      y: 0,
      width: 900,
      height: 1200,
    });
  });

  it('zooms around the centre and keeps the zoom in range', () => {
    expect(cropRect(LANDSCAPE, zoomCrop(LANDSCAPE, INITIAL_CROP, 2))).toEqual({
      x: 812.5,
      y: 250,
      width: 375,
      height: 500,
    });
    expect(zoomCrop(LANDSCAPE, INITIAL_CROP, 10).zoom).toBe(CANDIDATE.photoMaxZoom);
    expect(zoomCrop(LANDSCAPE, INITIAL_CROP, 0.2).zoom).toBe(1);
  });

  it('moves the photo with the drag and never past its edges', () => {
    // Dragging right shows more of the left side: the area moves left.
    const right = moveCrop(LANDSCAPE, INITIAL_CROP, 60, 0, FRAME);
    expect(cropRect(LANDSCAPE, right).x).toBe(437.5); // 60 frame px × (750 / 240)
    const far = moveCrop(LANDSCAPE, INITIAL_CROP, 10_000, 10_000, FRAME);
    expect(cropRect(LANDSCAPE, far)).toEqual({ x: 0, y: 0, width: 750, height: 1000 });
    // Back from the edge right away (the overshoot is not remembered).
    expect(cropRect(LANDSCAPE, moveCrop(LANDSCAPE, far, -30, 0, FRAME)).x).toBe(93.75);
  });

  it('pulls an out-of-range crop back inside the photo', () => {
    expect(normalizeCrop(PORTRAIT, { zoom: 1, centerX: 0, centerY: 1 })).toEqual({
      zoom: 1,
      centerX: 0.5,
      centerY: 0.7,
    });
  });

  it('saves at most 800 wide (3:4) and never upscales a small crop', () => {
    expect(outputSize({ x: 0, y: 0, width: 1200, height: 1600 })).toEqual({
      width: 800,
      height: 1067,
    });
    expect(outputSize({ x: 0, y: 0, width: 300, height: 400 })).toEqual({
      width: 300,
      height: 400,
    });
  });

  it('places the crop in a wider or taller frame filled, centred across and top-aligned', () => {
    const rect = { x: 100, y: 200, width: 300, height: 400 };
    // Wider frame (the ballot card on large screens): fills the width, the bottom is cut.
    const wide = coverPlacement(rect, { width: 380, height: 300 });
    expect(wide.scale).toBe(380 / 300);
    expect(wide.x).toBeCloseTo(-100 * (380 / 300));
    expect(wide.y).toBeCloseTo(-200 * (380 / 300));
    // Taller frame than 3:4: fills the height, centred across.
    const tall = coverPlacement(rect, { width: 60, height: 104 });
    expect(tall.scale).toBe(104 / 400);
    expect(tall.x).toBeCloseTo((60 - 300 * (104 / 400)) / 2 - 100 * (104 / 400));
    expect(tall.y).toBeCloseTo(-200 * (104 / 400));
  });

  it('names the adjusted photo as a JPEG', () => {
    expect(croppedFileName('portrait.png')).toBe('portrait.jpg');
    expect(croppedFileName('my.photo.jpeg')).toBe('my.photo.jpg');
    expect(croppedFileName('.png')).toBe('photo.jpg');
  });
});
