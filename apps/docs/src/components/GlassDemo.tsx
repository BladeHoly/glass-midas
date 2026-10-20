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
  | 'magnify'
  | 'caustics'
  | 'saturation'
  | 'light';

interface Props {
  /** Which controls to show; all of them by default. */
  controls?: Control[];
  initialTier?: GlassTier;
  height?: number;
}

// Starting points. The default reproduces kube.io's search box: a thin squircle rim that folds
// the backdrop, lit by a hairline showing a saturated copy of what's behind.
const LOOKS = {
  searchbox: {
    thickness: 40,
    bezel: 20,
    radius: 72,
    curvature: 4,
    magnify: 0,
    blur: 1,
    specular: 0.2,
    saturation: 4,
    light: -60,
    caustics: true,
  },
  // A thick slab with a round edge, like ybouane/liquidglass: a wide folded band reads as the
  // glass's side wall.
  lens: {
    thickness: 160,
    bezel: 60,
    radius: 72,
    curvature: 2,
    magnify: 0.05,
    blur: 0,
    specular: 0.5,
    saturation: 9,
    light: -60,
    caustics: true,
  },
  // Physically capped: no fold, a softly compressed rim.
  subtle: {
    thickness: 24,
    bezel: 20,
    radius: 32,
    curvature: 4,
    magnify: 0.1,
    blur: 2,
    specular: 0.2,
    saturation: 1,
    light: -60,
    caustics: false,
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
    'caustics',
    'blur',
    'specular',
    'saturation',
    'light',
  ],
  initialTier,
  height = 360,
}: Props) {
  useTokens();
  const [detected, setDetected] = useState<GlassTier | null>(null);
  const [tier, setTier] = useState<GlassTier | 'auto'>(initialTier ?? 'auto');
  const initial = LOOKS.searchbox;
  const [thickness, setThickness] = useState(initial.thickness);
  const [ior, setIor] = useState(1.5);
  const [bezel, setBezel] = useState(initial.bezel);
  const [radius, setRadius] = useState(initial.radius);
  const [blur, setBlur] = useState(initial.blur);
  const [specular, setSpecular] = useState(initial.specular);
  const [saturation, setSaturation] = useState(initial.saturation);
  const [light, setLight] = useState(initial.light);
  const [curvature, setCurvature] = useState(initial.curvature);
  const [magnify, setMagnify] = useState(initial.magnify);
  const [caustics, setCaustics] = useState(initial.caustics);
  const applyLook = (look: keyof typeof LOOKS) => {
    const l = LOOKS[look];
    setThickness(l.thickness);
    setBezel(l.bezel);
    setRadius(l.radius);
    setCurvature(l.curvature);
    setMagnify(l.magnify);
    setCaustics(l.caustics);
    setBlur(l.blur);
    setSpecular(l.specular);
    setSaturation(l.saturation);
    setLight(l.light);
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
              specularSaturation: saturation,
              lightAngle: light,
              curvature,
              magnify,
              caustics,
              blur: `${blur}px`,
            }}
            className="gm-demo-panel"
            {...handlers}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              borderRadius: radius,
              background:
                active === 'solid' ? tokenVar('tint', 'solid') : 'rgb(255 255 255 / 0.05)',
              boxShadow: '0 4px 16px rgb(0 0 0 / 0.16)',
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
              defaultValue="searchbox"
              onChange={(e) => applyLook(e.target.value as keyof typeof LOOKS)}
            >
              <option value="searchbox">Search box (kube.io)</option>
              <option value="lens">Thick lens (ybouane-like)</option>
              <option value="subtle">Subtle (no fold)</option>
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
            max={240}
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
        {controls.includes('caustics') && (
          <label className="gm-demo-control gm-demo-toggle">
            <input
              type="checkbox"
              checked={caustics}
              onChange={(e) => setCaustics(e.target.checked)}
            />
            <span>Caustics (fold the rim)</span>
          </label>
        )}
        {controls.includes('blur') && (
          <Slider label="Blur" value={blur} min={0} max={30} unit="px" onChange={setBlur} />
        )}
        {controls.includes('specular') && (
          <Slider
            label="Rim white"
            value={specular}
            min={0}
            max={1}
            step={0.05}
            onChange={setSpecular}
          />
        )}
        {controls.includes('saturation') && (
          <Slider
            label="Rim color"
            value={saturation}
            min={1}
            max={12}
            step={0.5}
            unit="×"
            onChange={setSaturation}
          />
        )}
        {controls.includes('light') && (
          <Slider label="Light" value={light} min={-180} max={180} unit="°" onChange={setLight} />
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
