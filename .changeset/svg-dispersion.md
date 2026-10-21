---
'@glass-midas/core': minor
'@glass-midas/components': minor
---

Dispersion for the refract tier: `chroma` (0 to 0.5, off by default) splits the rim into color, as thick glass does. The backdrop is bent three times, red at `1 − chroma` times the bend and blue at `1 + chroma`, keeping one channel from each pass; where the glass is flat they agree, so only the rim splits. Same option and meaning as `@glass-midas/webgl`. Costs three bends instead of one, so keep it for hero surfaces. Components take it as the `chroma` attribute.
