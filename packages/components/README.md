# @glass-midas/components

Glass Web Components from [glass-midas](https://bladeholy.github.io/glass-midas/): surface, button, navigation, search, tabs, segmented control, tip, popover and menu, dialog and sheet, toast, slider, callout, code block and scrollbar, plus chips and toggles for controls inside glass. Light DOM custom elements, so they work in plain HTML and in any framework, and your CSS reaches inside them.

```sh
npm install @glass-midas/core @glass-midas/components
```

Everything at once:

```ts
import '@glass-midas/components';
import '@glass-midas/components/styles.css';
```

Or only what you use, one entry per component:

```ts
import '@glass-midas/components/menu';
import '@glass-midas/components/css/base.css';
import '@glass-midas/components/css/popover.css';
```

```html
<gm-search hotkey="k" material="frost"></gm-search>
<gm-callout type="tip" heading="Glass">It works.</gm-callout>
```

Docs: <https://bladeholy.github.io/glass-midas/components/overview/> · MIT
