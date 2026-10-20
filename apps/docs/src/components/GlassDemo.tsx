import { detectTier, tokensToCss, tokenVar, type GlassTier } from '@glass-midas/core';
import { Glass } from '@glass-midas/react';
import { useEffect, useState } from 'react';

type Control = 'tier' | 'refraction' | 'bezel' | 'radius' | 'blur';

interface Props {
  /** Which controls to show; all of them by default. */
  controls?: Control[];
  initialTier?: GlassTier;
  height?: number;
}

function useTokens() {
  useEffect(() => {
    if (document.getElementById('gm-tokens')) return;
    const style = document.createElement('style');
    style.id = 'gm-tokens';
    style.textContent = tokensToCss();
    document.head.append(style);
  }, []);
}

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
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
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}

export default function GlassDemo({
  controls = ['tier', 'refraction', 'bezel', 'radius', 'blur'],
  initialTier,
  height = 320,
}: Props) {
  useTokens();
  const [detected, setDetected] = useState<GlassTier | null>(null);
  const [tier, setTier] = useState<GlassTier | 'auto'>(initialTier ?? 'auto');
  const [refraction, setRefraction] = useState(32);
  const [bezel, setBezel] = useState(18);
  const [radius, setRadius] = useState(28);
  const [blur, setBlur] = useState(6);

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
            glass={{ tier: forced, refraction, bezel, radius, blur: `${blur}px` }}
            className="gm-demo-panel"
            style={{
              borderRadius: radius,
              background: active === 'solid' ? tokenVar('tint', 'dark') : tokenVar('tint', 'light'),
              boxShadow: `inset 0 1px 0 ${tokenVar('highlight', 'edge')}, 0 12px 40px rgb(0 0 0 / 0.25)`,
            }}
          >
            <strong>{active}</strong>
            <small>{forced ? 'forced' : 'detected for this browser'}</small>
          </Glass>
        )}
      </div>

      <div className="gm-demo-controls">
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
        {controls.includes('refraction') && (
          <Slider label="Refraction" value={refraction} min={0} max={80} onChange={setRefraction} />
        )}
        {controls.includes('bezel') && (
          <Slider label="Bezel" value={bezel} min={2} max={60} unit="px" onChange={setBezel} />
        )}
        {controls.includes('radius') && (
          <Slider label="Radius" value={radius} min={0} max={80} unit="px" onChange={setRadius} />
        )}
        {controls.includes('blur') && (
          <Slider label="Blur" value={blur} min={0} max={30} unit="px" onChange={setBlur} />
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
