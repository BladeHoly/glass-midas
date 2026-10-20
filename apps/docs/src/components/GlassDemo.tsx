import { detectTier, tokensToCss, tokenVar, type GlassTier } from '@glass-midas/core';
import { Glass } from '@glass-midas/react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';

type Control =
  | 'look'
  | 'tier'
  | 'thickness'
  | 'ior'
  | 'bezel'
  | 'radius'
  | 'blur'
  | 'specular'
  | 'curvature'
  | 'magnify';

interface Props {
  /** Which controls to show; all of them by default. */
  controls?: Control[];
  initialTier?: GlassTier;
  height?: number;
}

// Starting points: the physical edge-only default, and the whole-surface lens of
// ybouane/liquidglass (clear glass, round bezel across the panel, magnified interior).
const LOOKS = {
  edge: {
    thickness: 24,
    bezel: 20,
    radius: 32,
    curvature: 4,
    magnify: 0.1,
    blur: 2,
    specular: 0.6,
  },
  lens: {
    thickness: 60,
    bezel: 72,
    radius: 72,
    curvature: 2,
    magnify: 0.15,
    blur: 0,
    specular: 0.8,
  },
};

const MATERIALS = [
  { label: 'Water', ior: 1.33 },
  { label: 'Glass', ior: 1.5 },
  { label: 'Sapphire', ior: 1.77 },
  { label: 'Diamond', ior: 2.42 },
];

function useTokens() {
  useEffect(() => {
    if (document.getElementById('gm-tokens')) return;
    const style = document.createElement('style');
    style.id = 'gm-tokens';
    style.textContent = tokensToCss();
    document.head.append(style);
  }, []);
}

/** Lets the panel be dragged around the stage; moving glass never redraws its map. */
function useDrag() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const start = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  return {
    offset,
    handlers: {
      onPointerDown(e: PointerEvent<HTMLElement>) {
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      },
      onPointerMove(e: PointerEvent<HTMLElement>) {
        const s = start.current;
        if (s) setOffset({ x: s.ox + e.clientX - s.x, y: s.oy + e.clientY - s.y });
      },
      onPointerUp() {
        start.current = null;
      },
    },
  };
}

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="gm-demo-control">
      <span>
        {props.label} <output>{`${props.value}${props.unit ?? ''}`}</output>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}

export default function GlassDemo({
  controls = [
    'look',
    'tier',
    'thickness',
    'ior',
    'bezel',
    'radius',
    'curvature',
    'magnify',
    'blur',
    'specular',
  ],
  initialTier,
  height = 360,
}: Props) {
  useTokens();
  const [detected, setDetected] = useState<GlassTier | null>(null);
  const [tier, setTier] = useState<GlassTier | 'auto'>(initialTier ?? 'auto');
  const [thickness, setThickness] = useState(24);
  const [ior, setIor] = useState(1.5);
  const [bezel, setBezel] = useState(20);
  const [radius, setRadius] = useState(32);
  const [blur, setBlur] = useState(2);
  const [specular, setSpecular] = useState(0.6);
  const [curvature, setCurvature] = useState(4);
  const [magnify, setMagnify] = useState(0.1);
  const applyLook = (look: keyof typeof LOOKS) => {
    const l = LOOKS[look];
    setThickness(l.thickness);
    setBezel(l.bezel);
    setRadius(l.radius);
    setCurvature(l.curvature);
    setMagnify(l.magnify);
    setBlur(l.blur);
    setSpecular(l.specular);
  };
  const { offset, handlers } = useDrag();

  // Detection needs the browser, so it runs after hydration.
  useEffect(() => setDetected(detectTier()), []);

  const forced = tier === 'auto' ? undefined : tier;
  const active = forced ?? detected;

  return (
    <div className="gm-demo not-content">
      <div className="gm-demo-stage" style={{ height }}>
        <div className="gm-demo-scene" aria-hidden="true">
          <span>refract</span>
          <span>blur</span>
          <span>solid</span>
        </div>
        {detected && (
          <Glass
            // The tier is fixed for a surface's lifetime, so a new tier means a new surface.
            key={active}
            glass={{
              tier: forced,
              thickness,
              ior,
              bezel,
              radius,
              specular,
              curvature,
              magnify,
              blur: `${blur}px`,
            }}
            className="gm-demo-panel"
            {...handlers}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              borderRadius: radius,
              background: tokenVar('tint', active === 'solid' ? 'solid' : 'light'),
              boxShadow: '0 12px 40px rgb(0 0 0 / 0.25)',
            }}
          >
            <strong>{active}</strong>
            <small>{forced ? 'forced' : 'detected for this browser'} · drag me</small>
          </Glass>
        )}
      </div>

      <div className="gm-demo-controls">
        {controls.includes('look') && (
          <label className="gm-demo-control">
            <span>Look</span>
            <select
              defaultValue="edge"
              onChange={(e) => applyLook(e.target.value as keyof typeof LOOKS)}
            >
              <option value="edge">Edge (physical slab)</option>
              <option value="lens">Lens (ybouane-like)</option>
            </select>
          </label>
        )}
        {controls.includes('tier') && (
          <label className="gm-demo-control">
            <span>Tier</span>
            <select value={tier} onChange={(e) => setTier(e.target.value as GlassTier | 'auto')}>
              <option value="auto">auto ({detected ?? '…'})</option>
              <option value="refract">refract</option>
              <option value="blur">blur</option>
              <option value="solid">solid</option>
            </select>
          </label>
        )}
        {controls.includes('thickness') && (
          <Slider
            label="Thickness"
            value={thickness}
            min={0}
            max={80}
            unit="px"
            onChange={setThickness}
          />
        )}
        {controls.includes('ior') && (
          <label className="gm-demo-control">
            <span>
              Material <output>n = {ior}</output>
            </span>
            <select value={ior} onChange={(e) => setIor(Number(e.target.value))}>
              {MATERIALS.map((m) => (
                <option key={m.label} value={m.ior}>
                  {m.label} ({m.ior})
                </option>
              ))}
            </select>
          </label>
        )}
        {controls.includes('bezel') && (
          <Slider label="Bezel" value={bezel} min={2} max={80} unit="px" onChange={setBezel} />
        )}
        {controls.includes('radius') && (
          <Slider label="Radius" value={radius} min={0} max={80} unit="px" onChange={setRadius} />
        )}
        {controls.includes('curvature') && (
          <label className="gm-demo-control">
            <span>Profile</span>
            <select value={curvature} onChange={(e) => setCurvature(Number(e.target.value))}>
              <option value={2}>Circle (2)</option>
              <option value={4}>Squircle (4)</option>
            </select>
          </label>
        )}
        {controls.includes('magnify') && (
          <Slider
            label="Magnify"
            value={magnify}
            min={0}
            max={0.5}
            step={0.01}
            onChange={setMagnify}
          />
        )}
        {controls.includes('blur') && (
          <Slider label="Blur" value={blur} min={0} max={30} unit="px" onChange={setBlur} />
        )}
        {controls.includes('specular') && (
          <Slider
            label="Highlight"
            value={specular}
            min={0}
            max={1}
            step={0.05}
            onChange={setSpecular}
          />
        )}
      </div>
      {active === 'refract' && detected !== 'refract' && (
        <p className="gm-demo-note">
          This browser can't render refraction, so the forced <code>refract</code> tier won't bend
          anything here. Try Chrome or Edge.
        </p>
      )}
    </div>
  );
}
