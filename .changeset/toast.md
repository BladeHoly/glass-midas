---
'@glass-midas/components': minor
'@glass-midas/react': minor
---

New `toast(message, { action, duration })` and `gm-toast`: a short message on frosted glass at the bottom center that goes away on its own (4 s by default), waits while the pointer or focus is on it, stacks up to three, and is announced politely to screen readers. An action shows as a chip and closes the toast. Dismissing fires `gm-dismiss`. `@glass-midas/react/components` re-exports `toast`.
