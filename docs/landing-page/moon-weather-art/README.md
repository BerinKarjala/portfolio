# Moon and weather artwork: draft source set

This artwork task is tracked in [#291](https://github.com/BerinKarjala/portfolio/issues/291) and belongs to [epic #290](https://github.com/BerinKarjala/portfolio/issues/290). The images are drafts for owner review; they do not implement the new moon component.

The source set contains a full moon master and separate transparent sun, partly cloudy, overcast, rain, snow, fog, wind, thunderstorm, and hail layers. The common master is intended to support continuously varying phase masks; weather layers can be composed together. `manifest.json` records each source image's dimensions, checksum, byte size, and complete generation prompt.

## Review

Open `/artwork-review/` on this branch's Netlify Deploy Preview. The page displays eight approximate phase examples and representative weather combinations at the selected 128-pixel phone target, plus larger detail views. The preview uses the existing phase-path formula and a sample first-quarter moon; it is a visual composition aid, not a test of astronomical accuracy or the production component.

Following owner feedback, the preview feathers the boundary between the lit and shaded portions and uses a darkened copy of the moon texture for the shadowed side. This keeps surface details visible without letting the green background color the shadow. The effect is a visual approximation; carry the accepted treatment into the production component and validate it across browsers and devices.

A local 128-pixel composition review on the supplied dark green reference background checked the moon alone, sunny, partly cloudy, overcast, rain, snow, fog, wind, thunderstorm, hail, rain with wind, and thunderstorm with rain. The moon remains recognizable in these samples. The sun is deliberately positioned in the upper-right foreground, because putting the original sun layer behind the moon left only a small glow visible.

## Remaining work

- The source PNGs total 13,806,403 bytes and have different intrinsic aspect ratios. They are deliberately retained at generated resolution; optimize and normalize delivery before using them in the live component. The review page loads the full-size source files and is not a performance benchmark.
- Review fog, hail, and dense combined effects on real phones and at large display sizes. Check other phases, especially dark crescents, and adjust layer placement or regenerate artwork if the moon becomes obscured.
- Confirm the owner accepts the art direction. The account-scoped reference image must be available to anyone revising the artwork.
- Implement and test the actual phase calculation, hemisphere orientation, weather mapping, reduced-motion behavior, compositing, lazy loading, and the other epic requirements separately.
- The review page is a draft review aid. Decide whether to remove it before this artwork change is marked ready to merge.
