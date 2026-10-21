import '@glass-midas/components/styles.css';
import { tokensToCss } from '@glass-midas/core';
import {
  GlassButton,
  GlassNav,
  GlassSearch,
  GlassSurface,
  GlassTab,
  GlassTabs,
} from '@glass-midas/react/components';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

document.head.append(
  Object.assign(document.createElement('style'), { textContent: tokensToCss() }),
);

const fruit = ['Apple', 'Apricot', 'Banana', 'Cherry', 'Mango'];

function App() {
  const [picked, setPicked] = useState('nothing yet');
  const [navigated, setNavigated] = useState('');
  return (
    <main>
      <GlassButton material="frost">
        <button onClick={() => setPicked('nothing yet')}>Floating action</button>
      </GlassButton>
      <GlassSearch
        material="frost"
        hotkey="k"
        placeholder="Search fruit"
        source={(q) =>
          fruit
            .filter((f) => f.toLowerCase().includes(q.toLowerCase()))
            .map((f) => ({ label: f, href: `#${f}` }))
        }
        onSelect={(e) => {
          e.preventDefault();
          setPicked(e.detail.label);
        }}
      />
      <GlassNav
        onNavigate={(e) => {
          e.preventDefault();
          setNavigated(e.detail.href);
        }}
      >
        <a href="#home" aria-current="true">
          Home
        </a>
        <a href="#work">Work</a>
        <a href="#about">About</a>
      </GlassNav>
      <GlassTabs sync="pkg">
        <GlassTab label="pnpm">
          <p>pnpm add @glass-midas/react</p>
        </GlassTab>
        <GlassTab label="npm">
          <p>npm install @glass-midas/react</p>
        </GlassTab>
      </GlassTabs>
      <GlassSurface material="frost" radius={24} style={{ borderRadius: 24 }}>
        <p id="state">
          Picked: {picked} · Navigated: {navigated || 'nowhere'}
        </p>
        {/* Inside glass, a chip: glass inside glass can't see the page. */}
        <button className="gm-chip" onClick={() => setPicked('reset')}>
          Reset
        </button>
      </GlassSurface>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
