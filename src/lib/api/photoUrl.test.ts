import { describe, expect, it } from 'vitest';

import { isPhotoFileName, toPhotoSrc } from './photoUrl';

const FILE = 'a6e7ce024c0d0025d5407e3dbd278e0f.jpg';

describe('toPhotoSrc', () => {
  it('maps production and staging photo URLs to the same-origin route', () => {
    expect(toPhotoSrc(`https://pilketum.bccdev.id/uploads/candidates/${FILE}`)).toBe(
      `/candidate-photos/${FILE}`,
    );
    expect(toPhotoSrc(`https://pilketum.bccdev.id/staging/uploads/candidates/${FILE}`)).toBe(
      `/candidate-photos/${FILE}`,
    );
    expect(toPhotoSrc('http://127.0.0.1:8080/uploads/candidates/b.PNG')).toBe(
      '/candidate-photos/b.PNG',
    );
  });

  it('leaves everything else as it is', () => {
    expect(toPhotoSrc(null)).toBeNull();
    expect(toPhotoSrc('/api/__mock/uploads/p1.png')).toBe('/api/__mock/uploads/p1.png');
    expect(toPhotoSrc('blob:https://election.bccdev.id/1234')).toBe(
      'blob:https://election.bccdev.id/1234',
    );
    for (const url of [
      'https://cdn.example.org/photos/a.jpg',
      `https://pilketum.bccdev.id/uploads/candidates/${FILE}?v=2`,
      'https://pilketum.bccdev.id/uploads/candidates/sub/a.jpg',
      'https://pilketum.bccdev.id/uploads/candidates/a.gif',
      'https://pilketum.bccdev.id/uploads/candidates/..%2Fsecret.jpg',
    ]) {
      expect(toPhotoSrc(url)).toBe(url);
    }
  });
});

describe('isPhotoFileName', () => {
  it('accepts plain image file names only', () => {
    expect(isPhotoFileName(FILE)).toBe(true);
    expect(isPhotoFileName('photo_1-b.webp')).toBe(true);
    expect(isPhotoFileName('../a.jpg')).toBe(false);
    expect(isPhotoFileName('a.jpg.exe')).toBe(false);
    expect(isPhotoFileName('.jpg')).toBe(false);
    expect(isPhotoFileName(`${'a'.repeat(129)}.jpg`)).toBe(false);
  });
});
