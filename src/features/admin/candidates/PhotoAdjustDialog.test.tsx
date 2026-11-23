import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@/test/render';

import { PhotoAdjustDialog } from './PhotoAdjustDialog';
import { INITIAL_CROP } from './photoCrop';
import { exportCroppedPhoto } from './photoExport';

vi.mock('./photoExport', () => ({ exportCroppedPhoto: vi.fn() }));

const exportMock = vi.mocked(exportCroppedPhoto);
const source = new File(['x'], 'portrait.png', { type: 'image/png' });

/** jsdom does not decode images: report a 2000 × 1000 photo as loaded. */
function loadPhoto() {
  const image = screen.getByTestId('photo-adjust-frame').querySelector('img');
  if (!image) throw new Error('no image');
  Object.defineProperty(image, 'naturalWidth', { value: 2000 });
  Object.defineProperty(image, 'naturalHeight', { value: 1000 });
  fireEvent.load(image);
  return image;
}

/** Horizontal offset of the photo inside the frame (jsdom drops a zero y from the transform). */
const offsetX = (image: HTMLImageElement) =>
  Number(/translate\((-?[\d.]+)px/.exec(image.style.transform)?.[1]);

function renderDialog() {
  const onApply = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(
    <PhotoAdjustDialog
      source={source}
      initialCrop={INITIAL_CROP}
      onApply={onApply}
      onClose={onClose}
    />,
  );
  return { onApply, onClose };
}

describe('PhotoAdjustDialog', () => {
  beforeAll(() => {
    URL.createObjectURL = vi.fn(() => 'blob:photo');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    exportMock.mockReset();
  });

  it('moves the photo with the arrow keys and zooms with the slider', async () => {
    renderDialog();
    expect(screen.getByRole('dialog', { name: 'Adjust photo' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Use this crop' })).toBeDisabled();
    const image = loadPhoto();
    // 2000 × 1000 photo, 240 px frame: the centred 750 × 1000 area, scale 0.32.
    expect(offsetX(image)).toBe(-200);

    const frame = screen.getByRole('button', { name: 'Photo position' });
    frame.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(offsetX(image)).toBe(-192);
    await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}');
    expect(offsetX(image)).toBe(-232);

    const zoom = screen.getByRole('slider', { name: 'Zoom' });
    fireEvent.change(zoom, { target: { value: '2' } });
    expect(image.style.width).toBe('1280px');

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(offsetX(image)).toBe(-200);

    // The mouse wheel zooms too (up = in).
    fireEvent.wheel(frame, { deltaY: -100 });
    expect(Number((zoom as HTMLInputElement).value)).toBeCloseTo(1.1);
    fireEvent.wheel(frame, { deltaY: 100 });
    expect(Number((zoom as HTMLInputElement).value)).toBeCloseTo(1);
  });

  it('previews the ballot card and the profile the way they will show the photo', () => {
    renderDialog();
    loadPhoto();
    const preview = screen.getByRole('region', { name: 'Preview' });
    for (const label of [
      'Ballot card, large screens',
      'Ballot card, phones',
      'Candidate profile',
    ]) {
      expect(within(preview).getByText(label)).toBeInTheDocument();
    }
    // Large-screen card at 0.6: 228 × 180, filled by width (750 photo px), top-aligned.
    const card = within(preview).getByText('Ballot card, large screens').previousElementSibling;
    if (!(card instanceof HTMLElement)) throw new Error('no preview frame');
    expect(card.style.width).toBe('228px');
    expect(card.style.height).toBe('180px');
    const image = card.querySelector('img');
    expect(Number.parseFloat(image?.style.width ?? '')).toBeCloseTo(2000 * (228 / 750));
  });

  it('hands back the cropped file, the crop and the saved size', async () => {
    const cropped = new File(['y'], 'portrait.jpg', { type: 'image/jpeg' });
    exportMock.mockResolvedValue(cropped);
    const { onApply } = renderDialog();
    loadPhoto();
    await userEvent.click(screen.getByRole('button', { name: 'Use this crop' }));
    expect(exportMock).toHaveBeenCalledWith(
      'blob:photo',
      { x: 625, y: 0, width: 750, height: 1000 },
      'portrait.png',
    );
    expect(onApply).toHaveBeenCalledWith({
      file: cropped,
      crop: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      size: { width: 750, height: 1000 },
    });
  });

  it('says so when the photo cannot be cropped, and Cancel keeps the old photo', async () => {
    exportMock.mockResolvedValue(null);
    const { onApply, onClose } = renderDialog();
    loadPhoto();
    await userEvent.click(screen.getByRole('button', { name: 'Use this crop' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't crop this photo.");
    expect(onApply).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
