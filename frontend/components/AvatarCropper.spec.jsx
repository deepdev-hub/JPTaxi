import { createRef } from 'react';
import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AvatarCropper from './AvatarCropper.jsx';

describe('AvatarCropper', () => {
  const drawImage = vi.fn();

  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      drawImage,
      set fillStyle(_value) {},
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      (callback) => callback(new Blob(['jpeg'], { type: 'image/jpeg' })),
    );
    vi.stubGlobal('Image', class {
      width = 800;
      height = 600;
      onload = null;

      set src(_value) {
        queueMicrotask(() => this.onload?.());
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('exports the current crop as a JPEG file through its ref', async () => {
    const ref = createRef();
    render(
      <AvatarCropper
        ref={ref}
        src="blob:avatar"
        fileName="portrait.png"
        showApplyButton={false}
      />,
    );

    await waitFor(() => expect(drawImage).toHaveBeenCalled());
    const cropped = await ref.current.createCroppedFile();

    expect(cropped).toBeInstanceOf(File);
    expect(cropped.name).toBe('portrait.jpg');
    expect(cropped.type).toBe('image/jpeg');
  });
});
