# @glass-midas/react

## 0.1.0

Initial release: React bindings for glass-midas, for React 18 and 19.

- **`useGlass(ref, options)`** attaches glass to any element you render; option changes update the live surface.
- **`<Glass glass={options}>`**: a div with glass and no other styling.
- **`@glass-midas/react/components`**: every glass component as a React component (`GlassSurface`, `GlassButton`, `GlassCallout`, `GlassCode`, `GlassTabs`, `GlassTab`, `GlassNav`, `GlassSearch`, `GlassScrollbar`). Glass options are camelCase props, properties like `source` are assigned on the element, events are `onSelect` and `onNavigate`, and `ref` is the element. Needs `@glass-midas/components`.
