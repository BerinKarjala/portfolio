# Moon and weather artwork: accepted source set

This artwork task is tracked in [#291](https://github.com/BerinKarjala/portfolio/issues/291) and belongs to [epic #290](https://github.com/BerinKarjala/portfolio/issues/290). The owner accepted the artwork shown at commit `a8261d4d762a13cd900413e56afa77dc8f111fca` on October 27, 2026. These source images do not implement the new moon component.

The source set contains a full moon master and separate transparent sun, partly cloudy, overcast, rain, scattered showers, snow, sleet, fog, wind, thunderstorm, lightning, and hail layers. The common master is intended to support continuously varying phase masks; weather layers can be composed together. `manifest.json` records each source image's dimensions, checksum, byte size, and complete generation prompt.

## Review

Open `/artwork-review/` on this branch's Netlify Deploy Preview. The page displays eight approximate phase examples and representative weather combinations at the selected 128-pixel phone target, plus larger detail views. The preview uses the existing phase-path formula and a sample first-quarter moon; it is a visual composition aid, not a test of astronomical accuracy or the production component.

Following owner feedback, the preview feathers the boundary between the lit and shaded portions and uses a darkened copy of the moon texture for the shadowed side. This keeps surface details visible without letting the green background color the shadow. The effect is a visual approximation; carry the accepted treatment into the production component and validate it across browsers and devices.

The weather gallery includes distinct scattered-showers, hail, snow, and sleet examples next to one another for comparison. Following owner feedback, the partly cloudy composition now includes both the sun and cloud layers around the moon. The sun is deliberately positioned in the upper-right foreground, because putting the original sun layer behind the moon left only a small glow visible. Larger views of these five conditions accompany the 128-pixel samples.

The lightning layer sits in front of the rain and storm clouds in both thunderstorm examples. In the original combined sample, the rain artwork covered the lightning in the storm layer. The separate bolts keep both lightning and rain visible without hiding the moon.

The noindex review page is deliberately retained as a visual reference for the upcoming integration and device review. It is not linked from the portfolio's normal navigation or used by the live component. Reassess its removal when the production component replaces it.

## Remaining work

- The source PNGs total 17,276,209 bytes and have different intrinsic aspect ratios. They are deliberately retained at generated resolution; optimize and normalize delivery before using them in the live component. The review page loads the full-size source files and is not a performance benchmark.
- Review fog, hail, and dense combined effects on real phones and at large display sizes. Check other phases, especially dark crescents, and adjust layer placement or regenerate artwork if the moon becomes obscured.
- Ensure the account-scoped reference image is available to anyone revising the artwork.
- Implement and test the actual phase calculation, hemisphere orientation, weather mapping, reduced-motion behavior, compositing, lazy loading, and the other epic requirements separately. Verify whether the weather provider can distinguish scattered showers and sleet before mapping those illustrations; do not invent a condition the data cannot support.
