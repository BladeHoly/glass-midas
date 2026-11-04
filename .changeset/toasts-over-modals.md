---
'@glass-midas/components': patch
---

Toasts show over a modal `gm-dialog`: their region is a manual popover in the top layer, raised again when a toast appears while a modal is open (a toast fired from inside a dialog was hidden behind it).
