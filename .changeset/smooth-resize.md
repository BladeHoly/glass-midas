---
'@glass-midas/core': minor
---

Smooth resizing and a shared map cache. While a surface keeps changing size (an animation, a window drag), its current map is stretched to fit and the exact one is drawn once the size holds for 140 ms, instead of on every frame. Maps are cached across surfaces (LRU of 32), so a size or shape seen before, like a nav that expands and collapses, costs nothing.
