import {
  createWebGLGlass,
  type WebGLGlassHandle,
  type WebGLGlassOptions,
} from '@glass-midas/webgl';
import { useEffect, useRef, useState, type PointerEvent } from 'react';

type Look = 'searchbox' | 'lens';

const LOOKS: Record<Look, Omit<WebGLGlassOptions, 'backdrop'>> = {
  // The defaults: kube.io's search box.
  searchbox: { radius: 28 },
  // A thick slab with a round edge, like ybouane/liquidglass.
  lens: {
    radius: 60,
    thickness: 160,
    bezel: 60,
    curvature: 2,
    magnify: 0.05,
    blur: 0,
    specular: 0.5,
    specularSaturation: 9,
    tint: [0, 0, 0, 0.12],
  },
};

const SIZES: Record<Look, { width: number; height: number }> = {
  searchbox: { width: 420, height: 56 },
  lens: { width: 460, height: 160 },
};

/** A slowly moving scene to refract: color fields, a grid and big type. */
function paint(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#0d3b2e');
  g.addColorStop(1, '#10121f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const blobs = [
    ['#ff5f6d', 0.2, 0.3],
    ['#ffc371', 0.75, 0.25],
    ['#47cf73', 0.45, 0.8],
    ['#3a7bd5', 0.85, 0.75],
    ['#8e54e9', 0.1, 0.85],
  ] as const;
  blobs.forEach(([color, x, y], i) => {
    const cx = (x + 0.08 * Math.sin(t / 2400 + i)) * w;
    const cy = (y + 0.08 * Math.cos(t / 3100 + i * 2)) * h;
    const r = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.55);
    r.addColorStop(0, color);
    r.addColorStop(1, 'transparent');
    ctx.fillStyle = r;
    ctx.fillRect(0, 0, w, h);
  });
  ctx.strokeStyle = 'rgb(255 255 255 / 0.18)';
  ctx.lineWidth = 2;
  for (let x = (t / 60) % 24; x < w; x += 24) ctx.strokeRect(x, -1, 0, h + 2);
  for (let y = 0; y < h; y += 24) ctx.strokeRect(-1, y, w + 2, 0);
  ctx.fillStyle = 'rgb(255 255 255 / 0.9)';
  ctx.font = `900 ${Math.round(h * 0.28)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GLASS · MIDAS', w / 2 + Math.sin(t / 1800) * w * 0.05, h / 2);
}

export default function WebGLDemo() {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const glass = useRef<WebGLGlassHandle | null>(null);
  const [look, setLook] = useState<Look>('searchbox');
  const [chroma, setChroma] = useState(0.01);
  const [blur, setBlur] = useState(1);
  const [tier, setTier] = useState('…');
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Animate the backdrop.
  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext('2d')!;
    let frame = 0;
    const tick = (t: number) => {
      const { width, height } = c.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (c.width !== Math.round(width * dpr)) {
        c.width = Math.round(width * dpr);
        c.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(ctx, width, height, t);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // One glass surface per look; option changes go through update().
  useEffect(() => {
    glass.current = createWebGLGlass(panel.current!, {
      backdrop: canvas.current!,
      ...LOOKS[look],
      chroma,
      blur: look === 'lens' ? 0 : blur,
    });
    setTier(glass.current.tier);
    return () => glass.current?.destroy();
    // chroma and blur are applied live below.
  }, [look]);

  useEffect(() => {
    glass.current?.update({ chroma, blur });
  }, [chroma, blur]);

  const size = SIZES[look];
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d) setOffset({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y });
  };

  return (
    <div className="gm-demo not-content">
      <div className="gm-demo-stage" ref={stage} style={{ height: 360 }}>
        <canvas ref={canvas} className="gm-webgl-backdrop" aria-hidden="true" />
        <div
          ref={panel}
          className="gm-demo-panel gm-webgl-panel"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          style={{
            width: size.width,
            maxWidth: '90%',
            height: size.height,
            borderRadius: LOOKS[look].radius,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            boxShadow:
              look === 'lens' ? '0 10px 30px rgb(0 0 0 / 0.3)' : '0 4px 16px rgb(0 0 0 / 0.16)',
          }}
        >
          {look === 'lens' ? <strong>Liquid Glass</strong> : <span>Search · drag me</span>}
        </div>
      </div>
      <div className="gm-demo-controls">
        <label className="gm-demo-control">
          <span>
            Look <output>{tier}</output>
          </span>
          <select value={look} onChange={(e) => setLook(e.target.value as Look)}>
            <option value="searchbox">Search box (kube.io)</option>
            <option value="lens">Thick lens (ybouane-like)</option>
          </select>
        </label>
        <label className="gm-demo-control">
          <span>
            Dispersion <output>{chroma}</output>
          </span>
          <input
            type="range"
            min={0}
            max={0.1}
            step={0.005}
            value={chroma}
            onChange={(e) => setChroma(Number(e.target.value))}
          />
        </label>
        {look === 'searchbox' && (
          <label className="gm-demo-control">
            <span>
              Frost <output>{blur}px</output>
            </span>
            <input
              type="range"
              min={0}
              max={12}
              step={0.5}
              value={blur}
              onChange={(e) => setBlur(Number(e.target.value))}
            />
          </label>
        )}
      </div>
    </div>
  );
}
