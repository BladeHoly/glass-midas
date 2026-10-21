---
'@glass-midas/components': minor
'@glass-midas/react': minor
---

New `gm-segmented`: one choice among a few on a glass bar, with a droplet under the chosen option. Any child with a `value` is an option (icons welcome); it's a radio group with arrow-key, Home and End navigation. `value` (attribute and property) reads and sets the choice; a choice by the user fires `gm-change` with `{ value, index }`. In React, `GlassSegmented` with `onChange`.
