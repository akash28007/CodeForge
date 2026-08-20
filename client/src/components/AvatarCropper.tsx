import { useEffect, useRef, useState } from 'react';
import Button from './ui/Button';

/** Output edge in px. Avatars render at 96px at most, so this is generous for retina. */
const OUTPUT = 512;
/** On-screen editor size. Fits inside the Edit Profile dialog without scrolling. */
const BOX = 240;

interface AvatarCropperProps {
  file: File | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}

/**
 * Square crop with pan and zoom, drawn on a canvas.
 *
 * Uploading the raw file let the server decide the framing, which for any non-square
 * photo means an arbitrary crop of someone's face. This asks first.
 *
 * Deliberately rendered **inline** rather than in a Modal. `Modal` portals to
 * document.body and dismisses on any document-level pointer press outside its own panel,
 * so nesting one inside the Edit Profile dialog would close that dialog the moment you
 * touched the cropper.
 *
 * Hand-rolled rather than pulling in react-easy-crop: the work is one canvas `drawImage`
 * plus a drag handler, and the dependency list here is deliberately short.
 */
export default function AvatarCropper({ file, busy, onCancel, onConfirm }: AvatarCropperProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Decode the picked file into an <img> we can draw. The object URL is revoked on
  // cleanup so repeatedly re-picking does not leak blobs.
  useEffect(() => {
    if (!file) {
      setImg(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /**
   * Scale at which the image exactly covers the square, before user zoom — the same rule
   * as `object-fit: cover`, so the crop can never be left with empty edges.
   */
  const baseScale = img ? Math.max(BOX / img.width, BOX / img.height) : 1;

  /** Keeps the image covering the box, so panning cannot expose a blank strip. */
  function clamp(next: { x: number; y: number }, scale: number) {
    if (!img) return next;
    const halfW = Math.max(0, (img.width * scale - BOX) / 2);
    const halfH = Math.max(0, (img.height * scale - BOX) / 2);
    return {
      x: Math.min(halfW, Math.max(-halfW, next.x)),
      y: Math.min(halfH, Math.max(-halfH, next.y)),
    };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scale = baseScale * zoom;
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.clearRect(0, 0, BOX, BOX);
    ctx.drawImage(img, (BOX - w) / 2 + offset.x, (BOX - h) / 2 + offset.y, w, h);
  }, [img, zoom, offset, baseScale]);

  if (!file) return null;

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (!d) return;
    setOffset(
      clamp({ x: d.ox + (event.clientX - d.x), y: d.oy + (event.clientY - d.y) }, baseScale * zoom),
    );
  }

  function confirm() {
    if (!img) return;
    const out = document.createElement('canvas');
    out.width = OUTPUT;
    out.height = OUTPUT;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    // The preview is BOX wide and the output OUTPUT wide, so every coordinate scales by
    // the same factor — what you framed is exactly what gets written.
    const k = OUTPUT / BOX;
    const scale = baseScale * zoom * k;
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (OUTPUT - w) / 2 + offset.x * k, (OUTPUT - h) / 2 + offset.y * k, w, h);

    out.toBlob(
      (blob) => {
        if (!blob) return;
        // JPEG keeps a 512px crop far under the server's 2 MB cap, and avatars always sit
        // on an opaque surface, so losing alpha costs nothing.
        onConfirm(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  }

  return (
    // `bg-canvas`, not `bg-base`: the surface token is named `canvas` because a `base`
    // key would emit `.text-base` and collide with Tailwind's font-size utility. Tailwind
    // emits nothing for an unknown class, so `bg-base` was silently transparent.
    <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-subtle bg-canvas p-4">
      <p className="text-xs text-secondary">Drag to reposition · the circle is what others see</p>

      <div className="relative overflow-hidden rounded-lg bg-raised" style={{ width: BOX, height: BOX }}>
        <canvas
          ref={canvasRef}
          width={BOX}
          height={BOX}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          // `touch-none` stops the browser treating a drag as a page scroll on mobile.
          className="cursor-move touch-none"
        />
        {/* Circular guide. `pointer-events-none` so it never swallows a drag. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)', clipPath: 'circle(50% at 50% 50%)' }}
        />
        <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/70" />
      </div>

      <label className="flex w-full items-center gap-3">
        <span className="text-xs text-muted">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => {
            const next = Number(e.target.value);
            setZoom(next);
            setOffset((o) => clamp(o, baseScale * next));
          }}
          className="h-1 flex-1 cursor-pointer accent-accent"
        />
      </label>

      <div className="flex w-full justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={confirm} loading={busy} disabled={!img}>
          Use photo
        </Button>
      </div>
    </div>
  );
}
