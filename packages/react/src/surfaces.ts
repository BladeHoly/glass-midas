import '@glass-midas/components/surface';
import '@glass-midas/components/button';
import '@glass-midas/components/callout';
import '@glass-midas/components/code';
import type { CalloutType } from '@glass-midas/components';
import { wrap } from './wrap.js';

// Surfaces: glass that holds content.

/** `<gm-surface>`: any block as a glass panel. */
export const GlassSurface = wrap<{}>('gm-surface');

/** `<gm-button>`: a glass pill around a native button or link. */
export const GlassButton = wrap<{ shape?: 'pill' | 'round' }>('gm-button');

/** `<gm-callout>`: a note, tip, caution or danger aside. */
export const GlassCallout = wrap<{ type?: CalloutType; heading?: string }>('gm-callout');

/** `<gm-code>`: a code block with a copy button. Put a `<pre>` inside. */
export const GlassCode = wrap<{ labelCopy?: string; labelCopied?: string }>('gm-code', [], {}, [
  'labelCopy',
  'labelCopied',
]);

export type { CalloutType };
