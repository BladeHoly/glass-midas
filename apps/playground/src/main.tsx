import { tokensToCss, tokenVar, type GlassTier } from '@glass-midas/core';
import { Glass } from '@glass-midas/react';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

const style = document.createElement('style');
style.textContent = `${tokensToCss()}
body {
  margin: 0;
  min-height: 100vh;
  font-family: system-ui, sans-serif;
  color: white;
  background: url('https://picsum.photos/id/1015/1600/1000') center / cover fixed;
}`;
document.head.append(style);

// ?tier=blur|solid|refract forces a tier, so every fallback can be reviewed in one browser.
const tier = (new URLSearchParams(location.search).get('tier') ?? undefined) as
  GlassTier | undefined;

function App() {
  const [refraction, setRefraction] = useState(28);
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', gap: 24 }}>
      <Glass
        glass={{ radius: 28, refraction, tier }}
        style={{
          width: 360,
          padding: 32,
          borderRadius: tokenVar('radius', 'lg'),
          background: tokenVar('tint', 'light'),
          boxShadow: `inset 0 1px 0 ${tokenVar('highlight', 'edge')}`,
        }}
      >
        <h1 style={{ margin: 0 }}>glass-midas</h1>
        <label>
          Refraction {refraction}
          <input
            type="range"
            min={0}
            max={80}
            value={refraction}
            onChange={(e) => setRefraction(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </label>
      </Glass>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
