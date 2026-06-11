import { useEffect, useRef, useState } from 'react';

const SIZE = 260;

export default function AvatarCropper({ src, fileName = 'avatar.jpg', onCrop }) {
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

  function applyCrop() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCrop(new File([blob], fileName.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  }

  if (!src) return null;

  return (
    <section className="avatar-cropper">
      <strong>画像の表示範囲を調整</strong>
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
        <span>ズーム</span>
        <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
      </label>
      <button className="secondary-button avatar-cropper-apply" type="button" onClick={applyCrop}>切り抜きを確定</button>
    </section>
  );
}
