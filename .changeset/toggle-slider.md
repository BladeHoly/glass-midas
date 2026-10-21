---
'@glass-midas/components': minor
'@glass-midas/react': minor
---

New controls for inside glass. `.gm-toggle` makes a native checkbox a switch, with no script: a light track, the accent when on (`--gm-toggle-on`), a white knob (`--gm-knob`) that stretches while held. `gm-slider` wraps a native range input and paints its fill (`--gm-slider-fill`) up to the value; `sync()` repaints after a value set from code. In React, `GlassSlider` repaints after every render.
