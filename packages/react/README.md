# @glass-midas/react

React bindings for [glass-midas](https://bladeholy.github.io/glass-midas/): `useGlass` and `<Glass>` for your own elements, and every glass component as a React component from `@glass-midas/react/components`. React 18 and 19.

```sh
npm install @glass-midas/core @glass-midas/react
# for the components, also:
npm install @glass-midas/components
```

```tsx
import { Glass } from '@glass-midas/react';
import { GlassSearch } from '@glass-midas/react/components';

<Glass glass={{ radius: 28 }}>…</Glass>
<GlassSearch material="frost" source={find} onSelect={(e) => go(e.detail.href)} />
```

Docs: <https://bladeholy.github.io/glass-midas/reference/react/> · MIT
