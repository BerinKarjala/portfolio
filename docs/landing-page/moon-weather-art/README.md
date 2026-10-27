# Moon and weather artwork: accepted source set

This artwork task is tracked in [#291](https://github.com/BerinKarjala/portfolio/issues/291) and belongs to [epic #290](https://github.com/BerinKarjala/portfolio/issues/290). The owner accepted the artwork shown at commit `a8261d4d762a13cd900413e56afa77dc8f111fca` on October 27, 2026. These source images do not implement the new moon component.

The source set contains a full moon master and separate transparent sun, partly cloudy, overcast, rain, scattered showers, snow, sleet, fog, wind, thunderstorm, lightning, and hail layers. The common master is intended to support continuously varying phase masks; weather layers can be composed together. `manifest.json` records each source image's dimensions, checksum, byte size, and complete generation prompt.

## Review

Open `/artwork-review/` on this branch's Netlify Deploy Preview. The page displays eight approximate phase examples and representative weather combinations at the selected 128-pixel phone target, plus larger detail views. The preview uses the existing phase-path formula and a sample first-quarter moon; it is a visual composition aid, not a test of astronomical accuracy or the production component.

Following owner feedback, the preview feathers the boundary between the lit and shaded portions and uses a darkened copy of the moon texture for the shadowed side. This keeps surface details visible without letting the green background color the shadow. The effect is a visual approximation; carry the accepted treatment into the production component and validate it across browsers and devices.

The weather gallery includes distinct scattered-showers, hail, snow, and sleet examples next to one another for comparison. Following owner feedback, the partly cloudy composition now includes both the sun and cloud layers around the moon. The sun is deliberately positioned in the upper-right foreground, because putting the original sun layer behind the moon left only a small glow visible. Larger views of these five conditions accompany the 128-pixel samples.

The lightning layer sits in front of the rain and storm clouds in both thunderstorm examples. In the original combined sample, the rain artwork covered the lightning in the storm layer. The separate bolts keep both lightning and rain visible without hiding the moon.

The noindex review page is deliberately retained as a visual reference for the upcoming integration and device review. It is not linked from the portfolio's normal navigation or used by the live component. Reassess its removal when the production component replaces it.

## Runtime preparation

The separate `/artwork-review/runtime.html` page exercises the reusable artwork component with illustrative sample conditions, a phase slider, hemisphere and background selection, and reduced-data mode. These samples are not live weather. This page is a noindex development reference; it does not replace the existing moon widget.

`npm run assets:moon-weather` verifies the source PNG checksums and regenerates transparent WebP variants at 384px and 768px and a 256px PNG fallback for each source. Content hashes in the filenames support the site's immutable asset caching. The runtime inventory records dimensions, transfer sizes, and SHA-256 hashes. The complete 22-image sets total 565,964 bytes for small WebP, 1,697,744 bytes for large WebP, and 947,894 bytes for PNG fallbacks; an ordinary component loads only its moon and selected weather layers. If the moon image cannot be decoded, a lightweight vector moon remains visible.

Nine owner-accepted condition-specific daylight overlays depict the sun partly obscured by clouds or precipitation, or fully obscured with diffused backlighting for dense fog, overcast, hail, and thunderstorms. Their generation prompts and checksums are in `sun-obstruction-manifest.json`; the previously accepted source artwork remains unchanged. The renderer chooses one appropriate sun variant for the weather effects, prioritizing hail and thunderstorms when conditions combine. The owner accepted these images on October 27, 2026.

The condition selector follows the [Open-Meteo forecast weather-code table](https://open-meteo.com/en/docs#weathervariables). Rain-showers codes use the shower artwork without claiming the showers are spatially scattered. Hail is shown only for explicitly reported hail codes. The standard code list does not identify sleet; its artwork requires an explicitly validated ice-pellets observation, which the review page simulates. Rain and snowfall amounts are used for supported combinations only with a valid interval of at most 15 minutes, and wind defaults to a configurable 20 mph threshold. These modelled current conditions are approximate. When daytime is explicitly reported, the sun is composited with all recognized weather effects, including fog, showers and storms. The sun is hidden at night and when daytime is unknown; without a recognized observation or effect, only the moon is shown.

## Remaining work

- The source PNGs total 17,276,209 bytes and have different intrinsic aspect ratios. They are deliberately retained at generated resolution; the original review page still loads the full-size files and is not a performance benchmark. Use the optimized variants in the live component and confirm its transfer budget.
- Review fog, hail, and dense combined effects on real phones and at large display sizes. Check other phases, especially dark crescents, and adjust layer placement or regenerate artwork if the moon becomes obscured.
- Ensure the account-scoped reference image is available to anyone revising the artwork.
- Integrate and test the reusable phase, hemisphere, weather-mapping, and compositing code in the live component, along with reduced-motion behavior and the other epic requirements. Connect reduced-data handling and verify the live weather provider can explicitly identify sleet before displaying that artwork; do not invent a condition the data cannot support.
