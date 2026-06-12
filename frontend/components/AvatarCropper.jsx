import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';

const SIZE = 260;

const AvatarCropper = forwardRef(function AvatarCropper(
  {
    src,
    fileName = 'avatar.jpg',
    onCrop,
    showApplyButton = true,
  },
  ref,
) {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!src) {
      imageRef.current = null;
      return;
    }
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      draw(image, 1, { x: 0, y: 0 });
    };
    image.src = src;
  }, [src]);

  useEffect(() => {
    draw(imageRef.current, zoom, offset);
  }, [zoom, offset]);

  function draw(image, nextZoom, nextOffset) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, SIZE, SIZE);
    context.fillStyle = '#e5e7eb';
    context.fillRect(0, 0, SIZE, SIZE);
    if (!image) return;

    const baseScale = Math.max(SIZE / image.width, SIZE / image.height);
    const scale = baseScale * nextZoom;
    const width = image.width * scale;
    const height = image.height * scale;
    const x = (SIZE - width) / 2 + nextOffset.x;
    const y = (SIZE - height) / 2 + nextOffset.y;
    context.drawImage(image, x, y, width, height);
  }

  function startDrag(event) {
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      offset,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event) {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.offset.x + event.clientX - dragRef.current.x,
      y: dragRef.current.offset.y + event.clientY - dragRef.current.y,
    });
  }

  function stopDrag() {
    dragRef.current = null;
  }

  function createCroppedFile() {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) {
      return Promise.reject(new Error(t('profile.selectImage')));
    }
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error(t('profile.cropFailed')));
          return;
        }
        resolve(new File(
          [blob],
          fileName.replace(/\.[^.]+$/, '') + '.jpg',
          { type: 'image/jpeg' },
        ));
      }, 'image/jpeg', 0.92);
    });
  }

  useImperativeHandle(ref, () => ({ createCroppedFile }));

  async function applyCrop() {
    const file = await createCroppedFile();
    onCrop?.(file);
  }

  if (!src) return null;

  return (
    <section className="avatar-cropper">
      <strong>{t('profile.cropTitle')}</strong>
      <div className="avatar-cropper-stage">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
        />
        <span className="avatar-cropper-guide" />
      </div>
      <label className="avatar-cropper-zoom">
        <span>{t('profile.zoom')}</span>
        <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
      </label>
      {showApplyButton ? (
        <button
          className="secondary-button avatar-cropper-apply"
          type="button"
          onClick={applyCrop}
        >
          {t('profile.applyCrop')}
        </button>
      ) : null}
    </section>
  );
});

export default AvatarCropper;
