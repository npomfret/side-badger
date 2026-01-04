Title: Add iOS/Android home-screen icon support

Effort: medium

Problem
On iOS, "Add to Home Screen" uses an Apple touch icon, not the favicon. The app currently only sets `rel="icon"` dynamically. Android uses web app manifests for "Add to Home screen" and install prompts, but this repo does not ship a manifest or related icon metadata.

Goals
- Provide a tenant-configurable Apple touch icon for iOS home screen tiles.
- Provide an Android-compatible web app manifest with tenant-configurable icons.
- Keep behavior consistent across dev and deployed environments.
- Ensure the tenant editor supports configuring these new assets.

Notes
- iOS prefers `<link rel="apple-touch-icon" ...>` or `/apple-touch-icon.png`.
- Android prefers `<link rel="manifest" href="...">` plus `icons` in the manifest.
- Current branding tokens already include `assets.logoUrl` and `assets.faviconUrl`; we may need to add `assets.appleTouchIconUrl` and `assets.manifestIconUrl` (or reuse existing assets if acceptable).

Open Questions
- Should we reuse existing tenant logo assets for touch/manifest icons, or add new fields?
- Do we need per-tenant sizes (e.g., 180x180 for iOS, 192/512 for Android)?
- Should the manifest be tenant-specific at `/api/manifest.json` or a static file with dynamic placeholders?

Plan
1) Audit current branding token schema and where favicon is applied to determine the best place to add touch icon + manifest links.
2) Define how tenant assets will supply iOS/Android icon URLs (new fields vs reuse existing).
3) Add `apple-touch-icon` tag management (similar to favicon) and add/serve a manifest link.
4) Ensure config and theme endpoints can supply needed URLs without hardcoding.
5) Add/adjust tests for config-store and any manifest endpoint behavior.
