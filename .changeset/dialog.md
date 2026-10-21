---
'@glass-midas/components': minor
'@glass-midas/react': minor
---

New `gm-dialog`: a modal of frosted glass on the browser's `<dialog>` (top layer, dimmed backdrop, focus trapping, Escape), centered or, with `placement="bottom"`, a sheet that rises from the bottom edge. It rises in as it opens. `show()` and `close(value)`; buttons in a `<form method="dialog">` close it with their `value`, Escape as `"cancel"` and a click on the backdrop as `"dismiss"`, all reported by `gm-close`. In React, `GlassDialog` with `onClose`.
